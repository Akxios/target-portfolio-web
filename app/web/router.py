from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.models.position import Position
from app.services.portfolio import add_position_service
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


@router.post("/add")
async def add_position(
    ticker: str = Form(...),
    type: str = Form(...),
    current_qty: int = Form(...),
    target_qty: int = Form(...),
):
    position = Position(
        ticker=ticker.upper(),
        type=type,
        current_qty=current_qty,
        target_qty=target_qty,
    )

    await add_position_service(position)
    return RedirectResponse("/", status_code=303)
