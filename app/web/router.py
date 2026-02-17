from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pymoex import MoexClient

from app.api.deps import get_moex_client
from app.services.portfolio_aggregate import build_portfolio

router = APIRouter()
templates = Jinja2Templates(directory="app/web/templates")


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request, client: MoexClient = Depends(get_moex_client)):
    portfolio = await build_portfolio(client)
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "portfolio": portfolio},
    )
