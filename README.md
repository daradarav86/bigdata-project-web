# 원묵고 빅데이터원리탐구 도우미

빅데이터 원리 탐구 수업의 **진로 데이터 프로젝트**(조별 기획 → 코드 → 3분 발표)를 학생이 직접 기획하고, 막힐 때 힌트를 받는 웹사이트입니다. 데이터는 [daradarav86/bigdata](https://github.com/daradarav86/bigdata)의 CSV 14개를 씁니다.

> **상태:** 서버(Supabase)는 연결되어 있습니다. 팀 기록·반 설정이 서버에 저장되어 다른 기기에서도 같은 팀으로 들어올 수 있습니다.
> 아직 남은 일은 아래 "남은 일"을 보세요 (Vercel 배포, 관리자 비밀번호·AI 키 넣기).

## 구성

| 화면 | 내용 |
|---|---|
| 기획 | 기획안 v2의 0~3번을 8단계 마법사로. 열(묶는 기준·계산할 열)을 카드로 고르고 질문을 만든다 |
| 코드 | 단계별 힌트 사다리, 오류 해독기, 용어 풀이, 코드 코치 |
| 발표 | 3분 발표 슬라이드 7장을 기획 내용으로 자동 채움 (인쇄/PDF) |
| `/admindara` | 선생님 화면. 관리자 비밀번호로 들어가며, 반별 수업 단계(탭 잠금)·코치 켜고 끄기·코인 주기·비밀번호 초기화·팀 진행 현황·코치 대화 전체 |

- 학생은 반·조를 고르고 숫자 4~6자리 비밀번호로 팀을 만들거나 들어갑니다. 비밀번호를 5번 틀리면 5분 동안 잠깁니다.
- 고친 칸만 1초 뒤 서버에 저장합니다. 주기적으로 서버에 묻지 않고, 들어올 때·화면으로 돌아올 때·탭을 누를 때·코치 창을 열 때만 같은 팀의 다른 기기에서 고친 것과 선생님 설정·코인을 받아 옵니다. 그래프 이미지는 바뀌었을 때만 다시 받습니다. 팀원이 서로 다른 칸을 동시에 고쳐도 덮어쓰지 않습니다.
- 코치(AI)는 **되묻기·단서·도구 이름·빈칸 뼈대**까지만 답하고 완성 코드나 기획안 문장은 대신 써 주지 않습니다. 이 규칙은 서버가 출력을 검사해서 지킵니다.
- 코치 코인은 팀당 10개(+선생님이 더 준 만큼)이고 서버가 셉니다. 팀은 서버가 준 토큰으로 확인하므로 다른 조의 코인을 쓸 수 없습니다.
- 학생 입력은 모두 "학생이 쓴 자료"로만 취급하고, 그 안의 지시문은 따르지 않습니다.

## 폴더

```
app/                     React + Vite 프런트엔드
  src/backend.js         서버 호출 (VITE_API_URL이 없으면 이 브라우저에 저장하는 시험 모드)
  src/store.js           팀 기록 상태·저장·동기화
scripts/                 profile-data.mjs (CSV → datasets.json), check-*.mjs (검사)
supabase/
  migrations/            0001 coach_log, 0002 teams·class_settings·merge_game, 0003 팀원 칸 단위 저장·coach_counts
  functions/api          팀 만들기·들어가기·저장·동기화, 관리자 기능
  functions/coach        AI 코치 (Claude)
  functions/_shared      두 함수가 함께 쓰는 것 (토큰, DB 연결, 코인)
```

## 실행 (내 컴퓨터)

```bash
cd app
cp .env.example .env.local   # VITE_API_URL에 서버 주소를 넣는다. 비우면 시험 모드
npm install
npm run dev      # http://127.0.0.1:5173
npm run build
```

서버 주소: `https://ztwozxxtcpchredgukqi.supabase.co/functions/v1` (Supabase 프로젝트 `bigdata-project-web`, 서울)

## 서버 (Supabase)

- **DB:** `supabase/migrations`의 SQL을 순서대로 SQL Editor에서 실행한다. 모든 테이블은 RLS가 켜져 있고 정책이 없어서 브라우저에서는 직접 읽고 쓸 수 없다. Edge Function(service_role)만 쓴다.
- **함수 배포:** `api`, `coach` 두 함수 모두 **JWT 검사를 끈다** (`supabase/config.toml`, 또는 `--no-verify-jwt`).
  ```bash
  npx supabase login
  npx supabase link --project-ref ztwozxxtcpchredgukqi
  npx supabase functions deploy api --no-verify-jwt
  npx supabase functions deploy coach --no-verify-jwt
  ```
  CLI 없이 대시보드 편집기로 올릴 때는 `_shared/common.ts`를 각 함수 파일 위에 붙여 한 파일로 만든다 (처음 배포는 이렇게 했다).
- **Secrets** (Edge Functions → Secrets):
  - `ADMIN_PASSWORD` — `/admindara` 비밀번호. 영문·숫자·기호만 (요청 머리글로 보내므로 한글 불가)
  - `ANTHROPIC_API_KEY` — 코치용. 없으면 코치만 "답을 가져오지 못했어요"가 나고 코인은 줄지 않는다
  - `COACH_MODEL` (선택, 기본 `claude-haiku-5-5`)

## 배포

- **학생 화면 (Vercel):** `main`에 push하면 자동으로 다시 배포된다. Root Directory `app`, 환경변수 `VITE_API_URL` = 위 서버 주소.
- **서버 함수 (Supabase):** push해도 자동으로 배포되지 않는다. 함수 코드를 고쳤으면 위 "함수 배포"대로 다시 올린다.
- 코치 모델(`claude-haiku-5-5`)은 답하기 전에 생각(thinking)을 하므로 `max_tokens`를 넉넉히(4000) 두고 `effort: low`로 짧게 생각하게 한다. 600으로 두면 생각에 다 써서 답이 빈다.
- 코인과 코치 대화 기록은 **지금 팀을 만든 뒤의 것만** 센다. 같은 반·조로 팀을 지우고 다시 만들어도 예전 기록이 섞이지 않는다.

## 오래 운영하기 (무료 한도)

- 학생 화면은 주기적으로 묻지 않는다(폴링 없음). 들어올 때, 화면으로 돌아올 때, 탭을 누를 때, 코치 창을 열 때만 받아 온다(5초 안에 여러 번이면 한 번). 관리자 화면도 처음·돌아올 때·새로고침 버튼으로만 읽는다. 그래프 이미지는 바뀌었을 때만 다시 받는다 (전송량의 대부분이 그래프).
- Supabase 무료 프로젝트는 **7일 동안 요청이 없으면 멈춘다.** `.github/workflows/keepalive.yml`이 3일마다 `api` 함수의 `ping`을 불러 깨워 둔다. GitHub는 저장소에 60일 동안 변경이 없으면 예약 실행을 끄므로, 그때는 Actions 탭에서 다시 켠다.
- 그래도 멈췄다면 Supabase 대시보드에서 프로젝트를 "Restore"하면 기록은 그대로 돌아온다.
- 대략의 사용량(8반 × 3차시, 반마다 30대 정도): 함수 호출 월 수만 번(무료 50만), 전송량 1GB 안쪽(무료 5GB).

## 검사

```bash
node scripts/check-guard.mjs     # 코치 출력 검사 규칙
node scripts/check-quiz.mjs      # 데이터 확인 질문
node scripts/check-coverage.mjs  # 데이터별 추천 열
node scripts/check-contrast.mjs  # 글자 색 대비
```

## 데이터 출처

`app/src/data/datasets.json`은 [bigdata](https://github.com/daradarav86/bigdata)의 데이터에서 열 정보(이름, 종류, 빈칸 수, 예시 값)와 앞 5행만 뽑은 것입니다. 데이터별 출처와 이용 조건은 그 저장소의 `guides/`와 `licenses/`를 따릅니다.
