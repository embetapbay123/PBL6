import { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../api/auth-context';
export function ErrorView({error}:{error:unknown}) {
  const value=error instanceof ApiError?error:undefined;
  return <p role="alert" className="boot-error">{value?.message ?? 'Có lỗi xảy ra.'}{value?.correlationId && <small>Mã yêu cầu: {value.correlationId}</small>}</p>;
}
export function Loading(){return <p role="status">Đang tải…</p>;}
export function Empty({children}:{children:ReactNode}){return <p>{children}</p>;}
export function Pagination({page,size,total,onPage}:{page:number;size:number;total:number;onPage:(p:number)=>void}) {
  return <div className="boot-pagination"><button disabled={page<=1} onClick={()=>onPage(page-1)}>Trang trước</button><span>Trang {page} · {total} kết quả</span><button disabled={page*size>=total} onClick={()=>onPage(page+1)}>Trang sau</button></div>;
}
export function FormPanel({title,busy,error,onSubmit,children}:{title:string;busy:boolean;error?:unknown;onSubmit:(event:FormEvent)=>void;children:ReactNode}) {
  return <form onSubmit={onSubmit} className="boot-card"><h2>{title}</h2>{children}<button disabled={busy}>{busy?'Đang lưu…':'Lưu thay đổi'}</button>{error!=null && <ErrorView error={error}/>}</form>;
}
export function ProtectedRoute({roles,children}:{roles?:string[];children:ReactNode}) {
  const {session}=useAuth();
  if(!session)return <section className="boot-card"><p>Đăng nhập để tiếp tục.</p><Link to="/login">Đăng nhập</Link></section>;
  if(roles && !session.context?.roles.some(role=>roles.includes(role)))return <ErrorView error={new ApiError(403,'FORBIDDEN','Bạn không có quyền mở trang này.')}/>;
  return <>{children}</>;
}

export function OwnerLanding({owner,feature}:{owner:string;feature:string}){return <section className="boot-card"><h2>{feature}</h2><p>{owner} triển khai theo contract và task đã giao.</p><p>Chưa có nghiệp vụ hoạt động tại màn này.</p></section>;}
