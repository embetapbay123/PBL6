-- Journal retries must retain the original Refund operation and amount.
ALTER TABLE refund ADD CONSTRAINT refund_job_snapshot_unique UNIQUE(id,operation_id,amount_vnd);
ALTER TABLE refund_job ADD CONSTRAINT refund_job_snapshot_matches
  FOREIGN KEY(refund_id,operation_id,amount_vnd) REFERENCES refund(id,operation_id,amount_vnd);
