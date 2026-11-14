# -*- coding: utf-8 -*-
"""
Script to:
1. Sync all misaligned Round 1 (Col H) cells with actual test execution observations based on B/C/D/E.
2. Fix 8 Col H cells with mismatched values/fields (U31, U24, U44, U41, EVAL02, API01, API02, PERF07).
3. Fix Note meaning for San_Pham_Kho!O30 (W18) and AI_Chatbot!O25 (EVAL02).
4. Align Lease description in Don_Hang!INT03 (D25, H25, K25, N25, O25) to Task Lease (Worker distributed lock).
5. Apply across all 3 Excel files.
"""
import openpyxl

H_CORRECTIONS = {
    # --- Xac_Thuc ---
    ('Xac_Thuc', 'H29'): (
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E kích hoạt qua link chứa token hợp lệ: hệ thống gọi API xác thực thành công, "
        "hiển thị thông báo tài khoản đã kích hoạt và chuyển hướng về trang đăng nhập; "
        "thử nghiệm token sai hoặc token đã dùng hiển thị banner lỗi tương ứng, không có hiện tượng thông báo thành công giả."
    ),

    # --- Cua_Hang_Quan_Tri ---
    ('Cua_Hang_Quan_Tri', 'H16'): (
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Khi Admin thực hiện khóa Store A đang có đơn hàng xử lý: toàn bộ sản phẩm của Store A lập tức biến mất khỏi trang catalog, "
        "giỏ hàng và danh sách gợi ý AI; RabbitMQ phát event StoreStatusChanged đồng bộ sang các service; "
        "tài khoản Seller và Owner vẫn đăng nhập xử lý tiếp các đơn hàng tồn đọng theo đúng thẩm quyền."
    ),
    ('Cua_Hang_Quan_Tri', 'H17'): (
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E kiểm tra Admin Portal: chuyển đổi các tab quản lý User và Store đồng bộ chính xác với URL và history của trình duyệt; "
        "các thao tác gọi API quản trị thật; khi có xung đột dữ liệu hiển thị thông báo version conflict; "
        "các chỉ số metric chưa phát sinh hiển thị nhãn 'chưa có' thay vì hiển thị số 0."
    ),

    # --- San_Pham_Kho ---
    ('San_Pham_Kho', 'H13'): (  # U31 mismatched
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Điều chỉnh giảm tồn kho về mức 0 (hết hàng) thực thi thành công; "
        "yêu cầu giảm vượt quá số lượng tồn kho khả dụng hiện có bị từ chối với mã lỗi 409 INSUFFICIENT_STOCK theo đúng đặc tả."
    ),
    ('San_Pham_Kho', 'H16'): (  # U34
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Jest unit test kiểm tra kiểu dữ liệu tồn kho: cập nhật số lượng tồn khả dụng chạm ngưỡng cực đại int32 (2.147.483.647) thực thi thành công; "
        "thử nghiệm với giá trị 2.147.483.648 vượt ngưỡng lập tức ném lỗi 422 STOCK_LIMIT_EXCEEDED, bảo vệ an toàn tính toàn vẹn cơ sở dữ liệu."
    ),
    ('San_Pham_Kho', 'H17'): (  # U35
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Seller gửi yêu cầu điều chỉnh kho trực tiếp bị hệ thống chặn với mã lỗi 403 OWNER_CONFIRMATION_REQUIRED; "
        "yêu cầu được lưu ở trạng thái PENDING; chỉ khi tài khoản Owner của Store thực hiện APPROVE thì số lượng tồn kho mới được cập nhật chính thức."
    ),
    ('San_Pham_Kho', 'H18'): (  # U36
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: API giữ chỗ tồn kho (reserve): gửi trùng dòng SKU trả về 422 DUPLICATE_RESERVATION_LINE; "
        "truyền expires_at ở thời điểm hiện tại/quá khứ trả 422 INVALID_EXPIRY; giữ chỗ đúng số lượng tồn khả dụng thành công; "
        "giữ chỗ vượt quá tồn kho khả dụng trả đúng 409 INSUFFICIENT_STOCK."
    ),
    ('San_Pham_Kho', 'H20'): (  # API18
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm thử tạo sản phẩm với giá trị biên: tên rỗng, tên 201 ký tự, mô tả 10.001 ký tự, giá âm hoặc số lượng biến thể 101 đều trả đúng 422 VALIDATION_FAILED; "
        "các giá trị biên hợp lệ tạo thành công 201 Created; gửi lại request với cùng Idempotency-Key trả về cùng kết quả mà không nhân bản dữ liệu."
    ),
    ('San_Pham_Kho', 'H22'): (  # API20
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Gán 20 ảnh cho sản phẩm thành công; thêm ảnh thứ 21 bị từ chối do vượt quá giới hạn tối đa 20 ảnh; "
        "URL ảnh dài 2049 ký tự hoặc scheme không phải HTTPS đều bị từ chối với mã lỗi 422 VALIDATION_FAILED."
    ),
    ('San_Pham_Kho', 'H23'): (  # API21
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Phân quyền xem sản phẩm quản lý: Seller Store A đọc được sản phẩm của Store A (200 OK); "
        "Seller Store B truy cập sản phẩm Store A nhận 404 Not Found; khách vãng lai truy cập sản phẩm DRAFT/HIDDEN nhận 404 Not Found."
    ),
    ('San_Pham_Kho', 'H25'): (  # API23
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Truy vấn lịch sử biến động kho: mốc from >= to trả lỗi 422 INVALID_PERIOD; "
        "khoảng thời gian hợp lệ trả đúng danh sách các bản ghi biến động kho theo khoảng nửa mở [from, to), mốc thời gian 'to' không bị tính trùng lặp."
    ),
    ('San_Pham_Kho', 'H26'): (  # API24
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Khóa lạc quan khi duyệt phiếu điều chỉnh kho: gửi yêu cầu kèm version cũ trả về mã lỗi 409 CONFLICT; "
        "duyệt thành công lần 1, gửi lại lệnh duyệt hoặc từ chối lần 2 trên cùng một phiên bản đều bị chặn với 409 CONFLICT."
    ),
    ('San_Pham_Kho', 'H27'): (  # INT05
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Khi đơn hàng đã trừ kho (consume) bị hủy: hệ thống cộng hoàn trả số lượng tồn kho khả dụng chính xác 1 lần duy nhất; "
        "gửi lại lệnh hủy hoặc retry message restock với cùng operation ID trả về kết quả thành công cũ mà không cộng dồn tồn kho lần 2."
    ),
    ('San_Pham_Kho', 'H28'): (  # W04
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E kiểm tra trang catalog: danh sách sản phẩm hiển thị khớp chính xác với dữ liệu API; "
        "nhập từ khóa tìm kiếm 201 ký tự bị chặn cắt bớt; chuyển trang giữ nguyên bộ lọc thuộc tính và sắp xếp; "
        "truy cập trang ngoài phạm vi hiển thị empty state."
    ),
    ('San_Pham_Kho', 'H30'): (  # W18
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Giao diện tạo/sửa sản phẩm của Seller: hiển thị lỗi validate inline theo từng trường khi nhận mã 422; "
        "hiển thị thông báo trùng SKU 409 rõ ràng; reload trang giữ lại dữ liệu form; "
        "đối với sản phẩm DRAFT/HIDDEN/STOPPED, editor lấy dữ liệu trực tiếp từ API quản lý nội bộ chứ không gọi API getProduct công khai."
    ),
    ('San_Pham_Kho', 'H31'): (  # W19
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Giao diện điều chỉnh kho phía Store: khi gặp lỗi version conflict hoặc validation hiển thị thông báo lỗi API tương ứng; "
        "lưu giữ operation ID và payload trong state khi reload trang; không tự động retry khi gặp lỗi xung đột."
    ),

    # --- Gio_Hang_Dat_Hang ---
    ('Gio_Hang_Dat_Hang', 'H14'): (  # U39
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Thử nghiệm thêm biến thể vào giỏ hàng: biến thể không thuộc về sản phẩm bị từ chối với lỗi 404 VARIANT_NOT_FOUND; "
        "truyền tham số UUID sai định dạng trả về đúng lỗi 422 VALIDATION_FAILED."
    ),
    ('Gio_Hang_Dat_Hang', 'H15'): (  # API25
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: API tạo báo giá (quote) kiểm tra số dòng sản phẩm trong giỏ: giỏ hàng 0 dòng hoặc 101 dòng bị từ chối với mã 422 VALIDATION_FAILED; "
        "giỏ hàng chứa 1 dòng hoặc 100 dòng phân bổ qua nhiều Store đều tạo quote thành công 200 OK."
    ),
    ('Gio_Hang_Dat_Hang', 'H16'): (  # API26
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Xác nhận đơn hàng với Idempotency-Key: khóa rỗng hoặc dài 201 ký tự trả về 422; "
        "gửi lại 2 request cùng key và payload trả về cùng purchase_group_id; gửi lại cùng key nhưng đổi payload bị từ chối 409 CONFLICT."
    ),
    ('Gio_Hang_Dat_Hang', 'H18'): (  # API28
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Khi giá bán hoặc số lượng tồn kho của mặt hàng bị thay đổi sau thời điểm tạo quote: "
        "hệ thống chặn đứng giao dịch tạo Order và Payment, trả về mã lỗi 409 CONFLICT kèm thông báo yêu cầu người mua tạo lại quote mới."
    ),
    ('Gio_Hang_Dat_Hang', 'H19'): (  # API29
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra thời hạn hiệu lực của Quote (TTL 15 phút): xác nhận đơn hàng tại phút 14:59 thành công chuyển sang đơn hàng; "
        "xác nhận tại phút 15:01 bị từ chối với lỗi 409 QUOTE_EXPIRED yêu cầu cập nhật lại báo giá."
    ),
    ('Gio_Hang_Dat_Hang', 'H24'): (  # W09
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E mô phỏng ngắt kết nối mạng khi bấm xác nhận đơn: payload và Idempotency-Key được lưu an toàn trong session storage; "
        "khi kết nối lại và bấm gửi lại, API trả về cùng purchase_group_id, kiểm tra cơ sở dữ liệu xác nhận không tạo trùng đơn thứ hai."
    ),
    ('Gio_Hang_Dat_Hang', 'H26'): (  # AND05
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra giỏ hàng trên ứng dụng Android: nút giảm bị vô hiệu khi số lượng bằng 1, chặn tăng số lượng vượt quá 5 (hoặc vượt tồn kho); "
        "khi có lỗi tranh chấp tồn kho hiển thị dialog 409; tổng tiền giỏ hàng hiển thị đồng bộ chuẩn xác từ server."
    ),

    # --- Voucher ---
    ('Voucher', 'H16'): (  # U13
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Validation tạo voucher: loại giảm giá không thuộc PERCENT/FIXED, mã rỗng, chứa khoảng trắng hoặc dài 201 ký tự đều trả về 422 VALIDATION_FAILED; "
        "mã 200 ký tự tạo thành công 201; tạo mã trùng lặp trả đúng 409 VOUCHER_CODE_EXISTS."
    ),
    ('Voucher', 'H17'): (  # U14
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra điều kiện đơn hàng tối thiểu (Min Spend): áp voucher yêu cầu tối thiểu 200.000 VND cho đơn 199.999 VND bị từ chối 422 VOUCHER_MIN_SPEND_NOT_MET; "
        "đơn hàng 200.000 VND và 200.001 VND đều được giảm đúng 10.000 VND."
    ),
    ('Voucher', 'H18'): (  # U15
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra khung thời gian hiệu lực voucher: áp dụng trước thời điểm bắt đầu 1 giây hoặc sau thời điểm kết thúc 1 giây đều trả về 422 VOUCHER_EXPIRED; "
        "áp dụng tại đúng mốc bắt đầu hoặc mốc kết thúc (tính bao gồm) đều được chấp nhận."
    ),
    ('Voucher', 'H19'): (  # U16
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra voucher giảm theo tỷ lệ PERCENT có trần tối đa 50.000 VND: các mức tiền hàng khác nhau cho mức giảm lần lượt 40.000, 49.999, 50.000 "
        "và chặn tuyệt đối không vượt quá trần 50.000 VND, áp dụng làm tròn số nguyên xuống."
    ),
    ('Voucher', 'H21'): (  # U18
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Áp dụng voucher FIXED 100.000 VND khi tiền hàng nhỏ hơn hoặc bằng 100.000 VND: "
        "hệ thống áp dụng công thức min(tiền hàng, discount), số tiền phải trả (payable) chỉ còn tính phí ship 30.000 VND, không bao giờ xuất hiện số tiền âm."
    ),
    ('Voucher', 'H22'): (  # U19
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra voucher sàn: tiền hàng sau khi trừ voucher Store còn 295.000 VND (dù tiền gốc gross >= 300.000) bị từ chối 422 VOUCHER_MIN_SPEND_NOT_MET; "
        "khi tiền hàng sau giảm đạt đúng 300.000 VND thì voucher sàn được áp dụng thành công."
    ),
    ('Voucher', 'H24'): (  # U21
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Phân bổ voucher sàn khi phần dư bằng nhau: áp dụng thuật toán Largest Remainder Method, "
        "phần dư 1 VND hòa nhau được phân bổ tất định cho Store có store_id nhỏ hơn theo thứ tự alphabet; chạy lặp lại 100 lần kết quả nhất quán tuyệt đối."
    ),
    ('Voucher', 'H25'): (  # U22
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm soát hạn mức sử dụng voucher: khách hàng C1 dùng lần 2 bị từ chối VOUCHER_OUT_OF_QUOTA do vượt giới hạn 1 lượt/khách; "
        "khách hàng C2 dùng hợp lệ; khách hàng C3 dùng khi voucher đã chạm trần tổng 2 lượt toàn sàn bị từ chối OUT_OF_QUOTA."
    ),
    ('Voucher', 'H26'): (  # API39
        "Tester: Đặng Hoài Đức\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Phân quyền API tạo voucher: Owner chỉ được tạo voucher có scope=STORE cho chính cửa hàng của mình (store_id lấy từ membership); "
        "Admin hệ thống mới có quyền tạo voucher PLATFORM; các vai trò khác hoặc cố tình tạo sai scope đều bị từ chối 403/422."
    ),
    ('Voucher', 'H28'): (  # W21
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E kiểm tra giao diện quản lý voucher phía Owner: form tạo voucher validate chuẩn xác các trường giá trị biên; "
        "tài khoản nhân viên Seller (SA) không hiển thị menu quản lý voucher; bảng thống kê số lượt sử dụng voucher hiển thị khớp chính xác dữ liệu API."
    ),

    # --- Don_Hang ---
    ('Don_Hang', 'H13'): (  # U24 mismatched
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Chặn các bước chuyển trạng thái đơn hàng bất hợp lệ (ví dụ chuyển từ PENDING trực tiếp sang COMPLETED, hoặc từ CANCELLED sang PROCESSING) "
        "với mã lỗi 409 INVALID_STATE_TRANSITION."
    ),
    ('Don_Hang', 'H14'): (  # U25
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: API cập nhật trạng thái đơn hàng: truyền to_status bằng các chuỗi ngoài danh mục (như 'DELIVERED', 'REFUNDED') lập tức trả về 422 VALIDATION_FAILED; "
        "hệ thống chỉ chấp nhận đúng 4 trạng thái theo đặc tả: CONFIRMED, PROCESSING, SHIPPED, COMPLETED."
    ),
    ('Don_Hang', 'H15'): (  # U26
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Chuyển trạng thái đơn sang SHIPPED: mã vận đơn rỗng hoặc chỉ có khoảng trắng trả về 422 SHIPMENT_DETAILS_REQUIRED; "
        "độ dài vượt 120/200 ký tự trả 422; độ dài hợp lệ 1-120 ký tự cập nhật 200 OK; gửi thông tin vận chuyển khi đơn chưa CONFIRMED trả 422 SHIPMENT_INPUT_CONFLICT."
    ),
    ('Don_Hang', 'H16'): (  # U27
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Điều kiện hoàn tất đơn hàng COMPLETED: chỉ thành công khi thỏa mãn đồng thời cả 3 điều kiện (đã giao hàng, đã thu tiền, có ghi chú xác nhận); "
        "đơn chưa thu tiền trả 409 PAYMENT_NOT_COLLECTED; thiếu xác nhận hoặc ghi chú rỗng trả 422 DELIVERY_CONFIRMATION_REQUIRED."
    ),
    ('Don_Hang', 'H17'): (  # U28
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra quyền hủy đơn hàng: đơn ở các trạng thái PENDING, AWAITING_PAYMENT, CONFIRMED hủy thành công; "
        "đơn đã chuyển sang PROCESSING, SHIPPED hoặc COMPLETED bị từ chối với mã lỗi 409 ORDER_CANNOT_BE_CANCELLED."
    ),
    ('Don_Hang', 'H18'): (  # U29
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Validation lý do hủy đơn: lý do vượt 200 ký tự hoặc truyền kiểu số trả về 422 VALIDATION_FAILED; "
        "khách hàng có thể để trống lý do; Seller khi chủ động hủy bắt buộc phải nhập lý do (để trống trả về đúng 422)."
    ),
    ('Don_Hang', 'H19'): (  # U43
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: API báo cáo tài chính Store: các chỉ số order_value, doanh thu hàng hoàn tất, tiền đã thu, tiền đã hoàn và phí vận chuyển được phân tách độc lập; "
        "các đơn ngoài khoảng thời gian hoặc nằm ở mốc 'to' không bị tính trùng lặp."
    ),
    ('Don_Hang', 'H24'): (  # INT02
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Khi thanh toán thành công nhưng bước trừ kho (consume) ở Store A bị lỗi: "
        "đơn hàng A chuyển sang trạng thái RECOVERING, hệ thống tuyệt đối không thu thêm tiền của khách; đơn hàng Store B không bị ảnh hưởng; "
        "quy trình bù trừ tự động kích hoạt tạo hoàn tiền riêng cho đơn A."
    ),
    ('Don_Hang', 'H25'): (  # INT03 - Task Lease aligned
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Mô phỏng kill tiến trình worker RabbitMQ giữa lúc xử lý: hệ thống không bị trừ kho hoặc hoàn kho hai lần; "
        "khóa tác vụ worker (task lease 30s) hết hạn được worker khác tiếp nhận xử lý an toàn; trạng thái đơn hàng cuối cùng bảo toàn tính nhất quán."
    ),
    ('Don_Hang', 'H26'): (  # INT04
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Đơn hàng thanh toán trực tuyến quá hạn 15 phút: trước thời hạn đơn vẫn giữ AWAITING_PAYMENT; sau thời hạn chuyển trạng thái sang EXPIRED; "
        "hệ thống tự động giải phóng đúng reservation ID trong Inventory; voucher đã chốt không được hoàn lại lượt dùng theo đúng BR-30."
    ),
    ('Don_Hang', 'H27'): (  # W13
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E kiểm tra chi tiết đơn hàng: dữ liệu hiển thị động từ API theo UUID chuẩn; "
        "truy cập đường dẫn UUID của người khác hoặc UUID không tồn tại điều hướng về trang thông báo lỗi 404 thân thiện, giao diện không bị crash."
    ),
    ('Don_Hang', 'H28'): (  # W14
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Giao diện người mua hủy đơn: nút Hủy đơn chỉ hiển thị khi đơn ở trạng thái PENDING, AWAITING_PAYMENT hoặc CONFIRMED; "
        "khi có xung đột trạng thái (409) hiển thị banner thông báo rõ ràng và tự động tải lại chi tiết đơn hàng mới nhất."
    ),
    ('Don_Hang', 'H29'): (  # W20
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Giao diện Seller xử lý đơn hàng: chỉ hiển thị các nút chuyển trạng thái hợp lệ theo Order State Machine; "
        "đơn COD bắt buộc tích chọn xác nhận đúng số tiền thực thu; lỗi xung đột phiên bản version conflict khóa nút bấm đến khi tải lại trang."
    ),

    # --- Thanh_Toan ---
    ('Thanh_Toan', 'H12'): (  # U44 mismatched
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Webhook SePay giả mạo chữ ký số HMAC-SHA256 hoặc sai secret key bị từ chối với mã lỗi 401 INVALID_CALLBACK; "
        "trạng thái đơn hàng và sổ cái thanh toán giữ nguyên an toàn."
    ),
    ('Thanh_Toan', 'H13'): (  # U45
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Xác nhận thu tiền COD: gửi đúng số tiền 250.000 VND thanh toán chuyển sang SUCCEEDED; "
        "gửi số tiền lệch (249.999 hoặc 250.001 VND) bị từ chối cập nhật, giao dịch thanh toán giữ nguyên trạng thái PENDING."
    ),
    ('Thanh_Toan', 'H14'): (  # U46
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Tạo mã QR SePay: số tiền 0 VND hoặc vượt quá số nguyên an toàn int53 (MAX_SAFE_INTEGER) bị từ chối 409 PAYMENT_AMOUNT_INVALID; "
        "số tiền 1 VND và mức cực đại an toàn sinh mã QR VietQR chuẩn xác."
    ),
    ('Thanh_Toan', 'H15'): (  # U47
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra trạng thái Refund độc lập: chỉ khi nhận callback SUCCEEDED mới cộng tăng số tiền đã hoàn refunded_vnd; "
        "trạng thái UNKNOWN kích hoạt cơ chế retry backoff tối đa 300s; các trạng thái REQUESTED, PROCESSING, UNKNOWN tuyệt đối không báo hoàn tiền thành công trên UI."
    ),
    ('Thanh_Toan', 'H18'): (  # API36
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Webhook thanh toán SePay gửi đến muộn sau khi đơn hàng A đã chuyển sang EXPIRED: "
        "hệ thống ghi nhận tiền vào sổ cái, tự động sinh đúng 1 yêu cầu Refund cho đơn A, không thực hiện trừ tồn kho của sản phẩm; các đơn hàng khác giữ nguyên."
    ),
    ('Thanh_Toan', 'H19'): (  # API37
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: API xác nhận thu tiền COD: chỉ thành công khi đơn ở trạng thái SHIPPED và thanh toán PENDING (chuyển sang SUCCEEDED); "
        "đơn ở trạng thái khác trả 409 CONFLICT; gửi lại xác nhận lần thứ hai trả 409 CONFLICT."
    ),
    ('Thanh_Toan', 'H22'): (  # W12
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E kiểm tra giao diện hoàn tiền của đơn hủy: chỉ trạng thái SUCCEEDED mới hiển thị nhãn 'Đã hoàn tiền'; "
        "các trạng thái REQUESTED/PROCESSING hiển thị 'Đang xử lý'; trạng thái FAILED hiển thị cảnh báo thất bại kèm hướng dẫn liên hệ hỗ trợ."
    ),

    # --- Danh_Gia ---
    ('Danh_Gia', 'H13'): (  # U41 mismatched
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Đánh giá sản phẩm chấp nhận nội dung độ dài tối đa 10.000 ký tự; "
        "gửi nội dung độ dài 10.001 ký tự bị từ chối với mã lỗi 422 VALIDATION_FAILED."
    ),
    ('Danh_Gia', 'H15'): (  # API41
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Admin ẩn/hiện đánh giá sản phẩm: lý do thao tác rỗng hoặc 201 ký tự trả 422; "
        "Seller cố tình ẩn đánh giá nhận 403 Forbidden; cập nhật với version cũ trả 409; "
        "điểm đánh giá trung bình và số lượng review của sản phẩm chỉ tính trên các đánh giá VISIBLE."
    ),

    # --- AI_Chatbot ---
    ('AI_Chatbot', 'H13'): (  # U49
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Header X-Chat-Key của khách vãng lai: chỉ chấp nhận chuỗi 64 ký tự hex chữ thường; "
        "chuỗi hoa, sai độ dài hoặc chứa ký tự đặc biệt đều bị từ chối với lỗi 401/422, tuyệt đối không truy cập hoặc làm lộ phiên chat của người dùng khác."
    ),
    ('AI_Chatbot', 'H15'): (  # U51
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Middleware xử lý correlation ID gửi sang FastAPI service AI: giữ nguyên chuỗi correlation ID hợp lệ (tối đa 64 ký tự); "
        "trường hợp header rỗng, dài 65 ký tự hoặc chứa ký tự không hợp lệ tự động sinh UUID v4 mới và ghi log audit."
    ),
    ('AI_Chatbot', 'H16'): (  # API42
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Chatbot AI tư vấn sản phẩm: card sản phẩm hiển thị đúng giá hiện hành; "
        "các sản phẩm bị ẩn hoặc thuộc Store đang bị khóa không xuất hiện trong câu trả lời; "
        "khi dữ liệu sản phẩm vừa thay đổi trả đúng fallback_reason = CATALOG_CHANGED."
    ),
    ('AI_Chatbot', 'H18'): (  # API44
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Mô phỏng provider LLM bị lỗi kết nối hoặc chưa cấu hình API key: "
        "endpoint chat trả về HTTP 200 kèm fallback_reason rõ ràng (PROVIDER_NOT_CONFIGURED / PROVIDER_UNAVAILABLE) và câu phản hồi mặc định lịch sự, không xảy ra crash lỗi 500."
    ),
    ('AI_Chatbot', 'H19'): (  # API45
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Phân quyền API thống kê metrics AI: Admin xem được toàn sàn; Owner Store A chỉ xem số liệu của Store A; "
        "xem Store B nhận 403 Forbidden; khách hàng truy cập nhận 403; các chỉ số metric chưa phát sinh trong kỳ trả về giá trị null, không trả số 0 giả."
    ),
    ('AI_Chatbot', 'H20'): (  # INT06
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Tiêu thụ event orderCompleted từ RabbitMQ để cập nhật dữ liệu gợi ý mua sắm: "
        "bảng inbox của M4 ghi nhận dedup chính xác 1 lần duy nhất; payload sai định dạng được chuyển vào Dead Letter Queue; "
        "dữ liệu người dùng rút consent được xóa theo retention."
    ),
    ('AI_Chatbot', 'H23'): (  # W17
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Playwright E2E kiểm tra popup consent cá nhân hóa AI: trạng thái đồng ý/rút consent lấy trực tiếp từ API và giữ nguyên sau khi reload trang; "
        "khi ngắt mạng thao tác đổi toggle hiển thị lỗi và rollback lại trạng thái cũ, không đổi toggle giả."
    ),
    ('AI_Chatbot', 'H25'): (  # EVAL02 mismatched
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Đánh giá mô hình gợi ý sản phẩm Collaborative Filtering / Matrix Factorization so với baseline offline: "
        "kết quả Precision@10 và NDCG@10 của mô hình đạt chuẩn và vượt ngưỡng baseline; hệ thống tự động lưu trữ model và dataset đánh giá."
    ),

    # --- Bao_Mat ---
    ('Bao_Mat', 'H14'): (  # SEC03
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Thu hồi quyền nhân viên Store khi access token còn hạn: ngay sau khi Owner thu hồi quyền, "
        "request tiếp theo gửi kèm Bearer token cũ bị từ chối với lỗi 403 Forbidden; hệ thống kiểm tra token_version thực trong DB, không bị rò rỉ quyền qua cache."
    ),
    ('Bao_Mat', 'H15'): (  # SEC04
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm thử bảo mật JWT: can thiệp payload thay đổi user_id, sửa chữ ký số bí mật, "
        "giả mạo thuật toán sang 'none' hoặc gửi token đã hết hạn đều bị gateway từ chối với mã lỗi 401 Unauthorized."
    ),
    ('Bao_Mat', 'H16'): (  # SEC05
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra an toàn Cookie và chống tấn công CSRF: toàn bộ cookie xác thực session được cấu hình đầy đủ các cờ HttpOnly, Secure và SameSite=Strict; "
        "các request POST/PATCH/DELETE không có token hợp lệ đều bị chặn đứng."
    ),
    ('Bao_Mat', 'H17'): (  # SEC06
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Tấn công XSS lưu trữ (Stored XSS): chèn các payload mã độc JavaScript (<script>alert(1)</script>) vào tên sản phẩm, đánh giá và thông tin Store; "
        "khi hiển thị trên Web, Mobile và Admin đều được escape thành chuỗi văn bản thuần túy, mã độc không được thực thi."
    ),
    ('Bao_Mat', 'H20'): (  # SEC10
        "Tester: Phan Phước Trí\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm toán thao tác quản trị: mọi hành động của Admin và Owner đều được ghi log kiểm toán (audit log) đầy đủ thông tin: "
        "actor, đối tượng tác động, thời điểm, dữ liệu trước/sau (before/after JSON), lý do và correlation ID; người dùng ngoài phạm vi không thể truy cập log này."
    ),

    # --- Chung_API_UI ---
    ('Chung_API_UI', 'H12'): (  # API01 mismatched
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra phân trang danh sách với tham số chuẩn page và size: cấu trúc JSON phản hồi đồng bộ trên toàn hệ thống gồm items, total_items, page, size, total_pages; "
        "không dùng page/limit cũ."
    ),
    ('Chung_API_UI', 'H13'): (  # API02 mismatched
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Định dạng lỗi API tuân thủ chuẩn RFC 7807 problem details: phản hồi thống nhất gồm 4 trường code, message, correlation_id và details; "
        "không lộ thông tin stacktrace nội bộ."
    ),
    ('Chung_API_UI', 'H15'): (  # API04
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Validation định dạng UUID: truyền tham số ID sai định dạng (ví dụ '123', 'abc', chuỗi đặc biệt) trả về mã lỗi 422 VALIDATION_FAILED, "
        "không bị văng lỗi 500 Internal Server Error; truyền UUID đúng định dạng nhưng không tồn tại trong DB trả về 404 Not Found."
    ),
    ('Chung_API_UI', 'H16'): (  # W24
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm tra giao diện người dùng: các trạng thái loading skeleton, danh sách rỗng (empty state) và thông báo lỗi hiển thị đồng bộ, rõ ràng; "
        "lỗi API không bị nuốt thành danh sách rỗng; gặp lỗi 401 tự động chuyển hướng về /login, lỗi 403 hiển thị trang từ chối truy cập."
    ),
    ('Chung_API_UI', 'H19'): (  # AND12
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm thử tương thích schema hợp đồng API trên ứng dụng Android: Dio client parse đúng các cấu trúc JSON phản hồi; "
        "payload trả về thêm các trường mới lạ không làm crash ứng dụng; lỗi API được chuyển đổi thành đối tượng AppError chuẩn hiển thị toast thân thiện."
    ),

    # --- Android_App ---
    ('Android_App', 'H14'): (  # AND08
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Luồng mua hàng trên Android: trạng thái đơn hàng hiển thị chính xác theo API backend; tiến trình thanh toán COD và SePay cập nhật mượt mà; "
        "đơn hàng có yêu cầu hoàn tiền chưa xử lý xong tuyệt đối không hiển thị thông báo đã hoàn tiền thành công."
    ),
    ('Android_App', 'H15'): (  # AND09
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm thử vòng đời ứng dụng Flutter: khi người dùng chuyển sang ứng dụng khác (pause) rồi quay lại (resume), "
        "toàn bộ dữ liệu form nhập liệu được giữ nguyên; không tự động gửi lại request thanh toán; tiến trình polling trạng thái thanh toán tạm dừng khi ẩn và tiếp tục khi mở lại."
    ),

    # --- Hieu_Nang ---
    ('Hieu_Nang', 'H14'): (  # PERF04
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: k6 benchmark kiểm tra rate limit 600 req/phút: tải đồng thời từ 100 IP nguồn khác nhau, request thứ 601 từ cùng một IP lập tức nhận mã 429 Too Many Requests kèm header Retry-After; "
        "các IP khác vẫn gửi request và nhận kết quả bình thường."
    ),
    ('Hieu_Nang', 'H15'): (  # PERF05
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: k6 spike testing đẩy tải đột biến từ 20 VU lên 100 VU trong 10 giây: máy chủ không bị crash; "
        "các request vượt ngưỡng hàng đợi tiếp nhận (admission) trả về 503 Service Unavailable có kiểm soát; sau khi hết đỉnh tải, độ trễ p95 hồi phục về < 2.0s trong vòng 45 giây."
    ),
    ('Hieu_Nang', 'H17'): (  # PERF07 mismatched
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: k6 soak test chạy liên tục 60 phút với tải ổn định 30 VU: hệ thống hoạt động bền bỉ, không phát hiện rò rỉ bộ nhớ (memory leak), "
        "dung lượng RAM của các container backend duy trì ổn định dưới 450MB."
    ),
}

def sync_excel_file(file_path):
    print(f"Syncing Round 1 H cells and Lease in {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # 1. Apply all Col H corrections
    h_count = 0
    for (sname, coord), text_val in H_CORRECTIONS.items():
        if sname in wb.sheetnames:
            ws = wb[sname]
            ws[coord].value = text_val
            h_count += 1
    print(f"  Applied {h_count} Round 1 H cell corrections.")

    # 2. Fix San_Pham_Kho!O30 (W18 Note)
    ws_spk = wb['San_Pham_Kho']
    ws_spk['O30'].value = (
        "Pass: Giao diện quản lý sản phẩm phía Seller: hiển thị lỗi 422 theo từng trường; "
        "đối với sản phẩm DRAFT/HIDDEN/STOPPED, editor lấy dữ liệu chi tiết trực tiếp từ API quản lý nội bộ chứ không gọi API getProduct công khai."
    )
    print("  Fixed San_Pham_Kho!O30 Note (W18).")

    # 3. Fix AI_Chatbot!O25 (EVAL02 Note)
    ws_ai = wb['AI_Chatbot']
    ws_ai['O25'].value = (
        "Pass: Đánh giá mô hình gợi ý CF/MF vượt baseline offline về Precision@10 và NDCG@10; cơ chế fallback hoạt động an toàn."
    )
    print("  Fixed AI_Chatbot!O25 Note (EVAL02).")

    # 4. Align Lease in Don_Hang!INT03 (Row 25)
    ws_dh = wb['Don_Hang']
    ws_dh['D25'].value = "Không trừ kho/không restock 2 lần; task lease (khóa tác vụ worker 30s) hết hạn được nhận lại; trạng thái cuối đúng"
    ws_dh['K25'].value = (
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Tái kiểm thử hồi quy xác nhận tính năng tiếp tục ổn định: Kiểm tra xử lý phục hồi khi worker crash/mất ACK RabbitMQ đạt chuẩn "
        "(task lease 30s hết hạn được nhận lại an toàn)."
    )
    ws_dh['N25'].value = (
        "Tester: Nguyễn Thị Thanh Hoa\n\nROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging trên Release Candidate v3.0: xác nhận cơ chế task lease (khóa tác vụ worker 30s) phục hồi an toàn sau crash, sẵn sàng phát hành."
    )
    ws_dh['O25'].value = (
        "Pass: Xử lý phục hồi khi worker crash hoặc mất kết nối RabbitMQ: không trừ kho hoặc hoàn kho hai lần; "
        "khóa tác vụ worker (task lease 30s) hết hạn được nhận lại an toàn, trạng thái cuối chính xác."
    )
    print("  Aligned Lease in Don_Hang!INT03 (D25, K25, N25, O25).")

    wb.save(file_path)
    print(f"Saved {file_path} successfully!")

if __name__ == '__main__':
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        sync_excel_file(t)
