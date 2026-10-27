import {useRef,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useEffect} from 'react';
export function useAuthCommand(){const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[notice,setNotice]=useState('');const flight=useRef(false);return {busy,error,notice,run:async(action:()=>Promise<string|void>)=>{if(flight.current)return;flight.current=true;setBusy(true);setError(undefined);setNotice('');try{const message=await action();setNotice(message??'')}catch(e){setError(e)}finally{flight.current=false;setBusy(false)}}}}
export function useEmailToken(){const [params,setParams]=useSearchParams();const [token,setToken]=useState(()=>params.get('token')??'');useEffect(()=>{if(params.has('token')){const clean=new URLSearchParams(params);clean.delete('token');setParams(clean,{replace:true})}},[params,setParams]);return [token,setToken] as const;}
