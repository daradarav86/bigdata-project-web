-- 팀 기록과 반별 수업 설정. 모든 읽기·쓰기는 Edge Function(service role)이 하고, 브라우저(anon)는 직접 못 건드린다.

-- 팀: "1-3 5조"처럼 반·조로 만든 이름이 열쇠다. 비밀번호(숫자 PIN)는 salt를 붙인 SHA-256으로만 둔다.
create table if not exists teams (
  key text primary key,
  cls text not null,
  no int not null,
  salt text not null,
  hash text not null,
  game jsonb not null,                  -- 기획·발표 등 학생이 쓴 기록 전체 (store.js의 START 모양)
  rev bigint not null default 1,        -- 고칠 때마다 1씩 늘어난다. 다른 기기의 변경을 알아채는 데 쓴다
  coin_bonus int not null default 0,    -- 선생님이 더 준 코치 코인 (쓴 개수는 coach_log에서 센다)
  fails int not null default 0,         -- 비밀번호를 연속으로 틀린 횟수
  locked_until timestamptz,             -- 너무 많이 틀리면 잠깐 잠근다
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_cls on teams (cls);
alter table teams enable row level security;

-- 반별 설정: 코치를 열지, 지금 어느 단계(기획 / 코드 / 발표)까지 열지
create table if not exists class_settings (
  cls text primary key,
  coach boolean not null default true,
  phase text not null default 'deck' check (phase in ('plan', 'code', 'deck'))
);
alter table class_settings enable row level security;

-- 팀 기록 일부만 고친다. patch는 { "keyword": "...", "deck.title": "..." }처럼 경로 → 값.
-- 한 팀의 여러 기기가 서로 다른 칸을 동시에 고쳐도 덮어쓰지 않도록 행을 잠그고 그 칸만 바꾼다.
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
    if position('.' in k) > 0 and jsonb_typeof(g -> split_part(k, '.', 1)) is distinct from 'object' then
      g := jsonb_set(g, array[split_part(k, '.', 1)], '{}'::jsonb, true); -- 부모 칸이 없으면 먼저 만든다
    end if;
    g := jsonb_set(g, string_to_array(k, '.'), v, true);
  end loop;
  update teams set game = g, rev = rev + 1, updated_at = now() where key = p_key returning rev into r;
  return r;
end $$;

revoke execute on function merge_game(text, jsonb) from public, anon, authenticated;

-- 새 테이블을 Data API에 자동으로 열지 않는 프로젝트이므로, Edge Function이 쓰는 service_role에만 권한을 준다
grant select, insert, update, delete on teams, class_settings, coach_log to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function merge_game(text, jsonb) to service_role;
