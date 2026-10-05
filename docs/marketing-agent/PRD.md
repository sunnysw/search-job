# AI 마케팅 에이전트 팀 SaaS — 상세 PRD (개발 착수용) v2.0

> 원본 문서: `PRD.md`, `database_design.md`, `design.md`, `ui_design.md`, `getting_started.md` (v1)
> 이 문서는 위 5개 문서를 하나로 합치고, 개발자가 바로 구현할 수 있는 수준으로 상세화한 버전이다.
> 원본 대비 바뀐 점과 그 이유는 **부록 A. 로직 검토 결과 및 변경 사항**에 정리했다.

| 항목 | 내용 |
|---|---|
| 문서 버전 | v2.0 (2026-10-05) |
| 상태 | Draft — 오픈 이슈(§16) 결정 후 확정 |
| 범위 | MVP(Phase 1) 상세 + Phase 2/3 개요 |

---

## 목차

1. 서비스 개요
2. 사용자와 핵심 시나리오
3. 용어 정의
4. 릴리스 범위 (MVP / Phase 2 / Phase 3)
5. 시스템 아키텍처
6. 에이전트 설계와 LLM 라우팅
7. 기능 요구사항 (FR)
8. 상태 머신
9. 데이터베이스 스키마 (DDL)
10. API 명세
11. LLM 입출력 계약 (프롬프트·JSON 스키마)
12. UI/UX 명세 및 디자인 시스템
13. 퍼널 지표 정의와 계산식
14. 비기능 요구사항
15. 개발 마일스톤과 작업 분해
16. 오픈 이슈
- 부록 A. 로직 검토 결과 및 변경 사항
- 부록 B. 초기 마스터 프롬프트 (개정)

---

## 1. 서비스 개요

### 1.1 목표
중소기업·소상공인 마케터가 **AI 에이전트 팀**(전략 리드, 카피라이터, 가이드라인 검수, 분석가)과 협업하여
**전략 수립 → 콘텐츠 생성 → 검수 → 멀티채널 발행 → 퍼널 성과 분석**까지 한 화면 흐름에서 처리하는 SaaS 웹 플랫폼.

### 1.2 지향점
- 전문적이지만 단순한 UI — 에이전트 간 핑퐁 과정은 숨기고, 사용자는 **결과물과 지표만 통제**한다.
- 멀티 LLM 하이브리드 (OpenAI + Claude) — 단, **오케스트레이션·상태 관리는 결정적(deterministic) 백엔드 코드**가 담당하고 LLM은 "판단·생성" 단계에만 쓴다. (부록 A-1)
- 사람이 최종 승인한다 (Human-in-the-loop) — 외부 채널에 나가는 모든 콘텐츠는 기본적으로 사용자 승인 후 발행.

### 1.3 비목표 (MVP에서 하지 않는 것)
- 유료 광고(메타 광고, 네이버 검색광고) 집행·입찰 관리
- AI 이미지/영상 생성 (MVP는 사용자가 이미지 업로드)
- 자체 CRM / POS 구축 (외부 데이터는 웹훅·CSV로 수집)
- 완전 자동 발행(무승인) — Phase 3에서 옵션으로 검토

### 1.4 성공 지표 (MVP 출시 후 3개월)
| 지표 | 목표 |
|---|---|
| 브리프 입력 → 발행 승인까지 소요 시간 (중앙값) | 30분 이하 |
| Guardrail 1차 통과율 | 70% 이상 |
| 수동 검토 전환율(서킷 브레이커 발동 비율) | 10% 이하 |
| 캠페인당 LLM 비용 (중앙값) | 1,000원 이하 (§14.4 예산 기준) |
| 발행 실패율 (재시도 후) | 1% 이하 |

---

## 2. 사용자와 핵심 시나리오

### 2.1 페르소나
| 페르소나 | 설명 | 핵심 니즈 |
|---|---|---|
| 1인 사장님 (주 사용자) | 여대 앞 뷰티샵·음식점 운영, 마케팅 전담 인력 없음 | 빠른 콘텐츠 제작, 브랜드 톤 유지, "이번 이벤트 효과 있었나?" |
| 인하우스 마케터 | 5~50인 기업의 마케터 1~2명 | 멀티채널 일괄 발행, A/B 테스트, 주간 리포트 |
| 대행사 담당자 (Phase 2) | 여러 브랜드 관리 | 워크스페이스 내 다중 브랜드, 권한 분리 |

### 2.2 핵심 유저 스토리
- **US-01** 사장님으로서, 브랜드 톤과 금기어를 한 번 등록해두면 모든 콘텐츠가 그 규칙을 지키길 원한다.
- **US-02** 신메뉴 출시 시 "오픈 캠페인" 플레이북을 고르고 간단한 브리프만 입력해 인스타그램·블로그·이메일용 콘텐츠를 받고 싶다.
- **US-03** 감성형/혜택형 두 버전을 비교해 어떤 것이 반응이 좋은지 알고 싶다.
- **US-04** 승인한 콘텐츠를 채널별로 원하는 시각에 예약 발행하고 싶다.
- **US-05** 시험기간 대학생 대상 1+1 오퍼(타겟 캠페인)가 실제 예약/구매로 얼마나 이어졌는지(ROAS) 보고 싶다.
- **US-06** AI가 계속 규칙을 어기면 무한히 돌지 말고 나에게 넘겨서 직접 고치게 해주길 원한다.

### 2.3 End-to-End 흐름

```
[1 브랜드 설정] → [2 채널 연결] → [3 캠페인 브리프 + 플레이북]
      → [4 Lead: 실행 매트릭스 제안] → (사용자 확정)
      → [5 Copywriter: 실행별 A/B 변형 생성] → [6 Guardrail: 규칙 검사 + LLM 채점]
           ├─ 통과 → [7 사용자 검토·수정·승인]
           └─ 반려 → 재작성(피드백 주입) → 재검수 ─(반려 2회)→ [수동 검토 큐]
      → [8 예약 발행 (Publisher 워커)] → [9 트래킹 링크/이벤트 수집]
      → [10 집계(SQL) → Analyst: 인사이트 서술] → [11 대시보드·주간 리포트]
```

---

## 3. 용어 정의

| 용어 | 정의 |
|---|---|
| Workspace | 과금·권한 단위. 하나 이상의 Brand를 가진다. |
| Brand | 브랜드 프로필 + 가이드라인(톤, 금기어, 필수 표기 등). 버전 관리된다. |
| Campaign | 최상위 마케팅 목적 단위. `open`(인지도) 또는 `target`(퍼포먼스) 유형. |
| Offer | 고객에게 제시하는 혜택/가치 제안. 브랜드 단위 라이브러리로 재사용 가능. |
| Audience | 타겟 세그먼트(페르소나). 브랜드 단위 라이브러리로 재사용 가능. |
| Channel Account | 브랜드가 연결한 외부 매체 계정(인스타그램 비즈니스 계정, 이메일 발송 계정 등). |
| Execution | 하나의 캠페인 안에서 `오퍼 × 오디언스 × 채널` 조합 1개. A/B 테스트 단위. |
| Content (Variant) | Execution에 대해 생성된 크리에이티브 1개 버전 (예: `emotional`, `benefit`). |
| Publication | Content를 특정 채널 계정에 특정 시각에 발행하는 작업 1건. |
| Tracking Link | 콘텐츠별 단축 리다이렉트 링크(UTM 포함). 유입(클릭) 측정의 기준. |
| Funnel Event | 노출·클릭·전환·확정 등 원천 이벤트 1건. |
| Context Packet | 에이전트 호출 시 DB에서 조립해 주입하는 정형 JSON (컨텍스트 싱크의 단위). |
| Agent Run | 에이전트 1회 실행 기록 (입력 해시, 출력, 토큰, 비용, 지연시간). |
| Playbook | 캠페인 유형·채널·변형 전략·KPI 가중치를 미리 정의한 템플릿. |

---

## 4. 릴리스 범위

### 4.1 MVP (Phase 1) — 목표 10주
| 영역 | 포함 |
|---|---|
| 계정 | 이메일/구글 로그인, 워크스페이스 1개, 멤버 초대(Owner/Editor/Viewer) |
| 브랜드 | 브랜드 1개 이상, 가이드라인(구조화) + 버전 관리 |
| 채널 | **Instagram(비즈니스 계정, Graph API)**, **Email(ESP 연동)**, **Naver Blog(내보내기 방식)** |
| 캠페인 | Open/Target 유형, 오퍼·오디언스 라이브러리, 실행 매트릭스, 플레이북 3종 |
| 생성 | 실행당 변형 2개(기본), 채널 규격 자동 변환 |
| 검수 | 규칙 엔진 + LLM 채점, 서킷 브레이커, 수동 검토 큐 |
| 발행 | 사용자 승인 → 예약 발행, 재시도, 캘린더 뷰 |
| 트래킹 | 단축 리다이렉트 링크(UTM 자동), 전환 웹훅 + CSV 업로드, 인스타그램 인사이트 수집 |
| 분석 | 캠페인 유형별 KPI 대시보드, Analyst 인사이트, 주간 리포트(이메일) |
| UI | 라이트/다크 모드, 반응형(태블릿 이상 최적화, 모바일은 조회/승인 위주) |

### 4.2 Phase 2
- 전환 픽셀(JS 스니펫), 랜딩페이지/링크인바이오 빌더
- 이메일 A/B 무작위 분할 발송 + 통계적 유의성 판정, 승자 자동 발송
- 다중 브랜드 대행사 플랜, 역할별 승인 워크플로
- 카카오톡 채널(알림톡/친구톡) 연동

### 4.3 Phase 3
- AI 이미지 생성, 자동 발행(무승인) 옵션, 예산 최적화 추천, 유료 광고 연동

---

## 5. 시스템 아키텍처

### 5.1 구성도

```
                ┌──────────────────────────── Web (Next.js, App Router) ────────────────────────────┐
                │  Dashboard · Campaign Split View · Review Queue · Calendar · Analytics · Settings │
                └───────────────┬───────────────────────────────────────────────▲────────────────────┘
                                │ REST (JSON) / SSE (에이전트 진행 상황)            │
                ┌───────────────▼───────────────────────────────────────────────┴───────────────────┐
                │ API Server (Next.js Route Handlers or NestJS)                                       │
                │  - Auth / RBAC / Workspace 격리                                                     │
                │  - Orchestrator (결정적 상태 머신, LLM 아님)                                         │
                │  - Context Packet Builder (DB → JSON)                                               │
                │  - Guardrail Rule Engine (정규식/사전/길이/법규)                                     │
                │  - Metrics Aggregator (SQL)                                                         │
                └───────┬───────────────────┬────────────────────┬────────────────────┬───────────────┘
                        │ enqueue           │                    │                    │
                ┌───────▼────────┐  ┌───────▼────────┐  ┌────────▼───────┐  ┌─────────▼─────────┐
                │ Job Queue      │  │ LLM Gateway    │  │ PostgreSQL     │  │ Object Storage    │
                │ (pg-boss)      │  │ - provider 추상화│  │ (SSOT)         │  │ (이미지 에셋)       │
                │ gen/review/    │  │ - 재시도/서킷    │  │                │  │                   │
                │ publish/sync   │  │ - 비용 계측      │  │                │  │                   │
                └───────┬────────┘  └──┬──────────┬──┘  └────────────────┘  └───────────────────┘
                        │              │          │
              ┌─────────▼───────┐  ┌───▼───┐  ┌───▼────┐
              │ Workers          │  │OpenAI │  │ Claude │
              │ - Generation     │  └───────┘  └────────┘
              │ - Publisher      │──▶ Instagram Graph API / ESP API
              │ - Insights Sync  │◀── Instagram Insights / ESP 이벤트 웹훅
              │ - Report         │
              └──────────────────┘
   Tracking Edge: GET /r/{code} → 클릭 이벤트 기록 → 302 (UTM 부착된 랜딩 URL)
   Conversion In: POST /api/v1/track/conversions (웹훅, HMAC 서명) / CSV 업로드
```

### 5.2 기술 스택 (권장)
| 레이어 | 선택 | 이유 |
|---|---|---|
| 언어 | TypeScript (프론트·백 단일 언어) | 타입 공유, JSON 스키마(Zod) 재사용 |
| 웹 | Next.js (App Router) + Tailwind CSS + shadcn/ui | 디자인 토큰을 CSS 변수로 매핑, 다크모드 용이 |
| 차트 | Recharts 또는 ECharts | 퍼널/시계열 차트 |
| DB | PostgreSQL 16 | JSONB, 배열, RLS |
| ORM | Drizzle ORM (또는 Prisma) | SQL 친화적, 마이그레이션 |
| 큐 | pg-boss (Postgres 기반) | 별도 Redis 없이 MVP 운영, 예약 작업(`startAfter`) 지원 |
| 인증 | Auth.js (또는 Supabase Auth) | 이메일 매직링크 + Google OAuth |
| 스토리지 | S3 호환 (R2/S3) | 이미지 에셋 |
| 검증 | Zod (LLM 출력 스키마 검증) | 구조화 출력 실패 시 재시도 근거 |
| 관측 | OpenTelemetry + Sentry, LLM 호출은 `agent_runs` 테이블 | 비용·지연·실패 추적 |
| 비밀 관리 | KMS(또는 libsodium + 환경변수 마스터키)로 채널 토큰 봉투 암호화 | §14.2 |

### 5.3 설계 원칙
1. **DB가 유일한 진실의 근원(SSOT).** 에이전트는 DB에 직접 쓰지 않는다. 에이전트 출력 → Zod 검증 → 백엔드가 저장.
2. **오케스트레이션은 코드가 한다.** "다음에 어떤 에이전트를 부를지"는 상태 머신이 결정한다. LLM에게 흐름 제어를 맡기지 않는다.
3. **숫자는 SQL이 계산하고, LLM은 해석만 한다.** Analyst는 집계 결과 JSON을 받아 서술만 하며, 수치를 새로 만들지 않는다.
4. **모든 LLM 호출은 재현 가능해야 한다.** `context_packet_hash`, 모델명, 프롬프트 버전, 파라미터를 `agent_runs`에 기록.
5. **Provider 추상화.** `LLMGateway.complete({role, schema, packet})` 인터페이스 뒤에서 OpenAI/Claude를 교체 가능하게 한다(장애 시 폴백 포함).

---

## 6. 에이전트 설계와 LLM 라우팅

### 6.1 에이전트 정의
| 에이전트 | 역할 | 기본 Provider | 입력 | 출력 | 실행 주체 |
|---|---|---|---|---|---|
| **Lead (Strategist)** | 브리프 해석 → 실행 매트릭스·메시지 전략·KPI 제안 | OpenAI | Brand + Campaign 브리프 + Playbook | `StrategyPlan` JSON | Generation Worker |
| **Copywriter** | 실행별 A/B 변형 카피 생성, 채널 규격 반영 | Claude | Context Packet + 변형 전략 | `VariantSet` JSON | Generation Worker |
| **Guardrail** | ① 규칙 엔진(코드) ② LLM 채점(루브릭) | 규칙: 코드 / 채점: Claude (생성과 다른 프롬프트, temperature 0) | Content + Brand 가이드라인 + 채널 규칙 | `GuardrailReport` JSON | Generation Worker |
| **Analyst** | 집계 지표 해석, 병목 진단, 다음 액션 제안 | OpenAI | `MetricsSnapshot` JSON (SQL 결과) | `InsightReport` JSON | Report Worker |
| Publisher | 채널 API 발행 (LLM 아님) | — | Publication | 외부 post id | Publisher Worker |

> UI의 "에이전트 팀 실시간 작업 피드"는 `agent_runs` 테이블 상태 변화를 SSE로 스트리밍한 것이다.

### 6.2 모델 설정
모델명은 코드에 하드코딩하지 않고 환경 변수/설정 테이블로 관리한다.

```env
LLM_LEAD_PROVIDER=openai        LLM_LEAD_MODEL=<openai-model-id>
LLM_COPY_PROVIDER=anthropic     LLM_COPY_MODEL=<claude-model-id>
LLM_JUDGE_PROVIDER=anthropic    LLM_JUDGE_MODEL=<claude-model-id>
LLM_ANALYST_PROVIDER=openai     LLM_ANALYST_MODEL=<openai-model-id>
LLM_FALLBACK_ENABLED=true       # 한쪽 provider 장애 시 다른 provider로 폴백
```

### 6.3 Context Packet (컨텍스트 싱크)
모든 에이전트 호출 직전 백엔드가 DB에서 조립한다. 에이전트 간 "대화"로 상태를 넘기지 않는다.

```json
{
  "packet_version": "1",
  "brand": {
    "brand_id": "uuid",
    "version": 3,
    "name": "여대 앞 뷰티샵 OO",
    "voice": { "tone_keywords": ["세련된", "산뜻한"], "formality": "polite_casual", "emoji_policy": "max_2" },
    "banned_terms": ["최저가", "무조건"],
    "required_phrases": [],
    "target_demographic": { "age": "20s", "gender": "all" },
    "guidelines_text": "..."
  },
  "campaign": { "campaign_id": "uuid", "type": "target", "objective": "시험기간 재방문 유도", "start_at": "...", "end_at": "..." },
  "execution": {
    "execution_id": "uuid",
    "offer": { "title": "시험기간 1+1 세트", "details": { "type": "bundle", "valid_until": "2026-12-20" }, "landing_url": "https://..." },
    "audience": { "persona_name": "시험기간 20대 대학생", "pain_points": ["시간 부족"], "interests": ["가성비", "카페"] },
    "channel": { "type": "instagram", "spec": { "caption_max_chars": 2200, "hashtag_max": 30, "link_clickable": false } }
  },
  "variant_strategies": ["emotional", "benefit"],
  "prior_feedback": [ { "attempt": 1, "violations": ["banned_term:최저가"], "judge_comments": "..." } ],
  "tracking": { "short_url": "https://mk.ag/r/Ab3x9", "display_hint": "프로필 링크 안내 문구 사용" }
}
```

- `packet_hash = sha256(canonical_json(packet))` 를 `agent_runs.context_packet_hash`에 저장.
- 브랜드 가이드라인 수정 시 `brands.guideline_version` 증가 → 진행 중 캠페인에는 **생성 시점 버전**을 고정 사용(재생성 시에만 최신 반영).

---

## 7. 기능 요구사항 (FR)

각 FR은 `수용 기준(AC)`을 만족해야 완료로 본다.

### FR-01 인증·워크스페이스
- 이메일 매직링크, Google OAuth 로그인.
- 가입 시 개인 워크스페이스 자동 생성. 역할: `owner`, `editor`, `viewer`.
- **AC**: 다른 워크스페이스의 리소스 ID로 API 호출 시 404 반환(존재 여부 노출 금지). 모든 쿼리는 `workspace_id` 조건 필수(+ Postgres RLS).

### FR-02 브랜드 관리
- 필드: 이름, 업종, 설명, 타겟 인구통계(JSON), **구조화된 가이드라인**:
  - `tone_keywords[]`, `formality`(`formal`/`polite_casual`/`casual`), `emoji_policy`(`none`/`max_2`/`free`)
  - `banned_terms[]` (금기어, 정확 일치 + 변형 정규식 옵션)
  - `required_phrases[]` (예: 상호명 표기)
  - `guidelines_text` (자유 서술, LLM 채점에 사용)
  - `sample_copies[]` (좋은 예시 0~5개, few-shot)
- 저장 시 `guideline_version` +1, 이전 버전은 `brand_guideline_versions`에 스냅샷.
- **AC**: 금기어 추가 후 생성된 콘텐츠에서 해당 단어가 등장하면 규칙 엔진이 hard violation으로 반려한다.

### FR-03 채널 연결
| 채널 | 연결 방식 | 발행 방식 | 성과 수집 |
|---|---|---|---|
| Instagram | Meta OAuth (비즈니스/크리에이터 계정 + 연결된 페이스북 페이지 필요) | Graph API 컨테이너 생성 → publish. **이미지 1장 이상 필수** | Insights API (노출·도달·저장·공유), 6시간 주기 |
| Email | ESP API 키(예: 스티비, SendGrid 등 — §16 결정) + 발신자 인증 | ESP 캠페인 생성·예약 | ESP 웹훅(발송·오픈·클릭·수신거부) |
| Naver Blog | 연결 없음 | **내보내기 방식**: 서식 적용된 본문 복사 / HTML 다운로드 → 사용자가 직접 게시 후 게시 URL 입력 | 단축 링크 클릭만 수집 |
- 토큰은 암호화 저장, 만료 7일 전 알림 + 자동 갱신(가능한 경우).
- **AC**: 토큰 만료된 채널에 예약된 발행은 발행 24시간 전에 사용자에게 경고, 발행 시점까지 미해결이면 `failed(auth_expired)`.

### FR-04 캠페인 브리프
- 필드: 이름, 유형(`open`/`target`), 목적, 플레이북, 기간(`start_at`, `end_at`), 예산(선택, 원), 대상 채널 계정(복수), 랜딩 URL(기본값).
- 유형별 필수 입력:

| 항목 | Open | Target |
|---|---|---|
| Offer | 선택 (없으면 "브랜드 메시지형") | **필수** 1개 이상 |
| Audience | 선택 (없으면 브랜드 기본 타겟을 "broad" 오디언스로 사용) | **필수** 1개 이상 |
| 예산 | 선택 | 권장 (ROAS/CAC 계산에 필요, 없으면 해당 KPI "N/A") |
| 주 KPI | 유입(노출·클릭·CTR) | 전환·확정(CVR, ROAS, CAC) |

- **AC**: Target 캠페인에서 Offer 또는 Audience 없이 "생성 시작" 시 400 + 필드 에러.

### FR-05 실행 매트릭스 (Execution Matrix)
- Lead 에이전트가 `오퍼 × 오디언스 × 채널` 조합 중 의미 있는 조합과 우선순위를 **제안**한다. 사용자가 체크박스로 확정.
- 상한: 캠페인당 실행 **최대 12개**, 실행당 변형 **최대 3개** → 콘텐츠 최대 36개.
- 생성 전 **예상 비용/소요 시간**을 표시(실행 수 × 변형 수 × 평균 토큰 기준).
- **AC**: 동일 `(campaign, offer, audience, channel_account)` 조합 중복 생성 불가(UNIQUE).

### FR-06 콘텐츠 생성 (Multi-Variant)
- 실행당 기본 변형 2개: `emotional`(감성형), `benefit`(혜택 강조형). 플레이북이 변형 전략을 바꿀 수 있음(예: `urgency`, `social_proof`).
- 채널별 출력 형식:
  - Instagram: `caption`, `hashtags[]`(≤ 30), `first_comment`(선택), `cta_text`, `image_brief`(사용자가 이미지를 준비할 수 있도록 가이드)
  - Email: `subject`(≤ 40자 권장), `preheader`, `body_html`, `cta_text` — 광고성일 경우 제목 앞 `(광고)` 자동 부착
  - Naver Blog: `title`, `body_markdown`(소제목 구조), `tags[]`
- 생성은 실행 단위 병렬, 변형은 한 번의 호출에서 함께 생성(톤 차별화 보장, 비용 절감).
- 사용자는 생성 결과를 인라인 편집 가능. **사용자 편집본은 Guardrail 규칙 엔진만 재실행**(LLM 재채점은 버튼으로 선택 실행).
- **AC**: 변형 간 본문 유사도(정규화 후 토큰 Jaccard)가 0.8 이상이면 "변형 차별성 부족" 경고.

### FR-07 Guardrail Engine
2단계로 구성한다.

**① 규칙 엔진 (코드, 결정적)** — 위반 시 `hard`면 즉시 반려
| 규칙 | 심각도 | 예 |
|---|---|---|
| 금기어 포함 | hard | `banned_terms` 일치 |
| 채널 길이/개수 초과 | hard | 인스타 캡션 > 2,200자, 해시태그 > 30 |
| 이메일 광고 표기 누락 | hard | 제목 `(광고)` 미포함, 수신거부 링크 누락 |
| 필수 문구 누락 | soft (-10) | 상호명 미표기 |
| 이모지 정책 위반 | soft (-5) | `max_2`인데 5개 |
| 과장·단정 표현 사전 | soft (-10) | "100% 효과", "무조건" (기본 사전 제공) |
| 트래킹 링크 누락 | soft (-5) | CTA가 있는데 링크/안내 없음 |

**② LLM 채점 (Claude, 루브릭)** — 각 항목 0~점수
| 항목 | 배점 |
|---|---|
| 톤앤매너 일치 (tone_keywords, formality) | 40 |
| 브랜드·오디언스 적합성 | 25 |
| 오퍼 정확성 (혜택·기한·조건을 왜곡하지 않았는가) | 20 |
| 명확성·CTA | 15 |

**최종 판정**
```
llm_score   = Σ 루브릭 점수 (0~100)
final_score = clamp(llm_score − Σ soft_penalty, 0, 100)
pass = (hard_violations == 0) AND (final_score >= brand.guardrail_threshold)   # 기본 80
```
- 결과는 `guardrail_reviews`에 시도(attempt)별로 저장, `contents.guardrail_score`에는 최신 값 캐시.
- 오퍼 정확성은 LLM 외에 **코드로 교차검증**: 오퍼의 할인율·기한 숫자가 본문 숫자와 다르면 hard violation.
- **AC**: 동일 입력에 대해 규칙 엔진 결과는 항상 동일하다(단위 테스트로 보장).

### FR-08 서킷 브레이커
세 가지 레벨로 정의한다.

| 레벨 | 조건 | 동작 |
|---|---|---|
| **콘텐츠 레벨 (검수 루프)** | Guardrail 반려 누적 `2회` (`MAX_REJECTIONS=2`, 브랜드별 설정 가능) | 루프 중단 → `needs_manual_review` 상태로 **수동 검토 큐** 이동. 마지막 버전과 위반 내역 함께 제공 |
| 〃 (조기 중단) | 2회차 위반 항목이 1회차와 동일(같은 규칙 ID) | 2회차 재작성 생략하고 즉시 수동 검토 (개선 가능성 낮음) |
| **캠페인 레벨 (비용)** | 캠페인 누적 LLM 비용 > `campaign_token_budget` (기본 3,000원 상당) | 신규 생성 작업 일시정지, 사용자에게 계속 여부 확인 |
| **Provider 레벨 (장애)** | 해당 provider 연속 5회 실패(5xx/timeout) | 60초간 open → 폴백 provider 사용(설정 시) 또는 작업 지연 재시도. half-open에서 1건 성공 시 close |

- API 오류 재시도(지수 백오프 1s/4s/16s, 최대 3회)는 **반려 횟수에 포함하지 않는다.**
- 재작성 시 Copywriter에게 `prior_feedback`(위반 규칙, 루브릭 코멘트)을 Context Packet에 주입.
- **AC**: 어떤 입력에서도 콘텐츠 1개당 Copywriter 호출은 최대 `1 + MAX_REJECTIONS - 1 = 2`회 (초기 1 + 재작성 1), Judge 호출은 최대 2회.

> 루프 정의: 생성(1) → 검수 → 반려#1 → 재작성(2) → 검수 → 반려#2 → **수동 검토**. 즉 "2회 반려 시 중단" = 재작성은 1번만.

### FR-09 검토·승인 (Review Queue)
- 콘텐츠 상태가 `review_passed` 또는 `needs_manual_review`인 항목을 모아 보여준다.
- 사용자 동작: 수정, 재검수, **승인(approve)**, 반려(폐기), 변형 재생성(서킷 카운터 리셋, 단 캠페인 비용 예산은 유지).
- `needs_manual_review` 항목은 사용자가 수정 후 규칙 엔진 hard violation이 0이어야 승인 가능(LLM 점수는 경고만).
- **AC**: 승인되지 않은 콘텐츠는 어떤 경로로도 Publication을 생성할 수 없다(API 레벨 검증).

### FR-10 발행 및 예약 (Publishing)
- 승인된 콘텐츠를 채널 계정 + 발행 시각 지정 → `publications` 생성 → 큐에 `startAfter=scheduled_at` 등록.
- 인스타그램: 이미지 에셋 미첨부 시 예약 불가.
- 이메일: 수신자 목록(ESP의 리스트/세그먼트 ID) 선택 필수. 21:00~08:00 발송은 경고(야간 광고 전송 별도 동의 필요).
- 같은 실행의 A/B 변형 발행 방식:
  - Email: 리스트 무작위 분할(Phase 2 자동, MVP는 ESP의 A/B 기능 사용 또는 두 세그먼트 수동 지정)
  - Instagram/Blog: 무작위 분할 불가 → **시차 발행 비교**(기본 48시간 간격, 같은 요일·시간대 권장). 결과 화면에 "통제되지 않은 비교" 배지 표시.
- 실패 처리: 일시 오류 3회 재시도(1m/5m/15m), 영구 오류(권한, 규격)는 즉시 `failed` + 알림.
- **멱등성**: `publications.idempotency_key` 로 중복 발행 방지. 워커는 외부 API 호출 전 `publishing` 상태 전이를 `UPDATE ... WHERE status='scheduled'`로 선점.
- 네이버 블로그(내보내기): 상태는 `awaiting_manual_post` → 사용자가 게시 URL 입력 시 `published`.
- **AC**: 워커 2개가 동시에 같은 publication을 집어도 외부 발행은 1회만 일어난다(통합 테스트).

### FR-11 트래킹 링크 (유입)
- Publication 생성 시 `tracking_links` 자동 생성: `https://{track_domain}/r/{code}` (code: base62 7자).
- 리다이렉트 대상 URL에 UTM 자동 부착:

| 파라미터 | 값 |
|---|---|
| `utm_source` | 채널 (`instagram`, `naver_blog`, `email`) |
| `utm_medium` | `social` / `blog` / `email` |
| `utm_campaign` | `campaign.slug` |
| `utm_content` | `content.short_id` (변형 식별) |
| `utm_id` | `publication.short_id` |
| `mk_cid` | 클릭 ID (전환 매칭용, 1st-party 쿠키에도 저장) |

- `GET /r/{code}`: 클릭 이벤트 기록(봇 UA 필터, 동일 IP+UA 30초 내 중복 제거) → 302.
- **인스타그램은 캡션 링크가 클릭되지 않는다.** → 캡션에는 "프로필 링크 확인" 문구를 넣고, 링크는 프로필 링크 / 스토리 링크 스티커용으로 제공. Phase 2에서 캠페인별 링크인바이오 페이지 제공.
- **AC**: 리다이렉트 응답 p95 < 100ms, 이벤트 기록 실패 시에도 리다이렉트는 성공해야 함(비동기 기록).

### FR-12 전환·확정 이벤트 수집
| 방식 | MVP | 설명 |
|---|---|---|
| 웹훅 | ✅ | `POST /api/v1/track/events` (워크스페이스별 HMAC 서명). 예약 시스템/쇼핑몰에서 `mk_cid` 또는 `utm_content`와 함께 전송 |
| CSV 업로드 | ✅ | 날짜, 쿠폰코드/utm_content, 건수, 매출 → 수동 귀속 |
| 쿠폰 코드 매칭 | ✅ | Offer별 고유 쿠폰 코드 발급 → 오프라인 매장 확정 귀속 (소상공인 핵심) |
| JS 픽셀 | Phase 2 | 랜딩페이지 이벤트 자동 수집 |
- 중복 방지: `(workspace_id, source, external_event_id)` UNIQUE.
- 귀속 규칙(MVP): **마지막 클릭 기준, 7일 윈도**. 쿠폰 코드 매칭은 해당 Offer의 실행들에 동일 가중치로 분배하지 않고 `utm_content`가 없으면 "Offer 레벨"로만 집계.

### FR-13 분석 대시보드
- 지표 계산식은 §13. 캠페인 유형별 기본 KPI 카드와 가중치는 플레이북/캠페인 설정에서 변경 가능.
- 뷰: 캠페인 요약 카드, 퍼널 차트(단계별 수치·전환율), 채널별 비교, 변형(A/B) 비교 테이블, 시계열.
- 데이터 신선도 표시: 각 카드에 "마지막 업데이트 HH:mm" (실시간이 아님을 명시, §부록 A-9).
- **AC**: 대시보드 수치는 `funnel_daily_rollups` + 당일 원천 이벤트 합산과 정확히 일치(검증 쿼리 테스트).

### FR-14 Analyst 인사이트 & 리포트
- 입력: SQL로 계산된 `MetricsSnapshot` (기간, KPI, 전기 대비, 변형 비교, 표본 수).
- 출력: 요약 3줄, 병목 단계 1개, 근거 수치(입력에 존재하는 값만 인용), 다음 액션 2~3개.
- **환각 방지**: 출력의 모든 숫자를 입력 JSON 값과 대조(허용 오차 반올림 ±0.1), 불일치 시 재생성 1회 → 실패 시 수치 없는 요약으로 대체.
- 표본 부족 시(변형별 클릭 < 100 또는 전환 < 20) "판단 보류" 문구를 강제.
- 주간 리포트: 매주 월 09:00(워크스페이스 타임존) 이메일 + 앱 내 보관. 월간 리포트는 Phase 2.

### FR-15 플레이북
MVP 기본 3종(시스템 제공, 복제 후 수정 가능):

| 플레이북 | 유형 | 기본 채널 | 변형 전략 | KPI 가중치 (유입/전환/확정) |
|---|---|---|---|---|
| 신제품·신메뉴 런칭 | open | Instagram, Blog | emotional, benefit | 0.6 / 0.3 / 0.1 |
| 기간 한정 프로모션 | target | Instagram, Email | benefit, urgency | 0.2 / 0.4 / 0.4 |
| 이탈 고객 복구 (재방문) | target | Email | emotional, benefit | 0.1 / 0.3 / 0.6 |

### FR-16 에이전트 작업 피드
- 대시보드 중앙 영역. `agent_runs` 의 `queued → running → succeeded/failed` 를 SSE로 전달.
- 사용자에게는 에이전트 이름·작업 요약·진행 상태만 노출(프롬프트 원문은 관리자만).

---

## 8. 상태 머신

### 8.1 Campaign
```
draft ──(생성 시작)──▶ generating ──(모든 콘텐츠 검수 완료)──▶ in_review
in_review ──(1개 이상 발행 예약)──▶ active ──(end_at 경과 또는 수동)──▶ completed
draft/in_review/active ──(사용자)──▶ archived
```

### 8.2 Content
```
pending ─▶ generating ─▶ checking ─┬─▶ review_passed ──(사용자 승인)──▶ approved
                                   ├─▶ revising ─▶ checking  (반려 < MAX_REJECTIONS)
                                   └─▶ needs_manual_review ──(사용자 수정+승인)──▶ approved
generating ──(API 재시도 소진)──▶ generation_failed ──(사용자 재시도)──▶ generating
review_passed/needs_manual_review ──(사용자)──▶ discarded
approved ──(사용자 편집)──▶ checking   # 승인 후 수정하면 재검수
```
> 원본의 `scheduled`, `published`는 Content가 아니라 **Publication** 상태로 이동(콘텐츠 1개를 여러 계정·시각에 발행 가능).

### 8.3 Publication
```
scheduled ─▶ publishing ─┬─▶ published
                         ├─▶ retrying ─▶ publishing   (일시 오류, 최대 3회)
                         └─▶ failed                    (영구 오류 또는 재시도 소진)
scheduled ──(사용자)──▶ cancelled
awaiting_manual_post ──(게시 URL 입력)──▶ published     # 네이버 블로그
```

### 8.4 Agent Run
```
queued ─▶ running ─┬─▶ succeeded
                   ├─▶ failed (schema_invalid | provider_error | budget_exceeded | circuit_open)
                   └─▶ cancelled
```

---

## 9. 데이터베이스 스키마 (PostgreSQL DDL)

> 모든 테이블: `id UUID PK DEFAULT gen_random_uuid()`, `created_at`, `updated_at`. 테넌트 테이블은 `workspace_id` 보유 + RLS.
> enum은 확장성을 위해 `TEXT + CHECK`로 정의.

```sql
-- ========== 테넌시 ==========
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  name TEXT,
  locale TEXT NOT NULL DEFAULT 'ko-KR',
  theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light','dark','system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  plan TEXT NOT NULL DEFAULT 'free',
  monthly_llm_budget_krw INT NOT NULL DEFAULT 30000,
  webhook_secret_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','editor','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ========== 브랜드 ==========
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  target_demographic JSONB NOT NULL DEFAULT '{}',   -- {"age":"20s","gender":"all","vibe":"세련되고 산뜻함"}
  tone_keywords TEXT[] NOT NULL DEFAULT '{}',
  formality TEXT NOT NULL DEFAULT 'polite_casual' CHECK (formality IN ('formal','polite_casual','casual')),
  emoji_policy TEXT NOT NULL DEFAULT 'max_2' CHECK (emoji_policy IN ('none','max_2','free')),
  banned_terms TEXT[] NOT NULL DEFAULT '{}',
  required_phrases TEXT[] NOT NULL DEFAULT '{}',
  guidelines_text TEXT NOT NULL DEFAULT '',
  sample_copies TEXT[] NOT NULL DEFAULT '{}',
  guardrail_threshold INT NOT NULL DEFAULT 80 CHECK (guardrail_threshold BETWEEN 0 AND 100),
  max_rejections INT NOT NULL DEFAULT 2 CHECK (max_rejections BETWEEN 1 AND 5),
  guideline_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE brand_guideline_versions (
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,          -- 위 가이드라인 필드 전체 스냅샷
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, version)
);

-- ========== 채널 ==========
CREATE TABLE channel_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('instagram','naver_blog','email')),
  display_name TEXT NOT NULL,                 -- @handle, 발신자명 등
  external_account_id TEXT,
  credentials_encrypted TEXT,                 -- 봉투 암호화(JSON: access_token, refresh_token, ...)
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','expired','revoked','export_only')),
  settings JSONB NOT NULL DEFAULT '{}',       -- email: {"list_ids":[...], "sender":"..."}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, channel_type, external_account_id)
);

-- ========== 플레이북 ==========
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,   -- NULL = 시스템 기본
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('open','target')),
  default_channels TEXT[] NOT NULL,
  variant_strategies TEXT[] NOT NULL DEFAULT '{emotional,benefit}',
  kpi_weights JSONB NOT NULL,                 -- {"acquisition":0.6,"conversion":0.3,"confirmation":0.1}
  brief_template JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== 캠페인 ==========
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  playbook_id UUID REFERENCES playbooks(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,                          -- utm_campaign
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('open','target')),
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generating','in_review','active','completed','archived')),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  budget_krw BIGINT,                           -- 광고·제작비 (ROAS/CAC용)
  default_landing_url TEXT,
  kpi_weights JSONB NOT NULL,                  -- 플레이북에서 복사 후 수정 가능
  brand_guideline_version INT NOT NULL,        -- 생성 시점 고정
  llm_budget_krw INT NOT NULL DEFAULT 3000,
  llm_spent_krw NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug),
  CHECK (end_at IS NULL OR start_at IS NULL OR end_at > start_at)
);

-- 오퍼/오디언스: 브랜드 라이브러리 (캠페인 간 재사용)
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                         -- "런칭 기념 말차 소바 세트 20% 할인"
  offer_type TEXT NOT NULL CHECK (offer_type IN ('percent_off','amount_off','bundle','gift','free_trial','none')),
  discount_details JSONB NOT NULL DEFAULT '{}',-- {"percent":20,"min_order":15000}
  coupon_code TEXT,                            -- 오프라인 확정 귀속용
  valid_from DATE,
  valid_until DATE,
  terms TEXT,                                  -- 유의사항
  landing_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, coupon_code)
);

CREATE TABLE audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL,
  description TEXT,
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  is_broad BOOLEAN NOT NULL DEFAULT false,     -- 오픈 캠페인 기본 오디언스
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_offers (
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id),
  PRIMARY KEY (campaign_id, offer_id)
);
CREATE TABLE campaign_audiences (
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  audience_id UUID REFERENCES audiences(id),
  PRIMARY KEY (campaign_id, audience_id)
);

-- ========== 실행 / 콘텐츠 ==========
CREATE TABLE campaign_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id),               -- open 캠페인은 NULL 허용
  audience_id UUID REFERENCES audiences(id),         -- open 캠페인은 NULL 허용 (broad)
  channel_account_id UUID NOT NULL REFERENCES channel_accounts(id),
  priority INT NOT NULL DEFAULT 0,
  strategy_note TEXT,                                -- Lead 제안 메시지 전략
  ab_mode TEXT NOT NULL DEFAULT 'sequential' CHECK (ab_mode IN ('randomized_split','sequential','none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- NULL 포함 조합 중복 방지
CREATE UNIQUE INDEX uq_execution_combo ON campaign_executions
  (campaign_id, COALESCE(offer_id,'00000000-0000-0000-0000-000000000000'),
   COALESCE(audience_id,'00000000-0000-0000-0000-000000000000'), channel_account_id);

CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL REFERENCES campaign_executions(id) ON DELETE CASCADE,
  short_id TEXT UNIQUE NOT NULL,                     -- utm_content
  variant_key TEXT NOT NULL,                         -- 'emotional','benefit','urgency'...
  version_name TEXT NOT NULL,                        -- 'v1_emotional'
  body JSONB NOT NULL DEFAULT '{}',                  -- 채널별 구조 (§11.3)
  edited_by_user BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','generating','checking','revising','review_passed','needs_manual_review',
    'approved','generation_failed','discarded')),
  rejection_count INT NOT NULL DEFAULT 0,
  guardrail_score INT CHECK (guardrail_score BETWEEN 0 AND 100),   -- 최신 캐시
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (execution_id, variant_key)
);

CREATE TABLE guardrail_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  attempt INT NOT NULL,
  rule_violations JSONB NOT NULL DEFAULT '[]',       -- [{"rule_id":"banned_term","severity":"hard","match":"최저가","path":"caption"}]
  rubric_scores JSONB,                               -- {"tone":34,"fit":20,"offer":20,"clarity":12}
  llm_score INT,
  soft_penalty INT NOT NULL DEFAULT 0,
  final_score INT NOT NULL,
  passed BOOLEAN NOT NULL,
  judge_comments TEXT,
  agent_run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, attempt)
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INT, height INT, bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE content_assets (
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id),
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (content_id, asset_id)
);

-- ========== 발행 / 트래킹 ==========
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents(id),
  channel_account_id UUID NOT NULL REFERENCES channel_accounts(id),
  short_id TEXT UNIQUE NOT NULL,                     -- utm_id
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled','publishing','retrying','published','failed','cancelled','awaiting_manual_post')),
  idempotency_key TEXT UNIQUE NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  last_error JSONB,
  external_post_id TEXT,
  external_url TEXT,
  published_at TIMESTAMPTZ,
  rendered_payload JSONB,                            -- 실제 전송한 채널 포맷 (감사용)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_publications_due ON publications (status, scheduled_at);

CREATE TABLE tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,                         -- base62 7자
  destination_url TEXT NOT NULL,                     -- UTM 부착 완료 URL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 원천 이벤트 (append-only). 월 단위 파티셔닝 권장.
CREATE TABLE funnel_events (
  id BIGSERIAL,
  workspace_id UUID NOT NULL,
  campaign_id UUID,
  execution_id UUID,
  content_id UUID,
  publication_id UUID,
  offer_id UUID,
  stage TEXT NOT NULL CHECK (stage IN ('acquisition','conversion','confirmation')),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression','reach','click','landing_view','cta_click','signup','add_to_cart',
    'email_open','purchase','reservation','coupon_redeem')),
  quantity INT NOT NULL DEFAULT 1,                   -- 플랫폼 집계값(노출 등)은 수량으로 적재
  revenue_krw BIGINT NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('redirect','platform_api','esp_webhook','webhook','csv','manual')),
  external_event_id TEXT,                            -- 중복 방지 키
  click_id TEXT,                                     -- mk_cid
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE UNIQUE INDEX uq_funnel_dedup ON funnel_events (workspace_id, source, external_event_id, occurred_at)
  WHERE external_event_id IS NOT NULL;
CREATE INDEX idx_funnel_campaign_time ON funnel_events (campaign_id, occurred_at);

-- 플랫폼 지표(노출 등)는 "누적 스냅샷"으로 오므로 별도 저장 후 증분 계산
CREATE TABLE platform_metric_snapshots (
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,                              -- impressions, reach, saves, shares, likes, comments
  value BIGINT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (publication_id, metric, captured_at)
);

CREATE TABLE funnel_daily_rollups (
  workspace_id UUID NOT NULL,
  date DATE NOT NULL,                                -- 워크스페이스 타임존 기준
  campaign_id UUID NOT NULL,
  content_id UUID,                                   -- NULL = Offer 레벨 귀속(쿠폰 등)
  channel_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  revenue_krw BIGINT NOT NULL,
  UNIQUE NULLS NOT DISTINCT (workspace_id, date, campaign_id, content_id, channel_type, event_type)
);

CREATE TABLE campaign_costs (                         -- ROAS/CAC 분모
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('ad_spend','production','discount','llm','other')),
  amount_krw BIGINT NOT NULL,
  incurred_on DATE NOT NULL,
  memo TEXT
);

-- ========== 에이전트 / 감사 ==========
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id UUID,
  content_id UUID,
  agent TEXT NOT NULL CHECK (agent IN ('lead','copywriter','guardrail_judge','analyst')),
  status TEXT NOT NULL CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  failure_reason TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  context_packet_hash TEXT NOT NULL,
  input_tokens INT, output_tokens INT, cached_tokens INT,
  cost_krw NUMERIC(10,2),
  latency_ms INT,
  output JSONB,
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_runs_feed ON agent_runs (workspace_id, created_at DESC);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id UUID NOT NULL,
  actor_user_id UUID,
  action TEXT NOT NULL,                              -- content.approve, publication.cancel, brand.update ...
  target_type TEXT NOT NULL,
  target_id UUID,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**원본 대비 핵심 변경 요약** (상세는 부록 A-4)
- `Channels`(전역) → `channel_accounts`(브랜드 소유). `Brands.user_id` → `workspace_id`.
- `Campaign_Executions.variant_group_id` 제거 — Execution 자체가 A/B 그룹, 변형은 `contents.variant_key`.
- `Contents.status`의 `scheduled/published` → `publications`로 분리.
- `Funnel_Logs` → `funnel_events`(원천) + `platform_metric_snapshots` + `funnel_daily_rollups`(집계).
- 신규: `workspaces`, `brand_guideline_versions`, `playbooks`, `guardrail_reviews`, `assets`, `tracking_links`, `campaign_costs`, `agent_runs`, `audit_logs`.

---

## 10. API 명세 (REST, `/api/v1`)

공통: JSON, 인증 쿠키(세션) 또는 Bearer. 헤더 `X-Workspace-Id` 필수. 에러 형식:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "offer_ids": "target 캠페인은 필수" } } }
```
목록 API는 커서 페이지네이션(`?cursor=&limit=20`).

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET/POST | `/brands` | 브랜드 목록/생성 | viewer/editor |
| GET/PATCH | `/brands/{id}` | 조회/수정 (수정 시 가이드라인 버전 +1) | viewer/editor |
| GET | `/brands/{id}/guideline-versions` | 버전 이력 | viewer |
| POST | `/brands/{id}/guardrail/test` | 임의 텍스트로 규칙 엔진 테스트 | editor |
| GET/POST | `/brands/{id}/offers`, `/brands/{id}/audiences` | 라이브러리 | editor |
| GET | `/channel-accounts` | 연결 채널 목록 | viewer |
| GET | `/channel-accounts/oauth/{type}/start` | OAuth 시작 (instagram) | owner |
| GET | `/channel-accounts/oauth/{type}/callback` | OAuth 콜백 | — |
| POST | `/channel-accounts` | API 키형/내보내기형 채널 등록 (email, naver_blog) | owner |
| GET | `/playbooks` | 시스템+워크스페이스 플레이북 | viewer |
| POST | `/campaigns` | 캠페인 생성(draft) | editor |
| GET/PATCH | `/campaigns/{id}` | 조회/수정 | viewer/editor |
| POST | `/campaigns/{id}/plan` | Lead 실행 매트릭스 제안 (비동기, 202 + run_id) | editor |
| PUT | `/campaigns/{id}/executions` | 실행 매트릭스 확정 (배열 전체 교체) | editor |
| GET | `/campaigns/{id}/estimate` | 생성 비용·시간 추정 | editor |
| POST | `/campaigns/{id}/generate` | 전체 콘텐츠 생성 시작 (202) | editor |
| GET | `/campaigns/{id}/events` (SSE) | 에이전트 진행 상황 스트림 | viewer |
| GET | `/contents?campaign_id=&status=` | 콘텐츠 목록 (검토 큐 포함) | viewer |
| PATCH | `/contents/{id}` | 본문 수정 (→ 규칙 엔진 재실행) | editor |
| POST | `/contents/{id}/recheck` | LLM 재채점 | editor |
| POST | `/contents/{id}/regenerate` | 재생성 (반려 카운터 리셋) | editor |
| POST | `/contents/{id}/approve` | 승인 (hard violation 0 필수) | editor |
| POST | `/contents/{id}/discard` | 폐기 | editor |
| POST | `/publications` | 예약 생성 `{content_id, channel_account_id, scheduled_at}` | editor |
| PATCH | `/publications/{id}` | 시각 변경 (scheduled 상태만) | editor |
| POST | `/publications/{id}/cancel` | 취소 | editor |
| POST | `/publications/{id}/manual-posted` | 내보내기형 게시 URL 등록 | editor |
| GET | `/publications?from=&to=` | 캘린더 조회 | viewer |
| GET | `/analytics/campaigns/{id}` | KPI·퍼널·변형 비교 | viewer |
| GET | `/analytics/overview?from=&to=` | 대시보드 홈 | viewer |
| GET | `/campaigns/{id}/insights` | 최신 Analyst 인사이트 | viewer |
| POST | `/campaigns/{id}/costs` | 비용 입력 | editor |
| POST | `/track/events` | 전환/확정 웹훅 (HMAC `X-Signature: sha256=...`) | 서명 |
| POST | `/track/csv` | CSV 업로드 | editor |
| GET | `/r/{code}` (별도 트래킹 도메인) | 클릭 기록 + 302 | 공개 |

**웹훅 페이로드 예시**
```json
{
  "event_id": "order_88123",
  "event_type": "purchase",
  "occurred_at": "2026-11-02T13:22:00+09:00",
  "click_id": "c_7Yt2...",
  "utm_content": "k3P9xa",
  "coupon_code": "MATCHA20",
  "revenue_krw": 18000,
  "quantity": 1
}
```
귀속 우선순위: `click_id` → `utm_content` → `coupon_code`(Offer 레벨) → 미귀속(`campaign_id` NULL, 대시보드 "미귀속" 표시).

---

## 11. LLM 입출력 계약

모든 에이전트는 **JSON 스키마 강제 출력**(provider의 structured output/tool 기능 사용)을 사용하고, 백엔드는 Zod로 재검증한다. 검증 실패 시 1회 재요청(오류 메시지 포함), 재실패 시 `failed(schema_invalid)`.

### 11.1 Lead → `StrategyPlan`
```json
{
  "summary": "시험기간 대학생 대상 1+1 세트로 재방문 유도",
  "key_message": "공부하다 지칠 때, 둘이 함께 쉬어가요",
  "executions": [
    { "offer_id": "uuid", "audience_id": "uuid", "channel_account_id": "uuid",
      "priority": 1, "strategy_note": "스토리 링크 스티커 활용", "recommended_variants": ["emotional","benefit"] }
  ],
  "kpi_focus": ["cvr","roas"],
  "risks": ["오퍼 유효기간이 캠페인 종료일보다 빠름"]
}
```
- 백엔드 검증: 반환된 ID가 브리프에 포함된 ID인지 확인(아니면 제거), 상한(12개) 절삭.

### 11.2 Copywriter → `VariantSet`
```json
{
  "variants": [
    { "variant_key": "emotional", "channel_type": "instagram",
      "body": { "caption": "...", "hashtags": ["#말차"], "cta_text": "프로필 링크에서 확인", "image_brief": "..." },
      "rationale": "시험 스트레스 공감 → 휴식 제안" },
    { "variant_key": "benefit", "channel_type": "instagram", "body": { "...": "..." }, "rationale": "..." }
  ]
}
```

### 11.3 채널별 `contents.body` 스키마
```ts
type InstagramBody = { caption: string; hashtags: string[]; first_comment?: string; cta_text: string; image_brief?: string };
type EmailBody     = { subject: string; preheader: string; body_html: string; cta_text: string; is_ad: boolean };
type NaverBlogBody = { title: string; body_markdown: string; tags: string[] };
```

### 11.4 Guardrail Judge → `GuardrailJudgement`
```json
{
  "rubric": { "tone": 34, "fit": 22, "offer_accuracy": 20, "clarity": 12 },
  "issues": [ { "path": "caption", "quote": "역대급 할인", "reason": "과장 표현, 톤 '세련됨'과 불일치", "suggestion": "..." } ],
  "comments": "전반적으로 산뜻하나 2문단 표현이 과장됨"
}
```
- Judge 프롬프트에는 **생성 시 사용한 프롬프트·rationale을 넣지 않는다**(자기평가 편향 감소).
- temperature 0, 루브릭 각 점수의 상한 초과 시 상한으로 절삭.

### 11.5 Analyst → `InsightReport`
```json
{
  "headline": "혜택형 변형이 클릭률 2.1배",
  "summary": ["...", "...", "..."],
  "bottleneck": { "stage": "conversion", "evidence": [ { "metric": "cvr", "value": 1.8 } ] },
  "actions": [ { "title": "랜딩 첫 화면에 1+1 조건 명시", "expected_impact": "cvr 개선" } ],
  "confidence": "low|medium|high",
  "insufficient_sample": true
}
```

### 11.6 프롬프트 관리
- `prompts/{agent}/v{n}.md` 파일로 버전 관리, `agent_runs.prompt_version`에 기록.
- 브랜드 가이드라인·플레이북 등 반복 블록은 프롬프트 앞부분에 배치해 provider 프롬프트 캐싱 활용(비용 절감).
- 골든셋(브랜드 5종 × 시나리오 4종) 회귀 테스트: 프롬프트 변경 PR마다 규칙 엔진 통과율, 평균 judge 점수, 비용 비교.

---

## 12. UI/UX 명세 및 디자인 시스템

### 12.1 정보 구조 (사이드바)
```
대시보드 | 캠페인 | 검토 대기(뱃지) | 캘린더 | 분석 | 브랜드 | 채널 | 설정
```

### 12.2 화면 명세
| 화면 | 경로 | 구성 | 주요 상태 |
|---|---|---|---|
| 대시보드 홈 | `/` | 상단: 진행 중 캠페인 요약 + 퍼널 메트릭 카드(유입→전환→확정, 단계 전환율). 중앙: 에이전트 작업 피드(Lead/Copywriter/Guardrail/Analyst 아이콘 + 상태). 우측/하단: 검토 대기 n건, 오늘 예약 발행 | 빈 상태: "첫 캠페인 만들기" CTA |
| 캠페인 목록 | `/campaigns` | 유형 필터(Open/Target), 상태 칩, 기간, 주 KPI | |
| 캠페인 생성·작업 (Split View) | `/campaigns/{id}` | **좌측 (Brief, 400px)**: 유형 토글 → 플레이북 선택 → 목적/기간/예산 → 오퍼·오디언스(라이브러리 선택 + 인라인 추가) → 채널 계정 → [전략 제안 받기] → 실행 매트릭스 체크 → 예상 비용 → [생성 시작]. **우측 (Agent Workspace)**: 실행별 탭 → 변형 카드 나란히(A/B), 각 카드에 Guardrail 점수 배지(≥80 초록, 60~79 노랑, <60 또는 hard 위반 빨강), 위반 하이라이트(본문 밑줄 + 툴팁), 인라인 편집, [승인]/[재생성], 채널 미리보기(인스타 피드/이메일 받은편지함 목업) | 생성 중: 스켈레톤 + SSE 진행 표시 |
| 검토 대기 | `/review` | `needs_manual_review` 우선 정렬, 반려 이력(attempt별 위반·코멘트) 타임라인, 일괄 승인(passed만) | |
| 캘린더 | `/calendar` | 월/주 뷰, 채널 색상 구분, 드래그로 시각 변경(scheduled만), 실패 건 빨간 표시 | |
| 분석 | `/analytics`, `/campaigns/{id}/analytics` | 퍼널 차트, 채널별 비교 막대, 변형 비교 테이블(표본 수·신뢰도 배지), 시계열, Analyst 인사이트 카드, 데이터 신선도 | 표본 부족 배지 |
| 브랜드 | `/brands/{id}` | 프로필, 톤 키워드 칩, 금기어/필수문구 태그 입력, 예시 카피, **가이드라인 테스트 박스**(텍스트 붙여넣기 → 즉시 규칙 결과), 버전 이력 | |
| 채널 | `/channels` | 채널별 연결 카드, 상태(연결됨/만료/내보내기 전용), 재연결 | |
| 설정 | `/settings` | 멤버, 웹훅 시크릿, 트래킹 도메인, LLM 월 예산, 테마 | |

### 12.3 디자인 토큰 (원본 유지 + 보강)
```css
:root {
  --bg: #F8FAFC; --surface: #FFFFFF; --text: #0F172A; --text-2: #475569;
  --border: #E2E8F0;                     /* 추가: Slate 200 */
  --primary: #2563EB; --primary-fg: #FFFFFF;
  --success: #16A34A;
  --warning: #D97706;                    /* 추가: Amber 600 — 점수 60~79, 표본 부족 */
  --danger:  #DC2626;                    /* 추가: Red 600 — hard 위반, 발행 실패 */
  --info:    #0891B2;                    /* 추가: Cyan 600 */
  --radius-card: 8px; --radius-control: 6px;
  --font: Pretendard, Inter, system-ui, sans-serif;
}
[data-theme="dark"] {
  --bg: #0F172A; --surface: #1E293B; --text: #F8FAFC; --text-2: #94A3B8;
  --border: #334155;                     /* Slate 700 */
  --primary: #3B82F6; --primary-fg: #FFFFFF;
  --success: #22C55E; --warning: #F59E0B; --danger: #EF4444; --info: #22D3EE;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* 위 dark 값 동일 */ } }
```
- 테마: `system`(기본)/`light`/`dark`, `users.theme_preference`에 저장, 초기 렌더 시 깜빡임 방지(SSR에서 쿠키로 `data-theme` 주입).
- 접근성: 본문 대비 WCAG AA(4.5:1) 이상, 상태는 색상 + 아이콘/텍스트 병기, 키보드로 승인/다음 항목 이동(`A`, `J/K`).
- 차트 팔레트: 단계(유입/전환/확정)는 같은 hue의 명도 3단계, 채널 비교는 구분 가능한 범주형 4색(다크모드 별도 검증).
- Shadow: 라이트 `shadow-sm/md`, 다크에서는 그림자 대신 `--border`로 카드 구분(다크 배경에서 그림자는 거의 보이지 않음).

---

## 13. 퍼널 지표 정의와 계산식

| 단계 | 이벤트 | 출처 |
|---|---|---|
| 유입 (Acquisition) | impression, reach, click, email_open | 플랫폼 API, ESP 웹훅, 리다이렉트 |
| 전환 (Conversion) | landing_view, cta_click, signup, add_to_cart | 웹훅/픽셀(Phase 2) |
| 확정 (Confirmation) | purchase, reservation, coupon_redeem | 웹훅, CSV, 쿠폰 |

| 지표 | 계산식 | 비고 |
|---|---|---|
| CTR | click ÷ impression | 이메일은 click ÷ delivered |
| Open Rate | email_open ÷ delivered | Apple MPP로 과대 측정 가능 → 참고 지표 |
| CVR | conversion 이벤트 수 ÷ click | 전환 정의는 캠페인 설정에서 1개 선택 |
| 확정률 | confirmation 수 ÷ conversion 수 | |
| 매출 | Σ revenue_krw (confirmation) | |
| ROAS | 매출 ÷ Σ campaign_costs (ad_spend+production+discount) | 비용 미입력 시 N/A |
| CAC | Σ 비용 ÷ 신규 확정 고객 수 | 신규 여부는 웹훅 `is_new_customer` 필드 (없으면 확정 건수로 근사, 라벨 표기) |
| 캠페인 점수 | Σ (단계 목표 달성률 × kpi_weight) | 목표 미설정 시 표시 안 함 |

**유형별 대시보드 기본 KPI**
- Open: 노출, 도달, 클릭, CTR, 저장·공유 (참고: 전환)
- Target: 클릭, CVR, 확정 건수, 매출, ROAS, CAC (참고: 노출)
- 퍼널 단계 스킵: Open 캠페인에 전환 이벤트가 0이면 퍼널 차트에서 해당 단계를 "미측정"으로 표시(0%로 표시하지 않음) — Analyst 왜곡 방지.

**A/B 판정 (MVP)**
- `randomized_split`(이메일): 2-비율 z검정, p < 0.05 및 변형별 최소 표본(클릭 100 또는 전환 20) 충족 시 "승자" 표시.
- `sequential`(인스타/블로그): 승자 판정 대신 "참고 비교"만 표시.

---

## 14. 비기능 요구사항

### 14.1 성능
| 항목 | 목표 |
|---|---|
| 일반 API p95 | < 300ms |
| 리다이렉트 `/r/{code}` p95 | < 100ms |
| 실행 1개(변형 2개) 생성+검수 완료 | p50 < 30s, p95 < 90s |
| 대시보드 로딩 | < 1.5s (롤업 기반) |
| 예약 발행 지연 | scheduled_at 대비 +60s 이내 |

### 14.2 보안·개인정보
- 채널 토큰·ESP 키: 봉투 암호화(데이터키 AES-256-GCM, 마스터키는 KMS/Secret Manager). 로그에 토큰 출력 금지.
- 테넌트 격리: 앱 레벨 `workspace_id` 필터 + Postgres RLS 이중화.
- 웹훅: HMAC-SHA256 서명 + 타임스탬프 5분 허용 + `event_id` 중복 거부.
- 트래킹: IP는 저장 시 해시(일 단위 솔트), 원본 IP·UA는 30일 후 삭제. 개인정보처리방침에 수집 항목 명시.
- LLM 전송 데이터: 고객 개인정보(이메일 주소, 전화번호)는 Context Packet에 포함 금지(코드에서 화이트리스트 필드만 직렬화).
- 정보통신망법: 광고성 이메일 `(광고)` 표기, 수신거부 링크, 야간(21~08시) 발송 경고 → Guardrail hard 규칙으로 구현.

### 14.3 신뢰성
- 큐 작업은 모두 멱등. 워커 크래시 시 `running` 상태가 10분 이상이면 재큐잉.
- 외부 API rate limit(인스타그램 게시 한도 등) 준수: 계정별 토큰 버킷.
- 백업: 일 1회 스냅샷 + PITR 7일.

### 14.4 비용 통제
- 워크스페이스 월 LLM 예산(`monthly_llm_budget_krw`), 캠페인 예산(`llm_budget_krw`) 이중 상한.
- 80% 도달 시 알림, 100% 시 신규 생성 차단(검수·분석은 허용).
- 비용 계산: provider별 토큰 단가 설정 테이블 × `agent_runs` 토큰.

### 14.5 관측성
- 대시보드(내부): 에이전트별 성공률, 평균 judge 점수, 서킷 브레이커 발동 수, 캠페인당 비용, 발행 실패율.
- 알림: 발행 실패율 > 5%/1h, provider 서킷 open, 큐 적체 > 100건.

### 14.6 국제화
- MVP는 한국어 UI·콘텐츠. 문자열은 i18n 키로 관리(향후 영어).

---

## 15. 개발 마일스톤과 작업 분해

| 주차 | 마일스톤 | 주요 작업 | 완료 기준 |
|---|---|---|---|
| W1 | M0 기반 | 모노레포, Next.js, DB 마이그레이션(§9), 인증, 워크스페이스/RBAC/RLS, 디자인 토큰·테마 토글, CI | 로그인 후 빈 대시보드, 다크모드 전환 |
| W2 | M1 브랜드·라이브러리 | 브랜드 CRUD+버전, 오퍼/오디언스, 규칙 엔진 + 가이드라인 테스트 박스 | 규칙 엔진 단위 테스트 100% 통과 |
| W3 | M2 캠페인 브리프 | 캠페인 CRUD, 플레이북 시드, Split View 좌측, LLM Gateway(재시도·비용 계측·provider 서킷), Lead 플랜 | 브리프 → 실행 매트릭스 제안 |
| W4–5 | M3 생성·검수 | Context Packet Builder, Copywriter, Judge, 서킷 브레이커, SSE 피드, 우측 Agent Workspace, 인라인 편집 | 골든셋에서 1차 통과율 측정, 루프 상한 테스트 통과 |
| W6 | M4 검토·승인 | 검토 큐, 승인 워크플로, 감사 로그, 채널 미리보기 | 미승인 콘텐츠 발행 차단 테스트 |
| W7–8 | M5 발행 | 채널 연결(인스타 OAuth, ESP, 블로그 내보내기), 에셋 업로드, publications + 워커(멱등·재시도), 캘린더, 트래킹 링크/리다이렉트 | 스테이징 인스타 계정 실제 발행, 동시성 테스트 |
| W9 | M6 측정 | 인사이트 동기화, ESP 웹훅, 전환 웹훅/CSV/쿠폰, 롤업 잡, 분석 화면 | 수치 정합성 검증 쿼리 통과 |
| W10 | M7 인사이트·출시 준비 | Analyst + 숫자 검증, 주간 리포트, 비용 상한, 관측 대시보드, 부하 테스트, 개인정보처리방침 | 베타 사용자 5곳 온보딩 |

**테스트 전략**
- 단위: 규칙 엔진, 지표 계산, 상태 전이(허용되지 않은 전이는 예외), UTM 생성.
- 통합: LLM은 녹화된 응답(fixture)으로 대체, 발행은 채널 API 모킹 + 스테이징 계정 E2E 1회/일.
- 프롬프트 회귀: 골든셋 평가 스크립트를 CI에서 수동 트리거.
- E2E(Playwright): 브리프 → 생성 → 승인 → 예약 → (모킹) 발행 → 웹훅 전환 → 대시보드 반영.

---

## 16. 오픈 이슈 (결정 필요)

| # | 질문 | 권장안 |
|---|---|---|
| 1 | OpenAI를 꼭 함께 써야 하는가? (운영·키·비용 관리 2배) | MVP는 Gateway 추상화만 두고 **단일 provider로 시작**, 비용/품질 비교 후 역할별 분리 결정 |
| 2 | 이메일 ESP 선택 (국내 스티비 vs 글로벌 SendGrid/Mailgun) | 국내 소상공인 타깃이면 수신자 관리 UI가 있는 ESP 연동 + 자체 발송은 Phase 2 |
| 3 | 네이버 블로그 자동 발행 가능 여부 | 공식 글쓰기 API의 현재 제공 여부를 착수 전 재확인. 불가 시 내보내기 방식 유지(본 문서 기준) |
| 4 | 카카오톡 채널 우선순위 | 국내 SMB 전환 채널로 효과가 커서 Phase 2 최우선 후보 |
| 5 | 승인 없는 자동 발행 허용 여부 | MVP 불가, Phase 3에서 "통과 점수 ≥ 90 + 신뢰 채널" 조건부 옵션 |
| 6 | 과금 모델 (좌석 vs 생성량) | LLM 원가 연동을 위해 "월 생성 크레딧" 기반 권장 |
| 7 | 랜딩페이지/링크인바이오 자체 제공 | 인스타 유입 측정의 핵심 — Phase 2 초반 배치 권장 |

---

## 부록 A. 로직 검토 결과 및 변경 사항

원본 문서를 검토하며 발견한 문제점과 본 PRD에서의 해결 방식이다. (심각도: 🔴 구현 전 반드시 해결 / 🟠 MVP 내 해결 권장 / 🟡 개선 제안)

| # | 심각도 | 원본 내용 | 문제점 | 본 PRD의 해결 |
|---|---|---|---|---|
| A-1 | 🔴 | OpenAI가 "세션 관리, 데이터베이스 조율, 에이전트 오케스트레이션" 담당 | LLM은 비결정적이라 흐름 제어·DB 조율을 맡기면 재현 불가, 디버깅 불가, 비용 증가. 세션/DB 관리는 LLM의 역할이 아님 | 오케스트레이션은 **코드 상태 머신**, OpenAI는 전략 수립(Lead)·분석 서술(Analyst)만 (§5.3, §6) |
| A-2 | 🔴 | 서킷 브레이커 "2회 이상 반려 시" | "2회 이상"이면 2회째에 이미 멈춤인지, 재작성 횟수가 몇 번인지 모호. API 오류 재시도와 구분 없음. 비용·provider 장애 차원 누락 | 반려 2회 = 재작성 1회로 명확화, 조기 중단 조건, 캠페인 비용·provider 장애 서킷 추가, API 재시도는 별도 카운트 (FR-08) |
| A-3 | 🔴 | Claude가 생성하고 Claude가 검수 | 같은 모델의 자기평가는 관대해지는 편향. 금기어 같은 명확한 규칙을 LLM에 맡기면 놓칠 수 있음. 점수 산정 기준 없음 | 규칙 엔진(코드) + 루브릭 LLM 채점 2단계, Judge에는 생성 맥락 미전달, 점수 공식·임계치 정의, 오퍼 숫자 코드 교차검증 (FR-07) |
| A-4a | 🔴 | `Channels` 테이블에 소유자 없음 + `api_credentials_encrypted` | 모든 사용자가 같은 채널 레코드를 공유하는 구조 → 토큰이 다른 고객에게 노출될 수 있는 **보안 결함** | `channel_accounts`(workspace·brand 소유) |
| A-4b | 🔴 | 멀티테넌시 개념 없음 (`brands.user_id`만 존재) | SaaS에서 팀 협업·권한·과금 단위가 없음, 테넌트 격리 근거 없음 | `workspaces`, `workspace_members`, 전 테이블 `workspace_id` + RLS |
| A-4c | 🟠 | `Campaign_Executions.variant_group_id` | Execution 1개가 이미 A/B 그룹(변형은 Contents)이라 의미 중복, 데이터 불일치 유발 | 제거, `contents.variant_key` + `UNIQUE(execution_id, variant_key)` |
| A-4d | 🟠 | `Contents.status`에 `scheduled/published` | 같은 콘텐츠를 여러 계정·시각에 발행할 수 없음, 반려/수동검토/실패 상태 없음 | `publications` 분리, 콘텐츠 상태 확장 (§8) |
| A-4e | 🔴 | `Funnel_Logs.metric_value (INT/FLOAT)` + `stage` | 어떤 지표(클릭? 매출?)인지 구분 불가, 중복 이벤트 방지 없음, 매출 컬럼 없음 → CTR/CVR/ROAS 계산 불가 | `funnel_events`(event_type, quantity, revenue, 중복키) + 플랫폼 스냅샷 + 일 롤업 (§9) |
| A-4f | 🟠 | Campaign에 기간·예산 없음 (PRD는 "기간" 언급, ROAS/CAC 계산 요구) | ROAS·CAC 분모가 없음 | `start_at/end_at/budget_krw` + `campaign_costs` |
| A-4g | 🟡 | Offer/Audience가 캠페인 종속 | 캠페인마다 같은 페르소나 재입력 | 브랜드 라이브러리 + 캠페인 연결 테이블 |
| A-4h | 🟡 | `brand_guidelines TEXT` 단일 필드 | 금기어를 규칙 엔진이 검사할 수 없음, 변경 이력 없음 | 구조화 필드 + 버전 스냅샷 |
| A-4i | 🟡 | `guardrail_score`만 저장 | 왜 반려됐는지 추적 불가, 서킷 브레이커 횟수 근거 없음 | `guardrail_reviews` (시도별 위반·루브릭) |
| A-4j | 🟡 | 에이전트 실행·비용 기록 없음 | UI의 "실시간 작업 피드", 비용 통제, 재현성 구현 불가 | `agent_runs` |
| A-5 | 🔴 | Instagram에 UTM 링크로 유입 트래킹 | 인스타그램 캡션 링크는 **클릭되지 않음**. 또한 Graph API는 이미지 없는 글 게시 불가 | 프로필 링크/스토리 스티커 안내, 이미지 에셋 필수, Phase 2 링크인바이오 (FR-03, FR-11) |
| A-6 | 🟠 | 네이버 블로그 원클릭 퍼블리싱 | 공식 글쓰기 API 제공 여부가 불확실(현재 제공 여부 재확인 필요) | MVP는 내보내기 + 게시 URL 등록 (FR-03, 오픈이슈 #3) |
| A-7 | 🟠 | A/B 테스트 | SNS 유기적 게시물은 사용자 무작위 분할이 불가 → 엄밀한 A/B가 아님. 소상공인은 표본이 작아 결론이 왜곡되기 쉬움 | 이메일만 무작위 분할, SNS는 "시차 비교" 라벨, 최소 표본·유의성 기준 (FR-10, §13) |
| A-8 | 🔴 | 확정(구매/예약) 데이터 수집 방법 미정의 | 외부 시스템 데이터 연동 경로가 없으면 확정 단계·ROI 계산 불가 | 웹훅·CSV·쿠폰 코드 매칭, 귀속 규칙 (FR-12) |
| A-9 | 🟠 | "실시간 모니터링" | 인스타 인사이트·ESP 데이터는 지연·주기 수집이라 실시간 아님 → 사용자 기대 불일치 | 데이터 신선도 표기, 수집 주기 명시 (FR-13) |
| A-10 | 🟠 | Analyst가 퍼널 지표 분석 | LLM이 수치를 계산하면 환각 위험 | SQL이 계산, LLM은 서술만 + 숫자 대조 검증 (FR-14) |
| A-11 | 🟠 | Guardrail 통과 → 바로 예약/발행 흐름 | 브랜드 사고(잘못된 할인율 등) 시 책임 소재·복구 어려움 | 사용자 승인 필수 단계 (FR-09) |
| A-12 | 🟠 | 법규 고려 없음 | 광고성 이메일 `(광고)` 표기·수신거부·야간 발송 규정, 과장 광고 표현 | Guardrail hard 규칙 + 발송 경고 (FR-07, §14.2) |
| A-13 | 🟡 | 실행 매트릭스 조합 상한 없음 | 오퍼×오디언스×채널×변형 조합 폭증 → 비용 폭증 | 실행 12 / 변형 3 상한 + 생성 전 비용 추정 (FR-05) |
| A-14 | 🟡 | 오픈 캠페인에서 Audience/Offer 필수 여부 미정 | 오픈 캠페인은 "넓은 타겟"인데 스키마는 필수 FK | 오픈은 NULL 허용(broad), 타겟은 필수 (FR-04) |
| A-15 | 🟡 | 디자인 토큰에 warning/danger, border 없음 | Guardrail 점수 3단계 표시, 실패 상태 표현 불가. 다크모드에서 그림자로 카드 구분이 안 됨 | 시맨틱 컬러·border 토큰 추가, 다크모드 border 사용 (§12.3) |
| A-16 | 🟡 | UI 화면에 검토 큐·캘린더·브랜드/채널 설정 없음 | 서킷 브레이커 "수동 검토 전환" 후 처리할 화면, 예약 발행 관리 화면 부재 | 화면 추가 (§12.2) |
| A-17 | 🟡 | 하이브리드(2개 provider) 운영 | 키·장애·비용 관리 2배, 컨텍스트 싱크 포인트 증가 | Gateway 추상화 + 폴백. 단일 provider로 시작 후 비교 결정 권장 (오픈이슈 #1) |

---

## 부록 B. 초기 마스터 프롬프트 (개정)

개발 세션(Claude Code 등) 시작 시 사용한다. 원본 대비 "오케스트레이션은 코드" 원칙과 산출물 기준을 명시했다.

```text
너는 'AI 마케팅 에이전트 팀' SaaS의 수석 아키텍트이자 구현 담당 엔지니어야.
docs/marketing-agent/PRD.md(v2.0)가 유일한 요구사항 기준이며, 충돌 시 PRD를 따른다.

원칙:
- 오케스트레이션·상태 전이는 코드(상태 머신)로 구현하고, LLM은 Lead/Copywriter/Judge/Analyst 단계에서만 호출한다.
- 모든 LLM 출력은 JSON 스키마로 강제하고 Zod로 재검증한다.
- 숫자 지표는 SQL로 계산하고, LLM은 그 결과를 해석만 한다.
- Guardrail은 규칙 엔진(결정적) + LLM 루브릭 채점 2단계, 반려 2회 시 수동 검토로 전환한다.
- 외부 발행은 사용자 승인된 콘텐츠만, 멱등 키로 1회만 실행한다.

작업 방식:
- PRD §15 마일스톤 순서대로 진행하고, 각 단계마다 마이그레이션·테스트·실행 방법을 함께 제시한다.
- 요구사항이 모호하면 구현 전에 질문하고, PRD §16 오픈 이슈는 결정 전까지 인터페이스로 분리해 둔다.

준비되었으면 M0(기반) 작업 계획부터 제시해줘.
```
