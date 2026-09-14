import { useEffect, useState, useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { formatDateTimeMZ } from "@/lib/timezone";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Withdrawal {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  valor: number;
  status: string;
  metodo: string;
  conta: string;
  created_at: string;
}

const statusMap: Record<string, { label: string; classes: string }> = {
  pendente: { label: "Pendente", classes: "bg-yellow-500/10 text-yellow-400" },
  processando: { label: "Processando", classes: "bg-blue-500/10 text-blue-400" },
  approved: { label: "Processado", classes: "bg-emerald-500/10 text-emerald-400" },
  rejected: { label: "Recusado", classes: "bg-red-500/10 text-red-400" },
};

type StatusFilter = "all" | "pendente" | "processando" | "approved" | "rejected";

const filterButtons: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pendente", label: "Pendentes" },
  { key: "processando", label: "Processando" },
  { key: "approved", label: "Processados" },
  { key: "rejected", label: "Recusados" },
];

const AdminWithdrawals = () => {
  const { adminFetch } = useAdmin();
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; status: string; valor: number } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = () => {
    setLoading(true);
    adminFetch("list_withdrawals").then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") {
      list = list.filter((w) => w.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.user_name.toLowerCase().includes(q) ||
          w.user_email.toLowerCase().includes(q) ||
          w.conta.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, statusFilter, search]);

  const counts = useMemo(() => ({
    all: items.length,
    pendente: items.filter((w) => w.status === "pendente").length,
    processando: items.filter((w) => w.status === "processando").length,
    approved: items.filter((w) => w.status === "approved").length,
    rejected: items.filter((w) => w.status === "rejected").length,
  }), [items]);

  const handleUpdate = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await adminFetch("update_withdrawal_status", { withdrawal_id: confirm.id, status: confirm.status });
      toast.success(`Saque ${confirm.status === "approved" ? "aprovado" : "rejeitado"}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setActionLoading(false);
    setConfirm(null);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Saques</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou conta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-[#13151d] py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.key
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200"
            }`}
          >
            {f.label} <span className="ml-1 opacity-60">({counts[f.key]})</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#13151d] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Usuário</TableHead>
              <TableHead className="text-gray-400">Valor</TableHead>
              <TableHead className="text-gray-400">Método</TableHead>
              <TableHead className="text-gray-400">Conta</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-gray-800"><TableCell colSpan={7} className="text-center text-gray-500 py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="border-gray-800"><TableCell colSpan={7} className="text-center text-gray-500 py-8">{search || statusFilter !== "all" ? "Nenhum resultado" : "Nenhum saque"}</TableCell></TableRow>
            ) : (
              filtered.map((w) => {
                const st = statusMap[w.status] || statusMap.pendente;
                return (
                  <TableRow key={w.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell>
                      <div className="text-sm font-medium">{w.user_name}</div>
                      <div className="text-xs text-gray-500">{w.user_email}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatMZN(w.valor)}
                      <div className="text-[11px] font-normal text-emerald-400">Pagar: {formatMZN(w.valor * 0.85)}</div>
                      <div className="text-[11px] font-normal text-gray-500">Taxa 15%: {formatMZN(w.valor * 0.15)}</div>
                    </TableCell>
                    <TableCell className="text-gray-400 uppercase">{w.metodo}</TableCell>
                    <TableCell className="text-gray-400">{w.conta}</TableCell>
                    <TableCell className="text-gray-400 text-xs">{formatDateTimeMZ(w.created_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.classes}`}>
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {w.status === "pendente" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirm({ id: w.id, status: "approved", valor: w.valor })}
                            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => setConfirm({ id: w.id, status: "rejected", valor: w.valor })}
                            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent className="bg-[#13151d] border-gray-800 text-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja {confirm?.status === "approved" ? "aprovar" : "rejeitar"} o saque de <strong>{formatMZN(confirm?.valor || 0)}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdate}
              disabled={actionLoading}
              className={confirm?.status === "approved" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}
            >
              {actionLoading ? "..." : confirm?.status === "approved" ? "Aprovar" : "Rejeitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminWithdrawals;
