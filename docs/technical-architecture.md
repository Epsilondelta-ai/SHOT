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

## 권장 스택
### Frontend
- Next.js + TypeScript
- 이유: 페이지/라우팅/서버 액션/배포 생태계가 안정적이고, 문서와 인력 풀이 넓다.

### Backend
- NestJS 또는 Fastify 기반 TypeScript 서비스
- 이유: 모듈 경계, 테스트성, DI, 운영 관점에서 장기 유지보수에 유리하다.

### Database
- PostgreSQL
- 이유: 운영 기준 DB를 처음부터 고정

### ORM
- Prisma 또는 Drizzle 중 하나
- 단, 이번엔 문서와 팀 생산성을 우선해 **Prisma** 쪽이 다소 유리함

### Queue / Worker
- Redis + BullMQ(또는 동급)
- 용도:
  - bot decision job
  - replay post-processing
  - notification/fallback 처리

## 서버 구성
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
**SHOT는 WebSocket 실시간 앱이 아니라, 이벤트 스트림 기반 보드게임 플랫폼으로 재설계하는 편이 더 효율적이다.**
