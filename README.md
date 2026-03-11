# SHOT!

서부 총잡이 테마의 멀티플레이어 턴제 게임 프로젝트입니다. 현재 저장소는 프론트엔드와 백엔드가 분리된 모노레포 구조이며, 대기방, 실시간 동기화, 관리자 기능, LLM 설정을 함께 다룹니다.

## 구성

| 영역 | 설명 |
| --- | --- |
| `frontend/` | SvelteKit + Svelte 5 기반 클라이언트 |
| `backend/` | Elysia + Bun 기반 API / WebSocket 서버 |
| 루트 `package.json` | 프론트엔드/백엔드 동시 실행 및 통합 테스트 스크립트 |
| `frontend/flows`, `backend/flows` | Flowbook 문서 |
| `docs/` | 규칙서 및 보조 문서 |

## 기술 스택

| 분류 | 기술 |
| --- | --- |
| 프론트엔드 | SvelteKit, Svelte 5, Tailwind CSS v4, Paraglide JS |
| 백엔드 | Elysia, Bun |
| 데이터베이스 | SQLite, Drizzle ORM |
| 인증 | Better Auth |
| AI | Anthropic, OpenAI, Google Gemini, xAI |
| 테스트 | Vitest, Bun test |
| 문서화 | Storybook, Flowbook |

## 시작하기

### 요구사항

- Bun 1.x
- Node.js 18+

### 빠른 시작 (로컬 실행)

처음 실행할 때는 아래 순서대로 진행하면 됩니다.

```bash
bun run setup
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
bun run db:push
bun run dev
```

정상적으로 실행되면 아래 주소로 접속할 수 있습니다.

- 프론트엔드: `http://localhost:5173`
- 백엔드: `http://localhost:3001`

추가 DB 서버는 필요하지 않습니다. 현재 로컬 개발 환경은 SQLite를 사용하며, `bun run db:push` 시 `local.db` 파일이 생성되거나 갱신됩니다.

이미 `bun run setup`과 `.env` 파일 준비가 끝난 상태라면, 그 다음부터는 아래 두 줄만으로 로컬 실행이 가능합니다.

```bash
bun run db:push
bun run dev
```

### 설치

```bash
bun run setup
```

직접 설치하려면 루트, `frontend`, `backend`에서 각각 `bun install`을 실행하면 됩니다. 현재 저장소는 Bun workspace 구성이 아니므로 루트 `bun install`만으로 서브패키지 의존성이 모두 설치되지는 않습니다.

### 환경 변수

프론트엔드와 백엔드는 각각 별도 `.env` 파일을 사용합니다.

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

기본 로컬 개발값은 예시 파일에 들어 있습니다. 백엔드는 기본적으로 `http://localhost:3001`, 프론트엔드는 `http://localhost:5173` 기준입니다.

`backend/.env`가 없으면 실행 시 `DATABASE_URL is not set`, `ORIGIN is not set`, `BETTER_AUTH_SECRET is not set` 같은 오류가 발생할 수 있습니다.

### DB 스키마 반영

처음 한 번은 아래 명령으로 백엔드 기준 DB 스키마를 로컬 SQLite에 반영하세요.

```bash
bun run db:push
```

### 개발 서버 실행

루트에서 두 서버를 함께 실행:

```bash
bun run dev
```

개별 실행:

```bash
bun run dev:frontend
bun run dev:backend
```

## 주요 명령어

### 루트

```bash
bun run dev
bun run build
bun run build:frontend
bun run build:backend
bun run check
bun run lint
bun run test
bun run test:frontend
bun run test:backend
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
bun run storybook
bun run flowbook:frontend
bun run flowbook:backend
```

### 프론트엔드

```bash
cd frontend
bun run dev
bun run check
bun run lint
bun run test
bun run build
bun run storybook
bun run build-storybook
```

### 백엔드

```bash
cd backend
bun run dev
bun test
bun run build
```

## 데이터베이스

현재 실제 DB 운영 기준은 백엔드입니다. 루트의 `db:*` 스크립트는 모두 `backend` 패키지 명령으로 연결되어 있습니다.

```bash
bun run db:push
bun run db:generate
bun run db:migrate
bun run db:studio
```

직접 실행하려면 아래와 같습니다.

```bash
cd backend && bun run db:push
cd backend && bun run db:generate
cd backend && bun run db:migrate
cd backend && bun run db:studio
```

`frontend`에도 과거 구조의 Drizzle 관련 파일이 남아 있지만, 현재 앱 동작과 인증 API 기준의 DB 소스 오브 트루스는 `backend/src/db/schema.ts` 입니다.

## 현재 주요 기능

- 로비/대기방 생성 및 참가
- 대기방 실시간 플레이어 동기화와 채팅
- 호스트 기준 플레이어 관리
- 관리자 페이지에서 유저/방/LLM 설정 관리
- 글로벌/개인 어시스턴트와 모델 선택
- 게임 진행 화면 및 로그 UI

## 프로젝트 구조

```text
.
├── backend/
│   ├── src/
│   │   ├── db/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── ws/
│   └── flows/
├── docs/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   └── routes/
│   ├── messages/
│   ├── static/
│   └── flows/
└── README.md
```

## 빌드 산출물

생성 산출물은 소스가 아닙니다. 아래 디렉터리는 필요 시 다시 생성할 수 있습니다.

- `frontend/build`
- `backend/dist`
- `.svelte-kit`
- 루트 `build/`가 생긴 경우 임시 산출물로 보고 삭제해도 됩니다.

## 라이선스

Private - All rights reserved.
