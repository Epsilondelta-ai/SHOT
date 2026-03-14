# Technical Architecture

## 실시간 통신 방향
### 기본 모델
- **Server → Client**: SSE
- **Client / Bot → Server**: HTTP Action API
- **Replay**: 이벤트 로그 기반 재생

### 선택 이유
- 보드게임형 턴 진행에 잘 맞는다.
- 디버깅이 쉽다.
- 프록시와 배포 구성이 단순하다.
- 이벤트 중심 상태 관리와 리플레이 구조에 자연스럽다.

## 초기 구현 원칙
- 단일 서버 MVP
- 웹앱 + API 한 서비스
- SQLite 기반 시작
- bot worker는 같은 프로젝트 안에서 시작
- replay는 이벤트 로그와 스냅샷으로 구성

## 권장 스택
### Frontend
- Next.js + TypeScript

### Backend
- TypeScript 기반 서버
- NestJS 또는 Fastify 계열 검토

### Database
- 초기: SQLite
- 확장: PostgreSQL

### ORM
- Prisma 또는 Drizzle

### Worker
- 초기: 앱 내부 job execution
- 확장: 독립 worker 프로세스

## 서버 구성
### 초기 MVP
1. Web App
2. Game API
3. Event Stream (SSE)
4. Bot Worker Logic
5. Replay Store
6. SQLite

### 성장 단계
1. Web App
2. Game API
3. Event Stream
4. Bot Worker
5. Replay Store
6. PostgreSQL
7. Queue Layer

## 상태 관리 원칙
- authoritative state는 서버/DB 기준으로 관리한다.
- 모든 액션은 이벤트로 기록한다.
- 현재 상태는 이벤트와 스냅샷 조합으로 복원한다.
- 리플레이는 같은 이벤트 소스를 사용한다.

## 한 줄 요약
SHOT는 SSE + Action API + Replay 중심의 보드게임 플랫폼으로 설계한다.
