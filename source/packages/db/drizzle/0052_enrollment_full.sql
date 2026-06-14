-- Matrícula completa: documentos e dados civis do aluno e do responsável.
ALTER TABLE "on_education"."students"
  ADD COLUMN IF NOT EXISTS "cpf"         text,
  ADD COLUMN IF NOT EXISTS "rg"          text,
  ADD COLUMN IF NOT EXISTS "gender"      text,
  ADD COLUMN IF NOT EXISTS "nationality" text,
  ADD COLUMN IF NOT EXISTS "shift"       text;

ALTER TABLE "on_education"."guardians"
  ADD COLUMN IF NOT EXISTS "cpf"        text,
  ADD COLUMN IF NOT EXISTS "rg"         text,
  ADD COLUMN IF NOT EXISTS "address"    text,
  ADD COLUMN IF NOT EXISTS "profession" text;
