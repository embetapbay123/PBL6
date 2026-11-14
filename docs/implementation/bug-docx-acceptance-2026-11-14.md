# Nghiệm thu bổ sung các lỗi UI UX

Cập nhật sau đợt sửa: **F10 và F11 đã sửa, deploy và qua kiểm tra lại trên demo**; xem [kết quả mới](bug-f10-f11-fixed-2026-11-14.md). Các số liệu và kết luận bên dưới là baseline trước sửa; các tính năng chưa triển khai vẫn chưa được nghiệm thu.

Ngày 14/11/2026, trên `https://demo.congnguyen.me`. **Kết luận: chưa đạt nghiệm thu toàn bộ.** Năm nhóm kiểm tra nghiệp vụ trực tiếp đã qua; còn hai lỗi xác nhận trên bản public và các khả năng chưa được triển khai.

Đây là đợt bổ sung cho [báo cáo sửa lỗi](bug-docx-ui-fixes-2026-11-14.md), tập trung các chỗ trước đó chỉ kiểm tra với API mô phỏng hoặc đọc code. Không dùng số test local làm bằng chứng rằng production đã được nghiệm thu.

## Điều kiện kiểm tra

- Chạy Chromium với bundle demo hiện tại, viewport desktop 1366×900 và giỏ mobile 390×844. Không intercept/thay response API.
- Tạo tài khoản, gian hàng, sản phẩm nghiệm thu riêng có tiền tố `acceptbug-`. Fixture danh tính và catalog được chuẩn bị trực tiếp trong database; các hành vi cần nghiệm thu chạy qua UI/API public và đối chiếu database thực của các container đang hoạt động. Đây không phải nghiệm thu đăng ký tài khoản hay quy trình duyệt gian hàng.
- Tạo lịch sử chat qua API thật với `first_message`; thao tác này lưu dữ liệu nhưng không gọi model. Không gửi câu hỏi sinh trả lời, không gọi gen ảnh trả phí, không thanh toán ngân hàng hoặc tạo vận đơn.
- Chỉ đặt đơn COD của các fixture riêng, sau đó hủy. Không xóa hoặc sửa giỏ/lịch sử/đơn của tài khoản khác.
- Không nới hoặc bỏ qua rate limit, không giả IP. Các bước nghiệp vụ được tách khoảng chờ; điều hướng thông thường được kiểm tra thêm riêng với tài khoản đã đăng nhập và khách.

## Các nhóm đạt

| Nhóm | Thao tác thực | Kết quả |
| --- | --- | --- |
| Xóa lịch sử AI | Tạo 25 phiên có tin nhắn qua API; xóa một phiên qua UI; đăng nhập ở browser context mới; xóa toàn bộ 24 phiên còn lại; reload | API trả 200; DB từ 25 session/25 message xuống 24/24 rồi 0/0; browser mới thấy đúng số. Tài khoản khác xóa phiên trả 404 và giữ nguyên phiên riêng. |
| Xóa nhiều dòng giỏ và CTA mobile | Thêm ba sản phẩm qua API, vào giỏ mobile, hit-test nút Thanh toán, bấm Xóa (3) | Nút trong viewport và nhận click đúng; giỏ API và bảng `cart_item` của tài khoản còn 0 dòng. |
| Tồn kho thay đổi sau khi vào giỏ | Chọn 3 sản phẩm; seller giảm tồn từ 3 xuống 2 qua API điều chỉnh kho; thử PATCH số lượng cũ; reload, giảm số mua về 2 | PATCH trả 409 `INSUFFICIENT_STOCK`; cộng tại max bị khóa; UI hiển thị còn 2 và chặn checkout khi chọn 3; chọn lại dòng và giảm về 2 thì thanh toán được. |
| Voucher và đặt hàng qua UI | Chọn voucher 20.000đ bằng bàn phím, qua checkout, đặt đơn COD bằng nút Đặt hàng | Quote 200 và tạo đơn 201; DB khớp hàng 200.000đ + ship 15.000đ − voucher 20.000đ = **195.000đ**. Mã không hợp lệ trả 422. |
| Hai người mua món cuối | Hai tài khoản lấy quote khi tồn khả dụng là 1, gửi hai lệnh xác nhận song song | HTTP **201/409**, bên thua nhận `INSUFFICIENT_STOCK`, DB chỉ có một đơn. Tồn sau tiêu thụ là quantity=0/reserved=0, không âm. Đã hủy đơn thử, không còn tồn giữ. |

Bằng chứng chính: `outputs/bug-acceptance-2026-11-14/results.json` cho lịch sử/giỏ; `outputs/bug-acceptance-2026-11-14-checkout/results.json` cho tồn/voucher/đặt đơn; `outputs/bug-acceptance-2026-11-14/harness-second-run/results.json` cho tranh mua. Mỗi file ghi ID fixture để đối chiếu đúng đợt.

## Các lỗi không đạt

### F10 — P2: sort gian hàng không áp dụng qua phân trang

Tái hiện bằng gian hàng thật có 21 sản phẩm:

1. Trang 1 trả 20 sản phẩm, giá thấp nhất 100.000đ.
2. Trang 2 có sản phẩm giá 1.000đ.
3. Bấm Giá thấp đến cao tại trang 1: sản phẩm 1.000đ không xuất hiện; không có request tải sort server.
4. Chuyển trang 2 mới thấy sản phẩm 1.000đ; request chỉ có `page=2&size=20`.

Finding trước đây từ code đã được xác nhận trên runtime. Cần chuyển sort vào backend trước LIMIT/OFFSET, có thứ tự phụ ổn định. Vị trí: `frontend/src/features/customer/StorePage.tsx` và contract/service `listStoreProducts`.

Ảnh: `outputs/bug-acceptance-2026-11-14/store-sort-page1.png`, `store-sort-page2.png`.

### F11 — P1: tải Home khi đăng nhập tự chạm rate limit

Đã kiểm tra riêng, sau khi các ca ghi dữ liệu kết thúc. Dùng tài khoản nghiệm thu, mở Home rồi bấm liên kết sang gian hàng và logo về Home, không F5 liên tục:

| Giai đoạn | API response ghi nhận | HTTP 429 |
| --- | ---: | ---: |
| Mở Home khi đăng nhập | 53 | 17 |
| Bấm sang gian hàng | 2 | 2 |
| Bấm về Home | 26 | 0 |

Trong 53 response đầu có 40 request tới danh sách/chi tiết sản phẩm. Hai request bị chặn ở gian hàng là `/stores/{id}/products` và `/me/vouchers`, `Retry-After: 2`. JavaScript không có pageerror trong lượt này; lỗi nằm ở mạng và ảnh hưởng tải dữ liệu. Lượt khách chưa đăng nhập có 5/4/5 response tương ứng, không có 429; đó không phải bằng chứng luồng đã đăng nhập đạt.

Code `CustomerRecommendations.tsx` đang tải từng `getProduct` bằng `Promise.all`. Đây là vị trí điều tra phù hợp với request trace; chưa kết luận đó là nguyên nhân duy nhất của các request lặp. Hướng sửa: gộp tải sản phẩm theo IDs, dùng cache/chống request trùng và kiểm tra lại ngân sách burst sau khi giảm request. Không chỉ tăng trần để che tình trạng tải dư.

Bằng chứng: `outputs/bug-acceptance-2026-11-14-navigation-authenticated/results.json`; đối chứng khách ở `outputs/bug-acceptance-2026-11-14-navigation/results.json`.

## Các yêu cầu chưa thể đánh dấu hoàn thành

- **B01 — Tự chọn voucher tốt nhất:** có hai voucher Store hợp lệ nhưng số thẻ được chọn khi mở dialog là 0. Chọn thủ công/quote/đặt đơn đã qua; auto-best chưa có.
- **F04/B10 — Ảnh/video chat:** UI đã gỡ khả năng gửi không được backend hỗ trợ, hiện chỉ văn bản. Chưa có upload/attachment để nghiệm thu chức năng media. Tìm hội thoại Customer cũng chưa được đánh dấu nghiệm thu ở đợt này.
- **B28 — Campaign/banner/nhóm sản phẩm Store:** tính năng mới, chưa hoàn thành để nghiệm thu.
- **B09/B29 — Điều hướng phụ:** yêu cầu còn mâu thuẫn, chưa có một tiêu chí thống nhất để chấm đạt.
- Đợt này không nghiệm thu giao dịch ngân hàng, giao hàng thực, chất lượng ảnh gen hoặc toàn bộ 33 góp ý thiết kế. Các kết quả UI trước đó vẫn nằm trong báo cáo gốc, không tự động được nâng thành chứng nhận E2E.

## Thu hồi dữ liệu thử và độ tin cậy bằng chứng

- Kiểm tra cuối cùng của cả bốn bộ fixture: **12 tài khoản thử đều LOCKED**, refresh session bị thu hồi; **3 đơn COD đều CANCELLED**, **0 đơn mở**, **0 tồn giữ**, **0 sản phẩm thử ACTIVE**, **0 dòng giỏ**. Gian hàng thử đã khóa, taxonomy/voucher thử dừng hoạt động. Giữ bản ghi giao dịch và audit, không xóa lịch sử tài chính.
- Có lượt đầu lỗi do selector của bộ nghiệm thu, driver PostgreSQL, và giả định tồn sau commit. Đã sửa bộ kiểm tra, không tính những lỗi đó thành lỗi sản phẩm.
- Sau xóa sạch giỏ, UI nhớ lựa chọn rỗng. Bộ kiểm tra đã thêm bước người dùng chọn lại dòng; trạng thái nút bị khóa khi chưa chọn sản phẩm không được tính là lỗi.
- Một lượt timeout của bộ kiểm tra được dọn bằng script khôi phục có kiểm tra ownership fixture; biên bản dọn cuối xác nhận không để lại đơn/tồn giữ. Các log chẩn đoán được giữ, không báo toàn bộ các lượt đều pass.
- Bằng chứng thu hồi cuối: `outputs/bug-acceptance-2026-11-14/final-cleanup-verification.json`.
- Không thay đổi mã ứng dụng hoặc triển khai phiên bản mới trong đợt nghiệm thu; chỉ thêm bộ kiểm tra và biên bản. Hai lỗi F10/F11 hiện vẫn còn trên demo tại thời điểm kiểm tra.

## Chạy lại

Các script nằm trong `frontend/tests/runtime/`, chỉ chạy khi chủ động đặt `DEMO_BUG_ACCEPTANCE=1`. `run-demo-acceptance.cjs` sẽ ghi dữ liệu thử trên demo; không chạy như một unit test thông thường. `DEMO_ACCEPTANCE_FILTER` nhận tên ca cách nhau bằng dấu phẩy; `DEMO_ACCEPTANCE_OUTPUT` chọn thư mục bằng chứng có tiền tố đã giới hạn. `DEMO_ACCEPTANCE_CONFIRM=1` bật bước đặt đơn COD riêng trong ca voucher. Script dọn dữ liệu sau khi chạy và giữ bí mật đăng nhập trong bộ nhớ.
