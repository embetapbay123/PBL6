# Đặc tả yêu cầu phần mềm

Nguồn: [SRS_v1.2.docx](../../docs_old/SRS_v1.2.docx).

> Bản chuyển đổi nội dung từ tài liệu gốc, chưa hợp nhất các mâu thuẫn nghiệp vụ. Xem [báo cáo rà soát](../RA_SOAT.md) trước khi dùng làm baseline triển khai.

ĐỒ ÁN PBL 6

DỰ ÁN CHUYÊN NGÀNH CÔNG NGHỆ PHẦN MỀM

SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

ĐẶC TẢ YÊU CẦU PHẦN MỀM

XÂY DỰNG NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ<br>CÓ CHATBOT TƯ VẤN MUA SẮM THÔNG MINH

Multi-Store Marketplace - MVP Multi-Seller<br>Multi-Store Checkout - Split Order by Store - RBAC - Dynamic Product Attributes - LLM/RAG

<a id="table-1"></a>

| Thông tin | Nội dung |
| --- | --- |
| Giảng viên phụ trách | Mai Văn Hà, Lê Thị Mỹ Hạnh |
| Nhóm thực hiện |  |
| Lớp |  |
| Phiên bản tài liệu | 1.1 - SRS Revised Draft |
| Năm | 2026 |

Đà Nẵng, 2026

## THÔNG TIN TÀI LIỆU

<a id="table-2"></a>

| Thuộc tính | Giá trị |
| --- | --- |
| Tên tài liệu | Software Requirements Specification (SRS) |
| Tên hệ thống | Nền tảng thương mại điện tử có chatbot tư vấn mua sắm thông minh |
| Phạm vi MVP | Multi-Store / Multi-Seller; Multi-Store Checkout; tự động tách Order theo Store |
| Nền tảng | Client Web; Admin Web / Management Portal; Mobile App Customer (Flutter/Android) |
| Kiến trúc | SOA qua API Gateway; M1 Product &amp; Inventory, M2 Order &amp; Payment, M3 Identity &amp; Seller, M4 AI Recommendation &amp; Chatbot |
| Cơ sở tài liệu | Đề cương chi tiết PBL 6 - phiên bản Multi-Store Marketplace |

## LỊCH SỬ PHIÊN BẢN

<a id="table-3"></a>

| Phiên bản | Ngày | Nội dung | Trạng thái |
| --- | --- | --- | --- |
| 1.0 | 09/09/2026 | Khởi tạo SRS từ đề cương chi tiết Multi-Store Marketplace | Draft |
| 1.1 | 22/09/2026 | Đồng bộ Multi-Store Checkout/Split Order; bổ sung transaction, bảo mật, hiệu năng, Mobile Flutter và Recommendation có mô hình huấn luyện offline. | Revised Draft |

## MỤC LỤC

- 1. Giới thiệu

- 2. Mô tả tổng quan hệ thống

- 3. Yêu cầu giao diện và tích hợp

- 4. Yêu cầu chức năng

- 5. Quy tắc nghiệp vụ

- 6. Yêu cầu dữ liệu

- 7. Yêu cầu phi chức năng

- 8. Danh mục Use Case

- 9. Đặc tả Use Case cốt lõi

- 10. Tiêu chí nghiệm thu MVP

- 11. Ngoài phạm vi MVP và hướng phát triển

- 12. Ma trận truy vết yêu cầu

## 1. GIỚI THIỆU

### 1.1. Mục đích tài liệu

Tài liệu này đặc tả các yêu cầu phần mềm cho hệ thống “Xây dựng nền tảng thương mại điện tử có chatbot tư vấn mua sắm thông minh”. SRS là cơ sở thống nhất phạm vi giữa nhóm phát triển, giảng viên và các bên liên quan; đồng thời làm đầu vào cho thiết kế kiến trúc, thiết kế cơ sở dữ liệu, thiết kế giao diện, API Contract, lập trình, kiểm thử và nghiệm thu.

### 1.2. Phạm vi sản phẩm

Hệ thống là một nền tảng thương mại điện tử theo định hướng Multi-Store Marketplace. Trong MVP có nhiều Seller và nhiều Store hoạt động đồng thời. Customer có thể duyệt sản phẩm trên nhiều Store, thêm sản phẩm từ nhiều Store vào giỏ hàng và checkout các CartItem thuộc một hoặc nhiều Store trong cùng một lần. Hệ thống tự động nhóm CartItem theo store\_id và tạo một Order riêng cho mỗi Store sau khi kiểm tra tồn kho và thanh toán hợp lệ. Hệ thống tích hợp chatbot LLM + RAG và Recommendation Engine cá nhân hóa.

### 1.3. Đối tượng đọc tài liệu

- Giảng viên hướng dẫn và hội đồng đánh giá đồ án.

- Nhóm phát triển: Frontend Web, Backend, Mobile.

- Người kiểm thử và người viết tài liệu Use Case / Test Case.

- Các bên liên quan cần xác nhận phạm vi MVP và tiêu chí nghiệm thu.

### 1.4. Thuật ngữ và viết tắt

<a id="table-4"></a>

| Thuật ngữ | Giải thích |
| --- | --- |
| MVP | Minimum Viable Product - phiên bản sản phẩm tối thiểu khả dụng. |
| Store | Gian hàng trên nền tảng; thuộc một Store Owner. |
| Seller | Nhân viên bán hàng thuộc đúng một Store trong phạm vi MVP. |
| Store Owner | Chủ gian hàng; có toàn quyền trong phạm vi Store. |
| RBAC | Role-Based Access Control - phân quyền dựa trên vai trò. |
| Ownership Check | Kiểm tra quyền truy cập dựa trên chủ sở hữu dữ liệu, đặc biệt theo store\_id/customer\_id. |
| SOA | Service-Oriented Architecture - kiến trúc hướng dịch vụ. |
| RAG | Retrieval-Augmented Generation - sinh câu trả lời dựa trên dữ liệu truy xuất. |
| LLM | Large Language Model - mô hình ngôn ngữ lớn. |
| Dynamic Attributes | Thuộc tính động thay đổi theo Product Type. |
| SKU / Variant | Biến thể sản phẩm có mã SKU, giá/ảnh/thuộc tính riêng. |
| pgvector | Extension PostgreSQL dùng lưu và tìm kiếm vector embedding. |

### 1.5. Tài liệu tham chiếu

Tài liệu được xây dựng dựa trên “Đề Cương.docx” của đồ án PBL 6, bản đã chốt hướng Multi-Store / Multi-Seller, RBAC, Dynamic Product Attributes, Recommendation Engine và Chatbot RAG. Các chi tiết không được nêu trong đề cương được giữ ở mức “chưa xác định” hoặc “sẽ chốt trong thiết kế/API Specification”, thay vì tự bổ sung thành yêu cầu bắt buộc.

## 2. MÔ TẢ TỔNG QUAN HỆ THỐNG

### 2.1. Bối cảnh và mục tiêu

Hệ thống giải quyết hạn chế của mô hình tìm kiếm thương mại điện tử truyền thống bằng cách kết hợp duyệt/tìm kiếm sản phẩm, lọc theo thuộc tính động, recommendation cá nhân hóa và chatbot tư vấn bằng ngôn ngữ tự nhiên. RAG giúp chatbot giới hạn câu trả lời theo dữ liệu sản phẩm thực tế thay vì tự suy diễn thông tin không có căn cứ.

### 2.2. Nhóm người dùng và phạm vi quyền

<a id="table-5"></a>

| Actor | Phạm vi | Quyền chính |
| --- | --- | --- |
| Guest | Public Scope | Xem/tìm kiếm sản phẩm, xem Store, dùng chatbot cơ bản, đăng ký tài khoản. |
| Customer | Personal Scope | Quản lý hồ sơ, địa chỉ, chatbot cá nhân hóa, giỏ hàng, checkout, thanh toán sandbox, theo dõi đơn, xem “Dành cho bạn”. |
| Seller | 01 Store Scope | Xem/sửa sản phẩm của Store, quản lý biến thể/tồn kho, điều chỉnh kho, xem và cập nhật trạng thái đơn của Store. Không xem báo cáo doanh thu tổng. |
| Store Owner | 01 Store Scope | Bao gồm quyền Seller; quản lý thông tin Store, nhân viên Seller, phân quyền trong Store và xem báo cáo doanh thu Store. |
| Administrator | Global Scope | Quản lý Store/Seller/Customer, danh mục toàn sàn, Product Type/Attribute Key, Role/Permission, kiểm soát sản phẩm, giám sát đơn và AI. |

### 2.3. Kiến trúc logic

Ba kênh giao diện Client Web, Admin Web/Management Portal và Mobile App truy cập backend thông qua API Gateway. Backend được chia thành bốn service/module nghiệp vụ theo định hướng SOA.

<a id="table-6"></a>

| Module | Đối tượng chính | Trách nhiệm |
| --- | --- | --- |
| M1 - Product &amp; Inventory | Product, Category, ProductType, AttributeKey, ProductVariant, Inventory, StockMovement | Quản lý danh mục, loại sản phẩm, thuộc tính động, sản phẩm/biến thể, giá và tồn kho theo Store ownership. |
| M2 - Order &amp; Payment | Cart, CartItem, Order, OrderItem, Payment, Promotion | Quản lý giỏ hàng, checkout, đơn hàng, trạng thái đơn, thanh toán sandbox và báo cáo doanh thu Store. |
| M3 - Identity &amp; Seller | User, Customer, Seller, Store, Role, Permission, Address | Xác thực, RBAC, quản lý tài khoản và Store, Data Isolation Middleware. |
| M4 - AI Recommendation &amp; Chatbot | ChatSession, ChatMessage, SearchHistory, ProductViewHistory, UserPreference, ProductEmbedding | Semantic search, RAG, hội thoại LLM và recommendation cá nhân hóa. |

### 2.4. Ràng buộc phạm vi MVP

- Nhiều Store/Seller hoạt động đồng thời; một lần checkout có thể chứa CartItem thuộc một hoặc nhiều Store và hệ thống tự động tách thành một Order riêng cho từng Store.

- Các Order sinh ra từ cùng một lần checkout được liên kết bằng checkout\_session\_id/order\_group\_id để truy vết; mỗi Order chỉ thuộc đúng một Store.

- Không triển khai commission, payout, settlement, Seller Wallet hoặc dispute phức tạp.

- Thanh toán và vận chuyển chạy ở chế độ sandbox/mock/giả lập.

- Không tự huấn luyện LLM; sử dụng API/mô hình sẵn có qua framework tích hợp.

- Không xây Mobile App cho Seller/Administrator.

- Recommendation MVP dùng Content-based + Behavioral làm baseline và bổ sung một mô hình Collaborative Filtering/Matrix Factorization được huấn luyện offline từ implicit feedback; Deep Learning Recommendation là hướng phát triển.

## 3. YÊU CẦU GIAO DIỆN VÀ TÍCH HỢP

### 3.1. Client Web

Client Web phục vụ Guest và Customer, là kênh mua sắm đầy đủ trên trình duyệt. Các màn hình chính gồm: trang chủ, danh mục, tìm kiếm/lọc, chi tiết sản phẩm, trang Store, chatbot, giỏ hàng, checkout, thanh toán sandbox, lịch sử/tracking đơn, hồ sơ/địa chỉ, lịch sử hội thoại, sản phẩm đã xem và “Dành cho bạn”.

### 3.2. Admin Web / Management Portal

Management Portal dùng chung nhưng hiển thị chức năng theo RBAC. Seller và Store Owner chỉ thao tác dữ liệu thuộc store\_id của mình; Administrator có Global Scope. Portal phải hỗ trợ form động theo ProductType để nhập thuộc tính khác nhau cho từng ngành hàng.

### 3.3. Mobile App

Mobile App dành cho Customer, triển khai bằng Flutter và ưu tiên build Android APK trong MVP. Ứng dụng sử dụng cùng REST API và business rules với Client Web, tập trung các luồng: xác thực, duyệt/tìm/lọc sản phẩm, chi tiết sản phẩm, chatbot AI, giỏ hàng, multi-store checkout, thanh toán sandbox, lịch sử/tracking đơn, hồ sơ, địa chỉ, sản phẩm đã xem và recommendation cá nhân hóa.

### 3.4. API Gateway và Service Contract

- Mọi client truy cập backend qua API Gateway.

- API sử dụng REST/JSON; contract được mô tả bằng OpenAPI 3.0 / Swagger.

- API ưu tiên stateless; xác thực bằng JWT chứa user\_id, role và store\_id khi áp dụng.

- Các service không truy cập trực tiếp dữ liệu nội bộ của service khác; trao đổi qua REST API nội bộ hoặc Domain Events theo thiết kế.

### 3.5. Tích hợp bên ngoài

<a id="table-7"></a>

| Hệ thống ngoài | Mục đích | Phạm vi MVP |
| --- | --- | --- |
| Gemini API/Deepseek API | Sinh nội dung chatbot từ Context RAG và hội thoại | Sử dụng mô hình/API sẵn có, không fine-tune từ đầu. |
| PostgreSQL + pgvector | Lưu dữ liệu quan hệ, JSONB và vector embedding | Dùng chung hạ tầng PostgreSQL; pgvector phục vụ semantic search/RAG. |
| VNPAY/Momo mock | Mô phỏng thanh toán | Sandbox/mock; không yêu cầu settlement thực tế. |

## 4. YÊU CẦU CHỨC NĂNG

Các yêu cầu dưới đây được mã hóa theo nhóm chức năng để thuận tiện truy vết sang Use Case, API và Test Case. Cột “Nguồn đề cương” giữ các mã chức năng tương ứng trong đề cương.

### 4.1. Xác thực, tài khoản và hồ sơ

<a id="table-8"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-AUTH-01 | Hệ thống phải cho phép Guest đăng ký tài khoản Customer. | Guest | CW-02, MB-01 |
| FR-AUTH-02 | Hệ thống phải cho phép Customer/Seller/Store Owner/Admin đăng nhập và đăng xuất theo tài khoản được cấp. | Tất cả actor có tài khoản | CW-02, MB-01; RBAC |
| FR-AUTH-03 | Hệ thống phải hỗ trợ quên/đổi mật khẩu cho Customer trên Client Web theo phạm vi đề cương. | Guest/Customer | CW-02 |
| FR-AUTH-04 | Hệ thống phải xác thực request quản trị bằng JWT và áp dụng role + ownership check ở backend. | Seller/Owner/Admin | M3; Security |
| FR-PROFILE-01 | Customer phải có thể xem/cập nhật họ tên, số điện thoại và thông tin cơ bản. | Customer | CW-17, MB-12 |
| FR-ADDR-01 | Customer phải có thể thêm/sửa/xóa/chọn địa chỉ nhận hàng mặc định. | Customer | CW-18, MB-13 |

### 4.2. Duyệt, tìm kiếm và xem sản phẩm

<a id="table-9"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-CAT-01 | Hệ thống phải hiển thị trang chủ với banner, danh mục, sản phẩm nổi bật/mới và lối vào chatbot. | Guest/Customer | CW-01, MB-02 |
| FR-CAT-02 | Hệ thống phải cho phép duyệt sản phẩm theo danh mục và Product Type. | Guest/Customer | CW-03, MB-03 |
| FR-SEARCH-01 | Hệ thống phải cho phép tìm sản phẩm theo tên/từ khóa. | Guest/Customer | CW-04, MB-03 |
| FR-SEARCH-02 | Hệ thống phải cho phép lọc theo giá, danh mục và thuộc tính động phù hợp Product Type. | Guest/Customer | CW-05, MB-03 |
| FR-SEARCH-03 | Hệ thống phải hỗ trợ sắp xếp tối thiểu theo giá và mới nhất trên Client Web. | Guest/Customer | CW-05 |
| FR-SEARCH-04 | Hệ thống có thể kết hợp semantic search ở mức phù hợp với MVP. | Guest/Customer | CW-04; M4 |
| FR-PROD-01 | Trang chi tiết phải hiển thị ảnh, giá, mô tả, thuộc tính động, tồn kho và thông tin Store. | Guest/Customer | CW-06, MB-04 |
| FR-STOREVIEW-01 | Hệ thống phải cho phép xem thông tin một Store và danh sách sản phẩm thuộc Store đó. | Guest/Customer | CW-07 |

### 4.3. Giỏ hàng, checkout, thanh toán và đơn hàng

<a id="table-10"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-CART-01 | Customer phải có thể thêm sản phẩm/biến thể vào giỏ hàng. | Customer | CW-10, MB-07 |
| FR-CART-02 | Customer phải có thể xóa và cập nhật số lượng CartItem. | Customer | CW-10, MB-07 |
| FR-CART-03 | Giỏ hàng phải nhóm hoặc nhận biết CartItem theo Store để hỗ trợ multi-store checkout và split Order theo store\_id. | Customer | CW-10 |
| FR-CHECKOUT-01 | Tại checkout, Customer có thể chọn CartItem thuộc một hoặc nhiều Store trong cùng một lần giao dịch. | Customer | CW-11, MB-08; MVP rule |
| FR-CHECKOUT-02 | Hệ thống phải kiểm tra lại trạng thái sản phẩm, giá và tồn kho của toàn bộ CartItem được chọn trước khi thanh toán và tạo Order. | Customer | CW-10, CW-13 |
| FR-CHECKOUT-03 | Customer phải chọn địa chỉ giao hàng và xác nhận danh sách sản phẩm, tổng tiền toàn checkout trước khi đặt hàng. | Customer | CW-11, MB-08 |
| FR-CHECKOUT-04 | Nếu bất kỳ CartItem nào không hợp lệ hoặc không đủ tồn kho tại thời điểm xác nhận, toàn bộ checkout phải thất bại và không được tạo một phần Order. | Customer/System | M2; Reliability |
| FR-CHECKOUT-05 | Hệ thống phải reserve/giữ tồn kho theo cơ chế nhất quán trong quá trình checkout và hoàn trả phần giữ tồn nếu thanh toán thất bại hoặc checkout bị hủy. | System | M1/M2; Inventory consistency |
| FR-PAY-01 | Hệ thống phải hỗ trợ một giao dịch thanh toán sandbox/mock cho tổng giá trị của toàn checkout và ghi nhận trạng thái giao dịch. | Customer | CW-12, MB-09 |
| FR-PAY-02 | Payment phải có trạng thái tối thiểu Pending/Success/Failed/Cancelled và liên kết với checkout\_session\_id/order\_group\_id. | Customer/System | M2; Payment state |
| FR-ORDER-01 | Sau khi thanh toán và kiểm tra tồn kho hợp lệ, hệ thống phải nhóm CartItem theo store\_id và tạo một Order riêng cho mỗi Store; các Order cùng checkout phải liên kết bằng checkout\_session\_id/order\_group\_id. | Customer | CW-13 |
| FR-ORDER-02 | Customer phải xem được lịch sử đơn và chi tiết từng đơn. | Customer | CW-14, MB-10 |
| FR-ORDER-03 | Customer phải theo dõi trạng thái Pending/Confirmed/Processing/Shipped/Completed/Cancelled. | Customer | CW-15, MB-11 |
| FR-ORDER-04 | Customer phải có thể yêu cầu hủy đơn khi đơn còn ở trạng thái cho phép. | Customer | CW-16 |

### 4.4. Recommendation và lịch sử hành vi

<a id="table-11"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-REC-01 | Hệ thống phải ghi nhận lịch sử tìm kiếm của Customer đăng nhập để phục vụ cá nhân hóa. | Customer | CW-20; M4 |
| FR-REC-02 | Hệ thống phải ghi nhận lịch sử xem sản phẩm của Customer. | Customer | CW-21, MB-14; M4 |
| FR-REC-03 | Hệ thống phải sử dụng tín hiệu giỏ hàng và lịch sử mua hàng khi tổng hợp sở thích người dùng ở mức MVP. | Customer | CW-22; mục tiêu Recommendation |
| FR-REC-04 | Trang chủ phải hiển thị khu vực “Dành cho bạn” cho Customer đăng nhập khi có dữ liệu phù hợp. | Customer | CW-01, CW-22, MB-15 |
| FR-REC-05 | Tại trang chi tiết, hệ thống phải trả về sản phẩm liên quan dựa trên Category, ProductType, PriceSimilarity và SameStore theo mô hình điểm MVP. | Guest/Customer | CW-23; Recommendation luồng 1 |
| FR-REC-06 | Recommendation hành vi phải khai thác tìm kiếm gần đây, sản phẩm đã xem, giỏ hàng và dữ liệu hành vi đã có để xác định nhóm quan tâm. | Customer | Recommendation luồng 2 |
| FR-REC-07 | Nếu Customer chưa có lịch sử, hệ thống phải fallback sang sản phẩm bán chạy nhất hoặc mới nhất theo cấu hình MVP. | Customer | Cold-start fallback |
| FR-REC-08 | Store Owner/Admin có thể xem metric/log recommendation ở mức được triển khai. | Store Owner/Admin | AW-A10; Dashboard/monitoring |
| FR-REC-09 | Hệ thống phải có pipeline tạo implicit interaction dataset từ hành vi như view, search/click, add-to-cart và purchase để phục vụ huấn luyện recommendation. | System | M4; AI training |
| FR-REC-10 | MVP phải huấn luyện offline tối thiểu một mô hình Collaborative Filtering/Matrix Factorization trên implicit feedback và trả Top-K sản phẩm cho Customer khi có đủ dữ liệu. | System/Customer | M4; AI training |
| FR-REC-11 | Nếu mô hình huấn luyện chưa khả dụng hoặc Customer cold-start, hệ thống phải fallback sang Content-based/Behavioral hoặc sản phẩm bán chạy/mới nhất theo cấu hình. | System/Customer | M4; fallback |

### 4.5. Chatbot AI và RAG

<a id="table-12"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-AI-01 | Guest/Customer phải có thể gửi yêu cầu mua sắm bằng ngôn ngữ tự nhiên và nhận gợi ý sản phẩm. | Guest/Customer | CW-08, MB-05 |
| FR-AI-02 | Chatbot phải hỗ trợ hội thoại nhiều lượt và sử dụng Conversation Context. | Guest/Customer | CW-08; RAG Pipeline |
| FR-AI-03 | Với Customer đăng nhập, chatbot phải có thể kết hợp User Preference và lịch sử hành vi để cá nhân hóa tư vấn. | Customer | CW-08, MB-16 |
| FR-AI-04 | Chatbot phải truy xuất Top-K product context thông qua semantic/vector search trước khi tạo câu trả lời RAG. | Guest/Customer | RAG Pipeline |
| FR-AI-05 | Chatbot chỉ được giới thiệu sản phẩm có trong retrieved context và không tự tạo giá/thông số/khuyến mãi không tồn tại. | Guest/Customer | Nguyên tắc hạn chế hallucination |
| FR-AI-06 | Nếu dữ liệu không đủ, chatbot phải nêu rõ giới hạn và gợi ý người dùng bổ sung tiêu chí; câu hỏi ngoài phạm vi mua sắm phải được từ chối/định hướng lại. | Guest/Customer | Nguyên tắc hạn chế hallucination |
| FR-AI-07 | Người dùng phải có thể mở nhanh trang chi tiết sản phẩm từ card/link do chatbot trả về. | Guest/Customer | CW-09, MB-06 |
| FR-AI-08 | Customer phải có thể xem lại lịch sử phiên chat nếu chức năng lưu hội thoại được triển khai theo MVP đã chốt. | Customer | CW-19 |

### 4.6. Quản lý Store và nhân viên Seller

<a id="table-13"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-STORE-01 | Store Owner phải có thể cập nhật tên Store, mô tả, logo và thông tin liên hệ. | Store Owner | AW-S02 |
| FR-STORE-02 | Store Owner phải có thể tạo/cập nhật/cấp quyền/khóa tài khoản Seller thuộc Store. | Store Owner | AW-S03 |
| FR-STORE-03 | Seller phải thuộc đúng một Store và mọi dữ liệu nghiệp vụ của Seller phải bị giới hạn theo store\_id. | Seller | Actor scope; Data Isolation |
| FR-STORE-04 | Administrator phải có thể duyệt tạo, khóa/mở hoặc cập nhật trạng thái Store/Seller ở phạm vi toàn nền tảng. | Admin | AW-A02 |

### 4.7. Quản lý sản phẩm, Product Type và biến thể

<a id="table-14"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-MPROD-01 | Seller/Owner phải xem, tìm và lọc danh sách sản phẩm của Store. | Seller/Owner | AW-S04 |
| FR-MPROD-02 | Seller/Owner phải có thể tạo sản phẩm bằng cách chọn Category và ProductType. | Seller/Owner | AW-S05; UC-PROD-01 |
| FR-MPROD-03 | Sau khi chọn ProductType, hệ thống phải trả về AttributeKeys tương ứng để tạo form thuộc tính động. | Seller/Owner | UC-PROD-01 |
| FR-MPROD-04 | Hệ thống phải validate thuộc tính bắt buộc và kiểu dữ liệu trước khi lưu sản phẩm. | Seller/Owner | UC-PROD-01 ngoại lệ |
| FR-MPROD-05 | Seller/Owner phải có thể cập nhật thông tin, giá, thuộc tính động và trạng thái kinh doanh của sản phẩm Store. | Seller/Owner | AW-S06 |
| FR-MPROD-06 | Seller/Owner phải có thể thêm/xóa/sắp xếp ảnh sản phẩm và ảnh biến thể. | Seller/Owner | AW-S07 |
| FR-MPROD-07 | Seller/Owner phải có thể tạo và cấu hình ProductVariant/SKU với giá, ảnh và thuộc tính biến thể. | Seller/Owner | AW-S08 |
| FR-MPROD-08 | Khi lưu sản phẩm, hệ thống phải tự động gắn store\_id của actor; không cho phép actor tự gán Store khác. | Seller/Owner | UC-PROD-01; Data Isolation |
| FR-MPROD-09 | Sau thay đổi sản phẩm phù hợp, hệ thống phải đồng bộ dữ liệu sang M4 để phục vụ Product Embedding/RAG Index. | Seller/Owner/System | UC-PROD-01; M4 |
| FR-PTYPE-01 | Administrator phải CRUD Product Types và cấu hình Attribute Keys dùng chung toàn sàn. | Admin | AW-A05 |
| FR-CATEGORY-ADMIN-01 | Administrator phải CRUD danh mục sản phẩm dùng chung toàn sàn. | Admin | AW-A04 |

### 4.8. Tồn kho và xử lý đơn của Store

<a id="table-15"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-INV-01 | Seller/Owner phải xem quantity và reserved\_quantity theo biến thể. | Seller/Owner | AW-S09 |
| FR-INV-02 | Seller/Owner phải có thể nhập kho/xuất kho/điều chỉnh kho kèm lý do thay đổi. | Seller/Owner | AW-S10 |
| FR-INV-03 | Seller/Owner phải xem được lịch sử Stock Movement. | Seller/Owner | AW-S11 |
| FR-SORDER-01 | Seller/Owner phải xem danh sách và chi tiết đơn hàng thuộc Store theo store\_id. | Seller/Owner | AW-S12, AW-S13 |
| FR-SORDER-02 | Seller/Owner phải cập nhật trạng thái đơn theo luồng Confirmed → Processing → Shipped → Completed hoặc Cancelled theo rule. | Seller/Owner | AW-S14; UC-ORD-01 |
| FR-SORDER-03 | Khi trạng thái đơn thay đổi, hệ thống phải cập nhật dữ liệu và hỗ trợ thông báo trạng thái cho Customer theo thiết kế triển khai. | Seller/Owner/System | UC-ORD-01 |

### 4.9. Báo cáo và quản trị toàn sàn

<a id="table-16"></a>

| Mã | Yêu cầu | Actor | Nguồn đề cương |
| --- | --- | --- | --- |
| FR-REP-01 | Store Owner phải xem Dashboard tổng quan Store gồm doanh thu, số đơn, sản phẩm bán chạy và tồn kho thấp. | Store Owner | AW-S01 |
| FR-REP-02 | Store Owner phải xem doanh thu theo ngày/tháng/khoảng thời gian và thống kê sản phẩm Store. | Store Owner | AW-S15, AW-S16 |
| FR-ADMIN-01 | Administrator phải xem Platform Dashboard về Store/Seller/Customer/sản phẩm/đơn hàng/doanh thu toàn sàn. | Admin | AW-A01 |
| FR-ADMIN-02 | Administrator phải quản lý trạng thái tài khoản Customer. | Admin | AW-A03 |
| FR-ADMIN-03 | Administrator phải quản lý Role &amp; Permission theo thiết kế RBAC. | Admin | AW-A06 |
| FR-ADMIN-04 | Administrator phải tra cứu và có thể ẩn/khóa sản phẩm vi phạm. | Admin | AW-A07 |
| FR-ADMIN-05 | Administrator phải tra cứu đơn hàng toàn nền tảng để giám sát. | Admin | AW-A08 |
| FR-ADMIN-06 | Administrator phải có chức năng theo dõi log/metric Chatbot &amp; RAG và trạng thái Vector Index ở mức MVP. | Admin | AW-A09 |
| FR-ADMIN-07 | Administrator phải có chức năng theo dõi metric/log Recommendation và dữ liệu hành vi ở mức MVP. | Admin | AW-A10 |

## 5. QUY TẮC NGHIỆP VỤ

<a id="table-17"></a>

| Mã | Quy tắc |
| --- | --- |
| BR-01 | Giỏ hàng có thể chứa sản phẩm từ nhiều Store và Customer có thể checkout CartItem thuộc nhiều Store trong cùng một lần. |
| BR-02 | Mỗi Order chỉ gắn với đúng một Store; một checkout có thể sinh ra nhiều Order. |
| BR-03 | Seller thuộc đúng một Store; Store thuộc một Store Owner. |
| BR-04 | Seller/Store Owner chỉ được truy cập dữ liệu có store\_id khớp với store\_id trong ngữ cảnh xác thực. |
| BR-05 | Customer chỉ được truy cập lịch sử cá nhân theo customer\_id của chính mình. |
| BR-06 | Store Owner có mọi quyền Seller trong Store và có thêm quyền quản lý Seller, Store và báo cáo doanh thu. |
| BR-07 | Seller không xem báo cáo doanh thu tổng của Store. |
| BR-08 | Product bắt buộc thuộc một ProductType; thuộc tính động hợp lệ phụ thuộc AttributeKeys của ProductType. |
| BR-09 | Thuộc tính mô tả được lưu theo mô hình Hybrid Relational + JSONB; biến thể/SKU dùng ProductVariant và thuộc tính biến thể. |
| BR-10 | Tồn kho được quản lý theo ProductVariant và Store; hệ thống phải tránh race condition khi đặt hàng/giữ tồn. |
| BR-11 | Recommendation sản phẩm liên quan xếp hạng dựa trên SameCategory, SameProductType, PriceSimilarity và SameStore trong luồng MVP. |
| BR-12 | Cold-start recommendation fallback về sản phẩm bán chạy nhất/mới nhất khi chưa có đủ lịch sử hành vi. |
| BR-13 | Chatbot không được bịa giá, thông số, khuyến mãi; chỉ tư vấn từ retrieved product context. |
| BR-14 | Không đưa secret key hoặc dữ liệu nhạy cảm của người dùng vào prompt LLM. |
| BR-15 | Payment/Shipping chỉ là sandbox/mock trong MVP; settlement thực tế không thuộc phạm vi. |
| BR-16 | Các Order sinh ra từ cùng một checkout phải có checkout\_session\_id/order\_group\_id chung để truy vết. |
| BR-17 | MVP sử dụng một Payment transaction cho tổng giá trị toàn checkout; Payment liên kết với checkout\_session\_id/order\_group\_id. |
| BR-18 | Checkout áp dụng nguyên tắc all-or-nothing ở bước xác nhận: nếu có CartItem không hợp lệ/không đủ tồn kho thì không tạo một phần Order. |
| BR-19 | API checkout phải chống tạo đơn trùng khi request bị retry hoặc timeout bằng cơ chế idempotency tương đương. |
| BR-20 | Recommendation MVP có baseline Content-based/Behavioral và tối thiểu một mô hình Collaborative Filtering/Matrix Factorization được huấn luyện offline; Deep Learning không bắt buộc trong MVP. |

## 6. YÊU CẦU DỮ LIỆU

### 6.1. Mô hình ownership và Data Isolation

Product thuộc Store; Store thuộc Store Owner; Seller thuộc một Store. Các API quản trị phải áp dụng Row-Level Access Control dựa trên store\_id. Ví dụ truy vấn nghiệp vụ Seller phải có điều kiện tương đương “WHERE store\_id = :jwt\_store\_id”. Việc ẩn nút ở giao diện không được xem là biện pháp bảo mật thay thế cho kiểm tra backend.

### 6.2. Product Type và thuộc tính động

<a id="table-18"></a>

| Bảng/đối tượng | Trường/ý nghĩa cốt lõi |
| --- | --- |
| categories | id, name, parent\_id, slug - danh mục dùng chung. |
| product\_types | id, name, category\_id - loại sản phẩm, ví dụ Điện thoại/Áo sơ mi. |
| attribute\_keys | product\_type\_id, code, name, data\_type, is\_variant\_factor - định nghĩa thuộc tính theo Product Type. |
| products | id, store\_id, product\_type\_id, title, description, base\_price, attributes\_json (JSONB). |
| product\_variants | id, product\_id, sku, price, image\_url - biến thể/SKU. |
| inventories | id, variant\_id, store\_id, quantity, reserved\_quantity. |

### 6.3. Dữ liệu giao dịch, AI và hành vi

- CheckoutSession/OrderGroup lưu định danh một lần checkout, customer\_id, tổng tiền, payment\_status và thời điểm tạo; dùng để liên kết các Order sinh ra cùng giao dịch.

- Order phải chứa store\_id và checkout\_session\_id/order\_group\_id; Payment liên kết với CheckoutSession/OrderGroup để biểu diễn một giao dịch thanh toán cho toàn checkout.

- RecommendationInteraction lưu implicit feedback theo user\_id, product\_id, event\_type, weight và timestamp để tạo dữ liệu huấn luyện recommendation.

- ChatSession, ChatMessage lưu ngữ cảnh hội thoại khi triển khai lưu lịch sử.

- SearchHistory lưu truy vấn tìm kiếm của Customer đăng nhập.

- ProductViewHistory lưu lịch sử xem sản phẩm.

- UserPreference tổng hợp sở thích từ danh mục, khoảng giá, thuộc tính và hành vi.

- ProductEmbedding lưu vector phục vụ semantic search/RAG qua pgvector.

- Order/OrderItem là nguồn tín hiệu lịch sử mua hàng cho Recommendation.

### 6.4. Chỉ mục và hiệu năng dữ liệu

Đề cương chốt sử dụng PostgreSQL JSONB cho attributes\_json và đề xuất GIN Index để giảm rủi ro truy vấn chậm khi lọc thuộc tính động. Vector Embedding sử dụng pgvector trên PostgreSQL.

## 7. YÊU CẦU PHI CHỨC NĂNG

<a id="table-19"></a>

| Mã | Nhóm | Yêu cầu |
| --- | --- | --- |
| NFR-PERF-01 | Performance | API nghiệp vụ thông thường phản hồi mục tiêu dưới 2 giây trong điều kiện kiểm thử MVP. |
| NFR-PERF-02 | Performance | Chatbot RAG phản hồi mục tiêu dưới 4 giây trong điều kiện kiểm thử MVP. |
| NFR-PERF-03 | Performance | Trong môi trường kiểm thử MVP với tối thiểu 100 concurrent users, mục tiêu 95% request API nghiệp vụ thông thường phản hồi dưới 2 giây. |
| NFR-PERF-04 | Performance | Các API danh sách phải hỗ trợ pagination; không trả toàn bộ tập dữ liệu lớn trong một request. |
| NFR-PERF-05 | Performance | Các trường thường dùng để filter/join/search như store\_id, category\_id, product\_type\_id, customer\_id, order\_status, created\_at và JSONB attributes phải có chiến lược index phù hợp. |
| NFR-SEC-01 | Security | Mật khẩu phải được hash bằng BCrypt. |
| NFR-SEC-02 | Security | Authentication sử dụng JWT; API quản trị kiểm tra user\_id, role, store\_id. |
| NFR-SEC-03 | Security | Input phải được validate; quyền truy cập dữ liệu phải được kiểm tra ở backend. |
| NFR-SEC-04 | Security | Không commit API key, JWT Secret hoặc database credentials lên Git; quản lý bằng biến môi trường/.env. |
| NFR-SEC-05 | Security | Access Token phải có thời hạn; Refresh Token phải được quản lý riêng và có cơ chế revoke khi logout/khóa tài khoản theo thiết kế triển khai. |
| NFR-SEC-06 | Security | Các endpoint nhạy cảm hoặc tốn tài nguyên như login, search và chatbot phải có rate limiting phù hợp trong môi trường triển khai. |
| NFR-SEC-07 | Security | Môi trường deployment/demo phải sử dụng HTTPS; backend không được tin store\_id/customer\_id do client gửi nếu có thể suy ra từ authenticated context. |
| NFR-SEC-08 | Security | Upload ảnh phải kiểm tra loại file, kích thước và tên file phía server; không cho phép thực thi nội dung upload. |
| NFR-SEC-09 | Security | Hệ thống phải lưu Audit Log cho các thao tác quản trị quan trọng như thay đổi quyền, khóa tài khoản, điều chỉnh tồn kho và thay đổi trạng thái đơn. |
| NFR-ISO-01 | Data Isolation | Seller/Owner chỉ truy cập tài nguyên thuộc store\_id; lịch sử Customer bảo vệ theo customer\_id. |
| NFR-REL-01 | Reliability | Luồng đặt hàng/tồn kho phải duy trì trạng thái nhất quán và tránh race condition. |
| NFR-REL-02 | Reliability | API checkout phải hỗ trợ cơ chế idempotency hoặc tương đương để ngăn Payment/Order bị tạo trùng khi retry hoặc network timeout. |
| NFR-REL-03 | Reliability | Việc tạo/cập nhật Product Embedding và tác vụ AI tốn thời gian nên được tách khỏi request nghiệp vụ chính khi cần để tránh block luồng cập nhật sản phẩm. |
| NFR-AI-01 | AI Safety | Câu trả lời chatbot phải grounded theo retrieval context và hạn chế hallucination. |
| NFR-AI-02 | AI Quality | Recommendation phải được đánh giá tối thiểu bằng Precision@K, Recall@K hoặc NDCG@K trên bộ dữ liệu/test split đã thống nhất; phải so sánh với baseline phù hợp. |
| NFR-PRIV-01 | Privacy | Không truyền secret key hoặc dữ liệu nhạy cảm không cần thiết của người dùng vào prompt LLM. |
| NFR-PRIV-02 | Privacy | Không ghi log password, JWT/API key hoặc dữ liệu cá nhân không cần thiết; không truyền thông tin nhạy cảm vào LLM nếu không phục vụ trực tiếp cho yêu cầu mua sắm. |
| NFR-API-01 | Maintainability | API contract chuẩn REST/JSON và được mô tả bằng OpenAPI/Swagger. |
| NFR-ARCH-01 | Architecture | Các service giữ loose coupling, autonomy và không đọc trực tiếp DB nội bộ của service khác. |

## 8. DANH MỤC USE CASE

<a id="table-20"></a>

| Mã Use Case | Tên Use Case | Actor | Nền tảng |
| --- | --- | --- | --- |
| UC-AUTH-01 | Đăng ký/Đăng nhập | Guest/Customer | Client Web/Mobile |
| UC-PROD-01 | Duyệt, tìm kiếm và lọc sản phẩm | Guest/Customer | Client Web/Mobile |
| UC-PROD-02 | Xem chi tiết sản phẩm và gợi ý liên quan | Guest/Customer | Client Web/Mobile |
| UC-CHAT-01 | Chatbot tư vấn mua sắm AI | Guest/Customer | Client Web/Mobile |
| UC-REC-01 | Xem “Dành cho bạn” | Customer | Client Web/Mobile |
| UC-CART-01 | Quản lý giỏ hàng | Customer | Client Web/Mobile |
| UC-CHECKOUT-01 | Checkout đa Store và tách đơn theo Store | Customer | Client Web/Mobile |
| UC-PAY-01 | Thanh toán sandbox | Customer | Client Web/Mobile |
| UC-ORDER-01 | Xem/theo dõi/hủy đơn | Customer | Client Web/Mobile |
| UC-STORE-01 | Quản lý thông tin Store | Store Owner | Admin Portal |
| UC-STORE-02 | Quản lý nhân viên Seller | Store Owner | Admin Portal |
| UC-SPROD-01 | Đăng/cập nhật sản phẩm Store | Seller/Store Owner | Admin Portal |
| UC-SPROD-02 | Cấu hình biến thể/SKU và hình ảnh | Seller/Store Owner | Admin Portal |
| UC-INV-01 | Quản lý tồn kho và Stock Movement | Seller/Store Owner | Admin Portal |
| UC-SORDER-01 | Xử lý và cập nhật trạng thái đơn | Seller/Store Owner | Admin Portal |
| UC-REP-01 | Xem báo cáo doanh thu Store | Store Owner | Admin Portal |
| UC-ADMIN-01 | Quản lý Store/Seller/Customer | Administrator | Admin Portal |
| UC-ADMIN-02 | Quản lý Category/ProductType/AttributeKey | Administrator | Admin Portal |
| UC-ADMIN-03 | Quản lý Role/Permission | Administrator | Admin Portal |
| UC-AIMON-01 | Theo dõi Chatbot/RAG/Recommendation | Administrator | Admin Portal |

## 9. ĐẶC TẢ USE CASE CỐT LÕI

#### UC-AUTH-01 - Đăng ký / Đăng nhập Customer

<a id="table-21"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Guest, Customer |
| Mục tiêu | Tạo tài khoản Customer hoặc xác thực để sử dụng chức năng cá nhân hóa và mua hàng. |
| Tiền điều kiện | Guest chưa đăng nhập; hệ thống xác thực hoạt động. |
| Hậu điều kiện | Tài khoản được tạo hoặc phiên đăng nhập hợp lệ được thiết lập. |

Luồng chính

1. Guest chọn Đăng ký hoặc Đăng nhập.

2. Hệ thống hiển thị biểu mẫu tương ứng.

3. Người dùng nhập thông tin cần thiết theo form.

4. Hệ thống kiểm tra dữ liệu và xác thực tài khoản.

5. Nếu hợp lệ, hệ thống tạo tài khoản hoặc phát hành ngữ cảnh xác thực/JWT phù hợp.

6. Hệ thống điều hướng về giao diện Customer.

Luồng thay thế / ngoại lệ

- Dữ liệu không hợp lệ hoặc xác thực thất bại: hệ thống báo lỗi và không tạo phiên đăng nhập.

- Quên/đổi mật khẩu trên Client Web được xử lý theo chức năng CW-02.

#### UC-PROD-01 - Duyệt, tìm kiếm và lọc sản phẩm

<a id="table-22"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Guest, Customer |
| Mục tiêu | Tìm sản phẩm phù hợp bằng danh mục, từ khóa, giá và thuộc tính động. |
| Tiền điều kiện | Hệ thống có danh mục, ProductType và sản phẩm đang khả dụng. |
| Hậu điều kiện | Danh sách sản phẩm phù hợp được hiển thị. |

Luồng chính

1. Actor mở trang chủ/danh mục hoặc nhập từ khóa tìm kiếm.

2. Hệ thống truy vấn danh sách sản phẩm phù hợp.

3. Actor có thể chọn danh mục/ProductType và bộ lọc thuộc tính động.

4. Actor có thể lọc theo giá và sắp xếp theo tùy chọn được hỗ trợ.

5. Hệ thống cập nhật danh sách kết quả.

6. Nếu actor là Customer đăng nhập, hệ thống ghi nhận tín hiệu tìm kiếm phục vụ recommendation.

Luồng thay thế / ngoại lệ

- Không có kết quả: hiển thị trạng thái không có sản phẩm phù hợp.

- Semantic search chỉ áp dụng nếu module M4 và cấu hình MVP tương ứng khả dụng.

#### UC-PROD-02 - Xem chi tiết sản phẩm và gợi ý liên quan

<a id="table-23"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Guest, Customer |
| Mục tiêu | Xem đầy đủ thông tin sản phẩm và các sản phẩm tương tự/bổ trợ. |
| Tiền điều kiện | Sản phẩm tồn tại và được phép hiển thị. |
| Hậu điều kiện | Thông tin chi tiết và recommendation liên quan được hiển thị; lịch sử xem được ghi nhận cho Customer đăng nhập. |

Luồng chính

1. Actor chọn một sản phẩm.

2. Hệ thống hiển thị ảnh, giá, mô tả, thuộc tính động, tồn kho và thông tin Store.

3. Hệ thống ghi nhận ProductViewHistory nếu actor là Customer đăng nhập.

4. Recommendation Engine tính điểm các sản phẩm ứng viên theo SameCategory, SameProductType, PriceSimilarity và SameStore.

5. Hệ thống hiển thị Top sản phẩm liên quan theo cấu hình MVP.

Luồng thay thế / ngoại lệ

- Nếu recommendation không khả dụng, trang chi tiết vẫn hiển thị thông tin sản phẩm cốt lõi.

#### UC-CHAT-01 - Chatbot tư vấn mua sắm AI

<a id="table-24"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Guest, Customer |
| Mục tiêu | Nhận tư vấn mua sắm bằng hội thoại tự nhiên có căn cứ trên dữ liệu sản phẩm. |
| Tiền điều kiện | M4, Vector Search và LLM API hoạt động; dữ liệu sản phẩm đã có embedding ở mức cần thiết. |
| Hậu điều kiện | Chatbot trả câu trả lời và các sản phẩm/link phù hợp hoặc nêu rõ khi thiếu dữ liệu. |

Luồng chính

1. Actor nhập nhu cầu mua sắm bằng ngôn ngữ tự nhiên.

2. Hệ thống tạo query embedding và thực hiện vector search trên pgvector.

3. Hệ thống lấy Top-K Product Context.

4. Nếu actor là Customer, hệ thống có thể bổ sung User Preference và lịch sử hành vi.

5. Hệ thống kết hợp System Prompt, Conversation Context và Product Context để gọi LLM.

6. Chatbot trả câu trả lời grounded kèm card/link sản phẩm.

7. Actor có thể hỏi tiếp trong cùng phiên hoặc mở trang chi tiết sản phẩm.

Luồng thay thế / ngoại lệ

- Không đủ context: chatbot thông báo giới hạn và đề nghị bổ sung tiêu chí.

- Câu hỏi ngoài phạm vi mua sắm: chatbot từ chối hoặc định hướng lại.

- LLM/Vector Search lỗi: hệ thống báo lỗi phù hợp, không bịa dữ liệu sản phẩm.

#### UC-REC-01 - Xem “Dành cho bạn”

<a id="table-25"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Customer |
| Mục tiêu | Nhận danh sách sản phẩm cá nhân hóa từ lịch sử hành vi. |
| Tiền điều kiện | Customer đã đăng nhập. |
| Hậu điều kiện | Danh sách recommendation được hiển thị hoặc fallback nếu chưa đủ dữ liệu. |

Luồng chính

1. Hệ thống lấy các tín hiệu như SearchHistory, ProductViewHistory, Cart và dữ liệu mua hàng đã có.

2. Hệ thống tổng hợp nhóm danh mục/thuộc tính/giá mà Customer quan tâm.

3. Hệ thống xếp hạng sản phẩm theo baseline Behavioral/Content-based; khi có đủ dữ liệu và mô hình đã được huấn luyện, hệ thống có thể kết hợp điểm từ Collaborative Filtering/Matrix Factorization để tạo Top-K.

4. Hệ thống hiển thị danh sách “Dành cho bạn” trên Web/Mobile và có thể dùng trong Chatbot.

Luồng thay thế / ngoại lệ

- Cold-start hoặc mô hình chưa khả dụng: fallback sang Content-based/Behavioral hoặc sản phẩm bán chạy nhất/mới nhất theo cấu hình MVP.

#### UC-CART-01 - Quản lý giỏ hàng

<a id="table-26"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Customer |
| Mục tiêu | Quản lý các sản phẩm muốn mua trước checkout. |
| Tiền điều kiện | Customer đã đăng nhập; sản phẩm/biến thể tồn tại. |
| Hậu điều kiện | Giỏ hàng được cập nhật và vẫn giữ thông tin Store của từng item. |

Luồng chính

1. Customer thêm một ProductVariant vào giỏ.

2. Hệ thống lưu CartItem và Store tương ứng.

3. Customer xem giỏ và cập nhật số lượng hoặc xóa sản phẩm.

4. Hệ thống kiểm tra lại dữ liệu giá/tồn kho ở mức cần thiết.

5. Hệ thống nhóm/nhận biết các item theo Store để chuẩn bị checkout.

Luồng thay thế / ngoại lệ

- Số lượng không hợp lệ hoặc vượt tồn: hệ thống từ chối cập nhật và thông báo.

#### UC-CHECKOUT-01 - Checkout đa Store và tách đơn theo Store

<a id="table-27"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Customer |
| Mục tiêu | Tạo các Order hợp lệ từ CartItem thuộc một hoặc nhiều Store trong cùng một lần checkout; mỗi Store tương ứng đúng một Order. |
| Tiền điều kiện | Customer đã đăng nhập, có CartItem được chọn và có địa chỉ nhận hàng hợp lệ; các dịch vụ Inventory/Payment khả dụng. |
| Hậu điều kiện | Nếu checkout thành công, một Payment và một hoặc nhiều Order theo Store được tạo, các Order liên kết cùng checkout\_session\_id/order\_group\_id; nếu thất bại thì không tạo một phần Order. |

Luồng chính

1. Customer mở Checkout và chọn các CartItem muốn mua.

2. Hệ thống nhóm các CartItem được chọn theo store\_id và xác định danh sách Store tham gia checkout.

3. Customer chọn địa chỉ nhận hàng và xem tổng tiền của toàn checkout cùng phần tiền tương ứng từng Store.

4. Hệ thống kiểm tra lại trạng thái sản phẩm, giá và tồn kho của toàn bộ CartItem được chọn.

5. Nếu tất cả CartItem hợp lệ, hệ thống giữ/reserve tồn kho cần thiết và tạo CheckoutSession/OrderGroup.

6. Customer xác nhận thông tin checkout và hệ thống thực hiện một giao dịch thanh toán sandbox/mock cho tổng giá trị.

7. Khi Payment thành công, hệ thống tạo một Order riêng cho mỗi Store và gắn cùng checkout\_session\_id/order\_group\_id.

8. Hệ thống xác nhận checkout, hiển thị danh sách Order đã tạo và loại bỏ các CartItem đã mua khỏi giỏ.

Luồng thay thế / ngoại lệ

- Có ít nhất một CartItem không hợp lệ, đổi giá hoặc không đủ tồn kho: hệ thống dừng toàn bộ checkout, không tạo Order một phần và yêu cầu Customer xác nhận lại.

- Thanh toán thất bại/hủy: hệ thống không hoàn tất Order và phải giải phóng phần tồn kho đã giữ theo thiết kế.

- Request checkout bị retry/timeout: hệ thống dùng idempotency để không tạo trùng Payment hoặc Order.

#### UC-ORDER-01 - Theo dõi và hủy đơn hàng

<a id="table-28"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Customer |
| Mục tiêu | Xem lịch sử, chi tiết, trạng thái và gửi yêu cầu hủy khi được phép. |
| Tiền điều kiện | Customer đã đăng nhập và có đơn hàng. |
| Hậu điều kiện | Thông tin đơn được hiển thị; yêu cầu hủy được xử lý nếu trạng thái cho phép. |

Luồng chính

1. Customer mở lịch sử đơn hàng.

2. Hệ thống chỉ trả các Order thuộc customer\_id hiện tại.

3. Customer mở chi tiết một Order.

4. Hệ thống hiển thị sản phẩm, Store, địa chỉ, tổng tiền, payment status và trạng thái đơn.

5. Customer theo dõi trạng thái Pending/Confirmed/Processing/Shipped/Completed/Cancelled.

Luồng thay thế / ngoại lệ

- Nếu đơn còn ở trạng thái cho phép, Customer có thể yêu cầu hủy; nếu không, hệ thống từ chối thao tác hủy.

#### UC-STORE-02 - Quản lý nhân viên Seller

<a id="table-29"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Store Owner |
| Mục tiêu | Quản lý tài khoản Seller thuộc Store của Owner. |
| Tiền điều kiện | Store Owner đã đăng nhập và có store\_id hợp lệ. |
| Hậu điều kiện | Seller thuộc Store được tạo/cập nhật/cấp quyền/khóa theo thao tác hợp lệ. |

Luồng chính

1. Store Owner mở chức năng quản lý Seller.

2. Hệ thống chỉ hiển thị Seller thuộc store\_id của Owner.

3. Owner tạo mới hoặc chọn Seller hiện có trong Store.

4. Owner cập nhật thông tin/quyền hoặc khóa tài khoản theo chức năng được hỗ trợ.

5. Hệ thống lưu thay đổi và đảm bảo Seller không vượt phạm vi Store.

Luồng thay thế / ngoại lệ

- Owner cố thao tác Seller của Store khác: backend từ chối do ownership check.

#### UC-SPROD-01 - Đăng / cập nhật sản phẩm thuộc Store

<a id="table-30"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Store Owner, Seller |
| Mục tiêu | Tạo hoặc cập nhật sản phẩm đa ngành hàng bằng ProductType và Dynamic Attributes. |
| Tiền điều kiện | Actor đã đăng nhập vào Management Portal và thuộc một Store xác định. |
| Hậu điều kiện | Sản phẩm hợp lệ được lưu với store\_id của actor; dữ liệu được chuẩn bị/đồng bộ phục vụ RAG. |

Luồng chính

1. Actor chọn Category và ProductType.

2. Hệ thống trả danh sách AttributeKeys tương ứng.

3. Actor nhập tên, mô tả, giá gốc và giá trị thuộc tính động.

4. Actor tạo ProductVariant/SKU nếu ProductType có biến thể.

5. Hệ thống validate thuộc tính bắt buộc và kiểu dữ liệu.

6. Hệ thống tự gắn store\_id của Actor và lưu Product/Variant.

7. Hệ thống phát/ghi nhận dữ liệu cần thiết để M4 tạo hoặc cập nhật Product Embedding.

Luồng thay thế / ngoại lệ

- Thiếu thuộc tính bắt buộc hoặc sai kiểu dữ liệu: hệ thống báo lỗi và không lưu bản ghi không hợp lệ.

- Actor cố gán store\_id khác: backend từ chối.

#### UC-INV-01 - Quản lý tồn kho

<a id="table-31"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Store Owner, Seller |
| Mục tiêu | Theo dõi và điều chỉnh tồn kho theo ProductVariant. |
| Tiền điều kiện | Actor đã đăng nhập; ProductVariant thuộc Store của actor. |
| Hậu điều kiện | Tồn kho và lịch sử Stock Movement được cập nhật nhất quán. |

Luồng chính

1. Actor mở danh sách tồn kho của Store.

2. Hệ thống hiển thị quantity và reserved\_quantity theo biến thể.

3. Actor chọn nhập kho/xuất kho/điều chỉnh và nhập lý do.

4. Hệ thống kiểm tra quyền Store và dữ liệu số lượng.

5. Hệ thống cập nhật Inventory và ghi Stock Movement.

Luồng thay thế / ngoại lệ

- Actor truy cập variant ngoài Store: backend từ chối.

- Dữ liệu điều chỉnh không hợp lệ: không cập nhật tồn kho.

#### UC-SORDER-01 - Xử lý và cập nhật trạng thái đơn Store

<a id="table-32"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Store Owner, Seller |
| Mục tiêu | Xử lý đơn hàng thuộc Store theo quy trình trạng thái. |
| Tiền điều kiện | Có Order thuộc store\_id của actor; actor đã đăng nhập Management Portal. |
| Hậu điều kiện | Trạng thái Order được cập nhật hợp lệ và Customer có thể nhận trạng thái mới. |

Luồng chính

1. Actor xem danh sách đơn được lọc theo store\_id.

2. Actor mở chi tiết đơn để xem SKU, số lượng, người nhận và payment status.

3. Hệ thống kiểm tra tính hợp lệ của chuyển trạng thái.

4. Hệ thống lưu thay đổi và hỗ trợ thông báo trạng thái cho Customer.

Luồng thay thế / ngoại lệ

- Actor cố thao tác đơn Store khác: backend từ chối.

- Chuyển trạng thái không hợp lệ theo rule: hệ thống từ chối cập nhật.

#### UC-ADMIN-02 - Quản lý Category, ProductType và AttributeKey

<a id="table-33"></a>

| Thuộc tính | Mô tả |
| --- | --- |
| Actor chính | Administrator |
| Mục tiêu | Thiết lập taxonomy và cấu trúc thuộc tính động dùng chung toàn sàn. |
| Tiền điều kiện | Administrator đã đăng nhập với Global Scope. |
| Hậu điều kiện | Danh mục/ProductType/AttributeKey được cập nhật và có thể dùng trong form sản phẩm Seller/Owner. |

Luồng chính

1. Admin mở chức năng quản lý danh mục hoặc Product Type.

2. Admin CRUD Category dùng chung toàn sàn.

3. Admin CRUD ProductType và gắn ProductType với Category.

4. Admin cấu hình AttributeKey gồm code, name, data\_type và is\_variant\_factor.

5. Hệ thống lưu cấu hình và cung cấp cho Management Portal khi Seller/Owner tạo sản phẩm.

Luồng thay thế / ngoại lệ

- Dữ liệu cấu hình không hợp lệ: hệ thống từ chối lưu và báo lỗi.

## 10. TIÊU CHÍ NGHIỆM THU MVP

<a id="table-34"></a>

| Mã | Nhóm | Tiêu chí |
| --- | --- | --- |
| AC-01 | Multi-Store | Tạo/duy trì được nhiều Store/Seller; Seller Store A không truy cập/sửa dữ liệu Store B. |
| AC-02 | Dynamic Attributes | Admin cấu hình ít nhất các ProductType có bộ thuộc tính khác nhau; form Seller hiển thị/validate theo ProductType. |
| AC-03 | Catalog | Guest/Customer duyệt, tìm, lọc và xem chi tiết sản phẩm trên Web; các luồng chính tương ứng chạy được trên Mobile. |
| AC-04 | Cart/Checkout | Giỏ có thể chứa item nhiều Store; một lần checkout có thể chọn item của nhiều Store; hệ thống kiểm tra toàn bộ, thanh toán một lần và tự động tạo một Order riêng cho mỗi Store. |
| AC-05 | Order | Customer xem lịch sử/tracking; Seller/Owner chỉ xử lý đơn Store mình theo luồng trạng thái. |
| AC-06 | Payment | Một giao dịch thanh toán sandbox/mock cho toàn checkout trả trạng thái hợp lệ và liên kết được với các Order sinh ra cùng checkout\_session\_id/order\_group\_id. |
| AC-07 | Recommendation | Có sản phẩm liên quan tại trang chi tiết, “Dành cho bạn”/fallback cho Customer và tối thiểu một mô hình Collaborative Filtering/Matrix Factorization được huấn luyện offline, có kết quả đánh giá Top-K. |
| AC-08 | Chatbot RAG | Chatbot nhận yêu cầu tự nhiên, truy xuất sản phẩm, trả tư vấn có link/card và không bịa giá/thông số ngoài context trong bộ test. |
| AC-09 | Performance | API thường đạt mục tiêu &lt;2s ở mức 95% request trong bài test tối thiểu 100 concurrent users; chatbot RAG mục tiêu &lt;4s trong môi trường/bộ test MVP đã thống nhất. |
| AC-10 | Documentation | Có OpenAPI/Swagger, Use Case Specification, Test Plan/Test Cases và bằng chứng kiểm thử theo deliverables đề cương. |

## 11. NGOÀI PHẠM VI MVP VÀ HƯỚNG PHÁT TRIỂN

### 11.1. Ngoài phạm vi MVP

- Commission, Payout, Settlement, Seller Wallet.

- Dispute Management phức tạp.

- Payment/Shipping production thực tế.

- Tự huấn luyện LLM từ đầu.

- Mobile App cho Seller/Store Owner/Administrator.

- Deep Learning Recommendation phức tạp và các mô hình recommendation quy mô lớn nằm ngoài MVP.

### 11.2. Hướng phát triển

- Commission/Payout/Wallet/Dispute.

- Hybrid/Deep Learning Recommendation, online learning và mô hình recommendation quy mô lớn.

- Mobile cho Seller/Store Owner.

- Image Search và Voice Chatbot.

## 12. MA TRẬN TRUY VẾT YÊU CẦU

<a id="table-35"></a>

| Phạm vi | Yêu cầu SRS | Nguồn đề cương | Use Case liên quan |
| --- | --- | --- | --- |
| Nhóm Customer Catalog | FR-CAT-\*, FR-SEARCH-\*, FR-PROD-\*, FR-STOREVIEW-\* | CW-01, CW-03..07; MB-02..04 | UC-PROD-01, UC-PROD-02 |
| Chatbot &amp; Recommendation | FR-AI-\*, FR-REC-\* | CW-08,09,19..23; MB-05,06,14..16; M4 | UC-CHAT-01, UC-REC-01 |
| Cart/Checkout/Order | FR-CART-\*, FR-CHECKOUT-\*, FR-PAY-\*, FR-ORDER-\* | CW-10..16; MB-07..11; M2 | UC-CART-01, UC-CHECKOUT-01, UC-ORDER-01 |
| Store/Seller | FR-STORE-\* | AW-S02, AW-S03; M3 | UC-STORE-02 |
| Product/Variants | FR-MPROD-\*, FR-PTYPE-\*, FR-CATEGORY-\* | AW-S04..08; AW-A04,A05; M1 | UC-SPROD-01, UC-ADMIN-02 |
| Inventory/Store Orders | FR-INV-\*, FR-SORDER-\* | AW-S09..14; M1/M2 | UC-INV-01, UC-SORDER-01 |
| Reporting/Admin | FR-REP-\*, FR-ADMIN-\* | AW-S01,S15,S16; AW-A01..A10 | UC-REP-01, UC-ADMIN-01..03, UC-AIMON-01 |
| Security/Data Isolation | NFR-SEC-\*, NFR-ISO-\*; BR-03..07 | M3; mục 15 Bảo mật | Áp dụng xuyên suốt |
| Dynamic Data | BR-08..10; mục 6 | M1; ProductType/JSONB/Variant | UC-SPROD-01, UC-INV-01 |

## PHỤ LỤC A - API TIÊU BIỂU TỪ ĐỀ CƯƠNG

<a id="table-36"></a>

| Module | API tiêu biểu |
| --- | --- |
| M1 | GET /api/v1/products; POST /api/v1/seller/products; GET /api/v1/seller/inventory; GET /api/v1/product-types |
| M2 | GET /api/v1/cart; POST /api/v1/orders/checkout (multi-store split); GET /api/v1/seller/orders; PATCH /api/v1/seller/orders/{id}/status |
| M3 | POST /api/v1/auth/login; GET /api/v1/seller/store; GET /api/v1/admin/stores; POST /api/v1/seller/staff |
| M4 | POST /api/v1/chat/sessions; POST /api/v1/chat/messages; GET /api/v1/recommendations/for-you; POST /api/v1/behavior/track |

Lưu ý: Danh sách API trên chỉ là các endpoint tiêu biểu. Request/response schema, status code, pagination và error contract sẽ được chốt trong API Specification/OpenAPI. Riêng API checkout phải có cơ chế idempotency hoặc tương đương theo NFR-REL-02/BR-19 để tránh tạo trùng Payment/Order khi retry.

## PHỤ LỤC B - KẾ HOẠCH KIỂM THỬ LIÊN QUAN SRS

<a id="table-37"></a>

| Mức kiểm thử | Phạm vi |
| --- | --- |
| Unit Testing | Business logic, validation Dynamic Attributes, tính giá biến thể, order total. |
| Integration Testing |  |
| Data Isolation Testing | Seller Store A cố truy cập/sửa sản phẩm hoặc đơn Store B và phải bị từ chối. |
| System / E2E | Login → Tìm kiếm/Chatbot → Giỏ nhiều Store → Multi-Store Checkout → Payment → Split Orders theo Store → Seller từng Store xử lý đơn → Customer tracking. |
| Chatbot &amp; Recommendation | Chatbot: Product Relevance, Groundedness, Hallucination Rate, Response Time. Recommendation: Precision@K, Recall@K/NDCG@K, Coverage và so sánh với baseline Content-based/Behavioral. |
