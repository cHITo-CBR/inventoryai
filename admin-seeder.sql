-- Auto Seed Admin User to both Auth and Public Schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert into auth.users (Supabase Native Auth table)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, 
  email_confirmed_at, recovery_sent_at, last_sign_in_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@flowstock.com', 
  crypt('password123', gen_salt('bf')), 
  now(), now(), now(), 
  '{"provider":"email","providers":["email"]}', '{"full_name":"Super Admin","local_role":"admin"}', now(), now(), 
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000000', 'admin@flowstock.com')::jsonb, 'email', '00000000-0000-0000-0000-000000000000', now(), now(), now()
) ON CONFLICT DO NOTHING;

-- Insert into public.users (Your Custom User Mapping)
INSERT INTO public.users (id, full_name, email, password_hash, role_id, status, is_active) 
VALUES (
  '00000000-0000-0000-0000-000000000000', 'Super Admin', 'admin@flowstock.com', crypt('password123', gen_salt('bf')), 1, 'approved', true
)
ON CONFLICT (email) DO UPDATE SET is_active = true, status = 'approved', role_id = 1;
