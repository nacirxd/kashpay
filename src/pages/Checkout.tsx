import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { motion } from "framer-motion";
import { ShieldCheck, CreditCard } from "lucide-react";

const Checkout = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const utmSource = searchParams.get("utm_source") || null;
  const utmMedium = searchParams.get("utm_medium") || null;
  const utmCampaign = searchParams.get("utm_campaign") || null;

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setProduct(data);
      setLoading(false);
    });
  }, [id]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setPaying(true);

    const { error } = await supabase.from("sales").insert({
      product_id: product.id,
      user_id: product.user_id,
      valor: product.preco,
      status: "approved",
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    });

    if (error) {
      toast.error("Erro ao processar pagamento.");
    } else {
      setDone(true);
      toast.success("Pagamento aprovado!");
    }
    setPaying(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Produto não encontrado.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <motion.div className="max-w-md text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Compra realizada!</h1>
          <p className="text-muted-foreground">Obrigado pela sua compra de <strong>{product.nome}</strong>.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl border border-border/50 bg-card shadow-card overflow-hidden">
          <div className="bg-primary/5 p-6 border-b border-border/50">
            <h1 className="text-xl font-bold">{product.nome}</h1>
            {product.descricao && <p className="text-sm text-muted-foreground mt-1">{product.descricao}</p>}
            <p className="text-3xl font-bold text-primary mt-4">{formatMZN(Number(product.preco))}</p>
          </div>

          <form onSubmit={handlePurchase} className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={paying}>
              {paying ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <><CreditCard className="mr-2 h-4 w-4" /> Finalizar compra</>
              )}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Pagamento seguro e criptografado
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Checkout;
