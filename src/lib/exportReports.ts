import { format } from "date-fns";
import { formatMZN } from "@/lib/currency";

interface Sale {
  id: string;
  created_at: string;
  valor: number;
  status: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  products?: { nome: string } | null;
}

function statusLabel(s: string) {
  if (s === "approved") return "Aprovado";
  if (s === "pending") return "Pendente";
  if (s === "refunded") return "Reembolsado";
  return s;
}

export function exportCSV(sales: Sale[], dateLabel: string) {
  const header = "Data,Produto,Comprador,Email,Valor,Status,UTM Source,UTM Campaign";
  const rows = sales.map((s) =>
    [
      format(new Date(s.created_at), "dd/MM/yyyy HH:mm"),
      `"${(s.products as any)?.nome || "Produto"}"`,
      `"${s.buyer_name || "-"}"`,
      `"${s.buyer_email || "-"}"`,
      Number(s.valor).toFixed(2),
      statusLabel(s.status),
      s.utm_source || "-",
      s.utm_campaign || "-",
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `relatorio-vendas-${dateLabel}.csv`);
}

export function exportPDF(
  sales: Sale[],
  stats: { receita: number; vendas: number; ticket: number; conversao: number; abandono: number },
  dateLabel: string
) {
  const approved = sales.filter((s) => s.status === "approved");

  // Build a simple HTML-based printable report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório de Vendas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 12px; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #0d9668; }
    .subtitle { color: #666; margin-bottom: 24px; font-size: 13px; }
    .stats { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
    .stat { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; min-width: 140px; }
    .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    tr:nth-child(even) { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-refunded { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 32px; text-align: center; color: #94a3b8; font-size: 10px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>Relatório de Vendas</h1>
  <p class="subtitle">Período: ${dateLabel} · Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>

  <div class="stats">
    <div class="stat"><div class="stat-label">Receita</div><div class="stat-value">${formatMZN(stats.receita)}</div></div>
    <div class="stat"><div class="stat-label">Vendas</div><div class="stat-value">${stats.vendas}</div></div>
    <div class="stat"><div class="stat-label">Ticket médio</div><div class="stat-value">${formatMZN(stats.ticket)}</div></div>
    <div class="stat"><div class="stat-label">Conversão</div><div class="stat-value">${stats.conversao.toFixed(1)}%</div></div>
    <div class="stat"><div class="stat-label">Abandono</div><div class="stat-value">${stats.abandono.toFixed(1)}%</div></div>
  </div>

  <h2 style="font-size:14px; margin-bottom:8px;">Detalhes das vendas (${sales.length} registos)</h2>
  <table>
    <thead>
      <tr><th>Data</th><th>Produto</th><th>Comprador</th><th>Valor</th><th>Status</th><th>Origem</th></tr>
    </thead>
    <tbody>
      ${sales
        .map(
          (s) => `<tr>
        <td>${format(new Date(s.created_at), "dd/MM/yyyy")}</td>
        <td>${(s.products as any)?.nome || "Produto"}</td>
        <td>${s.buyer_name || "-"}</td>
        <td style="font-weight:600">${formatMZN(Number(s.valor))}</td>
        <td><span class="badge badge-${s.status}">${statusLabel(s.status)}</span></td>
        <td>${s.utm_source || "Direto"}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">Aureon Pay · Relatório gerado automaticamente</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
