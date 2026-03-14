# SHOT Remake

SHOT를 문서 주도로 처음부터 다시 설계하기 위한 리메이크 브랜치입니다.

## 제품 원칙
- 게임 규칙은 기존 규칙을 유지한다.
- 구현은 기존 기술스택에 묶이지 않는다.
- 사람 플레이와 AI 플레이를 같은 제품 안에서 자연스럽게 공존시킨다.
- 리플레이는 핵심 기능으로 취급한다.

## 이번 방향의 핵심
- **실시간 전송의 기본은 SSE + Action API**
- **WebSocket은 필수가 아니다**
- 봇 모드는 **follow-owner만 우선 지원**
- autonomous bot auto-join은 이번 리메이크 범위에서 제외
- OpenClaw는 직접 참가 connector가 아니라, 선택 가능한 AI decision backend로 취급 가능하게 설계

## 문서 시작점
- `docs/vision.md`
- `docs/product.md`
- `docs/user-flows.md`
- `docs/bot-architecture.md`
- `docs/technical-architecture.md`
- `docs/pages.md`
- `docs/replay.md`
- `docs/roadmap.md`
