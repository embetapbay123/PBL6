# Chịu tải và kế hoạch đo

Nguồn: [28 NFR](../functional-requirements.md), [acceptance](../requirements-acceptance.md). Mục tiêu baseline chưa được chứng minh bởi khung.

| Nhóm | Mục tiêu / điều kiện | Trạng thái khung |
| --- | --- | --- |
| API | >=95% request <2 giây với tối thiểu 100 user đồng thời | NOT_RUN; có script Catalog read |
| RAG | Mục tiêu <4 giây trong điều kiện MVP | NOT_RUN; AI mock |
| Pagination | size <=100, query DB, hạn chế N+1 | List Product mẫu đã test; module khác chưa có |
| Nhất quán | Không oversell/đơn/tiền/tồn lặp | Chỉ test inbox/command mẫu; checkout/payment chưa có |
| DB | Index theo query thật; pool hữu hạn | Foundation index/pool Node10/M4 5; EXPLAIN chưa đo |
| Error rate | Đề xuất <1% lỗi bất ngờ ở tải mục tiêu | Chưa đo; tách 5xx/timeout/network/429 khỏi lỗi nghiệp vụ |

100 user không đồng nghĩa 100 request/giây. Báo cáo p95 theo route, throughput, think time, request không gửi được, CPU/RAM/lock/pool/queue age; không lấy trung bình thay p95.

## Kịch bản khung

[infrastructure/load/catalog.k6.js](../../infrastructure/load/catalog.k6.js) chỉ gọi Product list có seed nhỏ, ramp10→100 VU, giữ2 phút, think time1 giây. Đây là smoke load để thành viên mở rộng, chưa đại diện dữ liệu/traffic marketplace. Giới hạn600 request/phút/IP của local có thể gây429 với100 VU chung IP; ghi riêng429 và điều chỉnh budget/phân bố IP trên môi trường tải trước khi đánh giá năng lực.

```powershell
docker run --rm --network pbl6_default -v "${PWD}/infrastructure/load:/scripts:ro" grafana/k6:0.57.0 run /scripts/catalog.k6.js
```

Chỉ chạy trên môi trường test được dành riêng. Không chạy tải trả phí AI/provider trên máy dùng giao dịch thật. Khung hiện chưa chạy benchmark này.

## Hồ sơ nghiệm thu đích

Đề xuất dataset giả: 10 Store, 10.000 Product, 20.000 Variant, 1.000 Customer, 50.000 Order lịch sử. Seed có version/phân bố. Warm-up2 phút, ramp0→100 trong3 phút, giữ15 phút, giảm2 phút; soak60 phút riêng. Mix đề xuất 50% catalog,20% cart,15% readOrder,10% quote,5% createOrder có key riêng. Chỉ chạy khi những nghiệp vụ đó đã hoàn thiện.

Chatbot đo riêng với provider/model/prompt/index version, warm/cold, latency/fallback/cost; không gộp mock vào báo cáo chất lượng thật. Stress150/200 VU tìm điểm gãy, không coi là năng lực cam kết.

Khung đã phân trang/batch variants, rate limit Redis, HTTP/DB timeout và pool hữu hạn. Member bổ sung body/upload/queue/concurrency budget theo module, EXPLAIN ANALYZE dataset mục tiêu, cache có TTL/invalidation/scope. Giá/tồn cache không dùng chốt Order. AI ingestion/train chạy worker riêng, không trong request Product update.

Báo cáo lưu run ID/commit, tool/script, CPU/RAM/OS, số instance/worker/pool, dataset, mode mock/real, request count/RPS, p50/p95/p99/max từng route, error breakdown, DB/queue và invariant sau tải. Mỗi NFR có PASS/FAIL/NOT_RUN và raw artifact.
