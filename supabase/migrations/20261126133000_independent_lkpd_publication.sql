-- LKPD may be authored and distributed before its companion PDF flipbook is
-- uploaded. A published LKPD therefore only needs its own stable public slug.
create or replace function public.admin_save_lkpd(p_definition_id uuid, p_title text, p_public_slug text, p_status text, p_questions jsonb) returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_id uuid := coalesce(p_definition_id, gen_random_uuid()); v_item jsonb; v_pos integer:=0; v_type text; v_options jsonb; v_score numeric; v_activity text;
begin
 if auth.uid() is null or not exists(select 1 from public.admin_profiles where id=auth.uid() and access_status='active') then raise exception 'forbidden' using errcode='42501'; end if;
 if btrim(coalesce(p_title,''))='' or char_length(btrim(p_title))>200 or p_status not in ('draft','published','closed') or jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions)>50 then raise exception 'invalid_lkpd' using errcode='22023'; end if;
 if p_definition_id is not null and not exists(select 1 from public.activity_definitions where id=p_definition_id and owner_admin_id=auth.uid()) then raise exception 'not_found' using errcode='42501'; end if;
 if p_status='published' and coalesce(p_public_slug,'') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'invalid_publication' using errcode='22023'; end if;
 if p_status='published' and jsonb_array_length(p_questions)=0 then raise exception 'questions_required' using errcode='22023'; end if;
 insert into public.activity_definitions(id,owner_admin_id,public_slug,title,status) values(v_id,auth.uid(),nullif(p_public_slug,''),btrim(p_title),p_status) on conflict(id) do update set public_slug=excluded.public_slug,title=excluded.title,status=excluded.status,updated_at=now();
 delete from public.activity_questions where definition_id=v_id;
 for v_item in select value from jsonb_array_elements(p_questions) loop
   v_type:=v_item->>'question_type'; v_options:=coalesce(v_item->'options','[]'::jsonb); v_score:=coalesce((v_item->>'max_score')::numeric,1); v_activity:=btrim(coalesce(v_item->>'activity_title','Kegiatan 1'));
   if v_type not in ('multiple_choice','essay') or btrim(coalesce(v_item->>'prompt',''))='' or v_score<=0 or v_score>1000 or char_length(v_activity)>160 or jsonb_typeof(v_options)<>'array' or jsonb_array_length(v_options)>8 then raise exception 'invalid_question' using errcode='22023'; end if;
   if v_type='multiple_choice' and (jsonb_array_length(v_options)<2 or coalesce(v_item->>'correct_answer','')='' or not exists(select 1 from jsonb_array_elements_text(v_options) x where x=btrim(v_item->>'correct_answer'))) then raise exception 'invalid_multiple_choice' using errcode='22023'; end if;
   insert into public.activity_questions(definition_id,position,activity_title,question_type,prompt,options,correct_answer,max_score,rubric) values(v_id,v_pos,v_activity,v_type,btrim(v_item->>'prompt'),v_options,nullif(v_item->>'correct_answer',''),v_score,nullif(v_item->>'rubric','')); v_pos:=v_pos+1;
 end loop; return v_id;
end; $$;
