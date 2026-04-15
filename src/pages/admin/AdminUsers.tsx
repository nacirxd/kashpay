import { useEffect, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  user_id: string;
  nome: string;
  email: string;
  status: string;
  created_at: string;
}

const AdminUsers = () => {
  const { adminFetch } = useAdmin();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ user_id: string; status: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("list_users").then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      await adminFetch("update_user_status", { user_id: confirm.user_id, status: confirm.status });
      toast.success(`Usuário ${confirm.status === "banned" ? "banido" : "ativado"} com sucesso`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setActionLoading(false);
    setConfirm(null);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Usuários</h1>
      <div className="rounded-xl border border-gray-800 bg-[#13151d] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Nome</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-gray-800"><TableCell colSpan={4} className="text-center text-gray-500 py-8">Carregando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow className="border-gray-800"><TableCell colSpan={4} className="text-center text-gray-500 py-8">Nenhum usuário</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.user_id} className="border-gray-800 hover:bg-gray-800/50">
                  <TableCell className="font-medium">{u.nome || "—"}</TableCell>
                  <TableCell className="text-gray-400">{u.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {u.status === "active" ? "Ativo" : "Banido"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.status === "active" ? (
                      <button
                        onClick={() => setConfirm({ user_id: u.user_id, status: "banned", name: u.nome || u.email })}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Banir
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirm({ user_id: u.user_id, status: "active", name: u.nome || u.email })}
                        className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        Ativar
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent className="bg-[#13151d] border-gray-800 text-gray-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja {confirm?.status === "banned" ? "banir" : "ativar"} o usuário <strong>{confirm?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={actionLoading}
              className={confirm?.status === "banned" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}
            >
              {actionLoading ? "..." : confirm?.status === "banned" ? "Banir" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUsers;
