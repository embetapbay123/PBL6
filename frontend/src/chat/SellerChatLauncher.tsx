import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Minus } from 'lucide-react';
import { MessagesWorkspace } from './ConversationWorkspace';

/** A Store-scoped inbox; drafts remain in ChatProvider while the panel is minimized. */
export function SellerChatLauncher({ unread }: { unread?: number }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const launcher = useRef<HTMLButtonElement>(null);
  return <div className="seller-chat-launcher">
    <button ref={launcher} type="button" aria-expanded={open} aria-controls="seller-chat-panel" onClick={() => setOpen(value => !value)}>
      <MessageCircle size={19} aria-hidden="true" /> Tin nhắn khách hàng
      {!!unread && <span className="chat-unread-badge" aria-label={`${unread} tin chưa đọc`}>{unread > 99 ? '99+' : unread}</span>}
    </button>
    <section id="seller-chat-panel" className="seller-chat-panel" aria-label="Hộp thư Store" hidden={!open}>
      <header><strong>Tin nhắn khách hàng</strong><div><Link to={selected ? `/seller/messages/${selected}` : '/seller/messages'} onClick={() => setOpen(false)}>Mở toàn màn hình</Link><button type="button" aria-label="Thu nhỏ tin nhắn" onClick={() => { setOpen(false); launcher.current?.focus(); }}><Minus size={18}/></button></div></header>
      <MessagesWorkspace scope="STORE" id={selected || undefined} compact active={open} onSelect={setSelected}/>
    </section>
  </div>;
}
