import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { getStoredUTMs, captureUTMs } from "@/lib/utm";
import { loadMetaPixel, trackEvent } from "@/lib/metaPixel";
import { loadGTM, pushDataLayer } from "@/lib/gtm";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle, Smartphone, Download, ExternalLink, Lock, Clock, Copy, RefreshCw, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import mpesaLogo from "@/assets/mpesa.svg";
import emolaLogo from "@/assets/emola.svg";
import mcxLogo from "@/assets/multicaixa-express.svg";
import refLogo from "@/assets/referencia.svg";

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
  type PayMethod = "mpesa" | "emola" | "mcx" | "ref" | "zenofy";
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [countdown, setCountdown] = useState(10 * 60);
  const [refResult, setRefResult] = useState<{ entity: string; reference: string } | null>(null);
  const [refOpen, setRefOpen] = useState(false);
  const [refCountdown, setRefCountdown] = useState(2 * 60 * 60);
  const [verifying, setVerifying] = useState(false);
  const [bumpProduct, setBumpProduct] = useState<any>(null);
  const [bumpAccepted, setBumpAccepted] = useState(false);

  const productCurrency: "MZN" | "AOA" = (product?.currency as "MZN" | "AOA") || "MZN";
  const isAOA = productCurrency === "AOA";

  const [methodFlags, setMethodFlags] = useState<{ mpesa: boolean; emola: boolean } | null>(null);

  const loadMethodFlags = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["mpesa_enabled", "emola_enabled"]);
    if (error) return;
    const map = Object.fromEntries((data || []).map((r: any) => [r.key, String(r.value)]));
    setMethodFlags({
      mpesa: map.mpesa_enabled !== "false",
      emola: map.emola_enabled !== "false",
    });
  };

  useEffect(() => {
    loadMethodFlags();
    const onFocus = () => loadMethodFlags();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(loadMethodFlags, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);

  const allMethods: PayMethod[] = isAOA ? ["mcx", "ref"] : ["mpesa", "emola", "zenofy"];
  const enabledMethods: PayMethod[] = (() => {
    const pm = product?.payment_methods;
    const base = Array.isArray(pm) && pm.length > 0
      ? (pm as string[]).filter((m): m is PayMethod => allMethods.includes(m as PayMethod))
      : allMethods;
    if (isAOA) return base;
    if (!methodFlags) return base.filter((m) => m !== "mpesa" && m !== "emola");
    return base.filter((m) => (m === "mpesa" ? methodFlags.mpesa : m === "emola" ? methodFlags.emola : true));
  })();

  useEffect(() => {
    if (enabledMethods.length === 1 && method !== enabledMethods[0]) {
      setMethod(enabledMethods[0]);
      return;
    }
    if (method && !enabledMethods.includes(method)) {
      setMethod(enabledMethods.length === 1 ? enabledMethods[0] : null);
    }
  }, [product, methodFlags]);

  useEffect(() => {
    captureUTMs();
  }, []);

  const utms = getStoredUTMs();

  // Downsell: se o cliente tentar voltar/sair do checkout sem concluir,
  // redireciona para o link de downsell configurado no produto.
  useEffect(() => {
    const downsellUrl: string | undefined = product?.downsell_url || undefined;
    if (!downsellUrl || done) return;

    // Empilha um estado para podermos detectar o "voltar" do navegador
    window.history.pushState({ checkoutGuard: true }, "");

    const onPopState = () => {
      window.location.href = downsellUrl;
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [product, done]);

  useEffect(() => {
    if (!id) return;
    supabase.from("products").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        setProduct(data);

        // Oferta extra (order bump)
        const bumpId = (data as any).order_bump_product_id;
        if (bumpId) {
          supabase
            .from("products")
            .select("id, nome, descricao, preco, currency, image_url, delivery_type, external_url, file_url")
            .eq("id", bumpId)
            .maybeSingle()
            .then(({ data: bp }) => {
              if (bp) setBumpProduct(bp);
            });
        }


        // 1) Pixel específico do produto (prioridade)
        const productPixelId = (data as any).meta_pixel_id?.trim();
        if (productPixelId) {
          loadMetaPixel(productPixelId);
          trackEvent('ViewContent', {
            content_name: data.nome,
            content_ids: [data.id],
            content_type: 'product',
            value: Number(data.preco),
            currency: 'MZN',
          });
        }

        // 2) GTM do vendedor (continua global por conta)
        supabase.from("integrations")
          .select("tipo, config")
          .eq("user_id", data.user_id)
          .eq("ativo", true)
          .eq("tipo", "gtm")
          .then(({ data: integrations }) => {
            integrations?.forEach((int) => {
              const cfg = int.config as any;
              if (cfg?.container_id) {
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

  // Ao voltar da Zenofy: confirma o pagamento diretamente na Zenofy
  useEffect(() => {
    if (!product || done) return;
    const params = new URLSearchParams(window.location.search);
    let saleId = params.get("zsale");
    if (!saleId) {
      try { saleId = localStorage.getItem(`zenofy_sale_${product.id}`); } catch { saleId = null; }
    }
    if (!saleId) return;

    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke("zenofy-check-status", {
          body: { sale_id: saleId },
        });
        if (cancelled) return;
        if (data?.status === "approved") {
          try { localStorage.removeItem(`zenofy_sale_${product.id}`); } catch { /* ignore */ }
          trackEvent('Purchase', {
            content_name: product.nome,
            content_ids: [product.id],
            value: Number(product.preco),
            currency: productCurrency,
          });
          pushDataLayer('purchase', {
            item_name: product.nome,
            item_id: product.id,
            price: Number(product.preco),
            currency: productCurrency,
            transaction_id: product.id,
          });
          setDone(true);
          toast.success("Pagamento confirmado!");
          return;
        }
        if (data?.status === "failed") {
          try { localStorage.removeItem(`zenofy_sale_${product.id}`); } catch { /* ignore */ }
          return;
        }
      } catch { /* tenta de novo */ }
      if (!cancelled && attempts < 40) setTimeout(check, 5000);
    };
    check();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, done]);


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

  // Countdown for the reference modal (2h)
  useEffect(() => {
    if (!refOpen || refCountdown <= 0) return;
    const t = setInterval(() => setRefCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [refOpen, refCountdown]);

  const formatRefTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const verifyRefPayment = async () => {
    if (!product) return;
    setVerifying(true);
    try {
      const { data } = await supabase.functions.invoke("check-payment-status", {
        body: { product_id: product.id, email, phone: payPhone || undefined },
      });
      if (data?.found && data.status === "approved") {
        setRefOpen(false);
        trackEvent('Purchase', {
          content_name: product.nome,
          content_ids: [product.id],
          value: Number(product.preco),
          currency: productCurrency,
        });
        pushDataLayer('purchase', {
          item_name: product.nome,
          item_id: product.id,
          price: Number(product.preco),
          currency: productCurrency,
          transaction_id: product.id,
        });
        setDone(true);
        toast.success("Pagamento confirmado!");
      } else {
        toast.info("Ainda não recebemos o pagamento. Tente novamente em instantes.");
      }
    } catch {
      toast.error("Erro ao verificar pagamento.");
    }
    setVerifying(false);
  };

  // Verifica diretamente na Zenofy o estado de uma venda (não depende do aviso da Zenofy)
  const pollZenofySale = async (saleId: string, maxAttempts = 12): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { data } = await supabase.functions.invoke("zenofy-check-status", {
          body: { sale_id: saleId },
        });
        if (data?.status === "approved") return true;
        if (data?.status === "failed") return false;
      } catch { /* tenta de novo */ }
      await new Promise((r) => setTimeout(r, 3000));
    }
    return false;
  };



  const bumpPrice = bumpProduct
    ? Number(product?.order_bump_price ?? bumpProduct.preco)
    : 0;
  const basePrice = Number(product?.preco || 0);
  const totalPrice = basePrice + (bumpAccepted && bumpProduct ? bumpPrice : 0);

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

    if ((method === "mpesa" || method === "emola")) {
      await loadMethodFlags();
      const { data: fresh } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", `${method}_enabled`)
        .maybeSingle();
      if (fresh && String(fresh.value) === "false") {
        toast.error(`${method === "mpesa" ? "M-Pesa" : "e-Mola"} está temporariamente indisponível.`);
        setMethod(null);
        return;
      }
    }

    // REF (Referência Multicaixa) e Zenofy não pedem telefone aqui
    if (method !== "ref" && method !== "zenofy") {
      if (!payPhone) {
        toast.error("Informe o número de pagamento.");
        return;
      }
      const digits = payPhone.replace(/\D/g, "");
      const validMpesa = /^8[45]\d{7}$/.test(digits);
      const validEmola = /^8[67]\d{7}$/.test(digits);
      const validMcx = /^9\d{8}$/.test(digits);
      if (method === "mpesa" && !validMpesa) {
        toast.error("M-Pesa: use 84 ou 85 seguido de 7 dígitos.");
        return;
      }
      if (method === "emola" && !validEmola) {
        toast.error("e-Mola: use 86 ou 87 seguido de 7 dígitos.");
        return;
      }
      if (method === "mcx" && !validMcx) {
        toast.error("Multicaixa Express: use número Angola com 9 dígitos (9XXXXXXXX).");
        return;
      }
    }

    setPaying(true);

    // Fire InitiateCheckout events
    trackEvent('InitiateCheckout', {
      content_name: product.nome,
      content_ids: [product.id],
      value: totalPrice,
      currency: productCurrency,
    });
    pushDataLayer('begin_checkout', {
      item_name: product.nome,
      item_id: product.id,
      price: totalPrice,
      currency: productCurrency,
      payment_method: method,
    });

    const fireSuccess = () => {
      trackEvent('Purchase', {
        content_name: product.nome,
        content_ids: [product.id],
        value: totalPrice,
        currency: productCurrency,
      });
      pushDataLayer('purchase', {
        item_name: product.nome,
        item_id: product.id,
        price: totalPrice,
        currency: productCurrency,
        transaction_id: product.id,
      });
      setDone(true);
      toast.success("Pagamento confirmado!");
    };

    const pollSale = async (): Promise<boolean> => {
      const maxAttempts = 12;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const { data } = await supabase.functions.invoke("check-payment-status", {
          body: {
            product_id: product.id,
            email,
            phone: payPhone,
          },
        });

        // Só considera sucesso real quando aprovado (não pending)
        if (data?.found && data.status === "approved") {
          return true;
        }
      }
      return false;
    };

    try {
      if (method === "zenofy") {
        // Fluxo Zenofy (Moçambique)
        const { data, error } = await supabase.functions.invoke("zenofy-create-payment", {
          body: {
            name,
            email,
            phone: payPhone || whatsapp || undefined,
            whatsapp: whatsapp || undefined,
            amount: totalPrice,
            product_id: product.id,
            bump_product_id: bumpAccepted && bumpProduct ? bumpProduct.id : undefined,
            bump_valor: bumpAccepted && bumpProduct ? bumpPrice : undefined,
            user_id: product.user_id,
            return_url: `${window.location.origin}${window.location.pathname}`,
            ...utms,
          },
        });

        if (data?.sale_id) {
          try { localStorage.setItem(`zenofy_sale_${product.id}`, data.sale_id); } catch { /* ignore */ }
        }


        if (error || !data?.success) {
          toast.error(data?.error || "Erro ao iniciar pagamento pela Zenofy. Tente novamente.");
        } else if (data.checkout_url) {
          toast.success("A abrir o pagamento seguro Zenofy...");
          window.location.href = data.checkout_url;
          return;
        } else {
          toast.info("Pagamento criado na Zenofy. Aguardando confirmação...");
          const ok = await pollZenofySale(data.sale_id, 20);
          if (ok) fireSuccess();
          else toast.info("Vai receber email assim que o pagamento for confirmado.");
        }

      } else if (method === "mcx" || method === "ref") {
        // Fluxo Kumbify (Angola)
        const { data, error } = await supabase.functions.invoke("kumbify-create-payment", {
          body: {
            method,
            phone: method === "mcx" ? payPhone : undefined,
            name,
            email,
            whatsapp: whatsapp || undefined,
            amount: totalPrice,
            product_id: product.id,
            bump_product_id: bumpAccepted && bumpProduct ? bumpProduct.id : undefined,
            bump_valor: bumpAccepted && bumpProduct ? bumpPrice : undefined,
            user_id: product.user_id,
            ...utms,
          },
        });

        if (error || !data?.success) {
          toast.error(data?.error || "Erro ao iniciar pagamento. Tente novamente.");
        } else if (method === "ref") {
          // Mostra entidade + referência ao cliente; aguarda webhook
          setRefResult({ entity: data.entity, reference: data.reference });
          setRefOpen(true);
          setRefCountdown(2 * 60 * 60);
          toast.success("Referência gerada. Pague num ATM ou app de banking.");
          // Polling em background — quando aprovar, mostra ecrã de sucesso
          pollSale().then((ok) => { if (ok) fireSuccess(); });
        } else {
          // MCX: cliente confirma push no telemóvel
          toast.info("Confirme o pagamento no app Multicaixa Express.");
          const ok = await pollSale();
          if (ok) fireSuccess();
          else toast.info("Aguardando confirmação. Vai receber email assim que pagar.");
        }
      } else {
        // Fluxo e2payments (Moçambique)
        const { data, error } = await supabase.functions.invoke("process-payment", {
          body: {
            method,
            phone: payPhone,
            name,
            email,
            whatsapp: whatsapp || undefined,
            amount: totalPrice,
            reference: "moonpay",
            bump_product_id: bumpAccepted && bumpProduct ? bumpProduct.id : undefined,
            bump_valor: bumpAccepted && bumpProduct ? bumpPrice : undefined,
            product_id: product.id,
            user_id: product.user_id,
            ...utms,
          },
        });

        if (!error && data?.status === "approved") {
          fireSuccess();
        } else if (!error && data?.status === "pending") {
          const ok = await pollSale();
          if (ok) fireSuccess();
          else toast.info("Pagamento em processamento. Confirme no seu telefone.");
        } else {
          const ok = await pollSale();
          if (ok) fireSuccess();
          else toast.error(data?.error || "Erro ao processar pagamento. Tente novamente.");
        }
      }
    } catch {
      const ok = await pollSale();
      if (ok) fireSuccess();
      else toast.error("Erro de conexão. Tente novamente.");
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
    const upsellUrl: string | undefined = product.upsell_url || undefined;

    // Se houver link de upsell, redireciona automaticamente após a aprovação
    if (upsellUrl) {
      setTimeout(() => {
        window.location.href = upsellUrl;
      }, 1500);
    }

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

          {upsellUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">A redirecionar para a próxima oferta...</p>
              <Button asChild size="lg" className="gap-2">
                <a href={upsellUrl}>
                  <ExternalLink className="h-5 w-5" /> Continuar
                </a>
              </Button>
            </div>
          ) : (
            <>
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
            </>
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
                <img
                  src={isAOA ? "https://flagcdn.com/w40/ao.png" : "https://flagcdn.com/w40/mz.png"}
                  alt={isAOA ? "AO" : "MZ"}
                  className="h-3.5 w-5 rounded-sm object-cover"
                />
                {isAOA ? "Angola" : "Moçambique"}
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
                <p className="text-lg font-bold text-primary mt-0.5">{formatCurrency(Number(product.preco), productCurrency)}</p>
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
                <Label className="text-sm">Número do WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                  placeholder={productCurrency === "AOA" ? "9XX XXX XXX" : "8X XXX XXXX"}
                />
              </div>

              {!(enabledMethods.length === 1 && enabledMethods[0] === "zenofy") && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Método de pagamento</Label>
                  <div className={`grid gap-2 ${enabledMethods.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {enabledMethods.includes("mpesa") && method !== "zenofy" && <button
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
                    </button>}
                    {enabledMethods.includes("emola") && method !== "zenofy" && <button
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
                    </button>}
                    {enabledMethods.includes("mcx") && method !== "zenofy" && <button
                      type="button"
                      onClick={() => { setMethod("mcx"); setPayPhone(""); }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-3 py-3 transition-all ${
                        method === "mcx"
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      }`}
                      aria-label="Selecionar Multicaixa Express"
                    >
                      <img src={mcxLogo} alt="Multicaixa Express" className="h-8 w-8 object-contain" />
                      <span className="text-xs font-semibold leading-tight text-center">Multicaixa Express</span>
                    </button>}
                    {enabledMethods.includes("ref") && method !== "zenofy" && <button
                      type="button"
                      onClick={() => { setMethod("ref"); setPayPhone(""); }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-3 py-3 transition-all ${
                        method === "ref"
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      }`}
                      aria-label="Selecionar Referência"
                    >
                      <img src={refLogo} alt="Referência MCX" className="h-8 w-8 object-contain" />
                      <span className="text-xs font-semibold leading-tight text-center">Referência MCX</span>
                    </button>}
                    {enabledMethods.includes("zenofy") && enabledMethods.length > 1 && <button
                      type="button"
                      onClick={() => { setMethod("zenofy"); setPayPhone(""); }}
                      className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 transition-all ${
                        method === "zenofy"
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/30"
                      }`}
                      aria-label="Selecionar Zenofy"
                    >
                      <span className="text-sm font-semibold">Zenofy</span>
                    </button>}
                  </div>

                  {method === "zenofy" && enabledMethods.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground"
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <span>Zenofy selecionado</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Será redirecionado para o pagamento seguro da Zenofy.
                      </p>
                    </motion.div>
                  )}
                </div>
              )}

              {method && method !== "ref" && method !== "zenofy" && (
                <motion.div className="space-y-1.5" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.2 }}>
                  <Label className="text-sm">Número de pagamento</Label>
                  <Input
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value)}
                    required
                    placeholder={
                      method === "mpesa" ? "84/85xxxxxxx"
                      : method === "emola" ? "86/87xxxxxxx"
                      : "9XXXXXXXX"
                    }
                  />
                  {method === "mcx" && (
                    <p className="text-xs text-muted-foreground">
                      Vai receber uma notificação push no app Multicaixa Express para confirmar.
                    </p>
                  )}
                </motion.div>
              )}

              <div className="flex items-center justify-between py-3 border-t border-border/50 mt-2">
                <span className="text-sm font-medium text-muted-foreground">{product.nome}</span>
                <span className="text-sm font-bold">{formatCurrency(Number(product.preco), productCurrency)}</span>
              </div>

              {method && (
                <Button type="submit" className="w-full h-12 text-base font-bold" disabled={paying}>
                  {paying ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    method === "ref" ? "Gerar referência" : method === "zenofy" ? "Continuar" : "Comprar agora"
                  )}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground pt-1">
                🔒 Pagamento seguro e criptografado
              </p>
            </form>
          </div>
        </motion.div>
      </div>

      <Dialog open={refOpen} onOpenChange={setRefOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] sm:max-h-[85vh] rounded-2xl">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[90vh] sm:max-h-[85vh]">
            <div className="space-y-1 pr-8">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Detalhes do Pagamento por Referência</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Use estes dados para completar o pagamento através do seu banco
              </p>
            </div>

            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-primary">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Tempo restante
              </div>
              <p className="mt-1 text-2xl sm:text-3xl font-mono font-bold text-primary">
                {formatRefTime(refCountdown)}
              </p>
            </div>

            {refResult && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(refResult.entity, "Entidade")}
                  className="w-full flex items-center justify-between gap-3 rounded-lg bg-muted/50 hover:bg-muted px-3 sm:px-4 py-2.5 sm:py-3 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Entidade</p>
                    <p className="text-base sm:text-lg font-mono font-bold truncate">{refResult.entity}</p>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(refResult.reference, "Referência")}
                  className="w-full flex items-center justify-between gap-3 rounded-lg bg-muted/50 hover:bg-muted px-3 sm:px-4 py-2.5 sm:py-3 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Referência</p>
                    <p className="text-base sm:text-lg font-mono font-bold truncate">{refResult.reference}</p>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(String(product.preco), "Valor")}
                  className="w-full flex items-center justify-between gap-3 rounded-lg bg-muted/50 hover:bg-muted px-3 sm:px-4 py-2.5 sm:py-3 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-base sm:text-lg font-mono font-bold truncate">
                      {formatCurrency(Number(product.preco), productCurrency)}
                    </p>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-semibold">Instruções:</p>
              <ol className="text-xs sm:text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Acesse seu Internet Banking ou aplicativo do banco</li>
                <li>Selecione a opção <strong className="text-foreground">"Pagamentos por Referência"</strong></li>
                <li>Introduza a <strong className="text-foreground">Entidade</strong> e <strong className="text-foreground">Referência</strong> acima</li>
                <li>Confirme o valor e autorize o pagamento</li>
              </ol>
            </div>

            <Button
              onClick={verifyRefPayment}
              disabled={verifying}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-bold gap-2"
            >
              {verifying ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
                  Verificar Pagamento
                </>
              )}
            </Button>

            <p className="text-center text-[11px] sm:text-xs text-muted-foreground">
              Após efectuar o pagamento, clique no botão acima para confirmar.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
