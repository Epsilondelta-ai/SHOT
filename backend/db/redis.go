package db

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client

func ConnectRedis() error {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379"
	}
	opts, err := redis.ParseURL(url)
	if err != nil {
		return err
	}
	RDB = redis.NewClient(opts)
	if err := RDB.Ping(context.Background()).Err(); err != nil {
		return err
	}
	log.Println("Redis connected")
	return nil
}
