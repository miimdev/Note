-- 0008_search_functions.sql
-- Bilingual search (exact tsvector + trigram fuzzy), suggestions and graph data.

-- Full note search: title + content, tolerant to typos, normalised Persian.
create or replace function public.search_notes(
  q text,
  p_limit int default 30,
  p_offset int default 0,
  p_include_archived boolean default false,
  p_folder uuid default null,
  p_tag uuid default null
)
returns table (
  id uuid,
  title text,
  snippet text,
  score real,
  updated_at timestamptz,
  is_archived boolean,
  folder_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with norm as (
    select public.normalize_fa(coalesce(q, '')) as n
  ),
  terms as (
    select public.normalize_fa(t) as t
    from unnest(regexp_split_to_array((select n from norm), '\s+')) as t
    where public.normalize_fa(t) <> ''
  ),
  qry as (
    select websearch_to_tsquery('simple', (select n from norm)) as tsq
  )
  select
    n.id,
    n.title,
    left(coalesce(n.content_text, ''), 300) as snippet,
    greatest(
      ts_rank(n.search_vector, (select tsq from qry)),
      similarity(public.normalize_fa(n.title), (select n from norm)),
      coalesce((
        select max(similarity(n.content_text, terms.t))
        from terms
        where terms.t <> ''
      ), 0) * 0.6
    )::real as score,
    n.updated_at,
    n.is_archived,
    n.folder_id
  from public.notes n
  where n.user_id = auth.uid()
    and n.deleted_at is null
    and (p_include_archived or n.is_archived = false)
    and (p_folder is null or n.folder_id = p_folder)
    and (
      p_tag is null
      or exists (
        select 1 from public.note_tags nt
        where nt.note_id = n.id and nt.tag_id = p_tag
      )
    )
    and (
      (select n from norm) = ''
      or n.search_vector @@ (select tsq from qry)
      or public.normalize_fa(n.title) % (select n from norm)
      or n.content_text like '%' || (select n from norm) || '%'
      or exists (
        select 1 from terms
        where n.content_text like '%' || terms.t || '%'
          or similarity(n.content_text, terms.t) > 0.22
          or similarity(public.normalize_fa(n.title), terms.t) > 0.3
      )
    )
  order by score desc, n.updated_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
$$;

-- Title completion for the [[wikilink]] picker.
create or replace function public.suggest_note_titles(q text, p_limit int default 8)
returns table (id uuid, title text, updated_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select n.id, n.title, n.updated_at
  from public.notes n
  where n.user_id = auth.uid()
    and n.deleted_at is null
    and n.title <> ''
    and (
      public.normalize_fa(q) = ''
      or public.normalize_fa(n.title) % public.normalize_fa(q)
      or public.normalize_fa(n.title) like public.normalize_fa(q) || '%'
      or n.title ilike '%' || q || '%'
    )
  order by
    case when public.normalize_fa(n.title) like public.normalize_fa(q) || '%' then 0 else 1 end,
    n.updated_at desc
  limit greatest(p_limit, 1);
$$;

-- Graph payload for the knowledge graph view.
create or replace function public.note_graph(p_limit int default 400)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with visible as (
    select n.id, n.title, n.is_favorite, n.folder_id, n.updated_at,
           (select count(*) from public.note_tags nt where nt.note_id = n.id) as tag_count
    from public.notes n
    where n.user_id = auth.uid()
      and n.deleted_at is null
      and n.is_archived = false
    order by n.updated_at desc
    limit greatest(p_limit, 1)
  ),
  edges as (
    select l.source_note_id as source, l.target_note_id as target
    from public.note_links l
    join visible vs on vs.id = l.source_note_id
    join visible vt on vt.id = l.target_note_id
    where l.target_note_id is not null
  )
  select jsonb_build_object(
    'nodes', coalesce((select jsonb_agg(to_jsonb(visible)) from visible), '[]'::jsonb),
    'edges', coalesce((select jsonb_agg(to_jsonb(edges)) from edges), '[]'::jsonb)
  );
$$;

-- Related notes: shared links (both directions) + shared tags + title similarity.
create or replace function public.related_notes(p_note_id uuid, p_limit int default 5)
returns table (id uuid, title text, reason text, score real)
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select id, user_id, title from public.notes
    where id = p_note_id and user_id = auth.uid()
  ),
  by_link as (
    select l.target_note_id as id, 3.0::real as w, 'link'::text as reason
    from public.note_links l, me
    where l.source_note_id = me.id and l.target_note_id is not null
    union all
    select l.source_note_id, 3.0::real, 'backlink'
    from public.note_links l, me
    where l.target_note_id = me.id
  ),
  by_tag as (
    select nt2.note_id as id, 1.5::real as w, 'tag'::text as reason
    from public.note_tags nt1
    join public.note_tags nt2 on nt2.tag_id = nt1.tag_id and nt2.note_id <> nt1.note_id
    join me on me.id = nt1.note_id
    where nt1.note_id = me.id
  ),
  by_title as (
    select n.id, similarity(n.title, me.title)::real as w, 'similar'::text as reason
    from public.notes n, me
    where n.user_id = auth.uid()
      and n.deleted_at is null
      and n.id <> me.id
      and similarity(public.normalize_fa(n.title), public.normalize_fa(me.title)) > 0.4
  ),
  unioned as (
    select * from by_link
    union all select * from by_tag
    union all select * from by_title
  ),
  scored as (
    select u.id, sum(u.w)::real as score,
           (array_agg(u.reason order by u.w desc))[1] as reason
    from unioned u
    group by u.id
  )
  select n.id, n.title, s.reason, s.score
  from scored s
  join public.notes n on n.id = s.id
  where n.deleted_at is null
  order by s.score desc, n.updated_at desc
  limit greatest(p_limit, 1);
$$;

-- Public share lookup: the only anon-readable path into note data.
create or replace function public.get_shared_note(share_token text)
returns table (
  title text,
  content jsonb,
  icon text,
  cover_url text,
  shared_at timestamptz,
  expires_at timestamptz,
  author_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select n.title, n.content, n.icon, n.cover_url, s.created_at, s.expires_at,
         p.display_name
  from public.shared_notes s
  join public.notes n on n.id = s.note_id
  left join public.profiles p on p.user_id = s.user_id
  where s.token = share_token
    and s.is_active
    and (s.expires_at is null or s.expires_at > now())
    and n.deleted_at is null
  limit 1;
$$;

revoke all on function public.get_shared_note(text) from public;
grant execute on function public.get_shared_note(text) to anon, authenticated;

grant execute on function public.search_notes(text, int, int, boolean, uuid, uuid) to authenticated;
grant execute on function public.suggest_note_titles(text, int) to authenticated;
grant execute on function public.note_graph(int) to authenticated;
grant execute on function public.related_notes(uuid, int) to authenticated;
