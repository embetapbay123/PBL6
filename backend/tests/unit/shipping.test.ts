import {acceptsStatus,carrierStatus} from '../../commerce-service/src/shipping/shipping-state';
import {CarrierError,GhnAdapter,shippingConfig} from '../../commerce-service/src/shipping/ghn.adapter';
const cfg={...shippingConfig({}),token:'test-only',webhookSecret:'test-webhook-secret-at-least-24',enabled:true};
describe('GHN state and transport safety',()=>{
  it('maps retries and returns without treating a failed attempt as final',()=>{
    expect(carrierStatus('delivery_fail')).toBe('DELIVERY_ATTEMPT_FAILED');
    expect(acceptsStatus('DELIVERY_ATTEMPT_FAILED','IN_TRANSIT',null,new Date())).toBe(true);
    expect(acceptsStatus('RETURN_ATTEMPT_FAILED','RETURNING',null,new Date())).toBe(true);
    expect(acceptsStatus('DELIVERED','IN_TRANSIT',null,new Date())).toBe(false);
    expect(acceptsStatus('RETURNING','DELIVERED',null,new Date())).toBe(false);
    expect(acceptsStatus('PICKED_UP','CANCELLED',null,new Date())).toBe(false);
    expect(acceptsStatus('IN_TRANSIT','PICKED_UP','2026-01-02',new Date('2026-01-01'))).toBe(false);
    expect(carrierStatus('new_unknown_state')).toBeUndefined();
  });
  it('uses the correct staging routes and GET query for recovery',async()=>{
    const fetcher=jest.fn().mockResolvedValue(new Response(JSON.stringify({code:200,data:{order_code:'T1'}}),{status:200}));
    await new GhnAdapter(cfg,fetcher).lookup(123,'pbl6-test');
    const [url,init]=fetcher.mock.calls[0];
    expect(url).toBe('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail-by-client-code?client_order_code=pbl6-test');
    expect(init.method).toBe('GET');expect(init.body).toBeUndefined();expect(init.redirect).toBe('error');
  });
  it('does not accept an HTTP 200 containing a rejected command',async()=>{
    const fetcher=jest.fn().mockResolvedValue(new Response(JSON.stringify({code:200,data:[{order_code:'T1',result:false}]}),{status:200}));
    await expect(new GhnAdapter(cfg,fetcher).command(123,'T1','REDELIVER')).rejects.toMatchObject({code:'CARRIER_COMMAND_REJECTED',definitive:true});
    expect(fetcher.mock.calls[0][0]).toContain('/switch-status/storing');
  });
  it('does not expose provider error content or conflate timeouts with rejection',async()=>{
    const fetcher=jest.fn().mockRejectedValue(new Error('secret detail'));
    await expect(new GhnAdapter(cfg,fetcher).create(123,{})).rejects.toEqual(new CarrierError('CARRIER_RESULT_UNKNOWN'));
    expect(shippingConfig({}).enabled).toBe(false);
  });
});
