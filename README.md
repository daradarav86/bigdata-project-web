# 원묵고 빅데이터원리탐구 도우미

빅데이터 원리 탐구 수업의 **진로 데이터 프로젝트**(조별 기획 → 코드 → 3분 발표)를 학생이 직접 기획하고, 막힐 때 힌트를 받는 웹사이트입니다. 데이터는 [daradarav86/bigdata](https://github.com/daradarav86/bigdata)의 CSV 14개를 씁니다.

> **상태: 프로토타입.** 화면과 흐름은 동작하지만, 서버(Supabase)와 AI 코치는 아직 연결·배포되지 않았습니다. 수업에서 쓰기 전에 아래 "남은 일"을 먼저 끝내야 합니다.

## 구성

| 탭 | 내용 |
|---|---|
| 기획 | 기획안 v2의 0~3번을 8단계 마법사로. 열(묶는 기준·계산할 열)을 카드로 고르고 질문을 만든다 |
| 코드 | 단계별 힌트 사다리, 오류 해독기, 용어 풀이, 코드 코치 |
| 발표 | 3분 발표 슬라이드 7장을 기획 내용으로 자동 채움 (인쇄/PDF) |

- 코치(AI)는 **되묻기·단서·도구 이름·빈칸 뼈대**까지만 답하고 완성 코드나 기획안 문장은 대신 써 주지 않습니다. 이 규칙은 서버가 출력을 검사해서 지킵니다.
- 학생 입력은 모두 "학생이 쓴 자료"로만 취급하고, 그 안의 지시문은 따르지 않습니다.

## 폴더

```
app/        React + Vite 프런트엔드
scripts/    profile-data.mjs  CSV·README·guides → app/src/data/datasets.json
            check-guard.mjs   서버 출력 검사 규칙 확인
supabase/   functions/coach (Edge Function 초안), migrations/ (coach_log)
```

## 실행

```bash
cd app
npm install
npm run dev      # http://127.0.0.1:5173
npm run build
```

데이터를 바꾸거나 추가했다면 `bigdata` 저장소를 옆 폴더에 두고 다시 만듭니다.

```bash
node scripts/profile-data.mjs ../bigdata app/src/data/datasets.json
```

## 남은 일

1. **저장:** 지금은 브라우저(`localStorage`)에만 저장됩니다. 팀·비밀번호·기록을 Supabase로 옮겨야 다른 기기에서도 이어서 쓸 수 있습니다. (현재 팀 비밀번호는 이 기기 안에서만 확인됩니다.)
2. **코치 서버:** `supabase/functions/coach`는 배포·실행해 본 적이 없습니다. `ANTHROPIC_API_KEY`는 Edge Function secret으로만 넣고, 프런트에는 넣지 않습니다.
3. 조 이름 대신 교사가 발급한 조 코드로 호출을 확인해야 다른 조의 한도를 쓰는 것을 막을 수 있습니다.

## 데이터 출처

`app/src/data/datasets.json`은 [bigdata](https://github.com/daradarav86/bigdata)의 데이터에서 열 정보(이름, 종류, 빈칸 수, 예시 값)와 앞 5행만 뽑은 것입니다. 데이터별 출처와 이용 조건은 그 저장소의 `guides/`와 `licenses/`를 따릅니다.
