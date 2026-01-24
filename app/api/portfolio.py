from fastapi import APIRouter
from app.services.portfolio_aggregate import build_portfolio
from app.models.portfolio_item import PortfolioItem

router = APIRouter(
    prefix="/portfolio",
    tags=["Portfolio"]
)


@router.get("", response_model=list[PortfolioItem])
async def get_portfolio():
    return await build_portfolio()
