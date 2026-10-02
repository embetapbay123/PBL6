"""Author a reviewable OpenAPI 3.0 design contract for PBL6.

The JSON is valid OpenAPI design, not a generated implementation spec.
"""
from pathlib import Path
import json
import sys

OUT=Path(__file__).resolve().parents[1]/'docs'/'contracts'/'openapi.json'
if OUT.exists() and '--force' not in sys.argv[1:]:
    raise SystemExit('OpenAPI exists; use --force to replace it')

def ref(name): return {'$ref':f'#/components/schemas/{name}'}
def prop(type_, **kw): return {'type':type_,**kw}
def obj(properties, required=()):
    schema={'type':'object','properties':properties}
    if required: schema['required']=list(required)
    return schema
schemas={
 'Error':obj({'code':prop('string'),'message':prop('string'),'correlation_id':prop('string'),'details':prop('object',additionalProperties=True)},('code','message','correlation_id')),
 'MoneyBreakdown':obj({'goods_vnd':prop('integer',format='int64'),'store_discount_vnd':prop('integer',format='int64'),'platform_discount_vnd':prop('integer',format='int64'),'shipping_vnd':prop('integer',format='int64'),'payable_vnd':prop('integer',format='int64')},('goods_vnd','store_discount_vnd','platform_discount_vnd','shipping_vnd','payable_vnd')),
 'StoreQuote':obj({'store_id':prop('string',format='uuid'),'amounts':ref('MoneyBreakdown'),'items':prop('array',items=prop('object',additionalProperties=True))},('store_id','amounts','items')),
 'CheckoutRequest':obj({'cart_item_ids':prop('array',minItems=1,uniqueItems=True,items=prop('string',format='uuid')),'address_id':prop('string',format='uuid'),'payment_methods':prop('object',additionalProperties=prop('string',enum=['SANDBOX','COD'])),'platform_voucher_code':prop('string'),'store_vouchers':prop('object',additionalProperties=prop('string'))},('cart_item_ids','address_id','payment_methods')),
 'CheckoutConfirmRequest':obj({'cart_item_ids':prop('array',minItems=1,uniqueItems=True,items=prop('string',format='uuid')),'address_id':prop('string',format='uuid'),'payment_methods':prop('object',additionalProperties=prop('string',enum=['SANDBOX','COD'])),'platform_voucher_code':prop('string'),'store_vouchers':prop('object',additionalProperties=prop('string')),'quote_id':prop('string',format='uuid'),'expected_payable_total_vnd':prop('integer',format='int64')},('cart_item_ids','address_id','payment_methods','quote_id','expected_payable_total_vnd')),
 'CheckoutQuote':obj({'quote_id':prop('string',format='uuid'),'stores':prop('array',items=ref('StoreQuote')),'payable_total_vnd':prop('integer',format='int64'),'expires_at':prop('string',format='date-time')},('quote_id','stores','payable_total_vnd','expires_at')),
 'OrderBatch':obj({'purchase_group_id':prop('string',format='uuid'),'order_ids':prop('array',minItems=1,items=prop('string',format='uuid')),'orders':prop('array',items=ref('Order')),'payable_total_vnd':prop('integer',format='int64')},('purchase_group_id','order_ids','orders','payable_total_vnd')),
 'Order':obj({'id':prop('string',format='uuid'),'purchase_group_id':prop('string',format='uuid'),'store_id':prop('string',format='uuid'),'status':prop('string',enum=['PREPARING','AWAITING_PAYMENT','PENDING','CONFIRMED','PROCESSING','SHIPPED','COMPLETED','CANCELLED','EXPIRED','RECOVERING']),'version':prop('integer'),'payment_method':prop('string',enum=['SANDBOX','COD']),'payment_status':prop('string'),'refund_status':prop('string'),'payment_expires_at':prop('string',format='date-time'),'amounts':ref('MoneyBreakdown'),'items':prop('array',items=prop('object',additionalProperties=True))},('id','purchase_group_id','store_id','status','version','payment_method','amounts')),
 'Payment':obj({'id':prop('string',format='uuid'),'order_id':prop('string',format='uuid'),'method':prop('string',enum=['SANDBOX','COD']),'status':prop('string'),'payable_vnd':prop('integer',format='int64'),'collectible_vnd':prop('integer',format='int64'),'collected_vnd':prop('integer',format='int64'),'refunded_vnd':prop('integer',format='int64')},('id','order_id','method','status','payable_vnd','collectible_vnd')),
 'PaymentAttemptRequest':obj({'expected_order_version':prop('integer')},('expected_order_version',)),
 'PaymentAttempt':obj({'id':prop('string',format='uuid'),'status':prop('string'),'redirect_url':prop('string',format='uri'),'provider_reference':prop('string')},('id','status')),
 'PaymentCallback':obj({'provider_event_id':prop('string'),'provider_reference':prop('string'),'result':prop('string',enum=['SUCCESS','FAILED','CANCELLED']),'signature':prop('string')},('provider_event_id','provider_reference','result','signature')),
 'Refund':obj({'id':prop('string',format='uuid'),'payment_id':prop('string',format='uuid'),'order_id':prop('string',format='uuid'),'amount_vnd':prop('integer',format='int64'),'status':prop('string',enum=['REQUESTED','PROCESSING','SUCCEEDED','FAILED'])},('id','payment_id','order_id','amount_vnd','status')),
 'OrderTransition':obj({'to_status':prop('string',enum=['CONFIRMED','PROCESSING','SHIPPED','COMPLETED']),'expected_version':prop('integer')},('to_status','expected_version')),
 'CancelOrder':obj({'expected_version':prop('integer'),'reason':prop('string')},('expected_version',)),
 'CODCollection':obj({'expected_version':prop('integer'),'amount_collected_vnd':prop('integer',format='int64')},('expected_version','amount_collected_vnd')),
 'Voucher':obj({'id':prop('string',format='uuid'),'code':prop('string'),'scope':prop('string',enum=['STORE','PLATFORM']),'store_id':prop('string',format='uuid'),'discount_type':prop('string',enum=['FIXED','PERCENT']),'discount_value':prop('integer'),'min_goods_vnd':prop('integer'),'max_discount_vnd':prop('integer'),'starts_at':prop('string',format='date-time'),'ends_at':prop('string',format='date-time'),'usage_limit':prop('integer'),'per_customer_limit':prop('integer')},('code','scope','discount_type','discount_value','starts_at','ends_at','usage_limit','per_customer_limit')),
 'Review':obj({'id':prop('string',format='uuid'),'order_item_id':prop('string',format='uuid'),'product_id':prop('string',format='uuid'),'rating':prop('integer',minimum=1,maximum=5),'body':prop('string'),'status':prop('string')},('order_item_id','rating')),
 'StoreApplication':obj({'id':prop('string',format='uuid'),'proposed_name':prop('string'),'contact':prop('string'),'status':prop('string',enum=['PENDING','APPROVED','REJECTED']),'decision_reason':prop('string')},('proposed_name','contact')),
 'Resource':obj({'id':prop('string',format='uuid'),'status':prop('string'),'version':prop('integer'),'data':prop('object',additionalProperties=True)},('id',)),
 'Page':obj({'items':prop('array',items=ref('Resource')),'total':prop('integer'),'page':prop('integer'),'size':prop('integer')},('items','total','page','size')),
}
schemas.update({
 'PasswordResetRequest':obj({'email':prop('string',format='email')},('email',)),
 'EmailVerificationConfirm':obj({'token':prop('string')},('token',)),
 'PasswordResetConfirm':obj({'token':prop('string'),'new_password':prop('string',minLength=8)},('token','new_password')),
 'PasswordChange':obj({'current_password':prop('string'),'new_password':prop('string',minLength=8)},('current_password','new_password')),
 'AuthContext':obj({'user_id':prop('string',format='uuid'),'roles':prop('array',items=prop('string',enum=['CUSTOMER','SELLER','STORE_OWNER','ADMIN'])),'store_membership':obj({'store_id':prop('string',format='uuid'),'role':prop('string',enum=['SELLER','OWNER']),'status':prop('string'),'permissions':prop('array',items=prop('string'))}),'token_version':prop('integer')},('user_id','roles','token_version')),
 'Address':obj({'id':prop('string',format='uuid'),'recipient_name':prop('string'),'phone':prop('string'),'line1':prop('string'),'ward':prop('string'),'district':prop('string'),'city':prop('string'),'is_default':prop('boolean')},('recipient_name','phone','line1','ward','district','city')),
 'StaffInvitation':obj({'id':prop('string',format='uuid'),'store_id':prop('string',format='uuid'),'invited_email':prop('string',format='email'),'permissions':prop('array',items=prop('string')),'status':prop('string',enum=['PENDING','ACCEPTED','REVOKED','EXPIRED']),'expires_at':prop('string',format='date-time')},('invited_email','permissions')),
 'ModerationAction':obj({'reason':prop('string',minLength=1),'expected_version':prop('integer')},('reason','expected_version')),
 'StaffMembershipUpdate':{'type':'object','minProperties':1,'properties':{'status':prop('string',enum=['ACTIVE','LOCKED']),'permissions':prop('array',items=prop('string'))}},
 'ProductVariant':obj({'id':prop('string',format='uuid'),'sku':prop('string'),'price_vnd':prop('integer',format='int64',minimum=0),'variant_values':prop('object',additionalProperties=True),'is_default':prop('boolean'),'status':prop('string')},('sku','price_vnd','variant_values')),
 'Product':obj({'id':prop('string',format='uuid'),'store_id':prop('string',format='uuid'),'product_type_id':prop('string',format='uuid'),'title':prop('string'),'description':prop('string'),'attributes':prop('object',additionalProperties=True),'variants':prop('array',items=ref('ProductVariant')),'status':prop('string',enum=['DRAFT','ACTIVE','STOPPED']),'moderation_status':prop('string',enum=['VISIBLE','HIDDEN']),'version':prop('integer')},('product_type_id','title','attributes')),
 'InventoryAdjustment':obj({'variant_id':prop('string',format='uuid'),'delta_quantity':prop('integer'),'reason':prop('string'),'operation_id':prop('string',format='uuid'),'expected_version':prop('integer')},('variant_id','delta_quantity','reason','operation_id','expected_version')),
 'InventoryBalance':obj({'variant_id':prop('string',format='uuid'),'quantity':prop('integer',minimum=0),'reserved_quantity':prop('integer',minimum=0),'available_quantity':prop('integer',minimum=0),'version':prop('integer')},('variant_id','quantity','reserved_quantity','available_quantity','version')),
 'CartItem':obj({'id':prop('string',format='uuid'),'variant_id':prop('string',format='uuid'),'store_id':prop('string',format='uuid'),'quantity':prop('integer',minimum=1)},('variant_id','quantity')),
 'StoreReport':obj({'store_id':prop('string',format='uuid'),'period_start':prop('string',format='date-time'),'period_end':prop('string',format='date-time'),'order_value_vnd':prop('integer',format='int64'),'completed_goods_revenue_vnd':prop('integer',format='int64'),'collected_vnd':prop('integer',format='int64'),'refunded_vnd':prop('integer',format='int64')},('store_id','period_start','period_end','order_value_vnd','completed_goods_revenue_vnd','collected_vnd','refunded_vnd')),
 'ChatMessage':obj({'session_id':prop('string',format='uuid'),'content':prop('string'),'product_cards':prop('array',items=obj({'product_id':prop('string',format='uuid'),'current_price_vnd':prop('integer',format='int64'),'status':prop('string')},('product_id','current_price_vnd','status'))),'fallback':prop('boolean')},('content',)),
 'RecommendationResult':obj({'model_version':prop('string'),'source':prop('string',enum=['MODEL','BASELINE','FALLBACK']),'product_ids':prop('array',items=prop('string',format='uuid'))},('source','product_ids')),
})
doc={'openapi':'3.0.3','info':{'title':'PBL6 Marketplace API','version':'2.0.0-draft','description':'Design contract; four independent services behind API Gateway.'},'servers':[{'url':'https://localhost/api/v1','description':'Demo HTTPS gateway'}],'tags':[{'name':n} for n in ['Auth','Profile','Store','Catalog','Inventory','Cart','Checkout','Payment','Order','Voucher','Review','Admin','AI']],'paths':{},'components':{'securitySchemes':{'BearerAuth':{'type':'http','scheme':'bearer','bearerFormat':'JWT'}},'schemas':schemas}}

def endpoint(method,path,tag,operation,body=None,response='Resource',status='200',auth=True,description=None):
    parameters=[]
    for key in ('id','itemId','sessionId'):
        if '{'+key+'}' in path:
            parameters.append({'name':key,'in':'path','required':True,'schema':prop('string',format='uuid')})
    if path=='/orders/batches' and method=='post':
        parameters.append({'name':'Idempotency-Key','in':'header','required':True,'schema':prop('string',minLength=1)})
    if method=='get' and (path.endswith('orders') or path.endswith('products') or path.endswith('reviews') or path.endswith('vouchers') or path.endswith('inventory')):
        for name in ('page','size'):
            parameters.append({'name':name,'in':'query','required':False,'schema':prop('integer',minimum=1,maximum=100)})
    if method in ('patch','delete') and ('orders/' in path or 'products/' in path):
        parameters.append({'name':'If-Match','in':'header','required':False,'schema':prop('string')})
    operation_obj={'tags':[tag],'operationId':operation,'summary':description or operation,'parameters':parameters,'responses':{status:{'description':'Success','content':{'application/json':{'schema':ref(response)}}},'400':{'description':'Malformed request','content':{'application/json':{'schema':ref('Error')}}},'401':{'description':'Unauthenticated','content':{'application/json':{'schema':ref('Error')}}},'403':{'description':'Forbidden','content':{'application/json':{'schema':ref('Error')}}},'404':{'description':'Not found or outside scope','content':{'application/json':{'schema':ref('Error')}}},'409':{'description':'State/version/idempotency conflict','content':{'application/json':{'schema':ref('Error')}}},'422':{'description':'Validation failure','content':{'application/json':{'schema':ref('Error')}}},'429':{'description':'Rate limited','content':{'application/json':{'schema':ref('Error')}}}}}
    if body:
        operation_obj['requestBody']={'required':True,'content':{'application/json':{'schema':ref(body)}}}
    if auth: operation_obj['security']=[{'BearerAuth':[]}]
    doc['paths'].setdefault(path,{})[method]=operation_obj

for method,path,tag,op,body,resp,status,auth in [
 ('post','/auth/register','Auth','register','Resource','Resource','201',False),('post','/auth/verify-email','Auth','verifyEmail','EmailVerificationConfirm','Resource','200',False),('post','/auth/login','Auth','login','Resource','Resource','200',False),('post','/auth/refresh','Auth','refresh','Resource','Resource','200',False),('post','/auth/logout','Auth','logout',None,'Resource','200',True),('post','/auth/reset-password','Auth','resetPassword','PasswordResetRequest','Resource','200',False),('post','/auth/reset-password/confirm','Auth','confirmResetPassword','PasswordResetConfirm','Resource','200',False),('post','/auth/change-password','Auth','changePassword','PasswordChange','Resource','200',True),('get','/me/context','Profile','getAuthContext',None,'Resource','200',True),('get','/me','Profile','getProfile',None,'Resource','200',True),('patch','/me','Profile','updateProfile','Resource','Resource','200',True),('get','/me/addresses','Profile','listAddresses',None,'Page','200',True),('post','/me/addresses','Profile','createAddress','Resource','Resource','201',True),('patch','/me/addresses/{id}','Profile','updateAddress','Resource','Resource','200',True),('delete','/me/addresses/{id}','Profile','deleteAddress',None,'Resource','200',True),
 ('post','/me/store-applications','Store','submitStoreApplication','StoreApplication','StoreApplication','201',True),('get','/me/store-applications','Store','listOwnStoreApplications',None,'Page','200',True),('get','/admin/store-applications','Store','listStoreApplications',None,'Page','200',True),('patch','/admin/store-applications/{id}','Store','reviewStoreApplication','StoreApplication','StoreApplication','200',True),('get','/store','Store','getOwnStore',None,'Resource','200',True),('patch','/store','Store','updateOwnStore','Resource','Resource','200',True),('get','/store/staff','Store','listStoreStaff',None,'Page','200',True),('get','/store/staff/invitations','Store','listStaffInvitations',None,'Page','200',True),('post','/store/staff/invitations','Store','inviteStaff','StaffInvitation','StaffInvitation','201',True),('post','/store/staff/invitations/{id}/revoke','Store','revokeStaffInvitation',None,'StaffInvitation','200',True),('get','/me/invitations','Store','listOwnInvitations',None,'Page','200',True),('post','/me/invitations/{id}/accept','Store','acceptInvitation',None,'StaffInvitation','200',True),
 ('get','/categories','Catalog','listCategories',None,'Page','200',False),('get','/product-types','Catalog','listProductTypes',None,'Page','200',False),('get','/products','Catalog','listProducts',None,'Page','200',False),('get','/products/{id}','Catalog','getProduct',None,'Resource','200',False),('get','/stores/{id}/products','Catalog','listStoreProducts',None,'Page','200',False),('get','/store/products','Catalog','listOwnStoreProducts',None,'Page','200',True),('post','/store/products','Catalog','createProduct','Resource','Resource','201',True),('patch','/store/products/{id}','Catalog','updateProduct','Resource','Resource','200',True),('post','/store/products/{id}/variants','Catalog','createVariant','Resource','Resource','201',True),('post','/store/products/{id}/images','Catalog','addProductImage','Resource','Resource','201',True),
 ('get','/store/inventory','Inventory','listStoreInventory',None,'Page','200',True),('post','/store/inventory/adjustments','Inventory','adjustInventory','Resource','Resource','201',True),('get','/store/inventory/movements','Inventory','listStockMovements',None,'Page','200',True),
 ('get','/cart/items','Cart','listCartItems',None,'Page','200',True),('post','/cart/items','Cart','addCartItem','Resource','Resource','201',True),('patch','/cart/items/{id}','Cart','updateCartItem','Resource','Resource','200',True),('delete','/cart/items/{id}','Cart','removeCartItem',None,'Resource','200',True),('post','/checkout/quotes','Checkout','quoteCheckout','CheckoutRequest','CheckoutQuote','200',True),('post','/orders/batches','Order','confirmCheckout','CheckoutConfirmRequest','OrderBatch','201',True),('get','/orders/batches/{id}','Order','getPurchaseGroupOrders',None,'OrderBatch','200',True),
 ('post','/orders/{id}/payment-attempts','Payment','createPaymentAttempt','PaymentAttemptRequest','PaymentAttempt','201',True),('get','/payments/{id}','Payment','getPayment',None,'Payment','200',True),('post','/payment-callbacks/sandbox','Payment','sandboxCallback','PaymentCallback','Resource','200',False),('get','/orders/{id}/refund','Payment','getOrderRefund',None,'Refund','200',True),
 ('get','/me/orders','Order','listOwnOrders',None,'Page','200',True),('get','/me/orders/{id}','Order','getOwnOrder',None,'Order','200',True),('post','/me/orders/{id}/cancel','Order','cancelOwnOrder','CancelOrder','Order','200',True),('get','/store/orders','Order','listStoreOrders',None,'Page','200',True),('get','/store/orders/{id}','Order','getStoreOrder',None,'Order','200',True),('patch','/store/orders/{id}/status','Order','transitionStoreOrder','OrderTransition','Order','200',True),('post','/store/orders/{id}/cancel','Order','cancelStoreOrder','CancelOrder','Order','200',True),('post','/store/orders/{id}/cod-collection','Order','collectCod','CODCollection','Order','200',True),
 ('post','/vouchers/validate','Voucher','validateVouchers','CheckoutRequest','CheckoutQuote','200',True),('get','/store/vouchers','Voucher','listStoreVouchers',None,'Page','200',True),('post','/store/vouchers','Voucher','createStoreVoucher','Voucher','Voucher','201',True),('patch','/store/vouchers/{id}','Voucher','updateStoreVoucher','Voucher','Voucher','200',True),('get','/admin/vouchers','Voucher','listPlatformVouchers',None,'Page','200',True),('post','/admin/vouchers','Voucher','createPlatformVoucher','Voucher','Voucher','201',True),('patch','/admin/vouchers/{id}','Voucher','updatePlatformVoucher','Voucher','Voucher','200',True),
 ('get','/products/{id}/reviews','Review','listProductReviews',None,'Page','200',False),('post','/me/reviews','Review','createReview','Review','Review','201',True),('patch','/me/reviews/{id}','Review','updateReview','Review','Review','200',True),('post','/admin/reviews/{id}/hide','Review','hideReview','ModerationAction','Review','200',True),('post','/admin/reviews/{id}/restore','Review','restoreReview','ModerationAction','Review','200',True),
 ('get','/admin/users','Admin','listUsers',None,'Page','200',True),('patch','/admin/users/{id}','Admin','updateUserState','Resource','Resource','200',True),('get','/admin/stores','Admin','listStores',None,'Page','200',True),('patch','/admin/stores/{id}','Admin','updateStoreState','Resource','Resource','200',True),('get','/admin/orders','Admin','listAllOrders',None,'Page','200',True),('get','/admin/dashboard','Admin','getPlatformDashboard',None,'Resource','200',True),('patch','/admin/roles/{id}','Admin','updateRole','Resource','Resource','200',True),
 ('post','/chat/sessions','AI','createChatSession','Resource','Resource','201',False),('post','/chat/sessions/{id}/messages','AI','sendChatMessage','Resource','Resource','200',False),('get','/me/chat/sessions','AI','listOwnChatSessions',None,'Page','200',True),('get','/recommendations/for-you','AI','getForYou',None,'Page','200',True),('get','/products/{id}/related','AI','getRelatedProducts',None,'Page','200',False),('get','/admin/ai/metrics','AI','getAiMetrics',None,'Resource','200',True),
]: endpoint(method,path,tag,op,body,resp,status,auth)

for method,path,tag,op,body,resp,status in [
 ('patch','/store/staff/{id}','Store','updateStaff','Resource','Resource','200'),
 ('get','/store/reports','Order','getStoreReport',None,'Resource','200'),
 ('get','/store/vouchers/{id}/usage','Voucher','getStoreVoucherUsage',None,'Resource','200'),
 ('get','/admin/vouchers/{id}/usage','Voucher','getPlatformVoucherUsage',None,'Resource','200'),
 ('post','/admin/categories','Admin','createCategory','Resource','Resource','201'),
 ('patch','/admin/categories/{id}','Admin','updateCategory','Resource','Resource','200'),
 ('post','/admin/product-types','Admin','createProductType','Resource','Resource','201'),
 ('patch','/admin/product-types/{id}','Admin','updateProductType','Resource','Resource','200'),
 ('post','/admin/attribute-definitions','Admin','createAttributeDefinition','Resource','Resource','201'),
 ('patch','/admin/attribute-definitions/{id}','Admin','updateAttributeDefinition','Resource','Resource','200'),
 ('post','/admin/products/{id}/hide','Admin','hideProduct','ModerationAction','Product','200'),
 ('post','/admin/products/{id}/restore','Admin','restoreProduct','ModerationAction','Product','200'),
]: endpoint(method,path,tag,op,body,resp,status,True)

# Replace generic Resource contracts where the cross-service or permission semantics
# require explicit fields for implementation and review.
typed_operations={
 'getAuthContext':(None,'AuthContext'), 'createAddress':('Address','Address'),
 'updateAddress':('Address','Address'), 'inviteStaff':('StaffInvitation','StaffInvitation'),
 'updateStaff':('StaffMembershipUpdate','StaffMembershipUpdate'),
 'getProduct':(None,'Product'), 'createProduct':('Product','Product'),
 'updateProduct':('Product','Product'), 'createVariant':('ProductVariant','ProductVariant'),
 'adjustInventory':('InventoryAdjustment','InventoryBalance'),
 'addCartItem':('CartItem','CartItem'), 'updateCartItem':('CartItem','CartItem'),
 'getStoreReport':(None,'StoreReport'), 'sendChatMessage':('ChatMessage','ChatMessage'),
 'getForYou':(None,'RecommendationResult'),
}
for path_item in doc['paths'].values():
    for operation in path_item.values():
        pair=typed_operations.get(operation['operationId'])
        if pair is None:
            continue
        body,response=pair
        if body:
            operation['requestBody']['content']['application/json']['schema']=ref(body)
        success=next(code for code in operation['responses'] if code.startswith('2'))
        operation['responses'][success]['content']['application/json']['schema']=ref(response)

OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"OpenAPI {len(doc['paths'])} paths, {sum(len(v) for v in doc['paths'].values())} operations")
