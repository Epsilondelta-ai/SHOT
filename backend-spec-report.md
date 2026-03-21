# SHOT 백엔드 종합 사양 보고서

## 📋 목차
1. [패키지 구조](#패키지-구조)
2. [데이터 모델 및 DB 스키마](#데이터-모델-및-db-스키마)
3. [API 엔드포인트](#api-엔드포인트)
4. [WebSocket/SSE 프로토콜](#websocketsee-프로토콜)
5. [게임 로직](#게임-로직)
6. [인증 시스템](#인증-시스템)
7. [Redis 사용](#redis-사용)
8. [외부 의존성](#외부-의존성)

---

## 패키지 구조

### 개요
```
backend/
├── main.go                 # 애플리케이션 진입점
├── go.mod / go.sum        # 의존성 관리
├── db/                     # 데이터베이스 및 Redis 연결
│   ├── db.go              # PostgreSQL 초기화 및 마이그레이션
│   └── redis.go           # Redis 클라이언트 관리
├── models/                # GORM 데이터 모델
│   ├── user.go            # User 모델
│   ├── bot.go             # Bot 모델
│   ├── room.go            # Room 모델
│   ├── room_member.go     # RoomMember 모델
│   └── game.go            # Game, GamePlayer, GameAction, ReplayLike, ReplayFavorite 모델
├── handlers/              # HTTP 요청 핸들러 (11개 파일)
│   ├── auth.go            # 인증 (회원가입, 로그인, OAuth)
│   ├── user.go            # 사용자 프로필 관리
│   ├── room.go            # 방 생성, 참가, 관리
│   ├── game.go            # 게임 시작 및 플레이
│   ├── bot.go             # 봇 관리 (CRUD)
│   ├── bot_game.go        # 봇의 게임 인터페이스
│   ├── sse.go             # 방 SSE 연결
│   ├── session.go         # 세션 SSE 연결
│   ├── replay.go          # 리플레이 조회, 좋아요, 즐겨찾기
│   ├── player.go          # 플레이어 프로필 및 통계
│   └── stats.go           # 글로벌 통계
├── game/                  # 게임 엔진
│   ├── state.go           # GameState 정의 및 Redis I/O
│   ├── engine.go          # 게임 로직 (카드 사용, 턴, 승리 조건)
│   ├── deck.go            # 카드 덱 생성 및 드로우 로직
│   ├── timer.go           # 턴 타이머 관리
│   └── lock.go            # 게임 상태 동시성 제어
├── hub/                   # 실시간 통신 (SSE/Redis Pub/Sub)
│   ├── hub.go             # 방 단위 메시지 브로드캐스트
│   └── session_hub.go     # 세션 단위 메시지 브로드캐스트
├── internal/              # 내부 패키지
│   ├── db/db.go           # (사용 중인지 확인 필요 - main에서 사용 안 함)
│   └── model/user.go      # (사용 중인지 확인 필요)
└── scripts/               # 유틸리티 스크립트
```

### 주요 패키지 설명

| 패키지 | 목적 | 주요 역할 |
|--------|------|---------|
| `db` | 데이터베이스 관리 | PostgreSQL 연결, GORM 마이그레이션, Redis 연결 |
| `models` | 데이터 모델 | 7개의 GORM 구조체 정의 |
| `handlers` | HTTP 핸들러 | RESTful API 엔드포인트 (11개 파일, 30+ 함수) |
| `game` | 게임 엔진 | 게임 상태 관리, 카드 로직, 턴 타이머 |
| `hub` | 실시간 통신 | SSE 클라이언트 관리, Redis Pub/Sub 라우팅 |

---

## 데이터 모델 및 DB 스키마

### 1. User 모델
```go
type User struct {
    ID           string    // UUID (PK)
    Email        string    // 고유 이메일
    Username     string    // 사용자명
    PasswordHash string    // bcrypt 해시
    GoogleID     *string   // Google OAuth ID (선택)
    AvatarURL    string    // 프로필 사진 URL
    CreatedAt    time.Time
    UpdatedAt    time.Time
}
```
- **인덱스**: Email (unique), GoogleID (unique)
- **용도**: 사용자 계정, OAuth 통합

### 2. Bot 모델
```go
type Bot struct {
    ID        string         // UUID (PK)
    UserID    string         // 봇 소유자 (FK: User.ID)
    Name      string         // 봇 이름
    AvatarURL string         // 프로필 사진
    APIKey    string         // 인증용 API 키 (unique)
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt // Soft delete 지원
}
```
- **인덱스**: UserID, APIKey (unique)
- **용도**: AI 플레이어, 봇 API 인증

### 3. Room 모델
```go
type Room struct {
    ID             string    // UUID (PK)
    Name           string    // 방 이름
    HostID         string    // 방 주인 (FK: User.ID)
    Status         string    // "waiting" | "playing" | "finished"
    MaxPlayers     int       // 최대 플레이어 수 (5-12, 기본 8)
    PlayerCount    int       // 현재 플레이어 수
    BotCount       int       // 봇 수
    SpectatorCount int       // 관전자 수
    IsPrivate      bool      // 비공개 방 여부
    Password       string    // 비공개 방 비밀번호 (bcrypt)
    CreatedAt      time.Time
    UpdatedAt      time.Time
}
```
- **인덱스**: HostID
- **상태 전이**: waiting → playing → finished
- **용도**: 게임 세션 관리

### 4. RoomMember 모델
```go
type RoomMember struct {
    ID            string    // UUID (PK)
    RoomID        string    // FK: Room.ID
    UserID        string    // 사용자 또는 봇 소유자 ID
    BotID         string    // 봇 ID (비어있으면 사람)
    IsSpectator   bool      // 관전자 여부
    CanInviteBots bool      // 봇 초대 권한
    JoinedAt      time.Time
}
```
- **인덱스**: RoomID
- **용도**: 방 멤버십 추적

### 5. Game 모델
```go
type Game struct {
    ID            string    // UUID (PK)
    RoomID        string    // FK: Room.ID
    Title         string    // 방 이름 스냅샷
    Status        string    // "playing" | "finished"
    Result        *string   // "agent_win" | "spy_win" | "draw"
    PlayerCount   int       // 게임 참가 플레이어 수
    TurnCount     int       // 현재 턴 수
    MaxTurns      int       // 최대 턴 수 (PlayerCount * 3)
    ViewCount     int       // 리플레이 조회 수
    LikeCount     int       // 리플레이 좋아요 수
    FavoriteCount int       // 리플레이 즐겨찾기 수
    CreatedAt     time.Time
    FinishedAt    *time.Time
}
```
- **인덱스**: RoomID (FK)
- **용도**: 게임 세션 기록, 리플레이 데이터

### 6. GamePlayer 모델
```go
type GamePlayer struct {
    ID        string // UUID (PK)
    GameID    string // FK: Game.ID
    UserID    string // 사용자 ID (봇이어도 소유자 ID)
    BotID     string // 봇 ID (비어있으면 사람)
    Role      string // "agent" | "spy"
    StartHP   int    // 초기 HP (기본 3)
    Username  string // 플레이어명
    AvatarURL string // 프로필 사진
}
```
- **인덱스**: GameID
- **용도**: 게임 플레이어 기록 (통계, 리플레이)

### 7. GameAction 모델
```go
type GameAction struct {
    ID         string    // UUID (PK)
    GameID     string    // FK: Game.ID
    Turn       int       // 턴 번호
    Seq        int       // 턴 내 액션 순번
    ActorID    string    // 액션 수행자 ID
    ActionType string    // "play_card", "end_turn", "reveal", "chat", "timeout", etc.
    TargetID   string    // 대상 플레이어 ID
    Payload    string    // JSON 형식 액션 데이터
    CreatedAt  time.Time
}
```
- **인덱스**: GameID
- **용도**: 게임 히스토리, 리플레이 재생

### 8. ReplayLike 모델
```go
type ReplayLike struct {
    ID     string // UUID (PK)
    GameID string // FK: Game.ID
    UserID string // 좋아요 한 사용자
}
```
- **인덱스**: (GameID, UserID) unique
- **용도**: 리플레이 좋아요 추적

### 9. ReplayFavorite 모델
```go
type ReplayFavorite struct {
    ID        string    // UUID (PK)
    GameID    string    // FK: Game.ID
    UserID    string    // 즐겨찾기한 사용자
    CreatedAt time.Time
}
```
- **인덱스**: (GameID, UserID) unique
- **용도**: 리플레이 즐겨찾기 추적

### DB 초기화
`db.Connect()` 호출 시 GORM AutoMigrate로 다음 테이블 생성:
- `users`, `bots`, `rooms`, `room_members`, `games`, `game_players`, `game_actions`, `replay_likes`, `replay_favorites`

---

## API 엔드포인트

### 인증 (auth.go)
```
POST   /api/auth/signup              회원가입
POST   /api/auth/login               로그인
POST   /api/auth/exchange            OAuth 토큰 교환
GET    /api/auth/google              Google 리다이렉트
GET    /api/auth/google/callback     Google 콜백
```

### 사용자 (user.go)
```
GET    /api/me                       현재 사용자 정보
PATCH  /api/me                       사용자 프로필 수정 (username, avatarUrl)
```

### 방 관리 (room.go)
```
GET    /api/rooms                    방 목록 조회 (상태 != finished)
POST   /api/rooms                    방 생성
GET    /api/rooms/:id                방 상세 조회
GET    /api/rooms/:id/members        방 멤버 목록
POST   /api/rooms/:id/join           방 참가
POST   /api/rooms/:id/spectate       방 관전
POST   /api/rooms/:id/leave          방 떠나기
POST   /api/rooms/:id/kick           멤버 강퇴 (호스트만)
POST   /api/rooms/:id/transfer-host  호스트 권한 이양
PATCH  /api/rooms/:id                방 정보 수정 (이름, 최대 플레이어)
PATCH  /api/rooms/:id/members/:userId/permissions  멤버 권한 설정
POST   /api/rooms/:id/invite-bot     봇 초대
POST   /api/rooms/:id/chat           방 채팅
GET    /api/rooms/:id/sse            방 SSE 연결
```

### 게임 (game.go)
```
POST   /api/rooms/:id/start          게임 시작 (호스트만, 최소 5명)
POST   /api/games/:id/play-card      카드 사용
POST   /api/games/:id/end-turn       턴 종료
POST   /api/games/:id/reveal         정체 공개
POST   /api/games/:id/chat           게임 채팅
GET    /api/games/:id/state          게임 상태 조회
POST   /api/games/:id/leave          게임 떠나기
```

### 봇 관리 (bot.go, bot_game.go)
```
GET    /api/bots                     봇 목록
POST   /api/bots                     봇 생성
PATCH  /api/bots/:id                 봇 수정
DELETE /api/bots/:id                 봇 삭제
POST   /api/bots/:id/regenerate-key  API 키 재생성

GET    /api/bot/sse                  봇 SSE 연결 (X-API-Key 헤더)
GET    /api/bot/game/state           봇의 현재 게임 상태
GET    /api/bot/game/actions         봇의 가능한 액션
POST   /api/bot/game/play-card       봇 카드 사용
POST   /api/bot/game/end-turn        봇 턴 종료
POST   /api/bot/game/reveal          봇 정체 공개
POST   /api/bot/game/chat            봇 채팅
```

### 리플레이 (replay.go)
```
GET    /api/replays                  리플레이 목록
GET    /api/replays/favorites        즐겨찾기한 리플레이
GET    /api/replays/:gameId          리플레이 상세 (공개, 인증 불필요)
GET    /api/replays/:gameId/actions  리플레이 액션 목록
POST   /api/replays/:gameId/view     조회수 증가
POST   /api/replays/:gameId/like     좋아요 추가
DELETE /api/replays/:gameId/like     좋아요 제거
POST   /api/replays/:gameId/favorite 즐겨찾기 추가
DELETE /api/replays/:gameId/favorite 즐겨찾기 제거
```

### 플레이어 프로필 (player.go)
```
GET    /api/players/:userId          플레이어 프로필 및 통계
GET    /api/bots/:botId/profile      봇 프로필 및 통계
```

### 기타
```
GET    /health                       헬스 체크
GET    /api/stats                    글로벌 통계 (플레이어, AI 에이전트 수)
GET    /api/session/sse              세션 SSE 연결 (토큰 쿼리 파라미터)
```

### 인증 요구 사항
- **헤더**: `Authorization: Bearer <JWT_TOKEN>` (ME, room, game 엔드포인트)
- **쿼리 파라미터**: SSE 엔드포인트는 `?token=<JWT_TOKEN>`
- **봇**: `X-API-Key` 헤더로 인증
- **토큰 유효 기간**: 7일 (발급 후)

---

## WebSocket/SSE 프로토콜

### 1. 방 SSE (`GET /api/rooms/:id/sse`)
**클라이언트**: 토큰 포함, 방에 참가한 사용자
**메시지 타입**:

```json
{
  "type": "room_update",
  "hostId": "...",
  "name": "...",
  "maxPlayers": 8,
  "isPrivate": false,
  "members": [...]
}

{
  "type": "player_joined",
  "userId": "...",
  "username": "...",
  "avatarUrl": "..."
}

{
  "type": "player_left",
  "userId": "..."
}

{
  "type": "game_start",
  "gameId": "..."
}

{
  "type": "chat",
  "userId": "...",
  "username": "...",
  "message": "..."
}
```

### 2. 게임 SSE
**초기 이벤트**: 게임 시작 시 생성된 이벤트들
```json
{
  "type": "card_drawn",
  "actorId": "...",
  "payload": {"count": 2}
}

{
  "type": "turn_start",
  "actorId": "...",
  "payload": {
    "turnCount": 1,
    "maxTurns": 24,
    "turnDeadline": 1234567890
  }
}

{
  "type": "game_action",
  "actorId": "...",
  "targetId": "...",
  "card": "attack|heal|jail|inspect",
  "payload": {...}
}

{
  "type": "player_death",
  "targetId": "...",
  "payload": {
    "role": "agent|spy",
    "killer": "..."
  }
}

{
  "type": "game_finished",
  "payload": {
    "result": "agent_win|spy_win|draw",
    "finalGameState": {...}
  }
}

{
  "type": "turn_timeout",
  "actorId": "..."
}

{
  "type": "identity_revealed",
  "actorId": "...",
  "payload": {"revealed": true}
}

{
  "type": "game_chat",
  "actorId": "...",
  "payload": {"message": "..."}
}
```

### 3. 세션 SSE (`GET /api/session/sse?token=...`)
**용도**: 사용자 세션 정보 (중복 로그인 감지)
```json
{
  "type": "session_replaced"
}
```

### 4. 봇 SSE (`GET /api/bot/sse?apiKey=...`)
**클라이언트**: 봇 (API 키로 인증)
**메시지 타입**:
```json
{
  "type": "invited_to_room",
  "payload": {
    "roomId": "...",
    "roomName": "..."
  }
}

{
  "type": "game_state_update",
  "payload": {...}
}

{
  "type": "turn_started"
}
```

### 5. Redis Pub/Sub 채널 (hub.go)
- `room:msg:ROOM_ID` - 방 메시지
- `room:ctrl:ROOM_ID` - 방 제어 메시지 (kick, duplicate)
- `bot:events:BOT_ID` - 봇 이벤트

---

## 게임 로직

### 1. 게임 시작 (StartGame)
```
입력: roomID
1. 방 멤버 조회 (관전자 제외)
2. 스파이 수 결정 (SpyCount)
   - 1-5명: 1명
   - 6-7명: 2명
   - 8-10명: 3명
   - 11명+: 4명
3. 역할 무작위 배치 (agent / spy)
4. 턴 순서 무작위 결정
5. 덱 생성 (BuildDeck)
6. GameState 생성 및 Redis에 저장
7. 각 플레이어 초기 2카드 드로우
8. 첫 플레이어 추가 2카드 드로우 (총 4카드)
9. 턴 타이머 시작 (2분)
10. GameAction 레코드 저장
```

### 2. 카드 시스템 (deck.go)

**카드 종류** (4가지):
| 카드 | 효과 | 보유 제한 | 사용 시 처리 |
|------|------|---------|-----------|
| Attack | 대상 HP -1 | 6장 | Discard |
| Heal | 대상 HP +1 (Max까지) | 2장 | Discard |
| Jail | 대상 1턴 감옥 | 1장 | Banish |
| Inspect | 대상 역할 확인 | ∞ | Banish |

**덱 구성** (PlayerCount=P, SpyCount=S):
- Attack: P * 5장
- Heal: P * 2장
- Jail: P * 1장
- Inspect: S * 2장

**드로우 로직** (DrawFromDeck):
- 덱에서 카드 제거
- 덱이 비면 Discard 섞어서 새 덱으로 사용
- Overflow 검사 (보유 제한 초과 시 Discard로 이동)

### 3. 카드 사용 (PlayCard)

**검증**:
1. 게임이 playing 상태
2. 플레이어 존재 및 생존
3. 현재 턴 플레이어 확인
4. Action phase 상태
5. 플레이어가 카드 보유

**효과 적용**:
- **Attack**: 대상 HP -1, 사망 여부 확인
- **Heal**: 대상 HP +1 (Max까지)
- **Jail**: 대상 IsJailed=true, JailTurnsLeft=1
- **Inspect**:
  - Agent → IsConfirmedAgent=true
  - Spy → IsRevealed=true

### 4. 턴 관리

**턴 단계** (Phase):
1. **draw**: 카드 드로우 (시작만)
2. **action**: 카드 사용, 턴 종료
3. **end**: 턴 종료 처리 (다음 턴 시작 전)

**턴 종료 (EndTurn)**:
1. Jail 턴 감소
2. Friendly fire 체크 (Spy가 Spy 공격 → 감옥)
3. 필요하면 Banished 더하기
4. Attack 플레이어가 살았으면 반격
5. 턴 진행
6. 카드 드로우 (새 턴 플레이어)
7. 상태 저장

**턴 타임아웃 (HandleTimeout)**:
- 2분 경과
- 현재 플레이어의 턴 자동 종료
- 다음 턴 시작

### 5. 승리 조건 (CheckWinCondition)

게임 상태는 다음 중 하나:
- **Playing**: 계속 진행
- **agent_win**: 모든 스파이 사망 또는 MaxTurns 도달 (에이전트 기준)
- **spy_win**: 스파이 수 >= 생존 에이전트 수
- **draw**: MaxTurns 도달 시 무승부

**MaxTurns**: PlayerCount * 3

### 6. 사망 처리 (handleDeath)

```
1. 플레이어 IsDead=true
2. 살해자 역할에 따른 자동 효과:
   - Spy가 죽임 → Discard에 카드 추가
   - Agent가 죽임 → (특별 효과 없음)
3. 승리 조건 확인
4. 게임 종료 여부 판단
```

### 7. 정체 공개 (RevealIdentity)

```
IsRevealed=true로 설정 (모든 플레이어가 역할 확인 가능)
```

### 8. 게임 채팅 (SendChat)

```
메시지는 게임 액션으로 기록되며 모든 플레이어에게 브로드캐스트됨
```

---

## 인증 시스템

### 1. JWT 토큰 기반 인증

**토큰 발급** (generateToken):
```go
claims := jwt.MapClaims{
    "sub": userID,              // Subject (사용자 ID)
    "exp": time.Now().Add(7*24*time.Hour).Unix()  // 7일 만료
}
// HS256 (HMAC-SHA256) 서명
```

**JWT 시크릿**: 환경 변수 `JWT_SECRET` (필수)
- 길이: 최소 32바이트 권장
- 생성: `openssl rand -hex 32`

**토큰 검증** (getUserIDFromToken):
1. Authorization 헤더에서 "Bearer <token>" 파싱
2. JWT 서명 검증 (HS256)
3. Expiry 확인
4. Claims에서 "sub" 추출

### 2. OAuth 2.0 - Google

**설정** (googleOAuthConfig):
```
ClientID:     환경 변수 GOOGLE_CLIENT_ID
ClientSecret: 환경 변수 GOOGLE_CLIENT_SECRET
RedirectURL:  {BACKEND_URL}/api/auth/google/callback
Scopes:       openid, email, profile
```

**흐름**:
1. `GET /api/auth/google` - 사용자를 Google 로그인으로 리다이렉트
2. `GET /api/auth/google/callback` - Google이 사용자를 돌려보냄
3. 인증 코드로 ID 토큰 교환
4. 기존 사용자 확인 (GoogleID로)
5. 없으면 새 사용자 생성
6. JWT 발급

**또는**:

1. 프론트엔드에서 Google SDK로 ID 토큰 획득
2. `POST /api/auth/exchange` - ID 토큰 서버에 전달
3. 서버가 토큰 검증 및 사용자 생성/조회
4. JWT 발급

### 3. 비밀번호 관리

**해싱**: bcrypt (cost: DefaultCost = 10)
```go
hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
```

### 4. 봇 인증

**API 키**: `mr_` + hex(16 random bytes)
- 길이: 34자 (mr_ + 32hex)
- 저장: DB에 평문 저장 (https 권장)
- 전송: `X-API-Key` 헤더

---

## Redis 사용

### 1. 게임 상태 저장

**키**: `game:{gameID}`
**값**: GameState JSON (직렬화)
**TTL**: 24시간
**용도**: 게임 중 실시간 상태 관리 (DB 대신 사용)

```go
type GameState struct {
    GameID           string        // 게임 ID
    RoomID           string
    Status           string        // "playing" | "finished"
    Result           string        // "agent_win" | "spy_win" | "draw"
    Players          []PlayerState // 플레이어 상태 배열
    Deck             []string      // 남은 카드
    Discard          []string      // 버린 카드
    Banished         int           // 제거된 카드 수
    CurrentTurnIndex int
    TurnOrder        []string      // 턴 순서 (플레이어 ID)
    TurnCount        int
    MaxTurns         int
    TurnDeadline     int64         // Unix timestamp
    Phase            string        // "draw" | "action" | "end"
    ActionSeq        int           // 턴 내 액션 순번
}
```

### 2. 봇 온라인 상태

**키**: `bot:online:{botID}`
**값**: "1"
**TTL**: 30초 (주기적으로 갱신)
**용도**: 봇 온라인 여부 확인

### 3. Pub/Sub 채널

**방 메시지**: `room:msg:{roomID}`
- SSE 연결된 클라이언트에게 브로드캐스트
- 구조: `{"type": "...", ...}`

**방 제어**: `room:ctrl:{roomID}`
- 강제 종료 (kick), 중복 연결 (duplicate) 신호

**봇 이벤트**: `bot:events:{botID}`
- 봇에게 방 초대, 게임 상태 업데이트

### 4. Redis 연결

**URL**: 환경 변수 `REDIS_URL`
- 기본값: `redis://localhost:6379`
- 형식: `redis://[password@]host:port[/db]`

---

## 외부 의존성

### go.mod

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `github.com/gofiber/fiber/v2` | v2.52.6 | HTTP 프레임워크 |
| `github.com/golang-jwt/jwt/v5` | v5.3.1 | JWT 토큰 생성/검증 |
| `github.com/google/uuid` | v1.6.0 | UUID 생성 |
| `github.com/joho/godotenv` | v1.5.1 | .env 파일 로드 |
| `github.com/redis/go-redis/v9` | v9.18.0 | Redis 클라이언트 |
| `golang.org/x/crypto` | v0.31.0 | bcrypt 패스워드 해싱 |
| `golang.org/x/oauth2` | v0.36.0 | OAuth 2.0 클라이언트 |
| `gorm.io/driver/postgres` | v1.5.7 | PostgreSQL 드라이버 |
| `gorm.io/gorm` | v1.25.8 | ORM 라이브러리 |

### 환경 변수 (필수)

| 변수 | 설명 | 예시 |
|------|------|------|
| `JWT_SECRET` | JWT 서명 키 (필수) | `openssl rand -hex 32` |
| `FRONTEND_URL` | 프론트엔드 URL (CORS) | `http://localhost:5173` |
| `BACKEND_URL` | 백엔드 URL (OAuth) | `http://localhost:3000` |
| `PORT` | 서버 포트 | `3000` (기본값) |
| `DB_HOST` | PostgreSQL 호스트 | `localhost` |
| `DB_USER` | DB 사용자명 | `shot` |
| `DB_PASSWORD` | DB 비밀번호 | `shot` |
| `DB_NAME` | DB 이름 | `shot` |
| `DB_PORT` | DB 포트 | `5432` |
| `REDIS_URL` | Redis 연결 URL | `redis://localhost:6379` |
| `GOOGLE_CLIENT_ID` | Google OAuth ID | (Google Cloud 콘솔) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | (Google Cloud 콘솔) |

---

## 서버 시작 흐름 (main.go)

```
1. .env 파일 로드 (없으면 무시)
2. JWT_SECRET 검증 (필수)
3. PostgreSQL 연결 및 마이그레이션
4. Redis 연결
5. 이전 서버 세션의 orphan 방 정리:
   - Status != "playing" 인 방 삭제
   - Status == "playing" 이지만 Redis에 상태가 없으면 draw로 종료
6. Hub 초기화 및 Redis Pub/Sub 시작
7. GameLockManager 초기화 (동시성 제어)
8. TimerManager 초기화 및 기존 타이머 복구
9. Fiber 앱 설정:
   - Logger 미들웨어
   - CORS 설정
10. 모든 라우트 등록
11. 포트 수신 대기
```

---

## 주요 설계 패턴

### 1. 게임 상태 동시성 제어
- **GameLockManager**: 게임 ID별 뮤텍스
- 모든 상태 변경 전에 `GL.Lock(gameID)` / `GL.Unlock(gameID)`
- 목적: HTTP 핸들러와 타이머 고루틴 간 race condition 방지

### 2. Redis 기반 게임 상태
- 실시간 게임은 Redis에만 저장 (성능)
- 게임 종료 후 DB에 Game, GamePlayer, GameAction 저장
- 서버 재시작 시 Redis 상태 복구 (TimerManager.RecoverTimers)

### 3. SSE 기반 실시간 통신
- 클라이언트 연결 당 Go 채널 (`ch chan []byte`)
- Hub.BroadcastJSON으로 Redis를 통해 모든 서버 인스턴스에 전파
- Pub/Sub 구독으로 다른 인스턴스의 메시지도 수신

### 4. 세션 관리
- SessionHub: 사용자 ID별 SSE 채널
- 중복 로그인 시 이전 세션에 "session_replaced" 신호 전송

### 5. 봇 통합
- 봇도 플레이어처럼 동작 (GamePlayer.BotID != "")
- 봇용 별도 SSE 엔드포인트 (API 키 인증)
- 봇의 모든 액션은 API 호출로 처리 (SSE로 명령 수신 가능)

---

## 게임 상태 머신

```
방 (Room)
├─ Status: "waiting"
│  ├─ 액션: 플레이어 참가/떠나기
│  ├─ 액션: 봇 초대
│  └─ 액션: 호스트가 "시작" 클릭 → "playing"
│
└─ Status: "playing"
   ├─ GameState (Redis)
   │  ├─ Status: "playing"
   │  │  ├─ 액션: 카드 사용
   │  │  ├─ 액션: 턴 종료
   │  │  ├─ 액션: 정체 공개
   │  │  └─ 이벤트: 타이머 타임아웃
   │  │
   │  └─ Status: "finished"
   │     └─ DB에 저장 (Game, GamePlayer, GameAction)
   │
   └─ 게임 종료 후 Room.Status: "finished" 또는 "waiting" (재설정)
```

---

## 성능 특성

### 메모리 구조
- **Game 객체 수**: 최대 100개 (Redis 키)
- **RoomMember 객체 수**: 방당 최대 12명
- **GamePlayer 객체 수**: 게임당 최대 12명
- **GameAction 객체 수**: 게임당 최대 (MaxTurns * Players) = 약 300개

### 데이터베이스
- **GORM AutoMigrate**: 서버 시작 시 한 번 실행
- **인덱스**: RoomID, UserID, BotID, GameID 등
- **Soft Delete**: Bot만 지원

### Redis
- **TTL**: GameState 24시간, BotOnline 30초
- **Pub/Sub 채널**: 방당 2개 (room:msg, room:ctrl) + 봇당 1개 (bot:events)

---

## 보안 고려사항

1. **JWT**: HS256 (HMAC), 7일 만료
2. **비밀번호**: bcrypt (cost 10)
3. **방 비밀번호**: bcrypt
4. **API 키**: 평문 저장 (https 권장)
5. **CORS**: FRONTEND_URL만 허용
6. **토큰 검증**: 모든 보호된 엔드포인트에서 필수

---

## 테스트 항목

1. **회원가입/로그인**: 중복 이메일, 잘못된 비밀번호
2. **방 관리**: 방 생성, 참가, 강제 퇴장, 호스트 권한 이양
3. **게임 흐름**: 시작, 카드 사용, 턴 종료, 타이머 타임아웃
4. **승리 조건**: 모든 스파이 사망, 턴 종료, 무승부
5. **동시성**: 여러 플레이어의 동시 액션
6. **OAuth**: Google 로그인 flow
7. **봇**: 봇 생성, 초대, API 키 인증
8. **리플레이**: 저장, 조회, 좋아요, 즐겨찾기

---

**문서 작성**: 2024년 Q1
**마지막 업데이트**: 2026년 03월 21일
**상태**: 종합 분석 완료
