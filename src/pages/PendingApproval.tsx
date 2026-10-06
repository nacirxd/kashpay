import kashpayLogo from "@/assets/kashpay-pay-logo.svg";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, LogOut, ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const PendingApproval = ({ status }: { status: string }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const banned = status === "banned";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <img src={kashpayLogo} alt="KashPay" className="mx-auto mb-6 h-12 w-12 rounded-xl" />

        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${banned ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {banned ? <ShieldAlert className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </div>

        <h1 className="text-2xl font-bold">
          {banned ? "Conta suspensa" : "Aguarde a aprovação"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {banned
            ? "Sua conta foi suspensa. Entre em contato com o suporte para mais informações."
            : "Sua conta foi criada com sucesso e está em análise. Assim que for aprovada pela nossa equipe, você poderá acessar o painel."}
        </p>

        {!banned && (
          <Button variant="outline" className="mt-6 w-full" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Verificar novamente
          </Button>
        )}

        <Button variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </motion.div>
    </div>
  );
};

export default PendingApproval;
