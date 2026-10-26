# TradeVision 📈

> **Under active development** — built as a 4th-year capstone project.

TradeVision is a web application for analyzing stocks listed on the **Colombo Stock Exchange (CSE)**. It pairs interactive market charts with AI-powered price predictions, a natural-language chatbot, and a personal portfolio tracker — all in one place.

Most CSE tools are dated, hard to use, or aimed at enterprise users. TradeVision is designed for everyday investors: clean interface, live market data from the CSE API, and AI insights explained in plain language.

---

## What can it do?

| Feature | What you get |
|---|---|
| **📊 Stock Analyzer** | Search any CSE-listed company, view an interactive price chart, and see an AI prediction for the next day, week, and month with confidence scores and risk flags. |
| **💬 AI Chatbot** | Ask questions in plain English — *"What's the price of JKH?"*, *"Which stocks are gaining today?"* — and get answers from real market data, not guesses. |
| **📈 Portfolio Dashboard** | Add your holdings, track profit & loss, and maintain a watchlist. Saved to your account. |
| **🌍 Market Overview** | Top gainers, top losers, most active stocks, the ASPI, and a sector heatmap. |
| **📰 News Hub** | CSE corporate announcements with AI sentiment scoring and non-compliance risk notices. |
| **🎨 Modern UI** | Fully responsive with light/dark mode. |

---

## How the AI works 🧠

Stock prediction is hard, and price data alone only tells part of the story. TradeVision combines two signals:

```
                 ┌─────────────────────┐
   Historical ───►  XGBoost model      │
   prices &       │ (1-day / 7-day /   ├──┐
   volume         │  30-day horizons)  │  │
                 └─────────────────────┘  │    ┌──────────┐      ┌────────────┐
                                          ├───►│  Fusion  │──────► Prediction │
                 ┌─────────────────────┐  │    │  model   │      │ + confidence│
   Financial  ──►│ FinBERT sentiment   ├──┘    └──────────┘      └────────────┘
   news           │ analysis           │
                 └─────────────────────┘
```

1. **Technical signal** — XGBoost models predict expected returns for three horizons (1 day, 7 days, 30 days), trained on historical CSE price and volume data. The models are *cross-sectional*, meaning they compare stocks against each other on the same day, so they work for any CSE ticker.
2. **Sentiment signal** — FinBERT (a finance-tuned language model) reads CSE corporate announcements and scores them as positive, negative, or neutral.
3. **Fusion** — the sentiment score adjusts the technical prediction, producing a final estimate with a confidence score.

### The chatbot isn't "making things up"

The chatbot runs on **Google Gemini** using function calling. When you ask a question, Gemini picks from a set of real backend tools (get quote, get analysis, list gainers, etc.), the backend executes them against live data, and Gemini explains the actual result in natural language. If Gemini is unavailable, it falls back to **DeepSeek**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Radix UI |
| **Backend** | Python 3.11, FastAPI |
| **Machine Learning** | XGBoost, FinBERT (Hugging Face Transformers) |
| **LLM** | Google Gemini (function calling), DeepSeek (fallback) |
| **Database** | PostgreSQL via Supabase (auth + portfolio storage) |
| **Market Data** | CSE API (live), Yahoo Finance (historical training data) |
| **Deployment** | Docker, Docker Compose, Nginx |

---

## Getting Started

Both apps run independently. Docker is the recommended way to run them.

### 1. Backend

```bash
cd TradeVision-backend
docker compose -f docker/docker-compose.yml up -d --build backend-dev
```

API starts at **http://localhost:8000** — interactive docs at `/docs`.

### 2. Frontend

```bash
cd TradeVision-frontend
docker compose -f docker/docker-compose.yml up -d --build frontend-dev
```

App starts at **http://localhost:5173**.

### 3. Configuration (optional)

Everything works out of the box for market data and predictions. To enable the AI features, create `.env` files from the provided examples:

**`TradeVision-backend/.env`**

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables the chatbot |
| `AI_ANALYSIS_API_KEY` | Enables DeepSeek deep analysis & chatbot fallback |
| `SUPABASE_JWT_SECRET` | Verifies login tokens |
| `SUPABASE_DB_URL` | Database connection for portfolio/watchlist |

**`TradeVision-frontend/.env`**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend address (default `http://localhost:8000`) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Enables login & saved portfolios |
| `VITE_AI_ANALYSIS_ENABLED` | Unlocks the "AI deep analysis" button |

> Without API keys the app still runs — the chatbot simply disables itself.

---

## Project Structure

```
TradeVision/
├── TradeVision-frontend/     React SPA
│   └── src/
│       ├── pages/            Home, Analyzer, Dashboard, News, Chat, Auth…
│       ├── components/       Charts, chat widget, dashboard, UI kit
│       ├── context/          Theme, stock data, chat, auth state
│       └── services/         Backend API client
│
└── TradeVision-backend/      FastAPI service
    ├── api/                  App, routes, schemas
    ├── services/             Prediction, sentiment, chat, CSE API, caching
    ├── models/               Trained XGBoost artifacts (committed)
    ├── ml/                   Training/evaluation scripts (legacy)
    ├── db/                   Database models
    └── docker/               Dockerfile + compose files
```

### API Endpoints

All routes live under `/api/v1`:

| Endpoint | Description |
|---|---|
| `GET /stocks/analyze` | Prediction for a ticker (1d / 7d / 30d + sentiment) |
| `GET /market/summary` | Gainers, losers, most active, ASPI |
| `GET /market/quote`, `/history`, `/symbols` | Quotes, price history, full ticker list |
| `GET /market/announcements`, `/sectors` | CSE announcements and sector indices |
| `GET /news/feed`, `/news/risk-flags` | Sentiment-scored news and risk notices |
| `POST /chat` | Gemini chatbot with function calling |
| `GET/POST/DELETE /watchlist/*`, `/portfolio/*` | Per-user portfolio (requires login) |

---

## Roadmap

- [x] XGBoost multi-horizon prediction pipeline
- [x] FinBERT news sentiment analysis
- [x] Fusion model
- [x] Backend API
- [x] Portfolio & watchlist dashboard
- [x] Gemini chatbot with function calling
- [ ] Automated end-to-end tests against live CSE data
- [ ] Production deployment

---

## ⚠️ Disclaimer

TradeVision is an **educational prototype** built for research purposes. Predictions are AI-generated estimates, not financial advice. Do **not** use this application for actual trading or investment decisions.

---

## 👤 Author

**UmairStn** · [umairsulthan828@gmail.com](mailto:umairsulthan828@gmail.com)

TradeVision is under continuous development. Deployment docs and further improvements are on the way.
