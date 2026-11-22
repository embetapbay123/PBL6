"""Add the bounded, owner-managed storefront contracts without rewriting implementations."""
import copy
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
public_path=root/'docs/contracts/openapi.json'
internal_path=root/'docs/contracts/internal-api.json'
api=json.loads(public_path.read_text(encoding='utf-8'))
internal=json.loads(internal_path.read_text(encoding='utf-8'))
schemas=api['components']['schemas']
uuid={'type':'string','format':'uuid'}
stamp={'type':'string','format':'date-time'}
version={'type':'integer','minimum':0}
def obj(properties,required=None):
 needed=list(properties) if required is None else required
 return {'type':'object','additionalProperties':False,'properties':properties,**({'required':needed} if needed else {})}
def ref(name):return {'$ref':'#/components/schemas/'+name}
def text(length,minimum=1):return {'type':'string','minLength':minimum,'maxLength':length}
schemas['StorefrontBanner']=obj({'asset_id':uuid,'title':text(90),'subtitle':text(160,0),'link_type':{'type':'string','enum':['ALL_PRODUCTS','PRODUCT']},'product_id':uuid},['asset_id','title','link_type'])
schemas['StorefrontCampaign']=obj({'title':text(90),'voucher_id':uuid,'starts_at':stamp,'ends_at':stamp})
schemas['StorefrontGroup']=obj({'id':uuid,'title':text(60),'kind':{'type':'string','enum':['CURATED','NEW','BEST_SELLING']},'product_ids':{'type':'array','maxItems':12,'uniqueItems':True,'items':uuid}})
schemas['StorefrontContent']=obj({'enabled':{'type':'boolean'},'banner':ref('StorefrontBanner'),'campaign':ref('StorefrontCampaign'),'groups':{'type':'array','maxItems':4,'items':ref('StorefrontGroup')}},['enabled','groups'])
schemas['StorefrontDraft']=obj({'store_id':uuid,'version':version,'content':ref('StorefrontContent'),'published_version':version,'published_at':stamp},['store_id','version','content'])
schemas['StorefrontDraftWrite']=obj({'expected_version':version,'content':ref('StorefrontContent')})
schemas['StorefrontPublish']=obj({'expected_version':version})
schemas['StorefrontBannerCreate']=obj({'client_upload_id':uuid,'size_bytes':{'type':'integer','minimum':1,'maximum':2097152},'sha256':{'type':'string','pattern':'^[a-f0-9]{64}$','example':'0'*64}})
schemas['StorefrontBannerAsset']=obj({'id':uuid,'status':{'type':'string','enum':['UPLOADING','PROCESSING','READY','FAILED']},'width':{'type':'integer','minimum':1},'height':{'type':'integer','minimum':1}},['id','status'])
schemas['StorefrontProducts']=obj({'curated':{'type':'array','maxItems':49,'items':ref('Product')},'newest':{'type':'array','maxItems':12,'items':ref('Product')},'bestsellers':{'type':'array','maxItems':12,'items':ref('Product')},'bestsellers_complete':{'type':'boolean'}})
schemas['PublicStorefront']=obj({'store_id':uuid,'version':version,'content':ref('StorefrontContent'),'products':ref('StorefrontProducts'),'campaign_voucher':ref('Voucher'),'published_at':stamp},['store_id','version','content','products'])
index_path=root/'docs/contracts/endpoint-status.json';index=json.loads(index_path.read_text(encoding='utf-8'))
entries=[
 ('getPublicStorefront','get','/stores/{id}/storefront','PublicStorefront',None,True),
 ('getOwnStorefront','get','/store/storefront','StorefrontDraft',None,False),
 ('updateOwnStorefront','put','/store/storefront','StorefrontDraft','StorefrontDraftWrite',False),
 ('previewOwnStorefront','get','/store/storefront/preview','PublicStorefront',None,False),
 ('publishOwnStorefront','post','/store/storefront/publish','StorefrontDraft','StorefrontPublish',False),
 ('createStorefrontBanner','post','/store/storefront/banners','StorefrontBannerAsset','StorefrontBannerCreate',False),
 ('uploadStorefrontBanner','put','/store/storefront/banners/{banner_id}/content','StorefrontBannerAsset','binary',False),
 ('readOwnStorefrontBanner','get','/store/storefront/banners/{banner_id}/content',None,None,False),
 ('readPublicStorefrontBanner','get','/stores/{id}/storefront/banners/{banner_id}/content',None,None,True),
]
for name,method,route,response,body,public in entries:
 op=copy.deepcopy(api['paths']['/stores/{id}']['get'] if public else api['paths']['/store']['patch'])
 op.update(operationId=name,summary=name,**{'x-module':'storefront','x-implementation-status':'IMPLEMENTED','x-required-roles':[] if public else ['STORE_OWNER']})
 op['parameters']=[v for v in op.get('parameters',[]) if v['in']=='header']+[
  {'name':key,'in':'path','required':True,'schema':uuid} for key in ('id','banner_id') if '{'+key+'}' in route]
 op.pop('requestBody',None)
 if body:op['requestBody']={'required':True,'content':{'application/octet-stream' if body=='binary' else 'application/json':{'schema':{'type':'string','format':'binary'} if body=='binary' else ref(body)}}}
 op['responses']={k:v for k,v in op['responses'].items() if not k.startswith('2')}
 op['responses']['201' if name=='createStorefrontBanner' else '200']={'description':'Store-scoped storefront result','content':{'application/json':{'schema':ref(response)}} if response else {'image/webp':{'schema':{'type':'string','format':'binary'}}}}
 api['paths'].setdefault(route,{})[method]=op
 index=[r for r in index if r['operation_id']!=name]
 index.append({'method':method.upper(),'path':route,'operation_id':name,'service':'M3','module':'storefront','owner':op['x-member-owner'],'status':'IMPLEMENTED','roles':[] if public else ['STORE_OWNER']})

# Only newly created catalog records have a trustworthy first-publication clock.
# Publication is an internal catalog clock. Keep the existing closed Product
# response compatible with the currently deployed M4 and mobile consumers.
schemas['Product']['properties'].pop('published_at',None)
catalog_body=obj({'store_id':uuid,'product_ids':{'type':'array','maxItems':49,'uniqueItems':True,'items':uuid},'include_new':{'type':'boolean'},'include_bestsellers':{'type':'boolean'}})
sales_body=obj({'store_id':uuid,'after_sold':{'type':'integer','minimum':1},'after_id':uuid},['store_id'])
sales_row=obj({'product_id':uuid,'quantity':{'type':'integer','minimum':1}})
sales_response=obj({'items':{'type':'array','maxItems':100,'items':sales_row},'has_more':{'type':'boolean'}})
voucher_body=obj({'store_id':uuid,'voucher_id':uuid})
voucher_response=obj({'voucher':{'$ref':'./openapi.json#/components/schemas/Voucher'}} ,[])
for name,route,service,callers,body,response in [
 ('ResolveStorefrontCatalog','/internal/storefront/catalog','M1',['M3'],catalog_body,{'$ref':'./openapi.json#/components/schemas/StorefrontProducts'}),
 ('RankStorefrontSales','/internal/storefront/sales','M2',['M1'],sales_body,sales_response),
 ('ResolveStorefrontVoucher','/internal/storefront/voucher','M2',['M3'],voucher_body,voucher_response),
]:
 op=copy.deepcopy(internal['paths']['/internal/context']['post'])
 op.update(operationId=name,summary=name,**{'x-service-owner':service,'x-allowed-callers':callers,'x-implementation-status':'IMPLEMENTED'})
 op['parameters']=[p for p in op.get('parameters',[]) if p.get('in')=='header']
 op['requestBody']={'required':True,'content':{'application/json':{'schema':body}}}
 op['responses']['200']={'description':'Bounded current storefront data','content':{'application/json':{'schema':response}}}
 internal['paths'][route]={'post':op}
for path,value in ((public_path,api),(internal_path,internal),(index_path,index)):
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Added 9 storefront endpoints and 3 scoped internal reads')
