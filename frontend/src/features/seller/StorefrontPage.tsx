import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import {ApiError,request} from '../../api/client';
import type {OperationOutputs} from '../../api/operations.generated';
import {Button} from '../../components/ui/Button';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
import {useStoreAccess} from '../../live/useLiveData';
import {StorefrontSections} from '../customer/StorefrontSections';
type Draft=OperationOutputs['getOwnStorefront'];
type Content=Draft['content'];
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const localTime=(value:string)=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16):'';};
export function StorefrontPage(){
 const access=useStoreAccess();const state=useQuery({queryKey:['storefront-editor',access.id,access.userId],queryFn:({signal})=>callOperation('getOwnStorefront',{}, {signal}),enabled:!!access.id&&access.owner,refetchOnWindowFocus:false});
 if(!access.owner)return <ErrorView error={new ApiError(403,'OWNER_REQUIRED','Chỉ chủ gian hàng được sửa trang gian hàng.')}/>;
 return <section className="storefront-editor">{state.error?<ErrorView error={state.error} onRetry={()=>void state.refetch()}/>:state.data?<StorefrontForm key={access.userId+':'+access.id} initial={state.data}/>:<Loading/>}</section>;
}
function StorefrontForm({initial}:{initial:Draft}){
 const [saved,setSaved]=useState(initial),[content,setContent]=useState<Content>(initial.content),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[notice,setNotice]=useState('');
 const [pending,setPending]=useState<{kind:'save'|'publish';version:number;content:Content}|undefined>(),[canReplay,setCanReplay]=useState(false);
 const [preview,setPreview]=useState<OperationOutputs['getPublicStorefront']>(),[mobile,setMobile]=useState(false),[bannerUrl,setBannerUrl]=useState<string>(),[uploading,setUploading]=useState(false),[percent,setPercent]=useState(0);
 const [picker,setPicker]=useState<string>(),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1);
 const mounted=useRef(true),flight=useRef(false),uploadController=useRef<AbortController|undefined>(undefined),upload=useRef<{file:File;key:string;sha?:string;id?:string}|undefined>(undefined);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;uploadController.current?.abort();};},[]);
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search.trim());setPage(1);},300);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{setBannerUrl(undefined);if(!content.banner)return;const controller=new AbortController();let object:string|undefined;
  void request<Blob>(`/store/storefront/banners/${content.banner.asset_id}/content`,{signal:controller.signal,binaryResponse:true}).then(blob=>{if(controller.signal.aborted)return;object=URL.createObjectURL(blob);setBannerUrl(object);}).catch(e=>{if(!controller.signal.aborted)setError(e);});
  return()=>{controller.abort();if(object)URL.revokeObjectURL(object);};
 },[content.banner?.asset_id]);
 const dirty=stable(content)!==stable(saved.content),blocked=busy||uploading||!!pending;
 const products=useQuery({queryKey:['storefront-picker',initial.store_id,page,query],queryFn:({signal})=>callOperation('listOwnStoreProducts',{query:{page,size:20,...(query?{q:query}:{})}},{signal}),enabled:!!picker});
 const selectedIds=[...new Set([...content.groups.flatMap(g=>g.product_ids),...(content.banner?.product_id?[content.banner.product_id]:[])])];
 const selected=useQuery({queryKey:['storefront-selected',initial.store_id,selectedIds.join(',')],queryFn:({signal})=>callOperation('listProducts',{query:{ids:selectedIds.join(','),size:100}},{signal}),enabled:selectedIds.length>0});
 const names=new Map([...(selected.data?.items??[]),...(products.data?.items??[])].map(p=>[p.id,p.title]));
 const vouchers=useQuery({queryKey:['storefront-vouchers',initial.store_id],queryFn:({signal})=>callOperation('listStoreVouchers',{query:{size:100}},{signal}),enabled:!!content.campaign});
 const accept=(value:Draft)=>{setSaved(value);setContent(value.content);setPreview(undefined);setPending(undefined);setCanReplay(false);setError(undefined);};
 async function read(){
  if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);
  try{const value=await callOperation('getOwnStorefront');if(!mounted.current)return;
   if(pending){const matches=pending.kind==='save'?stable(value.content)===stable(pending.content):value.published_version===pending.version+1&&stable(value.content)===stable(pending.content);
    if(value.version===pending.version+1&&matches){accept(value);setNotice(pending.kind==='save'?'Bản nháp đã được lưu.':'Trang gian hàng đã được xuất bản.');}
    else if(value.version===pending.version){setCanReplay(true);setNotice('Chưa thấy thay đổi. Bạn có thể thử lại cùng nội dung.');}
    else{setCanReplay(false);setError(new ApiError(409,'VERSION_CONFLICT','Bản đã lưu vừa thay đổi. Nội dung bạn đang sửa vẫn được giữ; đọc lại để thay bằng bản đã lưu.'));}
   }else{accept(value);setNotice('Đã đọc lại bản đã lưu.');}
  }catch(e){if(mounted.current)setError(e);}finally{flight.current=false;if(mounted.current)setBusy(false);}
 }
 async function command(kind:'save'|'publish',replay=false){
  if(flight.current)return;if(!replay&&pending)return;
  if(!replay&&kind==='save'){
   const problem=content.campaign&&!content.campaign.voucher_id?'Chọn mã ưu đãi cho chương trình.':content.banner?.link_type==='PRODUCT'&&!content.banner.product_id?'Chọn sản phẩm đích cho banner.':content.groups.some(g=>!g.title.trim())?'Nhập tên nhóm sản phẩm.':content.groups.some(g=>g.kind==='CURATED'&&!g.product_ids.length)?'Chọn ít nhất một sản phẩm cho mỗi nhóm chọn tay.':content.banner&&!content.banner.title.trim()?'Nhập tiêu đề banner.':undefined;
   if(problem){setError(new ApiError(422,'STOREFRONT_INCOMPLETE',problem));return;}
  }
  const intent=replay?pending!:{kind,version:saved.version,content:structuredClone(content)};flight.current=true;setBusy(true);setError(undefined);setNotice('');setCanReplay(false);
  try{const value=await (intent.kind==='save'?callOperation('updateOwnStorefront',{body:{expected_version:intent.version,content:intent.content}}):callOperation('publishOwnStorefront',{body:{expected_version:intent.version}}));if(!mounted.current)return;accept(value);setNotice(intent.kind==='save'?'Đã lưu nháp. Trang công khai giữ bản đã xuất bản.':'Đã xuất bản trang gian hàng.');}
  catch(e){if(!mounted.current)return;setError(e);if(e instanceof ApiError&&(e.status===0||e.status>=500||e.status===409)){setPending(intent);setNotice('Chưa xác nhận thay đổi. Đọc lại trước khi tiếp tục.');}}
  finally{flight.current=false;if(mounted.current)setBusy(false);}
 }
 async function readSaved(){if(dirty&&!window.confirm('Thay nội dung đang sửa bằng bản đã lưu?'))return;setPending(undefined);setCanReplay(false);if(flight.current)return;flight.current=true;setBusy(true);try{const value=await callOperation('getOwnStorefront');if(mounted.current){accept(value);setNotice('Đã đọc lại bản đã lưu.');}}catch(e){if(mounted.current)setError(e);}finally{flight.current=false;if(mounted.current)setBusy(false);}}
 const change=(next:Content)=>{setContent(next);setNotice('');setPreview(undefined);};
 const groupChange=(id:string,patch:Partial<Content['groups'][number]>)=>change({...content,groups:content.groups.map(g=>g.id===id?{...g,...patch}:g)});
 function moveGroup(index:number,by:number){const groups=[...content.groups],next=index+by;if(next<0||next>=groups.length)return;[groups[index],groups[next]]=[groups[next],groups[index]];change({...content,groups});}
 function moveProduct(group:Content['groups'][number],index:number,by:number){const ids=[...group.product_ids],next=index+by;if(next<0||next>=ids.length)return;[ids[index],ids[next]]=[ids[next],ids[index]];groupChange(group.id,{product_ids:ids});}
 async function uploadBanner(file?:File){
  if(uploading||blocked)return;if(file){if(!/^image\/(jpeg|png|webp)$/.test(file.type)||!file.size||file.size>2097152){setError(new ApiError(413,'BANNER_INVALID','Chọn ảnh JPG, PNG hoặc WebP tĩnh, tối đa 2 MB.'));return;}upload.current={file,key:crypto.randomUUID()};}
  const item=upload.current;if(!item)return;const controller=new AbortController();uploadController.current=controller;setUploading(true);setPercent(0);setError(undefined);
  try{item.sha??=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await item.file.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');if(controller.signal.aborted)return;
   if(!item.id){const a=await callOperation('createStorefrontBanner',{body:{client_upload_id:item.key,size_bytes:item.file.size,sha256:item.sha}},{signal:controller.signal});item.id=a.id;}
   const a=await request<OperationOutputs['uploadStorefrontBanner']>(`/store/storefront/banners/${item.id}/content`,{method:'PUT',body:item.file,signal:controller.signal,onUploadProgress:setPercent});if(!mounted.current||controller.signal.aborted)return;
   if(a.status!=='READY')throw new ApiError(409,'BANNER_NOT_READY','Banner chưa sẵn sàng. Thử tải lại tệp này.');
   change({...content,banner:content.banner?{...content.banner,asset_id:a.id}:{asset_id:a.id,title:'Khám phá bộ sưu tập của gian hàng',link_type:'ALL_PRODUCTS'}});upload.current=undefined;setNotice('Banner đã sẵn sàng. Lưu nháp để giữ thay đổi.');
  }catch(e){if(mounted.current&&!controller.signal.aborted)setError(e);}finally{if(mounted.current)setUploading(false);}
 }
 async function showPreview(){if(blocked||dirty)return;setBusy(true);setError(undefined);try{const value=await callOperation('previewOwnStorefront');if(mounted.current)setPreview(value);}catch(e){if(mounted.current)setError(e);}finally{if(mounted.current)setBusy(false);}}
 return <>
  <header className="storefront-editor-heading"><div><Link to="/seller/settings">← Thông tin gian hàng</Link><h1>Trang gian hàng</h1><p>{saved.published_at?`Xuất bản lúc ${new Date(saved.published_at).toLocaleString('vi-VN')}`:'Chưa xuất bản'}{dirty?' · Có thay đổi chưa lưu':''}</p></div>
   <div className="storefront-editor-actions"><Button variant="secondary" disabled={blocked} onClick={()=>void readSaved()}>Đọc lại</Button><Button variant="secondary" disabled={blocked||!dirty} onClick={()=>void command('save')}>Lưu nháp</Button><Button disabled={blocked||dirty||saved.version===0} onClick={()=>void command('publish')}>Xuất bản</Button></div>
  </header>
  {error!==undefined&&<ErrorView error={error}/>}{notice&&<p role="status" className={pending?'storefront-editor-warning':'storefront-editor-notice'}>{notice}</p>}
  {pending&&<div className="storefront-editor-actions"><Button disabled={busy} onClick={()=>void read()}>Đọc trạng thái</Button>{canReplay&&<Button variant="secondary" disabled={busy} onClick={()=>void command(pending.kind,true)}>Thử lại cùng nội dung</Button>}<Button variant="secondary" disabled={busy} onClick={()=>void readSaved()}>Dùng bản đã lưu</Button></div>}
  {uploading&&<p role="status">{percent<100?'Đang tải banner: '+percent+'%':'Đang kiểm tra ảnh…'} <button type="button" onClick={()=>uploadController.current?.abort()}>Hủy tải</button></p>}
  <div className="storefront-editor-fields">
   <label className="storefront-check"><input type="checkbox" checked={content.enabled} disabled={blocked} onChange={e=>change({...content,enabled:e.target.checked})}/>Hiển thị nội dung trên trang gian hàng</label>
   <fieldset disabled={blocked}><legend>Banner</legend>
    <label>Ảnh banner<input type="file" accept="image/jpeg,image/png,image/webp" disabled={blocked} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void uploadBanner(file);}}/></label><small>JPG, PNG hoặc WebP tĩnh, tối đa 2 MB. Ảnh ngang giúp bố cục gọn hơn.</small>
    {!uploading&&upload.current&&<Button variant="secondary" onClick={()=>void uploadBanner()}>Tải lại banner</Button>}
    {content.banner&&<><img className="storefront-banner-preview" src={bannerUrl} alt="Banner đang chỉnh sửa"/>
     <label>Tiêu đề banner<input maxLength={90} value={content.banner.title} onChange={e=>change({...content,banner:{...content.banner!,title:e.target.value}})}/></label>
     <label>Mô tả ngắn<input maxLength={160} value={content.banner.subtitle??''} onChange={e=>change({...content,banner:{...content.banner!,subtitle:e.target.value}})}/></label>
     <label>Đích khi bấm banner<select value={content.banner.link_type} onChange={e=>change({...content,banner:{asset_id:content.banner!.asset_id,title:content.banner!.title,subtitle:content.banner!.subtitle,link_type:e.target.value as 'PRODUCT'|'ALL_PRODUCTS'}})}><option value="ALL_PRODUCTS">Danh sách sản phẩm của gian hàng</option><option value="PRODUCT">Một sản phẩm</option></select></label>
     {content.banner.link_type==='PRODUCT'&&<><p>{content.banner.product_id?names.get(content.banner.product_id)??'Sản phẩm không còn công khai':'Chưa chọn sản phẩm đích'}</p><Button variant="secondary" onClick={()=>setPicker('banner')}>Chọn sản phẩm đích</Button></>}
     <Button variant="secondary" onClick={()=>{const {banner,...rest}=content;change(rest);}}>Bỏ banner</Button>
    </>}
   </fieldset>
   <fieldset disabled={blocked}><legend>Ưu đãi theo lịch</legend>
    <label className="storefront-check"><input type="checkbox" checked={!!content.campaign} onChange={e=>{if(e.target.checked)change({...content,campaign:{title:'Ưu đãi dành cho bạn',voucher_id:'',starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+86400000).toISOString()}});else{const {campaign,...rest}=content;change(rest);}}}/>Thêm ưu đãi</label>
    {content.campaign&&<><label>Tên chương trình<input maxLength={90} value={content.campaign.title} onChange={e=>change({...content,campaign:{...content.campaign!,title:e.target.value}})}/></label>
     <label>Mã ưu đãi<select value={content.campaign.voucher_id} onChange={e=>{const v=vouchers.data?.items.find(v=>v.id===e.target.value);if(v)change({...content,campaign:{...content.campaign!,voucher_id:v.id!,starts_at:v.starts_at,ends_at:v.ends_at}});}}><option value="">Chọn mã của gian hàng</option>{vouchers.data?.items.filter(v=>v.status==='ACTIVE').map(v=><option key={v.id} value={v.id}>{v.code}</option>)}</select></label>
     {vouchers.error&&<ErrorView error={vouchers.error} onRetry={()=>void vouchers.refetch()}/>}<Link to="/seller/vouchers">Quản lý mã ưu đãi →</Link>
     <div className="storefront-two-fields"><label>Bắt đầu<input type="datetime-local" value={localTime(content.campaign.starts_at)} onChange={e=>{if(e.target.value)change({...content,campaign:{...content.campaign!,starts_at:new Date(e.target.value).toISOString()}});}}/></label><label>Kết thúc<input type="datetime-local" value={localTime(content.campaign.ends_at)} onChange={e=>{if(e.target.value)change({...content,campaign:{...content.campaign!,ends_at:new Date(e.target.value).toISOString()}});}}/></label></div>
     <small>Mức giảm, điều kiện và lượt còn lại lấy từ mã hiện tại. Khách vẫn được kiểm tra điều kiện tại bước thanh toán.</small>
    </>}
   </fieldset>
   <fieldset disabled={blocked}><legend>Nhóm sản phẩm</legend>
    {content.groups.map((group,index)=><div className="storefront-group-editor" key={group.id}><header><strong>Nhóm {index+1}</strong><div><Button variant="secondary" size="sm" disabled={index===0} onClick={()=>moveGroup(index,-1)}>Lên</Button><Button variant="secondary" size="sm" disabled={index===content.groups.length-1} onClick={()=>moveGroup(index,1)}>Xuống</Button><Button variant="secondary" size="sm" onClick={()=>change({...content,groups:content.groups.filter(g=>g.id!==group.id)})}>Bỏ nhóm</Button></div></header>
     <div className="storefront-two-fields"><label>Tên nhóm<input maxLength={60} value={group.title} disabled={group.kind!=='CURATED'} onChange={e=>groupChange(group.id,{title:e.target.value})}/></label><label>Nguồn sản phẩm<select value={group.kind} onChange={e=>{const kind=e.target.value as typeof group.kind;groupChange(group.id,{kind,product_ids:[],title:kind==='NEW'?'Mới lên kệ':kind==='BEST_SELLING'?'Bán chạy 30 ngày':'Gian hàng gợi ý'});}}><option value="CURATED">Gian hàng chọn tay</option><option value="NEW">Mới lên kệ</option><option value="BEST_SELLING">Bán chạy 30 ngày</option></select></label></div>
     {group.kind==='CURATED'?<><ul className="storefront-selected-products">{group.product_ids.map((id,n)=><li key={id}><span>{names.get(id)??(selected.isLoading?'Đang đọc sản phẩm…':'Sản phẩm không còn công khai')}</span><div><Button variant="secondary" size="sm" aria-label={'Đưa sản phẩm '+(n+1)+' lên'} disabled={n===0} onClick={()=>moveProduct(group,n,-1)}>↑</Button><Button variant="secondary" size="sm" aria-label={'Đưa sản phẩm '+(n+1)+' xuống'} disabled={n===group.product_ids.length-1} onClick={()=>moveProduct(group,n,1)}>↓</Button><Button variant="secondary" size="sm" onClick={()=>groupChange(group.id,{product_ids:group.product_ids.filter(p=>p!==id)})}>Bỏ</Button></div></li>)}</ul><Button variant="secondary" onClick={()=>setPicker(group.id)}>Chọn sản phẩm ({group.product_ids.length}/12)</Button></>:<small>{group.kind==='NEW'?'Chỉ hiện sản phẩm có ngày xuất bản được ghi nhận.':'Theo số lượng đơn hoàn tất trong 30 ngày, trừ hàng trả đã nhận. Không có dữ liệu thì ẩn nhóm.'}</small>}
    </div>)}
    <Button variant="secondary" disabled={content.groups.length>=4} onClick={()=>change({...content,groups:[...content.groups,{id:crypto.randomUUID(),title:'Gian hàng gợi ý',kind:'CURATED',product_ids:[]}]})}>Thêm nhóm</Button>
    {picker&&<div className="storefront-product-picker"><header><h3>{picker==='banner'?'Chọn đích banner':'Chọn sản phẩm cho nhóm'}</h3><Button variant="secondary" onClick={()=>setPicker(undefined)}>Xong</Button></header><label>Tìm sản phẩm<input type="search" maxLength={200} value={search} onChange={e=>setSearch(e.target.value)}/></label>
     {products.error?<ErrorView error={products.error} onRetry={()=>void products.refetch()}/>:products.isLoading?<Loading/>:<><div className="storefront-pick-list">{products.data?.items.map(product=>{const group=content.groups.find(g=>g.id===picker),chosen=picker==='banner'?content.banner?.product_id===product.id:group?.product_ids.includes(product.id!);return <button type="button" key={product.id} aria-pressed={!!chosen} disabled={product.status!=='ACTIVE'||product.moderation_status!=='VISIBLE'||!chosen&&picker!=='banner'&&(group?.product_ids.length??0)>=12} onClick={()=>{if(picker==='banner'){change({...content,banner:{...content.banner!,product_id:product.id}});setPicker(undefined);}else if(group)groupChange(group.id,{product_ids:chosen?group.product_ids.filter(id=>id!==product.id):[...group.product_ids,product.id!]});}}><span>{product.title}</span><span>{chosen?'✓ Đã chọn':product.status==='ACTIVE'&&product.moderation_status==='VISIBLE'?'Chọn':'Chưa công khai'}</span></button>;})}</div>{!products.data?.items.length&&<p>Không tìm thấy sản phẩm.</p>}{products.data&&<Pagination page={page} size={products.data.size} total={products.data.total} onPage={setPage}/>}</>}
    </div>}
   </fieldset>
  </div>
  <div className="storefront-editor-actions"><Button variant="secondary" disabled={blocked||dirty} onClick={()=>void showPreview()}>Xem trước bản đã lưu</Button><Link to={'/stores/'+initial.store_id}>Mở trang công khai →</Link></div>
  {preview&&<><label className="storefront-check"><input type="checkbox" checked={mobile} onChange={e=>setMobile(e.target.checked)}/>Xem trên điện thoại</label><div className="storefront-preview" data-mobile={mobile} aria-label="Xem trước trang gian hàng">{!preview.content.enabled?<p>Nội dung đang tắt.</p>:preview.content.banner||preview.content.campaign||preview.content.groups.length?<StorefrontSections data={preview} bannerUrl={bannerUrl} preview/>:<p>Chưa có nội dung đang hiển thị. Kiểm tra banner, lịch ưu đãi và nhóm sản phẩm.</p>}</div></>}
  <details><summary>Lưu nháp và xuất bản</summary><p>Lưu nháp giữ nội dung đang soạn. Xuất bản thay nội dung công khai; tắt hiển thị rồi lưu và xuất bản để thu hồi. Banner cũ chưa dùng được dọn sau một ngày. Tối đa 4 nhóm, 12 sản phẩm mỗi nhóm.</p></details>
 </>;
}
