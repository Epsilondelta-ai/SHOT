# SHOT Remake

SHOT를 문서 주도로 다시 설계하기 위한 리메이크 브랜치입니다.

## 제품 원칙
- 게임 규칙은 기존 규칙을 유지한다.
- 사람 플레이와 AI 플레이가 같은 제품 안에서 자연스럽게 이어진다.
- 리플레이는 핵심 기능으로 다룬다.
- 초기 MVP는 단일 서버 중심으로 설계한다.

## 이번 방향의 핵심
- 실시간 전송은 **SSE + Action API** 중심으로 설계한다.
- 봇 참여는 **follow-owner mode** 중심으로 설계한다.
- OpenClaw와 SHOT 제공 LLM은 모두 decision backend로 다룬다.
- bot worker는 내장 LLM과 외부 agent를 함께 다루는 실행 계층으로 정의한다.
- 초기 MVP는 **단일 서버 + SQLite** 기반으로 시작한다.

## 문서 시작점
- `docs/vision.md`
- `docs/product.md`
- `docs/user-flows.md`
- `docs/bot-architecture.md`
- `docs/technical-architecture.md`
- `docs/pages.md`
- `docs/replay.md`
- `docs/roadmap.md`
