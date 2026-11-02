# Đợt 47 — chặn form cũ ghi sang Store mới

## CF-047-01 — P1, lỗi đã chứng minh

Nhân viên mở form tạo sản phẩm tại Store A. Owner khóa membership A; cùng tài khoản đó nhận lời mời vào Store B với quyền sản phẩm tương đương. Form A còn mở. Trước sửa, nhấn tạo trả HTTP201 và tạo sản phẩm tại B dù người dùng chưa mở lại công việc tại B.

- Baseline thực thi: Node46b/AI46/frontend46-readable, HEAD và manifest cũ giữ nguyên.
- Bằng chứng lỗi: `store-context-baseline46-run2.json` và `store-context-baseline46-run2/**/store-context-checkpoints.json`: A không có sản phẩm, B có đúng draft mang tên A; không có pageerror. Draft sai đã được dừng, lịch sử được giữ.
- Lượt `store-context-baseline46.json` dừng vì locator select của harness; không dùng lượt đó để kết luận bug.
- Expected: lệnh cũ bị từ chối trước khi ghi; người dùng thấy phạm vi đã đổi và mở công việc mới sau khi kiểm tra Store hiện tại.
- Nguyên nhân: API dùng membership hiện hành, trong khi request không mang phạm vi của form. Khi hai Store có cùng quyền, quyền hợp lệ tại B không chứng minh người dùng muốn thực hiện lệnh tại B. Chỉ xóa cache sau response không ngăn được lần ghi sai này.
- Tác động: ghi nhầm Store. Ca đã chứng minh là tạo sản phẩm; không suy diễn thành một khoản thu/hoàn hoặc điều chỉnh kho đã xảy ra.

## Thay đổi

`backend/shared/src/auth.ts` đọc quyền hiện hành trước, rồi so sánh header tùy chọn `X-Store-Context` với membership ACTIVE trên các endpoint `/store` và `/store/...`. Không khớp trả409 `STORE_CONTEXT_CHANGED` trước handler; malformed/duplicate trả400. Header chỉ là điều kiện kiểm tra, không chọn Store hoặc cấp thêm quyền. Các namespace public `/stores`, Customer và Admin không bị ràng buộc bởi header này. Request cũ không có header giữ contract dùng Store hiện hành.

`frontend/src/api/client.ts` tự đính Store của snapshot phiên vào request own-Store. Caller không thể ghi đè sang Store khác. Khi nhận409, client đọc lại context, không phát lại mutation; refresh401 cũng chỉ retry khi toàn bộ phạm vi phiên không đổi, giữ nguyên body và key. Context thay đổi làm hủy request cũ và remount cache/form theo cơ chế scope sẵn có.

`store-context-notice.ts` và `StoreContextNotice.tsx` hiển thị thông báo theo đúng user, không ghi token hoặc Store vào kênh liên tab. Trang Seller quay về tổng quan của Store hiện tại hoặc hồ sơ nếu không còn membership. Bỏ query mở form cũ, tránh remount thành một dialog trống ở Store mới mà che mất thông báo. Chuyển hướng chỉ thực hiện một lần; người dùng có thể chủ động mở công việc mới. Đăng xuất/đổi tài khoản xóa thông báo cũ.

OpenAPI và các bản sinh được cập nhật cho50 operation own-Store bằng header tùy chọn. Không thêm migration hoặc sửa dữ liệu nghiệp vụ cũ. Triển khai reader AI47 trước các API/worker Node47 trên stack riêng; simulator tiền giữ Node37.

## Nghiệm thu và hậu điều kiện

Baseline sửa: `Node47/AI47/frontend47`, vẫn working tree trên HEAD cũ, chưa commit/deploy production.

| Kiểm tra | Bằng chứng |
| --- | --- |
|374 unit/51 suite, gồm5 ca guard mới: mismatch/matching/inactive/malformed/legacy và namespace khác|`backend-unit-store-context47.json`|
|Phiên, two-tab, Store assertion,403/409,401 cùng/khác Store, lỗi đọc context, không override header và không replay|`store-context-ui47-trial.json`, `store-context-regression47.json`|
|UI1440: mở form A → chuyển nhân viên sang B → submit409 → bỏ form cũ → mở form B trống → tạo đúng B|`store-context-runtime47-desktop-trial.json`|
|UI390: cùng hành trình trên tập dữ liệu độc lập|`store-context-runtime47-mobile.json`|
|SQL M1/M2/M3 và audit:0 lần ghi cũ,2 lần tạo B chủ động;0đơn/0tiền; tồn/reserved khớp ledger|`store-context-final-state47.json`|
|389file backend/43AI/280frontend-contract-test-config và10container khớp|`deployed-source-manifest-47.json`, `ai-source-manifest47.json`, `frontend-source-store-context47.json`, `runtime-image-store-context47.json`|
|Thu hồi hiển thị mọi fixture của baseline và lượt sửa; không viết lại audit|`store-context-visibility47.json`|

Hai lượt runtime dùng cùng nhân viên và cùng hai Store xuyên suốt từng lượt. Request đầu mang A chỉ được gửi một lần và nhận409. Request tiếp theo chỉ xuất hiện sau khi người dùng mở form mới ở B, mang B, tạo một draft tại B. API không tìm thấy draft A ở cả hai Store. SQL xác nhận membership A LOCKED/B ACTIVE; mỗi nhân viên chỉ có một audit catalog cho draft mới ở B. Sáu sản phẩm của hai lượt cuối đã STOPPED, tổng tồn thương mại40, reserved0, không thay đổi tiền hoặc đơn.

Ảnh `store-changed.png` trong mỗi thư mục runtime được chụp sau khi bỏ form cũ. Đã xem ảnh390: thông báo, nút xác nhận, đường xem Store hiện tại và tên Store mới đọc được, không bị dialog cũ che.

## Giới hạn và tiếp tục

- Đây là finding bổ sung, không cộng vào52finding gốc. Tổng gốc vẫn30VERIFIED/22chưa đóng; không đổi những bằng chứng hoặc kết quả cũ thành PASS trên47.
- Bằng chứng UI dùng Edge và viewport; không có thiết bị vật lý, bàn phím ảo, native zoom, screen reader hoặc nghiên cứu người dùng. Giữ `USER_VALIDATION_PENDING`.
- Compatibility có chủ ý: client cũ không gửi header vẫn dùng active Store hiện hành. Chúng không có bảo vệ intent mới; không dùng rollback về frontend cũ làm bằng chứng ca này vẫn an toàn. Reader47 nhận cả request cũ/mới; header không thay ownership/permission checks.
- M3 recreate làm mất capture email cũ trong filesystem container; không tuyên bố đọc lại token lịch sử. Các artifact và secret scan cũ được giữ nguyên.
- F12 dùng thêm kết quả này để hoàn tất ca scope còn thiếu; UX-12 onboarding là finding riêng vẫn mở. Sáu chuỗi cuối trên baseline chung, rollback snapshot writer và22finding gốc chưa nghiệm thu vẫn thuộc phạm vi đang làm.

Gate tổng hợp chỉ ghi kết quả đã chạy trong `store-context-acceptance47.json`; không dùng fixture thay SQL/runtime hoặc báo sẵn sàng vận hành toàn bộ.
