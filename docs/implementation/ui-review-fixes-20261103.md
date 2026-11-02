# Sửa UI/UX theo review ngày 02–03/11/2026

Baseline trước lượt này: `0d08bb2`. Review nguồn: “Review UI/UX Toàn Diện — Web TMĐT PBL6”, attachment `95a719e9-4eaf-463f-9e0f-508d98aab885`. Một số thay đổi nhỏ về navigation, copy mã và sao đánh giá đã có trong working tree khi bắt đầu; được giữ và hoàn thiện. Không reset dữ liệu trong lượt sửa này.

## Đối chiếu 20 ưu tiên của bản review

| # | Quyết định / thay đổi | Bằng chứng nghiệm thu |
| --- | --- | --- |
| 1 | Format lại các trang và component được nêu; giữ cấu trúc React/Vite, không thay framework. | Build và test hồi quy; xem diff JSX của OrderHistory/Detail, Favorites, Notifications, Reviews, Store và workspace. |
| 2 | Thêm danh sách mã cho Customer qua `GET /me/vouchers`; phân trang, điều kiện tối thiểu, giới hạn mỗi khách, thời hạn và Store. Chọn mã chỉ điền nháp; Áp dụng/quote/confirm vẫn kiểm tra server. Không dùng endpoint quản trị để đọc cho Customer. | UI picker; unit phạm vi; integration PostgreSQL scope/time/usage. |
| 3 | Copy nội dung thanh toán, thông báo thành công/thất bại và vẫn giữ nội dung để chọn sao chép thủ công. | Hồi quy payment: đúng chuỗi được copy, không tạo payment attempt mới. |
| 4 | `StarRating` và `StarPicker` dùng chung, radio native có tên truy cập; điểm tổng hợp lấy toàn bộ review VISIBLE từ server, không lấy trung bình một trang hoặc dựng số sao. | UI tạo/sửa và filter rating; backend chỉ tổng hợp VISIBLE. |
| 5 | Hộp xác nhận native modal cho xóa địa chỉ, hủy đơn, khóa nhân viên, thu hồi lời mời. Bỏ yêu thích cũng có quyết định trước khi xóa. | Chưa xác nhận/Escape không gửi mutation; focus trở lại; hủy kiểm version, hoàn tiền riêng. |
| 6 | Giữ account sidebar desktop; thêm CustomerSubNav cho trang còn thiếu để dùng trên layout nhỏ. Không bật đồng thời hai navigation trùng nhau trên desktop. | Điều hướng Notifications/Reviews/Returns/Favorites; screenshot responsive. |
| 7 | Checkout tách phương thức thanh toán khỏi danh sách món, giữ lựa chọn riêng theo Store. | DOM vùng sản phẩm không còn select thanh toán; body theo Store giữ nguyên. |
| 8 | Điều hướng bốn phần bằng anchor: địa chỉ, món, thanh toán, mã/tổng tiền. Đây là một trang rà soát; không dựng trạng thái “bước đã hoàn tất” giả. | UI và deep anchors, focus theo routing hiện có. |
| 9 | Kết quả đặt có xác nhận rõ, giải thích một đơn mỗi Store và đường theo dõi/thanh toán. Ghi nhận đơn COD không đồng nghĩa đã thu tiền. | Ca kết quả COD; không hiển thị thành công thanh toán từ kết quả tạo đơn. |
| 10 | Metadata giỏ/yêu thích đọc theo lô tối đa 100 ID, giữ public visibility và tuần tự theo lô; CartProduct nhận dữ liệu dùng chung. DOM giỏ chia 25 dòng/trang, chọn và tổng giữ xuyên trang. | Giỏ 26 dòng: một batch request, zero getProduct từng dòng, 25/1 dòng và lựa chọn 26 giữ nguyên. |
| 11 | Đổi copy “Đọc lại giá và tồn” thành “Cập nhật giá và tình trạng hàng”; giữ khả năng đọc lại khi hết hàng hoặc có xung đột. Thêm giải thích tại khu mua bị khóa. | Hồi quy chọn variant/tồn; không bỏ đường recovery chỉ để làm UI gọn. |
| 12 | Gợi ý tỉnh/phường bằng dữ liệu cục bộ sau 07/2025 ở Address và StoreSettings; radio card địa chỉ ở checkout. Giữ nhập tay và địa chỉ lịch sử, không gửi tên/điện thoại/địa chỉ sang provider. | 34 tỉnh, 3321 phường/xã; đổi tỉnh không tự xóa/sửa phường hay người nhận. **Một phần:** schema giao nhận vẫn bắt buộc trường quận/huyện; chưa tự di trú sang địa chỉ hai cấp. |
| 13 | `POST /me/notifications/read-all`: một lệnh chỉ ghi receipt các sự kiện thuộc Customer hiện tại; idempotent. Sự kiện đến sau vẫn chưa đọc. Có icon loại, mã đơn rút gọn và nhãn tự cập nhật. | PostgreSQL hai Customer + sự kiện muộn; UI một request bulk. |
| 14 | Mã ngắn trên chi tiết/Payment, bỏ version kỹ thuật; request/link tiếp tục dùng UUID đầy đủ. Tổng tiền có bố cục riêng. | Hồi quy ownership, version khi hủy và địa chỉ/policy snapshot. |
| 15 | Form voucher chuyển drawer; có minh họa tiền hàng và giảm riêng mã này, ghi rõ chưa tính điều kiện checkout. Lượt dùng/giữ/còn lại lấy aggregate DB cho trang quản lý; không suy từ quota. Bỏ nháp cần quyết định. | Recovery voucher và integration: voucher sàn nhiều đơn cùng group chỉ tính một lượt. |
| 16 | Khóa/thu hồi có xác nhận; sửa quyền là nháp trong modal, chỉ PATCH khi Lưu quyền. Lỗi/version conflict nằm trong modal và yêu cầu quay lại đọc mới. | Tick không ghi; Lưu giữ expected_version; hủy khóa/thu hồi không ghi. |
| 17 | Kho tách các vùng theo URL: tồn, biến động, đối chiếu kỳ, hàng đang giữ/đã trừ. Giữ filter, hash cũ và link trở về bút toán nguồn. | Ca liên kết sâu variant + stock-history, chuyển vùng không mất variant. |
| 18 | Lọc số sao và sort mới nhất/điểm cao/thấp trên server; count/page cùng predicate VISIBLE, sort whitelist. | UI kiểm query; unit/integration hiện có giữ ownership/recovery. |
| 19 | Đã sửa ở baseline trước: landing một H1, catalog H2, không breadcrumb thừa. Giữ nguyên và format source để dễ đọc. | Xem MarketplaceHome và nghiệm thu catalog của baseline. |
| 20 | QR co theo chiều rộng, tối đa 320px; ghi rõ hạn QR và màu cảnh báo dưới hai phút. Không suy tên ngân hàng/tài khoản khi provider không trả dữ liệu. | Hồi quy payment: expired/UNKNOWN/provider disabled/zero payable. |

## Các góp ý khác và giới hạn giữ rõ

- PDP có breadcrumb, sản phẩm cùng Store dùng React Query với error/retry; gallery có điều hướng bàn phím và xử lý vuốt ngang. Chưa xác nhận cảm giác vuốt/zoom bằng thiết bị vật lý.
- Profile bỏ hậu tố tiếng Anh, thêm đường đổi mật khẩu, giải thích email chỉ đọc và giới hạn nhập phone 20 ký tự. Không tự bổ sung avatar khi chưa có lưu trữ/quy tắc upload.
- Owner overview lấy số lượng thật trong đúng quyền: sản phẩm, số phân loại kho, số đơn. Không biến số phân loại thành tổng số hàng và không dựng doanh thu từ một trang đơn.
- Audit đổi action text thành dropdown có nhãn; vẫn giữ giá trị action cũ trong URL nếu chưa có trong từ điển. Table/card đã được CSS chuyển theo viewport ở baseline; nhận xét “hiển thị cả hai đồng thời” không đúng với UI render hiện hành.
- Nhãn quyền ở invitations đã được ánh xạ sẵn trong baseline. Không đếm lại như lỗi mới.
- Returns giải thích cách mở yêu cầu từ đơn hoàn tất và việc tự cập nhật; giữ polling giới hạn và nút đọc thủ công.
- Mặc định “Phổ biến”, điểm trung bình Store, ảnh lịch sử đơn khi thiếu snapshot, số bán, gợi ý theo khách: không thay bằng dữ liệu giả hoặc suy từ tập phân trang. Cần contract/định nghĩa riêng trước khi bổ sung.
- Giỏ vẫn cần đọc hết các trang **ID/số lượng** trước khi tổng hợp lựa chọn toàn giỏ. Đã xử lý N+1 metadata và giới hạn DOM; chưa thay contract thành selection server-side/cursor. Giới hạn vòng lặp 200 là guard chống tải thiếu, không phải bằng chứng giỏ thường có 20.000 mục.
- Đổi variant ngay trong giỏ cần command đổi/gộp nguyên tử. Giữ đường sang trang sản phẩm để chọn lại; không ghép “add rồi delete” có thể mất/nhân hàng khi timeout.
- Không áp yêu cầu bulk action, chia đơn, hoàn một phần hay sửa lượng sau đặt từ review UI này. Luồng hủy–đặt lại và phạm vi đã chốt được giữ.
- Form dài không mặc định là bug: giữ các field cần cho quyết định; drawer, nhóm field, preview và recovery được ưu tiên. Không thêm animation vào trạng thái trống chỉ để đạt ý kiến thẩm mỹ.

## Nguồn dữ liệu địa chỉ

Snapshot chỉ gợi ý từ [Province Open API v2](https://provinces.open-api.vn/) (`/api/v2/?depth=2`, lấy 2026-11-02). Nguồn phân biệt v1 trước và v2 sau 07/2025. Không coi đây là xác minh địa chỉ giao nhận bởi cơ quan nhà nước. Nguồn/ngày nằm trong JSON; trường tự nhập giữ khả năng dùng dữ liệu lịch sử và sửa sai.

## Kiểm chứng

- OpenAPI/runtime DTO/type/fixture drift và endpoint index: 162 public + 14 internal operations; không có migration mới.
- Build frontend/backend, unit catalog/voucher/notification/review; kết quả máy tại `artifacts/ui-review-fixes/`.
- Browser là Edge, fixture HTTP kiểm hành vi và payload. Các kiểm tra PostgreSQL dùng schema `ui_review_<uuid>` riêng trong DB test và dọn đúng schema đó; không reset DB/ghi đơn demo để làm test qua.
- Giữ các lượt thất bại ban đầu: sandbox chặn localhost/cache; fixture sai route và đồng hồ; locator cũ không còn đúng khi form thành modal hoặc có nhiều vùng lỗi. Chỉ sửa fixture/locator khi hành vi mong đợi vẫn được kiểm; không đổi kỳ vọng để chấp nhận mutation lặp.
- Không coi fixture là bằng chứng provider tiền thật. Không tuyên bố thiết bị thật, bàn phím ảo, screen reader hay nghiên cứu người thật đã được thực hiện.

### Kết quả lượt chạy trước commit

| Nhóm | Kết quả | Hồ sơ |
| --- | --- | --- |
| Browser payment/order/notification | 24 PASS | `artifacts/ui-review-fixes/regression-connected/.last-run.json` |
| Recovery review/staff/voucher | 29 ca được kiểm; 27 PASS lượt đầu, 2 locator vùng lỗi được sửa và cả 4 review PASS lượt cuối | `recovery-regression/` + `final-browser/` |
| UI mới | 15 PASS, gồm 1440/390px | `final-browser/` (18 PASS gồm 4 review đã tính ở hàng trên; thêm ca empty returns chạy riêng) |
| Unit | 75 ca được kiểm; 73 PASS lượt tổng, 2 mock bổ sung aggregate và cả 37 voucher PASS khi chạy lại | `unit-final.json` + `voucher-final.json` |
| PostgreSQL mới | 2 PASS trên schema riêng; schema được dọn trong afterAll | `integration-verified.json` |
| Build/contracts/docs | PASS; giữ cảnh báo bundle chính trên 500 kB, không suy thành số đo hiệu năng | log build và contract check |

Tổng browser theo tên ca duy nhất: **68**, không cộng lần chạy lại hoặc số screenshot thành ca mới.
