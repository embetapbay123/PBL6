type CashBucket = {
  bucket_start: string;
  collected_vnd: number;
  refunded_vnd: number;
};
const money = (value: number) => value.toLocaleString("vi-VN") + " ₫";
const date = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

/** Bars are driven exclusively by the API cash journal, with the exact values in the adjacent table. */
export function CashChart({ rows }: { rows: CashBucket[] }) {
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [row.collected_vnd, row.refunded_vnd]),
  );
  const width = Math.max(640, rows.length * 56),
    height = 235;
  return (
    <figure className="cash-chart">
      <figcaption>
        <strong>Dòng tiền đã xác nhận</strong>
        <span>
          <i className="cash-collection-key" /> Đã thu{" "}
          <i className="cash-refund-key" /> Đã hoàn
        </span>
      </figcaption>
      <div
        className="cash-chart-scroll"
        tabIndex={0}
        role="region"
        aria-label="Biểu đồ dòng tiền, có thể cuộn ngang"
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Biểu đồ cột tiền đã thu và hoàn theo kỳ. Số tiền chính xác nằm trong bảng bên dưới."
        >
          {[0, 0.5, 1].map((ratio) => (
            <g key={ratio}>
              <line
                x1={12}
                x2={width - 12}
                y1={185 - ratio * 155}
                y2={185 - ratio * 155}
                stroke="var(--ui-line)"
              />
              <text
                x={12}
                y={178 - ratio * 155}
                fontSize={10}
                fill="var(--ui-muted)"
              >
                {money(Math.round(max * ratio))}
              </text>
            </g>
          ))}
          {rows.map((row, index) => {
            const x = 55 + (index * (width - 80)) / rows.length,
              bar = Math.min(16, (width - 80) / rows.length / 3);
            return (
              <g key={row.bucket_start}>
                <title>
                  {date(row.bucket_start)}: đã thu {money(row.collected_vnd)},
                  đã hoàn {money(row.refunded_vnd)}
                </title>
                <rect
                  className="cash-collection-bar"
                  x={x}
                  y={185 - (row.collected_vnd / max) * 155}
                  width={bar}
                  height={(row.collected_vnd / max) * 155}
                  rx={2}
                />
                <rect
                  className="cash-refund-bar"
                  x={x + bar + 3}
                  y={185 - (row.refunded_vnd / max) * 155}
                  width={bar}
                  height={(row.refunded_vnd / max) * 155}
                  rx={2}
                />
                <text
                  x={x + bar}
                  y={211}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--ui-muted)"
                >
                  {date(row.bucket_start)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}

// Protect spreadsheet readers from formula execution in exported text fields.
function cell(value: string | number) {
  const raw = String(value),
    safe = /^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function downloadReportCsv({
  scope,
  from,
  to,
  summary,
  rows,
}: {
  scope: string;
  from: string;
  to: string;
  summary: Record<string, string | number>;
  rows?: CashBucket[];
}) {
  const lines: (string | number)[][] = [
    ["Báo cáo tổng hợp và chuỗi thu/hoàn"],
    ["Phạm vi", scope],
    ["Từ ngày (bao gồm)", from],
    ["Đến trước ngày", to],
    ["Múi giờ", "Asia/Ho_Chi_Minh"],
    [],
    ["Chỉ số", "Giá trị"],
    ...Object.entries(summary),
    [],
    [
      "Ngày phát sinh (giờ Việt Nam)",
      "Tiền đã thu (VND)",
      "Tiền đã hoàn (VND)",
    ],
  ];
  if (rows)
    lines.push(
      ...rows.map((row) => [
        date(row.bucket_start),
        row.collected_vnd,
        row.refunded_vnd,
      ]),
    );
  else lines.push(["Chưa có dữ liệu chuỗi sự kiện tiền"]);
  const url = URL.createObjectURL(
    new Blob(
      ["\ufeff" + lines.map((row) => row.map(cell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `bao-cao-${from}-${to}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
