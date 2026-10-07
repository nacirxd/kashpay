import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Template = {
  id: string; nome: string; evento: string; product_ids: string[]; mensagem: string; ativo: boolean;
};
type Product = { id: string; nome: string };

const EVENTOS: Record<string, string> = {
  approved: "Compra aprovada",
  pending: "Pedido não pago (15 min depois)",
};

const empty = { id: "", nome: "", evento: "approved", product_ids: [] as string[], mensagem: "", ativo: true };

const SmsCampaigns = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Template[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Template>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("sms_templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("products").select("id, nome").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setItems((t as Template[]) || []);
    setProducts((p as Product[]) || []);
  };

  useEffect(() => { load(); }, [user?.id]);

  const save = async () => {
    if (!user) return;
    if (!form.mensagem.trim()) return toast.error("Escreva a mensagem");
    if (form.mensagem.length > 480) return toast.error("Mensagem muito longa (máx. 480 caracteres)");
    setSaving(true);
    const payload = {
      user_id: user.id, nome: form.nome.trim() || EVENTOS[form.evento], evento: form.evento,
      product_ids: form.product_ids, mensagem: form.mensagem.trim(), ativo: form.ativo,
    };
    const { error } = form.id
      ? await supabase.from("sms_templates").update(payload).eq("id", form.id)
      : await supabase.from("sms_templates").insert(payload);
    setSaving(false);
    if (error) return toast.error("Erro ao guardar");
    toast.success("Disparo guardado");
    setOpen(false);
    load();
  };

  const toggle = async (t: Template, ativo: boolean) => {
    setItems((xs) => xs.map((x) => (x.id === t.id ? { ...x, ativo } : x)));
    await supabase.from("sms_templates").update({ ativo }).eq("id", t.id);
  };

  const remove = async (t: Template) => {
    if (!confirm("Eliminar este disparo?")) return;
    await supabase.from("sms_templates").delete().eq("id", t.id);
    load();
  };

  const productLabel = (ids: string[]) =>
    ids.length === 0 ? "Todos os produtos" : ids.map((id) => products.find((p) => p.id === id)?.nome || "—").join(", ");

  const insertVar = (v: string) => setForm((f) => ({ ...f, mensagem: `${f.mensagem}{${v}}` }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Disparos SMS</h1>
            <p className="text-sm text-muted-foreground">Mensagens automáticas que os seus clientes recebem por SMS.</p>
          </div>
          <Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo disparo</Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-medium">Nenhum disparo criado</p>
            <p className="text-sm text-muted-foreground">Crie um modelo para enviar SMS na compra ou para recuperar pedidos não pagos.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((t) => (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4 flex gap-4 items-start">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{t.nome}</span>
                    <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">{EVENTOS[t.evento] || t.evento}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{productLabel(t.product_ids)}</p>
                  <p className="text-sm text-foreground/80 line-clamp-2">{t.mensagem}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={t.ativo} onCheckedChange={(v) => toggle(t, v)} />
                  <Button variant="ghost" size="icon" onClick={() => { setForm(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar disparo" : "Novo disparo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Boas-vindas" />
            </div>
            <div className="space-y-1.5">
              <Label>Quando enviar</Label>
              <Select value={form.evento} onValueChange={(v) => setForm({ ...form, evento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENTOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Produtos</Label>
              <div className="rounded-lg border border-border p-3 space-y-2 max-h-44 overflow-y-auto">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.product_ids.length === 0} onCheckedChange={() => setForm({ ...form, product_ids: [] })} />
                  Todos os produtos
                </label>
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.product_ids.includes(p.id)}
                      onCheckedChange={(c) => setForm({
                        ...form,
                        product_ids: c ? [...form.product_ids, p.id] : form.product_ids.filter((x) => x !== p.id),
                      })}
                    />
                    {p.nome}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem</Label>
              <Textarea rows={4} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                placeholder="Olá {nome}, obrigado pela compra de {produto}! Acesso: {link}" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex gap-1">
                  {["nome", "produto", "link", "compra"].map((v) => (
                    <button key={v} type="button" onClick={() => insertVar(v)} className="rounded border border-border px-1.5 py-0.5 hover:bg-muted">{`{${v}}`}</button>
                  ))}
                </div>
                <span>{form.mensagem.length}/480</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /> Ativo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "A guardar..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SmsCampaigns;
