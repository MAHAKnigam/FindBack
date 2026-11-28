-- Finder-side claim review. Only the owner of the found report can view
-- and decide claims submitted against that report.

create or replace function public.get_claims_for_review()
returns table (
  claim_id uuid,
  found_report_id uuid,
  lost_report_title text,
  lost_report_date date,
  verification_details text,
  claimant_name text,
  claim_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to review claims.';
  end if;

  return query
  select
    cl.id,
    fr.id,
    lr.title,
    lr.date_lost_found,
    cl.verification_details,
    coalesce(p.full_name, 'FindBack user'),
    cl.status::text
  from public.claims cl
  join public.matches m on m.id = cl.match_id
  join public.item_reports fr on fr.id = m.found_report_id
  join public.item_reports lr on lr.id = m.lost_report_id
  left join public.profiles p on p.id = cl.claimant_id
  where fr.user_id = auth.uid()
    and fr.report_type = 'found'
    and fr.status = 'active'
  order by cl.id desc;
end;
$$;

create or replace function public.review_ownership_claim(
  p_claim_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimant_id uuid;
  v_found_title text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to review claims.';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select cl.claimant_id, fr.title
    into v_claimant_id, v_found_title
  from public.claims cl
  join public.matches m on m.id = cl.match_id
  join public.item_reports fr on fr.id = m.found_report_id
  where cl.id = p_claim_id
    and fr.user_id = auth.uid()
    and fr.report_type = 'found'
    and fr.status = 'active'
    and cl.status::text = 'pending'
  for update of cl;

  if not found then
    raise exception 'Pending claim not found or you do not have permission to review it.';
  end if;

  update public.claims
     set status = p_decision
   where id = p_claim_id;

  insert into public.notifications (user_id, title, message, is_read)
  values (
    v_claimant_id,
    case when p_decision = 'approved' then 'Ownership claim approved' else 'Ownership claim declined' end,
    case when p_decision = 'approved'
      then 'The finder approved your ownership claim. Please coordinate a safe handover through FindBack.'
      else 'The finder could not verify your ownership claim. You may review your details or seek moderator assistance.'
    end,
    false
  );
end;
$$;

revoke all on function public.get_claims_for_review() from public;
revoke all on function public.review_ownership_claim(uuid, text) from public;
grant execute on function public.get_claims_for_review() to authenticated;
grant execute on function public.review_ownership_claim(uuid, text) to authenticated;
