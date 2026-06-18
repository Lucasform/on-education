-- Slug público por tenant (link de marca: eduonway.com/c/<slug>).
-- Unicidade case-insensitive, ignorando nulos (tenant sem slug ainda).
ALTER TABLE on_education.tenants ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique
  ON on_education.tenants (lower(slug))
  WHERE slug IS NOT NULL;
