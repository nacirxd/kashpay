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
import { formatMZN } from "@/lib/currency";
import { ArrowLeft, Save, Copy, ShoppingBag, DollarSign, TrendingUp, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import mpesaLogo from "@/assets/mpesa.svg";
import emolaLogo from "@/assets/emola.svg";

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
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["mpesa", "emola"]);
  const [externalUrl, setExternalUrl] = useState("");
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
            setFileUrl((data as any).file_url || "");
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
      payment_methods: paymentMethods,
      file_url: deliveryType === "file" ? fileUrl : null,
      external_url: deliveryType === "link" ? externalUrl : null,
      image_url: imageUrl || null,
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
          <Label htmlFor="preco">Preço (MZN)</Label>
          <Input
            id="preco"
            type="number"
            step="0.01"
            min="0"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            required
            placeholder="1500.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Métodos de pagamento aceites</Label>
          <p className="text-xs text-muted-foreground">Escolha quais métodos serão exibidos no checkout deste produto.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "mpesa", label: "M-Pesa", logo: mpesaLogo },
              { id: "emola", label: "e-Mola", logo: emolaLogo },
            ].map((m) => {
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
                  <img src={m.logo} alt={m.label} className="h-7 w-7 object-contain" />
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
