const replayConfirm=require('../acceptance/replay-confirm.cjs');
test('a recoverable confirm replays the exact same command and checks the eventual response',async()=>{
 const pending=Object.assign(new Error('pending'),{status:503,code:'ORDER_RECOVERY_PENDING'});
 const request=jest.fn().mockRejectedValueOnce(pending).mockResolvedValueOnce({order_ids:['persisted']});
 const body={quote_id:'original',payment_methods:{store:'COD'},expected_payable_total_vnd:100};
 expect(await replayConfirm(request,{token:'fixture-token',body,key:'original-key'},{delayMs:0})).toEqual({order_ids:['persisted']});
 expect(request.mock.calls).toHaveLength(2);expect(request.mock.calls[0]).toEqual(request.mock.calls[1]);expect(request.mock.calls[0]).toEqual(['confirmCheckout',{token:'fixture-token',body,headers:{'idempotency-key':'original-key'}}]);
});
test.each([{status:409,code:'VERSION_CONFLICT'},{status:503,code:'DEPENDENCY_UNAVAILABLE'}])('unrelated failure is not hidden or retried: %j',async fields=>{
 const error=Object.assign(new Error('failure'),fields),request=jest.fn().mockRejectedValue(error);
 await expect(replayConfirm(request,{token:'fixture',body:{},key:'same'})).rejects.toBe(error);expect(request).toHaveBeenCalledTimes(1);
});
test('recovery remains bounded and does not convert persistent 503 into success',async()=>{
 const error=Object.assign(new Error('pending'),{status:503,code:'ORDER_RECOVERY_PENDING'}),request=jest.fn().mockRejectedValue(error);
 await expect(replayConfirm(request,{token:'fixture',body:{},key:'same'},{timeoutMs:0})).rejects.toBe(error);expect(request).toHaveBeenCalledTimes(1);
});
