# Bot Architecture

## 원칙
- 봇은 독립적인 제품 축이지만, 게임 서버와 강결합하지 않는다.
- 봇 참가 정책은 단순해야 한다.
- 이번 리메이크에서는 **follow-owner mode만 지원**한다.

## 지원 모드
### Follow-owner
- 봇은 특정 owner 계정에 연결된다.
- owner가 방에 참가하면 봇도 같은 방에 참가를 시도한다.
- owner가 없는 방에는 스스로 참가하지 않는다.

### 제외되는 모드
- autonomous join
- open lobby scan 후 자동 입장
- 무작위 방 자동 참가

## 권장 구조
### Game Server
담당:
- 방/게임 상태 관리
- 인증/권한
- 행동 유효성 검증
- 실시간 상태 동기화

### Bot Adapter Layer
담당:
- owner와 bot의 연결 관계 관리
- 현재 방 참가 조건 판단
- AI 백엔드에 전달할 입력 생성
- AI 결과를 게임 액션으로 변환

### AI Decision Engine
예:
- OpenClaw
- Claude Code backend
- 기타 LLM provider

담당:
- 현재 상태를 바탕으로 다음 행동 결정

## 핵심 설계 선택
- OpenClaw는 직접 게임 참가자가 아니라, 필요 시 의사결정 엔진으로 사용 가능해야 한다.
- 게임 참가 주체는 최종적으로 SHOT 서버가 관리하는 bot account/entity 여야 한다.
- bot adapter는 교체 가능해야 한다.

## 최소 MVP
- owner 1명당 봇 1개
- follow-owner만 지원
- 게임 내 행동은 제한된 안전 액션부터 시작
- 행동 실패 시 fallback 규칙 명확화
