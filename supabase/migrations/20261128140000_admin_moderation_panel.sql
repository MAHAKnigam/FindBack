-- Admin-only moderation queue and user report submission.
-- Admin authorization is checked inside every privileged RPC using profiles.role.

create or replace function public.submit_moderation_report(
  p_item_report_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to report content.';
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 or length(p_reason) > 1000 then
    raise exception 'Please provide a reason between 5 and 1000 characters.';
  end if;

  if not exists (
    select 1 from public.item_reports
    where id = p_item_report_id and status = 'active'
      and user_id <> auth.uid()
  ) then
    raise exception 'This report cannot be reported.';
  end if;

  if exists (
    select 1 from public.moderation_reports
    where reported_by = auth.uid()
      and item_report_id = p_item_report_id
      and status::text = 'pending'
  ) then
    raise exception 'You already reported this item and it is awaiting review.';
  end if;

  insert into public.moderation_reports (reported_by, item_report_id, reason, status)
  values (auth.uid(), p_item_report_id, trim(p_reason), 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_moderation_queue()
returns table (
  moderation_id uuid,
  item_report_id uuid,
  item_title text,
  item_type text,
  item_description text,
  report_owner_name text,
  reason text,
  moderation_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role::text) = 'admin'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  return query
  select mr.id, ir.id, ir.title, ir.report_type,
         ir.description, coalesce(owner.full_name, 'FindBack user'),
         mr.reason, mr.status::text
  from public.moderation_reports mr
  join public.item_reports ir on ir.id = mr.item_report_id
  left join public.profiles owner on owner.id = ir.user_id
  where mr.status::text = 'pending'
  order by mr.id desc;
end;
$$;

create or replace function public.review_moderation_report(
  p_moderation_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_report_id uuid;
  v_owner_id uuid;
  v_title text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and lower(p.role::text) = 'admin'
  ) then
    raise exception 'Administrator access is required.';
  end if;

  if p_action not in ('dismiss', 'remove') then
    raise exception 'Action must be dismiss or remove.';
  end if;

  select mr.item_report_id, ir.user_id, ir.title
    into v_item_report_id, v_owner_id, v_title
  from public.moderation_reports mr
  join public.item_reports ir on ir.id = mr.item_report_id
  where mr.id = p_moderation_id and mr.status::text = 'pending'
  for update of mr;

  if not found then
    raise exception 'Pending moderation report not found.';
  end if;

  if p_action = 'remove' then
    update public.item_reports set status = 'closed'
    where id = v_item_report_id;
    update public.moderation_reports set status = 'resolved'
    where id = p_moderation_id;
    insert into public.notifications (user_id, title, message, is_read)
    values (v_owner_id, 'Your item report was closed by moderation',
      'A moderator reviewed a community report and closed "' || v_title || '". Contact support if you believe this was a mistake.', false);
  else
    update public.moderation_reports set status = 'dismissed'
    where id = p_moderation_id;
  end if;
end;
$$;

revoke all on function public.submit_moderation_report(uuid, text) from public;
revoke all on function public.get_moderation_queue() from public;
revoke all on function public.review_moderation_report(uuid, text) from public;
grant execute on function public.submit_moderation_report(uuid, text) to authenticated;
grant execute on function public.get_moderation_queue() to authenticated;
grant execute on function public.review_moderation_report(uuid, text) to authenticated;
