-- 1) merge_game: 배열 안의 한 칸도 고칠 수 있게 한다 ("members.2" → 팀원 3번째만).
--    팀원들이 각자 기기에서 자기 진로를 동시에 써도 서로 덮어쓰지 않게 하려는 것.
create or replace function merge_game(p_key text, p_patch jsonb) returns bigint
language plpgsql as $$
declare
  k text;
  v jsonb;
  g jsonb;
  r bigint;
begin
  select game into g from teams where key = p_key for update;
  if not found then return null; end if;
  for k, v in select * from jsonb_each(p_patch) loop
    if position('.' in k) > 0 and coalesce(jsonb_typeof(g -> split_part(k, '.', 1)), '') not in ('object', 'array') then
      g := jsonb_set(g, array[split_part(k, '.', 1)], '{}'::jsonb, true); -- 부모 칸이 없으면 먼저 만든다
    end if;
    g := jsonb_set(g, string_to_array(k, '.'), v, true);
  end loop;
  update teams set game = g, rev = rev + 1, updated_at = now() where key = p_key returning rev into r;
  return r;
end $$;

revoke execute on function merge_game(text, jsonb) from public, anon, authenticated;
grant execute on function merge_game(text, jsonb) to service_role;

-- 2) 팀별로 쓴 코치 코인 수 (지금 팀을 만든 뒤의 기록만).
--    관리자 화면에서 coach_log를 통째로 읽으면 1000줄 제한에 걸려 적게 세어지므로 DB에서 센다.
create or replace function coach_counts() returns table (team text, used bigint)
language sql stable as $$
  select l.team, count(*) from coach_log l
  join teams t on t.key = l.team and l.created_at >= t.created_at
  group by l.team
$$;

revoke execute on function coach_counts() from public, anon, authenticated;
grant execute on function coach_counts() to service_role;
