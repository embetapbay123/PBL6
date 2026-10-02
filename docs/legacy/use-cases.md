# Đặc tả ca sử dụng

Nguồn: [Use_Case_Specification (1).docx](../../docs_old/Use_Case_Specification%20%281%29.docx).

> Bản chuyển đổi nội dung từ tài liệu gốc, chưa hợp nhất các mâu thuẫn nghiệp vụ. Xem [báo cáo rà soát](../RA_SOAT.md) trước khi dùng làm baseline triển khai.

PBL 6 - DỰ ÁN CHUYÊN NGÀNH CÔNG NGHỆ PHẦN MỀM

USE CASE SPECIFICATION

ĐẶC TẢ CA SỬ DỤNG

XÂY DỰNG NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ<br>CÓ CHATBOT TƯ VẤN MUA SẮM THÔNG MINH

Multi-Store Marketplace - MVP Multi-Seller<br>Checkout 1 Store/lần - RBAC - Dynamic Product Attributes - LLM/RAG

<a id="table-1"></a>

| Phiên bản tài liệu | 1.0 - Draft |
| --- | --- |
| Ngày lập | 19/09/2026 |
| Cơ sở | SRS PBL6 - phiên bản 1.0 Draft và Đề cương PBL6 |
| Phạm vi | 20 Use Case theo danh mục Use Case trong SRS |

## 1. Mục đích và nguyên tắc tài liệu

Tài liệu này đặc tả các Use Case của hệ thống dựa trên SRS hiện tại. Mục tiêu là làm đầu vào cho thiết kế, API, lập trình và kiểm thử.

Lưu ý về mức độ nguồn: các Use Case đã có đặc tả cốt lõi trong SRS được giữ nguyên nội dung nghiệp vụ. Các Use Case chưa có phần đặc tả riêng trong SRS được lập ở mức Draft bằng cách suy ra trực tiếp từ Functional Requirements và Business Rules tương ứng; tài liệu không tự bổ sung nghiệp vụ mới ngoài SRS.

## 2. Cấu trúc một Use Case

<a id="table-2"></a>

| Trường | Ý nghĩa |
| --- | --- |
| Mã Use Case | Định danh duy nhất. |
| Actor chính | Vai trò khởi tạo/thực hiện Use Case. |
| Mục tiêu | Giá trị nghiệp vụ cần đạt. |
| Tiền điều kiện | Điều kiện phải đúng trước khi bắt đầu. |
| Hậu điều kiện | Trạng thái mong đợi khi kết thúc. |
| Luồng chính | Các bước thành công chính. |
| Luồng thay thế / ngoại lệ | Các tình huống khác hoặc lỗi được SRS hỗ trợ. |
| Yêu cầu liên quan | Functional Requirements truy vết. |
| Quy tắc liên quan | Business Rules/NFR quan trọng. |

## 3. Danh mục Use Case

<a id="table-3"></a>

| Mã | Tên Use Case | Actor | Nền tảng |
| --- | --- | --- | --- |
| UC-AUTH-01 | Đăng ký / Đăng nhập Customer | Guest, Customer | Client Web / Mobile |
| UC-PROD-01 | Duyệt, tìm kiếm và lọc sản phẩm | Guest, Customer | Client Web / Mobile |
| UC-PROD-02 | Xem chi tiết sản phẩm và gợi ý liên quan | Guest, Customer | Client Web / Mobile |
| UC-CHAT-01 | Chatbot tư vấn mua sắm AI | Guest, Customer | Client Web / Mobile |
| UC-REC-01 | Xem “Dành cho bạn” | Customer | Client Web / Mobile |
| UC-CART-01 | Quản lý giỏ hàng | Customer | Client Web / Mobile |
| UC-CHECKOUT-01 | Checkout sản phẩm của một Store | Customer | Client Web / Mobile |
| UC-PAY-01 | Thanh toán sandbox | Customer | Client Web / Mobile |
| UC-ORDER-01 | Xem / theo dõi / hủy đơn | Customer | Client Web / Mobile |
| UC-STORE-01 | Quản lý thông tin Store | Store Owner | Admin Web / Management Portal |
| UC-STORE-02 | Quản lý nhân viên Seller | Store Owner | Admin Web / Management Portal |
| UC-SPROD-01 | Đăng / cập nhật sản phẩm Store | Store Owner, Seller | Admin Web / Management Portal |
| UC-SPROD-02 | Cấu hình biến thể / SKU và hình ảnh | Store Owner, Seller | Admin Web / Management Portal |
| UC-INV-01 | Quản lý tồn kho và Stock Movement | Store Owner, Seller | Admin Web / Management Portal |
| UC-SORDER-01 | Xử lý và cập nhật trạng thái đơn Store | Store Owner, Seller | Admin Web / Management Portal |
| UC-REP-01 | Xem báo cáo doanh thu Store | Store Owner | Admin Web / Management Portal |
| UC-ADMIN-01 | Quản lý Store / Seller / Customer | Administrator | Admin Web / Management Portal |
| UC-ADMIN-02 | Quản lý Category, ProductType và AttributeKey | Administrator | Admin Web / Management Portal |
| UC-ADMIN-03 | Quản lý Role / Permission | Administrator | Admin Web / Management Portal |
| UC-AIMON-01 | Theo dõi Chatbot / RAG / Recommendation | Administrator | Admin Web / Management Portal |

## 4.1. UC-AUTH-01 - Đăng ký / Đăng nhập Customer

<a id="table-4"></a>

| Mã Use Case | UC-AUTH-01 |
| --- | --- |
| Tên Use Case | Đăng ký / Đăng nhập Customer |
| Actor chính | Guest, Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Tạo tài khoản Customer hoặc xác thực để sử dụng chức năng cá nhân hóa và mua hàng. |
| Tiền điều kiện | Guest chưa đăng nhập; hệ thống xác thực hoạt động. |
| Hậu điều kiện | Tài khoản được tạo hoặc phiên đăng nhập hợp lệ được thiết lập. |
| Yêu cầu liên quan | FR-AUTH-01, FR-AUTH-02, FR-AUTH-03 |
| Quy tắc/NFR liên quan | NFR-SEC-01, NFR-SEC-02, NFR-SEC-03 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-5"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Guest chọn Đăng ký hoặc Đăng nhập. |
| 2 | Hệ thống hiển thị biểu mẫu tương ứng. |
| 3 | Người dùng nhập thông tin cần thiết theo form. |
| 4 | Hệ thống kiểm tra dữ liệu và xác thực tài khoản. |
| 5 | Nếu hợp lệ, hệ thống tạo tài khoản hoặc phát hành ngữ cảnh xác thực/JWT phù hợp. |
| 6 | Hệ thống điều hướng về giao diện Customer. |

#### Luồng thay thế / ngoại lệ

- Dữ liệu không hợp lệ hoặc xác thực thất bại: hệ thống báo lỗi và không tạo phiên đăng nhập.

- Quên/đổi mật khẩu trên Client Web được xử lý theo chức năng tương ứng.

## 4.2. UC-PROD-01 - Duyệt, tìm kiếm và lọc sản phẩm

<a id="table-6"></a>

| Mã Use Case | UC-PROD-01 |
| --- | --- |
| Tên Use Case | Duyệt, tìm kiếm và lọc sản phẩm |
| Actor chính | Guest, Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Tìm và duyệt các sản phẩm phù hợp theo từ khóa, danh mục, Product Type, giá và thuộc tính động. |
| Tiền điều kiện | Hệ thống có dữ liệu sản phẩm được phép hiển thị. |
| Hậu điều kiện | Danh sách sản phẩm phù hợp được hiển thị; tín hiệu tìm kiếm có thể được ghi nhận cho Customer đăng nhập. |
| Yêu cầu liên quan | FR-CAT-02, FR-SEARCH-01, FR-SEARCH-02, FR-SEARCH-03, FR-SEARCH-04, FR-REC-01 |
| Quy tắc/NFR liên quan | BR-08; semantic search chỉ áp dụng nếu M4 khả dụng. |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-7"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Actor mở trang chủ/danh mục hoặc nhập từ khóa tìm kiếm. |
| 2 | Hệ thống truy vấn danh sách sản phẩm phù hợp. |
| 3 | Actor có thể chọn danh mục/ProductType và bộ lọc thuộc tính động. |
| 4 | Actor có thể lọc theo giá và sắp xếp theo tùy chọn được hỗ trợ. |
| 5 | Hệ thống cập nhật danh sách kết quả. |
| 6 | Nếu actor là Customer đăng nhập, hệ thống ghi nhận tín hiệu tìm kiếm phục vụ recommendation. |

#### Luồng thay thế / ngoại lệ

- Không có kết quả: hiển thị trạng thái không có sản phẩm phù hợp.

- Semantic search chỉ áp dụng nếu module M4 và cấu hình MVP tương ứng khả dụng.

## 4.3. UC-PROD-02 - Xem chi tiết sản phẩm và gợi ý liên quan

<a id="table-8"></a>

| Mã Use Case | UC-PROD-02 |
| --- | --- |
| Tên Use Case | Xem chi tiết sản phẩm và gợi ý liên quan |
| Actor chính | Guest, Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Xem đầy đủ thông tin sản phẩm và các sản phẩm tương tự/bổ trợ. |
| Tiền điều kiện | Sản phẩm tồn tại và được phép hiển thị. |
| Hậu điều kiện | Thông tin chi tiết và recommendation liên quan được hiển thị; lịch sử xem được ghi nhận cho Customer đăng nhập. |
| Yêu cầu liên quan | FR-PROD-01, FR-REC-02, FR-REC-05 |
| Quy tắc/NFR liên quan | BR-11 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-9"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Actor chọn một sản phẩm. |
| 2 | Hệ thống hiển thị ảnh, giá, mô tả, thuộc tính động, tồn kho và thông tin Store. |
| 3 | Hệ thống ghi nhận ProductViewHistory nếu actor là Customer đăng nhập. |
| 4 | Recommendation Engine tính điểm các sản phẩm ứng viên theo SameCategory, SameProductType, PriceSimilarity và SameStore. |
| 5 | Hệ thống hiển thị Top sản phẩm liên quan theo cấu hình MVP. |

#### Luồng thay thế / ngoại lệ

- Nếu recommendation không khả dụng, trang chi tiết vẫn hiển thị thông tin sản phẩm cốt lõi.

## 4.4. UC-CHAT-01 - Chatbot tư vấn mua sắm AI

<a id="table-10"></a>

| Mã Use Case | UC-CHAT-01 |
| --- | --- |
| Tên Use Case | Chatbot tư vấn mua sắm AI |
| Actor chính | Guest, Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Nhận tư vấn mua sắm bằng hội thoại tự nhiên có căn cứ trên dữ liệu sản phẩm. |
| Tiền điều kiện | M4, Vector Search và LLM API hoạt động; dữ liệu sản phẩm đã có embedding ở mức cần thiết. |
| Hậu điều kiện | Chatbot trả câu trả lời và các sản phẩm/link phù hợp hoặc nêu rõ khi thiếu dữ liệu. |
| Yêu cầu liên quan | FR-AI-01 .. FR-AI-07; FR-AI-08 khi lưu lịch sử được triển khai |
| Quy tắc/NFR liên quan | BR-13, BR-14; NFR-AI-01, NFR-PRIV-01 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-11"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Actor nhập nhu cầu mua sắm bằng ngôn ngữ tự nhiên. |
| 2 | Hệ thống tạo query embedding và thực hiện vector search trên pgvector. |
| 3 | Hệ thống lấy Top-K Product Context. |
| 4 | Nếu actor là Customer, hệ thống có thể bổ sung User Preference và lịch sử hành vi. |
| 5 | Hệ thống kết hợp System Prompt, Conversation Context và Product Context để gọi LLM. |
| 6 | Chatbot trả câu trả lời grounded kèm card/link sản phẩm. |
| 7 | Actor có thể hỏi tiếp trong cùng phiên hoặc mở trang chi tiết sản phẩm. |

#### Luồng thay thế / ngoại lệ

- Không đủ context: chatbot thông báo giới hạn và đề nghị bổ sung tiêu chí.

- Câu hỏi ngoài phạm vi mua sắm: chatbot từ chối hoặc định hướng lại.

- LLM/Vector Search lỗi: hệ thống báo lỗi phù hợp, không bịa dữ liệu sản phẩm.

## 4.5. UC-REC-01 - Xem “Dành cho bạn”

<a id="table-12"></a>

| Mã Use Case | UC-REC-01 |
| --- | --- |
| Tên Use Case | Xem “Dành cho bạn” |
| Actor chính | Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Nhận danh sách sản phẩm cá nhân hóa từ lịch sử hành vi. |
| Tiền điều kiện | Customer đã đăng nhập. |
| Hậu điều kiện | Danh sách recommendation được hiển thị hoặc fallback nếu chưa đủ dữ liệu. |
| Yêu cầu liên quan | FR-REC-01 .. FR-REC-07 |
| Quy tắc/NFR liên quan | BR-11, BR-12 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-13"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Hệ thống lấy các tín hiệu như SearchHistory, ProductViewHistory, Cart và dữ liệu mua hàng đã có. |
| 2 | Hệ thống tổng hợp nhóm danh mục/thuộc tính/giá mà Customer quan tâm. |
| 3 | Hệ thống xếp hạng sản phẩm theo logic Behavioral/Content-based MVP. |
| 4 | Hệ thống hiển thị danh sách “Dành cho bạn” trên Web/Mobile và có thể dùng trong Chatbot. |

#### Luồng thay thế / ngoại lệ

- Cold-start: trả về sản phẩm bán chạy nhất hoặc mới nhất theo cấu hình MVP.

## 4.6. UC-CART-01 - Quản lý giỏ hàng

<a id="table-14"></a>

| Mã Use Case | UC-CART-01 |
| --- | --- |
| Tên Use Case | Quản lý giỏ hàng |
| Actor chính | Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Quản lý các sản phẩm muốn mua trước checkout. |
| Tiền điều kiện | Customer đã đăng nhập; sản phẩm/biến thể tồn tại. |
| Hậu điều kiện | Giỏ hàng được cập nhật và vẫn giữ thông tin Store của từng item. |
| Yêu cầu liên quan | FR-CART-01, FR-CART-02, FR-CART-03 |
| Quy tắc/NFR liên quan | BR-01 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-15"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Customer thêm một ProductVariant vào giỏ. |
| 2 | Hệ thống lưu CartItem và Store tương ứng. |
| 3 | Customer xem giỏ và cập nhật số lượng hoặc xóa sản phẩm. |
| 4 | Hệ thống kiểm tra lại dữ liệu giá/tồn kho ở mức cần thiết. |
| 5 | Hệ thống nhóm/nhận biết các item theo Store để chuẩn bị checkout. |

#### Luồng thay thế / ngoại lệ

- Số lượng không hợp lệ hoặc vượt tồn: hệ thống từ chối cập nhật và thông báo.

## 4.7. UC-CHECKOUT-01 - Checkout sản phẩm của một Store

<a id="table-16"></a>

| Mã Use Case | UC-CHECKOUT-01 |
| --- | --- |
| Tên Use Case | Checkout sản phẩm của một Store |
| Actor chính | Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Tạo đơn hàng hợp lệ từ các CartItem thuộc cùng một Store. |
| Tiền điều kiện | Customer đã đăng nhập và có CartItem; có địa chỉ nhận hàng hợp lệ. |
| Hậu điều kiện | Order của một Store được tạo hoặc checkout bị dừng nếu điều kiện không thỏa. |
| Yêu cầu liên quan | FR-CHECKOUT-01, FR-CHECKOUT-02, FR-CHECKOUT-03, FR-PAY-01, FR-ORDER-01 |
| Quy tắc/NFR liên quan | BR-01, BR-02, BR-10, BR-15 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-17"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Customer mở Checkout. |
| 2 | Nếu giỏ có nhiều Store, Customer chọn nhóm sản phẩm thuộc một Store. |
| 3 | Hệ thống kiểm tra các item được chọn đều thuộc cùng store\_id. |
| 4 | Customer chọn địa chỉ nhận hàng. |
| 5 | Hệ thống kiểm tra lại giá, tồn kho và tính tổng tiền. |
| 6 | Customer xác nhận thông tin đơn. |
| 7 | Hệ thống chuyển sang bước thanh toán sandbox/giả lập. |
| 8 | Sau khi điều kiện thanh toán và tồn kho hợp lệ, hệ thống tạo Order gắn với Store đã chọn. |

#### Luồng thay thế / ngoại lệ

- Customer chọn sản phẩm nhiều Store trong cùng checkout: hệ thống từ chối và yêu cầu chọn một Store.

- Tồn kho/giá thay đổi: hệ thống cập nhật thông tin và yêu cầu xác nhận lại.

- Thanh toán thất bại: không hoàn tất đơn theo luồng thành công.

## 4.8. UC-PAY-01 - Thanh toán sandbox

<a id="table-18"></a>

| Mã Use Case | UC-PAY-01 |
| --- | --- |
| Tên Use Case | Thanh toán sandbox |
| Actor chính | Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Thực hiện hoặc giả lập thanh toán và ghi nhận trạng thái giao dịch cho luồng checkout. |
| Tiền điều kiện | Customer đang ở luồng checkout hợp lệ; thông tin đơn tạm thời, giá và tồn kho đã được kiểm tra ở mức yêu cầu. |
| Hậu điều kiện | Trạng thái giao dịch sandbox/mock được ghi nhận; luồng tạo Order tiếp tục hoặc dừng theo kết quả thanh toán. |
| Yêu cầu liên quan | FR-PAY-01 |
| Quy tắc/NFR liên quan | BR-15 |
| Nguồn đặc tả | Draft suy ra trực tiếp từ FR-PAY-01 và UC-CHECKOUT-01; SRS chưa có đặc tả riêng đầy đủ. |

#### Luồng chính

<a id="table-19"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Customer xác nhận thực hiện thanh toán trong luồng checkout. |
| 2 | Hệ thống gọi hoặc giả lập cổng thanh toán sandbox/mock. |
| 3 | Hệ thống nhận kết quả giao dịch. |
| 4 | Hệ thống ghi nhận trạng thái Payment. |
| 5 | Nếu trạng thái thanh toán đáp ứng luồng thành công, hệ thống cho phép tiếp tục tạo/hoàn tất Order theo UC-CHECKOUT-01. |

#### Luồng thay thế / ngoại lệ

- Thanh toán thất bại hoặc bị từ chối: hệ thống ghi nhận trạng thái phù hợp và không hoàn tất luồng thành công.

- Chi tiết callback, idempotency, status code và schema chưa được SRS chốt; sẽ được xác định trong API Specification/OpenAPI.

## 4.9. UC-ORDER-01 - Xem / theo dõi / hủy đơn

<a id="table-20"></a>

| Mã Use Case | UC-ORDER-01 |
| --- | --- |
| Tên Use Case | Xem / theo dõi / hủy đơn |
| Actor chính | Customer |
| Nền tảng | Client Web / Mobile |
| Mục tiêu | Xem lịch sử, chi tiết, trạng thái và gửi yêu cầu hủy khi được phép. |
| Tiền điều kiện | Customer đã đăng nhập và có đơn hàng. |
| Hậu điều kiện | Thông tin đơn được hiển thị; yêu cầu hủy được xử lý nếu trạng thái cho phép. |
| Yêu cầu liên quan | FR-ORDER-02, FR-ORDER-03, FR-ORDER-04 |
| Quy tắc/NFR liên quan | BR-05 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-21"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Customer mở lịch sử đơn hàng. |
| 2 | Hệ thống chỉ trả các Order thuộc customer\_id hiện tại. |
| 3 | Customer mở chi tiết một Order. |
| 4 | Hệ thống hiển thị sản phẩm, Store, địa chỉ, tổng tiền, payment status và trạng thái đơn. |
| 5 | Customer theo dõi trạng thái Pending/Confirmed/Processing/Shipped/Completed/Cancelled. |

#### Luồng thay thế / ngoại lệ

- Nếu đơn còn ở trạng thái cho phép, Customer có thể yêu cầu hủy; nếu không, hệ thống từ chối thao tác hủy.

## 4.10. UC-STORE-01 - Quản lý thông tin Store

<a id="table-22"></a>

| Mã Use Case | UC-STORE-01 |
| --- | --- |
| Tên Use Case | Quản lý thông tin Store |
| Actor chính | Store Owner |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Cập nhật thông tin gian hàng thuộc phạm vi quản lý của Store Owner. |
| Tiền điều kiện | Store Owner đã đăng nhập; có store\_id hợp lệ và quyền truy cập Store. |
| Hậu điều kiện | Thông tin Store được cập nhật nếu dữ liệu và quyền hợp lệ. |
| Yêu cầu liên quan | FR-STORE-01 |
| Quy tắc/NFR liên quan | BR-04, BR-06; NFR-ISO-01 |
| Nguồn đặc tả | Draft suy ra trực tiếp từ FR-STORE-01 và quy tắc ownership; SRS chưa có đặc tả riêng đầy đủ. |

#### Luồng chính

<a id="table-23"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Store Owner mở chức năng quản lý thông tin Store. |
| 2 | Hệ thống tải Store theo store\_id trong ngữ cảnh xác thực. |
| 3 | Owner cập nhật tên Store, mô tả, logo và/hoặc thông tin liên hệ. |
| 4 | Hệ thống kiểm tra dữ liệu và ownership. |
| 5 | Hệ thống lưu thay đổi và hiển thị thông tin Store đã cập nhật. |

#### Luồng thay thế / ngoại lệ

- Owner cố truy cập hoặc cập nhật Store ngoài phạm vi của mình: backend từ chối do ownership check.

- Quy tắc chi tiết về định dạng logo/thông tin liên hệ chưa được SRS xác định.

## 4.11. UC-STORE-02 - Quản lý nhân viên Seller

<a id="table-24"></a>

| Mã Use Case | UC-STORE-02 |
| --- | --- |
| Tên Use Case | Quản lý nhân viên Seller |
| Actor chính | Store Owner |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Quản lý tài khoản Seller thuộc Store của Owner. |
| Tiền điều kiện | Store Owner đã đăng nhập và có store\_id hợp lệ. |
| Hậu điều kiện | Seller thuộc Store được tạo/cập nhật/cấp quyền/khóa theo thao tác hợp lệ. |
| Yêu cầu liên quan | FR-STORE-02, FR-STORE-03 |
| Quy tắc/NFR liên quan | BR-03, BR-04, BR-06 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-25"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Store Owner mở chức năng quản lý Seller. |
| 2 | Hệ thống chỉ hiển thị Seller thuộc store\_id của Owner. |
| 3 | Owner tạo mới hoặc chọn Seller hiện có trong Store. |
| 4 | Owner cập nhật thông tin/quyền hoặc khóa tài khoản theo chức năng được hỗ trợ. |
| 5 | Hệ thống lưu thay đổi và đảm bảo Seller không vượt phạm vi Store. |

#### Luồng thay thế / ngoại lệ

- Owner cố thao tác Seller của Store khác: backend từ chối do ownership check.

## 4.12. UC-SPROD-01 - Đăng / cập nhật sản phẩm Store

<a id="table-26"></a>

| Mã Use Case | UC-SPROD-01 |
| --- | --- |
| Tên Use Case | Đăng / cập nhật sản phẩm Store |
| Actor chính | Store Owner, Seller |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Tạo hoặc cập nhật sản phẩm đa ngành hàng bằng ProductType và Dynamic Attributes. |
| Tiền điều kiện | Actor đã đăng nhập vào Management Portal và thuộc một Store xác định. |
| Hậu điều kiện | Sản phẩm hợp lệ được lưu với store\_id của actor; dữ liệu được chuẩn bị/đồng bộ phục vụ RAG. |
| Yêu cầu liên quan | FR-MPROD-02, FR-MPROD-03, FR-MPROD-04, FR-MPROD-05, FR-MPROD-08, FR-MPROD-09 |
| Quy tắc/NFR liên quan | BR-04, BR-08, BR-09 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-27"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Actor chọn Category và ProductType. |
| 2 | Hệ thống trả danh sách AttributeKeys tương ứng. |
| 3 | Actor nhập tên, mô tả, giá gốc và giá trị thuộc tính động. |
| 4 | Actor tạo ProductVariant/SKU nếu ProductType có biến thể. |
| 5 | Hệ thống validate thuộc tính bắt buộc và kiểu dữ liệu. |
| 6 | Hệ thống tự gắn store\_id của Actor và lưu Product/Variant. |
| 7 | Hệ thống phát/ghi nhận dữ liệu cần thiết để M4 tạo hoặc cập nhật Product Embedding. |

#### Luồng thay thế / ngoại lệ

- Thiếu thuộc tính bắt buộc hoặc sai kiểu dữ liệu: hệ thống báo lỗi và không lưu bản ghi không hợp lệ.

- Actor cố gán store\_id khác: backend từ chối.

## 4.13. UC-SPROD-02 - Cấu hình biến thể / SKU và hình ảnh

<a id="table-28"></a>

| Mã Use Case | UC-SPROD-02 |
| --- | --- |
| Tên Use Case | Cấu hình biến thể / SKU và hình ảnh |
| Actor chính | Store Owner, Seller |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Quản lý ProductVariant/SKU, giá, ảnh và thuộc tính biến thể của sản phẩm thuộc Store. |
| Tiền điều kiện | Actor đã đăng nhập; sản phẩm thuộc Store của actor và ProductType đã được xác định. |
| Hậu điều kiện | Biến thể/SKU và hình ảnh hợp lệ được lưu/cập nhật cho sản phẩm. |
| Yêu cầu liên quan | FR-MPROD-06, FR-MPROD-07 |
| Quy tắc/NFR liên quan | BR-04, BR-08, BR-09 |
| Nguồn đặc tả | Draft suy ra trực tiếp từ FR-MPROD-06 và FR-MPROD-07; SRS chưa có đặc tả riêng đầy đủ. |

#### Luồng chính

<a id="table-29"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Actor mở sản phẩm thuộc Store và chọn quản lý biến thể/hình ảnh. |
| 2 | Hệ thống hiển thị các biến thể/SKU và hình ảnh hiện có. |
| 3 | Actor thêm/cập nhật ProductVariant/SKU với giá, ảnh và thuộc tính biến thể. |
| 4 | Actor có thể thêm, xóa hoặc sắp xếp ảnh sản phẩm và ảnh biến thể. |
| 5 | Hệ thống kiểm tra ownership và dữ liệu hợp lệ. |
| 6 | Hệ thống lưu thay đổi. |

#### Luồng thay thế / ngoại lệ

- Actor thao tác sản phẩm ngoài Store: backend từ chối.

- Quy tắc chi tiết về uniqueness của SKU, giới hạn số ảnh và định dạng ảnh chưa được SRS chốt.

## 4.14. UC-INV-01 - Quản lý tồn kho và Stock Movement

<a id="table-30"></a>

| Mã Use Case | UC-INV-01 |
| --- | --- |
| Tên Use Case | Quản lý tồn kho và Stock Movement |
| Actor chính | Store Owner, Seller |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Theo dõi và điều chỉnh tồn kho theo ProductVariant. |
| Tiền điều kiện | Actor đã đăng nhập; ProductVariant thuộc Store của actor. |
| Hậu điều kiện | Tồn kho và lịch sử Stock Movement được cập nhật nhất quán. |
| Yêu cầu liên quan | FR-INV-01, FR-INV-02, FR-INV-03 |
| Quy tắc/NFR liên quan | BR-04, BR-10; NFR-REL-01 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-31"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Actor mở danh sách tồn kho của Store. |
| 2 | Hệ thống hiển thị quantity và reserved\_quantity theo biến thể. |
| 3 | Actor chọn nhập kho/xuất kho/điều chỉnh và nhập lý do. |
| 4 | Hệ thống kiểm tra quyền Store và dữ liệu số lượng. |
| 5 | Hệ thống cập nhật Inventory và ghi Stock Movement. |

#### Luồng thay thế / ngoại lệ

- Actor truy cập variant ngoài Store: backend từ chối.

- Dữ liệu điều chỉnh không hợp lệ: không cập nhật tồn kho.

## 4.15. UC-SORDER-01 - Xử lý và cập nhật trạng thái đơn Store

<a id="table-32"></a>

| Mã Use Case | UC-SORDER-01 |
| --- | --- |
| Tên Use Case | Xử lý và cập nhật trạng thái đơn Store |
| Actor chính | Store Owner, Seller |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Xử lý đơn hàng thuộc Store theo quy trình trạng thái. |
| Tiền điều kiện | Có Order thuộc store\_id của actor; actor đã đăng nhập Management Portal. |
| Hậu điều kiện | Trạng thái Order được cập nhật hợp lệ và Customer có thể nhận trạng thái mới. |
| Yêu cầu liên quan | FR-SORDER-01, FR-SORDER-02, FR-SORDER-03 |
| Quy tắc/NFR liên quan | BR-04 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-33"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Actor xem danh sách đơn được lọc theo store\_id. |
| 2 | Actor mở chi tiết đơn để xem SKU, số lượng, người nhận và payment status. |
| 3 |  |
| 4 | Hệ thống kiểm tra tính hợp lệ của chuyển trạng thái. |
| 5 | Hệ thống lưu thay đổi và hỗ trợ thông báo trạng thái cho Customer. |

#### Luồng thay thế / ngoại lệ

- Actor cố thao tác đơn Store khác: backend từ chối.

- Chuyển trạng thái không hợp lệ theo rule: hệ thống từ chối cập nhật.

## 4.16. UC-REP-01 - Xem báo cáo doanh thu Store

<a id="table-34"></a>

| Mã Use Case | UC-REP-01 |
| --- | --- |
| Tên Use Case | Xem báo cáo doanh thu Store |
| Actor chính | Store Owner |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Theo dõi các chỉ số kinh doanh của Store trong phạm vi được phép. |
| Tiền điều kiện | Store Owner đã đăng nhập và có Store hợp lệ. |
| Hậu điều kiện | Dashboard/báo cáo Store được hiển thị theo dữ liệu và khoảng thời gian được chọn. |
| Yêu cầu liên quan | FR-REP-01, FR-REP-02 |
| Quy tắc/NFR liên quan | BR-06, BR-07 |
| Nguồn đặc tả | Draft suy ra trực tiếp từ FR-REP-01, FR-REP-02 và BR-07; SRS chưa có đặc tả riêng đầy đủ. |

#### Luồng chính

<a id="table-35"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Store Owner mở Dashboard hoặc chức năng báo cáo Store. |
| 2 | Hệ thống giới hạn dữ liệu theo store\_id của Owner. |
| 3 | Hệ thống hiển thị tổng quan gồm doanh thu, số đơn, sản phẩm bán chạy và tồn kho thấp. |
| 4 | Owner chọn ngày/tháng/khoảng thời gian khi xem doanh thu. |
| 5 | Hệ thống hiển thị doanh thu và thống kê sản phẩm của Store theo tiêu chí được hỗ trợ. |

#### Luồng thay thế / ngoại lệ

- Seller không phải Store Owner truy cập báo cáo doanh thu tổng: hệ thống từ chối theo phân quyền.

- Công thức chi tiết cho từng metric chưa được SRS xác định.

## 4.17. UC-ADMIN-01 - Quản lý Store / Seller / Customer

<a id="table-36"></a>

| Mã Use Case | UC-ADMIN-01 |
| --- | --- |
| Tên Use Case | Quản lý Store / Seller / Customer |
| Actor chính | Administrator |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Quản trị các đối tượng người dùng và Store ở phạm vi toàn nền tảng. |
| Tiền điều kiện | Administrator đã đăng nhập với Global Scope. |
| Hậu điều kiện | Trạng thái/thông tin đối tượng quản trị được cập nhật theo thao tác hợp lệ. |
| Yêu cầu liên quan | FR-STORE-04, FR-ADMIN-01, FR-ADMIN-02, FR-ADMIN-04, FR-ADMIN-05 |
| Quy tắc/NFR liên quan | Administrator có Global Scope theo SRS. |
| Nguồn đặc tả | Draft suy ra trực tiếp từ các FR quản trị; SRS chưa có đặc tả riêng đầy đủ. |

#### Luồng chính

<a id="table-37"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Administrator mở chức năng quản trị nền tảng. |
| 2 | Hệ thống cho phép tra cứu danh sách Store/Seller/Customer theo phạm vi Global Scope. |
| 3 | Admin xem thông tin hoặc trạng thái đối tượng cần quản lý. |
| 4 | Admin thực hiện thao tác được hỗ trợ: duyệt/khóa/mở/cập nhật trạng thái Store/Seller hoặc quản lý trạng thái Customer. |
| 5 | Hệ thống kiểm tra quyền Administrator và lưu thay đổi. |
| 6 | Admin có thể tra cứu sản phẩm/đơn hàng toàn nền tảng để giám sát theo các chức năng quản trị liên quan. |

#### Luồng thay thế / ngoại lệ

- Dữ liệu hoặc thao tác không hợp lệ: hệ thống từ chối và báo lỗi.

- Quy trình phê duyệt Store/Seller chi tiết chưa được SRS chốt.

## 4.18. UC-ADMIN-02 - Quản lý Category, ProductType và AttributeKey

<a id="table-38"></a>

| Mã Use Case | UC-ADMIN-02 |
| --- | --- |
| Tên Use Case | Quản lý Category, ProductType và AttributeKey |
| Actor chính | Administrator |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Thiết lập taxonomy và cấu trúc thuộc tính động dùng chung toàn sàn. |
| Tiền điều kiện | Administrator đã đăng nhập với Global Scope. |
| Hậu điều kiện | Danh mục/ProductType/AttributeKey được cập nhật và có thể dùng trong form sản phẩm Seller/Owner. |
| Yêu cầu liên quan | FR-PTYPE-01, FR-CATEGORY-ADMIN-01 |
| Quy tắc/NFR liên quan | BR-08, BR-09 |
| Nguồn đặc tả | Đặc tả cốt lõi trong SRS. |

#### Luồng chính

<a id="table-39"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Admin mở chức năng quản lý danh mục hoặc Product Type. |
| 2 | Admin CRUD Category dùng chung toàn sàn. |
| 3 | Admin CRUD ProductType và gắn ProductType với Category. |
| 4 | Admin cấu hình AttributeKey gồm code, name, data\_type và is\_variant\_factor. |
| 5 | Hệ thống lưu cấu hình và cung cấp cho Management Portal khi Seller/Owner tạo sản phẩm. |

#### Luồng thay thế / ngoại lệ

- Dữ liệu cấu hình không hợp lệ: hệ thống từ chối lưu và báo lỗi.

## 4.19. UC-ADMIN-03 - Quản lý Role / Permission

<a id="table-40"></a>

| Mã Use Case | UC-ADMIN-03 |
| --- | --- |
| Tên Use Case | Quản lý Role / Permission |
| Actor chính | Administrator |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Quản lý cấu hình Role và Permission phục vụ cơ chế RBAC của hệ thống. |
| Tiền điều kiện | Administrator đã đăng nhập với Global Scope. |
| Hậu điều kiện | Cấu hình Role/Permission được cập nhật theo thiết kế RBAC. |
| Yêu cầu liên quan | FR-ADMIN-03 |
| Quy tắc/NFR liên quan | NFR-SEC-02, NFR-SEC-03; việc kiểm tra quyền phải thực hiện ở backend. |
| Nguồn đặc tả | Draft suy ra trực tiếp từ FR-ADMIN-03; SRS chưa có đặc tả riêng đầy đủ. |

#### Luồng chính

<a id="table-41"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Administrator mở chức năng quản lý Role/Permission. |
| 2 | Hệ thống hiển thị cấu hình Role và Permission hiện có theo thiết kế RBAC. |
| 3 | Admin thực hiện thao tác quản lý được hỗ trợ. |
| 4 | Hệ thống kiểm tra dữ liệu và quyền Global Scope. |
| 5 | Hệ thống lưu cấu hình Role/Permission. |

#### Luồng thay thế / ngoại lệ

- Cấu hình không hợp lệ hoặc Admin không có quyền phù hợp: hệ thống từ chối.

- Mô hình chi tiết Role-Permission, các permission code và quy tắc chỉnh sửa chưa được SRS xác định.

## 4.20. UC-AIMON-01 - Theo dõi Chatbot / RAG / Recommendation

<a id="table-42"></a>

| Mã Use Case | UC-AIMON-01 |
| --- | --- |
| Tên Use Case | Theo dõi Chatbot / RAG / Recommendation |
| Actor chính | Administrator |
| Nền tảng | Admin Web / Management Portal |
| Mục tiêu | Theo dõi log/metric của Chatbot, RAG, Recommendation và trạng thái dữ liệu/vector index ở mức MVP. |
| Tiền điều kiện | Administrator đã đăng nhập; các module AI/monitoring tương ứng đã được triển khai. |
| Hậu điều kiện | Admin xem được các thông tin giám sát AI được hệ thống cung cấp. |
| Yêu cầu liên quan | FR-ADMIN-06, FR-ADMIN-07, FR-REC-08 |
| Quy tắc/NFR liên quan | NFR-AI-01, NFR-PRIV-01 |
| Nguồn đặc tả | Draft suy ra trực tiếp từ FR-ADMIN-06, FR-ADMIN-07, FR-REC-08; SRS chưa có đặc tả riêng đầy đủ. |

#### Luồng chính

<a id="table-43"></a>

| Bước | Mô tả |
| --- | --- |
| 1 | Administrator mở chức năng theo dõi AI. |
| 2 | Hệ thống hiển thị log/metric Chatbot &amp; RAG ở mức MVP. |
| 3 | Hệ thống hiển thị trạng thái Vector Index ở mức được triển khai. |
| 4 | Hệ thống hiển thị metric/log Recommendation và dữ liệu hành vi ở mức MVP. |
| 5 | Admin sử dụng thông tin hiển thị để giám sát trạng thái và lỗi xử lý. |

#### Luồng thay thế / ngoại lệ

- Nếu một metric hoặc module monitoring chưa được triển khai trong MVP, giao diện chỉ hiển thị phần dữ liệu khả dụng.

- Danh sách metric cụ thể ngoài các nội dung nêu trong SRS chưa được chốt.

## 5. Ma trận truy vết Use Case - Functional Requirement

Bảng dưới đây giúp nhóm truy từ Use Case sang các Functional Requirements đã được sử dụng để xây dựng đặc tả.

<a id="table-44"></a>

| Use Case | Tên | Functional Requirements liên quan |
| --- | --- | --- |
| UC-AUTH-01 | Đăng ký / Đăng nhập Customer | FR-AUTH-01, FR-AUTH-02, FR-AUTH-03 |
| UC-PROD-01 | Duyệt, tìm kiếm và lọc sản phẩm | FR-CAT-02, FR-SEARCH-01, FR-SEARCH-02, FR-SEARCH-03, FR-SEARCH-04, FR-REC-01 |
| UC-PROD-02 | Xem chi tiết sản phẩm và gợi ý liên quan | FR-PROD-01, FR-REC-02, FR-REC-05 |
| UC-CHAT-01 | Chatbot tư vấn mua sắm AI | FR-AI-01 .. FR-AI-07; FR-AI-08 khi lưu lịch sử được triển khai |
| UC-REC-01 | Xem “Dành cho bạn” | FR-REC-01 .. FR-REC-07 |
| UC-CART-01 | Quản lý giỏ hàng | FR-CART-01, FR-CART-02, FR-CART-03 |
| UC-CHECKOUT-01 | Checkout sản phẩm của một Store | FR-CHECKOUT-01, FR-CHECKOUT-02, FR-CHECKOUT-03, FR-PAY-01, FR-ORDER-01 |
| UC-PAY-01 | Thanh toán sandbox | FR-PAY-01 |
| UC-ORDER-01 | Xem / theo dõi / hủy đơn | FR-ORDER-02, FR-ORDER-03, FR-ORDER-04 |
| UC-STORE-01 | Quản lý thông tin Store | FR-STORE-01 |
| UC-STORE-02 | Quản lý nhân viên Seller | FR-STORE-02, FR-STORE-03 |
| UC-SPROD-01 | Đăng / cập nhật sản phẩm Store | FR-MPROD-02, FR-MPROD-03, FR-MPROD-04, FR-MPROD-05, FR-MPROD-08, FR-MPROD-09 |
| UC-SPROD-02 | Cấu hình biến thể / SKU và hình ảnh | FR-MPROD-06, FR-MPROD-07 |
| UC-INV-01 | Quản lý tồn kho và Stock Movement | FR-INV-01, FR-INV-02, FR-INV-03 |
| UC-SORDER-01 | Xử lý và cập nhật trạng thái đơn Store | FR-SORDER-01, FR-SORDER-02, FR-SORDER-03 |
| UC-REP-01 | Xem báo cáo doanh thu Store | FR-REP-01, FR-REP-02 |
| UC-ADMIN-01 | Quản lý Store / Seller / Customer | FR-STORE-04, FR-ADMIN-01, FR-ADMIN-02, FR-ADMIN-04, FR-ADMIN-05 |
| UC-ADMIN-02 | Quản lý Category, ProductType và AttributeKey | FR-PTYPE-01, FR-CATEGORY-ADMIN-01 |
| UC-ADMIN-03 | Quản lý Role / Permission | FR-ADMIN-03 |
| UC-AIMON-01 | Theo dõi Chatbot / RAG / Recommendation | FR-ADMIN-06, FR-ADMIN-07, FR-REC-08 |

## 6. Các điểm cần chốt trước khi freeze Use Case Specification

- Phạm vi MVP giữa Đề cương cũ (1 Seller/1 Store) và SRS hiện tại (Multi-Store/Multi-Seller, checkout 1 Store/lần) cần được nhóm và giảng viên thống nhất.

- Chi tiết API như request/response schema, status code, pagination, error contract và idempotency chưa được SRS mặc định hóa; phải chốt trong API Specification/OpenAPI.

- Quy tắc chi tiết của thanh toán sandbox, callback và trạng thái Payment chưa được SRS đặc tả đầy đủ.

- Quy tắc cụ thể về SKU uniqueness, giới hạn ảnh, định dạng ảnh và các validation chi tiết của ProductVariant chưa được SRS chốt.

- Công thức metric báo cáo doanh thu và danh sách metric monitoring AI cụ thể cần được xác định khi thiết kế/dashboard.

- Chi tiết permission code và cấu trúc Role-Permission cần được chốt trong RBAC Matrix/thiết kế M3.
