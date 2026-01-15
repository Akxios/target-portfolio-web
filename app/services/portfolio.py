from app.models.assets import Asset


def remaining_qty(asset: Asset) -> int:
    """
    Сколько актий осталось докупить
    """
    return  max(asset.target_qty - asset.current_qty, 0)


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
