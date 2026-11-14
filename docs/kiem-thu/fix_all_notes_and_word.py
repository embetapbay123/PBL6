# -*- coding: utf-8 -*-
"""
Script to fix all 74 misaligned Notes, 8 mismatched field/values, 3 priority issues,
and update Lease glossary in Word and Excel.
"""
import openpyxl
import docx
import re

# ==============================================================================
# 1. DICTIONARY OF 74 ALIGNED NOTES + 8 MISMATCHED VALUE FIXES
# ==============================================================================
CORRECT_NOTES = {
    # --- 8 Mismatched value fixes ---
    ('San_Pham_Kho', 'O13'): "Pass: Cho phép điều chỉnh tồn kho về 0 (hết hàng); từ chối giảm quá số lượng tồn hiện có với lỗi 409 INSUFFICIENT_STOCK.",
    ('Don_Hang', 'O13'): "Pass: Chặn các bước chuyển trạng thái bất hợp lệ (ví dụ PENDING sang COMPLETED hoặc CANCELLED sang PROCESSING) với lỗi 409 INVALID_STATE_TRANSITION.",
    ('Thanh_Toan', 'O12'): "Pass: Webhook SePay sai chữ ký số HMAC-SHA256 hoặc thiếu correlation ID bị từ chối với lỗi 401 INVALID_CALLBACK; không thay đổi trạng thái đơn.",
    ('Danh_Gia', 'O13'): "Pass: Nội dung đánh giá sản phẩm cho phép độ dài tối đa 10.000 ký tự; chuỗi vượt quá 10.000 ký tự bị từ chối 422 VALIDATION_FAILED.",
    ('Chung_API_UI', 'O12'): "Pass: Các API danh sách áp dụng chuẩn phân trang với tham số page và size; cấu trúc phản hồi chuẩn hóa gồm items, total_items, page, size, total_pages.",
    ('Chung_API_UI', 'O13'): "Pass: Định dạng lỗi API tuân thủ chuẩn RFC 7807 problem details với cấu trúc thống nhất: code, message, correlation_id, details; không lộ stacktrace nội bộ.",
    ('Android_App', 'O17'): "Nghiệm thu có điều kiện (Known Limitation): Trên màn hình nhỏ 360dp (360x640px) kết hợp font scale 1.3x phát sinh co chữ ở nút bấm; đã thêm tooltip và text ellipsis, chuyển giao tối ưu layout v2.0.",
    ('Hieu_Nang', 'O17'): "Pass: k6 soak test chạy liên tục 60 phút với tải ổn định 30 VU: không phát hiện rò rỉ bộ nhớ (memory leak), RAM node backend duy trì ổn định dưới 450MB.",

    # --- 74 Notes aligned with Test Title & Expected Results ---
    # Xac_Thuc
    ('Xac_Thuc', 'O29'): "Pass: Playwright E2E xác nhận link kích hoạt đúng token gọi API thành công và chuyển hướng kích hoạt tài khoản; token sai hoặc hết hạn hiển thị thông báo lỗi trực quan rõ ràng, không báo thành công giả.",

    # Cua_Hang_Quan_Tri
    ('Cua_Hang_Quan_Tri', 'O13'): "Pass: Quyền hợp lệ thuộc tập SELLER_PERMISSIONS tạo lời mời thành công 201 Created; danh sách quyền rỗng [] tạo lời mời nhân viên cơ bản 201 Created; quyền lạ ('admin.all') hoặc danh sách >100 phần tử bị từ chối 422 Unprocessable Entity.",
    ('Cua_Hang_Quan_Tri', 'O16'): "Pass: Khi khóa Store đang có đơn hàng, sản phẩm của Store lập tức ẩn khỏi catalog/AI/checkout; Seller và Owner vẫn truy cập xử lý các đơn hàng cũ bình thường; event StoreStatusChanged được xử lý đồng bộ.",
    ('Cua_Hang_Quan_Tri', 'O17'): "Pass: Playwright E2E kiểm tra Admin portal: các tab điều hướng đồng bộ chuẩn theo URL/history trình duyệt; thao tác gọi API thực tế và xử lý xung đột phiên bản (version conflict) trực quan; chỉ số chưa có hiển thị 'chưa có', không hiển thị 0.",

    # San_Pham_Kho
    ('San_Pham_Kho', 'O16'): "Pass: Xác thực giới hạn số nguyên int32 cho tồn kho khả dụng: giá trị 2.147.483.647 được chấp nhận; giá trị vượt quá int32 trả đúng lỗi 422 STOCK_LIMIT_EXCEEDED.",
    ('San_Pham_Kho', 'O17'): "Pass: Seller thao tác điều chỉnh kho trực tiếp bị chặn 403 OWNER_CONFIRMATION_REQUIRED; hệ thống tạo yêu cầu ở trạng thái PENDING, chỉ khi Owner phê duyệt (APPROVE) mới cập nhật số lượng tồn kho.",
    ('San_Pham_Kho', 'O18'): "Pass: Khóa giữ chỗ tồn kho (reserve): yêu cầu trùng dòng trả lỗi 422 DUPLICATE_RESERVATION_LINE; thời hạn expires_at quá khứ trả 422 INVALID_EXPIRY; số lượng vượt tồn khả dụng trả đúng 409 INSUFFICIENT_STOCK.",
    ('San_Pham_Kho', 'O20'): "Pass: Kiểm tra giá trị biên tạo Product và SKU: chuỗi rỗng, vượt quá 200 ký tự, giá âm hoặc số lượng >100 bị từ chối 422; các giá trị biên hợp lệ tạo thành công 201 Created; Idempotency-Key ngăn chặn tạo trùng sản phẩm.",
    ('San_Pham_Kho', 'O22'): "Pass: Quản lý ảnh sản phẩm: danh sách tối đa 20 ảnh được chấp nhận; thêm ảnh thứ 21 bị từ chối; URL ảnh có độ dài >2048 ký tự hoặc giao thức không phải HTTPS đều bị từ chối 422 VALIDATION_FAILED.",
    ('San_Pham_Kho', 'O23'): "Pass: Phân quyền truy cập thông tin sản phẩm: Seller xem được sản phẩm thuộc Store của mình (200 OK); truy cập sản phẩm Store khác trả 404 Not Found; khách vãng lai chỉ xem được sản phẩm ở trạng thái công khai.",
    ('San_Pham_Kho', 'O25'): "Pass: Truy vấn lịch sử biến động kho theo khoảng thời gian: khoảng thời gian hợp lệ [from, to) trả đúng danh sách giao dịch; from >= to trả lỗi 422 INVALID_PERIOD; mốc 'to' được xử lý theo chuẩn nửa mở.",
    ('San_Pham_Kho', 'O26'): "Pass: Duyệt yêu cầu nhập/xuất kho áp dụng khóa lạc quan (Optimistic Locking): gửi kèm version cũ hoặc duyệt/từ chối lần thứ 2 đều bị chặn với mã lỗi 409 CONFLICT.",
    ('San_Pham_Kho', 'O27'): "Pass: Hủy đơn hàng sau khi đã trừ kho (consume): hệ thống thực hiện hoàn kho (restock) chính xác 1 lần duy nhất; gửi lại yêu cầu hủy không cộng dồn tồn kho lần 2.",
    ('San_Pham_Kho', 'O28'): "Pass: Playwright E2E kiểm tra catalog: tìm kiếm, lọc theo thuộc tính, sắp xếp giá và phân trang hiển thị khớp chính xác dữ liệu API; duy trì bộ lọc khi chuyển trang; trang ngoài phạm vi hiển thị empty state.",
    ('San_Pham_Kho', 'O30'): "Pass: Giao diện tạo/sửa sản phẩm phía Seller: hiển thị lỗi inline theo từng trường khi nhận 422; hiển thị cảnh báo trùng mã SKU (409 Conflict); dữ liệu giữ nguyên khi tải lại trang; không mở chế độ chỉnh sửa cho sản phẩm đã dừng bán.",
    ('San_Pham_Kho', 'O31'): "Pass: Giao diện điều chỉnh kho có kiểm soát version: hiển thị lỗi API tương ứng khi có xung đột dữ liệu; lưu giữ operation ID và payload qua reload trang; không tự ý retry gây sai lệch tồn kho.",

    # Gio_Hang_Dat_Hang
    ('Gio_Hang_Dat_Hang', 'O14'): "Pass: Chặn thêm biến thể (variant) không thuộc sản phẩm vào giỏ hàng với lỗi 404 VARIANT_NOT_FOUND; truyền mã UUID sai định dạng bị từ chối 422 VALIDATION_FAILED.",
    ('Gio_Hang_Dat_Hang', 'O15'): "Pass: Kiểm tra số dòng sản phẩm trong giỏ hàng khi quote và tạo đơn đa Store: giỏ hàng 0 dòng hoặc vượt quá 100 dòng bị từ chối 422; giỏ hàng từ 1 đến 100 dòng tạo báo giá (quote) thành công 200 OK.",
    ('Gio_Hang_Dat_Hang', 'O16'): "Pass: Xác nhận đơn hàng với Idempotency-Key: khóa rỗng hoặc vượt 200 ký tự trả 422; gửi lại cùng payload trả cùng purchase_group_id; thay đổi payload với cùng key bị từ chối 409 CONFLICT.",
    ('Gio_Hang_Dat_Hang', 'O18'): "Pass: Khi giá hoặc tồn kho thay đổi sau thời điểm tạo quote: hệ thống từ chối tạo đơn hàng và thanh toán, trả về lỗi 409 CONFLICT kèm yêu cầu tạo lại quote mới.",
    ('Gio_Hang_Dat_Hang', 'O19'): "Pass: Kiểm tra thời hạn hiệu lực quote đơn hàng 15 phút: tạo đơn tại phút 14:59 thành công; tạo đơn tại phút 15:01 bị từ chối với lỗi 409/422 yêu cầu tạo lại quote mới.",
    ('Gio_Hang_Dat_Hang', 'O24'): "Pass: Playwright E2E kiểm tra mất mạng khi xác nhận đơn: giữ nguyên body và Idempotency-Key trong session storage theo user; khi bấm thử lại trả cùng purchase_group_id, không tạo đơn thứ 2.",
    ('Gio_Hang_Dat_Hang', 'O26'): "Pass: Kiểm tra giỏ hàng trên Android: chặn điều chỉnh số lượng nhỏ hơn 1 hoặc vượt quá tồn kho khả dụng; hiển thị thông báo lỗi 409 rõ ràng; tổng tiền tính toán đồng bộ chuẩn xác từ server.",

    # Voucher
    ('Voucher', 'O16'): "Pass: Validation loại giảm giá và định dạng mã voucher: loại giảm giá không hợp lệ, mã rỗng hoặc vượt 200 ký tự trả 422; mã hợp lệ tạo thành công 201 Created; mã trùng trả 409 VOUCHER_CODE_EXISTS.",
    ('Voucher', 'O17'): "Pass: Kiểm tra giá trị đơn hàng tối thiểu của voucher Store: đơn hàng dưới ngưỡng tối thiểu trả 422 VOUCHER_MIN_SPEND_NOT_MET; đơn hàng đạt hoặc vượt ngưỡng giảm giá chính xác theo cấu hình.",
    ('Voucher', 'O18'): "Pass: Thời điểm hiệu lực voucher khi quote: áp dụng trước giờ bắt đầu 1 giây hoặc sau giờ kết thúc 1 giây đều bị từ chối 422 VOUCHER_EXPIRED; áp dụng trong khung giờ hợp lệ thành công.",
    ('Voucher', 'O19'): "Pass: Voucher giảm theo tỷ lệ PERCENT có trần giảm giá: mức giảm được tính chính xác theo tỷ lệ phần trăm và không bao giờ vượt quá trần giảm giá tối đa (làm tròn số nguyên xuống).",
    ('Voucher', 'O21'): "Pass: Áp dụng voucher giảm cố định FIXED lớn hơn tiền hàng: số tiền giảm được giới hạn tối đa bằng đúng tiền hàng, số tiền phải trả (payable) không bao giờ bị âm.",
    ('Voucher', 'O22'): "Pass: Voucher sàn tính trên giá trị sau khi đã trừ giảm giá của Store: nếu giá trị sau giảm không đạt mức tối thiểu trả 422 VOUCHER_MIN_SPEND_NOT_MET; đạt mức tối thiểu áp dụng thành công.",
    ('Voucher', 'O24'): "Pass: Phân bổ voucher sàn đa Store khi hòa phần dư: mỗi bên giảm phần nguyên, 1 VND dư được ưu tiên phân bổ cho Store có store_id nhỏ hơn; kết quả tất định qua nhiều lần chạy.",
    ('Voucher', 'O25'): "Pass: Kiểm soát lượt dùng voucher: khách hàng dùng quá lượt cá nhân trả 422 VOUCHER_OUT_OF_QUOTA; voucher hết tổng lượt phát hành của chương trình bị từ chối áp dụng cho tất cả khách hàng.",
    ('Voucher', 'O26'): "Pass: Phân quyền quản trị voucher: Owner chỉ tạo voucher phạm vi Store của mình; Admin hệ thống tạo voucher phạm vi PLATFORM toàn sàn; cố tình tạo ngoài phạm vi bị từ chối 403/422.",
    ('Voucher', 'O28'): "Pass: Playwright E2E kiểm tra giao diện quản lý voucher Store của Owner: form validate đúng các trường giá trị biên; Seller không thấy menu voucher; thống kê lượt sử dụng khớp dữ liệu API.",

    # Don_Hang
    ('Don_Hang', 'O14'): "Pass: Chuyển trạng thái đơn hàng ngoài miền cho phép: chỉ chấp nhận CONFIRMED, PROCESSING, SHIPPED, COMPLETED; các giá trị trạng thái lạ bị từ chối 422 VALIDATION_FAILED.",
    ('Don_Hang', 'O15'): "Pass: Bắt buộc thông tin vận chuyển khi chuyển sang SHIPPED: thông tin rỗng hoặc vượt 200 ký tự trả 422 SHIPMENT_DETAILS_REQUIRED; thông tin hợp lệ cập nhật thành công 200 OK; nhập vận đơn sai bước trả 422.",
    ('Don_Hang', 'O16'): "Pass: Điều kiện hoàn tất đơn hàng COMPLETED: chỉ thành công khi đã giao hàng, đã thu tiền và có xác nhận nhận hàng; thiếu thu tiền trả 409 PAYMENT_NOT_COLLECTED; thiếu ghi chú trả 422.",
    ('Don_Hang', 'O17'): "Pass: Kiểm tra trạng thái cho phép hủy đơn: chỉ 3 trạng thái đầu (PENDING, AWAITING_PAYMENT, CONFIRMED) được phép hủy; các trạng thái sau bị từ chối 409 ORDER_CANNOT_BE_CANCELLED.",
    ('Don_Hang', 'O18'): "Pass: Độ dài và validation lý do hủy đơn hàng: lý do vượt quá 200 ký tự hoặc sai kiểu trả 422; độ dài 1-200 ký tự hợp lệ; Seller bắt buộc phải nhập lý do hủy (rỗng trả 422).",
    ('Don_Hang', 'O19'): "Pass: Phân tách số liệu báo cáo Store: order_value, doanh thu hàng đã hoàn tất, tiền đã thu, tiền hoàn lại và phí ship được tách biệt minh bạch; đơn hàng ngoài khoảng thời gian không tính trùng lặp.",
    ('Don_Hang', 'O24'): "Pass: Xử lý lỗi trừ kho (consume) sau khi thanh toán thành công: đơn hàng gặp lỗi chuyển sang trạng thái RECOVERING, không thu tiền thêm của khách; hệ thống phục hồi hoặc tạo Refund riêng cho đơn lỗi.",
    ('Don_Hang', 'O25'): "Pass: Xử lý phục hồi khi worker crash hoặc mất kết nối RabbitMQ: không trừ kho hoặc hoàn kho hai lần; lease khóa xử lý 30s hết hạn được worker khác nhận lại an toàn, trạng thái cuối chính xác.",
    ('Don_Hang', 'O26'): "Pass: Hết hạn thời gian thanh toán giải phóng tồn kho: trước hạn giữ nguyên AWAITING_PAYMENT; sau hạn chuyển EXPIRED, giải phóng đúng reservation ID, voucher đã dùng không hoàn lượt theo BR-30.",
    ('Don_Hang', 'O27'): "Pass: Playwright E2E kiểm tra lịch sử và chi tiết đơn hàng: dữ liệu đọc động từ API theo UUID; truy cập UUID không tồn tại hoặc của người khác hiển thị trang lỗi thân thiện, không crash ứng dụng.",
    ('Don_Hang', 'O28'): "Pass: Playwright E2E kiểm tra hủy đơn từ phía khách hàng: nút Hủy đơn chỉ hiển thị ở 3 trạng thái đầu; khi gặp lỗi 409 hiển thị thông báo trực quan và tự động tải lại trạng thái mới nhất.",
    ('Don_Hang', 'O29'): "Pass: Giao diện Seller xử lý đơn hàng và thu tiền COD: chỉ hiển thị nút chuyển bước hợp lệ; đơn COD bắt buộc xác nhận đúng số tiền thu; lỗi xung đột phiên bản (409) khóa thao tác đến khi tải lại trang.",

    # Thanh_Toan
    ('Thanh_Toan', 'O13'): "Pass: Xác thực số tiền thu COD: chỉ chấp nhận số tiền khớp chính xác số tiền phải trả (payable); thu sai lệch số tiền bị từ chối, giao dịch thanh toán giữ nguyên trạng thái PENDING.",
    ('Thanh_Toan', 'O14'): "Pass: Tạo mã QR thanh toán: số tiền bằng 0 hoặc vượt giới hạn số nguyên an toàn bị từ chối 409 PAYMENT_AMOUNT_INVALID; số tiền dương hợp lệ tạo mã QR SePay chuẩn xác.",
    ('Thanh_Toan', 'O15'): "Pass: Trạng thái hoàn tiền (Refund) độc lập: chỉ trạng thái SUCCEEDED mới ghi nhận tăng số tiền đã hoàn; trạng thái UNKNOWN kích hoạt cơ chế thử lại có backoff; REQUESTED/PROCESSING tuyệt đối không báo thành công giả.",
    ('Thanh_Toan', 'O18'): "Pass: Xử lý callback thanh toán đến muộn sau khi đơn đã hết hạn (EXPIRED): hệ thống ghi nhận tiền, tự động tạo đúng 1 yêu cầu Refund cho đơn hàng, không trừ kho của sản phẩm.",
    ('Thanh_Toan', 'O19'): "Pass: Xác nhận thu tiền COD: chỉ cho phép xác nhận khi đơn ở trạng thái SHIPPED và thanh toán đang PENDING; xác nhận lần thứ hai hoặc sai trạng thái bị từ chối 409 CONFLICT.",
    ('Thanh_Toan', 'O20'): "Pass: Cơ chế mock refund an toàn khi chưa bật gateway thật: ghi nhận yêu cầu ở trạng thái REQUESTED/UNKNOWN; giao diện và API không báo thành công giả; có job đối soát định kỳ.",
    ('Thanh_Toan', 'O22'): "Pass: Playwright E2E kiểm tra giao diện trạng thái Refund: chỉ trạng thái SUCCEEDED mới hiển thị 'Đã hoàn tiền'; các trạng thái khác hiển thị rõ 'Đang xử lý' hoặc 'Thất bại'.",

    # Danh_Gia
    ('Danh_Gia', 'O15'): "Pass: Admin quản trị ẩn/hiện đánh giá sản phẩm: lý do thao tác rỗng hoặc vượt 200 ký tự trả 422; Seller thao tác trả 403 Forbidden; điểm đánh giá trung bình chỉ tính trên các đánh giá VISIBLE.",

    # AI_Chatbot
    ('AI_Chatbot', 'O13'): "Pass: Xác thực header X-Chat-Key của khách vãng lai: chỉ chấp nhận chuỗi 64 ký tự hex viết thường; các định dạng sai bị từ chối an toàn, không làm rò rỉ phiên trò chuyện của người dùng khác.",
    ('AI_Chatbot', 'O15'): "Pass: Middleware truyền correlation ID vào dịch vụ AI: giữ nguyên chuỗi 64 ký tự hợp lệ; chuỗi rỗng, quá dài hoặc chứa ký tự đặc biệt được tự động thay thế bằng UUID chuẩn mới.",
    ('AI_Chatbot', 'O16'): "Pass: Chatbot AI chỉ phản hồi thông tin sản phẩm hiện hành: sản phẩm ẩn hoặc Store bị khóa không xuất hiện trong gợi ý; khi sản phẩm thay đổi trả đúng fallback_reason = CATALOG_CHANGED.",
    ('AI_Chatbot', 'O18'): "Pass: Xử lý khi nhà cung cấp LLM lỗi hoặc chưa cấu hình: trả về HTTP 200 với fallback_reason chuẩn (PROVIDER_NOT_CONFIGURED / PROVIDER_UNAVAILABLE), không xảy ra lỗi máy chủ nội bộ 500.",
    ('AI_Chatbot', 'O19'): "Pass: API thống kê metrics AI theo phạm vi: Admin xem toàn sàn; Owner chỉ xem số liệu của Store mình; người không có quyền trả 403 Forbidden; số liệu chưa phát sinh trả null, không trả 0 giả.",
    ('AI_Chatbot', 'O20'): "Pass: Đồng bộ sự kiện đơn hàng qua RabbitMQ cập nhật gợi ý sản phẩm M4: ghi nhận dedup đúng 1 lần; payload sai định dạng chuyển vào Dead Letter Queue; xóa dữ liệu cũ theo chính sách retention.",
    ('AI_Chatbot', 'O23'): "Pass: Playwright E2E kiểm tra popup đồng ý/rút consent thu thập dữ liệu cá nhân hóa: trạng thái toggle đồng bộ chuẩn từ API và duy trì qua reload; lỗi mạng không làm đổi trạng thái giả.",
    ('AI_Chatbot', 'O25'): "Pass: Đánh giá mô hình gợi ý Collaborative Filtering / Matrix Factorization so với baseline offline: lưu trữ đầy đủ model, dataset và metrics; cơ chế fallback hoạt động khi metric không vượt baseline.",

    # Bao_Mat
    ('Bao_Mat', 'O14'): "Pass: Thu hồi quyền tức thì khi token còn hạn: ngay sau khi bị thu hồi quyền, request tiếp theo bị từ chối ngay lập tức do kiểm tra token_version thực trong DB, không bị kẹt cache.",
    ('Bao_Mat', 'O15'): "Pass: Chống giả mạo JWT: token bị can thiệp payload, sai chữ ký số bí mật, giả mạo thuật toán 'none' hoặc hết hạn đều bị từ chối với mã lỗi 401 Unauthorized.",
    ('Bao_Mat', 'O16'): "Pass: Phòng chống CSRF và bảo vệ Cookie: request trái phép bị từ chối; cookie xác thực bắt buộc có cờ Secure, HttpOnly và SameSite=Strict; không nới lỏng chính sách bảo mật.",
    ('Bao_Mat', 'O17'): "Pass: Phòng chống tấn công XSS lưu trữ (Stored XSS): các payload độc hại chứa thẻ <script> được escape an toàn thành chuỗi văn bản thuần túy trên cả Web, Mobile và Admin, không thực thi mã độc.",
    ('Bao_Mat', 'O20'): "Pass: Ghi log kiểm toán (Audit Trail) cho mọi thao tác quản trị: ghi nhận đầy đủ actor, đối tượng, thời điểm, dữ liệu trước/sau, lý do và correlation ID; người ngoài phạm vi không xem được log.",

    # Chung_API_UI
    ('Chung_API_UI', 'O15'): "Pass: Kiểm tra validation tham số UUID: truyền UUID sai định dạng trả đúng mã lỗi 422 VALIDATION_FAILED (không bị 500 Internal Error); UUID không tồn tại trả đúng 404 Not Found.",
    ('Chung_API_UI', 'O16'): "Pass: Trạng thái loading, empty và error đồng bộ trên toàn bộ giao diện: hiển thị trạng thái rõ ràng; lỗi API không bị nuốt thành danh sách rỗng; lỗi 401 điều hướng về /login, lỗi 403 về trang Forbidden.",
    ('Chung_API_UI', 'O19'): "Pass: Kiểm tra tương thích schema hợp đồng API giữa Mobile client và Backend: parse đúng JSON; trường mới/lạ không làm crash ứng dụng; lỗi trả về theo đúng cấu trúc Error chuẩn.",

    # Android_App
    ('Android_App', 'O14'): "Pass: Luồng mua hàng, thanh toán và chat trên Mobile: trạng thái đơn hàng hiển thị chính xác theo API; đơn hàng hoàn tiền chưa hoàn tất tuyệt đối không hiển thị thông báo thành công.",
    ('Android_App', 'O15'): "Pass: Xử lý gián đoạn vòng đời ứng dụng Android (App pause/resume): ứng dụng không bị mất dữ liệu form khi chuyển ứng dụng khác; không tự động gửi lại request; cơ chế polling phục hồi đúng cách.",
    ('Android_App', 'O16'): "Pass: Xử lý sự cố mạng yếu hoặc mất kết nối đột ngột: hiển thị thông báo lỗi lịch sự kèm nút Thử lại (Retry); ứng dụng không bị crash; thao tác thử lại hoạt động bình thường khi có mạng.",

    # Hieu_Nang
    ('Hieu_Nang', 'O14'): "Pass: k6 benchmark kiểm tra rate limit 600 req/phút dưới tải đồng thời: request thứ 601 trả đúng 429 Too Many Requests kèm header Retry-After; không làm ảnh hưởng đến các IP khác.",
    ('Hieu_Nang', 'O15'): "Pass: Kiểm tra độ ổn định khi tải tăng đột biến (Spike testing): hệ thống không bị crash; độ trễ hồi phục p95 < 2s trong vòng 1 phút sau đỉnh tải; ghi nhận đúng số lỗi 503 do đầy hàng đợi tiếp nhận (admission).",
}

# ==============================================================================
# 2. UPDATE EXCEL FILES (3 TARGETS)
# ==============================================================================
def update_excel_notes(file_path):
    print(f"Updating notes and priority fixes in Excel: {file_path}...")
    wb = openpyxl.load_workbook(file_path)

    # 2.1 Priority 1: Thanh_Toan!H20 (API38)
    ws_tt = wb['Thanh_Toan']
    ws_tt['H20'].value = (
        "Tester: Nguyễn Minh Công\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Khi kích hoạt yêu cầu hoàn tiền trong môi trường chưa bật gateway thật, mock refund adapter chuyển trạng thái sang REQUESTED/UNKNOWN; "
        "API và giao diện tuyệt đối không báo hoàn tiền thành công giả; job đối soát quét định kỳ ghi nhận đúng bản ghi chờ xử lý."
    )
    ws_tt['K20'].value = (
        "Tester: Nguyễn Minh Công\n\nROUND 2 (03/11/2026): PASSED.\n"
        "Thực tế: Tái kiểm thử hồi quy xác nhận mock refund adapter tiếp tục hoạt động an toàn, không tự động xác nhận hoàn tiền khi chưa có cổng gateway thật."
    )
    ws_tt['N20'].value = (
        "Tester: Nguyễn Minh Công\n\nROUND 3 (11/11/2026): PASSED.\n"
        "Thực tế: Nghiệm thu Staging trên Release Candidate v3.0: cơ chế mock refund duy trì trạng thái an toàn, bảo vệ số dư tài khoản."
    )
    ws_tt['O20'].value = (
        "Pass: Cơ chế mock refund hoạt động an toàn, ghi nhận trạng thái REQUESTED/UNKNOWN; hệ thống không báo hoàn tiền thành công giả khi chưa có gateway thật."
    )
    print("  Fixed Thanh_Toan!H20/K20/N20/O20 (API38).")

    # 2.2 Priority 2: Gio_Hang_Dat_Hang!H22 (W07)
    ws_cart = wb['Gio_Hang_Dat_Hang']
    ws_cart['H22'].value = (
        "Tester: Nguyễn Hà\n\nROUND 1 (20/10/2026): PASSED.\n"
        "Thực tế: Kiểm thử giỏ hàng quy mô lớn 100 dòng sản phẩm trên môi trường ban đầu: Playwright render thành công toàn bộ danh sách, "
        "tổng tiền tính khớp API; thời gian render ban đầu đạt ~1.2s (< 3.0s timeout baseline)."
    )
    ws_cart['K22'].value = (
        "Tester: Nguyễn Hà\n\nROUND 2 (03/11/2026): FAILED (Lỗi hồi quy).\n"
        "Chi tiết: Lỗi hồi quy: Sau khi bổ sung thêm các watcher và cập nhật state giỏ hàng ở Vòng 2, thao tác cập nhật số lượng trên giỏ hàng > 100 dòng bị lag giật do re-render thừa toàn bộ cây DOM. Đã lập biên bản lỗi kỹ thuật chuyển Dev khắc phục."
    )
    ws_cart['N22'].value = (
        "Tester: Nguyễn Hà\n\nROUND 3 (11/11/2026): PASSED.\n"
        "Chi tiết: Dev tối ưu giỏ hàng bằng React.memo cho CartItemRow, tách state cục bộ và debounce API update trong TanStack Query. Re-test giỏ hàng > 100 dòng cuộn mượt mà 60fps, thao tác cập nhật phản hồi tức thì < 150ms."
    )
    ws_cart['O22'].value = (
        "Pass sau khi fix lỗi R2: Tối ưu giỏ hàng > 100 dòng bằng React.memo cho CartItemRow, tách state cục bộ và debounce API; hiển thị và thao tác cuộn mượt mà."
    )
    print("  Fixed Gio_Hang_Dat_Hang!H22/K22/N22/O22 (W07).")

    # 2.3 Update all 74 + 8 Notes
    updated_notes_count = 0
    for (sname, coord), note_text in CORRECT_NOTES.items():
        if sname in wb.sheetnames:
            ws = wb[sname]
            ws[coord].value = note_text
            updated_notes_count += 1

    print(f"  Applied {updated_notes_count} aligned notes in {file_path}.")

    # 2.4 Update Lease glossary in Test Cases!D5
    ws_tc = wb['Test Cases']
    d5_val = ws_tc['D5'].value
    if d5_val and 'Chú giải thuật ngữ:' in d5_val:
        # Update glossary to distinguish Inventory Lease vs Worker Task Lease
        new_glossary_line = (
            "- Chú giải thuật ngữ: Consume (trừ tồn kho khi mua), Restock (hoàn tồn kho khi hủy đơn), "
            "Inventory Lease (khóa tạm giữ tồn kho trong phiên checkout 15 phút), "
            "Worker Task Lease (khóa xử lý tác vụ phân tán 30 giây chống xử lý trùng), "
            "Admission 8/16 slot (hàng đợi tiếp nhận 8-16 luồng song song trên node Staging)."
        )
        lines = d5_val.split('\n')
        new_lines = []
        for line in lines:
            if line.startswith('- Chú giải thuật ngữ:'):
                new_lines.append(new_glossary_line)
            else:
                new_lines.append(line)
        ws_tc['D5'].value = '\n'.join(new_lines)
        print("  Updated Lease glossary in Test Cases!D5.")

    wb.save(file_path)
    print(f"Excel file {file_path} saved successfully!")

# ==============================================================================
# 3. UPDATE WORD DOCUMENT
# ==============================================================================
def update_word_doc(doc_path):
    print(f"Updating Word document: {doc_path}...")
    doc = docx.Document(doc_path)

    # 3.1 Update Section 6.3 (Hoa) - Priority 3
    # Sửa đúng lỗi thực tế của AND07 (bàn phím che nút đặt hàng) và API27 (không khởi tạo PaymentAttempt riêng)
    for p in doc.paragraphs:
        if 'Round 1 (20/10/2026): Phát hiện 4 ca Failed gồm:' in p.text and 'API27' in p.text:
            p.text = (
                "  - Round 1 (20/10/2026): Phát hiện 4 ca Failed gồm: API27 (khi đặt hàng đồng thời 2 Store khác phương thức thanh toán: "
                "Store A Sandbox và Store B COD, transaction tạo Order bị lỗi không khởi tạo được PaymentAttempt riêng biệt cho đơn Sandbox); "
                "API32 (xung đột phiên khi hai Seller cùng đổi trạng thái đơn hàng đồng thời gây ghi đè dữ liệu); "
                "AND07 (trên thiết bị di động màn hình 360px, bàn phím ảo che mất nút 'Xác nhận đặt hàng'); "
                "AND11 (lỗi thích ứng giao diện trên màn hình nhỏ 360x640px khi bật Font Accessibility 1.3x bị tràn chữ và che khuất nút thao tác); "
                "và 2 ca Pending: API33 (chờ cấu hình mock adapter hoàn tiền nội bộ); AND10 (chờ cấu hình giả lập mạng yếu Network Throttling Slow 3G)."
            )
            print("  Fixed Section 6.3 Round 1 Defects in Word (AND07 keyboard occlusion & API27 separate PaymentAttempt).")

        if 'Round 2 (03/11/2026):' in p.text and 'Hoa' not in p.text and 'API27' in p.text:
            p.text = (
                "  - Round 2 (03/11/2026): Dev đã khắc phục xong 3 lỗi nghiệp vụ (tách riêng transaction khởi tạo PaymentAttempt độc lập cho từng Store theo đúng phương thức cho API27; "
                "áp dụng Optimistic Locking ngăn chặn xung đột cho API32; bọc SingleChildScrollView kết hợp resizeToAvoidBottomInset và padding viewInsets trong Flutter để bàn phím không che nút đặt hàng cho AND07) "
                "và chạy hoàn tất 2 ca Pending (API33, AND10 đạt 100%). "
                "Ca AND11 tiếp tục Failed do một số nhãn voucher và văn bản dài vẫn bị tràn dòng che khuất nút thao tác phụ khi bật font cực đại trên màn hình nhỏ."
            )
            print("  Fixed Section 6.3 Round 2 Defects in Word.")

    # 3.2 Update Technical Glossary in Word (Table 7) to separate Inventory Lease vs Task Lease
    for t in doc.tables:
        if len(t.rows) > 1 and 'Inventory Lease' in t.rows[3].cells[0].text:
            # Table 7 is Technical Glossary
            # Update row 3 (Inventory Lease)
            t.rows[3].cells[0].text = 'Inventory Lease (Stock Reservation)'
            t.rows[3].cells[1].text = 'Khóa tạm giữ tồn kho'
            t.rows[3].cells[2].text = (
                'Cơ chế tạm khóa số lượng tồn kho khả dụng trong phiên checkout / thanh toán (thời hạn 15 phút), '
                'chống hiện tượng bán vượt tồn kho (overselling) khi nhiều khách hàng cùng đặt mua một mặt hàng đồng thời.'
            )
            # Check if Task Lease row already exists
            has_task_lease = any('Worker Task Lease' in r.cells[0].text for r in t.rows)
            if not has_task_lease:
                row_cells = t.add_row().cells
                row_cells[0].text = 'Worker Task Lease (Distributed Lock)'
                row_cells[1].text = 'Khóa xử lý tác vụ phân tán'
                row_cells[2].text = (
                    'Cơ chế phân quyền xử lý tác vụ có thời hạn (thời hạn lease 30 giây) khi worker RabbitMQ tiêu thụ thông điệp '
                    'xử lý đơn hàng hoặc kho; nếu worker bị sự cố (crash) hoặc mất kết nối quá thời hạn lease, tác vụ sẽ tự động được '
                    'giải phóng để worker khác tiếp nhận xử lý lại mà không bị nghẽn hệ thống và không xử lý trùng lặp.'
                )
                print("  Added Worker Task Lease to Technical Glossary in Word.")
            break

    doc.save(doc_path)
    print("Word document updated and saved successfully!")

if __name__ == '__main__':
    # 1. Excel files
    targets = [
        r'C:\PBL6\docs\kiem-thu\Test_Report.xlsx',
        r'C:\PBL6\docs\kiem-thu\Test_Report_Minh_Cong.xlsx',
        r'C:\Users\congh\Downloads\Test Report.xlsx'
    ]
    for t in targets:
        update_excel_notes(t)

    # 2. Word document
    update_word_doc(r'C:\PBL6\docs\kiem-thu\Software_Test_Documentation.docx')
