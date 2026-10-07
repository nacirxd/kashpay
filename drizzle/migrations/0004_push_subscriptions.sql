CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_whatsapp_on_approval()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM net.http_post(
      url := 'https://wyfzffmndlfizxzumiep.supabase.co/functions/v1/sale-push',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.app_settings WHERE key='wa_cron_token')),
      body := jsonb_build_object('sale_id', NEW.id)
    );
    IF NEW.wa_approved_sent_at IS NULL THEN
      PERFORM net.http_post(
        url := 'https://wyfzffmndlfizxzumiep.supabase.co/functions/v1/visionspy-whatsapp',
        headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.app_settings WHERE key='wa_cron_token')),
        body := jsonb_build_object('sale_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END; $function$;