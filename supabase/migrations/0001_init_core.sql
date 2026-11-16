-- 0001_init_core.sql
-- Extensions + shared helper functions used by every other migration.
-- Safe to run once (Supabase migrations are tracked).

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- updated_at maintenance -------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Persian/Arabic normalisation: unify ي/ی, ك/ک, ه/ۀ/ة, و/ؤ, drop diacritics and
-- tatweel, convert Persian/Arabic-Indic digits to ASCII, collapse whitespace.
create or replace function public.normalize_fa(input text)
returns text
language sql
immutable
parallel safe
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        lower(
          translate(
            coalesce(input, ''),
            'يكةۀأإآؤئ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
            'یکهههههه01234567890123456789'
          )
        ),
        '[ً-ٰـ]',
        '',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

-- Flatten a TipTap JSON document into plain text (normalised).
create or replace function public.tiptap_to_text(j jsonb)
returns text
language plpgsql
immutable
as $fn$
declare
  acc text := '';
  child jsonb;
  node_type text;
begin
  if j is null then
    return '';
  end if;

  node_type := coalesce(j ->> 'type', '');

  if node_type = 'text' then
    return public.normalize_fa(coalesce(j ->> 'text', ''));
  end if;

  if node_type in ('mention', 'hashtag', 'emoji') then
    return '';
  end if;

  if j ? 'content' and jsonb_typeof(j -> 'content') = 'array' then
    for child in select * from jsonb_array_elements(j -> 'content') loop
      acc := acc || public.tiptap_to_text(child) || ' ';
    end loop;
  end if;

  return acc;
end;
$fn$;

-- Flatten a TipTap JSON document without normalisation (used for link titles).
create or replace function public.tiptap_to_raw_text(j jsonb)
returns text
language plpgsql
immutable
as $fn$
declare
  acc text := '';
  child jsonb;
  node_type text;
begin
  if j is null then
    return '';
  end if;

  node_type := coalesce(j ->> 'type', '');

  if node_type = 'text' then
    return coalesce(j ->> 'text', '');
  end if;

  if node_type in ('mention', 'hashtag', 'emoji') then
    return '';
  end if;

  if j ? 'content' and jsonb_typeof(j -> 'content') = 'array' then
    for child in select * from jsonb_array_elements(j -> 'content') loop
      acc := acc || public.tiptap_to_raw_text(child) || ' ';
    end loop;
  end if;

  return acc;
end;
$fn$;

-- Empty TipTap doc literal, reused as a column default.
create or replace function public.empty_doc()
returns jsonb
language sql
immutable
as $$
  select '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb;
$$;
