"""One-time editorial refinement of the 96-operation OpenAPI design contract."""
from pathlib import Path
import json

path = Path(__file__).resolve().parents[1] / 'docs/contracts/openapi.json'
api = json.loads(path.read_text(encoding='utf-8'))
if api['info']['version'].startswith('2.1'):
    raise SystemExit('Already upgraded; refusing to overwrite')
api['info']['version'] = '2.1.0-draft'
schemas = api['components']['schemas']
ref = lambda name: {'$ref': f'#/components/schemas/{name}'}
s = lambda fmt=None: {'type':'string', **({'format':fmt} if fmt else {})}
i = lambda: {'type':'integer','format':'int64'}
obj = lambda props, required=(): {'type':'object','properties':props,**({'required':list(required)} if required else {})}
arr = lambda name: {'type':'array','items':ref(name)}

schemas.update({
    'OperationResult':obj({'status':s(),'message':s(),'correlation_id':s()},('status',)),
    'RegisterRequest':obj({'email':s('email'),'password':s(),'display_name':s()},('email','password')),
    'RegistrationResult':obj({'user_id':s('uuid'),'email_verified':{'type':'boolean'},'message':s()},('user_id','email_verified')),
    'LoginRequest':obj({'email':s('email'),'password':s()},('email','password')),
    'RefreshRequest':obj({'refresh_token':s()},('refresh_token',)),
    'AuthTokens':obj({'access_token':s(),'refresh_token':s(),'expires_at':s('date-time'),'context':ref('AuthContext')},('access_token','refresh_token','expires_at')),
    'Profile':obj({'user_id':s('uuid'),'email':s('email'),'display_name':s(),'phone':s(),'email_verified_at':s('date-time')},('user_id','email')),
    'ProfileUpdate':obj({'display_name':s(),'phone':s()}),
    'Store':obj({'id':s('uuid'),'owner_user_id':s('uuid'),'name':s(),'status':s(),'shipping_fee_vnd':i(),'version':{'type':'integer'}},('id','name','status')),
    'StoreUpdate':obj({'name':s(),'description':s(),'shipping_fee_vnd':i(),'expected_version':{'type':'integer'}},('expected_version',)),
    'ProductImageRequest':obj({'image_url':s('uri'),'variant_id':s('uuid'),'position':{'type':'integer'}},('image_url',)),
    'ProductImage':obj({'id':s('uuid'),'product_id':s('uuid'),'image_url':s('uri'),'position':{'type':'integer'}},('id','product_id','image_url')),
    'StateChangeRequest':obj({'status':s(),'reason':s(),'expected_version':{'type':'integer'}},('status','reason','expected_version')),
    'RoleUpdate':obj({'permission_ids':{'type':'array','items':s('uuid')},'expected_version':{'type':'integer'}},('permission_ids','expected_version')),
    'Role':obj({'id':s('uuid'),'name':s(),'permission_ids':{'type':'array','items':s('uuid')},'version':{'type':'integer'}},('id','name','version')),
    'ChatSessionCreate':obj({'anonymous_key':s(),'first_message':s()}),
    'ChatSession':obj({'id':s('uuid'),'user_id':s('uuid'),'anonymous_key':s(),'created_at':s('date-time')},('id','created_at')),
    'Category':obj({'id':s('uuid'),'name':s(),'parent_id':s('uuid'),'status':s(),'version':{'type':'integer'}},('id','name')),
    'ProductType':obj({'id':s('uuid'),'category_id':s('uuid'),'name':s(),'status':s(),'version':{'type':'integer'}},('id','name')),
    'AttributeDefinition':obj({'id':s('uuid'),'product_type_id':s('uuid'),'name':s(),'data_type':s(),'required':{'type':'boolean'},'unit':s(),'variant_axis':{'type':'boolean'},'allowed_values':{'type':'array','items':s()},'version':{'type':'integer'}},('id','name','data_type')),
    'TaxonomyWrite':obj({'name':s(),'parent_id':s('uuid'),'category_id':s('uuid'),'product_type_id':s('uuid'),'data_type':s(),'required':{'type':'boolean'},'unit':s(),'variant_axis':{'type':'boolean'},'allowed_values':{'type':'array','items':s()},'expected_version':{'type':'integer'}},('name',)),
    'StoreMembership':obj({'id':s('uuid'),'store_id':s('uuid'),'user_id':s('uuid'),'role':s(),'status':s(),'permissions':{'type':'array','items':s()},'version':{'type':'integer'}},('id','store_id','user_id','role','status')),
    'StockMovement':obj({'id':s('uuid'),'variant_id':s('uuid'),'order_id':s('uuid'),'delta_quantity':{'type':'integer'},'reason':s(),'occurred_at':s('date-time')},('id','variant_id','delta_quantity')),
    'UserSummary':obj({'id':s('uuid'),'email':s('email'),'status':s(),'version':{'type':'integer'}},('id','email','status')),
    'PlatformDashboard':obj({'order_value_vnd':i(),'completed_goods_revenue_vnd':i(),'collected_vnd':i(),'refunded_vnd':i(),'store_count':{'type':'integer'},'user_count':{'type':'integer'}},('order_value_vnd','completed_goods_revenue_vnd','collected_vnd','refunded_vnd')),
    'AiMetrics':obj({'index_status':s(),'model_version':s(),'last_training_at':s('date-time'),'evaluation_status':s(),'metrics':{'type':'object','additionalProperties':True}},('index_status','evaluation_status')),
    'VoucherUsage':obj({'voucher_id':s('uuid'),'reserved_count':{'type':'integer'},'redeemed_count':{'type':'integer'},'remaining_count':{'type':'integer'}},('voucher_id','redeemed_count')),
})

page_types = {
    'Addresses':'Address','StoreApplications':'StoreApplication','StoreStaff':'StoreMembership',
    'StaffInvitations':'StaffInvitation','Categories':'Category','ProductTypes':'ProductType',
    'Products':'Product','Inventory':'InventoryBalance','StockMovements':'StockMovement',
    'CartItems':'CartItem','Orders':'Order','Vouchers':'Voucher','Reviews':'Review',
    'Users':'UserSummary','Stores':'Store','ChatSessions':'ChatSession',
}
for suffix, item in page_types.items():
    schemas['Page'+suffix] = obj({'items':arr(item),'total':{'type':'integer'},'page':{'type':'integer'},'size':{'type':'integer'}},('items','total','page','size'))

request_map = {
    'register':'RegisterRequest','login':'LoginRequest','refresh':'RefreshRequest',
    'updateProfile':'ProfileUpdate','updateOwnStore':'StoreUpdate',
    'addProductImage':'ProductImageRequest','updateUserState':'StateChangeRequest',
    'updateStoreState':'StateChangeRequest','updateRole':'RoleUpdate',
    'createChatSession':'ChatSessionCreate',
    'createCategory':'TaxonomyWrite','updateCategory':'TaxonomyWrite',
    'createProductType':'TaxonomyWrite','updateProductType':'TaxonomyWrite',
    'createAttributeDefinition':'TaxonomyWrite','updateAttributeDefinition':'TaxonomyWrite',
}
response_map = {
    'register':'RegistrationResult','login':'AuthTokens','refresh':'AuthTokens',
    'getProfile':'Profile','updateProfile':'Profile','getOwnStore':'Store','updateOwnStore':'Store',
    'addProductImage':'ProductImage','updateUserState':'UserSummary','updateStoreState':'Store',
    'getPlatformDashboard':'PlatformDashboard','updateRole':'Role',
    'createChatSession':'ChatSession','getAiMetrics':'AiMetrics',
    'getStoreVoucherUsage':'VoucherUsage','getPlatformVoucherUsage':'VoucherUsage',
    'createCategory':'Category','updateCategory':'Category',
    'createProductType':'ProductType','updateProductType':'ProductType',
    'createAttributeDefinition':'AttributeDefinition','updateAttributeDefinition':'AttributeDefinition',
    'listAddresses':'PageAddresses','listOwnStoreApplications':'PageStoreApplications',
    'listStoreApplications':'PageStoreApplications','listStoreStaff':'PageStoreStaff',
    'listStaffInvitations':'PageStaffInvitations','listOwnInvitations':'PageStaffInvitations',
    'listCategories':'PageCategories','listProductTypes':'PageProductTypes',
    'listProducts':'PageProducts','listStoreProducts':'PageProducts','listOwnStoreProducts':'PageProducts',
    'listStoreInventory':'PageInventory','listStockMovements':'PageStockMovements',
    'listCartItems':'PageCartItems','listOwnOrders':'PageOrders','listStoreOrders':'PageOrders',
    'listStoreVouchers':'PageVouchers','listPlatformVouchers':'PageVouchers',
    'listProductReviews':'PageReviews','listUsers':'PageUsers','listStores':'PageStores',
    'listAllOrders':'PageOrders','listOwnChatSessions':'PageChatSessions',
    'getRelatedProducts':'PageProducts',
}
for name in ('verifyEmail','logout','resetPassword','confirmResetPassword','changePassword',
             'deleteAddress','removeCartItem','sandboxCallback'):
    response_map[name] = 'OperationResult'

api['components']['securitySchemes'] = {'bearerAuth':{'type':'http','scheme':'bearer','bearerFormat':'JWT'}}
public = {'register','verifyEmail','login','resetPassword','confirmResetPassword',
          'listCategories','listProductTypes','listProducts','getProduct','listStoreProducts',
          'listProductReviews','getRelatedProducts'}
optional_auth = {'createChatSession','sendChatMessage'}
admin = {'listStoreApplications','reviewStoreApplication','listPlatformVouchers','createPlatformVoucher',
         'updatePlatformVoucher','getPlatformVoucherUsage','hideReview','restoreReview',
         'listUsers','updateUserState','listStores','updateStoreState','listAllOrders',
         'getPlatformDashboard','updateRole','getAiMetrics','createCategory','updateCategory',
         'createProductType','updateProductType','createAttributeDefinition','updateAttributeDefinition',
         'hideProduct','restoreProduct'}
store = {'getOwnStore','updateOwnStore','listStoreStaff','listStaffInvitations','inviteStaff',
         'revokeStaffInvitation','listOwnStoreProducts','createProduct','updateProduct',
         'createVariant','addProductImage','listStoreInventory','adjustInventory',
         'listStockMovements','listStoreOrders','getStoreOrder','transitionStoreOrder',
         'cancelStoreOrder','collectCod','listStoreVouchers','createStoreVoucher',
         'updateStoreVoucher','getStoreVoucherUsage','updateStaff','getStoreReport'}
owner_only = {'updateOwnStore','listStoreStaff','listStaffInvitations','inviteStaff',
              'revokeStaffInvitation','listStoreVouchers','createStoreVoucher',
              'updateStoreVoucher','getStoreVoucherUsage','updateStaff','getStoreReport'}
list_ops = {name for name in response_map if name.startswith('list') or name == 'getRelatedProducts'}

for route, methods in api['paths'].items():
    for method, op in methods.items():
        oid = op['operationId']
        op['security'] = ([] if oid in public or oid == 'sandboxCallback' else
                          [{'bearerAuth':[]},{}] if oid in optional_auth else [{'bearerAuth':[]}])
        op['x-required-roles'] = (['ADMIN'] if oid in admin else
                                  ['STORE_OWNER'] if oid in owner_only else
                                  ['SELLER','STORE_OWNER'] if oid in store else
                                  ['GUEST','CUSTOMER'] if oid in public or oid in optional_auth else
                                  ['CUSTOMER'] if route.startswith(('/cart','/checkout','/orders/batches','/me/orders','/me/reviews')) else
                                  ['AUTHENTICATED'])
        if oid in request_map:
            op['requestBody']['content']['application/json']['schema'] = ref(request_map[oid])
        if oid in response_map:
            success = next(k for k in op['responses'] if k.startswith('2'))
            op['responses'][success]['content']['application/json']['schema'] = ref(response_map[oid])
        if oid in list_ops:
            names = {p['name'] for p in op.get('parameters',[])}
            for name, default in (('page',1),('size',20)):
                if name not in names:
                    op.setdefault('parameters',[]).append({'name':name,'in':'query','required':False,
                        'schema':{'type':'integer','minimum':1,'maximum':100 if name=='size' else 1000000,'default':default}})
        if oid == 'sandboxCallback':
            op.setdefault('parameters',[]).append({'name':'X-Sandbox-Signature','in':'header','required':True,'schema':s()})
        if oid == 'confirmCheckout':
            op['description'] = 'Một lần xác nhận tạo toàn bộ Order theo Store; cùng Idempotency-Key và payload trả cùng OrderBatch, khác payload trả 409.'
        if oid == 'createPaymentAttempt':
            op['description'] = 'Chỉ tạo Attempt cho một Order SANDBOX AWAITING_PAYMENT còn hạn; không thu tiền các Order khác trong purchase_group_id.'

path.write_text(json.dumps(api,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
print('Refined',sum(len(x) for x in api['paths'].values()),'operations')
