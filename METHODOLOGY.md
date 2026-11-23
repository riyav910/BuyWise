# CHAPTER 3: METHODOLOGY

---

## 3.1 Problem Formulation & Mathematical Model

The objective of the **BuyWise** platform is to formulate, design, and execute an intelligent decision-support engine capable of minimizing the **Total Cost of Ownership (TCO)** for a consumer shopping basket across heterogeneous, real-time quick-commerce delivery networks.

Traditional price-comparison mechanisms operate on an isolated single-item comparison paradigm. Such approaches fail in quick-commerce environments because:
1. **Dynamic Platform Charges:** Platforms enforce independent delivery fees, surge pricing, night charges, and handling fees.
2. **Free Delivery Thresholds:** Delivery fees are dynamically waived when a cart subtotal crosses platform-specific spending thresholds.
3. **Discrete Packaging Discrepancies:** Brands package identical products in non-standard quantities (e.g., $450\text{ ml}$ vs. $500\text{ ml}$ vs. $1\text{ L}$, or $420\text{ g}$ vs. $840\text{ g}$) across competing retailers.
4. **Dark-Store Geofencing:** Inventories, pricing, and estimated times of arrival (ETA) vary on a micro-geographic basis depending on dark-store radius and stock availability.

BuyWise models the purchasing decision as a constrained combinatorial optimization problem over a multi-platform cart allocation.

```
                      BUYWISE MATHEMATICAL MODEL
 
 Shopping List I = {i₁, i₂, ..., iₙ}       Platforms P = {Blinkit, Zepto, BigBasket}
                 │                                        │
                 ▼                                        ▼
   ┌───────────────────────────┐            ┌───────────────────────────┐
   │ Discrete Pack Resolution  │            │ Dynamic Fee Functions     │
   │ n_{k,p} = ⌈ q_k / s_{k,p} ⌉│            │ Delivery D_p(S_p), Handl H_p
   └─────────────┬─────────────┘            └─────────────┬─────────────┘
                 │                                        │
                 └───────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌────────────────────────────────────────┐
                │   Total Cost of Ownership (TCO) Min    │
                │  TCO = ∑ [ Subtotal_p + D_p(S_p) + H_p ]│
                │        p∈P_active                      │
                └────────────────────────────────────────┘
```

---

### 3.1.1 Formal Mathematical Definitions

Let:
- $\mathcal{P} = \{p_1, p_2, \dots, p_M\}$ denote the universe of monitored quick-commerce platforms. In the current implementation:
  $$\mathcal{P} = \{\text{Blinkit}, \text{Zepto}, \text{BigBasket}\}$$
- $\mathcal{I} = \{i_1, i_2, \dots, i_N\}$ denote the user's shopping list containing $N$ distinct product requirements.
- Each requested item $i_k \in \mathcal{I}$ is defined by the tuple:
  $$i_k = \langle \text{term}_k, q_k, u_k \rangle$$
  where $\text{term}_k$ is the product descriptor, $q_k \in \mathbb{R}^+$ is the required numerical quantity, and $u_k \in \{\text{ml}, \text{L}, \text{g}, \text{kg}, \text{piece}\}$ is the physical unit of measurement.

---

### 3.1.2 Discrete Packaging Resolution

Unlike continuous goods, retail products are sold in discrete packaging units. For an item $i_k$ available on platform $p$, let $s_{k,p}$ denote the package size (normalized to base units: $\text{ml}$ for volume, $\text{g}$ for weight, or $\text{piece}$ for counts), and let $c_{k,p}$ denote the unit selling price per package.

The number of packages $n_{k,p} \in \mathbb{Z}^+$ that the consumer must purchase on platform $p$ to satisfy or exceed the required quantity $q_k$ is governed by:

$$n_{k,p} = \left\lceil \frac{q_k}{s_{k,p}} \right\rceil$$

The effective item purchase cost $E_{k,p}$ on platform $p$ is:

$$E_{k,p} = n_{k,p} \times c_{k,p}$$

---

### 3.1.3 Platform-Specific Dynamic Fee Functions

Let $\mathcal{A}: \mathcal{I} \to \mathcal{P}$ represent an item allocation assignment mapping each item $i_k$ to a selected platform $p$. The subset of items assigned to platform $p$ is:

$$\mathcal{I}_p = \{i_k \in \mathcal{I} \mid \mathcal{A}(i_k) = p\}$$

The active platforms utilized in allocation $\mathcal{A}$ are:

$$\mathcal{P}_{\text{active}} = \{p \in \mathcal{P} \mid |\mathcal{I}_p| > 0\}$$

For each active platform $p \in \mathcal{P}_{\text{active}}$, the platform subtotal $S_p$ is:

$$S_p = \sum_{i_k \in \mathcal{I}_p} E_{k,p}$$

Each platform enforces a non-linear delivery fee function $D_p(S_p)$ subject to a free delivery threshold $\tau_p$:

$$D_p(S_p) = \begin{cases} 
0, & \text{if } S_p \ge \tau_p \\ 
d_p, & \text{if } 0 < S_p < \tau_p 
\end{cases}$$

where $d_p$ is the standard base delivery fee. In addition, platforms apply a mandatory fixed handling fee $H_p$:

$$H_p = \begin{cases} 
h_p, & \text{if } |\mathcal{I}_p| > 0 \\ 
0, & \text{if } |\mathcal{I}_p| = 0 
\end{cases}$$

Current empirical platform parameter configurations utilized in BuyWise:
- **Blinkit:** $d_{\text{blinkit}} = ₹15.00$, $\tau_{\text{blinkit}} = ₹199.00$, $h_{\text{blinkit}} = ₹4.00$
- **Zepto:** $d_{\text{zepto}} = ₹15.00$, $\tau_{\text{zepto}} = ₹149.00$, $h_{\text{zepto}} = ₹4.00$
- **BigBasket:** $d_{\text{bb}} = ₹25.00$, $\tau_{\text{bb}} = ₹299.00$, $h_{\text{bb}} = ₹5.00$

---

### 3.1.4 Objective Function: Total Cost of Ownership (TCO)

The objective is to discover the optimal assignment $\mathcal{A}^*$ that minimizes the global checkout cost across all participating platforms:

$$\min_{\mathcal{A}} \text{TCO}(\mathcal{A}) = \sum_{p \in \mathcal{P}_{\text{active}}} \left[ S_p + D_p(S_p) + H_p \right]$$

$$\text{subject to } \mathcal{A}(i_k) \in \mathcal{P}_{\text{available}}(i_k), \quad \forall i_k \in \mathcal{I}$$

---

### 3.1.5 Delivery Latency & Trade-Off Regularization

When consumers require delivery within strict deadlines, BuyWise incorporates a delivery time regularization penalty into the objective function:

$$\text{Score}(\mathcal{A}) = \text{TCO}(\mathcal{A}) + \lambda \sum_{p \in \mathcal{P}_{\text{active}}} \max\left(0, \text{ETA}_p - \text{ETA}_{\text{max}}\right)^2$$

where:
- $\text{ETA}_p$ is the live delivery estimate returned by platform $p$ (in minutes).
- $\text{ETA}_{\text{max}}$ is the user's preferred delivery deadline.
- $\lambda \ge 0$ is a user-tunable sensitivity parameter balancing monetary savings against delivery speed. When $\lambda = 0$, pure cost minimization is performed.

---

## 3.2 System Architecture

BuyWise employs a **Hybrid Cloud-Edge Decoupled Architecture**. This design reconciles two competing engineering constraints:
1. **High Availability & Global Accessibility:** The web application and API gateway must remain accessible 24/7 on high-bandwidth public cloud infrastructure.
2. **Anti-Bot Resistance:** Quick-commerce applications deploy cloud-IP blocking filters (Akamai Edge IP binding, Cloudflare Turnstile, and PerimeterX) that block IP addresses originating from major data centers (AWS, GCP, DigitalOcean, Render).

To bypass this barrier without violating platform constraints, BuyWise isolates the compute-intensive browser scraping onto a residential edge node while orchestrating traffic through a public cloud API gateway over an authenticated, encrypted TLS tunnel.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (NETLIFY)                     │
│   React 18 SPA • Tailwind CSS • Responsive UI • Custom BuyWise Assets  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (JSON over TLS)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY TIER (RENDER CLOUD)                   │
│   Node.js / Express • CORS Whitelist • Query Sanitizer • Rate Limiter   │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  UPSTASH REDIS TIER  │ │  MONGODB ATLAS TIER  │ │   SECURE TUNNEL TIER │
│  TLS Serverless      │ │  Canonical Catalog   │ │   ngrok v3 Engine    │
│  15-min TTL Cache    │ │  Historical Tracking │ │   Dedicated Static   │
│  Sub-50ms Response   │ │  Search Analytics    │ │   TLS Hostname       │
└──────────────────────┘ └──────────────────────┘ └──────────┬───────────┘
                                                             │
                                                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    EDGE SCRAPER & OPTIMIZATION TIER                    │
│   FastAPI / Uvicorn • Async Playwright Chromium Fleet • CV2 / OCR      │
│   Browser Anti-Detection • Dynamic Geolocation • Cart Optimization     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                    ▼                    ▼
       ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
       │ Blinkit Store │    │  Zepto Store  │    │BigBasket Store│
       └───────────────┘    └───────────────┘    └───────────────┘
```

The system is organized into five functional layers:
1. **Presentation Layer (Frontend):** React 18 single-page application hosted on Netlify's global Content Delivery Network (CDN), rendering comparison dashboards, interactive cart optimizers, and OCR list uploads.
2. **Gateway & Orchestration Layer:** Node.js Express server hosted on Render Cloud, functioning as a reverse proxy, CORS enforcer, query deduplicator, and cache coordinator.
3. **Caching & Persistence Tier:**
   - **Upstash Redis:** Cloud-hosted, TLS-encrypted in-memory datastore executing high-speed lookups with a 15-minute sliding TTL.
   - **MongoDB Atlas:** Cloud database managing canonical product catalogs, platform ID mappings, and historical pricing telemetry.
4. **Secure Edge Tunneling Layer:** An authenticated ngrok v3 reverse tunnel running on a persistent custom subdomain (`gorgeous-evolution-antitrust.ngrok-free.dev`), allowing public cloud microservices to securely communicate with the local scraper engine.
5. **Data Retrieval & Processing Tier:** An edge-based Python service running FastAPI and asynchronous Playwright Chromium instances equipped with custom bot-evasion hooks, OpenCV image-processing routines, and combinatorial cart-optimization algorithms.

---

## 3.3 Input Processing & Multi-Modal Ingestion Engine

BuyWise accommodates diverse user input formats: raw unstructured text strings, multi-item shopping lists, and visual photographs of handwritten or typed grocery notes.

```
                     INPUT PROCESSING PIPELINE
 
   [ Unstructured Text ]                  [ Image of Grocery List ]
             │                                       │
             │                                       ▼
             │                         ┌───────────────────────────┐
             │                         │ OpenCV Preprocessing      │
             │                         │ - Dynamic Resizing        │
             │                         │ - Dark Mode Inversion     │
             │                         │ - Background Subtraction  │
             │                         │ - Otsu Binarization       │
             │                         └─────────────┬─────────────┘
             │                                       │
             │                                       ▼
             │                         ┌───────────────────────────┐
             │                         │ Pesseract OCR Engine      │
             │                         │ - PSM 6/4 Line Extraction │
             │                         │ - Marker & Noise Filter   │
             │                         └─────────────┬─────────────┘
             │                                       │
             └───────────────────┬───────────────────┘
                                 │ Clean String Tokens
                                 ▼
                 ┌───────────────────────────────┐
                 │ NLP Entity & Quantity Parser  │
                 │ - Multipack Extraction        │
                 │ - Dimension & Canonical Units │
                 │ - Metric Base Normalization   │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                     Structured Query Tuple:
             ⟨ Term: "Amul Butter", Qty: 500, Unit: "g" ⟩
```

---

### 3.3.1 Text NLP Parsing & Quantity Normalization (`quantity_utils.py`)

When an unstructured query is received (e.g., `"Amul milk 500ml"`, `"2 x 1L toned milk"`, or `"12 pcs brown eggs"`), the system extracts:
1. Canonical Product Name Entity
2. Quantity Value
3. Measurement Unit & Dimension

#### A. Dimension & Canonical Unit Mapping
Units are classified into three immutable physical dimensions:

$$\text{Dimension}(u) \in \{\text{Volume}, \text{Weight}, \text{Count}\}$$

| Dimension | Base Unit | Canonical Unit | Supported Aliases | Multiplier to Base |
| :--- | :--- | :--- | :--- | :--- |
| **Volume** | $\text{ml}$ | $\text{L}$ / $\text{ml}$ | `ml`, `millilitre`, `milliliter`, `l`, `ltr`, `litre`, `liter` | $\text{ml} \to 1.0$, $\text{L} \to 1000.0$ |
| **Weight** | $\text{g}$ | $\text{kg}$ / $\text{g}$ | `g`, `gm`, `gram`, `grams`, `kg`, `kilo`, `kilogram`, `kilograms` | $\text{g} \to 1.0$, $\text{kg} \to 1000.0$ |
| **Count** | $\text{piece}$| $\text{piece}$ | `pc`, `pcs`, `piece`, `pieces`, `unit`, `units`, `pack`, `packs`, `egg`, `eggs` | $1.0$ |

#### B. Parsing Algorithms
1. **Multipack Expression Resolution:** Identifies multi-quantity patterns like $M \times Q \text{ Unit}$ using the regular expression:
   $$\mathcal{R}_{\text{multi}} = \texttt{(\textbackslash d+(?:\textbackslash .\textbackslash d+)?)\textbackslash s*(?:x|\textbackslash *)\textbackslash s*(\textbackslash d+(?:\textbackslash .\textbackslash d+)?)\textbackslash s*([A-Za-z]+)}$$
   For `"2 x 500 ml"`, the total base quantity is calculated as:
   $$Q_{\text{base}} = 2 \times 500 \times 1.0 = 1000\text{ ml}$$
2. **Single Unit Pattern Resolution:** Identifies standard expressions like $Q \text{ Unit}$ using:
   $$\mathcal{R}_{\text{single}} = \texttt{(\textbackslash d+(?:\textbackslash .\textbackslash d+)?)\textbackslash s*([A-Za-z]+)\textbackslash b}$$
   For `"1.5 kg"`, the total base quantity is:
   $$Q_{\text{base}} = 1.5 \times 1000.0 = 1500\text{ g}$$
3. **Entity Name Cleansing:** Strips isolated numeric tokens, packaging descriptors, and punctuation from the string to yield the canonical search entity $\text{term}_k$.

---

### 3.3.2 Computer Vision & Optical Character Recognition (OCR) Engine (`ocr_endpoint.py`)

To allow users to photograph handwritten, printed, or digital mobile notes (Apple Notes, Google Keep), BuyWise incorporates an **OpenCV image preprocessing pipeline** connected to the Tesseract OCR engine.

```
Raw Camera Image
      │
      ▼
[ Step 1: Geometric Normalization ] ────> Constrain max(H, W) ≤ 2400px, min(H, W) ≥ 1200px
      │
      ▼
[ Step 2: Grayscale Conversion ]    ────> cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
      │
      ▼
[ Step 3: Dark Mode Inversion ]     ────> If mean(gray) < 125, gray = bitwise_not(gray)
      │
      ▼
[ Step 4: Shadow Compensation ]     ────> Dilate(gray, 7x7) -> MedianBlur(bg, 21x21) -> Diff
      │
      ▼
[ Step 5: Contrast & Binarization ] ────> Otsu Automatic Dual-Thresholding
      │
      ▼
[ Step 6: Tesseract Recognition ]   ────> pytesseract.image_to_string(..., config='--psm 6')
      │
      ▼
[ Step 7: Post-Recognition Filter ] ────> Marker Stripping, Header/Footer Removal
```

#### Detailed Pipeline Stages:
1. **Geometric Scale Normalization:** Images with $\max(H, W) > 2400\text{px}$ are downsampled using area interpolation (`cv2.INTER_AREA`), while low-resolution inputs with $\min(H, W) < 700\text{px}$ are upscaled using bicubic interpolation (`cv2.INTER_CUBIC`) to achieve an optimal line text height of $30\text{--}40\text{px}$.
2. **Adaptive Dark-Mode Detection:** Computes the global pixel mean:
   $$\mu = \frac{1}{H \cdot W} \sum_{x, y} I_{\text{gray}}(x, y)$$
   If $\mu < 125$, the image is identified as dark-mode (light text on dark background) and inverted:
   $$I_{\text{inverted}}(x, y) = 255 - I_{\text{gray}}(x, y)$$
3. **Background Illumination & Shadow Compensation:** Phone camera photos often suffer from non-uniform shadows. The background illumination profile is estimated by applying a morphological dilation filter with a $7 \times 7$ structuring element followed by a large median filter ($21 \times 21$):
   $$I_{\text{bg}} = \text{MedianBlur}\left(\text{Dilate}(I_{\text{gray}}, K_{7 \times 7}), 21\right)$$
   The illumination-compensated image is obtained via difference normalization:
   $$I_{\text{norm}}(x, y) = 255 - |I_{\text{gray}}(x, y) - I_{\text{bg}}(x, y)|$$
4. **Otsu Dynamic Binarization:** Applies dual-threshold segmentation to calculate the optimal global threshold $T^*$ that minimizes intra-class variance:
   $$\sigma_w^2(T) = \omega_0(T)\sigma_0^2(T) + \omega_1(T)\sigma_1^2(T)$$
   $$I_{\text{binary}}(x, y) = \begin{cases} 255, & \text{if } I_{\text{norm}}(x, y) \ge T^* \\ 0, & \text{otherwise} \end{cases}$$
5. **Line Segmentation & Text Recognition:** The preprocessed raster is passed to Tesseract configured with Page Segmentation Mode 6 (`--psm 6` — uniform block of text) and PSM 4 (`--psm 4` — variable sizes).
6. **Token Cleansing & Noise Rejection:**
   - **Bullet & Number Stripping:** Strips list markers matching:
     $$\mathcal{R}_{\text{marker}} = \texttt{\textasciicircum(?:(?:[\textbackslash d]+|[a-zA-Z])[\textbackslash .\textbackslash ,\textbackslash )\textbackslash -:]|\textbackslash [[\textbackslash sxX✓✔\textbackslash *\textbackslash -\textbackslash +]?\textbackslash ]|[\textbackslash -\textbackslash *\textbackslash •\textbackslash –\textbackslash —\textbackslash >\textbackslash +])\textbackslash s*}$$
   - **Header & Footer Filtering:** Discards non-item tokens such as `"grocery list"`, `"subtotal"`, `"gst"`, `"cashier"`, and `"thank you"`.

---

## 3.4 Real-Time Data Retrieval & Anti-Bot Defense Engine

Because target platforms do not expose public APIs and render their store catalogs dynamically via single-page client frameworks, BuyWise utilizes headless Chromium instances orchestrated through Playwright.

---

### 3.4.1 Anti-Detection Stealth Pipeline (`browser_utils.py`)

Standard headless browsers leak automation fingerprints that trigger immediate bot defenses (HTTP 403 Forbidden, Akamai access denied screens, or blank search grids). BuyWise introduces a stealth browser launch configuration:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BROWSER STEALTH PROFILE                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Launch Arguments:                                                   │
│    • --disable-blink-features=AutomationControlled                     │
│    • --no-sandbox                                                      │
│    • --disable-dev-shm-usage                                           │
│    • --disable-infobars                                                │
│                                                                        │
│ 2. Context Injection:                                                  │
│    • User-Agent: Chrome/131.0.0.0 on Windows 10/11 x86_64             │
│    • Viewport: 1366 x 768 px                                           │
│    • Geolocation: Lat 12.9716, Lon 77.5946 (Permissions: ['geolocation'])│
│    • Locale: en-IN, Timezone: Asia/Kolkata                             │
│                                                                        │
│ 3. Client Hints Emulation (Sec-CH-UA Headers):                         │
│    • Sec-Ch-Ua: "Google Chrome";v="131", "Chromium";v="131"            │
│    • Sec-Ch-Ua-Mobile: ?0                                              │
│    • Sec-Ch-Ua-Platform: "Windows"                                     │
│                                                                        │
│ 4. JavaScript Runtime Pre-Injection (page.add_init_script):           │
│    • Object.defineProperty(navigator, 'webdriver', { get: () => undef })│
│    • Object.defineProperty(navigator, 'userAgentData', { ... })         │
│    • window.chrome = { runtime: {}, app: {}, csi: () => {}, ... }     │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Automation Flag Eradication:** The Chromium startup flag `--disable-blink-features=AutomationControlled` prevents the V8 engine from setting `navigator.webdriver = true`. An init script re-defines the property to return `undefined`.
2. **Client Hints Override:** Modern anti-bot frameworks inspect low-level User-Agent Client Hints (`navigator.userAgentData`). The engine overrides the object to declare authentic brands (`Google Chrome`, `Chromium`), mobile status `false`, and platform `Windows`.
3. **Chrome API Emulation:** Injecting a simulated `window.chrome` object containing dummy implementations of `runtime`, `app`, and `loadTimes()` satisfies scripts testing for native Chrome desktop runtimes.
4. **Geolocation Dark-Store Pinning:** Quick-commerce applications geofence product availability. Playwright pre-authorizes geolocation permissions and injects coordinates (`lat: 12.9716, lon: 77.5946`), routing queries to local dark-store warehouses.

---

### 3.4.2 Platform-Specific Scraping Implementations

#### A. Blinkit Scraping Engine (`blinkit.py`)
- **Navigation URL:** `https://blinkit.com/s/?q={quote(product_name)}`
- **Wait Condition:** Waits for currency element anchor `text=₹` (timeout: $20\text{s}$).
- **DOM Extraction Strategy:**
  1. Locates all elements containing the currency symbol `₹`.
  2. Traverses upward through the DOM hierarchy to identify the enclosing product card container (verifying container text length $> 50$ characters).
  3. Parses the text token lines inside the card to extract product title, pack size, price, and ETA.
  4. Resolves product URLs by inspecting ancestor `<a>` tags matching `/prn/` or extracting the `data-product-id` attribute.

#### B. Zepto Scraping Engine (`zepto.py`)
- **Navigation URL:** `https://www.zeptonow.com/search?query={quote(product_name)}`
- **Cookie Injection:** Injects session location cookies (`user_location={lat},{lon}`) before page navigation.
- **Wait Condition:** Waits for `a[data-testid="product-card"]`, `[data-slot-id="EdlpPrice"]`, or `text=₹`.
- **DOM Extraction Strategy:**
  1. Queries card nodes via `page.locator('a[data-testid="product-card"], div[data-testid="product-card"], a[href*="/pn/"]')`.
  2. Extracts product name from `[data-slot-id="ProductName"]` or inner headings (`h3`, `h4`, `h5`).
  3. Extracts pack size from `[data-slot-id="PackSize"]`.
  4. Reads discounted price from `[data-slot-id="EdlpPrice"]` and filters out out-of-stock items (`data-is-out-of-stock="true"`).

#### C. BigBasket Scraping Engine (`bigbasket.py`)
- **Navigation URL:** `https://www.bigbasket.com/ps/?q={quote(product_name)}`
- **Wait Condition:** Waits for `a[href*="/pd/"], [class*="SKUDeck"], text=₹`.
- **DOM Extraction Strategy:**
  1. Matches product cards using modern SKU selectors: `div[class*="SKUDeck"], li:has(a[href*="/pd/"]), [class*="SKUDeck"]`.
  2. Extracts brand from `span[class*="BrandName"]`.
  3. Extracts item name from `h3 a div h3`, `[class*="line-clamp-2"]`, or image `title`/`alt` attributes. Combines `Brand + Name` to create a complete title.
  4. Extracts pack size from `PackSelector` labels or listbox buttons (`[id*="headlessui-listbox-button"]`).
  5. Extracts selling price from pricing spans (`div.sc-jMakVo span`) or regex patterns (`₹\s*[\d,.]+`).
  6. Extracts delivery duration from green ETA badge elements (e.g., `"10 mins"`).

---

### 3.4.3 Parallel Execution, Staggering & Error Containment (`scraper.py`)

When comparing products across all three platforms simultaneously, executing three uncoordinated Chromium instances in parallel can trigger CPU spikes and disk I/O bottlenecks on Windows, causing selector timeouts.

BuyWise implements an **Asynchronous Staggered Coordinator**:

```python
async def scrape_all_platforms(product_name: str, headless: bool = True, lat: float = 12.9716, lon: float = 77.5946):
    scraper_tasks = [
        ("Blinkit", scrape_blinkit(product_name, headless=headless, lat=lat, lon=lon)),
        ("Zepto", scrape_zepto(product_name, headless=headless, lat=lat, lon=lon)),
        ("BigBasket", scrape_bigbasket(product_name, headless=headless, lat=lat, lon=lon)),
    ]
    # Execute concurrently with full exception containment
    responses = await asyncio.gather(*(coro for _, coro in scraper_tasks), return_exceptions=True)
```

- **Fault Isolation:** `return_exceptions=True` ensures that if one platform fails or encounters a bot challenge, the remaining scrapers finish unaffected.
- **Result Validation:** Returned dictionaries are verified for non-null pricing and platform keys before entering the ranking pipeline.

---

## 3.5 Product Identity Resolution & Unit Normalization

Quick-commerce catalogs label identical products with different strings across platforms:
- **Blinkit:** `"Amul Taaza Toned Fresh Milk - 500 ml"`
- **Zepto:** `"Amul Taaza Homogenised Toned Milk (Pouch)"`
- **BigBasket:** `"Amul Taaza Toned Milk, 500 ml Pouch"`

To establish an apples-to-apples comparison, BuyWise combines **entity filtering** with **unit price normalization**.

```
Raw Product Scrapes:
  • Blinkit:   ₹28 for 500 ml
  • Zepto:     ₹27 for 500 ml
  • BigBasket: ₹54 for 1000 ml (1 L)
                 │
                 ▼
      [ Base Unit Conversion ]
  • Blinkit:   500 ml
  • Zepto:     500 ml
  • BigBasket: 1000 ml
                 │
                 ▼
    [ Canonical Unit Rate Calculation ]
  • Blinkit:   (28 / 500)  * 100 = ₹5.60 / 100ml
  • Zepto:     (27 / 500)  * 100 = ₹5.40 / 100ml   <-- BEST RATE
  • BigBasket: (54 / 1000) * 100 = ₹5.40 / 100ml   <-- BEST RATE
```

---

### 3.5.1 Canonical Unit Pricing Formula (`quantity_utils.py`)

For any scraped product item with selling price $P$ and normalized quantity $Q_{\text{base}}$:

$$\text{Unit Rate} = \begin{cases}
\left( \dfrac{P}{Q_{\text{base}}} \right) \times 100, & \text{if dimension is Volume (₹ per 100 ml)} \\[10pt]
\left( \dfrac{P}{Q_{\text{base}}} \right) \times 100, & \text{if dimension is Weight (₹ per 100 g)} \\[10pt]
\left( \dfrac{P}{Q_{\text{base}}} \right) \times 1, & \text{if dimension is Count (₹ per piece)}
\end{cases}$$

This unit rate allows direct price efficiency comparisons across differing package sizes.

---

### 3.5.2 Candidate Matching & Ranking Engine

When multiple search results match a query on a platform, candidate selection proceeds through a four-stage ranking filter:
1. **Word Token Intersection:** Verifies that significant tokens ($\text{length} > 2$) of the search query exist in the candidate title.
2. **Stemming & Inflection Handling:** Matches word stems (e.g., `"apple"` matching `"apples"`).
3. **Quantity Match Priority:** Prioritizes products matching the user's requested pack size before selecting alternatives.
4. **Normalized Rate Tie-Breaking:** If multiple listings match, the candidate with the lowest unit rate is chosen.

---

## 3.6 Cart-Level Multi-Store Optimization Algorithms (`compare.py`)

When optimizing a multi-item shopping cart $\mathcal{I} = \{i_1, i_2, \dots, i_N\}$, the decision space of possible allocations is $|\mathcal{P}|^N$. For $|\mathcal{P}| = 3$, an 8-item cart involves $3^8 = 6,561$ configurations, while a 20-item cart involves $3^{20} \approx 3.48 \times 10^9$ configurations.

BuyWise implements an **Adaptive Cart-Optimization Strategy** that selects the most efficient search algorithm based on shopping list size $N$:

```
 Shopping List Size N
         │
         ├─── N ≤ 8 Items   ────> Exact Combinatorial Backtracking
         │                         • Evaluates all 3^N configurations
         │                         • Guaranteed global minimum
         │
         ├─── 9 ≤ N ≤ 20    ────> Branch and Bound with Suffix Sum Bounds
         │                         • Branches on high-variance items first
         │                         • Prunes sub-trees where LowerBound ≥ BestCost
         │
         └─── N > 20 Items  ────> Greedy Initialization + Iterative Consolidation
                                   • Starts with cheapest item options
                                   • Prunes redundant platforms to save delivery fees
```

---

### 3.6.1 Algorithm 1: Small Cart Optimization ($N \le 8$)

For $N \le 8$, the search space is small enough to perform an exhaustive depth-first search:

```
Algorithm 1: Exact Combinatorial Backtracking
────────────────────────────────────────────────────────────────────────
Input:  List of requested items I, candidate options items_by_term
Output: Optimal assignment A*, minimum total cost C*

1:  best_cost ← ∞, best_assignment ← ∅
2:  procedure Backtrack(idx, current_assignment):
3:      if idx = |I| then
4:          cost, _, _, _, _, _ ← ComputeAllocationCheckoutCost(current_assignment)
5:          if cost < best_cost then
6:              best_cost ← cost
7:              best_assignment ← Copy(current_assignment)
8:          return
9:      item ← I[idx]
10:     for each candidate opt in items_by_term[item] do:
11:         current_assignment.Append(opt)
12:         Backtrack(idx + 1, current_assignment)
13:         current_assignment.Pop()
14: Backtrack(0, ∅)
15: return best_assignment, best_cost
```

---

### 3.6.2 Algorithm 2: Medium Cart Optimization ($9 \le N \le 20$)

For medium carts, an unpruned search would be too slow. BuyWise uses **Branch and Bound with Suffix Minimum Lower Bounding**:

1. **Item Re-Ordering by Price Variance:** Calculates price variance across platforms for each item:
   $$\text{Var}(i_k) = \frac{1}{|\mathcal{O}_k|} \sum_{opt \in \mathcal{O}_k} (E_{k, opt} - \bar{E}_k)^2$$
   Items are sorted in descending order of variance. Branching on high-variance items first narrows the search space earlier.
2. **Precomputed Suffix Minimum Sum Array:** Computes the theoretical minimum expenditure for remaining items:
   $$\text{SuffixMin}[j] = \sum_{k=j}^{N} \min_{p \in \mathcal{P}} E_{k, p}$$
3. **Admissible Lower Bound Pruning:** At decision level $\text{idx}$, the current allocation cost is evaluated. If:
   $$\text{CurrentCost}(\text{assignment}_{1 \dots \text{idx}}) + \text{SuffixMin}[\text{idx}] \ge \text{BestCost}$$
   the entire sub-tree is pruned because even if all remaining items are acquired at their cheapest available price with zero additional delivery fees, this branch cannot beat $\text{BestCost}$.

---

### 3.6.3 Algorithm 3: Large Cart Optimization ($N > 20$)

For $N > 20$, BuyWise employs a **Greedy Initialization with Iterative Platform Consolidation**:

1. **Greedy Seed:** Every item is initially assigned to its cheapest platform based on price alone.
2. **Consolidation Loop:**
   - Computes total checkout cost including delivery and handling fees for all active platforms.
   - For each active platform $p_{\text{active}}$, evaluates whether eliminating that platform (reassigning its items to alternative platforms already in use) reduces total checkout cost by avoiding $p_{\text{active}}$'s delivery and handling fees.
   - If an elimination reduces total checkout cost, the change is accepted and the consolidation loop repeats until no further reductions are possible.

---

### 3.6.4 Single-Store vs. Multi-Store Split Cart Evaluation

The optimizer compares two overall purchasing strategies:
1. **Best Consolidated Single-Store Cart:** All obtainable items are purchased from one platform, maximizing progress toward free delivery thresholds and paying only one handling fee.
2. **Best Multi-Store Split Cart:** Items are divided across multiple platforms to capture lower individual item prices.

The system recommends a split cart only if the item-level savings exceed the extra delivery and handling charges:

$$\Delta \text{Savings} = \text{TCO}(\text{SingleStore}^*) - \text{TCO}(\text{SplitCart}^*)$$

If $\Delta \text{Savings} > 0$, the split cart is recommended along with a clear summary:
> *"Split cart saves ₹48.00 overall across Blinkit and Zepto after accounting for all platform delivery fees."*

---

## 3.7 Multi-Tier Caching & Performance Optimization

To achieve sub-second response times despite browser scraping latencies ($8\text{--}15\text{s}$ per query), BuyWise implements a two-tier caching architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UPSTASH REDIS CACHE                             │
├────────────────────────────────────────────────────────────────────────┤
│ Key Format:       cache:compare:{normalized_search_query}              │
│ TTL:              900 seconds (15 minutes sliding expiration)         │
│ Data Payload:     JSON stringified comparison & candidate array        │
│ Cache Hit Time:   < 50 milliseconds                                    │
│ Read Strategy:    Immediate return on cache hit                        │
│ Write Strategy:   Asynchronous background write on fresh scrape        │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Cache Read Layer:** Incoming queries check Upstash Redis via REST over TLS (`rediss://`).
2. **Stale-While-Revalidate Protocol:**
   - **Cache Hit ($< 15\text{ min old}$):** The cached payload is returned to the user in under $50\text{ ms}$.
   - **Cache Miss:** The request is proxied through the ngrok tunnel to the Playwright scraping engine. Once scraped, the Node.js gateway saves the payload to Redis via `SETEX key 900 value`.
3. **Background Pre-Warming Engine (`cache_warmer.py`):** Runs periodically on the edge node to scrape common staple items (*"milk"*, *"bread"*, *"butter"*, *"eggs"*, *"maggi"*), keeping key items pre-cached before peak morning and evening shopping hours.

---

## 3.8 Smart Deep Link Generation & Privacy Guarantee

BuyWise acts strictly as an **informational decision-support layer**. The platform intentionally does not collect payment details, handle customer balances, or place orders directly on behalf of users.

Instead, BuyWise produces **Smart Deep Links**:
- Direct product-page URLs are extracted dynamically from each platform's DOM during the scrape.
- Clicking a platform recommendation opens the verified product card directly on Blinkit, Zepto, or BigBasket, allowing the user to checkout using their existing accounts, addresses, and payment methods.

---

## 3.9 System Workflow & Data Pipeline Summary

```
                      END-TO-END PIPELINE SUMMARY
 
  1. USER INPUT       User provides query string or uploads grocery image.
         │
         ▼
  2. OCR / NLP        OpenCV preprocesses image; Tesseract / Regex extracts
                      canonical entity, numeric quantity, and canonical unit.
         │
         ▼
  3. CACHE CHECK      Node.js Gateway inspects Upstash Redis for existing key.
         │
         ├─── CACHE HIT  ──> Returns cached JSON in < 50ms.
         │
         └─── CACHE MISS
                  │
                  ▼
  4. TUNNEL FORWARD   Dispatches query via secure ngrok tunnel to edge engine.
                  │
                  ▼
  5. STEALTH SCRAPE   FastAPI triggers Playwright Chromium instances.
                      Bypasses anti-bot controls; queries Blinkit, Zepto,
                      and BigBasket in parallel.
                  │
                  ▼
  6. NORMALIZATION    quantity_utils.py computes base metrics and unit prices
                      (₹/100g, ₹/100ml) across differing package sizes.
                  │
                  ▼
  7. CART OPTIMIZER   compare.py evaluates single-store vs split-cart options
                      using backtracking, branch-and-bound, or greedy search.
                  │
                  ▼
  8. CACHE & STORE    Stores results in Upstash Redis (900s TTL) and logs
                      catalog telemetry to MongoDB Atlas.
                  │
                  ▼
  9. CLIENT RENDER    React frontend displays interactive comparison cards,
                      highlighting "Cheapest", "Fastest", and "Best Value".
```

---

## 3.10 Summary of Methodological Advancements

| Capability | Traditional Price Comparison | BuyWise Methodology |
| :--- | :--- | :--- |
| **Comparison Scope** | Single item price only | Cart-level Total Cost of Ownership (TCO) |
| **Package Size Handling** | Direct price comparison (misleading) | Metric unit normalization (₹/100g, ₹/100ml) |
| **Platform Fees** | Completely ignored | Explicit delivery tiers & handling fee modeling |
| **Dark Store Localisation** | Fixed national catalog pricing | Micro-geolocated real-time inventory inspection |
| **Data Ingestion** | Manual text search only | Multi-modal: Raw text, OCR notes, shopping lists |
| **Data Collection** | Broken by anti-bot defenses | Stealth headless browsers on residential edge nodes |
| **Optimization Horizon** | No combinatorial evaluation | Exact, Branch-and-Bound, & Greedy cart optimization |
| **User Privacy** | Requires third-party credentials | Privacy-preserving via Smart Deep Link generation |
