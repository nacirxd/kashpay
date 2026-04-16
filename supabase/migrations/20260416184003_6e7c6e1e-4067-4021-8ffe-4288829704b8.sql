ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_tipo_check;

ALTER TABLE public.integrations ADD CONSTRAINT integrations_tipo_check
CHECK (tipo IN ('meta_ads', 'gtm', 'utmify', 'webhook', 'tsemba_sms'));