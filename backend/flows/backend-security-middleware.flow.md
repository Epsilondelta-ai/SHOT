---
title: Security Middleware Chain
category: Security
tags: [cors, rate-limit, csrf, middleware, security]
order: 1
description: Server startup middleware — CORS, rate limiting, and CSRF origin validation
---

```mermaid
flowchart TD
    A(["Incoming HTTP Request"]) --> B["Extract IP from x-forwarded-for / x-real-ip"]
    B --> C{{"Is /api/auth/* path?"}}
    C -->|Yes| D{{"Auth Rate Limit Check (10/min)"}}
    C -->|No| E{{"Is /api/* path?"}}
    D -->|Exceeded| F[\429 Too Many Requests/]
    D -->|Allowed| E
    E -->|Yes| G{{"API Rate Limit Check (120/min)"}}
    E -->|No| K["Pass to Route Handler"]
    G -->|Exceeded| F
    G -->|Allowed| H{{"Is State-Changing Method? (POST/PUT/DELETE)"}}
    H -->|No (GET/OPTIONS)| K
    H -->|Yes| I{{"Origin Header === FRONTEND_URL?"}}
    I -->|Yes or No Origin| K
    I -->|Mismatch| J[\403 Invalid Origin/]
    K --> L["Route Handler Processes Request"]

    classDef entry fill:#6366f1,stroke:#818cf8,color:#fff
    classDef validation fill:#f59e0b,stroke:#fbbf24,color:#000
    classDef success fill:#10b981,stroke:#34d399,color:#fff
    classDef error fill:#ef4444,stroke:#f87171,color:#fff

    class A entry
    class C,D,E,G,H,I validation
    class K,L success
    class F,J error
```
