-- FindBack rule-based match suggestions.
-- This RPC only returns active opposite-type reports for a report owned by the caller.
-- It does not create claims or expose private ownership details.

create or replace function public.find_report_matches(p_report_id uuid)
returns table (
  matched_report_id uuid,
  matched_title text,
  matched_type text,
  category_name text,
  area_name text,
  matched_date date,
  match_score integer,
  match_reasons text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  source_report public.item_reports%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view match suggestions.';
  end if;

  select *
    into source_report
    from public.item_reports
   where id = p_report_id
     and user_id = auth.uid();

  if not found then
    raise exception 'Report not found or you do not have permission to view its matches.';
  end if;

  if source_report.status <> 'active' then
    raise exception 'Only active reports can be matched.';
  end if;

  return query
  with candidates as (
    select
      r.id,
      r.title,
      r.report_type,
      r.date_lost_found,
      c.name as category,
      l.area_name as area,
      case when r.category_id = source_report.category_id then 30 else 0 end as category_points,
      case
        when lower(trim(coalesce(l.area_name, ''))) = lower(trim(coalesce(
          (select sl.area_name from public.locations sl where sl.id = source_report.location_id), ''
        ))) and coalesce(l.area_name, '') <> '' then 25
        else 0
      end as location_points,
      greatest(0, 15 - (abs(r.date_lost_found - source_report.date_lost_found) * 1))::integer as date_points,
      (
        select count(*)::integer
          from (
            select distinct lower(token) as token
              from regexp_split_to_table(coalesce(source_report.description, ''), '[^[:alnum:]]+') as token
             where length(token) >= 3
          ) source_tokens
         where exists (
           select 1
             from regexp_split_to_table(coalesce(r.description, ''), '[^[:alnum:]]+') as candidate_token
            where lower(candidate_token) = source_tokens.token
         )
      ) as common_words,
      (
        select count(*)::integer
          from (
            select distinct lower(token) as token
              from regexp_split_to_table(coalesce(source_report.description, ''), '[^[:alnum:]]+') as token
             where length(token) >= 3
          ) all_tokens
      ) as source_word_count
    from public.item_reports r
    left join public.categories c on c.id = r.category_id
    left join public.locations l on l.id = r.location_id
    where r.status = 'active'
      and r.id <> source_report.id
      and r.report_type <> source_report.report_type
      and abs(r.date_lost_found - source_report.date_lost_found) <= 30
  ),
  scored as (
    select
      candidates.*,
      (category_points + location_points + date_points +
        case when source_word_count = 0 then 0
             else round((common_words::numeric / source_word_count) * 30)::integer
        end
      )::integer as total_score
    from candidates
  )
  select
    s.id,
    s.title,
    s.report_type,
    s.category,
    s.area,
    s.date_lost_found,
    s.total_score,
    array_remove(array[
      case when s.category_points > 0 then 'Same category' end,
      case when s.location_points > 0 then 'Same approximate area' end,
      case when s.date_points >= 10 then 'Close report date' end,
      case when s.common_words > 0 then 'Description keywords overlap' end
    ], null)
  from scored s
  where s.total_score >= 25
  order by s.total_score desc, s.date_lost_found desc
  limit 30;
end;
$$;

revoke all on function public.find_report_matches(uuid) from public;
grant execute on function public.find_report_matches(uuid) to authenticated;
