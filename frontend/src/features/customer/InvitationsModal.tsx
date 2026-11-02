import {InvitationsPage} from './InvitationsPage';
import {Modal} from '../../components/Modal';
export function InvitationsModal({isOpen,onClose}:{isOpen:boolean;onClose:()=>void}){
 if(!isOpen)return null;
 return <Modal label="Lời mời Store" onClose={onClose}><button onClick={onClose}>Đóng lời mời</button><InvitationsPage/></Modal>;
}
export default InvitationsModal;
