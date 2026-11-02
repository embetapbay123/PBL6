# Lượt 06 — Admin duyệt, quyền, kiểm duyệt và xử lý vụ việc

Ngày30/10/2026; baseline `operational-20261029T075615Z`, HEAD49ce6ee9b6f5ad473ca40244614d3c79cd2c1846 cộng workingtree đãghi. Chỉreview/script/docs, không sửaứngdụng hoặccontract. SELLER=nhânviên, STORE_OWNER=chủStore.

Đủ24IDA01–A24 có walkthrough hai viewport1440/390: **10PASS,8FRICTION,6FAIL**.74lượt browser hiện hành saugộprerun:48assertionqua/26lỗi; không cộngviewport/đườngvòng thànhIDmới. Tổng tíchlũy **138ID/360lượt**,228qua/132lỗi. Catalog158: **51PASS,46FRICTION,36FAIL,9BLOCKED,5POLICY_GAP,11NOT_RUN**. Những con số này là coverage chuyên gia, không phải tỷ lệ người dùng thành công. USER_VALIDATION_PENDING.

## Kết quả và bằng chứng

| ID | Thao tác/điểm dừng | Kết quả |
|---|---|---|
| A01 | Chờduyệt ởtrang1 toànrejected, pending trang2; bỏlọc/phântrang để phục hồi | FRICTION CR-026, UI/API thật vàrecoveryfixture |
| A02 | Đọc tên/contact/status/id/version hồ sơ hiện có | PASS fixture; không tự yêu cầu KYC |
| A03 | Tìm hồ sơ riêng→duyệt→đọc Store/membership | PASS UI/DB thật, đúngapplicant |
| A04 | Từchối cólýdo→Customerphiênkhác đọc vàgửilại | PASS UI/API thật, PENDINGmới |
| A05 | Tìm hồsơ đãxửlý bằng phântrang/lọc/reload | FRICTION UX-10/17; actor/time không rõ ởUI |
| A06 | Duyệt→CustomervàoStorePortal đúngStore | PASS haiidentitythật |
| A07 | Email gầngiống ởtrang2 | FRICTION UX-10, dòtrangđược |
| A08 | Phân biệt khóauser/Store | FRICTION CR-027, guardthật đúng; thiếu giải thíchUI |
| A09 | Xem prompt trước khóa vàhủy | FAIL CR-027, khôngtarget/impact,0PATCH |
| A10 | MởđúngCustomerkhóa rồiđăngnhập | PASS UI/DB thật, roleIDs giữnguyên |
| A11 | Sửa privateRole, phânbiệt role/membership | FRICTION UX-12; platform.admin422/Customer403 |
| A12 |409role→reloadđọcbảnmới→retry | FRICTION UX-12, khôngghiđè |
| A13 | Searchtitle/filterkiểmduyệt | PASS fixture, cóđường tìmđúngmón |
| A14 | HaiStorecùngtitle/SKU→tìm đúngStore cầnkiểm | FAIL UX-16,2articlethật giốnghệt |
| A15 | Productduynhất→reason→HIDDEN→public404 | PASS UI/API thật; Owner/Customerhide403 |
| A16 | RestoreHIDDEN/STOPPED | PASS thật, vẫnSTOPPED/public404 |
| A17 | RequiredNUMBERkg→Owner2.75→Customer | PASS fixture3phiên; HTTP thật string422/numericđúng |
| A18 | Adminẩn→Customerkhôngthấy→Ownercầnlýdo | FAIL UX-15 cũ,3identitythật |
| A19 | Mãđơn ởngoàitrangđầu→phântrang→mở | FRICTION UX-10/06, khôngcontactlookup |
| A20 | Đọcshipping/payment/refund riêng | FRICTION UX-12/OP-03, enum/timeline |
| A21 | REQUESTED/PENDING/UNKNOWN so với SUCCEEDED | PASS fixture chonhiệmvụhiểutrạngthái, không nghiệmthu provider |
| A22 | Hỗtrợ return từmãkháchcungcấp | FAIL UX-16/08, thiếuStore/khách/ngữcảnh |
| A23 | Audit đúngtarget/action/time→nhậnraactor | FAIL UX-17, UUIDkhôngđườngUIánhxạ; Owneraudit403 |
| A24 | Giải thíchStore/kỳ từreport | FAIL OP-05, toàn sàn/lifetime đúngSQL nhưngkhôngscope |

MỗiID có mục tiêu/tiềnđiều kiện/dữliệu/điểmbắtđầu/expected trongcatalog, kết luận riêng ở `admin-round6-decisions.json`; từngrun vàartifact ởledger. Fixture không thaybackend thật; các A02/05/07/11/12/13/17/19/20/21/22 có ranhgiới này ghi rõ. Chưa có giao/nhận hàng, chuyển tiền hoặc studyngườithật.

## Phát hiện và hậu điều kiện

Thêm **CR-026P2** localfilter hồsơ/pagermất và **CR-027P2** promptkhóa thiếuđốitượng/tácđộng. Bổsung UX-16/17,OP-05 theo nhu cầu, không cộng cácbiểuhiệntrùng thànhbugkỹthuật. TổngCR27:0P0,4P1,22P2,1P3. KhôngpháthiệnP0/P1mới ởnhómAdmin; khôngsuy khôngcònrủiro.

`admin-round6-http.json`7checkpoint: Owner/membership sau duyệt; mởuser khôngthêmquyền; phânbiệtlockuser/Store vàphụchồi; privateRoleguard; trùngtitle/SKU2Store; NUMBERtyped; dashboard4sốtiền khớpSQL. A24thiếuphạmvi báo cáo, khôngtínhsaiđãchứngminh. PrivateRole chưagắnuser, seedroles khôngđổi.

Thu hồi tag `op-review-1793333584200`: **7productSTOPPED,2typeINACTIVE,4StoreLOCKED,4pendingapplicationREJECTED,privateRoleINACTIVE/quyềnrỗng,11user tổnghợpLOCKED,0đơn mới/0productACTIVE**. Không xóa lịch sử/audit hoặc sửa demo chung. [Closeout](../../../artifacts/core-review/operational/admin-round6-cleanup.json) có guard403 vàsố kiểm lại. Các transientlock kiểmguard đã phục hồi trước retirementchủđích.

Harness A05/A12/A21 banđầu thiếuCSRFcookie trênreload, được sửa và chạy lại6/6qua; giữattemptcũ làINVALID_HARNESS_ATTEMPT. HTTPattempt1 saiopgetStore, cleanupattempt1 sailistAuditLogs; không tạofinding từ lỗiharness, chỉchạyopđúng sauđó. Reports hiện hành khôngchefailurechứngminhbug.

## Còn lại

11NOT_RUN: C08,X19,X20,X21,X23,X24,X26,X27,X28,X29,X30. ChínBLOCKEDprovider/email/screenreader/thiếtbị vànămPOLICY_GAP giữnguyên. Sáuchuỗi vẫn cócheckpoint/điểmdừng ởreadiness, chưa chuỗi nào được công nhậnPASS toànUI/nghiệpvụ/report. Chưa sẵn sàng vận hành.
