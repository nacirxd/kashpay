INSERT INTO public.profiles (user_id, nome, email)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'nome',''), u.email
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);