# BuyWise

BuyWise compares grocery prices across BigBasket, Blinkit, Zepto, and JioMart.

## Architecture

```text
React frontend (3000)
        |
        v
Node API (5000) -------- MongoDB Atlas
        |
        v
Python/FastAPI service (8000) -------- Redis (6379)
        |
        +-- Scrapers
        +-- Unit-price normalization
        +-- Product comparison
        +-- Cart optimization inside comparison responses
        +-- OCR endpoint
```

The Node server owns authentication, users, JWT cookies, and API gateway routes. The Python service remains the owner of scraping, normalization, comparison, optimization, and OCR logic.

## Local Setup

Start each service in a separate PowerShell terminal.

### Redis

Redis must be available on port `6379`:

```powershell
python -c "import redis; print(redis.Redis(host='localhost', port=6379).ping())"
```

The command should print `True`.

### Python service

```powershell
cd "C:\Users\Ruchika Singh\OneDrive\Desktop\BuyWise\BuyWise\backend"
python -c "import asyncio, uvicorn; asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy()); uvicorn.run('main:app', host='127.0.0.1', port=8000, reload=False)"
```

FastAPI documentation: http://127.0.0.1:8000/docs

### Node service

```powershell
cd "C:\Users\Ruchika Singh\OneDrive\Desktop\BuyWise\BuyWise\backend\node-server"
npm run dev
```

Health check: http://127.0.0.1:5000/api/health

### React frontend

```powershell
cd "C:\Users\Ruchika Singh\OneDrive\Desktop\BuyWise\BuyWise\frontend"
npm start
```

Frontend: http://localhost:3000

## Main API Routes

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Authentication uses an HTTP-only JWT cookie. Passwords are stored as bcrypt hashes in MongoDB and are never returned by the API.

### User

```text
GET /api/user/profile
```

Requires authentication.

### Products

```text
POST /api/products/compare
POST /api/products/parse-image
```

The product routes forward requests to the Python service.

## Tests

Node API tests:

```powershell
cd backend\node-server
npm test
```

React tests:

```powershell
cd frontend
npm test -- --watchAll=false
```

React production build:

```powershell
cd frontend
npm run build
```

## Current Scope Notes

- Existing Python scraping, unit-price normalization, comparison, and optimizer logic is preserved.
- OCR remains available through the gateway but image extraction may require local Tesseract configuration.
- The Cart page and Cart API are currently not exposed in application routing.
- Keep `.env` files and generated build output out of Git.
