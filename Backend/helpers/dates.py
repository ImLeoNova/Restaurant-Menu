from datetime import date, datetime, timedelta

TEHRAN_OFFSET = "+03:30"


def to_iso_tehran(dt):
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is not None:
        return dt.isoformat()
    return dt.isoformat() + TEHRAN_OFFSET


def get_persian_week_bounds(reference_date=None):
    """
    Iranian week is Saturday → Friday.
    Returns (week_start: date, week_end: date) for the week containing reference_date.
    """
    if reference_date is None:
        reference_date = datetime.now().date()
    elif isinstance(reference_date, datetime):
        reference_date = reference_date.date()

    # weekday(): Monday=0 … Sunday=6
    # We want Saturday as start → days since last Saturday
    days_since_saturday = (reference_date.weekday() + 2) % 7
    week_start = reference_date - timedelta(days=days_since_saturday)
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def get_current_persian_week_bounds():
    return get_persian_week_bounds(datetime.now().date())


def get_previous_persian_week_bounds(reference_date=None):
    start, _ = get_persian_week_bounds(reference_date)
    prev_ref = start - timedelta(days=1)
    return get_persian_week_bounds(prev_ref)
