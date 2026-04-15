import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Lock, Camera } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setAvatarUrl((data as any).avatar_url || "");
      }
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um ficheiro de imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar imagem.");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("user_id", user.id);
    setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
    toast.success("Foto atualizada!");
  };

  const handleSave = async () => {
    if (!user) return;

    const trimmedNome = nome.trim();
    const trimmedSobrenome = sobrenome.trim();
    const trimmedTelefone = telefone.trim();
    const fullName = [trimmedNome, trimmedSobrenome].filter(Boolean).join(" ");

    if (!trimmedNome) { toast.error("Informe o nome."); return; }
    if (!trimmedSobrenome) { toast.error("Informe o sobrenome."); return; }

    setLoading(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ nome: fullName, telefone: trimmedTelefone })
      .eq("user_id", user.id);

    if (profileError) { toast.error(profileError.message); setLoading(false); return; }

    const { error: authError } = await supabase.auth.updateUser({ data: { nome: fullName } });

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

  const initials = [nome, sobrenome].filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "U";

  return (
    <DashboardLayout>
      <h1 className="text-lg font-semibold mb-6">Configurações</h1>

      <div className="space-y-8 max-w-lg">
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-semibold">Dados pessoais</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden group ring-2 ring-border/50 hover:ring-primary transition-all"
              disabled={uploadingAvatar}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-muted-foreground">{initials}</span>
              )}
              <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  <Camera className="h-5 w-5 text-background" />
                )}
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Foto de perfil</p>
              <p>JPG, PNG. Máx 2MB.</p>
            </div>
          </div>

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