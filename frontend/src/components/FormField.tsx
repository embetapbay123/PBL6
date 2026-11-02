import {cloneElement,useId,type ReactElement} from 'react';
import {ApiError} from '../api/client';
type Control={id?:string;'aria-invalid'?:boolean;'aria-describedby'?:string};
export function FormField({label,name,error,children}:{label:string;name:string;error?:unknown;children:ReactElement<Control>}){
 const generated=useId(),id=children.props.id??generated;
 const detail=error instanceof ApiError?error.details.find((value):value is {field:string;reason:string}=>!!value&&typeof value==='object'&&'field' in value&&value.field===name&&'reason' in value&&typeof value.reason==='string'):undefined;
 const message=detail?(detail.reason==='Invalid contract field'?'Giá trị chưa hợp lệ.':detail.reason):undefined;
 return <div className="form-field"><label htmlFor={id}>{label}</label>{cloneElement(children,{id,'aria-invalid':message?true:undefined,'aria-describedby':message?id+'-error':children.props['aria-describedby']})}{message&&<p className="field-error" id={id+'-error'}>{message}</p>}</div>;
}
