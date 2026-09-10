-- Couch Cinema Collective — rename Best of the Fest to Best Film.
-- The award_id slug ('best-of-the-fest') is unchanged, so award_results and
-- anything else keyed on it is unaffected — only the display name moves.
-- Idempotent. Apply after schema-18.

update public.festival_awards
   set name = 'Best Film'
 where award_id = 'best-of-the-fest'
   and name = 'Best of the Fest';
