import { useEffect, useState, useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { formatDateTimeMZ } from "@/lib/timezone";
import { Search, ImageOff } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STORAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/`;

function getImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return STORAGE_URL + url;
}

interface Order {
  id: string;
  user_id: string;
  product_id: string;
  valor: number;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_whatsapp: string | null;
  payment_method: string | null;
  payment_phone: string | null;
  created_at: string;
  seller_name: string;
  seller_email: string;
  product_name: string;
  product_image: string | null;
}

const statusMap: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendente", classes: "bg-yellow-500/10 text-yellow-400" },
  approved: { label: "Pago", classes: "bg-emerald-500/10 text-emerald-400" },
  rejected: { label: "Não Pago", classes: "bg-red-500/10 text-red-400" },
  failed: { label: "Falhou", classes: "bg-red-500/10 text-red-400" },
  processing: { label: "Processando", classes: "bg-blue-500/10 text-blue-400" },
};

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "failed";

const filterButtons: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "approved", label: "Pagos" },
  { key: "rejected", label: "Não Pagos" },
  { key: "failed", label: "Falhados" },
];

const AdminOrders = () => {
  const { adminFetch } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; status: string; buyer: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = () => {
    setLoading(true);
    adminFetch("list_orders").then(setOrders).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          (o.buyer_name || "").toLowerCase().includes(q) ||
          (o.buyer_email || "").toLowerCase().includes(q) ||
          o.product_name.toLowerCase().includes(q) ||
          o.seller_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    approved: orders.filter((o) => o.status === "approved").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
    failed: orders.filter((o) => o.status === "failed").length,
  }), [orders]);

  const handleUpdate = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await adminFetch("update_order_status", { order_id: confirm.id, status: confirm.status });
      toast.success(`Pedido marcado como ${confirm.status === "approved" ? "pago" : "não pago"}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setActionLoading(false);
    setConfirm(null);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Pesquisar por comprador, produto ou vendedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-[#13151d] py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

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
              <TableHead className="text-gray-400 w-14"></TableHead>
              <TableHead className="text-gray-400">Produto</TableHead>
              <TableHead className="text-gray-400">Comprador</TableHead>
              <TableHead className="text-gray-400">Vendedor</TableHead>
              <TableHead className="text-gray-400">Valor</TableHead>
              <TableHead className="text-gray-400">Pagamento</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-gray-800"><TableCell colSpan={9} className="text-center text-gray-500 py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="border-gray-800"><TableCell colSpan={9} className="text-center text-gray-500 py-8">{search || statusFilter !== "all" ? "Nenhum resultado" : "Nenhum pedido"}</TableCell></TableRow>
            ) : (
              filtered.map((o) => {
                const st = statusMap[o.status] || statusMap.pending;
                return (
                  <TableRow key={o.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="pr-0">
                      <div className="h-10 w-10 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                        {getImageUrl(o.product_image) ? (
                          <img src={getImageUrl(o.product_image)!} alt={o.product_name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{o.product_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{o.buyer_name || "—"}</div>
                      <div className="text-xs text-gray-500">{o.buyer_email || o.buyer_whatsapp || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{o.seller_name}</div>
                      <div className="text-xs text-gray-500">{o.seller_email}</div>
                    </TableCell>
                    <TableCell className="font-medium">{formatMZN(o.valor)}</TableCell>
                    <TableCell className="text-gray-400 text-xs uppercase">
                      {o.payment_method || "—"}
                      {o.payment_phone && <div className="text-gray-500">{o.payment_phone}</div>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.classes}`}>
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">{formatDateTimeMZ(o.created_at)}</TableCell>
                    <TableCell>
                      {(o.status === "pending" || o.status === "failed" || o.status === "processing" || o.status === "rejected") && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirm({ id: o.id, status: "approved", buyer: o.buyer_name || "comprador" })}
                            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            Pago
                          </button>
                          {o.status !== "rejected" && (
                          <button
                            onClick={() => setConfirm({ id: o.id, status: "rejected", buyer: o.buyer_name || "comprador" })}
                            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Não Pago
                          </button>
                          )}
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

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="bg-[#13151d] border-gray-800 text-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja marcar o pedido de <strong>{confirm?.buyer}</strong> como {confirm?.status === "approved" ? "pago" : "não pago"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdate}
              disabled={actionLoading}
              className={confirm?.status === "approved" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}
            >
              {actionLoading ? "..." : confirm?.status === "approved" ? "Marcar Pago" : "Marcar Não Pago"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminOrders;
