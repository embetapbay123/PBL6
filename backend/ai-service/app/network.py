"""Reuse the lifespan-owned bounded client; CLI/tests may supply their own transport."""
from contextlib import asynccontextmanager
import asyncio
import httpx

class CatalogAdmission:
    """Bound fan-out before HTTP pool acquisition; no caching or retries."""
    def __init__(self,limit=16,wait_seconds=1):
        self.slots=asyncio.Semaphore(limit);self.wait_seconds=wait_seconds
    @asynccontextmanager
    async def enter(self):
        from .internal_client import InternalError
        try:
            async with asyncio.timeout(self.wait_seconds):await self.slots.acquire()
        except TimeoutError:raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Catalog đang quá tải; vui lòng thử lại.')
        try:yield
        finally:self.slots.release()

@asynccontextmanager
async def session(client=None,transport=None):
    if client is not None:
        yield client
    else:
        async with httpx.AsyncClient(timeout=1,transport=transport,follow_redirects=False) as temporary:
            yield temporary
