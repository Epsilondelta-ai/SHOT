---
title: User Authorization & Ban Guard
category: Authentication
tags: [auth, getuser, ban, admin, guard, middleware]
order: 6
description: Three-tier auth guard — getUser, requireUser (with ban check), and requireAdmin
---

```mermaid
flowchart TD
    A(["API Request with Session Headers"]) --> B["auth.api.getSession(headers)"]
    B --> C{{"Session found?"}}
    C -->|No| D[\Return null (getUser)/]
    C -->|Yes| E[(Query user by session userId)]
    E --> F{{"User exists in DB?"}}
    F -->|No| D
    F -->|Yes| G[\Return user object/]

    G --> H{{"requireUser called?"}}
    H -->|No| I["getUser complete"]
    H -->|Yes| J{{"User is null?"}}
    J -->|Yes| K[\Throw Unauthorized/]
    J -->|No| L{{"banEnd > now?"}}
    L -->|Yes| M[\Throw Banned/]
    L -->|No| N["User authenticated"]

    N --> O{{"requireAdmin called?"}}
    O -->|No| P["requireUser complete"]
    O -->|Yes| Q{{"role === 'admin'?"}}
    Q -->|No| R[\Throw Forbidden/]
    Q -->|Yes| S["Admin verified"]

    classDef entry fill:#6366f1,stroke:#818cf8,color:#fff
    classDef validation fill:#f59e0b,stroke:#fbbf24,color:#000
    classDef success fill:#10b981,stroke:#34d399,color:#fff
    classDef error fill:#ef4444,stroke:#f87171,color:#fff
    classDef data fill:#3b82f6,stroke:#60a5fa,color:#fff

    class A entry
    class C,F,H,J,L,O,Q validation
    class G,I,N,P,S success
    class D,K,M,R error
    class B,E data
```
