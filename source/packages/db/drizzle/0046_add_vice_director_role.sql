-- Adiciona vice_director ao enum de papéis (após director).
ALTER TYPE "on_education"."role" ADD VALUE IF NOT EXISTS 'vice_director' AFTER 'director';
