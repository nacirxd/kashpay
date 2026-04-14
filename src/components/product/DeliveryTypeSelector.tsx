import { motion } from "framer-motion";
import { FileText, Link2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeliveryType = "file" | "link" | "members";

interface Props {
  onSelect: (type: DeliveryType) => void;
}

const options: { type: DeliveryType; icon: typeof FileText; emoji: string; title: string; desc: string; example: string }[] = [
  {
    type: "file",
    icon: FileText,
    emoji: "📄",
    title: "Arquivo",
    desc: "Upload de arquivo digital que será entregue automaticamente após a compra",
    example: "Ebook, curso em PDF, materiais",
  },
  {
    type: "link",
    icon: Link2,
    emoji: "🔗",
    title: "Link Externo",
    desc: "Entregar um link após a compra",
    example: "Google Drive, Telegram, WhatsApp, site privado",
  },
  {
    type: "members",
    icon: Lock,
    emoji: "🔒",
    title: "Área de Membros",
    desc: "Conteúdo protegido dentro da plataforma",
    example: "Cursos, comunidades, conteúdo exclusivo",
  },
];

const DeliveryTypeSelector = ({ onSelect }: Props) => {
  const [selected, setSelected] = useState<DeliveryType | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold mb-1">Escolha o tipo de entrega</h1>
        <p className="text-sm text-muted-foreground">Como seu cliente receberá o produto?</p>
      </div>

      <div className="grid gap-4">
        {options.map((opt, i) => (
          <motion.button
            key={opt.type}
            type="button"
            onClick={() => setSelected(opt.type)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`w-full flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all ${
              selected === opt.type
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
              selected === opt.type ? "bg-primary/10" : "bg-muted"
            }`}>
              {opt.emoji}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-base">{opt.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Ex: {opt.example}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          size="lg"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

// Need to add the useState import
import { useState } from "react";

export default DeliveryTypeSelector;
export type { DeliveryType };
