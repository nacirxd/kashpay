import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setStatus("error");
      } else if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setProcessing(false);
  };

  const content: Record<Status, { icon: React.ReactNode; title: string; desc: string }> = {
    loading: {
      icon: <Loader2 className="h-8 w-8 text-primary animate-spin" />,
      title: "Verificando...",
      desc: "Aguarde enquanto validamos seu pedido.",
    },
    valid: {
      icon: <MailX className="h-8 w-8 text-destructive" />,
      title: "Cancelar inscrição",
      desc: "Tem certeza que deseja parar de receber nossos emails?",
    },
    already: {
      icon: <CheckCircle className="h-8 w-8 text-muted-foreground" />,
      title: "Já cancelado",
      desc: "Você já cancelou sua inscrição anteriormente.",
    },
    invalid: {
      icon: <AlertCircle className="h-8 w-8 text-destructive" />,
      title: "Link inválido",
      desc: "Este link de cancelamento é inválido ou expirou.",
    },
    success: {
      icon: <CheckCircle className="h-8 w-8 text-primary" />,
      title: "Inscrição cancelada",
      desc: "Você não receberá mais emails nossos.",
    },
    error: {
      icon: <AlertCircle className="h-8 w-8 text-destructive" />,
      title: "Erro",
      desc: "Não foi possível processar seu pedido. Tente novamente.",
    },
  };

  const c = content[status];

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-card text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          {c.icon}
        </div>
        <h1 className="text-2xl font-bold mb-2">{c.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{c.desc}</p>

        {status === "valid" && (
          <Button
            onClick={handleUnsubscribe}
            variant="destructive"
            className="w-full"
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirmar cancelamento
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default Unsubscribe;
