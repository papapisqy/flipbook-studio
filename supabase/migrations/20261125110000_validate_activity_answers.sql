-- Validate anonymous activity payloads at the trusted transaction boundary.
create or replace function private.validate_activity_answers(
  p_activity_version_id uuid,
  p_payload jsonb,
  p_require_complete boolean
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_key text;
  v_question public.activity_questions;
  v_answer text;
  v_count integer;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_answer_payload' using errcode = '22023';
  end if;
  select count(*) into v_count from jsonb_object_keys(p_payload);
  if v_count > 50 then raise exception 'invalid_answer_payload' using errcode = '22023'; end if;

  for v_key in select jsonb_object_keys(p_payload) loop
    if v_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'invalid_answer_key' using errcode = '22023';
    end if;
    select * into v_question from public.activity_questions where id = v_key::uuid and definition_id = p_activity_version_id;
    if v_question.id is null then raise exception 'unknown_question' using errcode = '22023'; end if;
    v_answer := p_payload ->> v_key;
    if v_answer is null or char_length(v_answer) > 4000 then raise exception 'invalid_answer' using errcode = '22023'; end if;
    if v_question.question_type = 'multiple_choice'
       and not exists (select 1 from jsonb_array_elements_text(v_question.options) option where option = v_answer) then
      raise exception 'invalid_choice' using errcode = '22023';
    end if;
  end loop;

  if p_require_complete and exists (
    select 1 from public.activity_questions q
    where q.definition_id = p_activity_version_id
      and (not p_payload ? q.id::text or btrim(coalesce(p_payload ->> q.id::text, '')) = '')
  ) then
    raise exception 'answers_required' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.save_activity_draft(p_attempt uuid,p_token_hash text,p_payload jsonb)
returns void language plpgsql security definer set search_path=public,private as $$
declare v_activity uuid;
begin
  select activity_version_id into v_activity from public.activity_attempts
    where id=p_attempt and session_token_hash=p_token_hash and status='active' and deadline_at>now();
  if v_activity is null then raise exception 'attempt_not_accepting' using errcode='22023'; end if;
  perform private.validate_activity_answers(v_activity,p_payload,false);
  update public.activity_attempts set draft_payload=p_payload,updated_at=now() where id=p_attempt;
end;
$$;

create or replace function public.student_submit_activity(p_attempt_id uuid,p_session_token_hash text,p_activity_version_id uuid,p_payload jsonb,p_idempotency_key uuid,p_request_fingerprint text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_attempt public.activity_attempts; v_existing public.activity_submit_idempotency; v_auto numeric:=0; v_total numeric:=0; v_essay_count integer:=0;
begin
  select * into v_attempt from public.activity_attempts where id=p_attempt_id for update;
  if v_attempt.id is null or v_attempt.activity_version_id<>p_activity_version_id or v_attempt.session_token_hash<>p_session_token_hash or v_attempt.status<>'active' or v_attempt.deadline_at<=now() then raise exception 'attempt_not_accepting' using errcode='28000'; end if;
  select * into v_existing from public.activity_submit_idempotency where attempt_id=p_attempt_id and idempotency_key=p_idempotency_key;
  if found then return v_existing.outcome; end if;
  perform private.validate_activity_answers(p_activity_version_id,p_payload,true);
  select coalesce(sum(max_score),0),count(*) filter(where question_type='essay') into v_total,v_essay_count from public.activity_questions where definition_id=p_activity_version_id;
  select coalesce(sum(q.max_score) filter(where q.question_type='multiple_choice' and p_payload->>q.id::text=q.correct_answer),0) into v_auto from public.activity_questions q where q.definition_id=p_activity_version_id;
  insert into public.attempt_answers(id,attempt_id,payload) values(gen_random_uuid(),p_attempt_id,p_payload);
  update public.activity_attempts set status='finalized',finalized_at=now(),draft_payload=p_payload,updated_at=now() where id=p_attempt_id;
  insert into public.attempt_results(attempt_id,activity_version_id,result_payload,auto_score,manual_score,final_score,review_status) values(p_attempt_id,p_activity_version_id,jsonb_build_object('status','accepted'),v_auto,0,case when v_essay_count=0 and v_total>0 then round(v_auto/v_total*100,2) end,case when v_essay_count=0 then 'graded' else 'needs_review' end);
  insert into public.activity_submit_idempotency values(p_attempt_id,p_idempotency_key,p_request_fingerprint,jsonb_build_object('status','accepted','attempt_id',p_attempt_id));
  return jsonb_build_object('status','accepted','attempt_id',p_attempt_id);
end;
$$;

revoke all on function private.validate_activity_answers(uuid,jsonb,boolean) from public;
