-- AI 코치 사용 기록. 함수(service role)만 쓰고, 교사는 대시보드나 별도 화면에서 읽는다.
create table if not exists coach_log (
  id bigint generated always as identity primary key,
  team text not null,
  mode text not null check (mode in ('plan', 'code')),
  message text not null,
  reply text not null,
  flagged boolean not null default false, -- 출력 검사에 걸려 다시 생성된 경우
  created_at timestamptz not null default now()
);

create index if not exists coach_log_team_day on coach_log (team, created_at desc);

-- 정책을 만들지 않으므로 anon 키로는 읽기·쓰기 모두 막힌다.
alter table coach_log enable row level security;
