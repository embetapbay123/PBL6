# F01 — phiên, hai tab và quyền hiện hành

Ngày 01/11/2026, stack riêng `pbl6-fe-verify`, frontend3109/gateway18080. Backend manifest23 khớp263file; bảy service/worker dùng cùng image `e662535d387e4c3c53211879a290eeced1b4e2a2cf525cdb9a0c08d7defd4988`. Không có migration mới. Baseline review cũ và tất cả lần chạy lỗi được giữ nguyên.

## Kết quả và nguyên nhân

**CR-016: FIXED / VERIFIED trên manifest23.** Token, context, cache và request cùng vòng đời phiên; không phát lại mutation của A bằng tài khoản B. Phát hiện thêm ba biểu hiện trong quá trình nghiệm thu và sửa trong cùng gói F01:

1. Hai tab refresh đồng thời dùng cùng cookie cũ: request đầu200, request sau401; cơ chế chống dùng lại token thu hồi cả family. Bằng chứng trước sửa `auth-cookie-stale-race-baseline.json`, checkpoint database còn0session hoạt động. Client hiện khóa chung các thao tác cookie login/refresh/logout bằng Web Locks; hai tab thật trả200/200, tối đa1refresh đang chạy, family còn1session hoạt động. Không nới cơ chế chống reuse của backend.
2. Đăng xuất từ A đến khi cookie trình duyệt đã thuộc B: server trước đây thu hồi theo cookie đang có. Client hiện gửi credential ký của chính phiên cần thu hồi; server kiểm chữ ký, issuer, audience, sub/sid rồi chỉ thu hồi family đó. Nếu cookie thuộc family khác, server giữ cookie và trả `cookie_session_changed`; UI đọc lại phiên hiện hành. Credential hết hạn chỉ được dùng để thu hồi chính family của nó, không được dùng truy cập thông thường. CSRF/Origin và transport MOBILE cũ vẫn được kiểm tra.
3. Nhiều request403 cùng đọc lại quyền: một request công bố context mới, request cũ bị hủy rồi xóa cả phiên mới. Client chỉ invalidate khi request vẫn thuộc thế hệ hiện hành. Quyền bị thu hẹp được đồng bộ sang tab khác; trang bị từ chối có thao tác đọc lại quyền khi Owner/Admin vừa cấp lại hoặc mở khóa Store.

Các thay đổi chính: [client](../../../frontend/src/api/client.ts), [ProtectedRoute](../../../frontend/src/bootstrap/components.tsx), [AuthController](../../../backend/identity-store-service/src/auth/auth.controller.ts), [AuthService](../../../backend/identity-store-service/src/auth/auth.service.ts). Contract bổ sung `LogoutResult` riêng, không thay nghĩa `OperationResult` dùng chung.

## Bằng chứng nghiệm thu

Thư mục: `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Bằng chứng |
| --- | --- | --- |
| Unit logout và refresh reuse |8PASS|`auth-cookie-logout-unit.json`|
| HTTP + PostgreSQL/schema riêng |7PASS|`auth-logout-integration-verified.json`|
| Edge fixture auth/session/purchase |21PASS|`auth-fixture-acceptance23.json`|
| Hai hành trình cookie/principal thật |2PASS|`auth-runtime-acceptance23.json`|
| Toàn hành trình principal ở1440px |1PASS|`auth-runtime-desktop23.json`|
| Toàn hành trình principal ở390px |1PASS|`auth-runtime-mobile23.json`|
| Hồi quy CH06 với UI mất quyền kho |1PASS|`stock-chain-auth23-regression.json`|
| Build frontend, contract check/drift, docs check |PASS|`auth-acceptance23.json`|

Mỗi lượt desktop/mobile bắt đầu bằng đăng nhập UI, tìm sản phẩm, Mua ngay4 trong khi giỏ A có3; tab thứ hai logout A/login B, giỏ và checkout B giữ5. GET thật của A được giữ phản hồi; POST401 về muộn là fault injection rõ ràng. Cả hai kết thúc `SESSION_CHANGED`, không phát lại bằng B. Thao tác trực tiếp từ B lên dòng giỏ và địa chỉ A trả404, dữ liệu A giữ nguyên. Logout A tới với cookie B vẫn giữ phiên B. Hai tab Owner độc lập đọc kho thật; sau khóa Store, API403 và cả hai gỡ thông tin riêng; mở lại rồi Thử lại phục hồi quyền, tồn vẫn10/giữ0. SQL xác nhận family WEB A cũ không còn session hoạt động. Sản phẩm fixture được STOPPED sau mỗi lượt.

Token hết hạn được tạo có kiểm soát cho đúng session fixture đang hoạt động: AuthGuard thật trả401, refresh cookie thật, POST lặp giữ đúng body/key và chỉ tăng giỏ2→3 một lần. Đây không phải chờ15phút ngoài đời. Không lưu token, mật khẩu hoặc nội dung email trong artifact.

CH06 được chạy lại với cùng đối tượng xuyên chuỗi trên23: nhập, giữ online, consume COD, điều chỉnh bù, hủy/nhả/hoàn tồn, bàn giao/thu120000/hoàn tất; đối chiếu ledger và thu hồi quyền nhân viên đều qua. Đổi assertion từ lỗi server cũ sang thông báo quyền hiện hành của UI, vẫn bắt buộc HTTP403 và gỡ dữ liệu kho.

## Giới hạn và việc còn lại

- Web Locks là điều kiện đồng bộ cookie hiện tại. Edge localhost đã kiểm; trình duyệt thiếu API này nhận lỗi rõ và không tự chạy cookie mutation thiếu khóa. Chưa xác nhận mọi trình duyệt/HTTP origin khác, chưa kiểm thiết bị thật, bàn phím ảo hoặc screen reader.
- Khóa quyền từ Admin được phát hiện khi API đọc lại/từ chối hoặc khi tab lấy lại focus; đây không phải push trực tiếp từ server tới mọi tab đang nằm yên.
- Một lượt tổng hợp gặp429đăng ký fixture do giới hạn10/h. Giữ báo cáo lỗi, chờ cửa sổ giờ kế tiếp rồi chạy lại; không tắt limiter hoặc xóa counter.
- Các lỗi locator/harness và báo cáo trước sửa vẫn được giữ. Không cộng số assertion, ảnh hoặc lần chạy viewport vào số nhiệm vụ review.
- Công cụ docs được cập nhật cho152endpoint và link source có hậu tố `:line`; đồng bộ index từ contract hiện hành. Không đổi nội dung review cũ hoặc tự nâng trạng thái handler ngoài metadata contract.
- Tổng hiện tại: **5finding VERIFIED,47finding chưa nghiệm thu đầy đủ**. CH01–CH05 còn bằng chứng21; CH06 đã có hồi quy23. F18 còn yêu cầu sáu chuỗi trên cùng baseline cuối và đối chiếu toàn bộ finding. Chưa kết luận ứng dụng sẵn sàng vận hành.
