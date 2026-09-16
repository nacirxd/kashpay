import { useEffect, useState, useCallback, useRef } from "react";
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
import { ShieldCheck, CheckCircle, Smartphone, Download, ExternalLink, Lock, Clock, Copy, RefreshCw, ArrowRight, Mail, PackageCheck } from "lucide-react";
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
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [bumpAccessUrl, setBumpAccessUrl] = useState<string | null>(null);


  // Controlo de saída/redirecionamentos (upsell / downsell)
  const leavingRef = useRef(false);
  const upsellFiredRef = useRef(false);
  const guardPushedRef = useRef(false);


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
    const downsellUrl: string | undefined = product?.downsell_url?.trim() || undefined;
    if (!downsellUrl || done || guardPushedRef.current) return;

    guardPushedRef.current = true;
    window.history.pushState({ checkoutGuard: true }, "");

    const onPopState = () => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      window.location.href = downsellUrl;
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [product, done]);

  // Upsell: após o pagamento aprovado, leva o comprador ao link de upsell
  useEffect(() => {
    const upsellUrl: string | undefined = product?.upsell_url?.trim() || undefined;
    if (!done || !upsellUrl || upsellFiredRef.current) return;
    upsellFiredRef.current = true;
    const t = setTimeout(() => {
      leavingRef.current = true;
      window.location.href = upsellUrl;
    }, 2500);
    return () => clearTimeout(t);
  }, [done, product]);

  // Acesso ao produto: só é entregue após confirmação da venda (verificado no servidor)
  useEffect(() => {
    if (!done || !product?.id || !email) return;
    let cancelled = false;
    supabase.functions
      .invoke("get-delivery-access", { body: { product_id: product.id, email } })
      .then(({ data }) => {
        if (cancelled || !data?.authorized) return;
        setAccessUrl(data.access_url ?? null);
        setBumpAccessUrl(data.bump_access_url ?? null);
      })
      .catch(() => { /* ignora */ });
    return () => { cancelled = true; };
  }, [done, product, email]);


  useEffect(() => {
    if (!id) return;
    const CHECKOUT_COLS =
      "id, user_id, nome, descricao, preco, currency, image_url, delivery_type, status, categoria, tipo, payment_methods, meta_pixel_id, support_phone, upsell_url, downsell_url, order_bump_product_id, order_bump_price, order_bump_title, order_bump_description";
    supabase.from("products").select(CHECKOUT_COLS).eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setProduct(data);

        // Oferta extra (order bump)
        const bumpId = (data as any).order_bump_product_id;
        if (bumpId) {
          supabase
            .from("products")
            .select(CHECKOUT_COLS)
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
        supabase
          .from("integrations")
          .select("config")
          .eq("user_id", (data as any).user_id)
          .eq("tipo", "gtm")
          .eq("ativo", true)
          .maybeSingle()
          .then(({ data: gtm }) => {
            const containerId = (gtm?.config as any)?.container_id;
            if (containerId) {
              loadGTM(containerId as string);
              pushDataLayer('view_item', {
                item_name: data.nome,
                item_id: data.id,
                price: Number(data.preco),
                currency: 'MZN',
              });
            }
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
          leavingRef.current = true;
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
    const upsellUrl: string | undefined = product.upsell_url?.trim() || undefined;
    const downsellUrl: string | undefined = product.downsell_url?.trim() || undefined;


    const handleDownload = () => {
      if (accessUrl) window.open(accessUrl, "_blank");
      else toast.info("Estamos a preparar o seu acesso. Enviámos também por email.");
    };


    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
            <span className="text-lg font-extrabold text-foreground">Aureon <span className="text-primary">Pay</span></span>
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Ambiente seguro</span>
          </div>
        </header>
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center px-5 py-10 sm:px-8 sm:py-16">
          <motion.section className="w-full overflow-hidden rounded-lg border border-border bg-card shadow-elevated" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <div className="border-b border-border px-6 py-8 text-center sm:px-10 sm:py-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
                <CheckCircle className="h-9 w-9 text-primary" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase text-primary">Pagamento confirmado</p>
              <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">A sua compra foi concluída</h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Obrigado, <strong className="text-foreground">{name || "cliente"}</strong>. O acesso a <strong className="text-foreground">{product.nome}</strong> já está disponível.</p>
            </div>

            <div className="grid gap-6 px-6 py-7 sm:px-10 md:grid-cols-[1fr_0.8fr]">
              <div>
                <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">Resumo da compra</p>
                <div className="flex items-center gap-4 rounded-md border border-border bg-muted/30 p-4">
                  {product.image_url ? <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${product.image_url}`} alt={product.nome} className="h-16 w-16 rounded-md object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary/10"><PackageCheck className="h-7 w-7 text-primary" /></div>}
                  <div className="min-w-0 flex-1"><p className="truncate font-bold text-foreground">{product.nome}</p><p className="mt-1 text-sm text-muted-foreground">Pagamento aprovado</p></div>
                  <p className="font-extrabold text-foreground">{formatCurrency(totalPrice, productCurrency)}</p>
                </div>
                <div className="mt-4 flex items-start gap-3 text-sm text-muted-foreground"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>Também enviámos a confirmação e os dados de acesso para <strong className="text-foreground">{email || "o seu email"}</strong>.</p></div>
              </div>

              <div className="flex flex-col justify-center border-t border-border pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                {upsellUrl ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">A sua próxima oferta está pronta.</p>
                    <Button size="lg" className="h-12 w-full gap-2 font-bold" onClick={() => { leavingRef.current = true; window.location.href = upsellUrl; }}>Continuar <ArrowRight className="h-4 w-4" /></Button>
                    {downsellUrl && <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { leavingRef.current = true; upsellFiredRef.current = true; window.location.href = downsellUrl; }}>Não, obrigado</Button>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveryType === "file" && <Button onClick={handleDownload} size="lg" className="h-12 w-full gap-2 font-bold"><Download className="h-5 w-5" /> Baixar produto</Button>}
                    {deliveryType === "link" && accessUrl && <Button asChild size="lg" className="h-12 w-full gap-2 font-bold"><a href={accessUrl} target="_blank" rel="noopener noreferrer">Acessar produto <ArrowRight className="h-4 w-4" /></a></Button>}
                    {deliveryType === "members" && <div className="rounded-md border border-border bg-muted/30 p-4"><div className="mb-2 flex items-center gap-2 font-semibold"><Lock className="h-4 w-4 text-primary" /> Área de Membros</div><p className="text-sm text-muted-foreground">Consulte o seu email para entrar.</p></div>}
                    {bumpAccepted && bumpProduct && <div className="rounded-md border border-border p-4"><p className="mb-2 text-sm font-semibold">Extra: {bumpProduct.nome}</p>{bumpAccessUrl ? <Button asChild variant="outline" size="sm" className="w-full"><a href={bumpAccessUrl} target="_blank" rel="noopener noreferrer">Acessar conteúdo extra</a></Button> : <p className="text-xs text-muted-foreground">O acesso foi enviado por email.</p>}</div>}

                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-border bg-muted/30 px-6 py-4 text-center text-xs text-muted-foreground">Compra protegida pela Aureon Pay</div>
          </motion.section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-destructive py-2.5 text-center text-xs font-bold text-destructive-foreground sm:text-sm">
        Condição especial reservada por <span className="font-mono">{formatTime(countdown)}</span>
      </div>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <span className="text-lg font-extrabold text-foreground">Aureon <span className="text-primary">Pay</span></span>
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> Compra 100% segura</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <motion.div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <section className="order-2 lg:order-1">
            <div className="mb-7">
              <p className="mb-2 text-xs font-bold uppercase text-primary">Finalize a sua compra</p>
              <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">Dados para entrega e pagamento</h1>
              <p className="mt-2 text-sm text-muted-foreground">Preencha os dados abaixo para receber o seu acesso.</p>
            </div>
            <div className="rounded-lg border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-7">
                <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span><span className="font-bold text-foreground">Informações pessoais</span></div>
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Lock className="h-3.5 w-3.5" /> Dados protegidos</span>
              </div>
              <form onSubmit={handlePurchase} className="space-y-5 p-5 sm:p-7">
               <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-sm font-semibold">Nome completo</Label>
                  <Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Como devemos chamar você?" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Email</Label>
                  <Input className="h-12" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Número do WhatsApp</Label>
                  <Input className="h-12" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required placeholder={productCurrency === "AOA" ? "9XX XXX XXX" : "8X XXX XXXX"} />
                </div>
               </div>

              {!(enabledMethods.length === 1 && enabledMethods[0] === "zenofy") && (
                <div className="space-y-3 border-t border-border pt-5">
                  <div className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span><Label className="font-bold">Forma de pagamento</Label></div>
                  <div className={`grid gap-2 ${enabledMethods.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {enabledMethods.includes("mpesa") && method !== "zenofy" && <button type="button" onClick={() => { setMethod("mpesa"); setPayPhone(""); }} className={`flex min-h-14 items-center justify-center gap-2 rounded-md border px-3 py-3 transition-colors ${method === "mpesa" ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`} aria-label="Selecionar M-Pesa"><img src={mpesaLogo} alt="M-Pesa" className="h-8 w-8 object-contain" /><span className="text-sm font-semibold">M-Pesa</span></button>}
                    {enabledMethods.includes("emola") && method !== "zenofy" && <button type="button" onClick={() => { setMethod("emola"); setPayPhone(""); }} className={`flex min-h-14 items-center justify-center gap-2 rounded-md border px-3 py-3 transition-colors ${method === "emola" ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`} aria-label="Selecionar e-Mola"><img src={emolaLogo} alt="e-Mola" className="h-8 w-8 object-contain" /><span className="text-sm font-semibold">e-Mola</span></button>}
                    {enabledMethods.includes("mcx") && method !== "zenofy" && <button type="button" onClick={() => { setMethod("mcx"); setPayPhone(""); }} className={`flex min-h-16 items-center justify-center gap-2 rounded-md border px-3 py-3 transition-colors ${method === "mcx" ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`} aria-label="Selecionar Multicaixa Express"><img src={mcxLogo} alt="Multicaixa Express" className="h-8 w-8 object-contain" /><span className="text-xs font-semibold">Multicaixa Express</span></button>}
                    {enabledMethods.includes("ref") && method !== "zenofy" && <button type="button" onClick={() => { setMethod("ref"); setPayPhone(""); }} className={`flex min-h-16 items-center justify-center gap-2 rounded-md border px-3 py-3 transition-colors ${method === "ref" ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`} aria-label="Selecionar Referência"><img src={refLogo} alt="Referência MCX" className="h-8 w-8 object-contain" /><span className="text-xs font-semibold">Referência MCX</span></button>}
                    {enabledMethods.includes("zenofy") && enabledMethods.length > 1 && <button type="button" onClick={() => { setMethod("zenofy"); setPayPhone(""); }} className={`flex min-h-14 items-center justify-center rounded-md border px-3 py-3 transition-colors ${method === "zenofy" ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`} aria-label="Selecionar Zenofy"><span className="text-sm font-semibold">Zenofy</span></button>}
                  </div>
                </div>
              )}

              {method && method !== "ref" && method !== "zenofy" && <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Label className="text-sm font-semibold">Número de pagamento</Label><Input className="h-12" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} required placeholder={method === "mpesa" ? "84/85xxxxxxx" : method === "emola" ? "86/87xxxxxxx" : "9XXXXXXXX"} />{method === "mcx" && <p className="text-xs text-muted-foreground">Receberá uma notificação no Multicaixa Express para confirmar.</p>}</motion.div>}

              {bumpProduct && <motion.button type="button" onClick={() => setBumpAccepted((v) => !v)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`w-full rounded-md border p-4 text-left transition-colors ${bumpAccepted ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-muted/30 hover:border-primary/50"}`}><div className="flex items-start gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${bumpAccepted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-background"}`}>{bumpAccepted && <CheckCircle className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{product.order_bump_title || `Sim! Quero adicionar ${bumpProduct.nome}`}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{product.order_bump_description || bumpProduct.descricao || "Adicione este extra à sua compra."}</p><span className="mt-2 block text-sm font-extrabold text-primary">+ {formatCurrency(bumpPrice, productCurrency)}</span></div>{bumpProduct.image_url && <img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${bumpProduct.image_url}`} alt={bumpProduct.nome} className="h-14 w-14 shrink-0 rounded-md object-cover" />}</div></motion.button>}

              {method && <Button type="submit" className="h-14 w-full gap-2 text-base font-bold" disabled={paying}>{paying ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <>{method === "ref" ? "Gerar referência" : method === "zenofy" ? "Continuar para pagamento" : "Finalizar compra"}<ArrowRight className="h-4 w-4" /></>}</Button>}
              <div className="flex items-center justify-center gap-5 pt-1 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Pagamento seguro</span><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Dados protegidos</span></div>
              </form>
            </div>
          </section>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-8">
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
              {product.image_url ? <div className="aspect-[16/10] overflow-hidden bg-muted"><img src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${product.image_url}`} alt={product.nome} className="h-full w-full object-cover" /></div> : <div className="flex aspect-[16/8] items-center justify-center bg-primary/5"><Smartphone className="h-12 w-12 text-primary" /></div>}
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold uppercase text-muted-foreground">Resumo do pedido</span><span className="text-xs font-medium text-muted-foreground">{isAOA ? "Angola · AOA" : "Moçambique · MZN"}</span></div>
                <h2 className="text-xl font-extrabold text-foreground">{product.nome}</h2>
                {product.descricao && <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{product.descricao}</p>}
                <div className="mt-6 space-y-3 border-t border-border pt-5"><div className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">Produto</span><span className="font-semibold">{formatCurrency(basePrice, productCurrency)}</span></div>{bumpAccepted && bumpProduct && <div className="flex justify-between gap-4 text-sm"><span className="truncate text-muted-foreground">{bumpProduct.nome}</span><span className="font-semibold">{formatCurrency(bumpPrice, productCurrency)}</span></div>}<div className="flex items-end justify-between gap-4 border-t border-border pt-4"><span className="font-bold">Total</span><span className="text-2xl font-extrabold text-primary">{formatCurrency(totalPrice, productCurrency)}</span></div></div>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 px-1 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p>Transação processada num ambiente seguro. Os seus dados não são partilhados com terceiros.</p></div>
          </aside>
        </motion.div>
      </main>
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
