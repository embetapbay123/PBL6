# Đợt63 — Audit coverage và hồi quy desktop cuối

**52finding gốc và24finding CF đã có bằng chứng FIXED/VERIFIED theo phạm vi từng lỗi. Sáu chuỗi chung mã ứng dụng PASS62. Mục tiêu vẫn ACTIVE; chưa tuyên bố158walkthrough mới hoặc nghiệm thu production.** Kết quả các lượt không đạt vẫn được giữ nguyên.

Ứng dụng giữ `Node61c/AI56/frontend62`;63chỉ sửa test/tiền điều kiện/đo render và cập nhật hồ sơ. Mobile được người dùng miễn kiểm lại. Các số test dưới đây không phải số nhiệm vụ hoặc tỷ lệ người dùng thành công.

## Hồi quy UI

51file fixture desktop: `final-desktop63-trial.json`,382PASS/5FAIL/5SKIPPED. Bộ AI riêng `final-ai-ui63.json`:4PASS/1FAIL, loại đúng ca layoutmobile khỏi lệnh chạy. Tổng397test duy nhất. Sau rà từng lỗi và rerun tường minh, `final-regression63.json` ghi **392PASS/5SKIPPED/0failure chưa giải quyết về hành vi được kiểm**. Không chạy lại cả bộ sau chỉnh test; các ca cũ đã qua được giữ, ca đã đổi hoặc thất bại được chạy lại riêng.12startup probe mới được thống kê riêng, không cộng vào nhiệm vụ vận hành.

Ba giả định test cũ được sửa:

- **Cart metadata:** test bấm link chi tiết rồi lập tức dùng header quay lại, chưa chứng minh route chi tiết đã mount hoặc GET503xảy ra. Nay chờ đúng URL, response503và alert rồi quay lại. `cart-metadata-observation63.json`:PASS; vẫn kiểm ẩn giá cache và retryGET-only, không nới ứng dụng.
- **Admin refund:** fixture thiếu admin_context/Store/Customer mà sửa54đã yêu cầu trước thao tác tiền. Thêm dữ liệu đúng, giữ guard. `admin-refund-context63.json`:PASS; không tự cho Admin xử lý khi chưa nhận diện được vụ việc.
- **Store application:** test cấp sẵn hồ sơPENDING rồi đòi gửi hồ sơ thứhai. UI hiện chặn đúng. Fixture nay bắt đầu chưa có hồ sơ, POSTxong mới đưa đúng hồ sơ vừa tạo vàoGEThistory. `application-precondition63.json`:PASS; không bỏ chặn trùng hoặc đổi kỳ vọng nghiệp vụ sai.

Ba lần khởi tạo bị trắng trong lượt đầu: refund-revocation, taxonomy-draft và GuestAI. Không thu module/page-error telemetry ở các lượt đó nên **chưa xác định nguyên nhân**. `render-observation63.json` chạy riêng cả3đềuPASS; `render-startup63.json` có12context mới/desktop, document và module200, root hiển thị đúng, không pageerror/requestfailed. Đã bổ sung `render-diagnostics.ts` ghi lỗi module/crash/độ dài DOM khi testfail; không ghi header/body/form/token. Các lần probe qua không chứng minh tuyệt đối ứng dụng không bao giờ trắng. Đây là **OBS-063-01 / NEEDS_REPRO**, không bịa thêm bug đã sửa hoặc nâng thành P0/P1 khi chưa có nguyên nhân/bước tái hiện ổn định.

5SKIPPED của bộ51:3ca mobile theo yêu cầu,2ca chỉ áp dụng chế độ browser-mock cũ. Luồng API hiện hành được kiểm riêng; không giả skippedthànhPASS.

## Audit158ID và325ý kiến

`scenario-fix-audit.csv` có đúng158hàng riêng, giữ `baseline_review_result`/issue cũ và tách kết quả nhiệm vụ mới khỏi proof sửa/subcase. `scenario-fix-audit63.json`:**33mục tiêu chính có walkthroughruntime mới PASS;122nhiệm vụ không lặp trọn mới (NOT_RUN với lý do),2BLOCKED(screenreader/nativezoom),1DEFERREDdo người dùng miễn mobile/bànphímảo.** Các122hàng vẫn có bằng chứng sửa, UI subcase hoặc review cũ theo từng ID; không đặt lại chúng thành chưa từng review, không lấy392assertionqua làm158walkthroughqua.

Đây là audit hồ sơ sửa, không phải chạy lại toàn bộ158bài với người thật. Các nhu cầu chưa có finding không tự trở thành lỗi mới. FRICTION về tìm/nhớ món, lựa chọn cách xem và mức hiểu của người dùng giữ giả thuyết/usability theo hồ sơ gốc; `USER_VALIDATION_PENDING` vẫn độc lập. [Bộ bài người dùng](../core-review/user-validation-tasks.md) đã được chuẩn bị, chưa có người tham gia, không tỷ lệ/thời gian giả.

`scope-mapping-audit63.json` kiểm đủ325sourceID duy nhất,6IN_SCOPE/169MERGED/115DEFERRED/35OUT_OF_SCOPE; targetIDđều thuộc158catalog. Không kéo ERP/đa kho/partial/khácgiá/payout vào nghiệm thu. RubricN06 nay gọi đúng **tồn thương mại**, không `physical`; snapshot review/kết quảCSV cũ giữ nguyên. `additional-finding-status.csv`:24CFngoài52, gồm6P1/17P2/1P3,0P0, link đúng report đã chứng minh; không đếm extensioncùngnguyênnhân thành bug mới.

## Chính sách đã được chốt, không còn để hỏi như review cũ

| Policy | Quy tắc dùng khi sửa | Bằng chứng liên quan |
|---|---|---|
| POL-01 | Thất bại→nhận/kiểm→tồn/tiền→đóngCANCELLEDvới nguyênnhânhoànvề, chưa giao lại; không gọi hủy thường để cộng tồn lầnhai | delivery-acceptance39;final-delivery-chain62-final;final-chains-state62 |
| POL-02 | Đơn mới snapshotđịa chỉ nhậntrả; Storethiếu cấu hình không nhận đơnmới; kiểm điều kiện từng lượng, Storechịuphí khiStorelỗi/kháchchịukhiđổiý, tranhchấpAdmin | onboarding-acceptance48;exchange-acceptance37;final-exchange-chain62 |
| POL-03 | Không phục hồi redeemed sauhủy/hoàn, chỉ nhảhold chưa tạođơn; không đổi snapshotđơn | voucher-acceptance50;CH02ởfinal-multistore-chains62-accepted |
| POL-04 | Ownerxem trongStoremình,Admin theoquyền;SELLERkhôngcótranglog; che dữliệunhạycảm | store-audit-acceptance46;admin-audit-acceptance53;store-context-acceptance47 |
| POL-05 |7×24giờ từCOMPLETED, không hồi tố đơn thiếu snapshot; hoànđủ khoản đãthu cảphígiao; CODchỉOwner với biênnhận/thờigian/ngườinhận/đủtiền; chuyểnEXCHANGE cầnCustomerconsent | after-sale-acceptance34;refund-recovery-acceptance36;exchange-acceptance37;final-exchange-chain62 |
| POL-06 | Giữ mốcconsume/tồnthươngmại; đối chiếuhàngđãtrừchưabàngiao; V1khôngtựđổisốđếmphysicalthànhdelta; sửa bằngbù | stock-chain-runtime-acceptance;final-stock-chain62-final;stock-adjustment-refresh62 |
| POL-07 | Thu/hoàn theo mốc tiền xácnhận,Asia/Ho_Chi_Minh; không gánngàytạođơncholịchsửthiếungàythu/hoàn | financial-acceptance49;operational-acceptance60;final-chains-state62 |

Tên artifact trong bảng ở root `artifacts/core-fix/fix-20261030T100153Z/`, đuôi `.json`. Không nhận ảnh/trả503fixture là bằng chứng provider thật. COD là xác nhận thủ công; không thay xác minh ngân hàng hoặc tiền mặt vật lý. Không tự bịa policy cho phần đã hoãn.

Phần cần giữ rõ trước khi kết luận mục tiêu tổng: audit kết thúc không đồng nghĩa122nhiệm vụ đã được lặp trọn trên baselinecuối; OBS-063-01cònnguyênnhânchưa rõ. File completion/readiness cần dẫn đúng giới hạn và requirement tương ứng, không chỉ lấy tổng76findingđãđóng hoặc sixchaingreen làm đủ mọi yêu cầu.
