# SHOT! 프론트엔드 상세 기술 스펙 보고서

**작성일**: 2026년 3월 21일
**프로젝트**: SHOT! - AI 스파이 심리 게임
**버전**: 0.0.2-alpha

---

## 1. 프레임워크 및 기술 스택

### 1.1 메인 프레임워크

- **Astro 5.0.0** - 정적 사이트 생성기 (Static Site Generation)
- **TypeScript 5.0.0** - 타입 안전성 지원
- **Tailwind CSS 3.4.0** - 유틸리티 기반 CSS 프레임워크

### 1.2 주요 의존성

- **@astrojs/tailwind** ^5.0.0 - Tailwind 통합
- **@astrojs/check** ^0.9.0 - Astro 타입 체킹
- **@astrojs/sitemap** ^3.7.1 - XML sitemap 자동 생성

### 1.3 개발 환경

- **패키지 관리**: Bun (bun.lock 파일 존재)
- **프로젝트 타입**: ESM (type: "module")
- **빌드 출력**: Static (SSG)
- **빌드 스크립트**:
  - `npm run dev` - 개발 서버 실행 (포트 3000)
  - `npm run build` - 정적 사이트 빌드 (dist 폴더)
  - `npm run preview` - 빌드 결과 미리보기
  - `npm run check` - 타입 체크

---

## 2. 페이지 구조 및 라우팅

### 2.1 Astro i18n 설정

**파일**: `/frontend/astro.config.mjs`

```
defaultLocale: 'ko'
지원 언어: ['ko', 'en', 'zh-cn', 'ja', 'es', 'pt-br', 'fr', 'ru', 'de'] (9개 언어)
routing:
  - prefixDefaultLocale: true (한국어도 /ko/로 라우팅)
  - redirectToDefaultLocale: false (리다이렉트 비활성화)
```

### 2.2 라우트 맵

#### 루트 페이지

- **경로**: `src/pages/index.astro`
- **역할**: 언어 감지 및 자동 리다이렉트
- **기능**:
  - 브라우저 언어 감지 (navigator.language)
  - 지원하는 언어 중 자동 매칭
  - 지원하지 않으면 /en/으로 리다이렉트
  - 로딩 스크린 표시

#### 다국어 페이지 (동적 라우팅)

모든 페이지는 `[lang]` 파라미터로 9개 언어 버전 생성:

| 경로              | 파일                         | 목적                    |
| ----------------- | ---------------------------- | ----------------------- |
| `/[lang]/`        | `pages/[lang]/index.astro`   | 랜딩 페이지 (홈)        |
| `/[lang]/game`    | `pages/[lang]/game.astro`    | 게임 플레이 메인 페이지 |
| `/[lang]/login`   | `pages/[lang]/login.astro`   | 로그인 페이지           |
| `/[lang]/signup`  | `pages/[lang]/signup.astro`  | 회원가입 페이지         |
| `/[lang]/profile` | `pages/[lang]/profile.astro` | 사용자 프로필 페이지    |
| `/[lang]/docs`    | `pages/[lang]/docs.astro`    | 문서/가이드 페이지      |
| `/[lang]/replays` | `pages/[lang]/replays.astro` | 리플레이 목록 페이지    |
| `/[lang]/replay`  | `pages/[lang]/replay.astro`  | 개별 리플레이 상세      |
| `/[lang]/news`    | `pages/[lang]/news.astro`    | 뉴스/공지사항           |

### 2.3 주요 페이지별 상세

#### 2.3.1 랜딩 페이지 (`/[lang]/`)

**구성요소**:

- 히어로 섹션 (배경 이미지, 헤드라인)
- 퀵 스타트 정보 박스
- 사용자 프로필 표시 (로그인 시)
- 게임 시작 버튼
- 통계 표시 (플레이어, AI 에이전트 수)

**기능**:

- API에서 실시간 통계 조회 (`/api/stats`)
- 토큰 기반 사용자 정보 조회 (`/api/me`)
- 로그인 확인 후 게임 시작 버튼 동작

#### 2.3.2 게임 페이지 (`/[lang]/game`)

**구성요소**:

- 게임 헤더 (네비게이션, 언어 선택)
- 배경 이미지
- 5개 게임 씬 (동시 렌더링, CSS display 제어):
  1. **RoomListScene** - 게임방 목록 및 생성
  2. **GameRoomScene** - 게임방 입장/준비
  3. **GamePlayScene** - 실제 게임 플레이
  4. **BotsScene** - AI 봇 설정/관리
  5. **MyPageScene** - 사용자 마이페이지

**특징**:

- 로그인 필수 (토큰 없으면 로그인 페이지로 리다이렉트)
- SSE (Server-Sent Events) 실시간 이벤트 수신
- 게임 중인 상태 자동 복구 기능

#### 2.3.3 로그인 페이지 (`/[lang]/login`)

**기능**:

- 이메일/비밀번호 로그인
- Google OAuth 연동
- 회원가입 링크
- 오류 메시지 표시

#### 2.3.4 가입 페이지 (`/[lang]/signup`)

**필드**:

- 닉네임 (username)
- 이메일
- 비밀번호
- 비밀번호 확인

#### 2.3.5 프로필 페이지 (`/[lang]/profile`)

**탭 구조**:

1. **Stats 탭** - 통계 정보
   - 전체 승률, 총 게임 수
   - 역할별 분석 (에이전트, 스파이)
   - 킬 수, 카드 사용 현황

2. **Replays 탭** - 리플레이 목록

#### 2.3.6 문서 페이지 (`/[lang]/docs`)

**섹션**:

- 게임 규칙 설명
- API 레퍼런스
- 코드 예제 (JavaScript, Python, LLM 봇)
- 게임 흐름도

---

## 3. 컴포넌트 구조

### 3.1 레이아웃 컴포넌트

#### BaseLayout.astro

**위치**: `src/layouts/BaseLayout.astro`
**역할**: 모든 페이지의 기본 HTML 래퍼

**Props**:

```typescript
interface Props {
  title: string; // <title> 태그
  bodyClass?: string; // body CSS 클래스
  lang?: string; // 언어 코드
  description?: string; // meta description
  canonicalUrl?: string; // canonical URL
  alternates?: { hreflang: string; href: string }[]; // hreflang 링크
}
```

**기능**:

- 메타 태그 자동 생성 (OG, Twitter Card)
- SEO 메타 태그 (canonical, hreflang)
- Pretendard 폰트 로드
- Tailwind CSS 적용

---

### 3.2 공유 컴포넌트

#### SiteHeader.astro

**위치**: `src/components/SiteHeader.astro`
**사용 페이지**: 로그인, 가입, 프로필, 문서, 뉴스

**기능**:

- 로고 링크
- 데스크톱/모바일 네비게이션
- 언어 선택기 (드롭다운/셀렉트)
- Docs, Replays 탭 링크

#### GameHeader.astro

**위치**: `src/components/GameHeader.astro`
**사용 페이지**: 게임 페이지

**기능**:

- 게임 로고/홈 버튼
- 3개 네비게이션 탭:
  - 로비 (방 목록)
  - 봇 (AI 에이전트)
  - 마이페이지
- 사용자 아바타 표시
- 게임 종료 버튼
- 언어 선택기
- SSE 연결 상태 표시 (색상 점)

#### HeroBackground.astro

**위치**: `src/components/HeroBackground.astro`
**역할**: 배경 이미지 컨테이너

**Props**:

```typescript
interface Props {
  gradient?: string; // 그래디언트 오버레이
  class?: string; // CSS 클래스
}
```

---

### 3.3 게임 씬 컴포넌트 (Game Page)

#### RoomListScene.astro (13.7KB)

**기능**:

- 게임방 목록 표시
- 방 생성 모달
- 비공개방 비밀번호 입력 모달
- 새로고침 버튼
- SSE로 실시간 방 목록 업데이트

**주요 요소**:

- 게임방 카드 (3열 그리드)
- 방 상태: 대기 중, 진행 중
- 참관자/봇 수 표시
- 최대 플레이어 수: 5~12명

**모달**:

1. 방 생성 모달
   - 방 이름 (최대 100자)
   - 최대 플레이어 수 선택
   - 비공개 체크박스
   - 비밀번호 입력 (비공개일 때)

2. 비밀번호 입력 모달
   - 비공개 방 입장 시

#### GameRoomScene.astro (31.1KB)

**기능**:

- 게임방 정보 표시
- 플레이어 목록 (대기/준비 상태)
- 준비 완료 토글
- 채팅
- 게임 시작 (호스트만)

**상태 관리**:

- 플레이어 준비 상태 추적
- 호스트 권한 표시
- 관전자 수 표시

#### GamePlayScene.astro (41.8KB)

**기능**: 실제 게임 플레이 UI

**구성**:

- **상단 바**:
  - 턴 정보 (현재 턴, 플레이어명)
  - 타이머 (2분)
  - SSE 연결 상태
  - 채팅 토글 버튼

- **메인 영역**:
  - 플레이어 렌더링 영역 (원형 배치)
  - 이펙트 영역 (총상, 회복 애니메이션)
  - 채팅 말풍선

- **사이드 패널 (데스크톱)**:
  - 자신의 역할 표시
  - HP 표시 (아이콘)
  - 상태 (수감, 중독 등)
  - 턴 종료 버튼
  - 정체 공개 버튼 (스파이)
  - 게임 이탈 버튼 (사망)

- **모바일 정보 바**:
  - 컴팩트한 역할/HP 표시

- **카드 핸드**:
  - Slay the Spire 스타일
  - 호버 시 확대
  - 스크롤 애니메이션
  - 선택 상태 표시

- **게임 채팅 패널**:
  - 토글 가능 (하단 오버레이)
  - 메시지 목록
  - 입력 필드 (최대 100자)

#### BotsScene.astro (21.4KB)

**기능**:

- AI 봇 목록 표시
- 새 봇 추가
- 봇 활성화/비활성화
- 봇 설정 편집

#### MyPageScene.astro (5.9KB)

**기능**:

- 사용자 프로필 편집
- 통계 표시
- 설정 (언어 변경 등)

---

### 3.4 유틸리티 컴포넌트

#### PlayerRenderUtils.astro (6.3KB)

**역할**: 게임 플레이 중 플레이어 렌더링 로직

**기능**:

- 플레이어 상태 시각화
- HP 바 렌더링
- 역할 배지 표시
- 상태 이펙트 (중독, 수감 등)

---

## 4. 국제화 (i18n) 시스템

### 4.1 구조

**위치**: `src/i18n/`

```
i18n/
├── index.ts              # i18n 유틸리티 함수
├── locales.ts            # 언어 정보 정의
└── translations/
    ├── ko.ts            # 한국어
    ├── en.ts            # 영어
    ├── zh-cn.ts         # 중국어 (간체)
    ├── ja.ts            # 일본어
    ├── es.ts            # 스페인어
    ├── pt-br.ts         # 포르투갈어 (브라질)
    ├── fr.ts            # 프랑스어
    ├── ru.ts            # 러시아어
    └── de.ts            # 독일어
```

### 4.2 번역 구조 (한국어 예시)

**카테고리**:

- `meta` - 페이지 메타 정보
- `hero` - 랜딩 페이지 콘텐츠
- `quickStart` - 빠른 시작 가이드
- `stats` - 통계 레이블
- `login` - 로그인 페이지
- `signup` - 가입 페이지
- `game` - 게임 플레이
- `rooms` - 게임방 관련
- `docs` - 문서/규칙/API
- `nav` - 네비게이션

### 4.3 사용 패턴

```typescript
// pages/[lang]/index.astro
const { lang } = Astro.params as { lang: Locale };
const t = useTranslations(lang);
// 사용: {t.hero.headline}
```

### 4.4 지원 언어 목록

| 코드  | 언어           | hreflang |
| ----- | -------------- | -------- |
| ko    | 한국어         | ko       |
| en    | English        | en       |
| zh-cn | 简体中文       | zh-Hans  |
| ja    | 日本語         | ja       |
| es    | Español        | es       |
| pt-br | Português (BR) | pt-BR    |
| fr    | Français       | fr       |
| ru    | Русский        | ru       |
| de    | Deutsch        | de       |

---

## 5. API 통합

### 5.1 API 설정

**기본 URL**: `import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000'`

### 5.2 인증

**방식**: JWT 토큰 (Bearer scheme)

```javascript
const token = localStorage.getItem("token");
fetch(apiUrl + "/api/endpoint", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### 5.3 주요 API 엔드포인트

| 엔드포인트           | 메서드    | 목적                        | 인증       |
| -------------------- | --------- | --------------------------- | ---------- |
| `/api/stats`         | GET       | 게임 통계 (플레이어, AI 수) | 선택       |
| `/api/me`            | GET       | 현재 사용자 정보            | 필수       |
| `/api/me/room`       | GET       | 사용자의 게임방 정보        | 필수       |
| `/api/auth/login`    | POST      | 이메일/비밀번호 로그인      | 불필요     |
| `/api/auth/google`   | GET       | Google OAuth 시작           | 불필요     |
| `/api/auth/exchange` | POST      | OAuth 코드 교환             | 불필요     |
| `/api/session/sse`   | GET (SSE) | 세션 이벤트                 | 쿼리 param |

### 5.4 요청/응답 패턴

**로그인 응답**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "username": "user1" }
}
```

**사용자 정보**:

```json
{
  "id": 1,
  "username": "player1",
  "avatarUrl": "https://...",
  "email": "user@example.com"
}
```

---

## 6. WebSocket / SSE 클라이언트

### 6.1 SSE (Server-Sent Events) 연결

**위치**: 게임 페이지 (`game.astro`)

```javascript
const sessionEs = new EventSource(`${apiUrl}/api/session/sse?token=${token}`);

sessionEs.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "session_replaced") {
    // 다른 세션에서 로그인됨
    document.dispatchEvent(new CustomEvent("game:session:replaced"));
  }
});
```

### 6.2 게임 이벤트 흐름

**CustomEvent 기반 이벤트 시스템**:

```javascript
// SSE에서 게임 이벤트 수신
document.addEventListener("room:sse:game", (e) => {
  document.dispatchEvent(new CustomEvent("game:event", { detail: e.detail }));
});

// 게임 시작
document.addEventListener("room:sse:game_start", (e) => {
  const { gameId } = e.detail;
  showLoadingScreen();
  document.dispatchEvent(
    new CustomEvent("game:start", {
      detail: { gameId, userId },
    }),
  );
});
```

### 6.3 연결 상태 표시

**SSE 상태 인디케이터**:

```
connected     → 녹색 점
reconnecting  → 노란색 점 (펄싱)
disconnected  → 숨김
```

---

## 7. 상태 관리

### 7.1 저장소 (Storage)

**localStorage 사용**:

```javascript
// 인증 토큰
localStorage.getItem("token");
localStorage.setItem("token", jwtToken);

// 언어 선택 (URL 기반이지만 향후 저장 가능)
```

### 7.2 반응형 상태

**DOM 기반 상태 관리**:

- `#scene-rooms` - 방 목록 표시/숨김
- `#scene-gameplay` - 게임 플레이 표시/숨김
- `#gp-chat-panel` - 채팅 패널 토글
- `#loading-screen` - 로딩 화면

### 7.3 커스텀 이벤트 (Event-Driven)

주요 이벤트:

- `game:scene` - 씬 전환 (rooms, gameroom, gameplay, bots, mypage)
- `game:event` - 게임 이벤트
- `game:start` - 게임 시작
- `game:ready` - 게임 준비 완료
- `room:join` - 방 입장
- `room:sse` - SSE 상태 변경
- `room:sse:game_start` - 게임 시작 신호

---

## 8. UI/UX 사용자 여정

### 8.1 신규 사용자 플로우

```
루트 (/index.astro)
  ↓ (언어 감지)
랜딩 페이지 (/[lang]/)
  ↓ "게임 시작" 클릭
로그인 페이지 (/[lang]/login)
  ↓ 로그인 또는 회원가입
회원가입 (/[lang]/signup) → 로그인
  ↓ 로그인 성공
게임 페이지 (/[lang]/game)
  ↓ RoomListScene
  ├─ 방 목록 보기 또는
  └─ 방 생성
      ↓ GameRoomScene
      ├─ 준비 완료 대기 또는
      └─ 게임 시작 (호스트)
          ↓ GamePlayScene
          ├─ 게임 플레이
          ├─ 플레이어 공격
          ├─ 카드 사용
          └─ 게임 종료
```

### 8.2 기존 사용자 플로우

```
로그인 페이지 (/[lang]/login)
  ↓ 토큰 확인 (localStorage)
  ↓ 게임 페이지로 리다이렉트
게임 페이지 (/[lang]/game)
  ↓ 진행 중인 방/게임 있는지 확인
  ├─ 없음 → RoomListScene
  └─ 있음 → GamePlayScene (자동 복구)
```

### 8.3 씬 네비게이션

**GameHeader 네비게이션**:

| 네비게이션 | 씬     | 설명                        |
| ---------- | ------ | --------------------------- |
| 로비       | rooms  | 게임방 목록                 |
| 봇         | bots   | AI 에이전트 관리            |
| 마이페이지 | mypage | 프로필, 통계                |
| 집 아이콘  | -      | 홈 페이지로 이동 (/[lang]/) |

---

## 9. 빌드 설정

### 9.1 TypeScript 설정 (tsconfig.json)

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@game/*": ["src/game/*"],
      "@components/*": ["src/components/*"]
    }
  }
}
```

### 9.2 Tailwind 설정 (tailwind.config.mjs)

```javascript
{
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'sans-serif']
      }
    }
  }
}
```

**폰트**: Pretendard Variable (CDN에서 로드)

### 9.3 Astro 설정 (astro.config.mjs)

```javascript
{
  site: 'https://shot.game',
  integrations: [tailwind(), sitemap()],
  output: 'static',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en', 'zh-cn', 'ja', 'es', 'pt-br', 'fr', 'ru', 'de'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false
    }
  }
}
```

---

## 10. 디렉토리 구조

```
frontend/
├── src/
│   ├── assets/                # 이미지 자산 (WebP)
│   │   ├── background.webp
│   │   ├── background2.webp
│   │   ├── character.webp
│   │   ├── loading.webp
│   │   ├── logo.webp
│   │   ├── header.webp
│   │   ├── wall.webp
│   │   ├── hitted.webp
│   │   ├── healed.webp
│   │   ├── heal.webp
│   │   ├── find.webp
│   │   ├── handcuff.webp
│   │   ├── jail.webp
│   │   └── bullet.webp
│   ├── components/             # Astro 컴포넌트 (9개)
│   │   ├── BaseLayout.astro   (레이아웃)
│   │   ├── SiteHeader.astro   (공개 페이지 헤더)
│   │   ├── GameHeader.astro   (게임 페이지 헤더)
│   │   ├── HeroBackground.astro
│   │   ├── RoomListScene.astro (게임방 목록)
│   │   ├── GameRoomScene.astro (방 준비 화면)
│   │   ├── GamePlayScene.astro (게임 플레이)
│   │   ├── BotsScene.astro    (AI 봇)
│   │   ├── MyPageScene.astro  (프로필)
│   │   └── PlayerRenderUtils.astro
│   ├── i18n/                   # 국제화
│   │   ├── index.ts
│   │   ├── locales.ts
│   │   └── translations/       (9개 언어 파일)
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   └── paraglide/         (번역 메시지 캐시)
│   ├── pages/                  # 라우트
│   │   ├── index.astro        (루트)
│   │   └── [lang]/
│   │       ├── index.astro    (랜딩)
│   │       ├── game.astro     (게임)
│   │       ├── login.astro
│   │       ├── signup.astro
│   │       ├── profile.astro
│   │       ├── docs.astro
│   │       ├── replays.astro
│   │       ├── replay.astro
│   │       └── news.astro
│   └── styles/
│       └── global.css          (Tailwind directives)
├── public/                     # 정적 파일
│   ├── emoji/                  (이모지 PNG)
│   ├── favicon.ico
│   ├── og-image.webp
│   └── site.webmanifest
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
└── project.inlang/            (i18n 프로젝트 설정)
```

---

## 11. 주요 기술적 특징

### 11.1 정적 사이트 생성 (SSG)

- Astro로 빌드 시 정적 HTML 파일 생성
- 모든 `[lang]` 파라미터 조합에 대해 사전 생성
- 총 9개 언어 × 9개 라우트 = 81개 HTML 파일

### 11.2 클라이언트 상호작용

- **인라인 스크립트** (`is:inline`)로 초기 로딩 로직
- **Vanilla JavaScript** (프레임워크 의존성 없음)
- **CustomEvent** 기반 컴포넌트 간 통신

### 11.3 반응형 디자인

- Tailwind CSS 반응형 클래스 (`sm:`, `md:` 등)
- 데스크톱/모바일 별도 UI
  - 데스크톱: 내비게이션 바, 사이드 패널
  - 모바일: 햄버거 메뉴, 콤팩트 레이아웃

### 11.4 성능 최적화

- WebP 이미지 포맷 사용
- 폰트 프리로드 (Pretendard)
- 주요 이미지 프리로드
- 정적 생성으로 빠른 로딩

### 11.5 SEO 최적화

- Canonical URL 설정
- hreflang 링크 (다국어)
- Open Graph 메타 태그
- Twitter Card
- XML Sitemap 자동 생성

---

## 12. 개발 워크플로우

### 12.1 로컬 개발

```bash
npm install
npm run dev          # http://localhost:3000
```

### 12.2 빌드

```bash
npm run build        # dist/ 폴더 생성
npm run preview      # 빌드 결과 미리보기
```

### 12.3 타입 체크

```bash
npm run check        # TypeScript 오류 검사
```

### 12.4 환경 변수

**파일**: `.env.example`

```
PUBLIC_API_URL=http://localhost:3000
```

---

## 13. 보안 및 인증

### 13.1 토큰 관리

- JWT 토큰을 `localStorage`에 저장
- 모든 API 요청 헤더에 포함
- 페이지 새로고침 시에도 유지

### 13.2 인증 체크

```javascript
const token = localStorage.getItem("token");
if (!token) {
  window.location.replace("/" + lang + "/login");
}
```

### 13.3 세션 보호

- SSE `session_replaced` 이벤트로 다중 로그인 감지
- 다른 세션 로그인 시 현재 세션 강제 종료

---

## 14. 알려진 제한사항 및 개선 사항

### 14.1 현재 제한사항

1. **상태 관리**: localStorage + CustomEvent 기반 (Redux/Zustand 없음)
2. **프론트엔드 프레임워크**: Svelte/React 없음 (Astro 정적)
3. **실시간 통신**: SSE만 지원 (WebSocket 없음)

### 14.2 향후 개선 고려사항

1. 복잡한 게임 로직 → Svelte 또는 React 컴포넌트 추가
2. 캐시 전략 → Service Worker 또는 IndexedDB
3. 오프라인 지원
4. 더 나은 상태 관리 라이브러리

---

## 15. 파일 크기 현황

| 카테고리 | 파일명              | 크기   |
| -------- | ------------------- | ------ |
| 이미지   | wall.webp           | 372K   |
| 이미지   | background.webp     | 285K   |
| 이미지   | background2.webp    | 166K   |
| 이미지   | header.webp         | 78K    |
| 페이지   | docs.astro          | ~19KB  |
| 컴포넌트 | GamePlayScene.astro | 41.8KB |
| 컴포넌트 | GameRoomScene.astro | 31.1KB |
| 컴포넌트 | BotsScene.astro     | 21.4KB |

**총 페이지 코드**: ~3,930줄 (Astro + TypeScript + HTML)

---

## 16. 버전 정보

- **Astro**: 5.0.0
- **TypeScript**: 5.0.0
- **Tailwind CSS**: 3.4.0
- **Node/Bun**: 확인 필요

---

## 17. 의존성 그래프

```
Astro 5.0.0
├── @astrojs/tailwind 5.0.0
│   └── Tailwind CSS 3.4.0
├── @astrojs/check 0.9.0
│   └── TypeScript 5.0.0
├── @astrojs/sitemap 3.7.1
└── TypeScript 5.0.0
```

---

**문서 종료**

작성자: Explorer Agent
최종 업데이트: 2026-03-21
프로젝트: SHOT! Frontend (`/home/pi/code/SHOT/frontend`)
