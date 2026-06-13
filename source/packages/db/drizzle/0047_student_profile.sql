-- Campos de perfil completo do aluno: endereço, info médica e contato de emergência.
ALTER TABLE "on_education"."students"
  ADD COLUMN IF NOT EXISTS "address"             text,
  ADD COLUMN IF NOT EXISTS "city"                text,
  ADD COLUMN IF NOT EXISTS "state"               text,
  ADD COLUMN IF NOT EXISTS "zip_code"            text,
  ADD COLUMN IF NOT EXISTS "blood_type"          text,
  ADD COLUMN IF NOT EXISTS "allergies"           text,
  ADD COLUMN IF NOT EXISTS "medical_notes"       text,
  ADD COLUMN IF NOT EXISTS "emergency_name"      text,
  ADD COLUMN IF NOT EXISTS "emergency_phone"     text,
  ADD COLUMN IF NOT EXISTS "emergency_relation"  text;
