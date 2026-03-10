---
title: Shoot Action Resolution
category: Game
tags: [game, shoot, action, cards, heal, jail, verify, combat]
order: 6
description: shoot() function — validates action, transitions phases, resolves damage, checks win condition
---

```mermaid
flowchart TD
    A([/"User clicks SHOOT"/]) --> B{{"selectedTargetId set?"}}
    B -->|No| C["Button disabled — no action"]
    B -->|Yes| D{{"phase === 'aiming'?"}}
    D -->|No| C
    D -->|Yes| E["Find target in players[]"]
    E --> F{{"Target found?"}}
    F -->|No| C
    F -->|Yes| G["phase = 'waiting'"]
    G --> H["Show loading spinner"]
    H --> I["setTimeout 1500ms"]
    I --> J["phase = 'resolving'"]
    J --> K["Log: You shot target"]
    K --> L["target.hp -= 1"]
    L --> M["target.alive = hp > 0"]
    M --> N{{"target.alive === false?"}}
    N -->|Yes| O["Log: player eliminated"]
    N -->|No| P["Continue"]
    O --> P
    P --> Q["Get alive opponents excluding target"]
    Q --> R{{"opponents.length > 0 AND random > 0.5?"}}
    R -->|Yes| S["shooter selects me"]
    S --> T["Log: shooter shot you"]
    T --> U["my hp -= 1"]
    U --> V["my alive = hp > 0"]
    R -->|No| W["No counter-shot"]
    V --> W
    W --> X["selectedTargetId = null"]
    X --> Y["Filter alive players"]
    Y --> Z{{"alive.length <= 1?"}}
    Z -->|"alive == 1"| AA["phase = 'finished'"]
    AA --> AB["Log: winner announcement"]
    Z -->|"alive == 0"| AC["phase = 'finished' — draw"]
    Z -->|"alive > 1"| AD["setTimeout 1500ms"]
    AD --> AE["round += 1, timeLeft = 15"]
    AE --> AF["Log: Round N started"]
    AF --> AG["phase = 'aiming'"]

    classDef entry fill:#6366f1,stroke:#818cf8,color:#fff
    classDef validation fill:#f59e0b,stroke:#fbbf24,color:#000
    classDef success fill:#10b981,stroke:#34d399,color:#fff
    classDef error fill:#ef4444,stroke:#f87171,color:#fff
    classDef processing fill:#64748b,stroke:#94a3b8,color:#fff
    classDef user fill:#06b6d4,stroke:#22d3ee,color:#fff
    classDef data fill:#3b82f6,stroke:#60a5fa,color:#fff

    class A entry
    class AA,AC,AB entry
    class B,D,F,N,R,Z validation
    class G,J,AG processing
    class K,O,T,AF data
    class L,M,U,V,AE data
    class AA,AB,AG success
    class C error
    class H,I,P,Q,W,X,Y,AD processing
    class S,AD user
```
