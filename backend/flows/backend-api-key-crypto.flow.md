---
title: API Key Encryption & Masking
category: Security
tags: [crypto, aes-256-gcm, api-key, encryption, masking]
order: 2
description: AES-256-GCM encryption, decryption, and display masking for LLM provider API keys
---

```mermaid
flowchart TD
    subgraph Encrypt ["encryptApiKey(plaintext)"]
        A(["Plaintext API Key"]) --> B["Derive key via scrypt from BETTER_AUTH_SECRET"]
        B --> C["Generate random 12-byte IV"]
        C --> D["AES-256-GCM Encrypt"]
        D --> E["Extract Auth Tag"]
        E --> F[\Return "iv:authTag:encrypted" (Base64)/]
    end

    subgraph Decrypt ["decryptApiKey(ciphertext)"]
        G(["Ciphertext String"]) --> H{{"Split by ':' — 3 parts?"}}
        H -->|No| I[\Throw Invalid Format Error/]
        H -->|Yes| J["Decode IV + AuthTag + Encrypted from Base64"]
        J --> K["Derive key via scrypt"]
        K --> L["AES-256-GCM Decrypt with Auth Tag"]
        L --> M[\Return Plaintext/]
    end

    subgraph Mask ["maskApiKey(key)"]
        N(["API Key String"]) --> O{{"Length < 10?"}}
        O -->|Yes| P[\"Return '****'"/]
        O -->|No| Q[\"Return first4 + '...' + last4"/]
    end

    classDef entry fill:#6366f1,stroke:#818cf8,color:#fff
    classDef validation fill:#f59e0b,stroke:#fbbf24,color:#000
    classDef success fill:#10b981,stroke:#34d399,color:#fff
    classDef error fill:#ef4444,stroke:#f87171,color:#fff
    classDef data fill:#3b82f6,stroke:#60a5fa,color:#fff

    class A,G,N entry
    class H,O validation
    class F,M,P,Q success
    class I error
    class B,C,D,E,J,K,L data
```
