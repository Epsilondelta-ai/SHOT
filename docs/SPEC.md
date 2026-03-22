# SHOT! 프로젝트 기술 스펙 문서

> 최종 업데이트: 2026-03-21
> 버전: 0.0.2-alpha

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [아키텍처](#3-아키텍처)
4. [게임 규칙](#4-게임-규칙)
5. [데이터 모델](#5-데이터-모델)
6. [API 엔드포인트](#6-api-엔드포인트)
7. [실시간 통신 (SSE)](#7-실시간-통신-sse)
8. [게임 로직 구현](#8-게임-로직-구현)
9. [봇(Bot) 시스템](#9-봇bot-시스템)
10. [인증 시스템](#10-인증-시스템)
11. [프론트엔드 구조](#11-프론트엔드-구조)
12. [국제화 (i18n)](#12-국제화-i18n)
13. [인프라 & 배포](#13-인프라--배포)
14. [환경 변수](#14-환경-변수)
15. [리플레이 시스템](#15-리플레이-시스템)

---

## 1. 프로젝트 개요

**SHOT!** 은 5~12명이 플레이하는 온라인 턴 기반 전략 카드 게임입니다.

- **장르**: 정보 은폐 + 턴 기반 카드 게임
- **구조**: 대원(Agent) 팀 vs 스파이(Spy) 팀
- **특징**: AI 봇 플레이어 지원, 외부 봇 API 제공, 리플레이 시스템, 9개 언어 지원

### 핵심 특징

| 특징          | 설명                                                |
| ------------- | --------------------------------------------------- |
| 플레이어 수   | 5~12명 (인간 + AI 봇 혼합 가능)                     |
| 실시간 동기화 | SSE (Server-Sent Events) + Redis Pub/Sub            |
| 봇 API        | 외부 AI 봇이 RESTful API + SSE로 게임 참여          |
| 리플레이      | 모든 게임 액션 기록, 좋아요/즐겨찾기                |
| 다국어        | 9개 언어 (ko, en, zh-cn, ja, es, pt-br, fr, ru, de) |

---

## 2. 기술 스택

### 백엔드

| 항목          | 기술                                          |
| ------------- | --------------------------------------------- |
| 언어          | Go 1.25                                       |
| 웹 프레임워크 | Fiber v2 (github.com/gofiber/fiber/v2)        |
| ORM           | GORM (gorm.io/gorm)                           |
| DB 드라이버   | PostgreSQL (gorm.io/driver/postgres + pgx v5) |
| 캐시/Pub-Sub  | Redis (github.com/redis/go-redis/v9)          |
| JWT           | golang-jwt/jwt v5                             |
| OAuth         | golang.org/x/oauth2 (Google OAuth 2.0)        |
| UUID          | github.com/google/uuid                        |
| 비밀번호      | golang.org/x/crypto (bcrypt)                  |
| 환경변수      | joho/godotenv                                 |
| 모듈명        | github.com/epsilondelta/shot                  |

### 프론트엔드

| 항목        | 기술                               |
| ----------- | ---------------------------------- |
| 프레임워크  | Astro 5.0 (SSG — 정적 사이트 생성) |
| 언어        | TypeScript 5.0                     |
| 스타일링    | Tailwind CSS 3.4                   |
| 패키지 관리 | Bun                                |
| i18n 런타임 | Paraglide (inlang)                 |
| 사이트맵    | @astrojs/sitemap                   |
| 서빙        | Nginx (정적 파일)                  |

### 인프라

| 항목          | 기술                                |
| ------------- | ----------------------------------- |
| 컨테이너      | Docker Compose                      |
| DB            | PostgreSQL 17-alpine                |
| 캐시          | Redis 7-alpine                      |
| 리버스 프록시 | Nginx (nginx:alpine)                |
| SSL           | Let's Encrypt + Certbot (자동 갱신) |
| 빌드 도구     | Makefile                            |

---

## 3. 아키텍처

### 서비스 구성도

```
인터넷
  │
  ▼
[Nginx Proxy] ← SSL 종료, Rate Limiting, 보안 헤더
  ├─ HTTPS :443
  └─ HTTP  :80 → 301 리다이렉트
       │
       ├─ /api/auth/*    → Backend :3000  [Rate: 20r/m]
       ├─ /api/*/sse     → Backend :3000  [SSE, 연결당 IP 최대 60개]
       ├─ /api/*         → Backend :3000  [Rate: 10r/s]
       ├─ /health        → Backend :3000  [내부 네트워크만]
       └─ /*             → Frontend :80   [정적 파일]
            │
            ├─ [Backend]   Go/Fiber ← PostgreSQL + Redis
            └─ [Frontend]  Nginx (정적 Astro 빌드)
```

### 개발 환경 vs 프로덕션 환경

| 항목          | 개발                   | 프로덕션                          |
| ------------- | ---------------------- | --------------------------------- |
| Nginx         | Frontend 컨테이너 내장 | 별도 nginx-proxy 서비스           |
| SSL           | 없음 (HTTP)            | Let's Encrypt (443)               |
| Rate Limiting | 없음                   | 인증 20r/m, API 10r/s, SSE 60연결 |
| 보안 헤더     | 없음                   | HSTS, X-Frame-Options 등          |
| 외부 포트     | Frontend :80           | nginx-proxy :80/:443              |

### 상태 저장소

| 데이터              | 저장소                      | TTL       |
| ------------------- | --------------------------- | --------- |
| 게임 진행 상태      | Redis (`game:{gameId}`)     | 24시간    |
| 게임 이벤트         | PostgreSQL (`game_actions`) | 영구      |
| 사용자/방/게임 메타 | PostgreSQL                  | 영구      |
| SSE 채널            | Redis Pub/Sub               | 연결 기간 |
| 세션 상태           | Redis Pub/Sub               | 연결 기간 |

---

## 4. 게임 규칙

### 4.1 기본 정보

| 항목           | 내용                 |
| -------------- | -------------------- |
| 플레이어 수    | 5~12명               |
| 초기 HP        | 3 (대원/스파이 동일) |
| 초기 핸드      | 2장                  |
| 턴당 드로우    | 2장                  |
| 카드 사용 제한 | 없음 (무제한)        |
| 카드 사용 방식 | 순차 처리 (1장씩)    |
| 턴 시간 제한   | 2분                  |
| 무승부 턴 수   | 플레이어 수 × 3      |
| 턴 순서        | 랜덤 시작, 시계 방향 |

### 4.2 인원별 역할 배분

| 총 인원 | 스파이 | 대원 | 비고        |
| ------- | ------ | ---- | ----------- |
| 5       | 1      | 4    | 스파이 불리 |
| 6       | 2      | 4    |             |
| 7       | 2      | 5    |             |
| 8       | 3      | 5    |             |
| 9       | 3      | 6    | 권장 인원   |
| 10      | 3      | 7    |             |
| 11      | 4      | 7    |             |
| 12      | 4      | 8    |             |

### 4.3 승리 조건

| 팀        | 승리 조건                     |
| --------- | ----------------------------- |
| 대원 팀   | 모든 스파이 제거 시 즉시 승리 |
| 스파이 팀 | 모든 대원 제거 시 즉시 승리   |
| 무승부    | 총 턴 수 > 플레이어 수 × 3    |

### 4.4 카드 시스템

| 카드                   | 효과                               | 덱 수량        | 소지 한도 | 사용 후 처리            |
| ---------------------- | ---------------------------------- | -------------- | --------- | ----------------------- |
| **공격** (attack)      | 대상 1 데미지                      | 플레이어수 × 5 | 6장       | 폐기 더미 (재사용 가능) |
| **회복** (heal)        | 대상 HP +1 (최대 초과 불가)        | 플레이어수 × 2 | 2장       | 폐기 더미 (재사용 가능) |
| **수감** (jail)        | 대상 다음 턴 공격 봉인 (중복 불가) | 플레이어수 × 1 | 1장       | 완전 제거 (Banished)    |
| **신원조회** (inspect) | 대상 정체 확인                     | 스파이수 × 2   | 무제한    | 완전 제거 (Banished)    |

**총 덱 수량** = (플레이어수 × 8) + (스파이수 × 2)

**모든 보유 카드는 모든 플레이어에게 공개됩니다.**

### 4.5 턴 구조

```
턴 시작
  │
  ▼
[드로우 단계] ──── 카드 2장 드로우 (소지 한도 초과 시 자동 폐기)
  │
  ▼
[행동 단계] ──── 카드 자유롭게 사용 (횟수 무제한, 순차 처리)
  │                └─ 공격 카드 사용 시 즉시 HP 적용 + 승리 조건 체크
  │                └─ 채팅 1회 가능 (최대 100자, 생략 가능)
  ▼
[턴 종료] ──── 반드시 공격 카드 1장 이상 사용해야 종료 가능
  │              예외: 수감 상태이거나 공격 카드 없는 경우
  ▼
다음 플레이어 턴
```

**턴 타임아웃**: 2분 초과 시 사용 가능한 공격 카드를 자동으로 사용

### 4.6 수감 시스템

| 수감 유형    | 원인             | 지속 턴수 | 효과                |
| ------------ | ---------------- | --------- | ------------------- |
| 일반 수감    | 수감 카드 피격   | 1턴       | 공격 카드 사용 불가 |
| 아군 킬 수감 | 아군 사살 페널티 | 2턴       | 공격 카드 사용 불가 |

- 수감 중에도 회복, 신원조회, 수감 카드 사용 가능
- 해제: 자신의 턴 종료 시 `JailTurnsLeft` 1 감소 → 0이 되면 해제

### 4.7 사망 및 킬 보상

**킬 보상** (킬한 플레이어에게, 모든 킬에 동일):

- HP 1 회복
- 카드 1장 드로우

**아군 킬 페널티** (대원이 대원을, 또는 숨겨진 스파이가 대원을 죽였을 때):

- 수감 상태 2턴 부과

**탄로난 스파이가 대원을 죽인 경우**: 페널티 없음

**사망 처리**:

- 사망 즉시 정체(대원/스파이) 공개

### 4.8 정체 시스템

| 상태          | 설명                      | 필드                                         |
| ------------- | ------------------------- | -------------------------------------------- |
| 미확정        | 정체 미공개               | `IsRevealed=false`, `IsConfirmedAgent=false` |
| 확정 대원     | 신원조회로 대원 확인      | `IsConfirmedAgent=true`                      |
| 탄로난 스파이 | 신원조회 또는 자발적 공개 | `IsRevealed=true`                            |

**신원조회 규칙**:

- 대상이 대원 → `IsConfirmedAgent=true`
- 대상이 스파이 → `IsRevealed=true`
- 정체가 이미 확정된 플레이어에게는 사용 불가
- 자신에게 사용 불가

**스파이 자발적 정체 공개** (`/api/games/:id/reveal`):

- 자신의 턴 중에만 가능
- 보너스: 카드 2장 드로우 + 채팅 기회 1회 추가

### 4.9 채팅 규칙

| 대상                         | 채팅 가능 시점         | 횟수 |
| ---------------------------- | ---------------------- | ---- |
| 인간 플레이어                | 드로우 후 ~ 턴 종료 전 | 1회  |
| AI 봇                        | 드로우 직후            | 1회  |
| AI 봇 (스파이, 정체 공개 후) | 공개 직후 추가         | 1회  |

- 최대 100자 (유니코드 기준)
- 채팅은 생략 가능

### 4.10 덱 재구성

덱이 소진되면 폐기 더미를 셔플하여 새 덱 구성. 완전 제거(Banished)된 카드는 재구성에 포함되지 않음.

---

## 5. 데이터 모델

### PostgreSQL 테이블 (GORM AutoMigrate)

#### users

| 컬럼          | 타입                     | 설명                      |
| ------------- | ------------------------ | ------------------------- |
| id            | varchar(36) PK           | UUID                      |
| email         | varchar(255) UNIQUE      | 이메일                    |
| username      | varchar(50)              | 사용자명                  |
| password_hash | varchar(255)             | bcrypt 해시 (이메일 가입) |
| google_id     | varchar(255) UNIQUE NULL | Google OAuth ID           |
| avatar_url    | text                     | 프로필 이미지 URL         |
| created_at    | timestamp                |                           |
| updated_at    | timestamp                |                           |

#### bots

| 컬럼       | 타입               | 설명        |
| ---------- | ------------------ | ----------- |
| id         | varchar(36) PK     | UUID        |
| user_id    | varchar(36)        | 봇 소유자   |
| name       | varchar(100)       | 봇 이름     |
| avatar_url | text               | 봇 아바타   |
| api_key    | varchar(64) UNIQUE | API 인증 키 |
| created_at | timestamp          |             |
| updated_at | timestamp          |             |
| deleted_at | timestamp NULL     | 소프트 삭제 |

#### rooms

| 컬럼            | 타입           | 설명                      |
| --------------- | -------------- | ------------------------- |
| id              | varchar(36) PK | UUID                      |
| name            | varchar(100)   | 방 이름                   |
| host_id         | varchar(36)    | 방장 ID                   |
| status          | varchar(20)    | waiting \| playing        |
| max_players     | int            | 최대 플레이어 수 (기본 8) |
| player_count    | int            | 현재 플레이어 수          |
| bot_count       | int            | 현재 봇 수                |
| spectator_count | int            | 현재 관전자 수            |
| is_private      | bool           | 비공개 방 여부            |
| password        | varchar(100)   | 비밀번호 (비공개 방)      |
| created_at      | timestamp      |                           |
| updated_at      | timestamp      |                           |

#### room_members

| 컬럼            | 타입           | 설명                       |
| --------------- | -------------- | -------------------------- |
| id              | varchar(36) PK | UUID                       |
| room_id         | varchar(36)    | 방 ID                      |
| user_id         | varchar(36)    | 사용자 ID (봇은 소유자 ID) |
| bot_id          | varchar(36)    | 봇 ID (빈 문자열이면 인간) |
| is_spectator    | bool           | 관전자 여부                |
| can_invite_bots | bool           | 봇 초대 권한               |
| joined_at       | timestamp      | 입장 시간                  |

#### games

| 컬럼           | 타입             | 설명                         |
| -------------- | ---------------- | ---------------------------- |
| id             | varchar(36) PK   | UUID                         |
| room_id        | varchar(36)      | 방 ID                        |
| title          | varchar(100)     | 방 이름 스냅샷               |
| status         | varchar(20)      | playing \| finished          |
| result         | varchar(20) NULL | agent_win \| spy_win \| draw |
| player_count   | int              | 참여 플레이어 수             |
| turn_count     | int              | 실제 진행된 턴 수            |
| max_turns      | int              | 최대 턴 수                   |
| view_count     | int              | 리플레이 조회 수             |
| like_count     | int              | 좋아요 수                    |
| favorite_count | int              | 즐겨찾기 수                  |
| created_at     | timestamp        | 게임 시작 시각               |
| finished_at    | timestamp NULL   | 게임 종료 시각               |

#### game_players

| 컬럼       | 타입           | 설명                       |
| ---------- | -------------- | -------------------------- |
| id         | varchar(36) PK | UUID                       |
| game_id    | varchar(36)    | 게임 ID                    |
| user_id    | varchar(36)    | 사용자 ID                  |
| bot_id     | varchar(36)    | 봇 ID (빈 문자열이면 인간) |
| role       | varchar(10)    | agent \| spy               |
| start_hp   | int            | 시작 HP (기본 3)           |
| username   | varchar(100)   | 사용자명 스냅샷            |
| avatar_url | text           | 아바타 URL 스냅샷          |

#### game_actions

| 컬럼        | 타입           | 설명            |
| ----------- | -------------- | --------------- |
| id          | varchar(36) PK | UUID            |
| game_id     | varchar(36)    | 게임 ID         |
| turn        | int            | 턴 번호         |
| seq         | int            | 턴 내 액션 순서 |
| actor_id    | varchar(36)    | 액션 수행자 ID  |
| action_type | varchar(30)    | 액션 유형       |
| target_id   | varchar(36)    | 대상 ID         |
| payload     | text           | JSON 추가 정보  |
| created_at  | timestamp      |                 |

#### replay_likes / replay_favorites

| 컬럼       | 타입                     | 설명          |
| ---------- | ------------------------ | ------------- |
| id         | varchar(36) PK           | UUID          |
| game_id    | varchar(36) UNIQUE(복합) | 게임 ID       |
| user_id    | varchar(36) UNIQUE(복합) | 사용자 ID     |
| created_at | timestamp                | (favorites만) |

### Redis 키 패턴

| 키                         | 내용                     | TTL    |
| -------------------------- | ------------------------ | ------ |
| `game:{gameId}`            | GameState JSON           | 24시간 |
| `bot:online:{botId}`       | 봇 온라인 상태           | 30초   |
| `room:msg:{roomId}`        | Pub/Sub 채널 (방 메시지) | -      |
| `room:ctrl:{roomId}`       | Pub/Sub 채널 (방 제어)   | -      |
| `bot:events:{botId}`       | Pub/Sub 채널 (봇 이벤트) | -      |
| `session:replace:{userId}` | Pub/Sub 채널 (세션 교체) | -      |
| `timer:{gameId}`           | 게임 타이머 상태         | -      |

---

## 6. API 엔드포인트

### 인증

| 메서드 | 경로                        | 설명                    |
| ------ | --------------------------- | ----------------------- |
| POST   | `/api/auth/signup`          | 이메일 회원가입         |
| POST   | `/api/auth/login`           | 이메일 로그인           |
| POST   | `/api/auth/exchange`        | OAuth 코드 교환         |
| GET    | `/api/auth/google`          | Google OAuth 리다이렉트 |
| GET    | `/api/auth/google/callback` | Google OAuth 콜백       |

### 사용자

| 메서드 | 경로                   | 설명                   |
| ------ | ---------------------- | ---------------------- |
| GET    | `/api/me`              | 내 정보 조회           |
| PATCH  | `/api/me`              | 내 정보 수정           |
| GET    | `/api/me/room`         | 현재 내가 있는 방 조회 |
| GET    | `/api/players/:userId` | 플레이어 프로필 조회   |
| GET    | `/api/stats`           | 서비스 통계            |

### 방 (Room)

| 메서드 | 경로                                         | 설명           |
| ------ | -------------------------------------------- | -------------- |
| GET    | `/api/rooms`                                 | 방 목록 조회   |
| POST   | `/api/rooms`                                 | 방 생성        |
| GET    | `/api/rooms/:id`                             | 방 정보 조회   |
| PATCH  | `/api/rooms/:id`                             | 방 정보 수정   |
| POST   | `/api/rooms/:id/join`                        | 방 입장        |
| POST   | `/api/rooms/:id/leave`                       | 방 퇴장        |
| POST   | `/api/rooms/:id/spectate`                    | 관전자로 입장  |
| GET    | `/api/rooms/:id/members`                     | 방 멤버 목록   |
| POST   | `/api/rooms/:id/chat`                        | 방 채팅        |
| POST   | `/api/rooms/:id/start`                       | 게임 시작      |
| POST   | `/api/rooms/:id/invite-bot`                  | 봇 초대        |
| POST   | `/api/rooms/:id/kick`                        | 플레이어 강퇴  |
| POST   | `/api/rooms/:id/transfer-host`               | 방장 양도      |
| PATCH  | `/api/rooms/:id/members/:userId/permissions` | 멤버 권한 설정 |
| GET    | `/api/rooms/:id/sse`                         | 방 SSE 연결    |

### 게임 (Game)

| 메서드 | 경로                       | 설명                  |
| ------ | -------------------------- | --------------------- |
| GET    | `/api/games/:id/state`     | 게임 상태 조회        |
| POST   | `/api/games/:id/play-card` | 카드 사용             |
| POST   | `/api/games/:id/end-turn`  | 턴 종료               |
| POST   | `/api/games/:id/reveal`    | 스파이 정체 공개      |
| POST   | `/api/games/:id/chat`      | 게임 채팅             |
| POST   | `/api/games/:id/leave`     | 게임 퇴장 (관전 전환) |

### 봇 관리

| 메서드 | 경로                           | 설명           |
| ------ | ------------------------------ | -------------- |
| GET    | `/api/bots`                    | 내 봇 목록     |
| POST   | `/api/bots`                    | 봇 생성        |
| PATCH  | `/api/bots/:id`                | 봇 정보 수정   |
| DELETE | `/api/bots/:id`                | 봇 삭제        |
| POST   | `/api/bots/:id/regenerate-key` | API 키 재발급  |
| GET    | `/api/bots/:botId/profile`     | 봇 프로필 조회 |

### 봇 게임 플레이 API

봇은 별도의 인증 헤더(`X-Bot-Key: {apiKey}`)로 인증합니다.

| 메서드 | 경로                      | 설명             |
| ------ | ------------------------- | ---------------- |
| GET    | `/api/bot/sse`            | 봇 SSE 연결      |
| GET    | `/api/bot/game/state`     | 현재 게임 상태   |
| GET    | `/api/bot/game/actions`   | 게임 액션 로그   |
| POST   | `/api/bot/game/play-card` | 카드 사용        |
| POST   | `/api/bot/game/end-turn`  | 턴 종료          |
| POST   | `/api/bot/game/reveal`    | 스파이 정체 공개 |
| POST   | `/api/bot/game/chat`      | 채팅             |

### 리플레이

| 메서드 | 경로                            | 설명                   |
| ------ | ------------------------------- | ---------------------- |
| GET    | `/api/replays`                  | 리플레이 목록          |
| GET    | `/api/replays/favorites`        | 즐겨찾기 리플레이 목록 |
| GET    | `/api/replays/:gameId`          | 리플레이 상세          |
| GET    | `/api/replays/:gameId/actions`  | 리플레이 액션 로그     |
| POST   | `/api/replays/:gameId/view`     | 조회수 증가            |
| POST   | `/api/replays/:gameId/like`     | 좋아요                 |
| DELETE | `/api/replays/:gameId/like`     | 좋아요 취소            |
| POST   | `/api/replays/:gameId/favorite` | 즐겨찾기 추가          |
| DELETE | `/api/replays/:gameId/favorite` | 즐겨찾기 제거          |

### 세션

| 메서드 | 경로               | 설명                             |
| ------ | ------------------ | -------------------------------- |
| GET    | `/api/session/sse` | 세션 SSE 연결 (중복 로그인 감지) |

### 헬스체크

| 메서드 | 경로      | 설명                             |
| ------ | --------- | -------------------------------- |
| GET    | `/health` | 서버 상태 확인 (내부 네트워크만) |

---

## 7. 실시간 통신 (SSE)

### 구조

백엔드는 WebSocket 대신 **Server-Sent Events (SSE)** 를 사용합니다.
내부적으로 **Redis Pub/Sub**를 통해 멀티 인스턴스 지원이 가능하도록 설계됐습니다.

### SSE 채널 종류

| 채널     | Redis 패턴                 | 용도                           |
| -------- | -------------------------- | ------------------------------ |
| 방 SSE   | `room:msg:{roomId}`        | 방 내 모든 이벤트 브로드캐스트 |
| 방 제어  | `room:ctrl:{roomId}`       | kick, duplicate 등 제어 신호   |
| 봇 SSE   | `bot:events:{botId}`       | 봇 전용 이벤트                 |
| 세션 SSE | `session:replace:{userId}` | 중복 로그인 감지 및 강제 종료  |

### Hub 구조

```
Hub (game/room hub)
├── rooms: map[roomID]map[*Client]bool  (메모리 내 클라이언트)
├── bots:  map[botID]*Client            (봇 클라이언트)
└── Redis PSubscribe: room:msg:*, room:ctrl:*, bot:events:*

SessionHub (session hub)
└── users: map[userID]chan []byte
    Redis PSubscribe: session:replace:*
```

### SSE 이벤트 타입 (방/게임)

| 이벤트 타입    | 설명                                 |
| -------------- | ------------------------------------ |
| `room_update`  | 방 상태 변경 (멤버 입/퇴장, 방 정보) |
| `game_start`   | 게임 시작                            |
| `game_state`   | 게임 상태 전체 동기화                |
| `card_played`  | 카드 사용 결과                       |
| `turn_advance` | 턴 전환                              |
| `game_end`     | 게임 종료 (결과 포함)                |
| `chat`         | 채팅 메시지                          |
| `kicked`       | 강퇴                                 |
| `duplicate`    | 중복 접속 감지                       |

### SSE 연결 흐름

```
클라이언트 → GET /api/rooms/:id/sse?token={jwt}
  │
  ├── JWT 파싱 → UserID 추출
  ├── Hub에 Client 등록
  ├── 초기 방 상태 전송 (resync)
  └── 이벤트 스트림 유지 (proxy_read_timeout 24h)

Redis Pub/Sub → Hub → Client Channel → SSE 응답
```

---

## 8. 게임 로직 구현

### 패키지 구조

```
backend/
├── main.go              진입점, 라우팅
├── db/
│   ├── db.go           PostgreSQL 연결 + AutoMigrate
│   └── redis.go        Redis 연결
├── models/
│   ├── user.go         User 모델
│   ├── bot.go          Bot 모델
│   ├── room.go         Room 모델
│   ├── room_member.go  RoomMember 모델
│   └── game.go         Game, GamePlayer, GameAction, ReplayLike, ReplayFavorite
├── game/
│   ├── state.go        GameState, PlayerState (Redis 저장/로드)
│   ├── deck.go         덱 구성, 드로우, 오버플로우 처리
│   ├── engine.go       게임 엔진 (StartGame, PlayCard, EndTurn, Reveal, CheckWinCondition)
│   ├── lock.go         게임별 뮤텍스 잠금
│   └── timer.go        턴 타이머 관리 (2분 타임아웃, Redis 복구)
├── hub/
│   ├── hub.go          방/봇 SSE 허브 (Redis Pub/Sub)
│   └── session_hub.go  세션 SSE 허브
└── handlers/
    ├── auth.go         인증 (Signup, Login, Google OAuth, Exchange)
    ├── user.go         사용자 정보
    ├── room.go         방 CRUD, 입퇴장, 채팅, 게임 시작
    ├── game.go         게임 플레이 (PlayCard, EndTurn, Reveal, Chat, Leave)
    ├── bot.go          봇 관리 (CRUD, API 키)
    ├── bot_game.go     봇 게임 플레이 API
    ├── player.go       플레이어 프로필
    ├── replay.go       리플레이 (목록, 상세, 좋아요, 즐겨찾기)
    ├── session.go      세션 SSE
    ├── sse.go          SSE 공통 로직
    └── stats.go        서버 통계
```

### GameState 구조 (Redis)

```json
{
  "gameId": "uuid",
  "roomId": "uuid",
  "status": "playing | finished",
  "result": "agent_win | spy_win | draw",
  "players": [
    {
      "id": "userId or botId",
      "userId": "uuid",
      "botId": "uuid or ''",
      "role": "agent | spy",
      "hp": 3,
      "maxHp": 3,
      "cards": ["attack", "heal"],
      "isJailed": false,
      "jailTurnsLeft": 0,
      "isRevealed": false,
      "isConfirmedAgent": false,
      "isDead": false,
      "hasAttackedThisTurn": false,
      "hasChatted": false,
      "username": "...",
      "avatarUrl": "..."
    }
  ],
  "deck": ["attack", "heal", ...],
  "discard": [...],
  "banished": 0,
  "currentTurnIndex": 0,
  "turnOrder": ["playerId1", "playerId2", ...],
  "turnCount": 1,
  "maxTurns": 27,
  "turnDeadline": 1742000000,
  "phase": "draw | action | end",
  "actionSeq": 0
}
```

### 타이머 관리

- **구현**: `game.TimerManager` (싱글턴 `game.TM`)
- **타임아웃**: 2분
- **카드 사용 시**: 타이머 초기화
- **타임아웃 시**: 자동으로 공격 카드 사용 (가능한 경우)
- **서버 재시작 복구**: Redis에서 타이머 상태 복구 (`RecoverTimers()`)

### 게임 잠금

- **구현**: `game.GameLockManager` (싱글턴 `game.GL`)
- **목적**: 동시 카드 사용 등 레이스 컨디션 방지
- **방식**: 게임 ID별 `sync.Mutex`

---

## 9. 봇(Bot) 시스템

### 개요

외부 AI 봇 개발자가 자신의 봇을 SHOT! 게임에 참여시킬 수 있는 API 제공.

### 봇 등록 흐름

```
1. 사용자 로그인
2. POST /api/bots  → 봇 생성 (이름, 아바타)
3. 봇의 API 키 발급 (64자 랜덤)
4. 방 초대: POST /api/rooms/:id/invite-bot (방장 또는 권한 있는 멤버)
5. 봇 API: GET /api/bot/sse?key={apiKey}  → 이벤트 수신
6. 봇 API: POST /api/bot/game/play-card   → 게임 플레이
```

### 봇 인증

- **헤더**: `X-API-Key: {apiKey}` 또는 쿼리 파라미터 `?key={apiKey}`
- **봇 SSE**: `?key={apiKey}`

### 봇 SSE 이벤트

봇 SSE (`/api/bot/sse`)는 봇이 참여한 게임의 이벤트를 수신합니다. 이벤트 타입은 일반 방 SSE와 동일합니다.

### 봇 게임 플레이 제약

- 봇도 인간 플레이어와 동일한 게임 규칙 적용
- 봇은 자신의 턴에만 카드 사용 가능
- 턴 타임아웃(2분) 적용 동일

### 봇 온라인 상태

봇의 온라인/오프라인 상태는 Hub에서 실시간 추적 (`IsBotOnline(botID)`).

---

## 10. 인증 시스템

### 이메일 인증

```
POST /api/auth/signup
Body: { "email": "...", "password": "...", "username": "..." }
→ bcrypt 해시 (cost 10), UUID 생성, JWT 발급

POST /api/auth/login
Body: { "email": "...", "password": "..." }
→ bcrypt 검증, JWT 발급
```

### Google OAuth 2.0

```
브라우저 → GET /api/auth/google
  → Google OAuth 동의 화면
  → GET /api/auth/google/callback?code=...
  → 코드로 Google 사용자 정보 획득
  → DB에 사용자 생성/업데이트
  → 단기 코드 발급 (Redis 저장, 짧은 TTL)

프론트엔드 → POST /api/auth/exchange
Body: { "code": "..." }
→ JWT 발급
```

### JWT

- **알고리즘**: HMAC (HS256)
- **클레임**: `sub` = UserID
- **만료**: 7일
- **비밀키**: `JWT_SECRET` 환경 변수
- **전달**: `Authorization: Bearer {token}` 헤더

### CORS

- **허용 Origin**: `FRONTEND_URL` 환경 변수 (정확히 일치)
- **허용 헤더**: `Origin, Content-Type, Authorization`
- **Credentials**: 허용

---

## 11. 프론트엔드 구조

### 기술 특징

- **빌드 방식**: SSG (Static Site Generation) — Astro 빌드 후 Nginx로 정적 서빙
- **API 방식**: 클라이언트 사이드 fetch (빌드 시 API 호출 없음)
- **SPA 라우팅**: `try_files $uri $uri/ $uri.html =404`
- **실시간**: SSE 클라이언트 (EventSource API)
- **상태 관리**: localStorage (JWT 토큰), DOM 기반 상태, CustomEvent 통신

### 디렉토리 구조

```
frontend/src/
├── assets/          이미지 에셋 (.webp)
│   ├── background.webp / background2.webp
│   ├── bullet.webp / character.webp
│   ├── find.webp / handcuff.webp
│   ├── header.webp / heal.webp / healed.webp
│   ├── hitted.webp / jail.webp
│   ├── loading.webp / logo.webp / wall.webp
├── components/      재사용 Astro 컴포넌트
│   ├── BotsScene.astro         봇 관리 화면
│   ├── GameHeader.astro        게임 내 헤더
│   ├── GamePlayScene.astro     게임 플레이 화면 (메인)
│   ├── GameRoomScene.astro     게임 대기방 화면
│   ├── HeroBackground.astro    랜딩 배경
│   ├── MyPageScene.astro       마이페이지
│   ├── PlayerRenderUtils.astro 플레이어 렌더링 유틸
│   ├── RoomListScene.astro     방 목록 화면 (로비)
│   └── SiteHeader.astro        사이트 상단 네비게이션
├── i18n/            번역 시스템
│   ├── index.ts                번역 함수
│   ├── locales.ts              언어 코드 정의
│   └── translations/           언어별 번역 파일
│       ├── ko.ts / en.ts / zh-cn.ts / ja.ts
│       ├── es.ts / pt-br.ts / fr.ts / ru.ts / de.ts
├── layouts/
│   └── BaseLayout.astro        공통 HTML 레이아웃
├── lib/paraglide/   Paraglide i18n 런타임 (자동 생성)
│   └── messages/               메시지 키별 JS 파일
├── pages/           라우트 파일
│   ├── index.astro             루트 → /ko 리다이렉트
│   └── [lang]/
│       ├── index.astro         홈 (랜딩)
│       ├── game.astro          게임 화면 (로비 + 방 + 게임)
│       ├── login.astro         로그인
│       ├── signup.astro        회원가입
│       ├── profile.astro       마이페이지
│       ├── docs.astro          규칙서
│       ├── replays.astro       리플레이 목록
│       ├── replay.astro        리플레이 상세
│       └── news.astro          뉴스/공지
└── styles/
    └── global.css              전역 CSS
```

### 페이지별 기능

| 페이지        | 경로              | 주요 기능                                      |
| ------------- | ----------------- | ---------------------------------------------- |
| 홈            | `/[lang]/`        | 랜딩, 게임 소개, 지금 플레이 버튼              |
| 게임          | `/[lang]/game`    | 방 목록(로비) → 대기방 → 게임 플레이 (씬 전환) |
| 로그인        | `/[lang]/login`   | 이메일 로그인, Google 로그인                   |
| 회원가입      | `/[lang]/signup`  | 이메일 가입, Google 가입                       |
| 마이페이지    | `/[lang]/profile` | 프로필 편집, 전적, 봇 관리, 설정               |
| 규칙서        | `/[lang]/docs`    | 게임 규칙 문서                                 |
| 리플레이 목록 | `/[lang]/replays` | 리플레이 검색/필터                             |
| 리플레이      | `/[lang]/replay`  | 리플레이 재생                                  |
| 뉴스          | `/[lang]/news`    | 공지사항                                       |

### 게임 화면 씬 전환 흐름

```
/game 페이지 진입
  │
  ▼
RoomListScene  (방 목록 / 로비)
  │ 방 생성 또는 입장
  ▼
GameRoomScene  (대기방 — 준비, 봇 초대, 채팅)
  │ 게임 시작
  ▼
GamePlayScene  (게임 플레이 — 카드 사용, 채팅, 타이머)
  │ 게임 종료
  ▼
GameRoomScene  (결과 화면 → 다음 게임 준비)
```

### 빌드 설정

**astro.config.mjs**:

```js
{
  site: 'https://shot.game',
  integrations: [tailwind(), sitemap()],
  output: 'static',
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en', 'zh-cn', 'ja', 'es', 'pt-br', 'fr', 'ru', 'de'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
}
```

**tsconfig.json**: 경로 별칭 `@/*` → `./src/*`

---

## 12. 국제화 (i18n)

### 지원 언어

| 코드    | 언어               | hreflang |
| ------- | ------------------ | -------- |
| `ko`    | 한국어 (기본)      | ko       |
| `en`    | English            | en       |
| `zh-cn` | 简体中文           | zh-Hans  |
| `ja`    | 日本語             | ja       |
| `es`    | Español            | es       |
| `pt-br` | Português (Brasil) | pt-BR    |
| `fr`    | Français           | fr       |
| `ru`    | Русский            | ru       |
| `de`    | Deutsch            | de       |

### i18n 아키텍처

- **Astro i18n**: URL 기반 라우팅 (`/[lang]/...`)
- **Paraglide**: 런타임 메시지 번역 (빌드 시 컴파일)
- **번역 파일**: `src/i18n/translations/{lang}.ts`
- **자동 생성**: `src/lib/paraglide/messages/` (Paraglide CLI 생성)

### 번역 키 카테고리

| 접두사    | 화면        |
| --------- | ----------- |
| `home_`   | 홈 랜딩     |
| `login_`  | 로그인      |
| `signup_` | 회원가입    |
| `lobby_`  | 방 목록     |
| `room_`   | 대기방      |
| `game_`   | 게임 플레이 |
| `mypage_` | 마이페이지  |
| `nav_`    | 네비게이션  |
| `admin_`  | 어드민      |
| `config_` | 봇 설정     |
| `banned_` | 차단 화면   |

### SEO/GEO 최적화

- 사이트맵 자동 생성 (`@astrojs/sitemap`)
- 각 언어 페이지에 `hreflang` 메타 태그
- OG (Open Graph) 메타 태그 (언어별)
- 루트 (`/`) → `/ko` 리다이렉트

---

## 13. 인프라 & 배포

### Docker 서비스 구성

#### 개발 환경 (`docker-compose.yml`)

| 서비스   | 이미지                | 포트         | 역할              |
| -------- | --------------------- | ------------ | ----------------- |
| postgres | postgres:17-alpine    | 5432 (내부)  | 메인 DB           |
| redis    | redis:7-alpine        | 6379 (내부)  | 캐시/Pub-Sub      |
| backend  | ./backend/Dockerfile  | 3000 (내부)  | Go API 서버       |
| frontend | ./frontend/Dockerfile | 80:80 (외부) | 정적 + API 프록시 |

#### 프로덕션 환경 (`docker-compose.prod.yml`)

| 서비스      | 이미지                | 포트           | 역할                    |
| ----------- | --------------------- | -------------- | ----------------------- |
| postgres    | postgres:17-alpine    | 5432 (내부)    | 메인 DB                 |
| redis       | redis:7-alpine        | 6379 (내부)    | 캐시/Pub-Sub            |
| backend     | ./backend/Dockerfile  | 3000 (내부)    | Go API 서버             |
| frontend    | ./frontend/Dockerfile | 80 (내부)      | 정적 파일만             |
| nginx-proxy | nginx:alpine          | 80:80, 443:443 | SSL, 라우팅, Rate Limit |
| certbot     | certbot/certbot       | -              | SSL 인증서 자동 갱신    |

### Dockerfile 요약

**Backend** (다단계 빌드):

```
1. golang:1.25-alpine → go build -o server
2. alpine:3.21       → 서버 바이너리 실행
   헬스체크: GET /health (10초 간격, 15초 시작 지연)
```

**Frontend** (다단계 빌드):

```
1. oven/bun:1-alpine → bun run build
2. nginx:alpine      → /usr/share/nginx/html 서빙
   헬스체크: GET / (5초 간격, 10초 시작 지연)
```

### Nginx Rate Limiting

| 대상          | 제한                  | Zone            |
| ------------- | --------------------- | --------------- |
| `/api/auth/*` | 20 req/min (burst 10) | auth_zone (10m) |
| `/api/*`      | 10 req/s (burst 100)  | api_zone (10m)  |
| `/api/*/sse`  | IP당 60 동시 연결     | sse_zone (10m)  |

### 보안 헤더 (프로덕션)

```
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### Makefile 명령어

| 명령어                | 설명                                |
| --------------------- | ----------------------------------- |
| `make infra`          | Docker Compose 시작 (개발)          |
| `make infra-down`     | Docker Compose 중지                 |
| `make dev`            | 프론트+백엔드 병렬 개발 서버        |
| `make dev-frontend`   | 프론트엔드 개발 서버 (`bun dev`)    |
| `make dev-backend`    | 백엔드 개발 서버 (`go run main.go`) |
| `make build`          | 프론트+백엔드 빌드                  |
| `make build-frontend` | 프론트엔드 빌드 (`bun run build`)   |
| `make build-backend`  | 백엔드 빌드 (`go build`)            |
| `make cleanup-games`  | 게임 데이터 정리 스크립트 실행      |

### 프로덕션 최초 배포 절차

```bash
# 1. DNS A 레코드 설정 (도메인 → 서버 IP)
# 2. 환경 변수 설정
cp .env.example .env
# (DOMAIN, JWT_SECRET, CERTBOT_EMAIL 수정)

# 3. SSL 인증서 초기화 (최초 1회)
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh

# 4. 전체 스택 배포
docker compose -f docker-compose.prod.yml up -d
```

---

## 14. 환경 변수

| 변수                   | 기본값                   | 필수     | 설명                                     |
| ---------------------- | ------------------------ | -------- | ---------------------------------------- |
| **데이터베이스**       |                          |          |                                          |
| `DB_USER`              | `shot`                   |          | PostgreSQL 사용자명                      |
| `DB_PASSWORD`          | `shot`                   |          | PostgreSQL 비밀번호                      |
| `DB_NAME`              | `shot`                   |          | 데이터베이스명                           |
| `DB_HOST`              | `localhost`              |          | DB 호스트 (Docker: `postgres`)           |
| `DB_PORT`              | `5432`                   |          | DB 포트                                  |
| **인증**               |                          |          |                                          |
| `JWT_SECRET`           | -                        | **필수** | JWT 서명 비밀키 (`openssl rand -hex 32`) |
| **Google OAuth**       |                          |          |                                          |
| `GOOGLE_CLIENT_ID`     | -                        | 선택     | Google Cloud Console 발급                |
| `GOOGLE_CLIENT_SECRET` | -                        | 선택     | Google Cloud Console 발급                |
| **URL**                |                          |          |                                          |
| `FRONTEND_URL`         | `http://localhost`       |          | CORS Origin + OAuth 리다이렉트 기준      |
| `BACKEND_URL`          | `http://localhost`       |          | OAuth 콜백 URL 구성 기준                 |
| `PUBLIC_API_URL`       | (비움)                   |          | 프론트엔드 API URL (비우면 상대 경로)    |
| `PORT`                 | `3000`                   |          | 백엔드 포트                              |
| `REDIS_URL`            | `redis://localhost:6379` |          | Redis 연결 URL                           |
| **프로덕션**           |                          |          |                                          |
| `DOMAIN`               | `shot.example.com`       | 프로덕션 | SSL 도메인                               |
| `CERTBOT_EMAIL`        | -                        | 선택     | Let's Encrypt 알림 이메일                |
| `STAGING`              | `0`                      |          | `1` = Let's Encrypt 스테이징 (테스트용)  |

---

## 15. 리플레이 시스템

### 개요

모든 게임의 액션이 `game_actions` 테이블에 순서대로 기록되어, 게임 종료 후 리플레이로 조회할 수 있습니다.

### 기록 데이터

| 필드          | 내용           |
| ------------- | -------------- |
| `turn`        | 턴 번호        |
| `seq`         | 턴 내 순서     |
| `actor_id`    | 액션 수행자    |
| `action_type` | 액션 유형      |
| `target_id`   | 대상           |
| `payload`     | JSON 추가 정보 |

### 리플레이 소셜 기능

- **조회수**: `ReplayView` (POST `/api/replays/:gameId/view`)
- **좋아요**: 유저당 1회, 취소 가능 (`replay_likes` 테이블, 복합 UNIQUE)
- **즐겨찾기**: 유저당 1회, 취소 가능 (`replay_favorites` 테이블, 복합 UNIQUE)

### 공개 리플레이 정보

게임 종료 시 `game.result`에 따라 승자 정보 포함. 게임 내 역할(agent/spy)은 게임 종료 후 공개.

---

## 부록: 서버 시작 시 복구 로직

서버 재시작 시 이전 세션 정리:

```
1. 상태가 'playing'이 아닌 방/멤버 → 삭제
2. 'playing' 상태 방 중:
   a. 게임 DB 레코드 없음 → 방을 'waiting'으로 초기화
   b. 게임 DB 있지만 Redis 상태 없음 → 게임을 'draw'로 종료, 방 초기화
   c. Redis 상태 있음 → 타이머 복구 (RecoverTimers)
```

이를 통해 서버 재시작 후에도 진행 중인 게임이 있으면 이어서 플레이 가능합니다.
