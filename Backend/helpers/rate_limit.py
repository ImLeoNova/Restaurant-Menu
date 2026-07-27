import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        request_times = [t for t in self.requests[key] if t > window_start]
        request_times.append(now)
        self.requests[key] = request_times
        return len(request_times) <= self.max_requests
