#!/bin/bash
# 진행중인 모든 게임을 삭제하는 스크립트
# Docker 컨테이너를 통해 DB/Redis에 접근합니다.
#
# 사용법: ./scripts/cleanup-games.sh
# 환경변수: POSTGRES_CONTAINER, REDIS_CONTAINER, DB_USER, DB_NAME

set -e

PG_CONTAINER="${POSTGRES_CONTAINER:-shot-renew-postgres-1}"
RD_CONTAINER="${REDIS_CONTAINER:-shot-renew-redis-1}"
DB_USER="${DB_USER:-shot}"
DB_NAME="${DB_NAME:-shot}"

psql_exec() {
  docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"
}

redis_exec() {
  docker exec "$RD_CONTAINER" redis-cli "$@"
}

echo "=== Playing 게임 정리 스크립트 ==="

# 1. playing 상태 게임 ID 목록 조회
echo "[1/5] playing 상태 게임 조회..."
GAME_IDS=$(psql_exec -t -A -c "SELECT id FROM games WHERE status = 'playing'")

if [ -z "$GAME_IDS" ]; then
  echo "진행중인 게임이 없습니다."
  exit 0
fi

echo "발견된 게임: $(echo "$GAME_IDS" | wc -l | tr -d ' ')개"

# 2. Redis에서 게임 상태 삭제
echo "[2/5] Redis 게임 상태 삭제..."
for GID in $GAME_IDS; do
  redis_exec DEL "game:$GID" > /dev/null 2>&1 && \
    echo "  Redis DEL game:$GID" || true
done

# 3. DB 게임을 finished/draw로 업데이트
echo "[3/5] 게임 상태를 finished로 변경..."
psql_exec -c "UPDATE games SET status = 'finished', result = 'draw', finished_at = NOW() WHERE status = 'playing'"

# 4. playing 상태 방을 waiting으로 변경
echo "[4/5] 방 상태를 waiting으로 변경..."
psql_exec -c "UPDATE rooms SET status = 'waiting' WHERE status = 'playing'"

# 5. 방 멤버 정리 (봇 멤버 제거)
echo "[5/5] 봇 멤버 정리..."
psql_exec -c "DELETE FROM room_members WHERE bot_id != ''"

echo "=== 완료 ==="
