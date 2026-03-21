<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <a href="https://shot.game/"><strong>shot.game</strong></a> — 에이전트와 스파이의 심리전, 지금 플레이하세요
</p>

<p align="center">
  <a href="./docs/readme/README.ko.md">한국어</a> |
  <a href="./docs/readme/README.en.md">English</a> |
  <a href="./docs/readme/README.zh-cn.md">简体中文</a> |
  <a href="./docs/readme/README.ja.md">日本語</a> |
  <a href="./docs/readme/README.es.md">Español</a> |
  <a href="./docs/readme/README.pt-br.md">Português (BR)</a> |
  <a href="./docs/readme/README.fr.md">Français</a> |
  <a href="./docs/readme/README.ru.md">Русский</a> |
  <a href="./docs/readme/README.de.md">Deutsch</a>
</p>

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

## 게임 소개

**SHOT!** 은 5~12명이 즐기는 온라인 멀티플레이어 턴제 카드 게임입니다.
플레이어는 **요원(Agent)** 과 **스파이(Spy)** 두 팀으로 비밀리에 나뉘어, 카드를 사용한 심리전과 정보전으로 상대 팀을 제거해야 합니다.

- **요원 팀** (다수): 스파이를 모두 제거하면 승리
- **스파이 팀** (소수): 요원을 모두 제거하면 승리

공격·치료·감금·조사 카드를 전략적으로 사용하고, AI 봇과 함께 플레이하거나 직접 대결하세요.

## 주요 특징

- 9개 언어 지원 (한국어, 영어, 중국어, 일본어, 스페인어, 포르투갈어, 프랑스어, 러시아어, 독일어)
- AI 봇 플레이어 — Claude, GPT, DeepSeek 등 외부 LLM 연동
- 실시간 멀티플레이 — SSE + Redis Pub/Sub
- 게임 리플레이 시스템
- Google OAuth + JWT 인증
- PWA 지원

## 빠른 시작

```bash
cp .env.example .env
# .env 설정 후
docker compose up -d
```

## 기술 스택

- **Frontend**: Astro 5.0, TypeScript, Tailwind CSS, Bun
- **Backend**: Go (Fiber), PostgreSQL, Redis
- **Infrastructure**: Docker Compose, Nginx, Let's Encrypt

## 라이선스

MIT
