TEHRAN_OFFSET = "+03:30"


def to_iso_tehran(dt):
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is not None:
        return dt.isoformat()
    return dt.isoformat() + TEHRAN_OFFSET