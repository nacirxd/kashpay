import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import kashpayLogo from "@/assets/kashpay-pay-logo.svg";

const Register = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else if (
      data.user &&
      (!data.user.identities || data.user.identities.length === 0)
    ) {
      toast.error("Este email já está em uso. Tente fazer login.");
    } else if (data.user) {
      // Supabase returns the existing user on repeated signup when email confirmation is on.
      // Detect by checking if user was created more than 5 seconds ago.
      const createdAt = new Date(data.user.created_at).getTime();
      const now = Date.now();
      if (now - createdAt > 5000) {
        toast.error("Este email já está em uso. Tente fazer login.");
      } else {
        toast.success("Conta criada! Verifique seu email e aguarde a aprovação do administrador.");
        navigate("/login");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <motion.div
        className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 text-center">
          <img src={kashpayLogo} alt="KashPay" className="mx-auto mb-4 h-12 w-12 rounded-xl" />
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Comece a vender seus produtos digitais</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><UserPlus className="mr-2 h-4 w-4" /> Criar conta</>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
