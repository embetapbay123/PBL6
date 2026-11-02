import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {exchangeMarket} from './runtime/exchange-market';

test.skip(process.env.CORE_FIX_EXCHANGE_LINES!=='1','Isolated pbl6-fe-verify only.');

test('whole-order exchange identifies each original line; order-only staff dispatch once and lose authority immediately',async({page,browser},info)=>{
  test.setTimeout(180000);
  const width=Number(process.env.CORE_FIX_EXCHANGE_WIDTH??1440),legacy=process.env.CORE_FIX_EXCHANGE_LINES_LEGACY==='1';
  await page.setViewportSize({width,height:900});page.setDefaultTimeout(12000);
  const f=await exchangeMarket(),checks:unknown[]=[],context=await browser.newContext({baseURL:'http://127.0.0.1:3109',viewport:{width,height:900}}),buyer=await context.newPage();
  buyer.setDefaultTimeout(12000);
  const record=(step:string,data:Record<string,unknown>)=>{
    checks.push({step,...data});writeFileSync(info.outputPath('exchange-multiline-checkpoints.json'),JSON.stringify({tag:f.tag,width,runtime:process.env.CORE_FIX_RUNTIME_MANIFEST,evidence:'REAL_UI_HTTP_DATABASE_WORKER',identity_setup:'Private verified M3 seed; not email acceptance.',legacy_baseline:legacy,checkpoints:checks},null,2));
  };
  async function returnsMenu(view:Page){
    await view.getByRole('button',{name:'Menu tài khoản',exact:true}).click();
    await view.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Store Portal',exact:true}).click();
    await view.getByRole('complementary').getByRole('link',{name:'Đổi trả',exact:true}).click();
  }
  try{
    const employee=await f.actor('order-only');
    const invite=await f.api('/store/staff/invitations',f.owner.access,'POST',{invited_email:employee.email,permissions:['order.store.read_status_cancel']});
    await f.api('/me/invitations/'+invite.id+'/accept',employee.access,'POST',{});
    employee.access=(await f.api('/auth/login',undefined,'POST',{email:employee.email,password:f.password,client_type:'MOBILE'})).access_token;
    for(const path of ['/store/products','/store/inventory'])expect((await f.raw(path,employee.access)).status).toBe(403);
    for(const [variant,quantity] of [[f.variant,1],[f.large,2]] as const){
      await f.api('/cart/items',f.buyer.access,'POST',{product_id:f.product.id,variant_id:variant.id,quantity});
    }
    const cart=await f.api('/cart/items?size=100',f.buyer.access),addresses=await f.api('/me/addresses',f.buyer.access);
    const input={source:'CART',cart_item_ids:cart.items.map((item:any)=>item.id),address_id:addresses.items[0].id,payment_methods:{[f.store.id]:'COD'}};
    const quote=await f.api('/checkout/quotes',f.buyer.access,'POST',input);
    const response=await fetch('http://127.0.0.1:18080/api/v1/orders/batches',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+f.buyer.access,'Idempotency-Key':randomUUID()},body:JSON.stringify({...input,quote_id:quote.quote_id,expected_payable_total_vnd:quote.payable_total_vnd})});
    expect(response.status).toBe(201);const order=(await response.json()).orders[0];
    await f.ship(order.id);await f.collect(order.id);await f.transition(order.id,'COMPLETED');
    const original=await f.own(order.id);expect(original.items).toHaveLength(2);expect(original.amounts.payable_vnd).toBe(320000);
    await f.login(buyer,f.buyer.email);await buyer.getByRole('button',{name:'Menu tài khoản',exact:true}).click();
    await buyer.getByRole('navigation',{name:'Menu tài khoản',exact:true}).getByRole('link',{name:'Đơn hàng',exact:true}).click();
    await buyer.getByRole('searchbox',{name:'Tìm đơn theo mã, món, SKU hoặc người nhận',exact:true}).fill(order.id);await buyer.getByRole('button',{name:'Tìm trong toàn bộ đơn',exact:true}).click();
    await buyer.getByRole('link',{name:'Xem chi tiết',exact:true}).click();
    const requestForm=buyer.getByRole('region',{name:'Đổi trả đơn hàng'});
    await expect(requestForm).toContainText('toàn bộ đơn hàng');
    await requestForm.getByLabel('Loại yêu cầu',{exact:true}).selectOption('EXCHANGE');
    await requestForm.getByLabel('Lý do đổi trả',{exact:true}).fill('Chỉ áo M bị sai cỡ. Tôi hiểu chỉ hỗ trợ đổi toàn đơn, gửi lại cả M ×1 và L ×2 để đổi L ×3.');
    await buyer.screenshot({path:info.outputPath('customer-whole-order-request.png'),fullPage:true});
    await requestForm.getByRole('button',{name:'Gửi yêu cầu đổi trả',exact:true}).click();
    await expect.poll(async()=>(await f.api('/me/returns?order_id='+order.id,f.buyer.access)).items.length).toBe(1);
    const request=(await f.api('/me/returns?order_id='+order.id,f.buyer.access)).items[0];expect(request.items).toHaveLength(2);
    await f.login(page,employee.email);await returnsMenu(page);
    await page.getByLabel('Kết luận trách nhiệm',{exact:true}).selectOption('STORE');
    await page.getByLabel('Giải thích quyết định',{exact:true}).fill('Đã kiểm tra lỗi Store. Đổi toàn đơn cùng giá, nhận cả hai phân loại.');
    await page.getByRole('button',{name:'Lưu quyết định',exact:true}).click();
    await expect(page.getByText('Đã chấp thuận',{exact:true})).toBeVisible();
    const fields=page.getByRole('group').filter({has:page.getByLabel('Thực nhận',{exact:true})});expect(await fields.count()).toBe(2);
    for(let i=0;i<2;i++){
      const group=fields.nth(i),quantity=(await group.textContent())!.includes('Phân loại: M')?1:2;
      await group.getByLabel('Thực nhận',{exact:true}).fill(String(quantity));await group.getByLabel('Bán lại được',{exact:true}).fill(String(quantity));
    }
    await page.getByLabel('Kết quả kiểm hàng',{exact:true}).fill('Đã kiểm đủ M ×1 và L ×2, cả ba áo bán lại được.');
    await page.getByRole('button',{name:'Xác nhận kiểm hàng thực nhận',exact:true}).click();
    await expect.poll(async()=>(await f.readRequest(request.id)).inventory_status,{timeout:15000}).toBe('APPLIED');
    await page.getByRole('button',{name:'Làm mới yêu cầu',exact:true}).click();
    const selectors=page.getByRole('combobox',{name:/phân loại gửi đổi/});await expect(selectors).toHaveCount(2);
    const labels=await selectors.evaluateAll(elements=>elements.map(element=>(element as HTMLSelectElement).labels?.[0]?.textContent));
    if(legacy)expect(labels[0]).toBe(labels[1]);
    else{
      await expect(page.getByRole('group',{name:'Đổi mục 1'})).toContainText('Số lượng:');
      await expect(page.getByRole('group',{name:'Đổi mục 2'})).toContainText('Số lượng:');
      const names=await selectors.evaluateAll(elements=>elements.map(element=>(element as HTMLSelectElement).labels?.[0]?.textContent));expect(new Set(names).size).toBe(2);
    }
    await page.screenshot({path:info.outputPath('staff-multiline-selection.png'),fullPage:true});
    record('MULTILINE_IDENTITY',{order_id:order.id,request_id:request.id,labels,items:request.items,employee_permissions:['order.store.read_status_cancel'],product_inventory_forbidden:true,inventory:[await f.quantity(f.variant.id),await f.quantity(f.large.id)]});
    // Legacy capture uses positional selection only to continue past the proven ambiguity.
    for(let i=0;i<2;i++)await selectors.nth(i).selectOption(f.large.id);
    await page.getByLabel('Mã vận đơn / tham chiếu bàn giao hàng đổi',{exact:true}).fill(f.tag+'-WHOLE-ORDER-L3');
    const member=(await f.api('/store/staff',f.owner.access)).items.find((row:any)=>row.user_id===employee.user);
    await f.api('/store/staff/'+member.id,f.owner.access,'PATCH',{expected_version:member.version,permissions:[]});
    const denied=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname==='/api/v1/store/returns/'+request.id);
    await page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true}).click();expect((await denied).status()).toBe(403);
    let fresh=await f.readRequest(request.id);expect(fresh.exchange_status).toBe('NOT_STARTED');expect(fresh.exchange_dispatch).toBeUndefined();
    expect((await f.quantity(f.large.id)).quantity).toBe(3);
    record('REVOKED_OPEN_FORM',{status:403,request_id:request.id,exchange_status:fresh.exchange_status,no_dispatch:true});
    const revoked=(await f.api('/store/staff',f.owner.access)).items.find((row:any)=>row.id===member.id);
    await f.api('/store/staff/'+member.id,f.owner.access,'PATCH',{expected_version:revoked.version,permissions:['order.store.read_status_cancel']});
    await page.reload();await expect(page.getByRole('combobox',{name:/phân loại gửi đổi/})).toHaveCount(2);
    const active=page.getByRole('combobox',{name:/phân loại gửi đổi/});for(let i=0;i<2;i++)await active.nth(i).selectOption(f.large.id);
    await page.getByLabel('Mã vận đơn / tham chiếu bàn giao hàng đổi',{exact:true}).fill(f.tag+'-WHOLE-ORDER-L3');
    const writes:any[]=[];
    await page.route('**/api/v1/store/returns/'+request.id,async route=>{
      if(route.request().method()!=='PATCH')return route.continue();writes.push(route.request().postDataJSON());const result=await route.fetch();expect(result.status()).toBe(200);
      return writes.length===1?route.fulfill({status:503,json:{code:'ACK_LOST',message:'Đã ghi lệnh, mất phản hồi.'}}):route.fulfill({response:result});
    });
    await page.getByRole('button',{name:'Kiểm tồn và xác nhận bàn giao hàng đổi',exact:true}).click();
    await expect(page.getByText('Chưa rõ kết quả.',{exact:false})).toBeVisible();
    const retry=page.getByRole('button',{name:'Thử lại thao tác cũ',exact:true});await retry.click();
    expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);
    await expect.poll(async()=>(await f.readRequest(request.id)).exchange_status,{timeout:15000}).toBe('APPLIED');
    fresh=await f.readRequest(request.id);expect(fresh.exchange_dispatch.items).toHaveLength(2);
    expect(fresh.exchange_dispatch.items.every((item:any)=>item.variant_id===f.large.id)).toBe(true);
    expect(fresh.exchange_dispatch.items.reduce((sum:number,item:any)=>sum+item.quantity,0)).toBe(3);
    expect((await f.quantity(f.large.id)).quantity).toBe(0);expect((await f.quantity(f.variant.id)).quantity).toBe(10);
    await buyer.getByRole('link',{name:'Theo dõi yêu cầu đổi trả',exact:true}).click();
    await buyer.getByRole('button',{name:'Làm mới yêu cầu',exact:true}).click();
    await expect(buyer.getByRole('region',{name:'Hàng đổi đã bàn giao'})).toContainText('Phân loại: L');
    await buyer.getByRole('button',{name:'Xác nhận đã nhận hàng đổi',exact:true}).click();
    await expect(buyer.getByText('Đã hoàn tất',{exact:true})).toBeVisible();
    const customer=await f.own(order.id),admin=(await f.api('/admin/returns?order_id='+order.id,f.admin)).items[0];
    expect(admin.exchange_dispatch).toEqual(fresh.exchange_dispatch);expect(customer.payment_status).toBe('SUCCEEDED');
    record('COMPLETED_EXACTLY_ONCE',{order_id:order.id,request_id:request.id,writes,request:await f.readRequest(request.id),order:customer,inventory:[await f.quantity(f.variant.id),await f.quantity(f.large.id)]});
    for(const view of [page,buyer])expect(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await buyer.screenshot({path:info.outputPath('customer-whole-order-completed.png'),fullPage:true});
  }finally{await context.close();await f.cleanup();record('CLEANUP',{product_status:'STOPPED',history_retained:true});}
});
