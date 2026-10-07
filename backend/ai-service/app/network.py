"""Reuse the lifespan-owned bounded client; CLI/tests may supply their own transport."""
from contextlib import asynccontextmanager
import httpx

@asynccontextmanager
async def session(client=None,transport=None):
    if client is not None:
        yield client
    else:
        async with httpx.AsyncClient(timeout=1,transport=transport,follow_redirects=False) as temporary:
            yield temporary
