# Đợt53 — Admin nhận diện người thực hiện và tra nhật ký đúng phạm vi

Baseline sửa gốc giữ nguyên `fix-20261030T100153Z`, runtime cuối **Node53b/AI53/frontend53-final**, stack riêng `pbl6-fe-verify`. **UX-17 VERIFIED;38/52finding gốc đã xác minh,14còn mở.** F14 còn UX-16 về đủ ngữ cảnh Store/khách/vụ việc; sáu chuỗi trên cùng source cuối và rollback snapshot writer vẫn mở. Không chạy mobile theo yêu cầu.

## Bằng chứng và nguyên nhân

`admin-audit-baseline52-fixed-fixture.json` có3FAIL: hai người cùng display_name không có email/status/link để phân biệt; actor thiếuID được ghi thành Hệ thống; không có bộ lọc Store/actor/target/kỳ và ngữ cảnh URL. Lượt baseline đầu fixture dùng sai route lookup được giữ riêng, không dùng làm chứng cứ cho lỗi nhãn. Đây là mở rộng và hoàn thiện UX-17, không đếm các biểu hiện thành nhiều finding gốc.

Trong quá trình thực thi còn xác nhận **P2 CF-053-01**: đổi khu vực nhật ký cập nhật URL, effect đồng bộ toàn bộ params ghi đè action vừa nhập bằng action đã áp cũ. `admin-audit-runtime53-run2.json` dừng tại identity/UNKNOWN với action vẫnFIXTURE_PAGING. Sửa effect chỉ đồng bộ khi **các giá trị bộ lọc đã áp** thay đổi; source/page không xóa draft. Regression riêng giữ NEW_ACTION qua đổi khu vực đã qua. Không thay fixture thành trả kết quả cho filter sai để làm ca qua.

## Thay đổi

- `AuditActorsService`: lookup Admin có quyền `platform.admin` bổ sung email/status **hiện tại** cùng nhãn vàID. Store lookup vẫn chỉID/label, kiểm membership lịch sử trong Store, không thêm email/status hoặc quyền đọc toàn sàn. Giới hạn100ID/lượt và loại trùng giữ nguyên.
- `AuditActors.tsx`: Admin thấy tên/email/trạng thái, link tới tài khoản theoID; tên trùng hoặc tài khoảnLOCKED vẫn nhận diện được. Actor NULL/thiếuID là chưa có thông tin, zeroUUID tường minh mới là System; ID không resolve giữ nguyên và có đường tra. Lỗi đọc nhãn bỏ danh tính cache cũ khỏi hiển thị cho tới khi đọc lại thành công. Metadata là hiện tại, không giả là snapshot người dùng tại thời điểm thao tác. Lịch sử sau bán Admin dùng cùng component; Owner không được bật metadata Admin.
- `AuditLogService`: lọc actor/target/Store/thời gian trước count/pagination, query có tham số, kiểm khoảng `[from,to)` và giới hạn trang. Chuẩn hóa executor/cancellation bằng cùng helper của Store audit cho các worker/provider lịch sử đã biết; không gán actor từ nội dung action tùy ý. Vẫn chỉ trả metadata, không before_json/after_json hoặc lý do thô nhạy cảm.
- ScopeStore cũ của Product/Variant/Inventory chỉ được khôi phục từ ownership đối tượng bất biến cùngdatabase. Global log hoặc lịch sử không đủ căn cứ giữ thiếuStore; không suy từ membership hiện tại. Các service khác dùng store_id đã ghi. Writer moderation mới lưu store_id cùng audit đúngtransaction; không backfill tùy tiện lịch sử.
- `AuditLogPage`: filter theoURL, giữ back/reload/page/source, link tới đúngStore/account, thời gian input theoUTC+7 và nhãn giờ Việt Nam. Có GET đọc lại kể cả cùngfilter; lỗi không giả0/rỗng hoặc dùng danh tính cũ. Hủy request đọc cũ theo signal. Draftfilter không bị source/page reset.
- Contract audit bổ sung query/metadata tùy chọn, lookup bổ sung email/status tùy chọn chỉAdmin. Regenerate Node/FE/Python và publictypings. Không endpoint mới hoặc migration.

## Kiểm chứng cuối

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Unit đúngimage53b |374PASS/51suite|`backend-unit-admin-audit53b.json`|
| SQL cách ly |22PASS/3suite: Adminaudit mới4, Storeaudit/metadata privacy, moderationprojection|`admin-audit-sql53b.json`|
| Python reader |9PASS|`ai-contracts53.xml`|
| Edge desktop |8PASS: nhãn/link/NULL/System/unresolved, kỳUTC+7, URL/pager/reload/refresh, GETlỗi, draftsource, quyền|`admin-audit-ui53-final.json`|
| UI/API/worker thật |PASS2Store, Owner/nhân viên trùng tên, nhân viênLOCKED, link tài khoản/back, paging23, ba khu vực audit|`admin-audit-runtime53-accepted.json`|
| SELECT độc lập |Đúngactor/auditScope,1consume+1restock,0money;8Store/product fixture thu hồi,4đơnCANCELLED, ledgercân|`admin-audit-final-state53.json`|
| Source/image |394backend/43AI/303frontend-contract-test-config/10container khớp|`deployed-source-manifest-53.json`, `frontend-source-admin-audit53.json`, `runtime-image-admin-audit53.json`|

SQL mới chạy cả ba service migrations trong schema tạm có tên bảo vệ, không sửa demo. Kiểm filter trướccount/page, biên `[from,to)`, Store khác, literalSQL, legacyStore từProduct; actorNULL/System/legacyworker/humancancel; hai tên trùng khácemail, khóauser; Owner không nhận email/status; Adminthiếupermission403. Metadata không chứa rawsnapshot. Thứ tự/quyền kỳ vọng được kiểm theo contract thật, không suy tài liệu cũ.

### Runtime có phân biệt loại bằng chứng

Hai Store tạo quaAPI với catalog/kho cótag. Owner và nhân viên StoreA đổi tên hiện tại thành cùng một tên nhưng khácemail; mỗi người sửa giá thật quaAPI. Một StoreB cũng sửa món thật để kiểm không lọtScope. Nhân viênA được khóa sau thao tác để kiểm nhãn lịch sử của tài khoảnLOCKED.

CustomerA tạoCOD122000, workerconsume→PENDING, Customerhủy, workerrestock. Adminẩn sản phẩmA bằngAPI thật. Sau đó walkthrough bắt đầu từmenuAdmin→Nhật ký, lọcStore/product/kỳ và actionUPDATE: đúng2người, emailkhác, statuskhác. Link tới đúng tài khoản rồiBack giữStore/filter. Admin có thể tra các mốc kho tự động, humanCANCEL_ORDER và moderation đúngStore.

**26hàng audit đọc thử** đượcseed riêng để có23dòng phân trang và các trạng thái System/UNKNOWN/unresolved; chúng là fixture kiểmreader, **không tuyên bố26lệnh nghiệp vụ đã xảy ra**. ActorNULL được đặt ởM3 nơi schema cho phép; M1 NOTNULL được giữ nguyên. NULLhiểnthị “Chưa có thông tin”, zeroUUIDhiểnthịSystem, UUIDkhông cóuser vẫngiữID.23dòng phân trang20/3, reload đúngtrang2. Markerrawwithheld không được trả quaAPI.

Owner lookup employee/foreignOwner chỉ trảlabel củaemployee trongStore, khôngemail/status. StoreB audit củaproductA cótotal0; Owner trực tiếpreadAdminaudit/lookup đều403. Screenshotdesktop đã xem thể hiện haiemail/status cạnh hai tên trùng; không claim screenreader/thiết bị thật hoặc nghiên cứu người dùng.

### Đối chiếu kho và cleanup

Hai auditINVENTORY_CONSUMED hợp lệ: một mốc đổiOrderPREPARING→PENDING và một mốc inventoryRESERVED→CONSUMED. Cả hai executorSystem; SQLstock_movement chỉ mộtRESERVE(0,+1), mộtCONSUME(-1,-1), mộtRESTOCK(+1,0),3operationID, trạng thái khoRESTOCKED. Không lấy sốaudit làm sốgiao dịchtrừkho. MỗiStore cuốiquantity10/reserved0, ledger10/0.

Hậu kiểm cả4lượt runtime:8StoreLOCKED,8product/type/categorySTOPPED,4OrderCANCELLED,0money. Giữ lịch sử và readmodelfixture cótag, không xóa/sửa tiền hoặc tồn để làmassertionqua. Verifier đầu quên auditUPDATEcleanupdừngbán; bản cuối yêu cầu đủ3UPDATEactorOwner/employee/Owner và afterSTOPPED, cùng1PRODUCT_HIDDEN.

## Lịch sử thử và triển khai

Giữ `admin-audit-sql53.json`: fixture mới thiếu shipping_fee_vndNOTNULL và testcũ chưa mong đợi metadataAdmin mới; sửa đúngfixture/contractexpectation, Ownerprivacyassertions giữnguyên. Node53b gồm sửa test, appcode không đổi so với53;374unit/22SQL chạy lại đúng53b. Buildfrontend/backend và OpenAPI139publicpath/14internalpath,159public+14internalDTO/7event/drift qua. Windows từ chối ghi publictypingbackend ởsandbox, ghi lại qua host thànhcông; không đổi quyềnfile hoặc tảipackage.

Giữ runtime53-trial (seedNULLM1 bịNOTNULL, transactionrollback), run2 (racefilter thật đãsửa), final (harnessexpected1auditworker thayvì2mốchợplệ), accepted cuốiPASS. Không nới invariant mộtconsumeeffect: SQLcuối chứng minh trực tiếp.

ReaderAI53 bậttrướcNode53b,9Pythontest qua; chỉstacktest, khôngproduction/commit. Khôngmigrationnên không córollbackDDL; readercũkhôngnhậnqueryfiltermới, cần giữreadertươngthích khi tắtwriter/UI mới. Snapshotwriterrollback37 vẫnF18riêng. Providerchỉtest, đơnCODhủytrướcthu; USER_VALIDATION_PENDING, mobile đãđượcmiễn.14findinggốc và sáuchuỗicuối vẫnchưachốt; ưu tiênUX-16vàcácfindingcònlại.
