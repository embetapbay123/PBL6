import {useParams} from 'react-router-dom';
import {MessagesWorkspace} from '../../chat/ConversationWorkspace';
export function MessagesPage({scope}:{scope:'CUSTOMER'|'STORE'}){const {id}=useParams<{id:string}>();return <MessagesWorkspace key={scope+':'+(id??'list')} scope={scope} id={id}/>;}
