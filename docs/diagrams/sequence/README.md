# Hướng dẫn đọc sequence diagram PBL6

Mỗi file `.puml` trong thư mục này là **bản dễ đọc ở mức nghiệp vụ**, có trang giải thích cùng tên. Hãy đọc mục **Hiểu nhanh** trước: nó kể câu chuyện theo góc nhìn người dùng, không cần biết code. Khi triển khai, mở [bản sequence kỹ thuật](../technical/sequence/) được giữ riêng để xem M1–M4 và các mã thao tác. Sequence ở đây trả lời **ai tương tác với ai, theo thứ tự nào và nếu lỗi thì chuyện gì xảy ra**.

| Sơ đồ | Câu hỏi chính |
| --- | --- |
| [01 — Tạo Order và trả sandbox](01-sandbox-checkout.md) | Tại sao một lần mua nhiều Store tạo nhiều Order/Payment? |
| [02 — Phục hồi sandbox](02-sandbox-recovery.md) | Payment đã thành công nhưng tồn lỗi, hoặc callback đến muộn, thì sao? |
| [03 — COD theo Order](03-cod-checkout.md) | COD A có thể giao/thu trước khi B thanh toán không? |
| [04 — Hủy và hoàn tiền](04-cancel-refund.md) | Hủy một Order tác động tồn và tiền thế nào? |
| [05 — Voucher](05-voucher.md) | Hai tầng voucher được giữ lượt và phân bổ ra sao? |
| [06 — Mở Store](06-store-application.md) | Admin duyệt/từ chối đơn mở Store như thế nào? |
| [07 — Product và AI index](07-product-ai-index.md) | Vì sao embedding cũ không được dùng để trả giá/trạng thái cũ? |
| [08 — RAG và recommendation](08-rag-and-recommendation.md) | Guest/Customer chat và gợi ý offline đi qua những bước nào? |

**Cách đọc:** thời gian đi từ trên xuống dưới nhưng không theo tỷ lệ phút/giây. Đường dọc nét đứt là **lifeline** (bên tham gia còn trong tương tác); hình chữ nhật hẹp trên đường đó là **activation bar** (khoảng bên đó đang xử lý yêu cầu). Mỗi mũi tên là thông tin gửi đi, mũi tên nét đứt thường là kết quả trả về; `alt/else` nghĩa là **chỉ chọn một nhánh**. Vạch `==` tách hai lần tương tác cách nhau về thời gian, chẳng hạn đặt hàng rồi mới chọn trả tiền. Hình dùng tên “Hệ thống mua hàng”, “Kho”, “Chatbot”…; các chi tiết API và chống lặp nằm trong [tài liệu tích hợp](../../integration-contract.md).
