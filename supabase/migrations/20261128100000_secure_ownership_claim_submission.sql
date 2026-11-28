-- Secure ownership claim submission for FindBack.
-- A claimant must own the lost report. Verification details are private.
-- This function creates a match row only when needed, then creates the claim.

create or replace function public.submit_ownership_claim(
  p_lost_report_id uuid,
  p_found_report_id uuid,
  p_verification_details text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lost_report public.item_reports%rowtype;
  v_found_report public.item_reports%rowtype;
  v_match_id uuid;
  v_claim_id uuid;
  v_details text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to submit an ownership claim.';
  end if;

  v_details := btrim(coalesce(p_verification_details, ''));

  if length(v_details) < 20 or length(v_details) > 2000 then
    raise exception 'Please provide 20 to 2000 characters of ownership details.';
  end if;

  select * into v_lost_report
  from public.item_reports
  where id = p_lost_report_id
    and user_id = auth.uid()
    and report_type = 'lost'
    and status = 'active';

  if not found then
    raise exception 'You can only claim an active lost report that belongs to your account.';
  end if;

  select * into v_found_report
  from public.item_reports
  where id = p_found_report_id
    and report_type = 'found'
    and status = 'active'
    and user_id <> auth.uid();

  if not found then
    raise exception 'The found report is unavailable or cannot be claimed.';
  end if;

  select id into v_match_id
  from public.matches
  where lost_report_id = p_lost_report_id
    and found_report_id = p_found_report_id
  limit 1;

  if v_match_id is null then
    insert into public.matches (lost_report_id, found_report_id, match_score)
    values (p_lost_report_id, p_found_report_id, 0)
    returning id into v_match_id;
  end if;

  if exists (
    select 1 from public.claims
    where match_id = v_match_id
      and claimant_id = auth.uid()
  ) then
    raise exception 'You have already submitted a claim for this report.';
  end if;

  insert into public.claims (match_id, claimant_id, verification_details)
  values (v_match_id, auth.uid(), v_details)
  returning id into v_claim_id;

  return v_claim_id;
end;
$$;

revoke all on function public.submit_ownership_claim(uuid, uuid, text) from public;
grant execute on function public.submit_ownership_claim(uuid, uuid, text) to authenticated;
