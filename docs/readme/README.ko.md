**한국어** | [English](./README.en.md) | [简体中文](./README.zh-cn.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Português (BR)](./README.pt-br.md) | [Français](./README.fr.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

# SHOT!

멀티플레이어 온라인 턴제 카드 전략 게임 | 요원 vs 스파이

[![Live Demo](https://img.shields.io/badge/Live%20Demo-shot.game-blue?style=flat-square)](https://shot.game/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Version](https://img.shields.io/badge/Version-0.0.1--alpha-orange)

## 게임 소개

**SHOT!**은 5~12명의 플레이어가 즐기는 온라인 전략 카드 게임입니다. 플레이어는 두 팀으로 비밀리에 나뉘어 심리전을 벌입니다.

- **요원 팀** (다수): 모든 스파이를 제거하여 승리
- **스파이 팀** (소수): 모든 요원을 제거하여 승리

공격, 치료, 감금, 조사 카드를 전략적으로 사용하여 상대 팀을 격퇴하세요.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 다국어 지원 | 9개 언어 (한국어, 영어, 중국어, 일본어, 스페인어, 포르투갈어, 프랑스어, 러시아어, 독일어) |
| AI 봇 플레이어 | Claude, GPT, DeepSeek 등 외부 AI 모델을 통한 자동 플레이 |
| 리플레이 시스템 | 모든 게임 기록 저장, 좋아요/북마크 지원 |
| 실시간 동기화 | SSE + Redis Pub/Sub을 통한 즉각적인 게임 상태 업데이트 |
| 인증 시스템 | Google OAuth + JWT 기반 안전한 사용자 관리 |
| PWA 지원 | 앱 설치 가능한 웹 애플리케이션 |
| 관리자 패널 | LLM 봇 설정 및 관리 기능 |

## 게임 규칙 요약

### 기본 설정

- **플레이어**: 5~12명 (인간 + AI 봇 혼합 가능)
- **팀 구성**: 요원(다수) vs 스파이(소수)
- **초기 상태**: HP 3, 카드 2장으로 시작
- **스파이 정보**: 스파이는 서로의 정체를 알 수 있음

### 카드 시스템

| 카드 | 효과 | 설명 |
|------|------|------|
| 공격 | 대상에게 -1 HP | 매 턴 최소 1장 사용 필수 (감금 상태 제외) |
| 치료 | 대상에게 +1 HP | 자신 또는 타인에게 사용 가능 |
| 감금 | 1~2턴 공격 봉인 | 중복 불가, 같은 대상에게 1회 제한 |
| 조사 | 대상의 역할 공개 | 스파이 수 × 2개 덱에 포함 |

### 턴 진행

1. **드로우**: 카드 2장 드로우
2. **행동**: 공격 카드 ≥1장 필수 사용 (감금 상태 제외)
3. **종료**: 카드 한도 초과 시 자동 폐기

### 승리 조건

| 조건 | 설명 |
|------|------|
| 요원 팀 승리 | 모든 스파이 제거 |
| 스파이 팀 승리 | 요원 전원 제거 (스파이 1명 이상 생존) |
| 무승부 | 총 턴 수 > (플레이어 수 × 3) |

### 턴 타이머

- 각 턴 제한 시간: **2분**
- 시간 초과 시: 자동으로 공격 카드 사용
- 총 턴 제한: 플레이어 수 × 3 (초과 시 무승부)

### 처치 보상

플레이어 제거 시:
- **+1 HP** 회복
- **+1 카드** 드로우

## 기술 스택

### 백엔드

| 항목 | 기술 |
|------|------|
| 언어 | Go 1.25 |
| 웹 프레임워크 | Fiber v2 |
| 데이터베이스 | PostgreSQL 17 |
| 캐시/메시지 | Redis 7 |
| 인증 | JWT + Google OAuth 2.0 |
| 모듈명 | github.com/epsilondelta/shot |

### 프론트엔드

| 항목 | 기술 |
|------|------|
| 프레임워크 | Astro 5.0 (정적 사이트 생성) |
| 언어 | TypeScript 5.0 |
| 스타일링 | Tailwind CSS 3.4 |
| 패키지 관리 | Bun |
| 국제화 | Paraglide (inlang) |
| 서빙 | Nginx |

### 인프라

| 항목 | 기술 |
|------|------|
| 컨테이너화 | Docker Compose |
| 리버스 프록시 | Nginx (SSL, Rate Limiting) |
| SSL 인증서 | Let's Encrypt + Certbot |
| 실시간 통신 | SSE + Redis Pub/Sub |

## 빠른 시작

### 필수 요구사항

- Docker & Docker Compose
- Git
- Bun (프론트엔드 개발 시)
- Go 1.25+ (백엔드 개발 시)

### 1단계: 저장소 클론

```bash
git clone <repository-url>
cd SHOT
```

### 2단계: 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 값 설정
```

### 3단계: 인프라 시작

```bash
docker compose up -d
```

프론트엔드는 `http://localhost`에서, 백엔드 API는 `http://localhost:3000/api`에서 접근 가능합니다.

### 개발 서버 실행

```bash
# 프론트엔드 + 백엔드 동시 실행
make dev

# 또는 개별 실행
make dev-frontend  # Astro dev server on :3000
make dev-backend   # Go server on :3000 (별도 포트 설정 필요)
```

## 환경 변수

### 데이터베이스

| 변수 | 설명 | 기본값 |
|------|------|-------|
| `DB_USER` | PostgreSQL 사용자명 | `shot` |
| `DB_PASSWORD` | PostgreSQL 비밀번호 | `shot` |
| `DB_NAME` | PostgreSQL 데이터베이스명 | `shot` |
| `DB_HOST` | PostgreSQL 호스트 (Docker Compose 시 자동) | `postgres` |
| `DB_PORT` | PostgreSQL 포트 (Docker Compose 시 자동) | `5432` |

### 인증

| 변수 | 설명 | 생성 방법 |
|------|------|----------|
| `JWT_SECRET` | JWT 서명 키 (필수) | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID (선택) | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 (선택) | Google Cloud Console |

### 공개 URL

| 변수 | 설명 | 예시 |
|------|------|------|
| `FRONTEND_URL` | 프론트엔드 공개 주소 | `https://shot.game` |
| `BACKEND_URL` | 백엔드 공개 주소 | `https://shot.game` |
| `PUBLIC_API_URL` | 프론트엔드에서 사용할 API URL (빌드 시 포함) | 빈칸 권장 (상대 경로 사용) |

### 프로덕션 설정

| 변수 | 설명 | 예시 |
|------|------|------|
| `DOMAIN` | SSL 인증서 도메인 | `shot.example.com` |
| `CERTBOT_EMAIL` | Let's Encrypt 만료 알림 이메일 | `admin@example.com` |
| `STAGING` | Let's Encrypt 스테이징 환경 사용 | `0` (프로덕션) |

### Redis

```bash
REDIS_URL=redis://redis:6379
```

## 배포

### 프로덕션 배포

```bash
# SSL 인증서 생성 및 자동 갱신 설정
./init-letsencrypt.sh

# 프로덕션 환경으로 시작
docker compose -f docker-compose.prod.yml up -d
```

## 구조 개요

### 디렉토리 구조

```
SHOT/
├── frontend/               # Astro 5.0 프론트엔드
│   ├── src/
│   │   ├── pages/         # 라우팅 페이지
│   │   ├── components/    # 리액티브 컴포넌트
│   │   ├── layouts/       # 레이아웃
│   │   └── lib/           # 유틸리티
│   ├── public/            # 정적 자산
│   └── astro.config.mjs   # Astro 설정 (i18n)
├── backend/               # Go 백엔드 (Fiber)
│   ├── main.go            # 진입점
│   ├── handlers/          # HTTP 핸들러
│   ├── models/            # GORM 데이터 모델
│   ├── game/              # 게임 엔진
│   ├── hub/               # 실시간 통신
│   └── db/                # 데이터베이스 연결
├── nginx/                 # Nginx 설정
├── docker-compose.yml     # 개발 환경
├── docker-compose.prod.yml # 프로덕션 환경
└── docs/                  # 문서
```

## API 기본 정보

### 인증

모든 API 요청은 `Authorization: Bearer <JWT_TOKEN>` 헤더 포함:

```bash
curl -H "Authorization: Bearer $TOKEN" https://shot.game/api/me
```

JWT 토큰 획득:
1. `/api/auth/signup` - 회원가입
2. `/api/auth/login` - 로그인
3. `/api/auth/google/callback` - Google OAuth 콜백

### 주요 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/me` | 현재 사용자 정보 |
| GET | `/api/stats` | 글로벌 게임 통계 |
| GET | `/api/rooms` | 게임방 목록 |
| POST | `/api/rooms` | 게임방 생성 |
| POST | `/api/rooms/{id}/join` | 게임방 입장 |
| POST | `/api/games/{id}/start` | 게임 시작 |
| POST | `/api/games/{id}/action` | 게임 행동 (카드 사용) |

자세한 API 문서는 `/frontend/public/references/` 참조.

## 리플레이 시스템

모든 게임은 자동으로 기록됩니다.

```
리플레이 기능:
- 게임 액션 기록 및 재생
- 좋아요/북마크
- 게임 분석 및 리뷰
```

## 봇(AI) 플레이어

외부 AI 서비스를 통한 자동 게임 플레이를 지원합니다.

### 봇 설정

1. 관리자 패널에서 봇 생성
2. 외부 LLM API 설정 (Claude, GPT, DeepSeek 등)
3. 게임방 생성 시 AI 봇 선택

### 봇 API

게임 봇은 다음을 통해 게임에 참여합니다:
- RESTful API (`/api/bots/games/{id}/action`)
- SSE를 통한 실시간 게임 이벤트 구독

## 개발

### 프론트엔드 개발

```bash
cd frontend
bun install
bun run dev
```

타입 체크:
```bash
bun run check
```

빌드:
```bash
bun run build
```

### 백엔드 개발

```bash
cd backend
go mod download
go run main.go
```

빌드:
```bash
go build -o dist/server main.go
```

### 데이터베이스 마이그레이션

데이터베이스 마이그레이션은 백엔드 시작 시 자동 실행됩니다.

```bash
# 게임 상태 정리 (종료된 게임 삭제)
cd backend
./scripts/cleanup-games.sh
```

## 실시간 통신

### SSE (Server-Sent Events)

클라이언트는 다음 엔드포인트를 통해 실시간 이벤트를 구독합니다:

```javascript
const eventSource = new EventSource('/api/rooms/{roomId}/sse');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Game event:', data);
};
```

### Redis Pub/Sub

백엔드 서비스 간 메시지 브로드캐스트:

```
room:{roomId} - 게임방 이벤트
session:{sessionId} - 세션 이벤트
```

## 국제화 (i18n)

### 지원 언어

- 한국어 (ko)
- 영어 (en)
- 중국어 간체 (zh-cn)
- 일본어 (ja)
- 스페인어 (es)
- 포르투갈어 (pt-br)
- 프랑스어 (fr)
- 러시아어 (ru)
- 독일어 (de)

### Paraglide 설정

프론트엔드는 Paraglide를 사용하여 런타임 국제화를 처리합니다.

```typescript
import { languageTag } from '@/paraglide/runtime';

const currentLang = languageTag(); // 'ko', 'en', 등
```

## 문제 해결

### 데이터베이스 연결 오류

```bash
# PostgreSQL 상태 확인
docker compose logs postgres

# 강제 재시작
docker compose down
docker compose up -d
```

### Redis 오류

```bash
# Redis 상태 확인
docker compose logs redis

# Redis 캐시 초기화
docker compose exec redis redis-cli FLUSHALL
```

### 프론트엔드 빌드 오류

```bash
# 의존성 재설치
cd frontend
bun install --force
bun run build
```

### JWT_SECRET 오류

```bash
# 새 시크릿 생성
openssl rand -hex 32

# .env에 추가
JWT_SECRET=<생성된_값>

# 서비스 재시작
docker compose restart backend
```

## 라이선스

이 프로젝트는 **MIT 라이선스** 하에 배포됩니다.

자세한 내용은 [LICENSE](../../LICENSE) 파일을 참조하세요.

## 기여하기

버그 리포트, 기능 제안, Pull Request를 환영합니다!

## 연락처

- 라이브 데모: [shot.game](https://shot.game/)
- 이슈 트래킹: GitHub Issues
- 논의: GitHub Discussions

---

**SHOT!** - 전략, 심리전, 스릴이 가득한 게임에 오신 것을 환영합니다!
