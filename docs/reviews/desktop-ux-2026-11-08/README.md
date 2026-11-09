# Kiểm chứng bản sửa R01–R08 — 08/11/2026

Đối chiếu [review lần 2](../desktop-ux-2026-11-07/review-2/README.md), bản demo đang chạy và mã local hiện tại. Phạm vi desktop 1366 × 768, bổ sung checkout 1440 × 900. Không sửa frontend/backend, không deploy trong lượt kiểm chứng này.

## Kết luận

Các lỗi menu nhạt, mất chính sách một shop, mã hồ sơ không thống nhất, CTA bị chính sách đẩy xuống và gợi ý trùng đã được khắc phục trong các tình huống kiểm tra. **Chưa nên đóng toàn bộ R01–R08:** R05 còn thiếu ưu tiên mặc định, R06 mới sửa toolbar, R07 còn CSS ngăn textarea thu gọn và cấu trúc form hàng loạt vẫn giữ nguyên.

## Kết quả từng mục

| Mục | Kết quả kiểm chứng | Phần còn lại |
|---|---|---|
| R01 Menu | Lỗi tương phản cũ đã sửa trên seller và admin. Màu normal `#334155`, active `#c2410c` đúng bản mô tả | Chỉ normal/hover đạt AAA cho chữ nhỏ; active không đạt AAA — xem số đo bên dưới |
| R02 Chính sách một shop | Đã có lại đường xem chính sách, mở được nội dung trong checkout một shop | Nhãn “& bảo hành” chưa có nội dung bảo hành tương ứng; nên dùng nhãn đúng nội dung |
| R03 Mã yêu cầu | Danh sách và chi tiết cùng hiện `#C6820A81`, đơn `#2EC54E27`; source seller/admin dùng hậu tố viết hoa | Tìm kiếm prefix/suffix được xác nhận ở source; không chạy mọi tổ hợp tìm kiếm trên UI |
| R04 Nút đặt hàng | Khi mở breakdown/chính sách hai shop ở 1366 × 768, CTA nằm trước nội dung cuộn; vẫn thấy ở trường hợp COD/chuyển khoản hỗn hợp | Chỉ kết luận cho các trạng thái đã kiểm tra; chưa kiểm thử báo giá lỗi/hết hạn/thay đổi tiền trong lượt này |
| R05 Hàng đợi seller | Tab Cần xử lý lọc đúng 3 đơn PENDING; badge trạng thái đã bỏ lặp | Vào `/seller/orders` vẫn chọn Tất cả và đưa đơn hoàn tất lên đầu. Tab mới là tên hiển thị cho PENDING, chưa phải hàng đợi tổng hợp mọi việc cần làm |
| R06 Kho | Nút đọc lại đã chuyển vào toolbar, kiểu secondary | Năm tab và mật độ mỗi dòng SKU gần như cũ. Chưa đạt mục tiêu giảm số quyết định và tăng khả năng quét dữ liệu |
| R07 Kiểm duyệt | Có `rows={2}` và nút secondary trong source | Ô nhập thực tế vẫn cao 96px do CSS chung; thẻ đầu cao 634px. Form lý do vẫn mở sẵn cho từng sản phẩm |
| R08 Gợi ý | Hai nhóm gợi ý của hoodie Weekend không còn giao nhau; source truyền ID từ khối cùng shop vào excludeIds | Sau lọc trang đầu còn 2 sản phẩm liên quan; chưa tự bù đủ 4 từ trang tiếp theo. Không coi đây là lỗi trùng lặp còn tồn tại |

## Phát hiện còn cần xử lý

### V01 — P2: `rows={2}` không có tác dụng thu gọn thực tế

**Đo trên demo 1440 × 900:** textarea đầu có `rows="2"`, nhưng `height = 96px`, `min-height = 96px`, `font-size = 14px`. Thẻ sản phẩm đầu cao **634px**.

CSS `.live-content textarea, .market-native-dialog textarea { min-height: 6rem; ... }` ghi đè kích thước tự nhiên hai dòng; các class `text-xs` cũng không khiến font thực tế về 12px. Vì vậy việc chỉ kiểm tra thuộc tính rows hoặc class không xác nhận được kết quả trình bày.

**Vị trí:** `frontend/src/features/admin/ProductModeration.tsx:264`, `frontend/src/live/commerce.css:5010`.

**Hướng sửa:** override có phạm vi cho form kiểm duyệt để min-height và typography đúng thiết kế. Để giải quyết R07 đầy đủ, danh sách chỉ tóm tắt sản phẩm; mở một đối tượng mới hiện form quyết định/mô tả/gallery. Giữ khả năng đọc mô tả đầy đủ, không chỉ clamp hai dòng.

Ảnh: [kiểm duyệt](evidence/moderation.png), [toàn trang](evidence/moderation-full.png).

### V02 — P2: “Cần xử lý” chưa được ưu tiên khi vào trang đơn

Mở trực tiếp `/seller/orders`: Tất cả vẫn được chọn, đơn hoàn tất đứng trước. Bấm Cần xử lý thì đúng ba đơn chờ xác nhận. Như vậy phần lọc hoạt động, còn mục tiêu đưa việc cần làm lên trước chưa hoàn tất.

**Vị trí:** `frontend/src/components/OrderListTools.tsx:68`, `:112`; `frontend/src/live/SellerWorkspace.tsx` phần StoreOrders.

**Hướng sửa:** chọn rõ mặc định công việc cho seller khi URL không có filter; giữ Tất cả cho tra cứu và giữ các deep link/bộ lọc người dùng đã chọn. Nếu tab chỉ lọc PENDING thì cân nhắc nhãn “Cần xác nhận”, vì đơn CONFIRMED/PROCESSING vẫn có việc phải làm.

Ảnh: [vào trang mặc định](evidence/seller-orders.png), [sau chọn Cần xử lý](evidence/seller-pending.png).

### V03 — P2: R06 chưa giải quyết mật độ của phần dữ liệu

Toolbar đã gọn hơn nhưng còn năm tab, chú thích ảnh trên từng dòng, tên/phân loại/SKU cùng nhiều link và thao tác. Việc đổi nút làm mới không làm giảm đáng kể tải đọc trong bảng.

**Hướng sửa:** một view tác nghiệp tồn có thể bán; lịch sử/đối chiếu/thống kê thuộc tra cứu; thao tác phụ vào menu. Giữ số đang giữ, điều kiện nhập/giảm và preview trước → sau.

Ảnh: [kho sau sửa](evidence/inventory.png).

## Đính chính tuyên bố WCAG AAA

Màu thực tế trên demo khớp màu được báo cáo. Tính tương phản theo cặp foreground/background:

| Trạng thái chữ menu | Màu chữ / nền | Tương phản |
|---|---|---|
| Bình thường | `#334155` / `#ffffff` | 10,35:1 |
| Hover theo CSS | `#0f172a` / `#f1f5f9` | 16,30:1 |
| Active | `#c2410c` / `#fff1eb` | **4,69:1** |

R01 về chữ nhạt đã sửa. Tuy nhiên không thể nói toàn bộ trạng thái đều AAA (>9,5:1). Chữ active 13px cần 7:1 để đạt tiêu chí tương phản AAA; 4,69:1 đáp ứng ngưỡng tương phản AA cho chữ thường. Đây là đánh giá tiêu chí tương phản của các cặp màu, không phải chứng nhận WCAG cho toàn ứng dụng. [W3C SC 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html).

Normal/active lấy computed style trực tiếp; hover đối chiếu rule CSS, chưa mô phỏng pointer hover trong lượt này.

## Bằng chứng checkout và gợi ý

- Checkout hai shop, COD: tổng 1.874.000₫. Mở chi tiết shop có vùng cuộn cao 240px, nội dung 670px; CTA tại y≈303–343px, còn trong viewport 768px.
- Hỗn hợp: COD 1.765.000₫, chuyển khoản 109.000₫; CTA tại y≈367–407px. Không đặt đơn.
- Một shop Mây Xanh: tổng 109.000₫; “Chính sách đổi trả & bảo hành” mở được nội dung trả hàng. Kiểm tra thêm tại 1440 × 900, CTA vẫn thấy.
- Hoodie Weekend: bốn sản phẩm cùng shop và hai sản phẩm liên quan, **không có href sản phẩm trùng giữa hai nhóm**.

Ảnh: [nhiều shop mở chính sách](evidence/checkout-multi-expanded.png), [hỗn hợp](evidence/checkout-mixed.png), [một shop](evidence/checkout-single-policy.png), [1440px](evidence/checkout-single-1440.png), [gợi ý](evidence/product-recommendations-full.png), [mã ở danh sách](evidence/returns-list.png), [mã ở chi tiết](evidence/return-detail.png).

## Kiểm tra và giới hạn

- Chạy lại `npm --prefix frontend run build`: **PASS**, Vite còn cảnh báo chunk >500 kB.
- `frontend/test-results/.last-run.json` có `status: passed`, không có failedTests; file cập nhật 08/11/2026 00:18 theo thời gian file. Manifest không chứng minh số lượng/phạm vi test đã chạy. Không chạy lại toàn bộ E2E trong lượt này; không xác nhận độc lập tuyên bố “toàn bộ E2E”.
- Bản demo đã phản ánh các thay đổi trên các màn trực tiếp xem. Không đối chiếu hash toàn bộ frontend/backend hoặc chạy lại quy trình deploy/smoke check của lần triển khai trước.
- Không thực hiện mua, thu/hoàn tiền, lưu kho, kiểm duyệt hay gửi tin nhắn. Đã khôi phục COD, giỏ chọn tất cả, phiên chủ An Nhiên và viewport mặc định.
- Có 12 ảnh bằng chứng mới. Báo cáo không thay thế kiểm thử người dùng, kiểm tra phục hồi khi mạng lỗi hoặc xác nhận nghiệp vụ tiền/kho.

Ưu tiên tiếp theo: V01 → V02 → V03 và chuyển kiểm duyệt sang danh sách tóm tắt/chi tiết. Không cần triển khai lại chỉ để ghi nhận review này.
