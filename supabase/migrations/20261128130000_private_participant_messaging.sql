-- Private messaging for participants in approved FindBack claims.
-- Conversations are created only after a claim is approved.

create or replace function public.create_conversation_for_approved_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text = 'approved'
     and (tg_op = 'INSERT' or old.status::text is distinct from 'approved') then
    insert into public.conversations (match_id)
    select new.match_id
    where not exists (
      select 1 from public.conversations c where c.match_id = new.match_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists claims_create_private_conversation on public.claims;
create trigger claims_create_private_conversation
after insert or update of status on public.claims
for each row
execute function public.create_conversation_for_approved_claim();

-- Backfill conversations for claims that were approved before this migration.
insert into public.conversations (match_id)
select distinct cl.match_id
from public.claims cl
where cl.status::text = 'approved'
  and not exists (
    select 1 from public.conversations c where c.match_id = cl.match_id
  );

create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid,
  item_title text,
  other_party_name text,
  last_message text,
  last_message_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view conversations.';
  end if;

  return query
  select
    c.id,
    coalesce(lr.title, fr.title),
    coalesce(p.full_name, 'FindBack user'),
    latest.message,
    latest.created_at
  from public.conversations c
  join public.matches m on m.id = c.match_id
  join public.claims cl on cl.match_id = m.id and cl.status::text = 'approved'
  join public.item_reports lr on lr.id = m.lost_report_id
  join public.item_reports fr on fr.id = m.found_report_id
  left join public.profiles p on p.id = case
    when cl.claimant_id = auth.uid() then fr.user_id
    else cl.claimant_id
  end
  left join lateral (
    select msg.message, msg.created_at
    from public.messages msg
    where msg.conversation_id = c.id
    order by msg.created_at desc
    limit 1
  ) latest on true
  where cl.claimant_id = auth.uid() or fr.user_id = auth.uid()
  order by coalesce(latest.created_at, c.created_at) desc;
end;
$$;

create or replace function public.get_conversation_messages(p_conversation_id uuid)
returns table (
  message_id uuid,
  sender_id uuid,
  sender_name text,
  message_text text,
  sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to view messages.';
  end if;

  if not exists (
    select 1
    from public.conversations c
    join public.matches m on m.id = c.match_id
    join public.claims cl on cl.match_id = m.id and cl.status::text = 'approved'
    join public.item_reports fr on fr.id = m.found_report_id
    where c.id = p_conversation_id
      and (cl.claimant_id = auth.uid() or fr.user_id = auth.uid())
  ) then
    raise exception 'Conversation not found or you are not a participant.';
  end if;

  return query
  select msg.id, msg.sender_id,
         coalesce(p.full_name, 'FindBack user'),
         msg.message, msg.created_at
  from public.messages msg
  left join public.profiles p on p.id = msg.sender_id
  where msg.conversation_id = p_conversation_id
  order by msg.created_at asc;
end;
$$;

create or replace function public.send_conversation_message(
  p_conversation_id uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to send messages.';
  end if;

  if p_message is null or length(trim(p_message)) < 1 or length(p_message) > 2000 then
    raise exception 'Message must contain between 1 and 2000 characters.';
  end if;

  if not exists (
    select 1
    from public.conversations c
    join public.matches m on m.id = c.match_id
    join public.claims cl on cl.match_id = m.id and cl.status::text = 'approved'
    join public.item_reports fr on fr.id = m.found_report_id
    where c.id = p_conversation_id
      and (cl.claimant_id = auth.uid() or fr.user_id = auth.uid())
  ) then
    raise exception 'Conversation not found or you are not a participant.';
  end if;

  insert into public.messages (conversation_id, sender_id, message)
  values (p_conversation_id, auth.uid(), trim(p_message))
  returning id into v_message_id;

  return v_message_id;
end;
$$;

revoke all on function public.get_my_conversations() from public;
revoke all on function public.get_conversation_messages(uuid) from public;
revoke all on function public.send_conversation_message(uuid, text) from public;
grant execute on function public.get_my_conversations() to authenticated;
grant execute on function public.get_conversation_messages(uuid) to authenticated;
grant execute on function public.send_conversation_message(uuid, text) to authenticated;
