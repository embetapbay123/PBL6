# Bộ bài thử với người dùng — USER_VALIDATION_PENDING

Chưa có người tham gia, chưa có tỷ lệ thành công/thời gian. Dùng tài khoản và dữ liệu riêng; người điều phối không chỉ tên nút/đường đi. Cho người tham gia nói suy nghĩ, ghi chỗ cần đoán, nhớ, tính nhẩm hoặc hỏi ngoài sản phẩm. Mỗi bài nối ID catalog, ghi thiết bị/baseline/bằng chứng riêng; không yêu cầu người dùng đọc mã hoặc DB.

## Customer

| Bài giao bằng mục tiêu | ID | Dữ liệu chuẩn bị | Điểm quan sát |
|---|---|---|---|
| Bạn cần một chiếc áo đỏ size M đi làm, tối đa 200.000đ. Hãy chọn món phù hợp và nói vì sao bạn tin đã chọn đúng. | C01–C12 | Áo 12 variant, tên/ảnh có nghĩa, giá và tồn khác nhau | Có đọc được màu/size, giá và điều kiện mua mà không biết SKU không? |
| Bạn muốn mua hai món từ hai cửa hàng, dùng ưu đãi nếu phù hợp, giao tới chỗ làm. Hãy kiểm tra trước khi quyết định đặt. | C19–C36 | Giỏ sẵn một variant, địa chỉ khác mặc định, voucher hợp lệ/không hợp lệ | Có tính nhẩm, lẫn mua ngay với giỏ cũ, mất nháp địa chỉ/voucher không? |
| Bạn đã thử trả tiền nhưng không chắc giao dịch xong chưa. Hãy xác minh và tiếp tục an toàn. | C37–C42 | Adapter controlled PENDING/UNKNOWN/SUCCEEDED, không tiền thật | Có trả lần hai, hiểu nhầm COD đã thu, hoặc cần hỏi ngoài luồng không? |
| Tìm đơn áo trước đây và hỏi cửa hàng về đơn ấy. Sau đó yêu cầu đổi size và tìm cách gửi hàng lại. | C43–C53 | Nhiều đơn cùng tiền, completed và shipped, thông tin policy đã chốt | Nhận diện đơn, đúng Store/ngữ cảnh, biết nơi gửi/phí và bước chờ ai? |

## STORE_OWNER / SELLER là nhân viên

| Bài giao bằng mục tiêu | ID | Dữ liệu chuẩn bị | Điểm quan sát |
|---|---|---|---|
| Hãy đăng một mẫu áo có ba màu và bốn size để khách thực sự mua được. | S07–S12 | Taxonomy, giá/SKU/ảnh có nghĩa, tồn ban đầu | Có bỏ sót biến thể/tồn hoặc hiểu ACTIVE là mua được ngay không? |
| Bạn đếm trong kho còn 5, hệ thống đang ghi 12 và có đơn chờ. Hãy cập nhật đúng rồi giải thích chênh lệch. | S19–S24/N06/N07 | Snapshot quantity/reserved với nghĩa đã được chủ sản phẩm chốt | Có nhập nhầm delta, làm hụt hàng giữ, tìm được lý do và actor không? |
| Hãy tìm đơn mới cần xử lý, lấy đủ hàng và chuẩn bị thông tin để giao. | S25–S34 | 100 đơn, món/variant khó phân biệt, COD chưa thu | Có chọn đúng đơn, màu/size, người nhận và tiền COD mà không dùng dữ liệu ngoài hệ thống? |
| Khách từ chối nhận; hàng vừa quay về có một món hỏng. Hãy ghi nhận và xử lý tiếp. | N01–N04/S35/S36 | Policy hoàn về/kiểm hàng và quyền tương ứng đã chốt | Nhận đúng hàng/tình trạng, không tăng tồn bán được hoặc hoàn tiền giả? |
| Bạn là Owner, hãy giao quyền kho cho nhân viên rồi tìm ai đã thay đổi tồn hôm nay. | S39/S40/N08 | Hai nhân viên, hai Store, log phạm vi phù hợp | Có phân biệt SELLER/Owner, truy đúng Store và không cần mượn quyền Admin không? |

## Admin

| Bài giao bằng mục tiêu | ID | Dữ liệu chuẩn bị | Điểm quan sát |
|---|---|---|---|
| Có hồ sơ mở Store mới. Hãy quyết định dựa trên thông tin hiện có và hướng dẫn người nộp tiếp tục. | A01–A06 | Pending, rejected và approved | Có đủ thông tin, đúng hồ sơ/version và lý do khắc phục không? |
| Cần tạm ngăn một Store nhận đơn. Hãy xác minh đối tượng và hậu quả trước hành động. | A07–A12 | User và Store gần tên, đơn dở, phiên đang mở | Có nhầm khóa user với Store hoặc scope quyền không? |
| Một nội dung cần ẩn; sau sửa có thể khôi phục. Hãy xử lý và kiểm tra ảnh hưởng tới việc mở bán. | A13–A18 | Product DRAFT/HIDDEN, review và taxonomy | Có đủ context, có vô tình ACTIVE khi restore không? |
| Khách hỏi đơn chưa nhận được và tiền hoàn chưa thấy. Hãy xác định tình trạng, người thay đổi và số liệu liên quan. | A19–A24/N05 | Cùng số tiền, refund pending/succeeded, report có dữ liệu gốc | Có phân biệt requested/pending/paid/delivered/refunded và trả lời từ nguồn không? |

Rubric cho mỗi bài: biết bước tiếp; nhận đúng đối tượng/hành động; đủ thông tin quyết định; biết kết quả và người làm tiếp; sửa sai/phục hồi được. Chỉ ghi PASS khi hoàn thành không cần trợ giúp ngoài luồng; FRICTION khi hoàn thành có vòng tránh; FAIL khi không thể/nhầm kết quả. POLICY_GAP và BLOCKED giữ riêng theo catalog. Không tự đặt ngưỡng click chung hoặc yêu cầu hai người chấm khi chưa có nhân sự.
