# Chịu tải và kế hoạch đo

Nguồn: [28 NFR](../functional-requirements.md), [acceptance](../requirements-acceptance.md). Mục tiêu baseline chưa được chứng minh bởi khung.

| Nhóm | Mục tiêu / điều kiện | Trạng thái khung |
| --- | --- | --- |
| API | >=95% request <2 giây với tối thiểu 100 user đồng thời | Smoke Catalog/related PASS ngày 07/10; NFR toàn hệ thống NOT_RUN |
| RAG | Mục tiêu <4 giây trong điều kiện MVP | Runtime real + fallback; model/provider benchmark NOT_RUN |
| Pagination | size <=100, query DB, hạn chế N+1 | List Product mẫu đã test; module khác chưa có |
| Nhất quán | Không oversell/đơn/tiền/tồn lặp | Payment/COD/callback/Refund atomic đã test; checkout/kho toàn luồng chưa đạt |
| DB | Index theo query thật; pool hữu hạn | Foundation index/pool Node10/M4 5; EXPLAIN chưa đo |
| Error rate | Đề xuất <1% lỗi bất ngờ ở tải mục tiêu | Smoke read cuối 0%; workload đầy đủ chưa đo, tách 429/lỗi nghiệp vụ |

100 user không đồng nghĩa 100 request/giây. Báo cáo p95 theo route, throughput, think time, request không gửi được, CPU/RAM/lock/pool/queue age; không lấy trung bình thay p95.

## Kịch bản khung

[infrastructure/load/catalog.k6.js](../../infrastructure/load/catalog.k6.js) có WORKLOAD=catalog hoặc related; default ramp10→100 VU, giữ2 phút, think time1 giây. PROFILE=smoke dùng 100 VU/30 giây, think time20 giây; seed nhỏ. Đây là smoke load để thành viên mở rộng, chưa đại diện dữ liệu/traffic marketplace. Giới hạn600 request/phút/IP của local có thể gây429 với100 VU chung IP; ghi riêng429 và điều chỉnh budget/phân bố IP trên môi trường tải trước khi đánh giá năng lực.

```powershell
docker run --rm --network pbl6_default -v "${PWD}/infrastructure/load:/scripts:ro" grafana/k6:0.57.0 run /scripts/catalog.k6.js
```

Chỉ chạy trên môi trường test được dành riêng. Không chạy tải trả phí AI/provider trên máy dùng giao dịch thật. Smoke đã chạy, xem kết quả bên dưới; default ramp và nghiệm thu đích chưa chạy.

## Hồ sơ nghiệm thu đích

Đề xuất dataset giả: 10 Store, 10.000 Product, 20.000 Variant, 1.000 Customer, 50.000 Order lịch sử. Seed có version/phân bố. Warm-up2 phút, ramp0→100 trong3 phút, giữ15 phút, giảm2 phút; soak60 phút riêng. Mix đề xuất 50% catalog,20% cart,15% readOrder,10% quote,5% createOrder có key riêng. Chỉ chạy khi những nghiệp vụ đó đã hoàn thiện.

Chatbot đo riêng với provider/model/prompt/index version, warm/cold, latency/fallback/cost; không gộp mock vào báo cáo chất lượng thật. Stress150/200 VU tìm điểm gãy, không coi là năng lực cam kết.

Khung đã phân trang/batch variants, rate limit Redis, HTTP/DB timeout và pool hữu hạn. Member bổ sung body/upload/queue/concurrency budget theo module, EXPLAIN ANALYZE dataset mục tiêu, cache có TTL/invalidation/scope. Giá/tồn cache không dùng chốt Order. AI ingestion/train chạy worker riêng, không trong request Product update.

Báo cáo lưu run ID/commit, tool/script, CPU/RAM/OS, số instance/worker/pool, dataset, mode mock/real, request count/RPS, p50/p95/p99/max từng route, error breakdown, DB/queue và invariant sau tải. Mỗi NFR có PASS/FAIL/NOT_RUN và raw artifact.

## Kết quả thực ngày 07/10/2026

[Handoff độc lập](cong-independent-handoff.md) và [record JSON](evidence/2026-10-07-cong-ops.json) ghi môi trường, giới hạn, raw artifact và SHA-256. Docker Desktop 16 CPU/7.36 GiB; 3 Product công khai; M4 real/provider none; 1 instance mỗi service. k6 0.57.0, 100 VU/30 giây/think time20 giây. Không phải workload giao dịch hoặc benchmark model.

| Run | HTTP requests | p95 ms | HTTP lỗi | Kết quả smoke |
| --- | --- | --- | --- | --- |
| Catalog | 200 | 508.81 | 0% | PASS |
| Related trước tối ưu | 170 | 5999.49 | 87.06% | FAIL |
| Related shared client ban đầu | 201 | 3043.36 | 0% | FAIL latency |
| Related final | 201 | 1669.95 | 0% | PASS |

Related gồm một request setup Catalog. Hai run cuối có 400/400 checks; 100 interrupted iterations cuối run là VU đang think-time, không phải HTTP thất bại. Các tuning run FAIL khác vẫn lưu trong artifacts; Anonymous ForYou trả 401 do workload sai guard được loại khỏi capacity result. Không xóa FAIL hoặc nhận NFR đầy đủ từ một run nhỏ.

M4 dùng client lifespan/pool50/keep-alive20, timeout mỗi dependency1 giây; reference trong page hiện hành được dùng lại, ActiveStores kiểm một lần trong cùng request. Không cache quyền/giá qua request. Resources/queue snapshot không đo peak; cần monitor time-series/DB/queue age và dataset đích khi nghiệm thu chính thức.

```powershell
New-Item -ItemType Directory -Force artifacts/load/read-smoke | Out-Null
docker run --rm --network pbl6_default -v "${PWD}/infrastructure/load:/scripts:ro" -v "${PWD}/artifacts/load/read-smoke:/artifacts" grafana/k6:0.57.0 run -e PROFILE=smoke -e WORKLOAD=related --summary-export /artifacts/summary.json --out json=/artifacts/raw.json /scripts/catalog.k6.js
```
