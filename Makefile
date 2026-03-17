.PHONY: dev dev-frontend dev-backend build build-frontend build-backend infra infra-down

infra:
	docker compose up -d

infra-down:
	docker compose down

dev:
	make -j2 dev-frontend dev-backend

dev-frontend:
	cd frontend && bun dev

dev-backend:
	cd backend && go run main.go

build:
	make build-frontend build-backend

build-frontend:
	cd frontend && bun run build

build-backend:
	cd backend && go build -o dist/server main.go
