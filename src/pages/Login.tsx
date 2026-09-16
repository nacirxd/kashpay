import aureonLogo from "@/assets/aureon-pay-logo.svg";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Escreva o seu email primeiro.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (error) {
      toast.error("Não foi possível reenviar o email agora. Tente novamente em alguns minutos.");
      return;
    }
    toast.success("Email de confirmação reenviado. Verifique a sua caixa de entrada e o spam.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      const code = (error as { code?: string }).code;
      const msg = error.message?.toLowerCase() || "";
      if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
        setNeedsConfirm(true);
        toast.error("Confirme o seu email antes de entrar. Enviámos um link para a sua caixa de entrada.");
        return;
      }
      if (code === "invalid_credentials" || msg.includes("invalid login credentials")) {
        toast.error("Email ou senha incorretos.");
        return;
      }
      toast.error(error.message);
      return;
    }
    setNeedsConfirm(false);
    // Check account status
    const { data: profile } = await supabase.from("profiles").select("status").eq("user_id", data.user.id).maybeSingle();
    if (profile?.status === "banned") {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("Sua conta foi suspensa. Entre em contato com o suporte.");
      return;
    }
    if (profile?.status !== "active") {
      setLoading(false);
      toast.info("Sua conta está aguardando aprovação do administrador.");
      navigate("/dashboard");
      return;
    }
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 text-center">
          <img src={aureonLogo} alt="Aureon Pay" className="mx-auto mb-4 h-12 w-12 rounded-xl" />
          <h1 className="text-2xl font-bold">Entrar no Aureon Pay</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acesse sua conta para gerenciar seus produtos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">
              Esqueci minha senha
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><LogIn className="mr-2 h-4 w-4" /> Entrar</>}
          </Button>

          {needsConfirm && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-left">
              <p className="text-sm font-medium">Email ainda não confirmado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Abra o link que enviámos para <strong>{email}</strong> para activar a sua conta. Verifique também a pasta de spam.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? "A reenviar..." : "Reenviar email de confirmação"}
              </Button>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link to="/registro" className="font-medium text-primary hover:underline">Criar conta</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
