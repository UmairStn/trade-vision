"""
News and Announcements API endpoints.
Provides the live CSE announcements sentiment feed and investor risk flags.
"""

# pyrefly: ignore[missing-import]
from fastapi import APIRouter, HTTPException, Query
# pyrefly: ignore[missing-import]
from starlette.concurrency import run_in_threadpool

from api.dependencies import get_announcement_pipeline
from services import cse_api
from services.cse_api import CseApiError
from services.ticker_registry import _normalize

router = APIRouter(prefix="/api/v1/news", tags=["news"])


@router.get("/feed", summary="Live CSE announcements enriched with FinBERT sentiment")
async def get_news_feed(
    symbol: str | None = Query(None, description="Filter by CSE ticker (e.g. JKH.N0000)"),
    sentiment: str | None = Query(None, description="Filter by sentiment: Bullish | Bearish | Neutral"),
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=100),
):
    pipeline = get_announcement_pipeline()

    try:
        data = await run_in_threadpool(pipeline.get_enriched_feed, limit=100)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch announcement feed: {e}") from e

    items = data.get("items", [])

    # Ensure label and sentiment_label are present on every item
    for x in items:
        lbl = x.get("sentiment_label") or x.get("label") or "Neutral"
        x["sentiment_label"] = lbl
        x["label"] = lbl

    # Filter by symbol or company
    if symbol:
        norm_sym = _normalize(symbol)
        base_sym = norm_sym.split(".")[0]
        items = [
            x for x in items
            if (x.get("symbol") and norm_sym == _normalize(x["symbol"]))
            or (base_sym in (x.get("company") or "").upper())
        ]

    # Filter by sentiment
    if sentiment and sentiment.lower() != "all":
        s_lower = sentiment.lower()
        items = [
            x for x in items
            if (x.get("sentiment_label") or x.get("label") or "").lower() == s_lower
        ]

    # Filter by category
    if category and category.lower() != "all":
        c_lower = category.lower()
        items = [x for x in items if c_lower in (x.get("category") or "").lower()]

    return {
        "mood": data.get("mood"),
        "count": len(items[:limit]),
        "feed": items[:limit],
    }


@router.get("/risk-flags", summary="Active non-compliance and regulatory risk notices for a symbol")
async def get_risk_flags(
    symbol: str = Query(..., description="CSE ticker (e.g. JKH.N0000)"),
):
    norm = _normalize(symbol)
    base_sym = norm.split(".")[0]

    try:
        notices = await run_in_threadpool(cse_api.non_compliance_announcements)
    except CseApiError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    matches = []
    for n in notices:
        title = (n.get("title") or "").upper()
        cat = (n.get("category") or "").upper()
        if base_sym in title or base_sym in cat or norm in title:
            item_n = dict(n)
            item_n["label"] = item_n.get("title") or "Non-Compliance Notice"
            matches.append(item_n)

    return {
        "symbol": symbol,
        "has_risk": len(matches) > 0,
        "notice_count": len(matches),
        "notices": matches,
    }
