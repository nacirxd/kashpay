import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Lock } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        const fullName = (data.nome || "").trim();
        const [firstName = "", ...restName] = fullName.split(/\s+/).filter(Boolean);
        setNome(firstName);
        setSobrenome(restName.join(" "));
        setEmail(data.email);
        setTelefone(data.telefone || "");
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    const trimmedNome = nome.trim();
    const trimmedSobrenome = sobrenome.trim();
    const trimmedTelefone = telefone.trim();
    const fullName = [trimmedNome, trimmedSobrenome].filter(Boolean).join(" ");

    if (!trimmedNome) {
      toast.error("Informe o nome.");
      return;
    }

    if (!trimmedSobrenome) {
      toast.error("Informe o sobrenome.");
      return;
    }

    setLoading(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ nome: fullName, telefone: trimmedTelefone })
      .eq("user_id", user.id);

    if (profileError) {
      toast.error(profileError.message);
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { nome: fullName },
    });

    if (authError) {
      toast.error(authError.message);
    } else {
      setNome(trimmedNome);
      setSobrenome(trimmedSobrenome);
      setTelefone(trimmedTelefone);
      toast.success("Configurações salvas!");
    }

    setLoading(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem."); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada com sucesso!"); setNewPassword(""); setConfirmPassword(""); }
    setPwLoading(false);
  };

  return (
    <DashboardLayout>
      <h1 className="text-lg font-semibold mb-6">Configurações</h1>

      <div className="space-y-8 max-w-lg">
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-semibold">Dados pessoais</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sobrenome</Label>
              <Input value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+258 84 000 0000" />
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><Save className="mr-2 h-4 w-4" /> Salvar</>}
          </Button>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-semibold">Alterar senha</h2>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button onClick={handlePasswordChange} disabled={pwLoading} variant="outline">
            {pwLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : <><Lock className="mr-2 h-4 w-4" /> Alterar senha</>}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
