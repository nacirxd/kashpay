import { useEffect, useState, useMemo } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { formatDateTimeMZ } from "@/lib/timezone";
import { Search, ImageOff, Eye, X, ExternalLink, Download, Pencil, Plus, Trash2 } from "lucide-react";
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

interface BumpEntry {
  product_id: string;
  price: string;
  title: string;
  description: string;
}

interface Product {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  tipo: string;
  delivery_type: string;
  status: string;
  image_url: string | null;
  file_url: string | null;
  external_url: string | null;
  user_id: string;
  seller_name: string;
  seller_email: string;
  created_at: string;
  zenofy_product_id: string | null;
  upsell_url: string | null;
  downsell_url: string | null;
  categoria: string | null;
  currency: string | null;
  payment_methods: string[] | null;
  support_phone: string | null;
  support_email: string | null;
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  webhook_url: string | null;
  order_bumps: any;
  order_bump_product_id: string | null;
  order_bump_price: number | null;
  order_bump_title: string | null;
  order_bump_description: string | null;
}

const PAYMENT_OPTIONS: { key: string; label: string; currency: "MZN" | "AOA" }[] = [
  { key: "zenofy", label: "Zenofy", currency: "MZN" },
  { key: "mpesa", label: "M-Pesa", currency: "MZN" },
  { key: "emola", label: "e-Mola", currency: "MZN" },
  { key: "mcx", label: "Multicaixa Express", currency: "AOA" },
  { key: "ref", label: "Referência", currency: "AOA" },
];

const CATEGORIAS_ADMIN = [
  "Cursos e Educação", "E-books e Livros", "Marketing Digital",
  "Negócios e Empreendedorismo", "Finanças e Investimentos", "Desenvolvimento Pessoal",
  "Saúde e Bem-estar", "Fitness e Esporte", "Beleza e Moda", "Culinária e Receitas",
  "Tecnologia e Programação", "Design e Criatividade", "Fotografia e Vídeo",
  "Música e Áudio", "Idiomas", "Espiritualidade e Religião", "Relacionamentos",
  "Família e Filhos", "Hobbies e Lazer", "Viagens", "Imobiliário", "Direito",
  "Engenharia", "Software e SaaS", "Templates e Ferramentas", "Consultoria e Mentoria",
  "Eventos e Ingressos", "Outro",
];

const emptyEditForm = {
  nome: "",
  descricao: "",
  preco: "",
  categoria: "",
  currency: "MZN",
  status: "approved",
  delivery_type: "link",
  payment_methods: [] as string[],
  external_url: "",
  file_url: "",
  image_url: "",
  upsell_url: "",
  downsell_url: "",
  support_phone: "",
  support_email: "",
  meta_pixel_id: "",
  meta_access_token: "",
  webhook_url: "",
  zenofy_product_id: "",
  order_bumps: [] as BumpEntry[],
};

const statusMap: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendente", classes: "bg-yellow-500/10 text-yellow-400" },
  approved: { label: "Aprovado", classes: "bg-emerald-500/10 text-emerald-400" },
  rejected: { label: "Rejeitado", classes: "bg-red-500/10 text-red-400" },
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const filterButtons: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "approved", label: "Aprovados" },
  { key: "rejected", label: "Rejeitados" },
];

const AdminProducts = () => {
  const { adminFetch } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ id: string; status: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [zenofyDraft, setZenofyDraft] = useState("");
  const [zenofySaving, setZenofySaving] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyEditForm });
  const [editSaving, setEditSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("list_products").then(setProducts).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.seller_name.toLowerCase().includes(q) ||
          p.seller_email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, statusFilter, search]);

  const counts = useMemo(() => ({
    all: products.length,
    pending: products.filter((p) => p.status === "pending").length,
    approved: products.filter((p) => p.status === "approved").length,
    rejected: products.filter((p) => p.status === "rejected").length,
  }), [products]);

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

  const handleSaveZenofyId = async () => {
    if (!viewProduct) return;
    setZenofySaving(true);
    try {
      await adminFetch("update_product_zenofy_id", { product_id: viewProduct.id, zenofy_product_id: zenofyDraft });
      toast.success("ID Zenofy atualizado");
      setViewProduct({ ...viewProduct, zenofy_product_id: zenofyDraft || null });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setZenofySaving(false);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    const rawBumps = Array.isArray(p.order_bumps) ? p.order_bumps : [];
    let bumps: BumpEntry[] = rawBumps
      .filter((b: any) => b && typeof b.product_id === "string" && b.product_id)
      .map((b: any) => ({
        product_id: b.product_id,
        price: b.price != null ? String(b.price) : "",
        title: String(b.title || ""),
        description: String(b.description || ""),
      }));
    if (bumps.length === 0 && p.order_bump_product_id) {
      bumps = [{
        product_id: p.order_bump_product_id,
        price: p.order_bump_price != null ? String(p.order_bump_price) : "",
        title: p.order_bump_title || "",
        description: p.order_bump_description || "",
      }];
    }
    setEditForm({
      nome: p.nome,
      descricao: p.descricao || "",
      preco: String(p.preco),
      categoria: p.categoria || "",
      currency: p.currency || "MZN",
      status: p.status || "approved",
      delivery_type: p.delivery_type || "link",
      payment_methods: Array.isArray(p.payment_methods) ? p.payment_methods : [],
      external_url: p.external_url || "",
      file_url: p.file_url || "",
      image_url: p.image_url || "",
      upsell_url: p.upsell_url || "",
      downsell_url: p.downsell_url || "",
      support_phone: p.support_phone || "",
      support_email: p.support_email || "",
      meta_pixel_id: p.meta_pixel_id || "",
      meta_access_token: p.meta_access_token || "",
      webhook_url: p.webhook_url || "",
      zenofy_product_id: p.zenofy_product_id || "",
      order_bumps: bumps,
    });
  };

  const togglePaymentMethod = (key: string) => {
    setEditForm((f) => ({
      ...f,
      payment_methods: f.payment_methods.includes(key)
        ? f.payment_methods.filter((m) => m !== key)
        : [...f.payment_methods, key],
    }));
  };

  const updateBump = (idx: number, patch: Partial<BumpEntry>) => {
    setEditForm((f) => ({
      ...f,
      order_bumps: f.order_bumps.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));
  };

  const bumpCandidates = useMemo(() => {
    if (!editProduct) return [];
    return products.filter(
      (p) => p.id !== editProduct.id && p.user_id === editProduct.user_id && (p.currency || "MZN") === editForm.currency
    );
  }, [products, editProduct, editForm.currency]);

  const handleSaveEdit = async () => {
    if (!editProduct) return;
    if (!editForm.nome.trim()) { toast.error("O nome não pode ficar vazio"); return; }
    const preco = Number(editForm.preco);
    if (!Number.isFinite(preco) || preco <= 0) { toast.error("Preço inválido"); return; }
    if (editForm.payment_methods.length === 0) { toast.error("Escolha pelo menos um método de pagamento"); return; }
    if (editForm.order_bumps.some((b) => !b.product_id)) { toast.error("Escolha o produto de cada oferta extra"); return; }
    if (editForm.order_bumps.some((b) => b.price !== "" && (!Number.isFinite(Number(b.price)) || Number(b.price) < 0))) {
      toast.error("Preço de oferta extra inválido"); return;
    }
    setEditSaving(true);
    try {
      await adminFetch("update_product", {
        product_id: editProduct.id,
        nome: editForm.nome,
        descricao: editForm.descricao,
        preco,
        categoria: editForm.categoria,
        currency: editForm.currency,
        status: editForm.status,
        delivery_type: editForm.delivery_type,
        payment_methods: editForm.payment_methods,
        external_url: editForm.external_url,
        file_url: editForm.file_url,
        image_url: editForm.image_url,
        upsell_url: editForm.upsell_url,
        downsell_url: editForm.downsell_url,
        support_phone: editForm.support_phone,
        support_email: editForm.support_email,
        meta_pixel_id: editForm.meta_pixel_id,
        meta_access_token: editForm.meta_access_token,
        webhook_url: editForm.webhook_url,
        zenofy_product_id: editForm.zenofy_product_id,
        order_bumps: editForm.order_bumps.map((b) => ({
          product_id: b.product_id,
          price: b.price === "" ? null : Number(b.price),
          title: b.title,
          description: b.description,
        })),
      });
      toast.success("Produto atualizado");
      setEditProduct(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setEditSaving(false);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Produtos</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Pesquisar por nome do produto ou vendedor..."
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
              <TableHead className="text-gray-400 w-10"></TableHead>
              <TableHead className="text-gray-400 w-14"></TableHead>
              <TableHead className="text-gray-400">Produto</TableHead>
              <TableHead className="text-gray-400">Vendedor</TableHead>
              <TableHead className="text-gray-400">Preço</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-gray-800"><TableCell colSpan={8} className="text-center text-gray-500 py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="border-gray-800"><TableCell colSpan={8} className="text-center text-gray-500 py-8">{search || statusFilter !== "all" ? "Nenhum resultado" : "Nenhum produto"}</TableCell></TableRow>
            ) : (
              filtered.map((p) => {
                const st = statusMap[p.status] || statusMap.pending;
                const isExpanded = expanded === p.id;
                return (
                  <>
                    <TableRow key={p.id} className="border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : p.id)}>
                      <TableCell className="pr-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setZenofyDraft(p.zenofy_product_id || ""); setViewProduct(p); }}
                          className="rounded-lg p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
                          title="Ver material"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </TableCell>
                      <TableCell className="pr-0">
                        <div className="h-10 w-10 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                         {getImageUrl(p.image_url) ? (
                            <img src={getImageUrl(p.image_url)!} alt={p.nome} className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.nome}</div>
                        <div className="text-xs text-gray-500 capitalize">{p.tipo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{p.seller_name}</div>
                        <div className="text-xs text-gray-500">{p.seller_email}</div>
                      </TableCell>
                      <TableCell className="text-gray-400">{formatMZN(p.preco)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.classes}`}>
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">{formatDateTimeMZ(p.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" /> Editar
                          </button>
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
                    {isExpanded && (
                      <TableRow key={`${p.id}-detail`} className="border-gray-800 bg-gray-900/50">
                        <TableCell colSpan={8}>
                          <div className="flex gap-4 py-2 text-sm">
                            {getImageUrl(p.image_url) && (
                              <img src={getImageUrl(p.image_url)!} alt={p.nome} className="h-24 w-24 rounded-lg object-cover shrink-0" />
                            )}
                            <div className="grid grid-cols-2 gap-4 flex-1">
                              <div>
                                <span className="text-gray-500">Descrição:</span>
                                <p className="text-gray-300 mt-1">{p.descricao || "Sem descrição"}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Entrega:</span>
                                <p className="text-gray-300 mt-1 capitalize">{p.delivery_type}</p>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Product detail modal */}
      {viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setViewProduct(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#13151d] p-6 mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Material do Produto</h2>
              <button onClick={() => setViewProduct(null)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {getImageUrl(viewProduct.image_url) && (
              <img src={getImageUrl(viewProduct.image_url)!} alt={viewProduct.nome} className="w-full h-48 object-cover rounded-lg mb-4" />
            )}

            <h3 className="font-semibold text-lg mb-1">{viewProduct.nome}</h3>
            <p className="text-sm text-gray-400 mb-4">{viewProduct.descricao || "Sem descrição"}</p>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between"><span className="text-gray-500">Preço</span><span>{formatMZN(viewProduct.preco)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tipo</span><span className="capitalize">{viewProduct.tipo}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Entrega</span><span className="capitalize">{viewProduct.delivery_type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Vendedor</span><span>{viewProduct.seller_name}</span></div>
            </div>

            <div className="border-t border-gray-800 pt-4 mb-5">
              <p className="text-xs text-gray-500 font-medium mb-2">ID do produto na Zenofy</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zenofyDraft}
                  onChange={(e) => setZenofyDraft(e.target.value)}
                  placeholder="Ex: 6aa81323ce0a54a1d60b0f37"
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={handleSaveZenofyId}
                  disabled={zenofySaving}
                  className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {zenofySaving ? "..." : "Salvar"}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-xs text-gray-500 font-medium">Material / Entrega</p>
              {viewProduct.file_url && (
                <a
                  href={viewProduct.file_url.startsWith("http") ? viewProduct.file_url : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-files/${viewProduct.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-sm text-emerald-400 hover:bg-gray-800 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Baixar arquivo do produto
                </a>
              )}
              {viewProduct.external_url && (
                <a
                  href={viewProduct.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-sm text-blue-400 hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  {viewProduct.external_url}
                </a>
              )}
              {!viewProduct.file_url && !viewProduct.external_url && (
                <p className="text-gray-500 text-sm">Nenhum material configurado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit product modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8" onClick={() => setEditProduct(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-[#13151d] p-6 mx-4 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Editar Produto</h2>
              <button onClick={() => setEditProduct(null)} className="text-gray-500 hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">Nome</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Descrição</label>
                <textarea
                  value={editForm.descricao}
                  onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Preço</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={editForm.preco}
                    onChange={(e) => setEditForm({ ...editForm, preco: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Moeda</label>
                  <select
                    value={editForm.currency}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className={inputCls}
                  >
                    <option value="MZN">MZN — Moçambique</option>
                    <option value="AOA">AOA — Angola</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Categoria</label>
                  <select
                    value={editForm.categoria}
                    onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Sem categoria</option>
                    {CATEGORIAS_ADMIN.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="approved">Aprovado</option>
                    <option value="pending">Pendente</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Métodos de pagamento</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.filter((o) => o.currency === editForm.currency).map((o) => {
                    const on = editForm.payment_methods.includes(o.key);
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => togglePaymentMethod(o.key)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                          on ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Tipo de entrega</label>
                  <select
                    value={editForm.delivery_type}
                    onChange={(e) => setEditForm({ ...editForm, delivery_type: e.target.value })}
                    className={inputCls}
                  >
                    <option value="link">Link de acesso</option>
                    <option value="file">Arquivo para download</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Imagem (caminho ou URL)</label>
                  <input
                    type="text"
                    value={editForm.image_url}
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">Link de entrega (URL externa)</label>
                <input
                  type="url"
                  value={editForm.external_url}
                  onChange={(e) => setEditForm({ ...editForm, external_url: e.target.value })}
                  placeholder="https://..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Arquivo de entrega (caminho no armazenamento)</label>
                <input
                  type="text"
                  value={editForm.file_url}
                  onChange={(e) => setEditForm({ ...editForm, file_url: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">WhatsApp de suporte</label>
                  <input
                    type="text"
                    value={editForm.support_phone}
                    onChange={(e) => setEditForm({ ...editForm, support_phone: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Email de suporte</label>
                  <input
                    type="email"
                    value={editForm.support_email}
                    onChange={(e) => setEditForm({ ...editForm, support_email: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Pixel do Facebook</label>
                  <input
                    type="text"
                    value={editForm.meta_pixel_id}
                    onChange={(e) => setEditForm({ ...editForm, meta_pixel_id: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Token do Facebook</label>
                  <input
                    type="text"
                    value={editForm.meta_access_token}
                    onChange={(e) => setEditForm({ ...editForm, meta_access_token: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Webhook do produto</label>
                  <input
                    type="url"
                    value={editForm.webhook_url}
                    onChange={(e) => setEditForm({ ...editForm, webhook_url: e.target.value })}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">ID Zenofy</label>
                  <input
                    type="text"
                    value={editForm.zenofy_product_id}
                    onChange={(e) => setEditForm({ ...editForm, zenofy_product_id: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium">Link de upsell</label>
                  <input
                    type="url"
                    value={editForm.upsell_url}
                    onChange={(e) => setEditForm({ ...editForm, upsell_url: e.target.value })}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium">Link de downsell</label>
                  <input
                    type="url"
                    value={editForm.downsell_url}
                    onChange={(e) => setEditForm({ ...editForm, downsell_url: e.target.value })}
                    placeholder="https://..."
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 font-medium">Ofertas extra no checkout</label>
                  <button
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, order_bumps: [...f.order_bumps, { product_id: "", price: "", title: "", description: "" }] }))}
                    className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </button>
                </div>
                {editForm.order_bumps.length === 0 && (
                  <p className="text-xs text-gray-600">Nenhuma oferta extra.</p>
                )}
                <div className="space-y-3">
                  {editForm.order_bumps.map((b, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-700 p-3 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={b.product_id}
                          onChange={(e) => updateBump(idx, { product_id: e.target.value })}
                          className={`${inputCls} mt-0 flex-1`}
                        >
                          <option value="">Escolher produto...</option>
                          {bumpCandidates.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, order_bumps: f.order_bumps.filter((_, i) => i !== idx) }))}
                          className="rounded-lg bg-red-500/10 px-2 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={b.price}
                          onChange={(e) => updateBump(idx, { price: e.target.value })}
                          placeholder="Preço promocional"
                          className={`${inputCls} mt-0`}
                        />
                        <input
                          type="text"
                          value={b.title}
                          onChange={(e) => updateBump(idx, { title: e.target.value })}
                          placeholder="Título"
                          className={`${inputCls} mt-0`}
                        />
                      </div>
                      <input
                        type="text"
                        value={b.description}
                        onChange={(e) => updateBump(idx, { description: e.target.value })}
                        placeholder="Descrição"
                        className={`${inputCls} mt-0`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>


            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditProduct(null)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {editSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
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
