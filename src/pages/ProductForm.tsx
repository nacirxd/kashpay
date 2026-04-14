import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

const ProductForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    if (isEditing && user) {
      supabase.from("products").select("*").eq("id", id).eq("user_id", user.id).single().then(({ data, error }) => {
        if (data) {
          setNome(data.nome);
          setDescricao(data.descricao || "");
          setPreco(String(data.preco));
        } else {
          toast.error("Produto não encontrado");
          navigate("/produtos");
        }
        setFetching(false);
      });
    }
  }, [id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    if (isEditing) {
      const { error } = await supabase.from("products").update({ nome, descricao, preco: parseFloat(preco) }).eq("id", id).eq("user_id", user.id);
      if (error) toast.error(error.message);
      else { toast.success("Produto atualizado!"); navigate("/produtos"); }
    } else {
      const { error } = await supabase.from("products").insert({ user_id: user.id, nome, descricao, preco: parseFloat(preco) });
      if (error) toast.error(error.message);
      else { toast.success("Produto criado!"); navigate("/produtos"); }
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button onClick={() => navigate("/produtos")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <h1 className="text-lg font-semibold">{isEditing ? "Editar produto" : "Novo produto"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do produto</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: Curso de Marketing Digital" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva seu produto..." rows={4} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco">Preço (R$)</Label>
          <Input id="preco" type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} required placeholder="97.00" />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><Save className="mr-2 h-4 w-4" /> {isEditing ? "Salvar" : "Criar produto"}</>}
        </Button>
      </form>

      {isEditing && (
        <div className="mt-8 rounded-xl border border-border/50 bg-card p-6">
          <h3 className="text-sm font-semibold mb-2">Link de checkout</h3>
          <p className="text-sm text-muted-foreground break-all">{window.location.origin}/checkout/{id}</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProductForm;
