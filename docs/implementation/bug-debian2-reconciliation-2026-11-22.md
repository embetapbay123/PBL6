# Đối chiếu và chuyển các đợt bug.docx sang Debian2

Cập nhật 22/11/2026. Bản nền máy mới có WIP wallet và ghi bên hủy đơn của người dùng; giữ nguyên các phần đó khi chuyển plan. Không coi bằng chứng trên máy cũ là nghiệm thu máy mới.

## B28 — CMS gian hàng

Đã triển khai và nghiệm thu, commit `349dae0`. [Báo cáo chi tiết](bug-docx-storefront-2026-11-21.md). Hai shop demo có nội dung riêng, voucher và catalog thật; không sinh thêm dữ liệu TEST đang hoạt động.

## UI đợt 1 và voucher đợt 2

- Release riêng: `C:/PBL6/artifacts/debian2-vouchers-release-20261122-reviewed`. Lấy đúng nền CMS vừa triển khai, ghép thay đổi UI/voucher theo base `6c364af`, phạm vi đợt `4efa0a7`, source plan đã chốt `349dae0`. Không commit WIP của nền này vào nhánh bug-plan. Không ghi đè workspace chính.
- Hai xung đột chỉ ở OpenAPI/endpoint-status. Ghép ba bên theo object/operation ID, giữ nội dung của cả hai phía khi không xung đột giá trị; trường hợp chưa giải quyết phải dừng. Sinh lại 227 public + 18 internal DTO/types/fixtures, giữ contract CMS.
- Build FE/BE qua; 59 suite/448 unit test qua; 39 PostgreSQL/FFmpeg gồm 28 voucher + 11 CMS qua; 31 UI gồm giỏ, đợt 1, voucher và CMS qua ở production preview. Các kiểm thử chạy trên chính bản ghép, có migration wallet/hủy đơn hiện hành.
- Lượt đóng gói test đầu lấy nhầm dist của worktree gọi script; đã sửa lấy file trong ReleaseRoot và chuẩn hóa dấu `/`. Lượt tiếp theo hai suite voucher thiếu SQL theo đường tương đối của dist; đã bổ sung bản SQL trong thư mục test riêng. Lượt cuối cả 39 ca qua; không sửa schema/dữ liệu demo để làm kiểm thử qua.
- Preflight đối chiếu source M2 và environment của `m2`, `worker-m2`, `worker-refund` qua. Backup M2 được kiểm bằng `pg_restore --list`. Triển khai chỉ ba service đó, không migration, không thay env/mounts hay M4. Kết thúc `VOUCHERS_DEPLOY_OK`. Web từ bản ghép build thành công trước script bắt buộc, kết thúc `DEPLOY_OK`.
- `voucher-public/results.json`: API thật chứng minh phương án tối ưu trên toàn bộ ứng viên, xác định đúng scope của mã ngoài trang đầu và chặn đọc giỏ người khác. UI 390 px đổi tự chọn/thủ công, áp dụng và checkout; không tạo quote dư sau picker. Đơn COD thật có tiền hàng 200.000 đ, giảm 25.000 đ, phí giao 15.000 đ, phải trả 190.000 đ; số tiền đơn khớp quote. Không gọi provider thanh toán.
- Ba nhóm cleanup đều qua: hủy đơn fixture và giải phóng tồn, thu hồi catalog/voucher/danh tính riêng, schema test đã dọn. Không page error hay HTTP lỗi trong lượt public. Không chạm giỏ/đơn của tài khoản demo dùng chung. Đây là nghiệm thu voucher/COD; không phải nghiệm thu lại toàn bộ ví/thanh toán của WIP nền.
- Quét 72 text file gồm bundle và source overlay, đối chiếu 22 secret local trong bộ nhớ: không match. Còn scan staged riêng trước commit các công cụ chuyển máy.

## Chat đợt 3–4

Đã chuyển và nghiệm thu lại chat trên Debian2. Release `C:/PBL6/artifacts/debian2-chat-release-20261122` giữ nguyên nền wallet/nhãn hủy đơn, voucher/UI/CMS.

- Node build qua; 455 unit, 29 PostgreSQL/FFmpeg và 44 UI chat/CMS/voucher qua. M3 rollout chỉ `m3`/`worker-m3`, migration 015 và volume riêng cho chat; `CHAT_DEPLOY_OK`. Không thay JWT bind mounts hoặc worker M3 env ngoài phạm vi đã duyệt.
- M4 private PostgreSQL tmpfs: 259 passed, 3 skipped do không có Redis/broker trong mạng test riêng. Candidate image chạy thêm sáu native decoder test; 253 passed/3 skipped khi loại sáu ca trùng. Không dùng prod DB/Redis/provider key khi chạy bộ này. Hai lượt test prod DB schema trước đó quá chậm fsync đã dừng có kiểm soát và dọn schema.
- M4 rollout chỉ `m4`/`worker-try-on`, migrations 010–012, private volume AI chat; backup DB và volume thử đồ, kiểm thứ tự 141 tin mẫu trên schema riêng, drain job rồi khôi phục guard. `AI_MEDIA_DEPLOY_OK`. Giữ model/key gen ảnh, volume ảnh thử đồ đang dùng, 1 USD/ngày và 10 USD/tháng. Các service khác và normalized compose settings được đối chiếu không đổi.
- Public search: 25 hội thoại + 25 phiên AI của fixture riêng, lọc trước phân trang, tiếng Việt có/không dấu, ký tự %, _, reload và xóa theo sở hữu. Không gọi model để tìm kiếm; cả ba cleanup qua.
- Public Store media: ảnh WebP/video thật, gửi không caption, idempotency, quyền Customer/Store/người khác, GET/HEAD/Range 206/416, chặn loại giả, playback thực ở 390 px, shop khóa chặn gửi mới nhưng giữ lịch sử đã thuộc quyền. Ba nhóm chính và ba cleanup qua, không provider call/page error/HTTP bất thường.
- Public AI: OpenAI đọc đúng ảnh đỏ; lượt tiếp video metadata 503 trước khi admit video. Thu hồi fixture lần đó và chạy riêng phần video còn thiếu, không gọi lại ảnh. Video hai giây có tám frame được nhận đúng xanh dương → đỏ, không audio; replay cùng client ID không phát sinh call. Lịch sử/phát video mobile, quyền riêng, xóa tệp và giữ ledger qua. Hai debit bảo thủ 366 + 472 micro-USD, tổng 0,000838 USD, đã SETTLED. Không gọi gen ảnh.
- Tailscale Windows từng NoState làm SSH dừng trước setup, website vẫn hoạt động. Chỉ tiếp tục sau người dùng bật lại; không nới rate limit hoặc ghi một lượt lỗi mạng thành pass.

## Hồi quy cuối và các lỗi bổ sung

- `375c1fa`: ẩn menu CMS với staff không có quyền Owner; campaign percent cap 0 vẫn hiện, fixed coupon không hiện cap không áp dụng. Hai ca tiền trước sửa fail, sau sửa 12 CMS UI qua.
- `41c421f`: khách chưa đăng nhập không gọi `/me/vouchers`; query cache theo user, Customer vẫn nhận voucher. Năm sort/guest/Customer UI qua. Public lần sau không còn hai 401 thừa quan sát ở lượt đầu.
- `56dda4d`: B33 vẫn lệch link/nút về viền 2 px khi đo kỹ. Dùng quy tắc CSS chung ở trang lịch sử đơn, giữ style active của tab. 12 UI qua sau sửa; bộ tám kiểm tra biên đều qua. FE build thành công trên nhánh và release, web script bắt buộc kết thúc `DEPLOY_OK`.
- 42 ca UI hồi quy qua trong một lượt. Fixture sort được cập nhật response storefront tắt đúng contract, auth fixture trả GET profile/list hợp lệ; không sửa app để chấp nhận payload fixture sai. Không gọi bộ 42 ca này là toàn bộ E2E của dự án.
- Public `final-public-recheck`: sort trên 25 sản phẩm qua hai trang/reload/mobile; đổi tồn bằng API Owner làm quote hai món bị chặn 409 và không tạo đơn; hai khách cùng mua một món còn lại chỉ một COD được tạo 265.000 đ, khách kia 409. Worker chuyển PENDING rồi tồn quantity/reserved đều 0; cleanup hủy đơn và giải phóng tồn. Cả hai cleanup qua, không page/HTTP lỗi hay provider thanh toán.
- B33 lên web kết thúc `DEPLOY_OK`; `final-public-tabs` qua bốn nhóm, có đo tab ở 320/390/1366 px trên đơn COD thật và bấm đến trang đổi trả. Không intercept, page error hay HTTP lỗi. Cleanup đối chiếu tồn về quantity 1/reserved 0, một đơn CANCELLED, không còn sản phẩm fixture ACTIVE và session còn hiệu lực. [Bảng đủ 33 nhóm và mức bằng chứng](bug-docx-final-acceptance-2026-11-22.md).


Evidence local: `C:/PBL6/outputs/bug-debian2-reconciliation-2026-11-22/`. Không đưa DB dump, credential, token hay tệp media riêng vào Git. Bảng B01–B33 phân biệt kiểm thử UI fixture, public thật và các giới hạn còn lại.

## Kiểm tra source và key trước push

- Chuẩn bị lại release từ baseline voucher bằng helper đã ghép, không còn conflict. Sáu file tại ranh giới app (StorePage, StorefrontSections, CSS tab, LiveApp, main M3/M4) trùng source release đang chạy sau chuẩn hóa newline; không ghi đè WIP workspace chính. Bản ghép mới vẫn cần generate/build/check trước nếu dùng cho rollout khác.
- Python/PowerShell/Node syntax và ba Bash script qua. Kiểm Bash gửi LF dạng bytes để tránh PowerShell/Python Windows đổi stdin thành CRLF.
- Toàn working tree 2.351 text file chỉ báo fixture khóa SMTP giả đã có từ upstream, đối chiếu trùng byte. Bundle 64 file và tám file thay đổi trong ba commit app không match token hoặc 22 giá trị secret local. Staged tooling/docs được quét riêng; không in/lưu giá trị secret trong báo cáo.
