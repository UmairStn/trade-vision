# AGENTS.md — TradeVision (root)

Guidance for AI agents working anywhere in this repo. Read this first.
Deep backend specifics live in [`TradeVision-backend/AGENTS.md`](TradeVision-backend/AGENTS.md);
a full implementation walkthrough lives in [`EXPLANATION.md`](EXPLANATION.md).

## What this is

TradeVision is a full-stack web app for analyzing and predicting trends on the
**Colombo Stock Exchange (CSE)**. Monorepo with two independently runnable apps:

| Path | Stack | What it does |
|---|---|---|
| `TradeVision-frontend/` | React 19, TypeScript, Vite, Tailwind v4, Supabase Auth | SPA: charts, dashboard, AI chat UI |
| `TradeVision-backend/` | Python 3.11, FastAPI, XGBoost, FinBERT, Gemini | API: predictions, sentiment, market data, chat, watchlist/portfolio |

**4th-year capstone project. Prototype — not financial advice.**

## ⚠️ Docker-first — read before running anything

**Everything runs through Docker Compose.** Do not `pip install` on the host, do
not run `uvicorn` or training scripts with host Python. The backend must be built
and run by the exact pinned `xgboost-cpu` in `requirements.txt` (training and
serving must match), and Playwright/Chromium is installed inside the image.

- Compose files live in `<app>/docker/docker-compose.yml` — **run commands from
  the app directory** (`TradeVision-backend/` or `TradeVision-frontend/`), not
  from `docker/` and not from the repo root.
- Build context is the app dir (`context: ..` relative to `docker/`).
- Dev containers bind-mount source for hot reload; changes on the host apply
  instantly, no rebuild needed (rebuild only after dependency changes).
- The `hf_cache` named volume persists the ~400 MB FinBERT download across
  rebuilds — never remove those volume mappings.
- `models/*.json` (trained XGBoost artifact) is **deliberately committed** — prod
  has no bind mount and loads it from inside the image. Do not gitignore it.
- `ml/data/` (training CSVs) is generated and gitignored — never commit it.

### Backend commands (from `TradeVision-backend/`)

```bash
# Dev (hot reload) — http://localhost:8000, Swagger at /docs
docker compose -f docker/docker-compose.yml up -d --build backend-dev

# Prod verify (port 8000, 2 workers)
docker compose -f docker/docker-compose.yml --profile prod up -d --build backend-prod
```

### Frontend commands (from `TradeVision-frontend/`)

```bash
# Dev (hot reload) — http://localhost:5173
docker compose -f docker/docker-compose.yml up -d --build frontend-dev

# Prod (nginx bundle) — http://localhost:80
docker compose -f docker/docker-compose.yml --env-file .env --profile prod up --build
```

(The frontend also tolerates a bare host `npm run dev`, but Docker is the norm.)

## Training & model lifecycle — inside the container only

```bash
docker compose -f docker/docker-compose.yml exec backend-dev python -m ml.fetch_data
docker compose -f docker/docker-compose.yml exec backend-dev python -m ml.train_model
docker compose -f docker/docker-compose.yml restart backend-dev   # reload artifact
```

More training data → add tickers to `ml/cse_universe.py` (does **not** change which
symbols can be predicted).

## Verification

`TradeVision-backend/test/` holds **manual `__main__` scripts, not a pytest suite**.
Run them via `docker compose -f docker/docker-compose.yml exec backend-dev …`:

```bash
python -m test.test_prediction_engine JKH.N0000   # engine smoke test
python -m test.test_news_pipeline                  # sentiment pipeline
python -m test.test_stale_data JKH.N0000           # stale-feed guard (run after touching price/features code)
python -m test.verify_features ml/data/JKH-N0000.CM.csv  # feature parity
```

Frontend: `npm run lint` and `npm run build` (in `TradeVision-frontend/`).

## Environment & secrets

- Each app has its own `.env` at the **app root** (`TradeVision-backend/.env`,
  `TradeVision-frontend/.env`), gitignored at any depth. Copy from
  `.env.example`. Both apps boot fine with no `.env` — only chat (needs
  `GEMINI_API_KEY`) and auth/DB features degrade.
- Backend `.env`: `GEMINI_API_KEY`, `AI_ANALYSIS_API_URL`/`_KEY`/`_MODEL`
  (DeepSeek — powers `/stocks/ai-analysis` and the chat fallback),
  `SUPABASE_JWT_SECRET`, `SUPABASE_DB_URL`, cache TTLs, scraper mode.
- Frontend `.env`: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_AI_ANALYSIS_ENABLED` (locks the deep-analysis button behind "coming
  soon" when not `true`).
  Only the Supabase **anon** key belongs there — Vite vars are public in the browser.
- **`VITE_API_URL` is a build-time value for prod**: Vite inlines it into the
  bundle. Setting it on a running container does nothing; rebuild instead
  (hence `--env-file .env` on the prod command above).

## Hard invariants — do not break these

1. **Feature contract**: `TradeVision-backend/services/features.py` is the single
   source of truth for model features, imported by both training and serving.
   Never compute features anywhere else. Any change to the feature list requires
   retraining (`python -m ml.train_model`) inside the container.
2. **Train/serve feed split**: **serving reads the live CSE API** — predictions,
   charts and quotes run on `cse_api.historical_5day()` via
   `price_data.get_prediction_history()` (~5 daily bars, genuinely current).
   **Training reads Yahoo CSVs** (`ml/data/`, hard cutoff `TRAIN_END=2026-01-31`
   — Yahoo's live CSE tail is dead). Features themselves are computed only by
   `services/features.py` in both paths, and every feature window is ≤ 3 because
   serving gets only ~5 bars. Details in the backend AGENTS.md data contract.
3. **Stale-data handling**: Yahoo's CSE feed forward-fills dead bars. Training
   CSVs are cut at `TRAIN_END` and **both** paths run
   `features.drop_non_trading_rows()`; `_trim_stale_tail()` now guards only the
   legacy Yahoo fetch path (kept for `test_stale_data`). Run
   `test.test_stale_data` after touching any of it.
4. **Blocking work in routes must use `run_in_threadpool`** — yfinance, FinBERT,
   and especially `sync_playwright()` (which raises inside a running event loop).
5. **Graceful degradation**: a missing model artifact or missing API key must
   never crash the app — endpoints return partial data with `model_status` /
   `warnings` instead.
6. **snake_case → camelCase mapping happens only in
   `TradeVision-frontend/src/services/api.ts`** — the backend speaks snake_case,
   components speak camelCase, and this file is the only translation point.

## Where things live

**Backend** (`TradeVision-backend/`, imports absolute from this root, no
`__init__.py` files — namespace packages):

- `api/main.py` — FastAPI app + CORS; `api/routes/` — prediction, market, chat,
  watchlist, portfolio; `api/schemas/` — Pydantic models; `api/dependencies.py` —
  lazy singletons (FinBERT, XGBoost engine) + JWT auth.
- `services/` — all business logic: features, price_data, prediction_engine,
  news_pipeline, scraper, sentiment, cse_api, gemini_chat, deepseek_chat,
  ai_analysis, symbol_search, cache, ticker_registry.
- `ml/` — fetch_data + train_model; `models/` — trained artifact; `db/` —
  SQLAlchemy models; `scheduler/`, `db/` may be placeholders.

**Frontend** (`TradeVision-frontend/`):

- `src/pages/` — route screens; `src/components/` — reusable UI (incl. `ui/` kit);
  `src/context/` — Auth, Stock, Chat, Theme providers.
- `src/services/api.ts` — the only backend client; `src/lib/supabase.ts` — auth
  client; `src/types/stock.ts` — data contracts.
- Routes registered in `src/App.tsx`; `ProtectedRoute` guards `/dashboard`, `/chat`.

**Adding things** (details in backend AGENTS.md "Where to add things"):
API endpoint → new router in `api/routes/` + include in `api/main.py`. Chat
capability → tool declaration in `services/gemini_chat.py` **and** handler in
`api/routes/chat.py`. Frontend page → `src/pages/` + route in `App.tsx`.

## Git

- Branches: `main` (default) and `test`. Remotes: `origin`, `personal`, `upstream`
  (a fork workflow — be explicit about which remote you push to).
- Commit style: short conventional-ish messages (`fix:`, `chore:`, `style:` …).

## Docs map

| Doc | Read when |
|---|---|
| `TradeVision-backend/AGENTS.md` | Touching **any** backend code — data contracts, model contract, gotchas |
| `EXPLANATION.md` | You need the full data-flow / architecture walkthrough |
| `README.md` | Product overview, features, roadmap |
| `TradeVision-backend/.env.example`, `TradeVision-frontend/.env.example` | Every config option, with inline rationale |
