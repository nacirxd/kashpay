import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { getStoredUTMs, captureUTMs } from "@/lib/utm";
import { loadMetaPixel, trackEvent } from "@/lib/metaPixel";
import { loadGTM, pushDataLayer } from "@/lib/gtm";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle, Smartphone, Download, ExternalLink, Lock } from "lucide-react";
import mpesaLogo from "@/assets/mpesa.svg";
import emolaLogo from "@/assets/emola.svg";

const Checkout = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [payPhone, setPayPhone] = useState("");
  const [method, setMethod] = useState<"mpesa" | "emola" | null>(null);
  const [countdown, setCountdown] = useState(10 * 60);

  useEffect(() => {
    captureUTMs();
  }, []);

  const utms = getStoredUTMs();

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        setProduct(data);
        // Load seller integrations (Meta Pixel + GTM)
        supabase.from("integrations")
          .select("tipo, config")
          .eq("user_id", data.user_id)
          .eq("ativo", true)
          .in("tipo", ["meta_ads", "gtm"])
          .then(({ data: integrations }) => {
            integrations?.forEach((int) => {
              const cfg = int.config as any;
              if (int.tipo === "meta_ads" && cfg?.pixel_id) {
                loadMetaPixel(cfg.pixel_id);
                trackEvent('ViewContent', {
                  content_name: data.nome,
                  content_ids: [data.id],
                  content_type: 'product',
                  value: Number(data.preco),
                  currency: 'MZN',
                });
              }
              if (int.tipo === "gtm" && cfg?.container_id) {
                loadGTM(cfg.container_id);
                pushDataLayer('view_item', {
                  item_name: data.nome,
                  item_id: data.id,
                  price: Number(data.preco),
                  currency: 'MZN',
                });
              }
            });
          });
      }
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

    if (!name || !email) {
      toast.error("Por favor preencha nome e email.");
      return;
    }

    if (!method) {
      toast.error("Selecione um método de pagamento.");
      return;
    }

    if (!payPhone) {
      toast.error("Informe o número de pagamento.");
      return;
    }

    const validMpesa = /^8[45]/.test(payPhone);
    const validEmola = /^8[67]/.test(payPhone);
    if ((method === "mpesa" && !validMpesa) || (method === "emola" && !validEmola)) {
      toast.error("Use número correto para o método selecionado.");
      return;
    }

    setPaying(true);

    // Fire InitiateCheckout events
    trackEvent('InitiateCheckout', {
      content_name: product.nome,
      content_ids: [product.id],
      value: Number(product.preco),
      currency: 'MZN',
    });
    pushDataLayer('begin_checkout', {
      item_name: product.nome,
      item_id: product.id,
      price: Number(product.preco),
      currency: 'MZN',
      payment_method: method,
    });
    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          method,
          phone: payPhone,
          name,
          email,
          whatsapp: whatsapp || undefined,
          amount: product.preco,
          reference: "moonpay",
          product_id: product.id,
          user_id: product.user_id,
          ...utms,
        },
      });

      if (error) {
        toast.error("Erro ao processar pagamento. Tente novamente.");
      } else if (data?.status === "approved") {
        trackEvent('Purchase', {
          content_name: product.nome,
          content_ids: [product.id],
          value: Number(product.preco),
          currency: 'MZN',
        });
        setDone(true);
        toast.success("Pagamento aprovado!");
      } else if (data?.status === "pending") {
        toast.info("Pedido enviado. Confirme o pagamento no seu telefone.");
      } else {
        toast.error("Não foi possível iniciar o pagamento.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
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
    const deliveryType = product.delivery_type || "link";

    const handleDownload = async () => {
      if (!product.file_url) return;
      const { data } = await supabase.storage
        .from("product-files")
        .createSignedUrl(product.file_url, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      else toast.error("Erro ao gerar link de download.");
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <motion.div className="max-w-md text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Compra realizada!</h1>
          <p className="text-muted-foreground mb-6">
            Obrigado pela sua compra de <strong>{product.nome}</strong>.
          </p>

          {deliveryType === "file" && product.file_url && (
            <Button onClick={handleDownload} size="lg" className="gap-2">
              <Download className="h-5 w-5" /> Baixar arquivo
            </Button>
          )}

          {deliveryType === "link" && product.external_url && (
            <Button asChild size="lg" className="gap-2">
              <a href={product.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5" /> Acessar conteúdo
              </a>
            </Button>
          )}

          {deliveryType === "members" && (
            <div className="rounded-lg border border-border bg-card p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Área de Membros</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Seu acesso foi liberado. Verifique seu email para instruções.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-destructive text-destructive-foreground text-center py-2.5 text-sm font-bold tracking-wide">
        Oferta expira em <span className="font-mono">{formatTime(countdown)}</span>
      </div>

      <div className="flex justify-center px-4 py-8">
        <motion.div className="w-full max-w-[420px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-border/50 bg-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Compra segura
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <img src="https://flagcdn.com/w40/mz.png" alt="MZ" className="h-3.5 w-5 rounded-sm object-cover" />
                Moçambique
              </span>
            </div>

            <div className="flex items-center gap-3 px-5 pb-4 border-b border-border/50">
              {product.image_url ? (
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${product.image_url}`}
                  alt={product.nome}
                  className="h-14 w-14 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-base truncate">{product.nome}</p>
                {product.descricao && <p className="text-xs text-muted-foreground truncate">{product.descricao}</p>}
                <p className="text-lg font-bold text-primary mt-0.5">{formatMZN(Number(product.preco))}</p>
              </div>
            </div>

            <form onSubmit={handlePurchase} className="p-5 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nome completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="84xxxxxxx" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Método de pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setMethod("mpesa"); setPayPhone(""); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 transition-all ${
                      method === "mpesa"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30"
                    }`}
                    aria-label="Selecionar M-Pesa"
                  >
                    <img src={mpesaLogo} alt="M-Pesa" className="h-8 w-8 object-contain" />
                    <span className="text-sm font-semibold">M-Pesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMethod("emola"); setPayPhone(""); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 transition-all ${
                      method === "emola"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30"
                    }`}
                    aria-label="Selecionar e-Mola"
                  >
                    <img src={emolaLogo} alt="e-Mola" className="h-8 w-8 object-contain" />
                    <span className="text-sm font-semibold">e-Mola</span>
                  </button>
                </div>
              </div>

              {method && (
                <motion.div className="space-y-1.5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.2 }}>
                  <Label className="text-sm">Número de pagamento</Label>
                  <Input
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value)}
                    required
                    placeholder={method === "mpesa" ? "84/85xxxxxxx" : "86/87xxxxxxx"}
                  />
                </motion.div>
              )}

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
