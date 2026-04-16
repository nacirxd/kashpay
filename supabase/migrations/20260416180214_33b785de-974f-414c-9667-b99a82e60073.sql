CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID NULL,
  provider TEXT NOT NULL DEFAULT 'tsemba',
  recipient_phone TEXT NOT NULL,
  sender_id TEXT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_response TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_created_at
  ON public.sms_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_logs_sale_id
  ON public.sms_logs (sale_id);

CREATE POLICY "Users can view their own sms logs"
ON public.sms_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can create sms logs"
ON public.sms_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update sms logs"
ON public.sms_logs
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');