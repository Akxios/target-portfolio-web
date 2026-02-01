from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.services.portfolio_aggregate import build_portfolio

router = APIRouter()
templates = Jinja2Templates(directory="app/web/templates")


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    portfolio = await build_portfolio()
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "portfolio": portfolio},
    )
