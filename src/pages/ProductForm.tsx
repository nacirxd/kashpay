import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DeliveryTypeSelector, { type DeliveryType } from "@/components/product/DeliveryTypeSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatMZN, formatCurrency } from "@/lib/currency";
import { ArrowLeft, Save, Copy, ShoppingBag, DollarSign, TrendingUp, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import mpesaLogo from "@/assets/mpesa.svg";
import emolaLogo from "@/assets/emola.svg";
import mcxLogo from "@/assets/multicaixa-express.svg";
import refLogo from "@/assets/referencia.svg";
import zenofyLogo from "@/assets/zenofy.svg";

const CATEGORIAS = [
  "Cursos e Educação",
  "E-books e Livros",
  "Marketing Digital",
  "Negócios e Empreendedorismo",
  "Finanças e Investimentos",
  "Desenvolvimento Pessoal",
  "Saúde e Bem-estar",
  "Fitness e Esporte",
  "Beleza e Moda",
  "Culinária e Receitas",
  "Tecnologia e Programação",
  "Design e Criatividade",
  "Fotografia e Vídeo",
  "Música e Áudio",
  "Idiomas",
  "Espiritualidade e Religião",
  "Relacionamentos",
  "Família e Filhos",
  "Hobbies e Lazer",
  "Viagens",
  "Imobiliário",
  "Direito",
  "Engenharia",
  "Software e SaaS",
  "Templates e Ferramentas",
  "Consultoria e Mentoria",
  "Eventos e Ingressos",
  "Outro",
];

const ProductForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  // Step control: editing skips the selector
  const [step, setStep] = useState<"type" | "form">(isEditing ? "form" : "type");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("link");

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [preco, setPreco] = useState("");
  const [currency, setCurrency] = useState<"MZN" | "AOA">("MZN");
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["mpesa", "emola"]);
  
  const [externalUrl, setExternalUrl] = useState("");
  const [upsellUrl, setUpsellUrl] = useState("");
  const [downsellUrl, setDownsellUrl] = useState("");
  const [bumpProductId, setBumpProductId] = useState<string>("none");
  const [bumpPrice, setBumpPrice] = useState("");
  const [bumpTitle, setBumpTitle] = useState("");
  const [bumpDescription, setBumpDescription] = useState("");
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [productSales, setProductSales] = useState<any[]>([]);

  useEffect(() => {
    // Lista de produtos do vendedor (para a oferta extra / order bump)
    if (user) {
      supabase
        .from("products")
        .select("id, nome, preco, currency")
        .eq("user_id", user.id)
        .then(({ data }) => setMyProducts(data || []));
    }
    // Carrega a moeda do perfil para definir os métodos disponíveis
    if (user) {
      supabase.from("profiles").select("currency").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        const c = ((data as any)?.currency as "MZN" | "AOA") || "MZN";
        setCurrency(c);
        // Só ajusta o default se ainda estiver no default original
        setPaymentMethods((prev) => {
          const defaultMzn = prev.length === 2 && prev.includes("mpesa") && prev.includes("emola");
          if (!isEditing && defaultMzn && c === "AOA") return ["mcx", "ref"];
          return prev;
        });
      });
    }
    if (isEditing && user) {
      supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setNome(data.nome);
            setDescricao(data.descricao || "");
            setPreco(String(data.preco));
            setCategoria((data as any).categoria || "");
            setSupportPhone((data as any).support_phone || "");
            setSupportEmail((data as any).support_email || "");
            setMetaPixelId((data as any).meta_pixel_id || "");
            setMetaAccessToken((data as any).meta_access_token || "");
            setDeliveryType((data as any).delivery_type || "link");
            setExternalUrl((data as any).external_url || "");
            setUpsellUrl((data as any).upsell_url || "");
            setDownsellUrl((data as any).downsell_url || "");
            setBumpProductId((data as any).order_bump_product_id || "none");
            setBumpPrice((data as any).order_bump_price != null ? String((data as any).order_bump_price) : "");
            setBumpTitle((data as any).order_bump_title || "");
            setBumpDescription((data as any).order_bump_description || "");
            setFileUrl((data as any).file_url || "");
            const prodCurrency = ((data as any).currency as "MZN" | "AOA") || "MZN";
            setCurrency(prodCurrency);
            
            const pm = (data as any).payment_methods;
            if (Array.isArray(pm) && pm.length > 0) setPaymentMethods(pm);
            if ((data as any).image_url) {
              setImageUrl((data as any).image_url);
              const { data: pubUrl } = supabase.storage.from("product-images").getPublicUrl((data as any).image_url);
              setImagePreview(pubUrl.publicUrl);
            }
            if ((data as any).file_url) {
              const parts = ((data as any).file_url as string).split("/");
              setFileName(parts[parts.length - 1] || "arquivo");
            }
          } else {
            toast.error("Produto não encontrado");
            navigate("/produtos");
          }
          setFetching(false);
        });
      supabase
        .from("sales")
        .select("*")
        .eq("product_id", id)
        .eq("user_id", user.id)
        .then(({ data }) => {
          setProductSales(data || []);
        });
    }
  }, [id, user]);

  const productStats = useMemo(() => {
    const approved = productSales.filter((s) => s.status === "approved");
    const receita = approved.reduce((a, s) => a + Number(s.valor), 0);
    const conversao =
      productSales.length > 0
        ? (approved.length / productSales.length) * 100
        : 0;
    return { vendas: approved.length, receita, conversao };
  }, [productSales]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo 50MB.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("product-files")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar arquivo.");
    } else {
      setFileUrl(path);
      setFileName(file.name);
      toast.success("Arquivo enviado!");
    }
    setUploading(false);
  };

  const removeFile = () => {
    setFileUrl("");
    setFileName("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }

    setUploadingImage(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar imagem.");
    } else {
      setImageUrl(path);
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImagePreview(data.publicUrl);
      toast.success("Imagem enviada!");
    }
    setUploadingImage(false);
  };

  const removeImage = () => {
    setImageUrl("");
    setImagePreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!categoria) {
      toast.error("Selecione um nicho/categoria.");
      return;
    }
    if (!supportPhone.trim()) {
      toast.error("Informe o número de suporte.");
      return;
    }
    if (!supportEmail.trim()) {
      toast.error("Informe o email de suporte.");
      return;
    }

    if (deliveryType === "file" && !fileUrl) {
      toast.error("Por favor envie um arquivo.");
      return;
    }
    if (deliveryType === "link" && !externalUrl) {
      toast.error("Por favor insira o link do material.");
      return;
    }
    if (paymentMethods.length === 0) {
      toast.error("Selecione pelo menos um método de pagamento.");
      return;
    }
    if (deliveryType === "link") {
      try {
        new URL(externalUrl);
      } catch {
        toast.error("Link inválido. Insira uma URL completa.");
        return;
      }
    }
    if (upsellUrl.trim()) {
      try { new URL(upsellUrl.trim()); } catch {
        toast.error("Link de upsell inválido.");
        return;
      }
    }
    if (downsellUrl.trim()) {
      try { new URL(downsellUrl.trim()); } catch {
        toast.error("Link de downsell inválido.");
        return;
      }
    }

    const hasBump = bumpProductId !== "none" && !!bumpProductId;
    if (hasBump && bumpPrice.trim() && (isNaN(parseFloat(bumpPrice)) || parseFloat(bumpPrice) < 0)) {
      toast.error("Preço da oferta extra inválido.");
      return;
    }

    setLoading(true);
    const payload = {
      nome,
      descricao,
      categoria,
      support_phone: supportPhone.trim(),
      support_email: supportEmail.trim(),
      meta_pixel_id: metaPixelId.trim(),
      meta_access_token: metaAccessToken.trim(),
      preco: parseFloat(preco),
      delivery_type: deliveryType,
      currency,
      payment_methods: paymentMethods,
      
      file_url: deliveryType === "file" ? fileUrl : null,
      external_url: deliveryType === "link" ? externalUrl : null,
      upsell_url: upsellUrl.trim() || null,
      downsell_url: downsellUrl.trim() || null,
      image_url: imageUrl || null,
      order_bump_product_id: hasBump ? bumpProductId : null,
      order_bump_price: hasBump && bumpPrice.trim() ? parseFloat(bumpPrice) : null,
      order_bump_title: hasBump ? bumpTitle.trim() || null : null,
      order_bump_description: hasBump ? bumpDescription.trim() || null : null,
    };

    if (isEditing) {
      const { data: updated, error } = await supabase
        .from("products")
        .update(payload as any)
        .eq("id", id)
        .eq("user_id", user.id)
        .select();
      if (error) {
        toast.error(error.message);
      } else if (!updated || updated.length === 0) {
        toast.error("Não foi possível atualizar o produto. Faça login novamente.");
      } else {
        toast.success("Produto atualizado!");
        navigate("/produtos");
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert({ ...payload, user_id: user.id } as any);
      if (error) toast.error(error.message);
      else {
        toast.success("Produto criado!");
        navigate("/produtos");
      }
    }
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/checkout/${id}`);
    toast.success("Link copiado!");
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

  // Step 1: delivery type selection (only for new products)
  if (step === "type") {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <button
            onClick={() => navigate("/produtos")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
        <DeliveryTypeSelector
          onSelect={(type) => {
            setDeliveryType(type);
            setStep("form");
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <button
          onClick={() => (isEditing ? navigate("/produtos") : setStep("type"))}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> {isEditing ? "Voltar" : "Alterar tipo"}
        </button>
        <h1 className="text-lg font-semibold">
          {isEditing ? "Editar produto" : "Novo produto"}
          <span className="ml-2 text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
            {deliveryType === "file"
              ? "📄 Arquivo"
              : deliveryType === "link"
              ? "🔗 Link"
              : "🔒 Área de Membros"}
          </span>
        </h1>
      </div>

      {isEditing && productSales.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Vendas", value: productStats.vendas.toString(), icon: ShoppingBag },
            { label: "Receita", value: formatMZN(productStats.receita), icon: DollarSign },
            { label: "Conversão", value: `${productStats.conversao.toFixed(1)}%`, icon: TrendingUp },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className="rounded-xl border border-border/50 bg-card p-5 shadow-soft"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xl font-bold">{s.value}</div>
            </motion.div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do produto</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Ex: Curso de Marketing Digital"
          />
        </div>

        {/* Product image upload */}
        <div className="space-y-2">
          <Label>Imagem do produto</Label>
          {imagePreview ? (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
              <img src={imagePreview} alt="Produto" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              disabled={uploadingImage}
              className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 py-8 flex flex-col items-center gap-2 transition-colors"
            >
              {uploadingImage ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para enviar imagem (JPG, PNG — máx 5MB)</span>
                </>
              )}
            </button>
          )}
          <input
            ref={imageRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva seu produto..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoria">Nicho / Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger id="categoria">
              <SelectValue placeholder="Selecione o nicho do produto" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="supportPhone">Número de suporte</Label>
            <Input
              id="supportPhone"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              required
              placeholder="84xxxxxxx"
            />
            <p className="text-xs text-muted-foreground">Aparecerá no SMS pós-compra.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Email de suporte</Label>
            <Input
              id="supportEmail"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              required
              placeholder="suporte@exemplo.com"
            />
            <p className="text-xs text-muted-foreground">Aparecerá no email de compra.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>País do produto</Label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "MZN", country: "Moçambique", label: "Metical (MT)", flag: "🇲🇿", methods: ["mpesa", "emola"] },
              { id: "AOA", country: "Angola", label: "Kwanza (Kz)", flag: "🇦🇴", methods: ["mcx", "ref"] },
            ] as const).map((c) => {
              const active = currency === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCurrency(c.id);
                    setPaymentMethods([...c.methods]);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 transition-all ${
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold">{c.country}</span>
                    <span className="text-[11px] opacity-70">{c.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Define o país, a moeda e os métodos de pagamento disponíveis para este produto.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preco">Preço ({currency === "AOA" ? "Kz — Kwanza" : "MT — Metical"})</Label>
          <Input
            id="preco"
            type="number"
            step="0.01"
            min="0"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            required
            placeholder={currency === "AOA" ? "5000.00" : "1500.00"}
          />
        </div>

        <div className="space-y-2">
          <Label>Métodos de pagamento aceites</Label>
          <p className="text-xs text-muted-foreground">Escolha quais métodos serão exibidos no checkout deste produto.</p>
          <div className="grid grid-cols-2 gap-2">
            {(currency === "AOA"
              ? [
                  { id: "mcx", label: "Multicaixa Express", logo: mcxLogo as string | null },
                  { id: "ref", label: "Referência MCX", logo: refLogo as string | null },
                ]
              : [
                  { id: "mpesa", label: "M-Pesa", logo: mpesaLogo as string | null },
                  { id: "emola", label: "e-Mola", logo: emolaLogo as string | null },
                  { id: "zenofy", label: "Zenofy", logo: zenofyLogo as string | null },
                ]
            ).map((m) => {
              const active = paymentMethods.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setPaymentMethods((prev) =>
                      prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                    )
                  }
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 transition-all ${
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {m.logo ? (
                    <img src={m.logo} alt={m.label} className="h-7 w-7 object-contain" />
                  ) : (
                    <span className="text-lg">{m.id === "mcx" ? "📱" : "🧾"}</span>
                  )}
                  <span className="text-sm font-semibold">{m.label}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Meta Pixel agora é configurado em /integracoes/meta selecionando o produto */}

        {/* Delivery-specific fields */}
        {deliveryType === "file" && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <Label>Arquivo do produto</Label>
            {fileUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
                <span className="text-sm truncate flex-1">📄 {fileName}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 py-8 flex flex-col items-center gap-2 transition-colors"
              >
                {uploading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para enviar (PDF, EPUB, ZIP — máx 50MB)</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.epub,.zip,.rar,.doc,.docx,.xlsx,.pptx,.mp3,.mp4"
              onChange={handleFileUpload}
            />
          </motion.div>
        )}

        {deliveryType === "link" && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <Label htmlFor="externalUrl">Link do material</Label>
            <Input
              id="externalUrl"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              required
            />
            <p className="text-xs text-muted-foreground">
              Este link será disponibilizado ao comprador após o pagamento.
            </p>
          </motion.div>
        )}

        {deliveryType === "members" && (
          <motion.div
            className="rounded-lg border border-border bg-muted/30 p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <p className="text-sm text-muted-foreground">
              🔒 A área de membros será criada automaticamente. Após a compra, o cliente terá acesso ao conteúdo protegido na plataforma.
            </p>
          </motion.div>
        )}

        {/* Order bump */}
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <div>
            <h3 className="text-sm font-semibold">Oferta extra no checkout <span className="text-muted-foreground font-normal">(order bump)</span></h3>
            <p className="text-xs text-muted-foreground mt-1">
              Escolha outro dos seus produtos para ser oferecido no checkout, antes do botão de pagamento. Se o cliente aceitar, o valor é somado ao mesmo pagamento.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Produto oferecido</Label>
            <Select value={bumpProductId} onValueChange={setBumpProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem oferta extra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem oferta extra</SelectItem>
                {myProducts
                  .filter((p) => p.id !== id && (p.currency || "MZN") === currency)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — {formatCurrency(Number(p.preco), currency)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Só aparecem produtos com a mesma moeda deste produto.</p>
          </div>

          {bumpProductId !== "none" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="bumpPrice">Preço promocional da oferta <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  id="bumpPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bumpPrice}
                  onChange={(e) => setBumpPrice(e.target.value)}
                  placeholder={currency === "AOA" ? "2500.00" : "500.00"}
                />
                <p className="text-xs text-muted-foreground">Se ficar vazio, usa o preço normal do produto escolhido.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bumpTitle">Título da oferta <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  id="bumpTitle"
                  value={bumpTitle}
                  onChange={(e) => setBumpTitle(e.target.value)}
                  placeholder="Sim! Quero adicionar este bónus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bumpDescription">Descrição da oferta <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Textarea
                  id="bumpDescription"
                  rows={2}
                  value={bumpDescription}
                  onChange={(e) => setBumpDescription(e.target.value)}
                  placeholder="Aproveite este extra com desconto exclusivo."
                />
              </div>
            </>
          )}
        </div>

        {/* Upsell / Downsell */}
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <div>
            <h3 className="text-sm font-semibold">Ofertas pós-compra <span className="text-muted-foreground font-normal">(opcional)</span></h3>
            <p className="text-xs text-muted-foreground mt-1">
              Se preencher um link de upsell, o comprador será redirecionado para esse link assim que o pagamento for aprovado.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="upsellUrl">Link de upsell</Label>
            <Input
              id="upsellUrl"
              type="url"
              value={upsellUrl}
              onChange={(e) => setUpsellUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">Oferta extra apresentada após a compra aprovada.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="downsellUrl">Link de downsell</Label>
            <Input
              id="downsellUrl"
              type="url"
              value={downsellUrl}
              onChange={(e) => setDownsellUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">Alternativa caso o cliente recuse o upsell.</p>
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> {isEditing ? "Salvar" : "Criar produto"}
            </>
          )}
        </Button>
      </form>

      {isEditing && (
        <div className="mt-8 rounded-xl border border-border/50 bg-card p-6">
          <h3 className="text-sm font-semibold mb-2">Link de checkout</h3>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground break-all flex-1">
              {window.location.origin}/checkout/{id}
            </p>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProductForm;
