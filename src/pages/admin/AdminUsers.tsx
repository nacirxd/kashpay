import { useEffect, useState, useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { formatDateTimeMZ } from "@/lib/timezone";
import { formatMZN } from "@/lib/currency";
import { Eye, X, Search, Trophy, ShoppingCart, DollarSign, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  mpesa_nome: string | null;
  mpesa_telefone: string | null;
  emola_nome: string | null;
  emola_telefone: string | null;
  banco_nome: string | null;
  banco_conta: string | null;
}

interface UserDetails {
  total_revenue: number;
  total_sales: number;
  top_product: { nome: string; preco: number; sales_count: number } | null;
  rank: number | null;
  total_sellers: number;
}

const AdminUsers = () => {
  const { adminFetch } = useAdmin();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ user_id: string; status: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewUser, setViewUser] = useState<Profile | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    adminFetch("list_users").then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users.filter(
      (u) =>
        (u.nome || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.telefone || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleViewUser = async (u: Profile) => {
    setViewUser(u);
    setUserDetails(null);
    setDetailsLoading(true);
    try {
      const details = await adminFetch("user_details", { user_id: u.user_id });
      setUserDetails(details);
    } catch {
      // ignore
    }
    setDetailsLoading(false);
  };

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

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase() || "U";
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Usuários</h1>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-[#13151d] py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#13151d] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400 w-10"></TableHead>
              <TableHead className="text-gray-400">Usuário</TableHead>
              <TableHead className="text-gray-400">Email</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-gray-800"><TableCell colSpan={5} className="text-center text-gray-500 py-8">Carregando...</TableCell></TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow className="border-gray-800"><TableCell colSpan={5} className="text-center text-gray-500 py-8">{search ? "Nenhum resultado encontrado" : "Nenhum usuário"}</TableCell></TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.user_id} className="border-gray-800 hover:bg-gray-800/50">
                  <TableCell className="pr-0">
                    <button
                      onClick={() => handleViewUser(u)}
                      className="rounded-lg p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold uppercase overflow-hidden shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.nome} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-gray-300">{initials(u.nome || u.email)}</span>
                        )}
                      </div>
                      <span className="font-medium">{u.nome || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400">{u.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : u.status === "pending"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                    }`}>
                      {u.status === "active" ? "Ativo" : u.status === "pending" ? "Aguardando aprovação" : "Banido"}
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
                    ) : u.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirm({ user_id: u.user_id, status: "active", name: u.nome || u.email })}
                          className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => setConfirm({ user_id: u.user_id, status: "banned", name: u.nome || u.email })}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          Rejeitar
                        </button>
                      </div>
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

      {/* User detail modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setViewUser(null)}>
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#13151d] p-6 mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Detalhes do Usuário</h2>
              <button onClick={() => setViewUser(null)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold uppercase overflow-hidden shrink-0">
                {viewUser.avatar_url ? (
                  <img src={viewUser.avatar_url} alt={viewUser.nome} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gray-300">{initials(viewUser.nome || viewUser.email)}</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">{viewUser.nome || "—"}</p>
                <p className="text-sm text-gray-400">{viewUser.email}</p>
              </div>
            </div>

            {/* Sales stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-center">
                <DollarSign className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Receita</p>
                <p className="font-semibold text-sm text-emerald-400">
                  {detailsLoading ? "..." : formatMZN(userDetails?.total_revenue || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-center">
                <ShoppingCart className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Vendas</p>
                <p className="font-semibold text-sm">
                  {detailsLoading ? "..." : userDetails?.total_sales || 0}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-center">
                <Trophy className="h-4 w-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Ranking</p>
                <p className="font-semibold text-sm">
                  {detailsLoading ? "..." : userDetails?.rank ? `#${userDetails.rank}/${userDetails.total_sellers}` : "—"}
                </p>
              </div>
            </div>

            {/* Top product */}
            {!detailsLoading && userDetails?.top_product && (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-gray-500 font-medium">Produto mais vendido</span>
                </div>
                <p className="font-medium text-sm">{userDetails.top_product.nome}</p>
                <p className="text-xs text-gray-400">
                  {formatMZN(userDetails.top_product.preco)} · {userDetails.top_product.sales_count} venda{userDetails.top_product.sales_count !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <InfoRow label="Status" value={
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  viewUser.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : viewUser.status === "pending"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {viewUser.status === "active" ? "Ativo" : viewUser.status === "pending" ? "Aguardando aprovação" : "Banido"}
                </span>
              } />
              <InfoRow label="Telefone" value={viewUser.telefone || "—"} />
              <InfoRow label="Registrado em" value={formatDateTimeMZ(viewUser.created_at)} />

              {(viewUser.mpesa_nome || viewUser.mpesa_telefone) && (
                <>
                  <div className="border-t border-gray-800 pt-3 mt-3">
                    <p className="text-xs text-gray-500 font-medium mb-2">M-PESA</p>
                  </div>
                  <InfoRow label="Nome" value={viewUser.mpesa_nome || "—"} />
                  <InfoRow label="Telefone" value={viewUser.mpesa_telefone || "—"} />
                </>
              )}

              {(viewUser.emola_nome || viewUser.emola_telefone) && (
                <>
                  <div className="border-t border-gray-800 pt-3 mt-3">
                    <p className="text-xs text-gray-500 font-medium mb-2">e-Mola</p>
                  </div>
                  <InfoRow label="Nome" value={viewUser.emola_nome || "—"} />
                  <InfoRow label="Telefone" value={viewUser.emola_telefone || "—"} />
                </>
              )}

              {(viewUser.banco_nome || viewUser.banco_conta) && (
                <>
                  <div className="border-t border-gray-800 pt-3 mt-3">
                    <p className="text-xs text-gray-500 font-medium mb-2">Banco</p>
                  </div>
                  <InfoRow label="Banco" value={viewUser.banco_nome || "—"} />
                  <InfoRow label="Conta" value={viewUser.banco_conta || "—"} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-200">{value}</span>
  </div>
);

export default AdminUsers;
