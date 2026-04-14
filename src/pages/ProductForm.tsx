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
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";
import { ArrowLeft, Save, Copy, ShoppingBag, DollarSign, TrendingUp, Upload, X } from "lucide-react";
import { motion } from "framer-motion";

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
  const [preco, setPreco] = useState("");
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
            setDeliveryType((data as any).delivery_type || "link");
            setExternalUrl((data as any).external_url || "");
            setFileUrl((data as any).file_url || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (deliveryType === "file" && !fileUrl) {
      toast.error("Por favor envie um arquivo.");
      return;
    }
    if (deliveryType === "link" && !externalUrl) {
      toast.error("Por favor insira o link externo.");
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
      preco: parseFloat(preco),
      delivery_type: deliveryType,
      file_url: deliveryType === "file" ? fileUrl : null,
      external_url: deliveryType === "link" ? externalUrl : null,
    };

    if (isEditing) {
      const { error } = await supabase
        .from("products")
        .update(payload as any)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) toast.error(error.message);
      else {
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
        <div className="space-y-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva seu produto..."
            rows={4}
          />
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
            <Label htmlFor="externalUrl">Link de entrega</Label>
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
