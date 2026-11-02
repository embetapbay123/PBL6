# Review và sửa bản tổng hợp UI/UX vận hành — 03/11/2026

Baseline nguồn trước sửa: `77003835e209c466ea879bdea14ca4569fb2d6aa`. Giữ nguyên các báo cáo và hash nghiệm thu cũ. Phạm vi lần này là desktop; không kiểm mobile hoặc thiết bị thật. Không đổi schema, chính sách tiền/kho hay triển khai backend.

## Kết luận review tài liệu

Tài liệu chỉ ra đúng vấn đề phân cấp thông tin ở checkout, đơn hàng, kho và báo cáo. Tuy nhiên, nó trộn vấn đề còn tồn tại, chức năng đã có và đề xuất mở rộng nghiệp vụ. Không dùng toàn bộ các giải pháp làm đặc tả bắt buộc.

- `boot-card` là class CSS nội bộ; production không cài Bootstrap. Đổi toàn bộ sang Tailwind không tự giải quyết lỗi nghiệp vụ hoặc UX.
- Chat đã có launcher nổi, thu nhỏ/mở rộng, lịch sử riêng và nút Phiên mới. Nhận xét thiếu toàn bộ các khả năng này không đúng baseline.
- Profile đã có đọc/sửa/hủy. Lần này bổ sung sửa riêng tên hoặc điện thoại; email đăng nhập vẫn cố định theo API.
- Checkout đã có sticky summary và modal chọn voucher. Lỗi thực tế là summary 340px và chính sách dài đẩy phần tiền xuống dưới.
- Không có ví/payout; không đổi tiền đã thu thành “thực thu về ví”. Không gọi giá trị hàng hoàn tất là lợi nhuận hoặc số tiền đã trả Owner.
- Đổi/trả hiện áp dụng toàn đơn. Không thêm bước chọn trả một phần hoặc tải ảnh khi contract chưa hỗ trợ.
- Hệ thống duyệt Store không có CCCD, giấy phép hay tài khoản ngân hàng trong hồ sơ. Không dựng các trường đó từ dữ liệu không tồn tại.

## Mapping góp ý và kết quả sửa

| Mục nguồn | Đánh giá / thay đổi | Trạng thái và giới hạn |
|---|---|---|
| C1 Giỏ/checkout | Desktop dùng tỉ lệ 7/5 với summary tối thiểu 360px. Summary checkout có vùng cuộn bằng bàn phím để vẫn tới nút xác nhận khi nhiều Store. Chính sách nằm trong details. Voucher trình bày dạng vé, nhóm theo sàn/cửa hàng. | Đã sửa. Không tạo nhóm voucher vận chuyển vì API hiện không có loại này. Giữ quote, validation và attempt/key. |
| C2 Chi tiết đơn | Hai cột timeline/sản phẩm và địa chỉ/tiền/thao tác. Overview gọn; chính sách mở khi cần. Timeline chỉ hiển thị sự kiện thực tế và vai trò được phép. | Đã sửa. Không ép mọi đơn phải vừa một màn hình bằng cách giấu món hoặc cảnh báo quan trọng. |
| C3 Chat | Đối chiếu `ChatCenter.tsx` và `CustomerChatWidget.tsx`: launcher, minimize/expand và Phiên mới đã có. | Có sẵn. Xóa lịch sử và tìm toàn bộ hội thoại theo tên còn thiếu contract hỗ trợ; chưa triển khai trong đợt frontend này. Không thêm nút xóa giả hoặc lọc trang đầu rồi gọi là tìm toàn bộ. |
| C4 Profile | Nút sửa riêng tên/điện thoại, focus vào trường tương ứng; PATCH chỉ gửi trường đang sửa; hủy phục hồi bản đã lưu. Giữ thao tác sửa chung để tương thích. | Đã sửa. Không thêm đổi email khi backend không hỗ trợ. |
| C5 Lịch sử đơn | Lọc nhanh trạng thái, bộ lọc chi tiết mở theo nhu cầu; reset page khi đổi lọc. Hai dòng hàng nhận diện, tổng tiền và hành động chính gọn. UNKNOWN vẫn có hướng dẫn đối soát. | Đã sửa. Snapshot hiện tại không lưu ảnh; dùng biểu tượng trung tính. Chỉ render thumbnail nếu chính snapshot có URL; không mượn ảnh catalog hiện tại để giả lịch sử. |
| C6 Thông báo | Compact list, icon theo loại, mốc tương đối và tooltip/thẻ time giữ giờ chính xác UTC+7; hành động đọc/xem đơn nằm cùng hàng. | Đã sửa, giữ API đọc/chưa đọc và liên kết đơn. |
| C7 Đổi/trả | Thêm tiến trình theo trạng thái thật; chính sách của yêu cầu mở theo nhu cầu; biểu mẫu nói rõ toàn đơn và chỉ gửi hàng sau duyệt. | Điều chỉnh phù hợp nghiệp vụ hiện tại. Không triển khai wizard tải ảnh/hoàn một phần. |
| C8 Địa chỉ | Grid cards, viền/badge địa chỉ mặc định, nhóm thao tác gọn. | Đã sửa. Gợi ý tỉnh/phường theo dataset hiện có; vẫn cho nhập nguyên văn và giữ quận/huyện theo contract. Không ép chuỗi ba dropdown làm mất địa chỉ cũ. |
| C9 Cài đặt | Master-detail có URL cho Quyền riêng tư/Bảo mật/Thông báo/Bán hàng. Dẫn tới các luồng thực; bỏ form mở Store lặp lại ở trang cài đặt. | Đã sửa. Không dựng toggle thông báo chưa có nơi lưu. |
| Seller sản phẩm | Tạo ma trận mới theo trục cấu hình, xem trước/sửa từng SKU/giá, kiểm kiểu/allowed values, tối đa 100 tổ hợp mỗi lần ở UI. Giá/SKU gốc là giá trị khởi đầu; không ghi tồn. Trong editor có áp giá vào bản nháp các variant đang bán, rồi lưu với version hiện hành. | Đã sửa phần ma trận/giá. Không sửa tồn bằng API sản phẩm. Chưa có upload binary/kéo nhiều file; giữ ảnh URL và thứ tự đã hỗ trợ. |
| Seller kho | Thẻ số liệu đã trừ chưa bàn giao / cần đối soát / số dòng, badge rõ nghĩa, giải thích kỹ thuật mở theo nhu cầu. Khôi phục link lịch sử cũ có `history_page`, giữ view khi phân trang, có phản hồi và link bút toán sau điều chỉnh. | Đã sửa. Không gọi các con số này là tổng tồn vật lý, tổng khả dụng hoặc cảnh báo thấp toàn Store. |
| Seller đơn | Nút in phiếu đóng gói từ snapshot: mã đơn/Store, người nhận, phân loại, SKU, lượng và chỉ dẫn COD theo trạng thái tiền. Nội dung dùng text nodes, không chèn HTML của người dùng. | Đã thêm in từng đơn. Không tự xác nhận bàn giao/thu tiền khi in. Batch confirmation chưa nằm trong phạm vi đã chốt. |
| Seller nhân viên | Preset Kho / Xử lý đơn / Đơn và COD / Catalog, chỉ dùng bốn permission thật; thao tác chỉ thay bản nháp cho đến khi lưu. | Đã sửa. Không tạo vai trò “kế toán” có quyền báo cáo Owner. Resend/link mời chưa có endpoint an toàn; chưa dựng token mời ở UI. |
| Admin hồ sơ | Drawer chi tiết, bổ sung định danh người nộp từ API, gợi ý lý do từ chối có thể chỉnh trước xác nhận. | Đã sửa. Giữ kiểm version và chặn retry quyết định chưa rõ kết quả. Không thêm dữ liệu KYC giả. |
| Admin kiểm duyệt | Phóng to ảnh bằng click/bàn phím trong modal, dấu hiệu hover; fallback ảnh lỗi. | Đã sửa. Giữ bước ghi lý do/xác nhận, không đổi thành mutation một chạm. |
| Admin audit | Nhãn hành động dễ đọc, icon và đánh dấu sự kiện liên quan khóa/quyền, giữ mã gốc, actor/scope/request ID và bảng cuộn. | Đã sửa. Bảng vốn đã có cấu trúc, không phải JSON thô. Không suy ra sự kiện đổi số dư của ví chưa tồn tại. |
| Reports | KPI theo định nghĩa thật; biểu đồ cột thu/hoàn từ `cash_series`, bảng giá trị chính xác, CSV tổng hợp + chuỗi tiền của kỳ/phạm vi đang xem. CSV giữ UTC+7, bảo vệ ô văn bản khỏi công thức spreadsheet. | Đã sửa. Không xuất CSV của một trang giao dịch rồi gọi là toàn bộ sổ tiền; không dựng số đơn hoàn tất khi API chỉ có số đơn tạo trong kỳ. |
| Kiến trúc chung | Tái sử dụng Button/Modal/tokens/Lucide; thêm ProgressSteps, ImagePreview và CashChart nhỏ, không cài framework thứ hai. | Không viết lại toàn bộ CSS. CSS mới nằm trong stylesheet component hiện hành, format đọc được. |

## Hai lỗi bổ sung phát hiện qua hồi quy

1. **Giỏ hiện lại giá cache dù batch metadata vừa lỗi**: React Query giữ `data` cũ sau refetch lỗi, và `productFor` vẫn trả dữ liệu đó. Sửa để không dùng batch data khi có lỗi, hiển thị thiếu thông tin/tạm tính không khả dụng và chỉ GET khi thử lại. Test được cập nhật sang endpoint batch thật `/products?ids=...` và hết TTL 30 giây; không đổi kỳ vọng để giữ giá sai.
2. **Khó đối chiếu sau điều chỉnh kho**: trang lịch sử cũ có `history_page` không chọn đúng view; phân trang làm mất hash; modal lưu xong không cho biết bút toán mới. Sửa phục hồi deep link, giữ view history, cho điều chỉnh variant đang đối chiếu bằng version hiện hành, và thông báo có lý do/link lịch sử sau API xác nhận. Không thay command, delta hoặc idempotency.

## Bằng chứng và giới hạn

- Artifact riêng: `artifacts/ui-operational-polish/`; không cập nhật baseline hash cũ.
- Fixture browser: kiểm các request thật do UI tạo, focus, lọc/back/forward, draft/version, UNKNOWN GET-only, lỗi metadata, CSV, ma trận, preset quyền và nội dung phiếu in. Fixture không thay thế database.
- Runtime riêng: `ui-matrix-runtime.spec.ts` chạy với `CORE_FIX_UI_MATRIX=1` trên `pbl6-fe-verify`, frontend 3109 / gateway 18080. UI tạo sản phẩm DRAFT có tag, API trả 201; đọc API kho và SQL xác nhận 12 variant, một mặc định, 12 dòng tồn 0. Sau test dừng sản phẩm, type và category có tag. Không reset DB, không sửa demo chung.
- Hai lần chuẩn bị runtime đầu không đạt: origin 3112 bị QA từ chối; lần 3109 chờ page load vượt thời gian. Lần cuối dùng đúng origin và chờ DOM trước tương tác đã đạt. Không ghi hai lần đầu thành PASS.
- Test cũ một số chỗ dùng dropdown đã thay bằng navigation hoặc tìm input ẩn trong details. Cập nhật đường thao tác/locator, giữ kiểm query/body/version/hậu điều kiện. Không lấy screenshot làm bằng chứng giao dịch thành công.
- Desktop 1440px là chính; các ca hướng dẫn đơn có 1024/768px. Không kiểm mobile, bàn phím ảo, screen reader hoặc máy in vật lý. Phiếu in được xác minh nội dung DOM và khả năng gọi hộp in; chưa nghiệm thu bản in giấy.
- Nghiên cứu người dùng thật: `USER_VALIDATION_PENDING`.

Các khả năng còn lại cần đợt mở rộng contract riêng nếu muốn làm: xóa lịch sử AI; tìm hội thoại toàn bộ; upload nhiều ảnh; gửi lại/link mời; thao tác đơn hàng loạt; snapshot ảnh cho đơn mới. Chúng không được báo là đã triển khai trong bản sửa này.

## Bộ nghiệm thu bản sửa

| Bộ kiểm | Kết quả / artifact |
|---|---|
| Desktop tập trung: audit, giỏ, báo cáo/CSV, kho, tìm đơn, thao tác mới | 40 ca PASS; `release-desktop/` |
| Checkout/voucher/COD và link kho, loại riêng ca 390px | 6 ca PASS; `checkout-final/` |
| UI → API → SQL ma trận 12 variant | 1 ca PASS; `runtime-final/` |
| TypeScript | PASS sau các thay đổi hành vi |

Các lần chạy trước và lỗi đã sửa được giữ trong thư mục artifact riêng; kết quả phát hành lấy từ các lượt cuối ở bảng trên. Playwright fixture không được mô tả là provider/DB thật. Kiểm tra demo sau deploy chỉ đăng nhập, đọc dữ liệu và mở/hủy form; không phát sinh mutation nghiệp vụ.
