# Demo acceptance matrix — 23/10/2026

Đủ **98 FR + 28 NFR** từ [traceability](../traceability.md), giữ nguyên [Given/When/Then của TC gốc](../requirements-acceptance.md). Đây là trạng thái **nghiệm thu full demo**, không phải Kanban hay số task/code của member. Không có dòng nào tự PASS vì DTO, CI hoặc một happy path.

`PARTIAL`: có subset kiểm chứng nhưng chưa đạt toàn TC. `NOT_RUN`: chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu này, không có nghĩa member chưa code. `BLOCKED`: thiếu điều kiện dữ liệu/provider để nghiệm thu đầy đủ. Owner BE được suy ra từ operation trong contract; owner Customer Web/Android/Seller/Admin giữ nguyên theo [phân công](task-assignment.md).

Bằng chứng subset: [real-service recovery/consent/chat](cross-service-acceptance.md), [runtime + restore + security + read load + provider smoke](cong-week4-handoff.md), [evidence định lượng](evidence/2026-10-23-cong-deployment.json). Mỗi lần nghiệm thu cần bổ sung commit, môi trường, TC và kết quả thực, rồi mới đổi trạng thái. Failure load/latency phải giữ trong evidence khi chạy lại; Refund provider và AI dataset chưa có không được thay bằng kết quả giả.

| Yêu cầu | TC gốc | Owner BE/điều phối | Full acceptance | Phần còn cần chứng minh |
| --- | --- | --- | --- | --- |
| FR-ADDR-01 | TC-FR-ADDR-01 | Trí | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-ADMIN-01 | TC-FR-ADMIN-01 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-ADMIN-02 | TC-FR-ADMIN-02 | Trí | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-ADMIN-03 | TC-FR-ADMIN-03 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-ADMIN-04 | TC-FR-ADMIN-04 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-ADMIN-05 | TC-FR-ADMIN-05 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-ADMIN-06 | TC-FR-ADMIN-06 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-ADMIN-07 | TC-FR-ADMIN-07 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-01 | TC-FR-AI-01 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-02 | TC-FR-AI-02 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-03 | TC-FR-AI-03 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-04 | TC-FR-AI-04 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-05 | TC-FR-AI-05 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-06 | TC-FR-AI-06 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-07 | TC-FR-AI-07 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AI-08 | TC-FR-AI-08 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AUTH-01 | TC-FR-AUTH-01 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-AUTH-02 | TC-FR-AUTH-02 | Trí | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-AUTH-03 | TC-FR-AUTH-03 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-AUTH-04 | TC-FR-AUTH-04 | Owner theo task gốc | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-AUTH-05 | TC-FR-AUTH-05 | Owner theo task gốc | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-CART-01 | TC-FR-CART-01 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-CART-02 | TC-FR-CART-02 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-CART-03 | TC-FR-CART-03 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-CAT-01 | TC-FR-CAT-01 | Thịnh | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CAT-02 | TC-FR-CAT-02 | Thịnh | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CATEGORY-ADMIN-01 | TC-FR-CATEGORY-ADMIN-01 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-CHECKOUT-01 | TC-FR-CHECKOUT-01 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CHECKOUT-02 | TC-FR-CHECKOUT-02 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CHECKOUT-03 | TC-FR-CHECKOUT-03 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CHECKOUT-04 | TC-FR-CHECKOUT-04 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CHECKOUT-05 | TC-FR-CHECKOUT-05 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CHECKOUT-06 | TC-FR-CHECKOUT-06 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-CHECKOUT-07 | TC-FR-CHECKOUT-07 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-INV-01 | TC-FR-INV-01 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-INV-02 | TC-FR-INV-02 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-INV-03 | TC-FR-INV-03 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-01 | TC-FR-MPROD-01 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-02 | TC-FR-MPROD-02 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-03 | TC-FR-MPROD-03 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-04 | TC-FR-MPROD-04 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-05 | TC-FR-MPROD-05 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-06 | TC-FR-MPROD-06 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-07 | TC-FR-MPROD-07 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-08 | TC-FR-MPROD-08 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-09 | TC-FR-MPROD-09 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-MPROD-10 | TC-FR-MPROD-10 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-ORDER-01 | TC-FR-ORDER-01 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-ORDER-02 | TC-FR-ORDER-02 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-ORDER-03 | TC-FR-ORDER-03 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-ORDER-04 | TC-FR-ORDER-04 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-ORDER-05 | TC-FR-ORDER-05 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-ORDER-06 | TC-FR-ORDER-06 | Owner theo task gốc | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-PAY-01 | TC-FR-PAY-01 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-PAY-02 | TC-FR-PAY-02 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-PAY-03 | TC-FR-PAY-03 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-PAY-04 | TC-FR-PAY-04 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-PAY-05 | TC-FR-PAY-05 | Công, Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-PROD-01 | TC-FR-PROD-01 | Thịnh | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-PROFILE-01 | TC-FR-PROFILE-01 | Trí | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-PTYPE-01 | TC-FR-PTYPE-01 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-REC-01 | TC-FR-REC-01 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-02 | TC-FR-REC-02 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-03 | TC-FR-REC-03 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-04 | TC-FR-REC-04 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-05 | TC-FR-REC-05 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-06 | TC-FR-REC-06 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-07 | TC-FR-REC-07 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-08 | TC-FR-REC-08 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-09 | TC-FR-REC-09 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-10 | TC-FR-REC-10 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REC-11 | TC-FR-REC-11 | Công | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-REP-01 | TC-FR-REP-01 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-REP-02 | TC-FR-REP-02 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-REP-03 | TC-FR-REP-03 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-REV-01 | TC-FR-REV-01 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-REV-02 | TC-FR-REV-02 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-REV-03 | TC-FR-REV-03 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-SEARCH-01 | TC-FR-SEARCH-01 | Thịnh | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-SEARCH-02 | TC-FR-SEARCH-02 | Thịnh | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-SEARCH-03 | TC-FR-SEARCH-03 | Thịnh | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-SEARCH-04 | TC-FR-SEARCH-04 | Thịnh | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-SORDER-01 | TC-FR-SORDER-01 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-SORDER-02 | TC-FR-SORDER-02 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-SORDER-03 | TC-FR-SORDER-03 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-STORE-01 | TC-FR-STORE-01 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-STORE-02 | TC-FR-STORE-02 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-STORE-03 | TC-FR-STORE-03 | Owner theo task gốc | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-STORE-04 | TC-FR-STORE-04 | Trí | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-STORE-05 | TC-FR-STORE-05 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-STORE-06 | TC-FR-STORE-06 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-STORE-07 | TC-FR-STORE-07 | Trí | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-STORE-08 | TC-FR-STORE-08 | Trí | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-STOREVIEW-01 | TC-FR-STOREVIEW-01 | Thịnh | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-VCH-01 | TC-FR-VCH-01 | Hoa | NOT_RUN | Chưa gắn bằng chứng chạy đủ TC trong vòng nghiệm thu demo; xem issue owner, không kết luận chưa có code. |
| FR-VCH-02 | TC-FR-VCH-02 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-VCH-03 | TC-FR-VCH-03 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| FR-VCH-04 | TC-FR-VCH-04 | Hoa | PARTIAL | Có subset API/runtime controls; cần chạy đủ Given/When/Then, lỗi và các client của TC gốc. |
| NFR-AI-01 | TC-NFR-AI-01 | Công + owner module | PARTIAL | Provider smoke/current cards có kiểm soát; cần rubric người chấm và dataset đại diện. |
| NFR-AI-02 | TC-NFR-AI-02 | Công + owner module | BLOCKED | Thiếu dataset consent đại diện/model evaluation thực so với baseline; #56/#58. |
| NFR-API-01 | TC-NFR-API-01 | Công + owner module | PARTIAL | 99 DTO/fixture và contract CI đạt; còn endpoint/nghiệp vụ/UI chưa nghiệm thu đủ. |
| NFR-ARCH-01 | TC-NFR-ARCH-01 | Công + owner module | PARTIAL | Bốn service/DB ownership và acceptance thật đã chạy; còn toàn ma trận giao tiếp. |
| NFR-ISO-01 | TC-NFR-ISO-01 | Công + owner module | PARTIAL | Cross-Customer Order/chat và Store metrics đã kiểm; còn toàn tài nguyên/hai Store/permission. |
| NFR-PERF-01 | TC-NFR-PERF-01 | Công + owner module | PARTIAL | Có read smoke Catalog/Related; còn workload API/dataset đích. |
| NFR-PERF-02 | TC-NFR-PERF-02 | Công + owner module | PARTIAL | Có mẫu provider bốn case; còn benchmark RAG đại diện và target latency. |
| NFR-PERF-03 | TC-NFR-PERF-03 | Công + owner module | PARTIAL | 100 VU read smoke/seed nhỏ; chưa có mixed workload/dataset đích và resource time-series. |
| NFR-PERF-04 | TC-NFR-PERF-04 | Công + owner module | PARTIAL | Runtime/CI kiểm bounds và một số list; còn toàn list/API/client. |
| NFR-PERF-05 | TC-NFR-PERF-05 | Công + owner module | NOT_RUN | Cần kiểm đích cụ thể; không suy ra PASS từ CI. |
| NFR-PRIV-01 | TC-NFR-PRIV-01 | Công + owner module | PARTIAL | Có redaction/provider guard controls; còn rubric prompt/data trên tập đại diện. |
| NFR-PRIV-02 | TC-NFR-PRIV-02 | Công + owner module | PARTIAL | Audit runner không xuất token/PII; còn scan log đầy đủ cho mọi module/provider. |
| NFR-REL-01 | TC-NFR-REL-01 | Công + owner module | PARTIAL | Inventory/coordinator PostgreSQL và actual HTTP controls; còn ma trận cạnh tranh xuyên service đầy đủ. |
| NFR-REL-02 | TC-NFR-REL-02 | Công + owner module | PARTIAL | Real Confirm/lost ACK/restart giữ operation ID; còn mọi boundary/mixed-Store. |
| NFR-REL-03 | TC-NFR-REL-03 | Công + owner module | PARTIAL | ProductChanged qua MQ làm stale index và current cards; còn latency/index toàn dataset. |
| NFR-REL-04 | TC-NFR-REL-04 | Công + owner module | PARTIAL | Inbox/outbox/dedup/command replay thực đã kiểm; Refund provider còn thiếu. |
| NFR-SEC-01 | TC-NFR-SEC-01 | Công + owner module | PARTIAL | Login/hash controls có CI; email register/reset thực còn dependency Trí. |
| NFR-SEC-02 | TC-NFR-SEC-02 | Công + owner module | PARTIAL | Live JWT/context/roles đã kiểm; effective permission/revoke còn #44. |
| NFR-SEC-03 | TC-NFR-SEC-03 | Công + owner module | PARTIAL | Guard trước validation và DTO controls đã kiểm; còn toàn API/quyền/state. |
| NFR-SEC-04 | TC-NFR-SEC-04 | Công + owner module | PARTIAL | Secrets local/bind, Docker excludes env/Git; còn scan và vận hành toàn release. |
| NFR-SEC-05 | TC-NFR-SEC-05 | Công + owner module | PARTIAL | Refresh rotation/replay/CSRF/revoke đã kiểm; email reset/session flows đầy đủ còn thiếu. |
| NFR-SEC-06 | TC-NFR-SEC-06 | Công + owner module | PARTIAL | Có limiter/chat budget controls; còn workload/phân bố IP/rate policy đầy đủ. |
| NFR-SEC-07 | TC-NFR-SEC-07 | Công + owner module | PARTIAL | HTTPS public và subset ownership đã kiểm; còn toàn tài nguyên/hai Store. |
| NFR-SEC-08 | TC-NFR-SEC-08 | Công + owner module | NOT_RUN | Cần kiểm đích cụ thể; không suy ra PASS từ CI. |
| NFR-SEC-09 | TC-NFR-SEC-09 | Công + owner module | PARTIAL | Product/audit/outbox atomic controls và M3 events; còn toàn hành động quản trị. |
| NFR-SEC-10 | TC-NFR-SEC-10 | Công + owner module | PARTIAL | UserLocked/StoreStatusChanged qua MQ đã kiểm; membership/revoked permission còn Trí. |
| NFR-DATA-01 | TC-NFR-DATA-01 | Công + owner module | PARTIAL | Schema/constraints/four isolated restores đã kiểm; không chứng nhận toàn nghiệp vụ xuyên DB. |
| NFR-MONEY-01 | TC-NFR-MONEY-01 | Công + owner module | PARTIAL | Payment rollback/dedup/late callback/Refund REQUESTED đã kiểm; còn Refund thật/đối soát từng Order. |
