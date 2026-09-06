from fastapi import APIRouter, UploadFile, File, HTTPException
import pytesseract
import io
import re
import cv2
import numpy as np

router = APIRouter()


# Preprocess image (VERY IMPORTANT)
def preprocess_image(img):
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Resize (improves OCR a lot)
    gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    # Adaptive threshold (best for real-world images)
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # Remove noise
    thresh = cv2.medianBlur(thresh, 3)

    return thresh


@router.post("/parse-image")
async def parse_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        # Convert bytes → OpenCV image
        try:
            np_arr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                raise Exception("Invalid image")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image file")

        #Preprocess
        processed = preprocess_image(img)

        # Tesseract path (Windows)
        pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

        # OCR config (important)
        config = "--oem 3 --psm 4"

        try:
            text = pytesseract.image_to_string(processed, config=config)
        except Exception as e:
            print("OCR ERROR:", e)
            raise HTTPException(
                status_code=500,
                detail="OCR failed. Check Tesseract installation"
            )

        print("OCR TEXT RAW:", repr(text))
        print("OCR TEXT CLEAN:\n", text)

        # Extract items
        items = extract_items_from_text(text)

        return {
            "items": items,
            "raw_text": text
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        print("Unexpected OCR error:", str(e))
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while processing the image"
        )


# Extract meaningful items
def extract_items_from_text(text):
    lines = text.split("\n")
    items = []

    for line in lines:
        line = line.strip().lower()

        if len(line) < 3:
            continue

        # Skip unwanted words
        if any(x in line for x in ["total", "amount", "rs", "₹", "bill", "tax"]):
            continue

        # Keep meaningful text
        if re.search(r"[a-z]{3,}", line):
            items.append(line)

    return items