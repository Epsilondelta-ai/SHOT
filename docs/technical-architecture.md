# Technical Architecture

## 제안 방향
### 실시간 통신
**기본은 SSE + Action API** 로 간다.

권장 이유:
- 보드게임형 턴 진행에 충분하다.
- 디버깅이 쉽다.
- 프록시/배포/스케일이 단순하다.
- 상태 반영과 리플레이 구조를 이벤트 중심으로 설계하기 좋다.

### WebSocket을 기본에서 제외하는 이유
- presence는 중요하지만, 보드게임형 턴 게임에서 초저지연 양방향은 필수는 아니다.
- 연결 상태/로드밸런싱/운영 난도가 올라간다.
- 봇/관전자/리플레이까지 포함하면 오히려 이벤트 스트림 + 명시적 액션 API가 단순하다.

### 권장 통신 모델
- **Server → Client**: SSE
- **Client / Bot → Server**: HTTP Action API
- **Replay**: 이벤트 로그 기반 재생

## 초기 구현 원칙
- **단일 서버 MVP**
- **웹앱 + API는 한 서비스**
- **DB는 SQLite부터 시작 가능**
- **Redis는 처음엔 넣지 않음**
- **bot worker는 별도 서버가 아니라 같은 프로젝트 내 논리 계층 또는 같은 머신의 별도 프로세스 수준으로 시작**

즉, 초기 목표는 확장성보다 제품 검증이다.

## 권장 스택
### Frontend
- Next.js + TypeScript

### Backend
- TypeScript 기반 서버
- NestJS 또는 Fastify 계열을 우선 검토
- 단, 초기 MVP에서는 "프레임워크 정답"보다 문서와 생산성을 우선한다.

### Database
- **초기: SQLite**
- **확장 시: PostgreSQL**

### ORM
- Prisma 또는 Drizzle 중 하나
- 초기 생산성과 문서 친화성 측면에서는 Prisma가 다소 유리하다.

### Queue / Worker
- **초기: 별도 큐 없음**
- 필요 시 메모리 큐 또는 단순 job runner
- 확장 시 Redis/BullMQ 계열 도입 검토

## 서버 구성
### 초기 MVP
1. Web App
2. Game API
3. Event Stream(SSE)
4. Bot Worker Logic
5. Replay Store
6. SQLite

### 확장 단계
1. Web App
2. Game API
3. Event Stream(SSE)
4. Bot Worker
5. Replay Store
6. PostgreSQL
7. Redis

## 상태 관리 원칙
- 게임의 authoritative state는 서버/DB 기준이다.
- 프로세스 메모리에만 상태를 두지 않는다.
- 모든 액션은 event log로 남긴다.
- 현재 상태는 event + snapshot 조합으로 복원 가능해야 한다.

## 한 줄 결론
**SHOT는 WebSocket 중심 실시간 앱이 아니라, SSE + Action API + Replay 중심의 단일 서버 MVP로 시작하는 편이 가장 효율적이다.**
