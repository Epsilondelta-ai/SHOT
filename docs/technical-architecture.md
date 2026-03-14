# Technical Architecture

## 권장 스택 방향
### Frontend
- SvelteKit 또는 Next.js 중 하나로 일관성 있게 선택
- 실시간 상태는 SSE 우선 검토
- 복잡한 양방향성이 꼭 필요할 때만 WebSocket 사용

### Backend
- TypeScript
- 명확한 서비스 계층
- 게임 상태, 방 상태, 봇 상태를 분리

### Database
- 처음부터 Postgres 기준 설계
- 로컬 개발만 SQLite를 임시 허용하더라도, 운영 중심 모델은 Postgres로 문서화

### Realtime
- 우선순위:
  1. SSE + action API
  2. 필요시 WebSocket

### Bot Integration
- bot adapter 계층 분리
- OpenClaw 직접 의존 최소화
- AI decision provider 교체 가능 구조

## 서버 구성 원칙
- app server
- realtime delivery layer
- bot adapter/worker
- database

## 피해야 할 것
- 게임 상태를 프로세스 메모리에만 두는 구조
- connector 하나에 전체 봇 구조를 묶는 설계
- 프론트/백/봇/운영 설정이 한 군데 섞인 구조
