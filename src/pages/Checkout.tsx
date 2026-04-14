import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle, Smartphone } from "lucide-react";

const Checkout = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"mpesa" | "emola">("mpesa");
  const [countdown, setCountdown] = useState(10 * 60);

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

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = useCallback((s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `00:${m}:${sec}`;
  }, []);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!name || !email || !phone) {
      toast.error("Por favor preencha todos os campos.");
      return;
    }

    const validMpesa = /^8[45]/.test(phone);
    const validEmola = /^8[67]/.test(phone);
    if ((method === "mpesa" && !validMpesa) || (method === "emola" && !validEmola)) {
      toast.error("Use número correto para o método selecionado.");
      return;
    }

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
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Produto não encontrado.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <motion.div className="max-w-md text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Compra realizada!</h1>
          <p className="text-muted-foreground">Obrigado pela sua compra de <strong>{product.nome}</strong>.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Urgency bar */}
      <div className="bg-destructive text-destructive-foreground text-center py-2.5 text-sm font-bold tracking-wide">
        Oferta expira em <span className="font-mono">{formatTime(countdown)}</span>
      </div>

      <div className="flex justify-center px-4 py-8">
        <motion.div className="w-full max-w-[420px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-border/50 bg-card shadow-card overflow-hidden">
            {/* Secure badge + flag */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                COMPRA 100% SEGURA
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <img src="https://flagcdn.com/w40/mz.png" alt="MZ" className="h-3.5 w-5 rounded-sm object-cover" />
                Moçambique
              </span>
            </div>

            {/* Product info */}
            <div className="flex items-center gap-3 px-5 pb-4 border-b border-border/50">
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base truncate">{product.nome}</p>
                {product.descricao && <p className="text-xs text-muted-foreground truncate">{product.descricao}</p>}
                <p className="text-lg font-bold text-primary mt-0.5">{formatMZN(Number(product.preco))}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePurchase} className="p-5 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nome completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label className="text-sm">Método de pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("mpesa")}
                    className={`py-3 rounded-lg border-2 text-sm font-bold transition-all ${
                      method === "mpesa"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    📱 M-Pesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("emola")}
                    className={`py-3 rounded-lg border-2 text-sm font-bold transition-all ${
                      method === "emola"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    📲 e-Mola
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Número de pagamento</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder={method === "mpesa" ? "84/85xxxxxxx" : "86/87xxxxxxx"}
                />
              </div>

              {/* Order summary */}
              <div className="flex items-center justify-between py-3 border-t border-border/50 mt-2">
                <span className="text-sm font-medium text-muted-foreground">{product.nome}</span>
                <span className="text-sm font-bold">{formatMZN(Number(product.preco))}</span>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={paying}>
                {paying ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  "Comprar agora"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground pt-1">
                🔒 Pagamento seguro e criptografado
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
