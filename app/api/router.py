from fastapi import APIRouter, HTTPException

from app.services.moex import get_ticker

router = APIRouter(
    prefix="/api/moex",
    tags=["moex"]
)


@router.get("shares/{ticket}")
async def get_share_data(ticket: str):
    try:
        return await get_ticker(ticket.upper())
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
