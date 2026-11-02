# Marketplace UI/UX và dữ liệu catalog — 2026-11-02

Baseline: `265dd56`, website `https://demo.congnguyen.me`, React 19/Vite/TanStack Query, font Be Vietnam Pro, API/worker hiện có. Ảnh trước thay đổi lưu riêng trong `artifacts/ui-refresh/before/`. Không dùng skeleton hoặc ảnh chưa tải trong screenshot để kết luận mất ảnh.

## Nghiên cứu tham khảo

| Nguồn đã đọc | Phần áp dụng | Giới hạn |
| --- | --- | --- |
| [shopee-at-home](https://github.com/TranDangKhoi/shopee-at-home): ProductList, AsideFilter, SortProductList, Product, ProductDetails, Cart | Mật độ lưới, giá nổi bật, bộ lọc cạnh kết quả, gallery, khu vực mua rõ ràng | Không sao chép thương hiệu/code/ảnh. Buy now của repo thêm vào giỏ; dự án này giữ kernel BUY_NOW riêng đã nghiệm thu. Không lấy sao/số bán giả làm dữ liệu thật. |
| [Vercel Commerce](https://github.com/vercel/commerce/tree/main/components/product): variant-selector, gallery | Nhóm lựa chọn theo từng thuộc tính, trạng thái hết hàng, gallery và điều hướng | Giữ React Router/Vite và contract hiện có. Repo đã archive tại thời điểm nghiên cứu; chỉ tham khảo pattern. |
| [Medusa storefront](https://github.com/medusajs/nextjs-starter-medusa/tree/main/src/modules/products/components): product-actions, option-select, image-gallery | Khu vực ảnh và quyết định mua tách rõ, các lựa chọn có nhãn | Không đưa framework/store backend khác vào dự án. Repo đã archive; không dùng làm căn cứ production readiness. |

Mã tham khảo chỉ được tải trong artifacts để đọc, không cài hoặc thực thi. Các thay đổi được viết cho codebase này.

Revision tham khảo đã đọc: shopee-at-home `907d707`, Medusa `9818886`, Vercel Commerce `f7521d5`. Không sao chép nguồn hoặc thêm dependency từ ba repo.

## Chẩn đoán và thay đổi

1. Catalog có 12 món lặp giữa hai Store, ảnh SVG chung không giúp nhận diện hàng. Cần catalog được biên tập với taxonomy, SKU, giá, thuộc tính, ảnh đúng đối tượng và ranh giới tồn 0/1/nhiều; không nhân bản tiêu đề để đủ số lượng.
2. Trang chủ chủ yếu là danh sách quản trị phóng lớn, có nhiều khoảng trống và lặp heading. Cần điểm vào theo nhu cầu/danh mục, banner vừa đủ và lưới hàng có mật độ phù hợp.
3. Card lặp CTA cam trên mọi món; ảnh/tên/giá chưa là trọng tâm. Giảm nhiễu, giữ các thao tác mua/yêu thích dùng được bằng bàn phím và chạm.
4. PDP trộn mô tả dài, SKU, trạng thái kỹ thuật, giá/tồn và 12 tổ hợp vào một khối. Nhóm chọn theo trục, tóm tắt món đang chọn, gallery và thông số có tên dễ đọc; giữ kiểm tra giá/tồn và cơ chế phục hồi.
5. Giỏ/checkout cần dòng hàng và tổng tiền dễ quét; Seller/Admin dùng cùng token nhưng mật độ riêng cho bảng và hành động. Không thay đổi quy tắc tiền/kho/quyền bằng CSS.

## Chuẩn dữ liệu

- Dữ liệu tổng hợp phục vụ thử nghiệm, không lấy thông tin khách thật. Giá trong catalog là giá của bộ dữ liệu, không tuyên bố là giá thị trường hiện tại.
- Tên, ảnh, màu/cỡ, thông số, mô tả và SKU phải nhất quán. Có đủ dữ liệu vượt một trang và nhiều Store; những món không còn khả dụng phải có trạng thái rõ.
- Ảnh chụp từ [Burst/Shopify](https://www.shopify.com/stock-photos/about-us), được nguồn cho phép sử dụng trên website. Mỗi ảnh giữ URL gốc, license/provenance, checksum và kích thước; phục vụ từ asset nội bộ, không phụ thuộc hotlink lúc demo.
- Không tạo giảm giá gạch ngang, sao, số người mua hoặc số bán ngẫu nhiên. Dữ liệu giao dịch đi qua API/worker và đối chiếu ledger; không sửa lịch sử đơn để khớp sản phẩm mới.
- Dữ liệu mới phải có plan/idempotency, giới hạn đúng môi trường và bằng chứng hậu điều kiện. Bảo toàn backup trước khi thay dữ liệu runtime.

## Nghiệm thu

Kiểm tra desktop 1440px; tablet/mobile theo phạm vi thiết bị có thể thực thi, ghi đúng giới hạn. Thử tìm kiếm tiếng Việt, lọc/sắp xếp/phân trang/back; gallery và chọn phân loại; thêm giỏ/mua ngay; giỏ nhiều Store/checkout; Seller lấy đúng hàng; Admin đúng scope. Chụp ảnh sau khi dữ liệu/ảnh đã ổn định, kiểm tra focus, tương phản, ảnh lỗi và console. Fixture không thay API/DB/worker thật.

## Kết quả QA của đợt này

- Stack biệt lập `pbl6-seed-verify`, API `18081`, Vite `3111`: 32 sản phẩm công khai thuộc bốn danh mục, 64 phân loại, 45 liên kết ảnh. 40 asset WebP (gồm ảnh collection) khoảng 2.8 MB, tối đa 1200px, có manifest nguồn/checksum. Ảnh bối cảnh được mô tả rõ phần không đi kèm.
- Seed bổ sung 12 đơn COD có hai Store, hàng/số lượng/giá khác nhau và nhiều trạng thái; giữ 17 đơn cũ, không sửa lịch sử để trông mới. Tổng 29 đơn sau seed. Nhập tồn, reserve/consume và thu COD đều qua API/worker.
- Chạy lại seed giữ đúng 32/64/45 và 12 đơn bổ sung, zero ledger mismatch. So sánh hash từng dòng đơn và money ledger có trước seed để kiểm tra bảo toàn lịch sử. Lượt đầu kiểm tra idempotency phát hiện metadata variant ảnh thiếu ở API quản lý; đã sửa truy vấn public/management/insert, gỡ trùng bằng API và kiểm chứng lại.
- Năm ca acceptance trên API thật đạt: catalog/ảnh/phân trang/back; tìm tiếng Việt/lọc giá/reload; nhóm màu/cỡ/gallery bàn phím; giỏ hai Store và BUY_NOW không đổi giỏ; bố cục 1024px không overflow.
- Lượt xem ảnh public phát hiện banner/danh mục đẩy hàng xuống quá sâu. Khối đầu được thu gọn, bỏ hàng thông tin lặp và breadcrumb thừa ở landing; heading catalog dùng h2 dưới h1 banner. Acceptance bổ sung kiểm hàng đầu nằm trước mốc 900px của trang 1440px, đã chạy với dữ liệu public chỉ đọc cùng kiểm tra 1024px.
- 13 ca hồi quy giỏ/tồn/ảnh/gợi ý đạt, gồm 1440/1024/768px cho nút tồn và trục biến thể. Các test thay locator để chọn theo nhóm màu/cỡ thay vì nút ghép SKU; vẫn kiểm đúng variant, số lượng, không gửi mutation khi hết hàng, và phục hồi focus.
- 23/26 ca hồi quy ban đầu đạt; một ca dùng locator cũ đã được sửa và chạy lại đạt trong nhóm 13; hai ca điện thoại giữ SKIP theo phạm vi desktop đã thống nhất. Không tuyên bố đã dùng bàn phím ảo, screen reader hay thiết bị thật.
- Phát hiện mới: adapter gợi ý mock trả nhầm shape cho related-products làm UI đọc `.length` của undefined và sập PDP. Frontend hiện kiểm tra shape, hiển thị lỗi trong phần gợi ý và giữ màn mua hoạt động. Có test tái hiện; không biến response lỗi thành danh sách rỗng thành công. Nghiệm thu AI/provider là phạm vi riêng.
- Chụp Seller/Admin để kiểm tra cùng token, độ tương phản sidebar trên nền sáng và mật độ bảng. Không coi thay đổi CSS là nghiệm thu lại mọi chức năng quản trị.
- 13 ca tiếp tục xác thực và ba ca nhận diện Store/variant được cập nhật theo nhóm lựa chọn/tóm tắt mới. Bộ `customer.spec.ts` cũ trộn HTTP fixture với tài khoản `customer1@pbl6.test` và các Product/Store UUID cố định của seed cũ: sáu ca không chạy được trên dataset curated vì tài khoản/ID đó không có. Giữ bằng chứng lượt thất bại; không đổi dữ liệu runtime để làm fixture qua, không cộng sáu ca vào PASS. Năm ca runtime curated thay thế phần nghiệm thu luồng mua mới; không tự kết luận hai bộ có cùng toàn bộ coverage.

## Cập nhật môi trường demo

`python scripts/deploy_candidate.py --runtime-root C:/PBL6 --demo-login --curated-catalog --apply` chạy từ checkout sạch. Quy trình build → preflight chỉ đọc → đóng ingress/writers → backup/restore verification → migrations/start → seed qua API → mở ingress. **Không reset DB lần nữa**. Nếu có tài khoản/sản phẩm ngoài bộ synthetic, cart đang có công việc trước lượt seed đầu, hoặc checkout chưa rõ kết quả, preflight từ chối trước bảo trì.

Seed chỉ dừng bán 12 listing cũ có title/SKU nằm trong allowlist, giữ nguyên tồn và lịch sử đơn/tiền. Không tự xóa dữ liệu phát sinh ngoài bộ mẫu. Các số test cũ và backup cũ được giữ riêng; bằng chứng lượt này nằm trong `artifacts/ui-refresh/`.
