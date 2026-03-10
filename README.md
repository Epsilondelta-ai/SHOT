# SHOT!

서부 총잡이 테마의 멀티플레이어 턴제 온라인 게임입니다.
각 라운드마다 타겟을 선택하고 발사하여 마지막까지 생존하면 승리합니다.
AI 어시스턴트와 함께 전략을 개발하고, 다른 플레이어들과 경쟁하세요.

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | [SvelteKit](https://kit.svelte.dev/) + Svelte 5 |
| 언어 | TypeScript |
| 패키지 매니저 | [Bun](https://bun.sh/) |
| 스타일링 | [Tailwind CSS v4](https://tailwindcss.com/) |
| 데이터베이스 | SQLite ([Drizzle ORM](https://orm.drizzle.team/)) |
| 인증 | [Better Auth](https://www.better-auth.com/) |
| AI | Anthropic, OpenAI, Google Gemini, xAI (Grok) |
| 국제화 | [Paraglide JS](https://inlang.com/m/gerre34r) (ko / en) |
| 컴포넌트 문서 | [Storybook](https://storybook.js.org/) |
| 테스트 | [Vitest](https://vitest.dev/) |

---

## 주요 기능

### 게임
- **로비 시스템** — 방 생성/참가, 대기실 채팅, 준비 상태 관리
- **턴제 전투** — 라운드별 타겟 선택 및 발사, 실시간 HP 관리
- **게임 오버** — 탈락/생존 처리, 전투 기록 로그

### 사용자
- 이메일/비밀번호 회원가입 및 로그인
- 마이페이지 — 프로필 편집, 전투 통계, 최근 전적
- 다국어 지원 (한국어 / English)

### AI 어시스턴트
- 관리자가 전역 어시스턴트 등록 (이름 + 성격 프롬프트)
- 유저가 개인 어시스턴트 설정
- LLM 프로바이더/모델 관리 (Anthropic · OpenAI · Google · xAI)

### 관리자
- 유저 관리 — 역할 지정, 기간제 차단/해제, 차단 히스토리, 온라인 상태
- 방 관리 — 활성 방 목록, 강제 종료
- LLM 설정 — 프로바이더 API 키 등록, 모델 추가/수정/삭제/활성화

---

## 시작하기

### 요구사항

- [Bun](https://bun.sh/) 1.0 이상
- Node.js 18 이상

### 설치 및 실행

```bash
# 의존성 설치
bun install

# 데이터베이스 초기화
bun run db:push

# 개발 서버 시작
bun run dev
```

브라우저에서 [http://localhost:5173](http://localhost:5173) 접속

### 환경 변수

`.env` 파일을 생성하고 아래 값을 설정하세요:

```env
# Better Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:5173

# Database (LibSQL / SQLite)
DATABASE_URL=file:local.db
```

---

## 개발 명령어

```bash
# 개발 서버
bun run dev

# 타입 체크
bun run check

# 린트
bun run lint

# 포맷
bun run format

# 테스트
bun run test

# 테스트 커버리지
bun run test:coverage

# 빌드
bun run build

# 프로덕션 미리보기
bun run preview
```

### 데이터베이스

```bash
bun run db:push      # 스키마 반영
bun run db:generate  # 마이그레이션 파일 생성
bun run db:migrate   # 마이그레이션 실행
bun run db:studio    # Drizzle Studio (DB GUI)
```

### Storybook

```bash
bun run storybook          # 개발 서버 (포트 6006)
bun run build-storybook    # 정적 빌드
```

### Flowbook (플로우 문서)

```bash
bun run flowbook        # 개발 서버
bun run build-flowbook  # 정적 빌드
```

---

## 프로젝트 구조

```
src/
├── lib/
│   ├── components/       # UI 컴포넌트
│   │   ├── admin/        # 관리자 페이지 컴포넌트
│   │   ├── common/       # 공통 컴포넌트
│   │   ├── config/       # 설정 페이지 컴포넌트
│   │   ├── game/         # 게임 컴포넌트
│   │   ├── lobby/        # 로비 컴포넌트
│   │   ├── login/        # 로그인 컴포넌트
│   │   ├── mypage/       # 마이페이지 컴포넌트
│   │   └── room/         # 대기방 컴포넌트
│   ├── server/
│   │   ├── auth.ts       # Better Auth 설정
│   │   └── db/           # Drizzle 스키마 및 클라이언트
│   └── paraglide/        # 다국어 메시지
├── routes/
│   ├── admin/            # 관리자 페이지
│   ├── api/              # API 엔드포인트
│   ├── config/           # 설정 페이지
│   ├── game/             # 게임 페이지
│   ├── lobby/            # 로비 페이지
│   ├── login/            # 로그인/회원가입
│   ├── mypage/           # 마이페이지
│   └── room/             # 대기방
messages/
├── ko.json               # 한국어
└── en.json               # English
flows/                    # Flowbook 플로우 문서
```

---

## 라이선스

Private — All rights reserved.
