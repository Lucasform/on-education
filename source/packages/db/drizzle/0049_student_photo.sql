-- URL da foto do aluno (public-assets bucket). Null = sem foto.
ALTER TABLE "on_education"."students"
  ADD COLUMN IF NOT EXISTS "photo_url" text;
