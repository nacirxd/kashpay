import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Pencil, Trash2, Copy, Package } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Products = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = () => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setProducts(data || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchProducts(); }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", user!.id);
    if (error) toast.error(error.message);
    else { toast.success("Produto excluído!"); fetchProducts(); }
  };

  const copyCheckoutLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/checkout/${id}`);
    toast.success("Link copiado!");
  };

  const getProductImageUrl = (imagePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${imagePath}`;
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Produtos</h1>
        <Button onClick={() => navigate("/produtos/novo")}>
          <Plus className="mr-2 h-4 w-4" /> Novo produto
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum produto criado ainda.</p>
          <Button className="mt-4" onClick={() => navigate("/produtos/novo")}>Criar primeiro produto</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              className="rounded-2xl border border-border/50 bg-card p-5 shadow-soft transition-shadow hover:shadow-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-start gap-4">
                {p.image_url ? (
                  <img
                    src={getProductImageUrl(p.image_url)}
                    alt={p.nome}
                    className="h-20 w-20 shrink-0 rounded-2xl border border-border/50 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-muted text-muted-foreground">
                    <Package className="h-5 w-5" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold mb-1">{p.nome}</h3>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{p.descricao || "Sem descrição"}</p>
                  <p className="text-xl font-bold text-primary">{formatMZN(Number(p.preco))}</p>
                </div>
              </div>

              <div className="mt-5 flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => navigate(`/produtos/${p.id}`)}>
                  <Pencil className="mr-1 h-3 w-3" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyCheckoutLink(p.id)}>
                  <Copy className="mr-1 h-3 w-3" /> Link
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`/checkout/${p.id}`, "_blank")}>
                  <ExternalLink className="mr-1 h-3 w-3" /> Checkout
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Products;
