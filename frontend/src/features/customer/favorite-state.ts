import {useMutation,useIsMutating,useQuery,useQueryClient,type QueryClient} from '@tanstack/react-query';
import {useAuth} from '../../api/auth-context';
import {callOperation} from '../../api/operations';
const idsKey=['favorites','ids'];
const signalKey='pbl6_favorites_signal';
/** Broadcast an invalidation only. No user, Store, product, token or private list crosses tabs. */
export function announceFavoritesChange(){try{localStorage.setItem(signalKey,crypto.randomUUID());}catch{/* Focus/reload still reads server state. */}}
export function listenFavoritesChange(cache:QueryClient){
 const listener=(event:StorageEvent)=>{if(event.key===signalKey&&event.newValue)void (async()=>{await cache.cancelQueries({queryKey:['favorites']});await cache.invalidateQueries({queryKey:['favorites']});})();};
 window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener);
}
export function useFavorites(){
 const {session}=useAuth(),cache=useQueryClient(),enabled=!!session?.context?.roles.includes('CUSTOMER');
 const query=useQuery({queryKey:idsKey,enabled,staleTime:10000,queryFn:async({signal})=>{
  const ids:string[]=[];
  for(let page=1;;page++){const result=await callOperation('listFavorites',{query:{page,size:100}},{signal});ids.push(...result.items);if(!result.items.length||ids.length>=result.total)return [...new Set(ids)];}
 }});
 async function update(id:string,saved:boolean){
  if(saved)await callOperation('addFavorite',{path:{id}});else await callOperation('removeFavorite',{path:{id}});
  // Cancel a GET started before this mutation, then publish one shared authoritative state.
  await cache.cancelQueries({queryKey:['favorites']});
  cache.setQueryData<string[]>(idsKey,prior=>prior?(saved?[...new Set([...prior,id])]:prior.filter(value=>value!==id)):prior);
  announceFavoritesChange();await cache.invalidateQueries({queryKey:['favorites']});
 }
 return {...query,enabled,update};
}
export function useFavorite(id:string){
 const query=useFavorites(),mutation=useMutation({mutationKey:['favorite',id],mutationFn:(saved:boolean)=>query.update(id,saved)}),busy=useIsMutating({mutationKey:['favorite',id]})>0;
 return {ready:!query.enabled||query.data!==undefined,saved:query.enabled&&!!query.data?.includes(id),loading:query.enabled&&query.isPending,busy,error:mutation.error??query.error,toggle:()=>mutation.mutateAsync(!query.data?.includes(id)),retry:query.refetch};
}
