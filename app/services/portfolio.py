from app.exceptions import AssetNotFoundError, InvalidQuantityError
from app.models.assets import Asset
from app.repositories.asset import delete_asset, update_current, update_target


def remaining_qty(asset: Asset) -> int:
    """
    Сколько актий осталось докупить
    """
    return max(asset.target_qty - asset.current_qty, 0)


def progress_percent(asset: Asset) -> float:
    """
    Процент выполнения цели
    """
    if asset.target_qty == 0:
        return 0.0

    return round(asset.current_qty / asset.target_qty * 100, 2)


def is_target_reached(asset: Asset) -> bool:
    """
    Достигнута ли цель
    """
    return asset.current_qty >= asset.target_qty


async def remove_asset(ticker: str):
    deleted = await delete_asset(ticker)
    if not deleted:
        raise AssetNotFoundError(f"Актив {ticker} не найден")

    return {"status": "deleted", "ticker": ticker.upper()}


async def change_target(ticker: str, target_qty: int):
    if target_qty < 0:
        raise InvalidQuantityError("Цель не может быть отрицательной")

    updated = await update_target(ticker, target_qty)
    if not updated:
        raise AssetNotFoundError(f"Актив {ticker} не найден")

    return {
        "status": "target_updated",
        "ticker": ticker.upper(),
        "target_qty": target_qty,
    }


async def change_current(ticker: str, current_qty: int):
    if current_qty < 0:
        raise InvalidQuantityError("Значение не может быть отрицательным")
    updated = update_current(ticker, current_qty)
    if not updated:
        raise AssetNotFoundError(f"Актив {ticker} не найден")

    return {
        "status": "current_updated",
        "ticker": ticker.upper(),
        "current_qty": current_qty,
    }
