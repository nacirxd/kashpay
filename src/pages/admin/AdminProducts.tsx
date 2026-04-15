import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  nome: string;
  preco: number;
  status: string;
  user_id: string;
  created_at: string;
}

const statusMap: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendente", classes: "bg-yellow-500/10 text-yellow-400" },
  approved: { label: "Aprovado", classes: "bg-emerald-500/10 text-emerald-400" },
  rejected: { label: "Rejeitado", classes: "bg-red-500/10 text-red-400" },
};

const AdminProducts = () => {
  const { adminFetch } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; status: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("list_products").then(setProducts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await adminFetch("update_product_status", { product_id: confirm.id, status: confirm.status });
      toast.success(`Produto ${confirm.status === "approved" ? "aprovado" : "rejeitado"}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setActionLoading(false);
    setConfirm(null);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Produtos</h1>
      <div className="rounded-xl border border-gray-800 bg-[#13151d] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Produto</TableHead>
              <TableHead className="text-gray-400">Preço</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-gray-800"><TableCell colSpan={4} className="text-center text-gray-500 py-8">Carregando...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow className="border-gray-800"><TableCell colSpan={4} className="text-center text-gray-500 py-8">Nenhum produto</TableCell></TableRow>
            ) : (
              products.map((p) => {
                const st = statusMap[p.status] || statusMap.pending;
                return (
                  <TableRow key={p.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-gray-400">{formatMZN(p.preco)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.classes}`}>
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {p.status !== "approved" && (
                          <button
                            onClick={() => setConfirm({ id: p.id, status: "approved", name: p.nome })}
                            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            Aprovar
                          </button>
                        )}
                        {p.status !== "rejected" && (
                          <button
                            onClick={() => setConfirm({ id: p.id, status: "rejected", name: p.nome })}
                            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Rejeitar
                          </button>
                        )}
                      </div>
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
              Tem certeza que deseja {confirm?.status === "approved" ? "aprovar" : "rejeitar"} o produto <strong>{confirm?.name}</strong>?
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

export default AdminProducts;
