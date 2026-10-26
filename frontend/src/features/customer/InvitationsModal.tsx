import {InvitationsPage} from './InvitationsPage';
export function InvitationsModal({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}){
 if(!isOpen)return null;
 return <div role="dialog" aria-modal="true" aria-label="Lời mời Store" className="boot-card"><button onClick={onClose}>Đóng lời mời</button><InvitationsPage/></div>;
}
export default InvitationsModal;
