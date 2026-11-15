# Chat AI nhận ảnh và khung hình video — đợt 4C

Đã triển khai ngày 15/11/2026 trên demo. Nhánh `codex/bug-docx-follow-through`; tiếp nối chat gian hàng `7b2eba8`. Đây là phần AI của B10, chưa đóng B28/CMS hay toàn bộ 33 nhóm.

## Hành vi

- Customer tải tối đa 3 ảnh tĩnh, mỗi ảnh 5 MB, hoặc một MP4 20 MB/30 giây. M4 kiểm tra nội dung, giới hạn pixel/thời lượng, bỏ metadata và tạo bản chuẩn hóa. Tệp nằm trong volume riêng, chỉ chủ phiên được đọc qua API có xác thực, hỗ trợ HEAD/Range; không nhận URL tùy ý.
- Người dùng phải đồng ý gửi ảnh cho OpenAI và nhập mật khẩu demo hiện có. Giao diện nêu hạn lưu 30 ngày; video chỉ đọc tối đa 8 khung hình, không phân tích âm thanh. API cũng kiểm tra cổng demo trước khi giữ tiền.
- Adapter gọi OpenAI trực tiếp bằng `gpt-6-luna`: ảnh JPEG thật hoặc 8 frame có thời điểm, structured output, tối đa 1024 output token, timeout 30 giây, không tự retry. Chat chữ giữ provider cũ; thử đồ giữ `gpt-image-2.6-sunburst`, quality/complexity low.
- Giữ trước 0,10 USD cho một yêu cầu; hạn mức dùng chung với thử đồ vẫn 1 USD/ngày và 10 USD/tháng. Phân tích media tối đa 3 lượt/người/ngày, 10 lượt/IP/ngày, 50 lượt toàn hệ thống/ngày và một yêu cầu chưa xong/người. Quota upload/byte riêng giới hạn lưu trữ và xử lý tệp.
- Usage hợp lệ được ghi thành **mức trừ ngân sách bảo thủ**, không phải hóa đơn nhà cung cấp. Thiếu usage/kết quả chưa rõ giữ nguyên tiền dự phòng, không mặc định miễn phí; model/tier bất thường tạm dừng nhận yêu cầu trả phí. Sổ tiền sống độc lập với lịch sử chat. CLI đối soát nội bộ yêu cầu chi phí đã xác minh và audit.
- Client lưu câu hỏi/asset/key bất biến trước POST, không lưu mật khẩu. Reload, mất ACK hoặc tab khác chỉ đọc lại key cũ; chỉ khi server xác nhận chưa có yêu cầu mới cho gửi lại cùng key. Worker có receipt riêng để khôi phục ghi DB mà không gọi lại OpenAI.
- Xóa lịch sử thu hồi quyền đọc ngay, hủy tác vụ đến muộn và dọn tệp; không xóa chi phí. Thêm thứ tự message tăng dần để tin USER/ASSISTANT cùng transaction không đảo vị trí theo UUID. Không suy diễn lại thứ tự thật của lịch sử cũ chỉ từ timestamp.

Model nhận ảnh và structured output được đối chiếu [tài liệu model](https://developers.openai.com/api/docs/models/gpt-6-luna); payload theo [Images and vision](https://developers.openai.com/api/docs/guides/images-vision?api-mode=chat). Công thức ngân sách dùng trần input/cache-write và output theo [giá chính thức](https://developers.openai.com/api/docs/pricing), kiểm tra ngày triển khai; cần cập nhật khi giá/model thay đổi.

## Kiểm chứng

- Candidate Linux: **259 Python test qua, 3 skip** (cần Redis/môi trường riêng); thêm lượt **6 native codec test qua** trong container không mạng. Bộ đầy đủ có PostgreSQL schema cô lập, native FFmpeg, adapter giả, race giữ tiền chung, delete khi xử lý, quyền HTTP, demo gate, usage chưa rõ và receipt sau DB mất ACK. Không đưa khóa OpenAI hoặc volume người dùng vào container test.
- Frontend: **22 Playwright test qua**, gồm 10 ca AI và hồi quy chat gian hàng/tìm kiếm; 320/390/1366 px, consent/password, video disclosure, upload/cancel/retry, mất ACK/reload/cross-tab/UNKNOWN, xóa khi đang poll. Không page error ở các ca này.
- Build FE và BE qua; contract drift/validation và 12 contract unit test qua. Cảnh báo chunk FE lớn đã có từ trước.
- Public không intercept API: tạo hai danh tính kiểm thử riêng; UI upload ảnh đỏ, gọi model thật và trả **“Đỏ”**. Video tổng hợp xanh dương → đỏ được model trả **“Nền chuyển từ xanh dương sang đỏ. Không có âm thanh.”**. Có provider request ID, usage thật, đúng `gpt-6-luna`, không fallback. Hai lượt ghi lần lượt 380 và 489 micro-USD, tổng **869 micro-USD / 0,000869 USD** theo công thức bảo thủ, không tuyên bố đây là phí hóa đơn chính xác.
- Public POST cùng key sau thành công và GET đọc lại vẫn chỉ có hai dòng tính phí. Quyền khác người trả 404; WebP/MP4, HEAD/206 Range và phát video thật trên mobile 390 px qua. Lịch sử đúng USER/ASSISTANT/USER/ASSISTANT; xóa khiến file trả 404, sổ tiền vẫn SETTLED. Không page error hay HTTP lỗi ngoài các ca chủ động kiểm tra. Thu hồi session, khóa hai danh tính và dọn file fixture; giữ audit/chi phí.

## Triển khai và giới hạn bằng chứng

- Script BE riêng backup M4 bằng pg_dump và xác minh pg_restore list, backup volume thử đồ, thử migration thứ tự trên bản sao ID/session/timestamp của **186 message cũ**; giữ nguyên thứ tự cũ. Áp migration 010–012; chỉ thay M4 và worker thử đồ, giữ exact runtime environment ngoài hai biến bật media.
- Phát hiện M4 trước đó chưa mount ảnh thử đồ còn worker đã mount; cả hai thư mục đang trống. Đã gắn M4 vào đúng volume worker, thêm volume riêng chat AI và xác minh UID, model, budget. Không đổi key hay tăng hạn mức. Đợt rollout tạm khóa nhận yêu cầu trả phí, đợi tác vụ đã gửi xong rồi khôi phục bằng CAS để không ghi đè lệnh tạm dừng khác.
- Hai lỗi trong quá trình chạy script kiểm chứng đã được sửa trước rollout: test HTTP cũ cần env giả khi mock ResolveContext; bản sao thử migration thiếu cột session_id để tạo index. Hai lượt dừng trước thay runtime; lần sau kết thúc **AI_MEDIA_DEPLOY_OK**. Một lỗi quoting ở harness public dừng trước tạo fixture/gọi provider; kết quả lỗi giữ riêng, không tính vào lượt cuối.
- FE triển khai bằng script bắt buộc, public smoke **DEPLOY_OK** lúc khoảng 19:24 +07. BE kết thúc khoảng 19:22 +07; nghiệm thu public xong 19:26 +07.
- Evidence local không đưa Git: `C:/PBL6/outputs/bug-ai-media-phase4-2026-11-15/`, gồm `deployment-verified.log`, `web-deployment.log`, `local-ui-final/`, `public/results.json`, ảnh desktop/mobile và synthetic media. Chỉ hai lượt gọi phân tích thật nêu trên; không gọi gen ảnh để kiểm thử phần này.

Đợt 5 CMS gian hàng và đợt 6 đối chiếu toàn bộ B01–B33 tiếp tục riêng. Không dùng kết quả ảnh/video tổng hợp để khẳng định độ chính xác tư vấn mọi ảnh thời trang hoặc mọi chuyển động video.
