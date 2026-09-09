-- Couch Cinema Collective — festival v2, slice 4 (FESTIVAL-SPEC.md):
-- acting categories carry one named nominee per film, seeded from billing
-- order and editable by the president. The ballot votes among these fixed
-- nominees instead of free-picking cast. Idempotent. Apply after schema-15.

-- [{ "tmdbId": 603, "name": "Keanu Reeves", "personId": 6384 }, …]
alter table public.festival_awards
  add column if not exists nominees jsonb not null default '[]'::jsonb;

comment on column public.festival_awards.nominees is
  'Acting categories only: one pre-set nominee per lineup film, president-editable (FESTIVAL-SPEC.md).';

notify pgrst, 'reload schema';
