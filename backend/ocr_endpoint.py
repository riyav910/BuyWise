import os
import re
import shutil
import io
import cv2
import numpy as np
from PIL import Image
import pytesseract
from fastapi import APIRouter, UploadFile, File, HTTPException
from quantity_utils import parse_and_normalize_quantity

router = APIRouter()


def get_tesseract_cmd() -> str:
    """Finds the installed Tesseract executable across standard locations and PATH."""
    env_path = os.getenv("TESSERACT_CMD") or os.getenv("TESSERACT_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    # Standard Windows install locations
    win_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for p in win_paths:
        if os.path.isfile(p):
            return p

    # System PATH lookup
    path_which = shutil.which("tesseract")
    if path_which:
        return path_which

    return "tesseract"


# Initialize tesseract binary path
pytesseract.pytesseract.tesseract_cmd = get_tesseract_cmd()


# Regular expression to match list bullet/numbering/checkbox prefixes
MARKER_REGEX = re.compile(
    r"^(?:"
    r"(?:[\d]+|[a-zA-Z])[\.\,\)\-:]\s*"           # 1. 1) 1- A. a) 01.
    r"|\[[\sxX✓✔\*\-\+]?\]\s*"                     # [ ] [x] [*] [-] [+]
    r"|\([\sxX✓✔\*\-\+\d]?\)\s*"                   # ( ) (1) (x)
    r"|[\-\*\•\–\—\>•·\+\~▪▫◦■✓✔o]\s*"             # bullets & symbols
    r")\s*",
    re.UNICODE
)

# Header terms to reject (these are list titles, not items)
HEADER_TERMS = {
    "grocery list", "shopping list", "groceries", "to buy", "buy list",
    "checklist", "items list", "my list", "pantry list", "todo", "things to buy",
    "order list", "notes", "weekend list", "cart", "items to buy", "weekly list",
    "grocery shopping", "quick list"
}

# Footer and receipt noise terms to reject
FOOTER_TERMS = {
    "total", "subtotal", "grand total", "tax", "gst", "vat", "discount",
    "cashier", "counter", "receipt", "invoice", "thank you", "visit again",
    "bill amount", "net amount", "paid", "customer copy", "balance", "change",
    "store", "date:", "time:", "tel:", "phone:", "www.", "http", "token"
}


def preprocess_image_for_ocr(img: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Prepares images of computer-typed lists (screenshots, notes, printed paper photos)
    for high-accuracy OCR:
    1. Smart dimension normalization (scale up small screenshots, resize huge phone photos).
    2. Dark mode auto-inversion (white text on dark background -> dark text on white).
    3. Illumination / shadow normalization (handles phone camera shadows and room lighting).
    4. Contrast-enhanced grayscale and Otsu binarization.
    """
    h, w = img.shape[:2]

    # Smart resizing: optimal OCR text height is ~30-40px per line
    if max(h, w) > 2400:
        scale = 2400.0 / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    elif min(h, w) < 700:
        scale = 1200.0 / min(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Auto-detect dark mode (e.g. Apple Notes or Keep in dark mode)
    if np.mean(gray) < 125:
        gray = cv2.bitwise_not(gray)

    # Illumination & shadow compensation via background subtraction
    dilated = cv2.dilate(gray, np.ones((7, 7), np.uint8))
    bg = cv2.medianBlur(dilated, 21)
    diff = 255 - cv2.absdiff(gray, bg)
    norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)

    # Otsu thresholding for clean binarized text
    _, otsu = cv2.threshold(norm, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return gray, norm, otsu


def clean_item_line(raw_line: str) -> dict | None:
    """
    Cleans a single line recognized by OCR:
    - Strips bullet points, numbers, checkboxes
    - Filters out headers, footers, and noise
    - Normalizes known OCR character confusions in weights/volumes
    - Returns structured metadata or None if rejected
    """
    line = raw_line.strip()
    if not line or len(line) < 2:
        return None

    lower = line.lower()

    # Reject standalone headers and footers
    clean_lower = re.sub(r"[^a-z\s]", "", lower).strip()
    words = clean_lower.split()

    if any(h in clean_lower for h in HEADER_TERMS) and len(words) <= 4:
        return None

    if any(f in clean_lower for f in FOOTER_TERMS):
        return None

    # Strip marker prefix (repeat in case of multiple prefixes like '1. [ ] ')
    cleaned = line
    for _ in range(3):
        prev = cleaned
        cleaned = MARKER_REGEX.sub("", cleaned).strip()
        if cleaned == prev:
            break

    # Strip surrounding noise punctuation
    cleaned = re.sub(r"^[^\w]+", "", cleaned)
    cleaned = re.sub(r"[^\w\)]+$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if len(cleaned) < 2:
        return None

    # Must contain at least two letters (avoids isolated numbers, symbols)
    letters = re.findall(r"[a-zA-Z]", cleaned)
    if len(letters) < 2:
        return None

    # Common OCR quantity corrections
    # e.g., '500g' misread as 's00g' or 'so0g', '1kg' misread as '1ka'
    cleaned = re.sub(r"(\d+)\s*[sS]00g\b", r"\1 500g", cleaned)
    cleaned = re.sub(r"\b[sS]00g\b", "500g", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b[sS]o0g\b", "500g", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(\d+)\s*ka\b", r"\1kg", cleaned, flags=re.IGNORECASE)

    # Extract quantity if present using quantity_utils
    norm_qty = parse_and_normalize_quantity(cleaned)

    # Build clean search query name
    query_name = cleaned.lower()
    # Strip excessive parenthetical noise e.g. '(12 pack)' -> '12 pack'
    clean_display = re.sub(r"[\(\)]", " ", cleaned).strip()
    clean_display = re.sub(r"\s+", " ", clean_display)

    return {
        "original": line,
        "clean_name": clean_display,
        "search_term": query_name,
        "quantity_info": norm_qty
    }


def parse_ocr_text_to_items(raw_text: str) -> tuple[list[str], list[dict]]:
    """
    Parses full raw OCR text into a list of clean product search strings
    and detailed item objects, deduplicating while preserving order.
    """
    seen = set()
    items = []
    parsed_items = []

    for raw_line in raw_text.split("\n"):
        res = clean_item_line(raw_line)
        if not res:
            continue

        search_term = res["search_term"].strip()
        if not search_term or search_term in seen:
            continue

        seen.add(search_term)
        items.append(search_term)
        parsed_items.append(res)

    return items, parsed_items


@router.post("/parse-image")
async def parse_image(file: UploadFile = File(...)):
    """
    Upload and parse an image of a shopping list (computer typed or printed).
    Returns extracted items, structured item metadata, and raw text.
    """
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        # Decode image using OpenCV with PIL fallback
        img = None
        try:
            np_arr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        except Exception:
            pass

        if img is None:
            try:
                pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid image file format")

        # Refresh tesseract command path if needed
        tess_cmd = get_tesseract_cmd()
        pytesseract.pytesseract.tesseract_cmd = tess_cmd

        # Preprocess
        gray, norm_img, otsu_img = preprocess_image_for_ocr(img)

        # Multi-pass OCR:
        # Pass 1: Contrast-normalized image with PSM 6 (uniform block of text)
        text = ""
        items = []
        parsed_items = []

        try:
            text = pytesseract.image_to_string(norm_img, config="--oem 3 --psm 6")
            items, parsed_items = parse_ocr_text_to_items(text)
        except Exception as ocr_err:
            print(f"[OCR] Pass 1 warning: {ocr_err}")

        # Pass 2: Fallback to Otsu binarization with PSM 4 if Pass 1 yielded few items
        if len(items) == 0:
            try:
                text_pass2 = pytesseract.image_to_string(otsu_img, config="--oem 3 --psm 4")
                items2, parsed_items2 = parse_ocr_text_to_items(text_pass2)
                if len(items2) > len(items):
                    text = text_pass2
                    items = items2
                    parsed_items = parsed_items2
            except Exception as ocr_err2:
                print(f"[OCR] Pass 2 warning: {ocr_err2}")

        # Pass 3: Fallback to original grayscale with PSM 3 (auto page segmentation)
        if len(items) == 0:
            try:
                text_pass3 = pytesseract.image_to_string(gray, config="--oem 3 --psm 3")
                items3, parsed_items3 = parse_ocr_text_to_items(text_pass3)
                if len(items3) > len(items):
                    text = text_pass3
                    items = items3
                    parsed_items = parsed_items3
            except Exception as ocr_err3:
                print(f"[OCR] Pass 3 warning: {ocr_err3}")

        # Fallback simple cleaner if strict parsing filtered everything
        if not items and text.strip():
            fallback_items = []
            for line in text.split("\n"):
                cleaned = re.sub(r"[^a-zA-Z0-9 .%/-]", " ", line).strip()
                cleaned = re.sub(r"\s+", " ", cleaned)
                if len(cleaned) >= 3 and re.search(r"[a-zA-Z]{3,}", cleaned):
                    c_lower = cleaned.lower()
                    if c_lower not in fallback_items and not any(h in c_lower for h in HEADER_TERMS):
                        fallback_items.append(c_lower)
            items = fallback_items
            parsed_items = [{"original": it, "clean_name": it, "search_term": it} for it in items]

        return {
            "success": True,
            "items": items,
            "parsed_items": parsed_items,
            "count": len(items),
            "raw_text": text
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[OCR ERROR] Unexpected: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )