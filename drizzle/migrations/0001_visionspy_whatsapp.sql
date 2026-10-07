-- lovable-cron-fallback-reviewed: recuperação de pedidos pendentes exige atraso; aprovação é por gatilho
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS wa_approved_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS wa_recovery_sent_at timestamptz;

INSERT INTO public.app_settings (key, value)
VALUES ('wa_cron_token', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_whatsapp_on_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.wa_approved_sent_at IS NULL THEN
    PERFORM net.http_post(
      url := 'https://wyfzffmndlfizxzumiep.supabase.co/functions/v1/visionspy-whatsapp',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.app_settings WHERE key='wa_cron_token')),
      body := jsonb_build_object('sale_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_whatsapp_on_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sales_whatsapp_approval ON public.sales;
CREATE TRIGGER sales_whatsapp_approval AFTER UPDATE OF status ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.notify_whatsapp_on_approval();

SELECT cron.unschedule('visionspy-whatsapp') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'visionspy-whatsapp');
SELECT cron.schedule('visionspy-whatsapp', '*/15 * * * *', $$
  SELECT net.http_post(
    url := 'https://wyfzffmndlfizxzumiep.supabase.co/functions/v1/visionspy-whatsapp',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.app_settings WHERE key='wa_cron_token')),
    body := '{"mode":"recovery"}'::jsonb
  );
$$);