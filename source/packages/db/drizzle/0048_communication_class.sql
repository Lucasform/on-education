-- Vincula um comunicado a uma turma específica (opcional).
-- NULL = comunicado geral para todos; preenchido = segmentado para aquela turma.
ALTER TABLE "on_education"."communications"
  ADD COLUMN IF NOT EXISTS "class_id" uuid;
