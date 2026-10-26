import asyncio,pytest
from app.network import CatalogAdmission
from app.internal_client import InternalError

def test_catalog_fanout_is_bounded_without_dropping_concurrent_callers():
    async def run():
        admission=CatalogAdmission();active=0;peak=0
        async def read(i):
            nonlocal active,peak
            async with admission.enter():
                active+=1;peak=max(peak,active)
                # A 100-caller burst must fit the bounded admission deadline.
                # This is a deterministic slow-I/O control, not load/NFR evidence.
                await asyncio.sleep(.15);active-=1;return i
        assert await asyncio.gather(*(read(i) for i in range(100)))==list(range(100))
        assert peak==16 and active==0
    asyncio.run(run())

def test_admission_timeout_and_cancellation_release_capacity():
    async def run():
        admission=CatalogAdmission(limit=1,wait_seconds=.01)
        async with admission.enter():
            with pytest.raises(InternalError) as caught:
                async with admission.enter():pass
            assert caught.value.status==503
        entered=asyncio.Event()
        async def blocking():
            async with admission.enter():entered.set();await asyncio.sleep(10)
        task=asyncio.create_task(blocking());await entered.wait();task.cancel()
        with pytest.raises(asyncio.CancelledError):await task
        async with admission.enter():pass
    asyncio.run(run())
