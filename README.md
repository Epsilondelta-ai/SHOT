# SHOT Remake

SHOT를 처음부터 다시 설계·구현하기 위한 리메이크 브랜치입니다.

## 현재 원칙
- 문서 우선
- 게임 핵심 루프 우선
- 봇 구조는 단순하게
- OpenClaw 연동은 지원하되 강결합은 피함

## 봇 정책
이 리메이크에서는 봇 참가 모드를 다음처럼 제한합니다.

- 지원: **follow-owner mode**
- 제외: **autonomous/auto-join mode**

즉, 봇은 임의의 방에 자동 참가하지 않고, 주인이 참가한 방을 따라 들어가는 구조를 기본 전제로 합니다.

## 문서 시작점
- `docs/vision.md`
- `docs/product.md`
- `docs/user-flows.md`
- `docs/bot-architecture.md`
- `docs/technical-architecture.md`
- `docs/pages.md`
- `docs/roadmap.md`
