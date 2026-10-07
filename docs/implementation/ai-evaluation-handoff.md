# AI evaluation — bàn giao bộ kiểm soát độc lập

Owner: Công. Scope [AI-02 #56](https://github.com/embetapbay123/PBL6/issues/56), [AI-03 #57](https://github.com/embetapbay123/PBL6/issues/57), [AI-04 #58](https://github.com/embetapbay123/PBL6/issues/58). Provider vẫn `none` theo lựa chọn hiện tại; bộ này không gọi model, không dùng data giả để publish model serving.

## Đã có

- [Dataset generator](../../backend/ai-service/app/evaluation/dataset.py): version cố định, UUID synthetic, 60 user/72 product/1.200 interaction; timestamp cố định, 6 nhóm sở thích. Product fixture validate theo OpenAPI; event IDs không trùng. Đây không phải dữ liệu người dùng đã consent thực.
- [Pipeline](../../backend/ai-service/app/evaluation/pipeline.py) dùng chung với DB training job: 60/20/20 theo timestamp từng user, giữ timestamp trùng cùng fold; chọn regularization bằng validation NDCG@10, chỉ đánh giá test sau lựa chọn. Config ghi đầy đủ factors/iterations/alpha/regularization/seed.
- [Ranking](../../backend/ai-service/app/evaluation/ranking.py): ALS so với train-popularity và Content/Behavioral baseline trên cùng candidates, K=10, loại item từng user đã thấy trong train. Content chỉ dùng observation train để tổng hợp product_type/text, không nhìn validation/test để fit. Tie-break theo Product UUID. Có coverage, cold count và raw per-case không chứa User ID.
- `quality_pass` chỉ true khi có test case đủ điều kiện và model vượt mỗi baseline ít nhất một trong P/R/NDCG. Thiếu baseline content trả `quality_status=NOT_RUN`; test không có relevant item mới trả `NOT_EVALUABLE`. `COMPLETED` của job chỉ nghĩa đã chạy, không chứng nhận chất lượng.
- [13 câu hỏi/case có nhãn](../../backend/ai-service/app/evaluation/data/chat_cases.json): nhu cầu/budget, outside-domain/no-match, injection, giá đổi sau retrieval, ẩn/khóa Store, Catalog unavailable, index stale và multi-turn có từ khóa rõ. Chạy ChatRuntime với DB schema tách biệt và Catalog scenario test double; kiểm response contract, card/giá hiện hành, budget, atomic message pair và không lưu nửa lượt khi lỗi.
- [Runner](../../backend/ai-service/app/evaluation/benchmark.py): lưu dataset/catalog/artifact/source hashes, runtime versions, metric/raw result và rubric template chấm tay. Provider luôn none; generation_quality_status=NOT_RUN, human_review_status=REQUIRED, cost/token không biết giữ null. Schema `eval_<UUID>` tự cleanup; không ghi public serving tables.

## Chạy lại

```powershell
$evaluationCommit = git rev-parse HEAD
New-Item -ItemType Directory -Force artifacts/ai-evaluation | Out-Null
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build m4
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm --no-deps -v "${PWD}/artifacts/ai-evaluation:/artifacts" m4 python -m app.evaluation.benchmark --commit "$evaluationCommit" --output /artifacts/controls.json
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml run --rm --no-deps m4 python -m pytest -q -p no:cacheprovider
```

Runner all/chat cần PostgreSQL M4 và migration/extension sẵn theo setup README. `--suite recommendation` chỉ dùng dữ liệu trong RAM, không cần DB. `--fail-on-quality` trả exit2 nếu recommendation không vượt cả hai baseline; mặc định exit1 cho control FAIL, exit0 chỉ nói bộ kiểm soát chạy đạt. Report và `.review-template.json` xuất cạnh nhau; template để trống scores/reviewer, không tự chấm groundedness/relevance từ card check.

Dataset version là cố định; không đổi split/seed sau khi xem test để ép PASS. Các metric có thể khác khi runtime/numerical library đổi; report ghi version và source hashes. Consent-off/withdrawal/ownership/retention vẫn được kiểm bởi test PostgreSQL runtime hiện có; không gộp vào quality metric này như dữ liệu hành vi thật.

## Kết quả synthetic ngày 07/10/2026

| Phương pháp | Precision@10 | Recall@10 | NDCG@10 |
| --- | --- | --- | --- |
| ALS | 0.4000 | 1.0000 | 0.9250 |
| Train-popularity | 0.0483 | 0.1208 | 0.0880 |
| Content/Behavioral | 0.4000 | 1.0000 | 0.8627 |

60 user được đánh giá, train/validation/test = 720/240/240 event, ALS catalog coverage=1.0; synthetic quality_pass=true. Cấu trúc cluster là nhân tạo và thuận lợi cho học preference; không chứng minh chất lượng marketplace. Chat controls 13/13 đạt, 16 card được kiểm, 0 card sai; runtime latency với scenario test double không phải latency gateway/LLM. Bản evidence có raw result và hash được lưu trong docs sau khi khóa source commit.

## Còn để nghiệm thu thật

1. #55: nguồn hành vi thật M1/M2/M3 và consent, dedup/retention đủ; owner producer giữ Thịnh/Hoa/Trí.
2. #56/#58: chạy job với dữ liệu đủ và candidate Catalog thật; báo coverage/cold start/giới hạn lịch sử cùng raw metrics. Không import synthetic controls vào bảng serving để giả model tốt.
3. #57: chọn model/provider rồi đo generation/semantic retrieval/cost/latency thực. Pronoun-only context chưa được chứng minh bởi multi-turn có từ khóa rõ. Lập bộ câu hỏi phù hợp Catalog thực; người chấm đánh giá groundedness/relevance/hallucination và ghi bất đồng. Không nhận fallback là LLM quality PASS.
4. #59: benchmark tải gateway/provider và dataset đích; thời gian chạy control trong schema riêng không chứng minh NFR.

Không đổi metadata endpoint thành IMPLEMENTED hoặc đóng issue rộng vì có benchmark synthetic. Các task khác giữ owner và Status kế hoạch hiện có.
