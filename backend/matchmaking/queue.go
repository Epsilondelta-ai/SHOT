package matchmaking

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	QueueKey        = "matchmaking:queue"
	StatusKeyPrefix = "matchmaking:status:"
	StatusTTL       = 300 * time.Second
)

// JoinQueue adds a user to the matchmaking queue
// Uses ZADD NX to prevent duplicates. Sets status to "queued" with TTL.
func JoinQueue(rdb *redis.Client, userID string) error {
	ctx := context.Background()

	added, err := rdb.ZAddNX(ctx, QueueKey, redis.Z{
		Score:  float64(time.Now().Unix()),
		Member: userID,
	}).Result()
	if err != nil {
		return fmt.Errorf("failed to add user to queue: %w", err)
	}
	if added == 0 {
		return fmt.Errorf("user %s is already in the queue", userID)
	}

	err = rdb.Set(ctx, StatusKeyPrefix+userID, "queued", StatusTTL).Err()
	if err != nil {
		return fmt.Errorf("failed to set status: %w", err)
	}

	return nil
}

// LeaveQueue removes a user from the queue
// Returns error if status is "matched" (cannot leave after matched)
func LeaveQueue(rdb *redis.Client, userID string) error {
	ctx := context.Background()

	status, err := rdb.Get(ctx, StatusKeyPrefix+userID).Result()
	if err != nil && err != redis.Nil {
		return fmt.Errorf("failed to get status: %w", err)
	}
	if status == "matched" {
		return fmt.Errorf("cannot leave queue: user %s is already matched", userID)
	}

	err = rdb.ZRem(ctx, QueueKey, userID).Err()
	if err != nil {
		return fmt.Errorf("failed to remove user from queue: %w", err)
	}

	err = rdb.Del(ctx, StatusKeyPrefix+userID).Err()
	if err != nil {
		return fmt.Errorf("failed to delete status: %w", err)
	}

	return nil
}

// IsInQueue checks if user is in the queue
func IsInQueue(rdb *redis.Client, userID string) (bool, error) {
	ctx := context.Background()

	_, err := rdb.ZScore(ctx, QueueKey, userID).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check queue membership: %w", err)
	}

	return true, nil
}

// GetQueueSize returns current queue size
func GetQueueSize(rdb *redis.Client) (int64, error) {
	ctx := context.Background()

	size, err := rdb.ZCard(ctx, QueueKey).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get queue size: %w", err)
	}

	return size, nil
}

// GetQueuePosition returns 0-based position (ZRANK)
func GetQueuePosition(rdb *redis.Client, userID string) (int64, error) {
	ctx := context.Background()

	rank, err := rdb.ZRank(ctx, QueueKey, userID).Result()
	if err != nil {
		return -1, fmt.Errorf("failed to get queue position: %w", err)
	}

	return rank, nil
}

// GetOldestJoinTime returns the join timestamp of the oldest queue member
func GetOldestJoinTime(rdb *redis.Client) (float64, error) {
	ctx := context.Background()

	members, err := rdb.ZRangeWithScores(ctx, QueueKey, 0, 0).Result()
	if err != nil {
		return 0, fmt.Errorf("failed to get oldest member: %w", err)
	}
	if len(members) == 0 {
		return 0, fmt.Errorf("queue is empty")
	}

	return members[0].Score, nil
}

// GetQueueMembers returns all userIDs in queue (oldest first)
func GetQueueMembers(rdb *redis.Client) ([]string, error) {
	ctx := context.Background()

	members, err := rdb.ZRange(ctx, QueueKey, 0, -1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get queue members: %w", err)
	}

	return members, nil
}

// PopPlayers atomically pops `count` players from the queue and sets their status to "matched"
// Uses a Lua script for atomicity.
func PopPlayers(rdb *redis.Client, count int) ([]string, error) {
	ctx := context.Background()

	script := redis.NewScript(`
		local key = KEYS[1]
		local count = tonumber(ARGV[1])
		local statusPrefix = ARGV[2]
		local ttl = tonumber(ARGV[3])

		local members = redis.call('ZRANGE', key, 0, count - 1)
		if #members == 0 then
			return {}
		end

		redis.call('ZREMRANGEBYRANK', key, 0, #members - 1)

		for _, member in ipairs(members) do
			redis.call('SET', statusPrefix .. member, 'matched', 'EX', ttl)
		end

		return members
	`)

	result, err := script.Run(ctx, rdb, []string{QueueKey}, count, StatusKeyPrefix, int(StatusTTL.Seconds())).StringSlice()
	if err != nil {
		if err == redis.Nil {
			return []string{}, nil
		}
		return nil, fmt.Errorf("failed to pop players: %w", err)
	}

	return result, nil
}

// RequeuePlayers re-adds players to the queue (rollback on match failure)
func RequeuePlayers(rdb *redis.Client, userIDs []string) error {
	ctx := context.Background()

	now := float64(time.Now().Unix())
	members := make([]redis.Z, len(userIDs))
	for i, id := range userIDs {
		members[i] = redis.Z{
			Score:  now,
			Member: id,
		}
	}

	err := rdb.ZAdd(ctx, QueueKey, members...).Err()
	if err != nil {
		return fmt.Errorf("failed to requeue players: %w", err)
	}

	pipe := rdb.Pipeline()
	for _, id := range userIDs {
		pipe.Set(ctx, StatusKeyPrefix+id, "queued", StatusTTL)
	}
	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to set requeued status: %w", err)
	}

	return nil
}

// GetStatus returns the matchmaking status for a user
func GetStatus(rdb *redis.Client, userID string) (string, error) {
	ctx := context.Background()

	status, err := rdb.Get(ctx, StatusKeyPrefix+userID).Result()
	if err == redis.Nil {
		return "none", nil
	}
	if err != nil {
		return "", fmt.Errorf("failed to get status: %w", err)
	}

	return status, nil
}
