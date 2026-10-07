import os, asyncio
import httpx
from .internal_client import InternalClient, InternalError
from .runtime_contracts import OPERATIONS, schema_errors
from .safety import price
from .network import session

class LiveCatalog:
    def __init__(self,transport=None,internal=None,http_client=None):
        self.transport,self.http_client=transport,http_client
        self.internal=internal or InternalClient('M4',os.environ['M4_INTERNAL_KEY'],{'M3':os.environ['IDENTITY_URL']},http_client=http_client)
    async def _get(self,path,operation,correlation,params=None):
        try:
            async with session(self.http_client,self.transport) as client:
                response=await client.get(os.environ['CATALOG_URL']+'/api/v1'+path,timeout=1,params=params,headers={'X-Correlation-Id':correlation})
            if response.status_code==404:raise InternalError(404,'NOT_FOUND','Không tìm thấy Product.')
            if response.status_code!=200:raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Không xác minh được Catalog.')
            result=response.json()
            if schema_errors(result,OPERATIONS[operation]['responses']['200']):raise ValueError()
            return result
        except httpx.HTTPError:raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Catalog không phản hồi.')
        except ValueError:raise InternalError(503,'DEPENDENCY_CONTRACT_INVALID','Catalog không phản hồi đúng contract.')
    async def snapshot(self,correlation,*,pages=1):
        if not 1<=pages<=50:raise ValueError('Catalog page budget')
        active,first=await asyncio.gather(self.internal.call('ActiveStores',None,correlation),self._get('/products','listProducts',correlation,{'page':1,'size':100}))
        products=list(first['items'])
        # Requests use one bounded pool. Offline indexing may explicitly fetch more pages.
        for page in range(2,min(pages,(first['total']+99)//100)+1):
            products.extend((await self._get('/products','listProducts',correlation,{'page':page,'size':100}))['items'])
        ids=set(active['ids'])
        return [p for p in products if p.get('id') and p.get('store_id') in ids and p.get('status')=='ACTIVE' and p.get('moderation_status')=='VISIBLE' and price(p) is not None]
    async def product(self,id,correlation):
        product,active=await asyncio.gather(self._get('/products/'+id,'getProduct',correlation),self.internal.call('ActiveStores',None,correlation))
        if product.get('status')!='ACTIVE' or product.get('moderation_status')!='VISIBLE' or product.get('store_id') not in active['ids'] or price(product) is None:
            raise InternalError(404,'NOT_FOUND','Product không còn công khai.')
        return product

    async def related_context(self,id,correlation):
        # Reuse a freshly validated public reference already present in this request's page.
        first,active=await asyncio.gather(self._get('/products','listProducts',correlation,{'page':1,'size':100}),self.internal.call('ActiveStores',None,correlation))
        product=next((p for p in first['items'] if p['id']==id),None)
        if product is None:product=await self._get('/products/'+id,'getProduct',correlation)
        ids=set(active['ids'])
        def eligible(p):return p.get('status')=='ACTIVE' and p.get('moderation_status')=='VISIBLE' and p.get('store_id') in ids and price(p) is not None
        if not eligible(product):raise InternalError(404,'NOT_FOUND','Product không còn công khai.')
        return product,[p for p in first['items'] if eligible(p)]
