import asyncio
import json
from pathlib import Path
import httpx
import pytest
from app.runtime_contracts import OPERATIONS, DTO_REGISTRY, schema_errors, validate_operation
from app.internal_client import InternalClient, InternalError

FIXTURES=json.loads((Path(__file__).parents[1]/'app/fixtures.generated.json').read_text())

def test_all_operation_fixtures_and_pydantic_models():
    assert len(OPERATIONS)==110
    assert len(DTO_REGISTRY)==110
    for name,fixture in FIXTURES.items():
        validate_operation(name,**fixture['request'])
        assert not schema_errors(fixture['response'],OPERATIONS[name]['responses'][str(fixture['status'])]),name

@pytest.mark.parametrize('value',[None,'1',0,9007199254740992,True])
def test_strict_body_values(value):
    fixture=json.loads(json.dumps(FIXTURES['addCartItem']['request']))
    fixture['body']['quantity']=value
    with pytest.raises(ValueError): validate_operation('addCartItem',**fixture)

def test_query_conversion_null_and_extra_fields():
    assert validate_operation('listProducts',query={'page':'2'})['query']=={'page':2,'size':20}
    with pytest.raises(ValueError): validate_operation('listProducts',query={'size':'101'})
    with pytest.raises(ValueError): validate_operation('listProducts',query={'q':None})
    with pytest.raises(ValueError): validate_operation('listProducts',query={'extra':'1'})

def test_internal_business_errors_and_correlation():
    calls=[]
    def handler(request):
        calls.append(request)
        return httpx.Response(409,json={'code':'VERSION_CONFLICT','message':'conflict'})
    client=InternalClient('M4','key',{'M3':'http://identity'},httpx.MockTransport(handler))
    with pytest.raises(InternalError) as error:
        asyncio.run(client.call('ResolveAiMetricsScope',{'token':'fixture'},'contract-test'))
    assert error.value.status==409
    assert calls[0].headers['X-Correlation-Id']=='contract-test'
    assert len(calls)==1

def test_internal_no_retry_and_invalid_caller():
    calls=[]
    def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout('timeout')
    client=InternalClient('M4','key',{'M3':'http://identity'},httpx.MockTransport(handler))
    with pytest.raises(InternalError) as error:
        asyncio.run(client.call('ResolveAiMetricsScope',{'token':'fixture'},'contract-test'))
    assert error.value.status==503
    assert len(calls)==1
    with pytest.raises(InternalError): asyncio.run(client.call('ReserveInventory',{},'contract-test'))
