SELECT id,
       username,
       email,
       hashed_password,
       role,
       is_active,
       created_at
FROM public.users
LIMIT 1000;