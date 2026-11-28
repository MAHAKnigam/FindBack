-- Safe handover confirmation.
-- The claimant is the item owner; the owner of the found report is the finder.
-- Both parties must confirm before a handover is marked complete.

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
  v_found_report_id uuid;
  v_found_title text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to review claims.';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select cl.claimant_id, fr.id, fr.title
    into v_claimant_id, v_found_report_id, v_found_title
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

  if p_decision = 'approved' then
    insert into public.handovers (claim_id, confirmed_by_owner, confirmed_by_finder)
    select p_claim_id, false, false
    where not exists (
      select 1 from public.handovers h where h.claim_id = p_claim_id
    );
  end if;

  insert into public.notifications (user_id, title, message, is_read)
  values (
    v_claimant_id,
    case when p_decision = 'approved' then 'Ownership claim approved' else 'Ownership claim declined' end,
    case when p_decision = 'approved'
      then 'The finder approved your ownership claim. Open Safe handover in FindBack after arranging a safe exchange.'
      else 'The finder could not verify your ownership claim. You may review your details or seek moderator assistance.'
    end,
    false
  );
end;
$$;

create or replace function public.get_my_handovers()
returns table (
  handover_id uuid,
  item_title text,
  participant_role text,
  other_party_name text,
  confirmed_by_owner boolean,
  confirmed_by_finder boolean,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view handovers.';
  end if;

  return query
  select
    h.id,
    fr.title,
    case when cl.claimant_id = auth.uid() then 'owner' else 'finder' end,
    coalesce(other_profile.full_name, 'FindBack user'),
    h.confirmed_by_owner,
    h.confirmed_by_finder,
    h.completed_at
  from public.handovers h
  join public.claims cl on cl.id = h.claim_id
  join public.matches m on m.id = cl.match_id
  join public.item_reports lr on lr.id = m.lost_report_id
  join public.item_reports fr on fr.id = m.found_report_id
  left join public.profiles other_profile
    on other_profile.id = case
      when cl.claimant_id = auth.uid() then fr.user_id
      else cl.claimant_id
    end
  where cl.status::text = 'approved'
    and (cl.claimant_id = auth.uid() or fr.user_id = auth.uid())
  order by h.id desc;
end;
$$;

create or replace function public.confirm_safe_handover(p_handover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimant_id uuid;
  v_finder_id uuid;
  v_title text;
  v_owner_confirmed boolean;
  v_finder_confirmed boolean;
  v_other_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to confirm a handover.';
  end if;

  select cl.claimant_id, fr.user_id, fr.title,
         h.confirmed_by_owner, h.confirmed_by_finder
    into v_claimant_id, v_finder_id, v_title,
         v_owner_confirmed, v_finder_confirmed
  from public.handovers h
  join public.claims cl on cl.id = h.claim_id
  join public.matches m on m.id = cl.match_id
  join public.item_reports fr on fr.id = m.found_report_id
  where h.id = p_handover_id
    and cl.status::text = 'approved'
    and (cl.claimant_id = auth.uid() or fr.user_id = auth.uid())
  for update of h;

  if not found then
    raise exception 'Handover not found or you are not a participant.';
  end if;

  if v_owner_confirmed and v_finder_confirmed then
    raise exception 'This handover is already complete.';
  end if;

  update public.handovers
  set
    confirmed_by_owner = case when auth.uid() = v_claimant_id then true else confirmed_by_owner end,
    confirmed_by_finder = case when auth.uid() = v_finder_id then true else confirmed_by_finder end,
    completed_at = case
      when (auth.uid() = v_claimant_id or confirmed_by_owner)
       and (auth.uid() = v_finder_id or confirmed_by_finder)
      then now()
      else completed_at
    end
  where id = p_handover_id
  returning confirmed_by_owner, confirmed_by_finder
    into v_owner_confirmed, v_finder_confirmed;

  v_other_user_id := case when auth.uid() = v_claimant_id then v_finder_id else v_claimant_id end;

  insert into public.notifications (user_id, title, message, is_read)
  values (
    v_other_user_id,
    case when v_owner_confirmed and v_finder_confirmed then 'Item return confirmed' else 'Handover confirmation received' end,
    case when v_owner_confirmed and v_finder_confirmed
      then 'Both parties confirmed the safe handover of "' || v_title || '". The return is now marked complete.'
      else 'The other participant confirmed their side of the handover for "' || v_title || '". Please confirm after the item has actually been returned.'
    end,
    false
  );

  if v_owner_confirmed and v_finder_confirmed then
    insert into public.notifications (user_id, title, message, is_read)
    values (
      auth.uid(),
      'Item return confirmed',
      'Both parties confirmed the safe handover of "' || v_title || '". The return is now marked complete.',
      false
    );
  end if;
end;
$$;

revoke all on function public.get_my_handovers() from public;
revoke all on function public.confirm_safe_handover(uuid) from public;
grant execute on function public.get_my_handovers() to authenticated;
grant execute on function public.confirm_safe_handover(uuid) to authenticated;
