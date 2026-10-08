"""Typed Pydantic input/output adapters; no implicit retry or fixture fallback."""
from typing import Literal, Any
import httpx
from .network import session
from .runtime_contracts import OPERATIONS, RESPONSE_REGISTRY, schema_errors, validate_operation

class InternalError(Exception):
    def __init__(self,status,code,message):
        self.status,self.code,self.message=status,code,message
        super().__init__(message)

class InternalClient:
    def __init__(self,caller:Literal['M1','M2','M3','M4'],key:str,urls:dict[str,str],transport=None,http_client=None):
        self.caller,self.key,self.urls,self.transport,self.http_client=caller,key,urls,transport,http_client
    async def call(self,operation:str,body:dict|None,correlation:str)->dict[str,Any]:
        record=OPERATIONS[operation]
        if not record['internal'] or self.caller not in record['callers']:
            raise InternalError(503,'SERVICE_AUTH_FAILED','Caller không thuộc contract.')
        validate_operation(operation,body=body,headers={'x-correlation-id':correlation})
        try:
            async with session(self.http_client,self.transport) as client:
                response=await client.request(record['method'],self.urls[record['service']]+record['route'],
                    json=body if body is not None else None,timeout=1,headers={'X-Service-Id':self.caller,'X-Service-Key':self.key,'X-Correlation-Id':correlation})
            try: result=response.json()
            except ValueError: raise InternalError(503,'DEPENDENCY_CONTRACT_INVALID','Response không phải JSON.')
            if response.is_error:
                code=result.get('code','DEPENDENCY_REJECTED')
                if response.status_code in [401,403] and code=='INVALID_SERVICE_IDENTITY':
                    raise InternalError(503,'SERVICE_AUTH_FAILED','Không xác minh được service.')
                if response.status_code in [401,403,404,409,422,501]:
                    raise InternalError(response.status_code,code,result.get('message','Yêu cầu bị từ chối.'))
                raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Dependency chưa sẵn sàng.')
            if str(response.status_code) not in record['responses'] or schema_errors(result,next(iter(record['responses'].values()))):
                raise InternalError(503,'DEPENDENCY_CONTRACT_INVALID','Response không khớp contract.')
            return RESPONSE_REGISTRY[operation][str(response.status_code)].model_validate(result).model_dump(exclude_unset=True)
        except httpx.HTTPError:
            raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Dependency không phản hồi.')
