import {InternalClients} from '../../shared/src/internal-clients';
import {ApiError} from '../../shared/src/errors';

const id=(n:number)=>'00000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
function client(request:jest.Mock){return new InternalClients('M1','test-only',{M1:'http://catalog',M2:'http://commerce',M3:'http://identity'},{request});}

test('active Store lookup reads every cursor page beyond 100 without truncating the allowlist',async()=>{
  const ids=Array.from({length:205},(_,i)=>id(i+1));
  const request=jest.fn(async(url:string)=>{
    const query=new URL(url).searchParams;
    expect(query.get('size')).toBe('100');
    const offset=query.has('after')?ids.indexOf(query.get('after')!)+1:0;
    const page=ids.slice(offset,offset+100);
    return {ids:page,next_after:offset+100<ids.length?page.at(-1):null};
  });
  await expect(client(request).call('ActiveStores',undefined,'store-pages')).resolves.toEqual({ids});
  expect(request).toHaveBeenCalledTimes(3);
  for(const call of request.mock.calls)expect((call as unknown[]).slice(1,4)).toEqual(['M1','test-only','store-pages']);
});

test('reader remains compatible with an old unpaged server containing more than 100 Stores',async()=>{
  const ids=Array.from({length:101},(_,i)=>id(i+1)),request=jest.fn().mockResolvedValue({ids});
  await expect(client(request).call('ActiveStores',undefined,'compat')).resolves.toEqual({ids});
  expect(request).toHaveBeenCalledTimes(1);
});

test('a strict legacy server can reject the first page query; negotiate only this read once',async()=>{
  const ids=Array.from({length:102},(_,i)=>id(i+1));
  const request=jest.fn().mockRejectedValueOnce(new ApiError(422,'VALIDATION_FAILED','legacy',[{field:'$',reason:'unknown field: size'}])).mockResolvedValueOnce({ids});
  await expect(client(request).call('ActiveStores',undefined,'strict-legacy')).resolves.toEqual({ids});
  expect(request).toHaveBeenCalledTimes(2);expect(new URL(request.mock.calls[1][0]).search).toBe('');
});

test('ordinary validation failures are not treated as legacy capability negotiation',async()=>{
  const request=jest.fn().mockRejectedValue(new ApiError(422,'VALIDATION_FAILED','bad input',[{field:'after',reason:'invalid UUID'}]));
  await expect(client(request).call('ActiveStores',undefined,'bad-request')).rejects.toMatchObject({status:422});expect(request).toHaveBeenCalledTimes(1);
});

test('a failed later page fails the whole lookup; no partial visibility decision or retry',async()=>{
  const request=jest.fn().mockResolvedValueOnce({ids:[id(1)],next_after:id(1)}).mockRejectedValueOnce(new Error('offline'));
  await expect(client(request).call('ActiveStores',undefined,'failure')).rejects.toThrow('offline');
  expect(request).toHaveBeenCalledTimes(2);
});

test.each([
  {ids:[],next_after:id(1)},
  {ids:[id(1)],next_after:id(2)},
  {ids:[id(1),id(1)],next_after:id(1)},
])('invalid Store pagination fails closed instead of looping or returning a partial list: %j',async(page)=>{
  const request=jest.fn().mockResolvedValue(page);
  await expect(client(request).call('ActiveStores',undefined,'invalid')).rejects.toMatchObject({status:503,response:{code:'DEPENDENCY_CONTRACT_INVALID'}});
  expect(request).toHaveBeenCalledTimes(1);
});

test('a cursor repeating on the next page is rejected without another network call',async()=>{
  const request=jest.fn().mockResolvedValue({ids:[id(1)],next_after:id(1)});
  await expect(client(request).call('ActiveStores',undefined,'loop')).rejects.toMatchObject({status:503,response:{code:'DEPENDENCY_CONTRACT_INVALID'}});
  expect(request).toHaveBeenCalledTimes(2);
});
