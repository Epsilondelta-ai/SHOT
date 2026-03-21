[한국어](./README.ko.md) | [English](./README.en.md) | [简体中文](./README.zh-cn.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | **Português (BR)** | [Français](./README.fr.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

# SHOT!

Jogo de estratégia com cartas online baseado em turnos. Agentes vs Espiões. Dedução social com jogabilidade competitiva.

[Jogar Agora](https://shot.game/) | [Documentação Técnica](../SPEC.md) | [Regulamento Completo](../rulebook.pt-br.md)

---

## Visão Geral

**SHOT!** é um jogo de estratégia online para 5 a 12 jogadores onde os participantes são secretamente divididos em dois times: **Agentes** (maioria) e **Espiões** (minoria).

- **Objetivo dos Agentes**: Encontrar e eliminar todos os espiões.
- **Objetivo dos Espiões**: Disfarçar-se como agentes e eliminar todos os agentes.
- **Jogabilidade**: Turnos baseados em cartas (Ataque, Cura, Prisão, Inspeção) com 3 pontos de vida iniciais.
- **Dinâmica Social**: Dedução em tempo real com chat durante os turnos.

### Características Principais

| Aspecto | Descrição |
|---------|-----------|
| Jogadores por partida | 5-12 (humanos + bots de IA podem jogar juntos) |
| Duração média | 15-25 minutos por partida |
| Sincronização em tempo real | SSE (Server-Sent Events) + Redis Pub/Sub |
| Bots de IA | Claude, GPT-4, DeepSeek (API externa para bots) |
| Idiomas suportados | 9 idiomas (coreano, inglês, chinês, japonês, espanhol, português, francês, russo, alemão) |
| Sistema de Replays | Registra todas as ações; permite curtir e favoritar |
| Autenticação | Google OAuth 2.0 + JWT |
| PWA | Funciona offline; instalável em dispositivos móveis |

---

## Regras do Jogo

### Preparação

1. O sistema atribui aleatoriamente papéis (espiões baseado no número de jogadores; resto são agentes).
2. Espiões verificam mutuamente suas identidades.
3. Todos os jogadores compram 2 cartas (mão inicial).
4. O jogo avança em sentido horário, começando por um jogador aleatório.

### Estrutura do Turno

1. **Fase de Compra**: Compre 2 cartas.
2. **Fase de Ação**: Use cartas. Sem limite de uso por turno. As cartas são usadas sequencialmente, uma por uma.
   - **Obrigatório**: Usar pelo menos 1 carta de Ataque para terminar o turno (exceto se não houver cartas de ataque na mão ou estiver em estado de Prisão).
3. **Fim do Turno**: O turno passa para o próximo jogador.

### Cartas

| Carta | Efeito | Quantidade | Limite de Mão | Notas |
|-------|--------|-----------|---------------|-------|
| Ataque | Causa 1 dano ao alvo | 5× Jogadores | 6 | Qualquer um pode ser alvo |
| Cura | Restaura 1 PV do alvo (máx. PV) | 2× Jogadores | 2 | Pode usar em si mesmo ou outros |
| Prisão | Bloqueia ataque do alvo por 1 turno | 1× Jogadores | 1 | Sem duplicatas; levantada no final do turno |
| Inspeção | Verifica identidade do alvo | 2× Espiões | Ilimitado | Não pode ser usada em identidades confirmadas |

Todas as cartas na mão são reveladas para todos.

### Condições de Vitória

- **Vitória dos Agentes**: Todos os espiões foram eliminados.
- **Vitória dos Espiões**: Todos os agentes (excluindo espiões) foram eliminados.
- **Empate**: Se o número total de turnos exceder Jogadores × 3.

### Composição de Papéis por Número de Jogadores

| Jogadores | Espiões | Agentes | Nota |
|-----------|---------|---------|------|
| 5 | 1 | 4 | Desvantagem para espiões |
| 6 | 2 | 4 | |
| 7 | 2 | 5 | |
| 8 | 3 | 5 | |
| 9 | 3 | 6 | Recomendado |
| 10 | 3 | 7 | |
| 11 | 4 | 7 | |
| 12 | 4 | 8 | |

---

## Stack Técnico

### Backend

| Componente | Tecnologia |
|-----------|-----------|
| Linguagem | Go 1.25 |
| Framework Web | Fiber v2 |
| Banco de Dados | PostgreSQL 17 |
| Cache/Pub-Sub | Redis 7 |
| Autenticação | JWT (golang-jwt/jwt v5) |
| OAuth | Google OAuth 2.0 |
| ORM | GORM |
| Criptografia | bcrypt (golang.org/x/crypto) |

### Frontend

| Componente | Tecnologia |
|-----------|-----------|
| Framework | Astro 5.0 (geração estática) |
| Linguagem | TypeScript 5.0 |
| Estilização | Tailwind CSS 3.4 |
| Gerenciador de Pacotes | Bun |
| i18n Runtime | Paraglide (inlang) |
| Sitemap | @astrojs/sitemap |
| Servidor | Nginx |

### Infraestrutura

| Componente | Tecnologia |
|-----------|-----------|
| Contêinerização | Docker Compose |
| Proxy Reverso | Nginx (Alpine) |
| SSL/TLS | Let's Encrypt + Certbot (renovação automática) |
| Build | Makefile |
| Rede | Docker Compose (desenvolvimento); nginx-proxy (produção) |

---

## Começando

### Pré-requisitos

- Docker & Docker Compose
- Node.js 20+ (para desenvolvimento do frontend)
- Go 1.25+ (para desenvolvimento do backend)
- Bun (gerenciador de pacotes JavaScript)
- Make

### Instalação Rápida

1. Clone o repositório:
```bash
git clone https://github.com/epsilondelta/shot.git
cd shot
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite .env conforme necessário (altere JWT_SECRET, URLs, credenciais OAuth, etc.)
```

3. Inicie a infraestrutura (PostgreSQL + Redis):
```bash
make infra
```

4. Em terminais separados, inicie o frontend e backend em desenvolvimento:
```bash
# Terminal 1: Frontend
make dev-frontend

# Terminal 2: Backend
make dev-backend
```

5. Acesse a aplicação em `http://localhost` no seu navegador.

### Desenvolvimento Individual

```bash
# Apenas frontend (precisa de backend rodando em :3000)
cd frontend
bun dev

# Apenas backend (precisa de PostgreSQL + Redis rodando)
cd backend
go run main.go
```

### Build de Produção

```bash
make build
# Frontend: frontend/dist/
# Backend: backend/dist/server
```

### Deploy em Produção

Para deployar com Let's Encrypt SSL:

1. Configure seu domínio em `.env`:
```bash
DOMAIN=seu-dominio.com
CERTBOT_EMAIL=seu-email@exemplo.com
STAGING=0  # Use 1 para testar sem limites de rate limiting
```

2. Execute o script de inicialização Let's Encrypt:
```bash
./init-letsencrypt.sh
```

3. Inicie os contêineres de produção:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Variáveis de Ambiente

### Banco de Dados

```bash
DB_USER=shot              # Usuário PostgreSQL
DB_PASSWORD=shot          # Senha PostgreSQL
DB_NAME=shot              # Nome do banco PostgreSQL
```

### Autenticação

```bash
JWT_SECRET=<secret-aleatorio>  # Gerado com: openssl rand -hex 32
```

### Google OAuth (Opcional)

```bash
GOOGLE_CLIENT_ID=<seu-client-id>
GOOGLE_CLIENT_SECRET=<seu-secret>
```

### URLs

```bash
FRONTEND_URL=https://seu-dominio.com     # URL pública do frontend
BACKEND_URL=https://seu-dominio.com      # URL pública do backend
PUBLIC_API_URL=                           # Deixe vazio para usar caminhos relativos
```

### Produção (Let's Encrypt)

```bash
DOMAIN=seu-dominio.com          # Domínio para certificado SSL
CERTBOT_EMAIL=admin@exemplo.com # Email para notificações de expiração
STAGING=0                       # Use 1 para testar (evita rate limiting)
```

Para uma lista completa de variáveis, veja `.env.example`.

---

## Arquitetura do Sistema

### Diagrama de Componentes

```
Internet
  │
  ▼
[Nginx Proxy] ← SSL, Rate Limiting, Headers de Segurança
  ├─ HTTPS :443
  └─ HTTP :80 → Redirecionamento 301
       │
       ├─ /api/auth/*    → Backend :3000  [Rate: 20r/m]
       ├─ /api/*/sse     → Backend :3000  [SSE, máx 60 conexões/IP]
       ├─ /api/*         → Backend :3000  [Rate: 10r/s]
       ├─ /health        → Backend :3000  [Apenas rede interna]
       └─ /*             → Frontend :80   [Arquivos estáticos]
            │
            ├─ [Backend]   Go/Fiber ← PostgreSQL + Redis
            └─ [Frontend]  Nginx (build estático Astro)
```

### Armazenamento de Estado

| Dados | Armazenamento | TTL |
|-------|---------------|-----|
| Estado do jogo | Redis (`game:{gameId}`) | 24 horas |
| Ações do jogo | PostgreSQL (`game_actions`) | Permanente |
| Metadados de usuário/sala/jogo | PostgreSQL | Permanente |
| Canais SSE | Redis Pub/Sub | Duração da conexão |
| Estado de sessão | Redis Pub/Sub | Duração da conexão |

---

## Sistema de Bots de IA

SHOT! suporta bots de IA que podem jogar como jogadores humanos normais usando uma API externa:

- **Provedores Suportados**: Claude, GPT-4, DeepSeek
- **Método de Conexão**: RESTful API + SSE
- **Comportamento**: Dedução social simulada; tomada de decisão estratégica

Os bots são criados durante a criação da sala e participam como qualquer outro jogador.

---

## Replay e Análise

### Sistema de Replay

Cada partida é totalmente gravada:

- **Armazenamento**: PostgreSQL (`game_actions`)
- **Campos Capturados**: Jogador, ação, timestamp, alvo, resultado
- **Funcionalidades**: Assistir replay completo, pausar, avançar

### Curtir e Favoritar

Jogadores podem:

- Curtir partidas interessantes
- Adicionar a favoritos para rever depois
- Ver histórico de partidas pessoais

---

## Autenticação e Autorização

### Google OAuth 2.0

1. Clique em "Login com Google"
2. Autorize o acesso no Google Cloud Console
3. Você é redirecionado e registrado/logado automaticamente

### JWT (JSON Web Tokens)

- Tokens são emitidos após login bem-sucedido
- Válidos por 24 horas
- Armazenados em httpOnly cookies (seguro contra XSS)
- Refreshed automaticamente quando próximo a expirar

### Estrutura de Sessão

- Redis armazena estado de sessão em tempo real
- PostgreSQL armazena histórico permanente de usuário/partida

---

## Implementação do Jogo

### Game Loop

1. **Inicialização**: Atribua papéis, distribua cartas iniciais, escolha ordem de turnos
2. **Turno**: Compre, use cartas, confirme ações
3. **Processamento de Ação**: Validar, aplicar, difundir via SSE
4. **Verificação de Vitória**: Verificar condições de vitória/empate
5. **Próximo Turno**: Mover para o próximo jogador

### Sincronização em Tempo Real

- **Protocolo**: SSE (Server-Sent Events)
- **Backend**: Redis Pub/Sub distribui eventos a todos os clientes
- **Latência**: <100ms em condições normais

### Validação de Ações

- Verificar permissões do jogador (seu turno? papel válido?)
- Validar alvo (vivo? identidade apropriada?)
- Validar uso de cartas (está na mão? limite de mão?)
- Validar regra obrigatória de ataque

---

## Construção e Testes

### Build do Frontend

```bash
cd frontend
bun install
bun run build
# Saída: dist/ (arquivos estáticos prontos para servir)
```

### Build do Backend

```bash
cd backend
go build -o dist/server main.go
# Saída: dist/server (binário executável)
```

### Testes

```bash
# Backend
cd backend
go test ./...

# Frontend (se aplicável)
cd frontend
bun test
```

### Verifyação de Linting

```bash
# Backend
cd backend
go vet ./...
golangci-lint run

# Frontend
cd frontend
bun run check  # TypeScript checker
```

---

## Suporte a Múltiplos Idiomas

SHOT! suporta 9 idiomas:

- Coreano (한국어)
- Inglês (English)
- Chinês Simplificado (简体中文)
- Japonês (日本語)
- Espanhol (Español)
- Português Brasileiro (Português)
- Francês (Français)
- Russo (Русский)
- Alemão (Deutsch)

### Para Desenvolvedores

A internacionalização usa **Paraglide (inlang)**:

- Strings traduzidas em `frontend/src/lib/paraglide/messages/`
- Função `t()` para acesso a strings
- Troca de idioma automática baseada em preferência do usuário

---

## Segurança

### Cabeçalhos de Segurança

- HSTS: Força HTTPS por 1 ano
- X-Frame-Options: DENY (previne clickjacking)
- X-Content-Type-Options: nosniff
- Content-Security-Policy: Restrito a domínio

### Rate Limiting

- **Autenticação**: 20 requisições/minuto por IP
- **API Geral**: 10 requisições/segundo por IP
- **SSE**: Máx 60 conexões por IP (previne abuso)

### Armazenamento de Senhas

- Hasheado com bcrypt (salt automático)
- Nunca armazenado em texto plano
- Nunca registrado em logs

### Validação de Entrada

- Todas as entradas são validadas no backend
- Proteção contra SQL injection (ORM)
- Proteção contra XSS (sanitização de saída)

---

## Roadmap

- [ ] Modo casual (jogadores não competitivos)
- [ ] Sistema de classificação (Elo/Rating)
- [ ] Desafios customizados (baralhos, papéis especiais)
- [ ] App móvel nativa (React Native)
- [ ] Sistema de clã/equipe
- [ ] Turneios

---

## Contribuindo

As contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch para sua feature: `git checkout -b feature/sua-feature`
3. Commit suas mudanças: `git commit -am 'Add sua feature'`
4. Push para a branch: `git push origin feature/sua-feature`
5. Abra um Pull Request

---

## Licença

MIT. Veja [LICENSE](../../LICENSE) para detalhes.

---

## Contato e Suporte

- **Site**: [shot.game](https://shot.game/)
- **Repositório**: [github.com/epsilondelta/shot](https://github.com/epsilondelta/shot)
- **Email de Suporte**: support@shot.game (se aplicável)

---

**Versão**: 0.0.1-alpha
**Última Atualização**: 21 de março de 2026
**Status**: Em Desenvolvimento Ativo
