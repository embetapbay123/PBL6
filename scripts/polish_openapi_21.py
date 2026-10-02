"""Finalize per-operation actor and data-scope notes in OpenAPI 2.1."""
from pathlib import Path
import json

path = Path(__file__).resolve().parents[1] / 'docs/contracts/openapi.json'
api = json.loads(path.read_text(encoding='utf-8'))
customer = {
    'getAuthContext','getProfile','updateProfile','listAddresses','createAddress','updateAddress',
    'deleteAddress','submitStoreApplication','listOwnStoreApplications','listOwnInvitations',
    'acceptInvitation','listCartItems','addCartItem','updateCartItem','removeCartItem',
    'quoteCheckout','confirmCheckout','getPurchaseGroupOrders','createPaymentAttempt',
    'getPayment','getOrderRefund','listOwnOrders','getOwnOrder','cancelOwnOrder',
    'validateVouchers','createReview','updateReview','listOwnChatSessions','getForYou',
}
public = {'register','verifyEmail','login','resetPassword','confirmResetPassword',
          'listCategories','listProductTypes','listProducts','getProduct','listStoreProducts',
          'listProductReviews','getRelatedProducts'}
for route, methods in api['paths'].items():
    for method, op in methods.items():
        oid = op['operationId']
        if oid in customer:
            op['x-required-roles'] = ['CUSTOMER'] if oid not in {'getAuthContext','getProfile','updateProfile'} else ['AUTHENTICATED']
        if oid == 'sandboxCallback':
            op['x-required-roles'] = ['SANDBOX_PROVIDER']
            op['x-data-scope'] = 'SIGNED_CALLBACK'
        elif oid in public:
            op['x-data-scope'] = 'PUBLIC'
        elif oid in {'createChatSession','sendChatMessage'}:
            op['x-data-scope'] = 'PUBLIC_OR_OWN_SESSION'
        elif oid in customer or route.startswith('/me/'):
            op['x-data-scope'] = 'OWN_USER'
        elif 'ADMIN' in op['x-required-roles']:
            op['x-data-scope'] = 'PLATFORM'
        elif route.startswith('/store'):
            op['x-data-scope'] = 'ACTIVE_STORE_MEMBERSHIP'
        else:
            op['x-data-scope'] = 'AUTHENTICATED_CONTEXT'
path.write_text(json.dumps(api,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
