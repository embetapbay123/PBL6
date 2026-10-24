import React, { useState } from 'react';
import { sendChatMessage } from '../../api/recommendationsChat';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export const CustomerChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: 'Xin chào! Tôi có thể hỗ trợ gì cho bạn hôm nay?' }
  ]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputMessage('');
    setLoading(true);

    try {
      await sendChatMessage({ message: userText });
      
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Cảm ơn bạn. Hệ thống đang xử lý yêu cầu của bạn.' }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Xin lỗi, hệ thống chat đang gặp sự cố. Vui lòng thử lại sau.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
        >
          💬 Chat hỗ trợ
        </button>
      ) : (
        <div className="w-80 h-96 bg-white border rounded-lg shadow-xl flex flex-col justify-between">
          <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
            <span className="font-semibold">Hỗ trợ khách hàng trực tuyến</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 font-bold"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg max-w-[80%] text-sm ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-blue-600 text-white'
                    : 'mr-auto bg-gray-200 text-gray-800'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && <div className="text-xs text-gray-400 italic">Đang trả lời...</div>}
          </div>

          <form onSubmit={handleSendMessage} className="p-2 border-t flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập tin nhắn của bạn..."
              className="flex-1 border rounded px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};