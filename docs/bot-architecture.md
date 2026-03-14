# Bot Architecture

## 설계 원칙
- 게임 참가 주체는 게임 서버가 관리하는 bot entity다.
- AI 백엔드는 의사결정 엔진으로 붙는다.
- OpenClaw는 선택 가능한 backend 중 하나일 뿐, 제품 구조의 중심이 아니다.
- 이번 단계에서는 **follow-owner mode만 지원**한다.

## 왜 follow-owner만 남기는가
제품의 핵심은 "내 AI를 데려와 같이 즐기는 경험"이다.
autonomous auto-join은 재미보다 운영 복잡도를 먼저 키우기 쉽다.
따라서 MVP에서는 owner와의 관계가 분명한 봇만 다룬다.

## 지원 모드
### Follow-owner
- bot은 특정 owner 계정에 연결된다.
- owner가 방에 입장하거나 봇을 명시적으로 초대하면 같은 방에 들어간다.
- owner 없이 임의의 대기방을 스캔해 참가하지 않는다.

## 지원해야 하는 봇 공급 방식
1. 사용자가 연결한 외부 AI / Agent
   - OpenClaw
   - skill.md 기반 agent
   - 사용자 지정 LLM service
2. SHOT가 제공하는 내장 유료 LLM
   - Opus
   - Gemini
   - 기타 SHOT가 제공하는 모델

## Bot Worker의 의미
Bot Worker는 "AI 봇의 생각하고 행동하는 부분"을 담당하는 실행 계층이다.

이 계층은 다음을 포함한다.
- owner와 bot의 연결 관계 확인
- 방 참가 조건 판단
- 현재 게임 상태를 decision input으로 변환
- 내장 LLM 호출
- 외부 agent 호출
- 결과를 게임 action으로 변환
- 실패 시 fallback 처리

즉, **내장 LLM과 외부 에이전트를 모두 다루는 상위 실행 계층**이다.

## 권장 구조
### Game Core
- 방/게임/참가자/관전자 상태 관리
- 행동 유효성 검증
- 게임 규칙 실행

### Bot Orchestrator / Worker
- owner ↔ bot 관계 관리
- 초대/참가/퇴장 정책 처리
- 현재 상태를 decision backend 입력으로 변환
- 결과를 게임 action으로 변환

### Decision Backend Adapter
- OpenClaw adapter
- SHOT paid LLM adapter
- 기타 provider adapter

### Replay Recorder
- 모든 상태 변화와 액션을 append-only 이벤트로 저장
- 리플레이는 이 이벤트를 재생해 구성

## 초기 구현 원칙
- 처음에는 bot worker를 별도 인프라로 분리하지 않는다.
- 같은 프로젝트 안의 논리 계층 또는 같은 서버의 별도 프로세스로 시작한다.
- 나중에 부하가 커지면 worker만 독립 분리한다.

## 핵심 포인트
- 봇 시스템은 게임 코어와 분리되어야 한다.
- AI 추론 실패가 곧 게임 서버 장애가 되면 안 된다.
- fallback 행동 정책이 명확해야 한다.
