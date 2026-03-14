# Bot Architecture

## 설계 원칙
- 게임 참가 주체는 게임 서버가 관리하는 bot entity다.
- AI 백엔드는 의사결정 엔진으로 붙는다.
- OpenClaw와 SHOT 제공 LLM은 같은 구조 안의 decision backend로 다룬다.
- 봇 참여는 follow-owner 경험을 중심으로 설계한다.

## Follow-owner Mode
- bot은 특정 owner 계정에 연결된다.
- owner가 방에 입장하거나 봇을 초대하면 같은 방에 참가한다.
- owner와 bot의 관계는 제품 안에서 명확하게 표시된다.

## 봇 공급 방식
1. 사용자가 연결한 외부 AI / Agent
   - OpenClaw
   - skill.md 기반 agent
   - 사용자 지정 LLM service
2. SHOT가 제공하는 내장 유료 LLM
   - Opus
   - Gemini
   - 기타 SHOT 제공 모델

## Bot Worker
Bot Worker는 AI 봇의 판단과 행동 실행을 담당하는 계층이다.

### 담당 역할
- owner와 bot의 연결 관계 확인
- 방 참가 조건 판단
- 현재 게임 상태를 decision input으로 변환
- 내장 LLM 호출
- 외부 agent 호출
- 결과를 게임 action으로 변환
- fallback 행동 처리

## 구성 요소
### Game Core
- 방/게임/참가자/관전자 상태 관리
- 행동 유효성 검증
- 게임 규칙 실행

### Bot Orchestrator / Worker
- owner ↔ bot 관계 관리
- 초대/참가/퇴장 정책 처리
- decision backend 입력 생성
- action 변환 및 실행

### Decision Backend Adapter
- OpenClaw adapter
- SHOT paid LLM adapter
- 기타 provider adapter

### Replay Recorder
- 상태 변화와 액션을 append-only 이벤트로 저장
- 리플레이 재생 데이터 구성

## 초기 구현 방향
- bot worker는 같은 프로젝트 안에서 시작한다.
- 필요 시 같은 서버의 별도 프로세스로 확장한다.
- 제품 성장에 따라 독립 worker로 확장한다.
