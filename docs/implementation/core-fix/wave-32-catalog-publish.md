# Đợt 58 — Seller đưa sản phẩm tới trạng thái mua được

**UX-09/F07 đã FIXED/VERIFIED trong phạm vi desktop đã chốt. Tổng 50/52 finding gốc VERIFIED, 2 còn mở: CR-021/UX-10 thuộc F17.** F00/F18, sáu chuỗi chung baseline cuối và rollback snapshot writer vẫn mở. Đây chưa phải kết luận sẵn sàng vận hành. Mobile được người dùng miễn; nghiên cứu người thật vẫn `USER_VALIDATION_PENDING`.

Runtime riêng `Node56/AI56/frontend58`, gateway18080/frontend3109. HEAD giữ `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree. Backend/AI, API contract và migrations không đổi từ56; chỉ frontend và test đổi. Manifest57 và mọi bằng chứng cũ giữ nguyên; không commit hoặc triển khai production.

## Ba lỗi bổ sung

| ID | Mức / trạng thái | Tái hiện và tác động | Sửa / hồi quy |
|---|---|---|---|
| CF-058-01 | P2 · CONFIRMED → FIXED/VERIFIED | Checklist dùng thứ tự khóa JSON để nối phân loại. Cùng Đen/XL nhưng response đổi thứ tự thành size/color thì hiện XL/Đen, lệch kho/trang mua; tăng việc đoán đối tượng. Không chứng minh đã ghi sai variant. `readiness-identity-baseline57.json` 1FAIL. | `ProductReadiness.tsx` dùng chung `variantLabel`, ổn định thứ tự; fixture đảo khóa và hành trình thật đi checklist→đúng variant trong kho→Customer Đen/XL qua. |
| CF-058-02 | P2 · CONFIRMED → FIXED/VERIFIED | Nhập kho xong dù lịch sử đang trang1, ứng dụng push thêm `history_page=1`. Back lần đầu vẫn ở kho, phải Back thêm mới về editor. Runtime run2 và `inventory-navigation-baseline58.json` 1FAIL. | `SellerWorkspace.tsx` chỉ reset trang lịch sử nếu đang trang khác1. Mutation vẫn invalidate kho/lịch sử/đối chiếu/commitments. Regression kiểm URL trang1 không đổi; trang2 vẫn về bút toán mới nhất, giữ variant filter. Runtime Back đưa đúng về editor, không dùng URL nội bộ thay đường đi. |
| CF-058-03 | P3 · CONFIRMED → FIXED/VERIFIED | Thành phần `CartProduct` dùng img trần; URL ảnh hỏng cho biểu tượng ảnh vỡ mặc định cả giỏ/checkout. Ảnh runtime run3 và `cart-image-baseline58.json` 1FAIL chứng minh; tên/phân loại/giá vẫn có, không nâng thành lỗi sai món/tiền. | `CartProduct.tsx` dùng `ProductImage` chung trong khung thumbnail cố định, CSS gọn, nhãn ảnh lỗi tiếp cận được. Không đổi snapshot hoặc giá quote. Fixture giỏ và runtime checkout HTTP404 xác nhận fallback, tên Đen/XL, SKU, lượng và tiền vẫn đọc được. Nối UX-18/F16, không đếm thêm finding gốc. |

## Hành trình và hậu điều kiện

`catalog-publish-runtime58-final.json` và `catalog-publish-checkpoints.json` trong thư mục cùng tên:

1. Owner vào Store Portal→Sản phẩm, tạo **DRAFT qua UI**, SKU và giá100500. Thêm11phân loại qua UI thành3màu×4cỡ; public404 khi còn nháp. Thêm2ảnh qua UI và đổi thứ tự thật.
2. Chuẩn bị298DRAFT reader fixture bằng SQL có guard Store/type/title/tag, cộng món nền và sản phẩm UI thành300món. Đây là dữ liệu để kiểm danh sách lớn, không tuyên bố298lượt tạo qua UI/API.
3. Từ danh sách không có món trên trang đầu, tìm đúng SKU, mở editor, checklist nói chưa có tồn; chọn Đen/XL, theo link kho đúng variant, nhập thêm3 có lý do/preview, Back về editor và thấy1/12còn tồn. Không có link trang khách khi DRAFT. Đổi ACTIVE bằng UI rồi thấy trạng thái mở bán.
4. Customer đăng nhập độc lập, tìm sản phẩm bằng catalog, chọn Đen/XL×2; Đỏ/S tồn0 bị disable. Thêm món50k×1 của Store khác. Giỏ/checkout hiển thị đúng món/phân loại, phí20k+10k, tổng **281000**. Ảnh URL kiểm thử không phục vụ trong Customer context trả404, fallback hiện đúng.
5. Confirm thật một nhóm2đơn. Snapshot đúng Đen/XL×2, đơn giá100500, tên lúc đặt. Worker đưa PENDING/CONSUMED, quantity3→1/reserved0. Owner Store khác đọc product bị404. Cleanup hủy trước bàn giao, chỉ một RESERVE/CONSUME/RESTOCK cho mỗi đơn, quantity về3; không tạo tiền thu/hoàn.

`catalog-mutations-runtime58.json` kiểm tiếp trên desktop current source: CREATE thật commit rồi mất ACK503, UI khóa tạo, tìm lại đúng một Product; legacy unknown axis chỉ bỏ khi Seller chủ động; Admin đổi allowed values trong lúc nhập gây422, draft SKU/giá/typed0/false vẫn giữ và chọn giá trị hợp lệ để tiếp tục. Hai ảnh lưu thật, reorder commit rồi mất ACK, UI khóa mutation, reload đọc lại đúng thứ tự rồi bỏ một ảnh. SQL đọc lại đúng3variant, không obsolete axis, không tồn/giữ. Ảnh là SVG URL localhost có route kiểm soát tại Seller, không phải nghiệm thu upload/CDN/provider bên ngoài.

## Gate và dữ liệu giữ lại

Artifact root: `artifacts/core-fix/fix-20261030T100153Z/`.

- `catalog-ui58-final.json`: **26 Edge desktop PASS**, 1mobileSKIPPED theo yêu cầu; form create/validation, dirty Back/Forward, server search, scoped editor, replacement variants/version, ảnh và kho. `catalog-images-ui58.json`: **13PASS**, 2mobileSKIPPED; fallback và các nhánh ảnh/điều hướng đã có. Tổng39ca fixture khác nhau, không tính screenshot/assertion thành ca mới.
- Hai hành trình thật nêu trên **PASS**; source cuối58 bao gồm fallback checkout. Trial SKU fixture trùng món nền bị409 đúng, không gọi là bug; đổi prefix fixture. Run2 lộ lỗi Back; run3 qua trước sửa ảnh và giữ làm bằng chứng cũ. Không ghi đè report thất bại.
- `catalog-final-state58.json`: SELECT độc lập trên cả4lượt publish và1lượt mutation. **9Store LOCKED;906Product STOPPED;941dòng inventory khớp tổng ledger, reserved0;894reader seed;4đơn CANCELLED/RESTOCKED,0money/refund/cart**. Ba target đã nhập đều quantity3;8variant món nền quantity10;930variant còn lại0. Audit Product mỗi target CREATE1, VARIANT_ADD11, IMAGE_ADD2, IMAGE_REORDER1; product mutation CREATE1/VARIANT_ADD2/reorder1. Không xóa lịch sử giao dịch.
- Đã xem ảnh checkout trước/sau fallback và ảnh taxonomy lỗi. Bản nháp giữ, trường màu cũ nêu rõ không hợp lệ; checkout hiển thị đủ hai Store, snapshot món/lượng/giá và tổng281000.
- Build frontend **2076modules PASS**, cảnh báo main chunk lớn cũ còn. `source-match-catalog58.json`/`runtime-image-catalog58.json`:395backend/43AI/318frontend-contract-test-config/10images khớp; backend/AI unchanged56, không tuyên bố chạy lại unit/SQL integration/Python của56.
- Gate contract/drift/docs/typing/whitespace/secret được ghi trong `catalog-gates58.json`; nghiệm thu chỉ khi tất cả PASS. Đây không phải100đơn/F17 hoặc sáu chuỗi cuối. Không báo PASS cho mobile, physical device, screen reader, native zoom hoặc nghiên cứu người thật.

Phần quyền/taxonomy/kho/chưa rõ kết quả của F07 nối bằng chứng các đợt26/29/41/47/51, giữ nguyên giới hạn của từng lượt. Bằng chứng hiện tại bổ sung chính công việc còn thiếu: đưa món từ nháp qua đủ phân loại/ảnh/kho/mở bán tới khách mua thật nhiềuStore. Tiếp theo vẫn cần F17CR-021/UX-10 với dataset100đơn và nghiệm thu cuối F18.
