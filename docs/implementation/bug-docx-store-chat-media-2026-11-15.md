# B10 — Ảnh/video trong chat gian hàng

Ngày 15/11/2026. Phạm vi đợt 4A/4B, nhánh `codex/bug-docx-follow-through`. Phần AI đọc ảnh/frame thuộc đợt 4C, **chưa được bật hoặc nghiệm thu**.

## Hành vi đã triển khai

- Khách và người có quyền chat của Store tải tối đa ba ảnh JPG/PNG/WebP tĩnh, mỗi ảnh 5 MB, hoặc một video MP4 20 MB/30 giây trong mỗi tin; gửi không caption được. Tệp chỉ gửi được khi đã xử lý xong, đúng chủ tải và đúng hội thoại. Tin tham chiếu asset ID; không nhận URL/đường dẫn hay tên tệp làm nguồn lưu trữ.
- FE có preview, tiến độ, trạng thái xử lý, bỏ tệp và tải lại. Gửi chưa rõ kết quả giữ nguyên `client_message_id`, nội dung, đơn và danh sách tệp; khóa chỉnh sửa cho tới khi đọc được xác nhận. Đóng/thu nhỏ chat giữ bản nháp; đổi phiên hủy request và dọn object URL. Ảnh có viewer dùng dialog hỗ trợ Escape/focus; video chỉ tải khi bấm rồi phát bằng điều khiển native, tránh tải nhiều video khi mở lịch sử.
- M3 quản lý metadata, quyền và vòng đời. Tệp chưa gửi chỉ chủ tải đọc được, hết hạn sau 24 giờ. Tệp đã gửi theo vòng đời tin nhắn; không âm thầm hết hạn sau 24 giờ. Khách/gian hàng của hội thoại đọc được sau gửi, người khác không đọc được. Khóa gian hàng chặn ghi mới; khách giữ quyền đọc lịch sử của mình. Header Store được đối chiếu với membership hiện hành.
- Volume riêng `pbl6_demo_chat_media`, directory 0700, key ngẫu nhiên và kiểm tra đường dẫn/regular file; không công khai dưới frontend. Nội dung được xác thực ở mỗi lượt tải, `private, no-store`, `nosniff`; hỗ trợ GET/HEAD và một byte range hợp lệ, trả 206/416 đúng.
- Kiểm tra magic, dung lượng, số pixel/khung hình/thời lượng trước khi chuẩn hóa. Ảnh thành WebP tối đa 1600 px; video H.264/AAC tối đa 1280 px/24 fps, preview riêng. Worker chỉ dùng đường dẫn nội bộ, decoder/demuxer cố định, không cho mạng hay MOV external data references; giới hạn thời gian, bộ nhớ ảo, CPU, số descriptor và số thread của tiến trình native. Không gọi model để xử lý tệp chat gian hàng.
- Admission khóa transaction chung: tối đa ba upload đang chờ/người, mỗi 24 giờ 50 MB/người, 100 MB/IP (IPv6 theo /64), 500 MB toàn hệ thống; lưu hiện hành 100 MB/người, 1 GB toàn hệ thống. Mỗi admission giữ trước 5 MB/ảnh hoặc 20 MB/video; hủy/lỗi không hoàn lại quota ngày. IP được HMAC, không lưu IP thô. Giới hạn IP/request hiện có không bị nới.
- Lease/CAS ngăn xử lý đến muộn làm tệp đã hủy sống lại. Kết quả READY mất ACK vẫn giữ file đã commit. Dọn draft hết hạn và file mồ côi vẫn chạy khi tính năng bị tắt hoặc đĩa thiếu chỗ. Tệp đính kèm trong lịch sử được đọc một lần theo batch, không query riêng từng tin.

## Bằng chứng

- OpenAPI/runtime drift, build FE/BE qua. Thêm 12 operation M3; tổng 210 public + 15 internal. Toàn bộ 61 bộ unit BE: 455 ca qua.
- Bảy ca codec thật trong container riêng qua: ảnh PNG/JPEG/WebP, MP4+preview, APNG/video dài/tệp giả bị chặn, JPEG xoay đúng pixel và loại EXIF, metadata tiêu đề video bị loại. PostgreSQL schema riêng: chín ca về raw upload, quyền, quota đồng thời, bind/replay, hết hạn, khóa Store, mất ACK, hủy khi xử lý, orphan và HTTP thật có JWT/roles/HEAD/Range qua. Kiểm thử HTTP giả endpoint xác minh context, không dùng thông tin xác thực public để thay cho kiểm tra sở hữu trong service.
- UI production preview: 25 ca chat/media/tìm kiếm/đơn qua; sau bổ sung video trì hoãn tải, bảy ca media qua. Có ảnh 390/1366 px, viewer/focus, retry cùng mã, hủy upload muộn, không nhúng URL ngoài. Unit/fixture UI không thay cho nghiệm thu demo thật.
- Public không intercept API: normalize ảnh thành WebP, gửi ảnh/video không caption, Store trả ảnh, đọc chéo trả 404, draft của khách Store chưa đọc được, sau gửi đọc được; Range 206, HEAD 200 và range sai 416. Tệp SVG giả ảnh bị REJECTED. UI upload thật, viewer/Escape và video 2 giây đã phát trên viewport mobile. Khóa Store chặn gửi mới, capability tắt và lịch sử của khách vẫn đọc được. Không page error, không HTTP lỗi ngoài các ca chủ động, không request model.
- Evidence public: `C:/PBL6/outputs/bug-chat-media-phase4-store-2026-11-15-final/results.json`, `desktop-upload.png`, `mobile-playback.png`; có ảnh/video hình học tổng hợp. Tệp fixture, chat rows và schema riêng đã dọn; danh tính/Store fixture đã khóa và session thu hồi. Lượt harness đầu lỗi escape SQL khi tạo fixture, chưa đến bước nghiệp vụ; cleanup qua, lưu riêng ở thư mục không có hậu tố `-final`.

## Triển khai

- Script riêng `deploy-demo-chat-media.ps1/.sh`: so baseline mã đang chạy, pg_dump và pg_restore --list trước migration 015, kiểm tra candidate trước thay M3, tạo volume riêng đúng UID/GID, giữ nguyên credentials/runtime cũ và chỉ thêm hai biến media. Có rollback image/runtime, giữ schema thêm mới và dữ liệu riêng.
- Hai lần preflight dừng vì validator legacy và YAML volume dùng dạng nhiều dòng; đã đối chiếu rồi thêm đúng SHA legacy và hỗ trợ đúng dạng YAML hiện hành. Không bỏ kiểm tra baseline. Một lần đã áp migration thêm bảng nhưng dừng trước thay service vì volume syntax; lần sau kiểm tra migration idempotent.
- Cuối cùng **CHAT_MEDIA_DEPLOY_OK**, M3 sẵn sàng và public chặn thiếu đăng nhập. FE build thành công, script bắt buộc kết thúc **DEPLOY_OK** lúc khoảng 03:12 ngày 15/11/2026 (+07). Không triển khai M1/M2/M4, không thay ngân sách thử đồ 1 USD/ngày và 10 USD/tháng.
- Ca EXIF bổ sung sau rollout gặp lỗi Docker builder `layer does not exist` hai lần trước khi chạy test; không đụng dịch vụ đang chạy hay xóa cache dùng chung. Helper kiểm thử chuyển sang chạy container tách biệt từ image hiện hành đã có codec, chỉ mount code/test đã build ở chế độ đọc. Lượt cuối bảy codec và chín lifecycle qua. Không coi hai lượt lỗi hạ tầng là lỗi ứng dụng hoặc lượt test đã qua.

## Còn lại

Đợt 4C cần asset/lifecycle riêng M4, adapter đọc ảnh/frame thật, cùng sổ giữ tiền với thử đồ và xử lý kết quả chưa rõ để không gọi trả phí hai lần. Nút đính kèm AI chưa bật. CMS gian hàng và nghiệm thu toàn bộ B01–B33 vẫn còn trong plan; không dùng kết quả chat gian hàng để đóng toàn bộ B10.
