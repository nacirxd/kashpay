import { formatMZN } from "@/lib/currency";
import { formatDateTimeMZ } from "@/lib/timezone";

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
      formatDateTimeMZ(s.created_at),
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 0; font-size: 12px; }
    .header { background: linear-gradient(135deg, #0d9668, #0fb880); padding: 32px 40px; color: white; display: flex; align-items: center; justify-content: space-between; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .logo-circle { width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: white; letter-spacing: -1px; }
    .brand-name { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; opacity: 0.8; margin-top: 2px; }
    .header-right { text-align: right; font-size: 11px; opacity: 0.85; line-height: 1.6; }
    .content { padding: 32px 40px; }
    .report-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .subtitle { color: #64748b; margin-bottom: 24px; font-size: 12px; }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
    .stat { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #fafbfc; }
    .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
    .stat-value { font-size: 20px; font-weight: 700; margin-top: 6px; color: #0f172a; }
    .section-title { font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #334155; }
    tr:nth-child(even) { background: #fafbfc; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-refunded { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 10px; }
    .footer span { color: #0d9668; font-weight: 600; }
    @media print { body { padding: 0; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .stat { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo-circle">AP</div>
      <div>
        <div class="brand-name">KashPay</div>
        <div class="brand-sub">Relatório de Vendas</div>
      </div>
    </div>
    <div class="header-right">
      Período: ${dateLabel}<br>
      Gerado em ${formatDateTimeMZ(new Date().toISOString())}
    </div>
  </div>

  <div class="content">
    <div class="stats">
      <div class="stat"><div class="stat-label">Receita</div><div class="stat-value">${formatMZN(stats.receita)}</div></div>
      <div class="stat"><div class="stat-label">Vendas</div><div class="stat-value">${stats.vendas}</div></div>
      <div class="stat"><div class="stat-label">Ticket médio</div><div class="stat-value">${formatMZN(stats.ticket)}</div></div>
      <div class="stat"><div class="stat-label">Conversão</div><div class="stat-value">${stats.conversao.toFixed(1)}%</div></div>
      <div class="stat"><div class="stat-label">Abandono</div><div class="stat-value">${stats.abandono.toFixed(1)}%</div></div>
    </div>

    <div class="section-title">Detalhes das vendas (${sales.length} registos)</div>
    <table>
      <thead>
        <tr><th>Data</th><th>Produto</th><th>Comprador</th><th>Valor</th><th>Status</th><th>Origem</th></tr>
      </thead>
      <tbody>
        ${sales
          .map(
            (s) => `<tr>
          <td>${formatDateTimeMZ(s.created_at)}</td>
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

    <div class="footer">Powered by <span>KashPay</span> · Relatório gerado automaticamente</div>
  </div>
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
