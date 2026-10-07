CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL DEFAULT '',
  evento text NOT NULL DEFAULT 'approved',
  product_ids uuid[] NOT NULL DEFAULT '{}',
  mensagem text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_templates TO authenticated;
GRANT ALL ON public.sms_templates TO service_role;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own templates select" ON public.sms_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own templates insert" ON public.sms_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own templates update" ON public.sms_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own templates delete" ON public.sms_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);