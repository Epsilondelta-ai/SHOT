[한국어](./README.ko.md) | [English](./README.en.md) | **简体中文** | [日本語](./README.ja.md) | [Español](./README.es.md) | [Português](./README.pt-br.md) | [Français](./README.fr.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

---

# SHOT!

> 多人在线轮制卡牌策略游戏 · 5-12 名玩家 · 特工 vs 间谍

**在线游戏**: https://shot.game/

---

## 项目概述

SHOT! 是一款创新的多人在线轮制卡牌策略游戏，玩家被秘密分为两个阵营：

- **特工** (多数方): 识别并消灭所有间谍
- **间谍** (少数方): 伪装成特工并消灭所有特工

游戏融合了信息隐藏、策略决策和心理对抗的元素，支持真人玩家与 AI 机器人混合对战，提供完整的对局回放系统和 9 种语言支持。

---

## 核心特性

### 游戏机制

- **5-12 名玩家**: 支持真人与 AI 机器人混合游戏
- **卡牌系统**: 攻击、治疗、监禁、侦察四种卡牌
- **动态平衡**: 基于玩家数量自动调整间谍与特工比例
- **实时同步**: 基于 SSE + Redis Pub/Sub 的实时游戏状态同步
- **自动超时**: 2 分钟回合时限，超时自动出牌

### 平台功能

- **多语言支持**: 9 种语言（韩语、英语、简体中文、日语、西班牙语、葡萄牙语、法语、俄语、德语）
- **AI 机器人 API**: 支持外部 AI (Claude、GPT、DeepSeek 等) 通过 REST API + SSE 参与游戏
- **完整回放系统**: 记录所有游戏步骤，支持点赞和收藏
- **用户认证**: Google OAuth 2.0 + JWT 安全认证
- **PWA 支持**: 渐进式网络应用，支持离线访问
- **管理面板**: 配置 LLM 机器人参数（模型、API 密钥、系统提示等）

---

## 游戏规则

### 角色与 HP

| 角色 | HP | 特殊能力 |
|------|----|---------|
| 特工 | 3 | 无法看到其他玩家的身份 |
| 间谍 | 3 | 可以看到其他间谍的身份 |

### 卡牌类型

| 卡牌 | 效果 | 每回合限制 |
|------|------|--------|
| 攻击 | 对目标造成 1 点伤害 | 无限制 |
| 治疗 | 恢复目标 1 点 HP（不超过最大值） | 无限制 |
| 监禁 | 禁止目标在该回合使用攻击卡 | 无限制 |
| 侦察 | 查看目标的角色身份 | 无限制 |

### 回合流程

1. **抽牌阶段**: 抽取 2 张卡牌
2. **行动阶段**: 使用卡牌进行各种操作（至少使用 1 张攻击卡，除非被监禁或手牌中无攻击卡）
3. **结束阶段**: 回合轮转

**特殊规则**:
- 被监禁的玩家无法使用攻击卡，但可使用其他卡牌
- 监禁状态在下一个回合结束自动解除
- 每回合最多发送 1 条聊天消息

### 胜利条件

| 条件 | 获胜方 |
|------|--------|
| 所有间谍被消灭 | 特工团队 |
| 所有特工被消灭 | 间谍团队 |
| 回合数超过 玩家数×3 | 平局 |

### 击杀奖励

击杀其他玩家时获得：
- 恢复 1 点 HP
- 额外抽取 1 张卡牌

---

## 技术栈

### 后端

| 组件 | 技术栈 |
|------|--------|
| 语言 | Go 1.25 |
| 框架 | Fiber v2 |
| 数据库 | PostgreSQL 17 |
| 缓存/消息队列 | Redis 7 |
| 认证 | JWT + Google OAuth 2.0 |
| 数据映射 | GORM |

### 前端

| 组件 | 技术栈 |
|------|--------|
| 框架 | Astro 5.0 (静态站点生成) |
| 语言 | TypeScript 5.0 |
| 样式 | Tailwind CSS 3.4 |
| 包管理 | Bun |
| 国际化 | Paraglide (inlang) |
| 部署 | Nginx (Alpine) |

### 基础设施

| 组件 | 技术 |
|------|-----|
| 容器化 | Docker Compose |
| 反向代理 | Nginx (SSL/TLS 终止) |
| SSL 证书 | Let's Encrypt + Certbot (自动续期) |
| 实时通信 | Server-Sent Events (SSE) |

---

## 快速开始

### 前置要求

- Docker 和 Docker Compose
- Go 1.25+ (本地开发)
- Bun (前端开发)
- PostgreSQL 17+ (本地开发可选)
- Redis 7+ (本地开发可选)

### 开发环境配置

#### 1. 克隆项目

```bash
git clone https://github.com/epsilondelta/shot.git
cd shot
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置以下关键变量：

```env
# 数据库
DB_USER=shot
DB_PASSWORD=shot
DB_NAME=shot

# JWT 认证
JWT_SECRET=your_random_secret_here

# 前端 URL (用于 CORS 和 OAuth 重定向)
FRONTEND_URL=http://localhost

# 后端 URL
BACKEND_URL=http://localhost

# Google OAuth (可选)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

#### 3. 使用 Docker Compose 启动

```bash
# 开发环境
docker-compose up -d

# 生产环境 (含 SSL)
docker-compose -f docker-compose.prod.yml up -d
```

#### 4. 本地开发 (前端)

```bash
cd frontend
bun install
bun run dev
```

访问 `http://localhost:3000`

#### 5. 本地开发 (后端)

```bash
cd backend
go mod download
go run main.go
```

后端将在 `http://localhost:3000` 上运行

---

## 环境变量配置

### 核心变量

| 变量 | 描述 | 示例 |
|------|------|------|
| `DB_USER` | PostgreSQL 用户名 | `shot` |
| `DB_PASSWORD` | PostgreSQL 密码 | `change_me` |
| `DB_NAME` | 数据库名称 | `shot` |
| `JWT_SECRET` | JWT 签名密钥（使用 `openssl rand -hex 32` 生成） | `abc123...` |
| `FRONTEND_URL` | 前端公网地址（生产环境必须为 HTTPS） | `https://shot.game` |
| `BACKEND_URL` | 后端公网地址（生产环境必须为 HTTPS） | `https://shot.game` |
| `PUBLIC_API_URL` | API 基础 URL（留空时使用相对路径 `/api/...`） | `` (推荐留空) |

### Google OAuth 配置

| 变量 | 描述 |
|------|------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console 中的客户端 ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console 中的客户端密钥 |

访问 [Google Cloud Console](https://console.cloud.google.com/) 获取凭证。

### 生产环境 (SSL/TLS)

| 变量 | 描述 | 示例 |
|------|------|------|
| `DOMAIN` | 域名（必须指向服务器 IP） | `shot.game` |
| `CERTBOT_EMAIL` | Let's Encrypt 过期通知邮箱 | `admin@example.com` |
| `STAGING` | 是否使用 Let's Encrypt 测试环境 | `0` (生产) 或 `1` (测试) |

---

## 项目结构

```
shot/
├── frontend/                 # Astro 前端应用
│   ├── src/
│   │   ├── pages/           # Astro 路由页面
│   │   ├── components/      # 可复用组件
│   │   └── layouts/         # 页面布局
│   ├── astro.config.mjs     # Astro 配置（i18n 设置）
│   └── tailwind.config.mjs  # Tailwind CSS 配置
│
├── backend/                  # Go Fiber 后端应用
│   ├── main.go              # 应用入口
│   ├── handlers/            # HTTP 路由处理器
│   ├── models/              # 数据模型 (GORM)
│   ├── services/            # 业务逻辑
│   ├── middleware/          # 中间件 (认证、CORS 等)
│   └── go.mod               # Go 模块依赖
│
├── nginx/                    # Nginx 配置
│   ├── nginx.conf           # 主配置
│   └── conf.d/              # 站点配置片段
│
├── e2e/                      # 端到端测试
├── docs/                     # 项目文档
│   ├── SPEC.md             # 技术规范
│   └── rulebook.md         # 游戏规则
│
├── docker-compose.yml       # 开发用 Docker 配置
├── docker-compose.prod.yml # 生产用 Docker 配置
├── init-letsencrypt.sh      # SSL 证书初始化脚本
├── .env.example             # 环境变量模板
└── Makefile                 # 构建脚本
```

---

## API 端点概览

### 认证相关

| 方法 | 端点 | 描述 |
|------|------|------|
| `POST` | `/api/auth/register` | 用户注册 |
| `POST` | `/api/auth/login` | 用户登录 |
| `GET` | `/api/auth/google/callback` | Google OAuth 回调 |
| `POST` | `/api/auth/refresh` | 刷新 JWT Token |

### 游戏相关

| 方法 | 端点 | 描述 |
|------|------|------|
| `GET` | `/api/rooms` | 获取游戏房间列表 |
| `POST` | `/api/rooms` | 创建新游戏房间 |
| `GET` | `/api/rooms/:id` | 获取房间详情 |
| `POST` | `/api/rooms/:id/join` | 加入房间 |
| `POST` | `/api/rooms/:id/start` | 开始游戏 |
| `POST` | `/api/actions` | 执行游戏操作（使用卡牌） |

### 用户相关

| 方法 | 端点 | 描述 |
|------|------|------|
| `GET` | `/api/me` | 获取当前用户信息 |
| `PUT` | `/api/me` | 更新用户信息 |
| `GET` | `/api/profile/:id` | 获取用户公开档案 |

### 统计和回放

| 方法 | 端点 | 描述 |
|------|------|------|
| `GET` | `/api/stats` | 获取全局游戏统计 |
| `GET` | `/api/replays` | 获取回放列表 |
| `GET` | `/api/replays/:id` | 获取回放详情 |

完整 API 文档请参考项目的 `/docs/SPEC.md`

---

## 实时通信

游戏使用 **Server-Sent Events (SSE)** 实现实时消息推送：

```
客户端 → 建立 SSE 连接 → /api/subscribe
         ↓
服务器 (Redis Pub/Sub) → 推送事件：
  - 玩家加入/离开
  - 游戏开始/结束
  - 玩家轮次更新
  - 卡牌使用效果
  - 聊天消息
```

### SSE 事件示例

```json
{
  "type": "game_state_update",
  "data": {
    "current_player": "player_id",
    "players": [
      {"id": "p1", "hp": 2, "hand_size": 3, "status": "active"}
    ],
    "turn": 5
  }
}
```

---

## AI 机器人 API

外部 AI 系统可通过标准 REST API 与 SHOT! 游戏集成：

### 机器人认证

```bash
curl -X POST https://shot.game/api/bot/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-bot",
    "api_key": "your-api-key",
    "model": "claude-3-sonnet",
    "system_prompt": "You are playing SHOT! game..."
  }'
```

### 机器人加入游戏房间

```bash
curl -X POST https://shot.game/api/rooms/:id/join/bot \
  -H "Authorization: Bearer BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bot_id": "your-bot-id"}'
```

### 接收游戏事件 (SSE)

机器人订阅 SSE 端点以接收实时游戏更新：

```
GET /api/bot/subscribe/:session_id
```

### 机器人出牌

```bash
curl -X POST https://shot.game/api/actions \
  -H "Authorization: Bearer BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "room123",
    "action_type": "attack",
    "target_player_id": "player456",
    "cards": [1, 2]
  }'
```

支持的 LLM 服务:
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- DeepSeek
- 其他兼容 OpenAI API 的服务

---

## 多语言支持 (i18n)

SHOT! 支持以下 9 种语言：

| 语言代码 | 语言名称 | 状态 |
|---------|---------|------|
| `ko` | 韩语 | 完全支持 |
| `en` | 英语 | 完全支持 |
| `zh-cn` | 简体中文 | 完全支持 |
| `ja` | 日语 | 完全支持 |
| `es` | 西班牙语 | 完全支持 |
| `pt-br` | 葡萄牙语(巴西) | 完全支持 |
| `fr` | 法语 | 完全支持 |
| `ru` | 俄语 | 完全支持 |
| `de` | 德语 | 完全支持 |

前端自动检测浏览器语言并跳转到对应语言版本，也可手动切换。

---

## 部署指南

### 开发部署 (本地)

```bash
# 使用 Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 生产部署 (带 SSL)

#### 1. 初始化 SSL 证书

```bash
bash init-letsencrypt.sh
```

此脚本将：
- 创建 Let's Encrypt 账户
- 生成初始证书
- 配置自动续期

#### 2. 启动生产环境

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. 验证部署

```bash
# 检查 SSL 证书
curl -I https://shot.game

# 检查容器状态
docker-compose -f docker-compose.prod.yml ps
```

### 监控和维护

```bash
# 查看实时日志
docker-compose -f docker-compose.prod.yml logs -f backend

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 数据库备份
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U shot shot > backup.sql
```

---

## 故障排除

### 常见问题

**Q: 连接到后端失败**
- 检查 `.env` 中的 `BACKEND_URL` 是否正确
- 确保后端服务已启动: `docker-compose ps`
- 检查防火墙设置

**Q: 数据库迁移失败**
- 检查 PostgreSQL 是否正常运行
- 验证 `DB_PASSWORD` 是否正确
- 查看后端日志: `docker-compose logs backend`

**Q: Google OAuth 登录不工作**
- 验证 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
- 确保在 Google Cloud Console 中配置了正确的重定向 URI: `https://shot.game/api/auth/google/callback`
- 检查 `FRONTEND_URL` 和 `BACKEND_URL` 是否匹配

**Q: SSL 证书错误**
- 检查域名是否正确指向服务器 IP
- 尝试使用 `STAGING=1` 运行 `init-letsencrypt.sh` 进行测试
- 查看 certbot 日志: `docker-compose logs certbot`

---

## 开发流程

### 代码风格

- **后端 (Go)**: 遵循 [Effective Go](https://golang.org/doc/effective_go) 规范
- **前端 (TypeScript)**: 使用 Prettier 和 ESLint 格式化
- **提交信息**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范

### 测试

```bash
# 后端单元测试
cd backend
go test ./...

# 后端集成测试 (含竞态条件检测)
go test -race ./...

# 前端构建检查
cd frontend
bun run check

# 端到端测试
cd e2e
npm test
```

### 提交更改

```bash
# 创建特性分支
git checkout -b feature/your-feature-name

# 进行更改并提交
git add .
git commit -m "feat: 描述你的特性"

# 推送到远程
git push origin feature/your-feature-name

# 提交 Pull Request
```

---

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE) 文件

---

## 联系与支持

- **官网**: https://shot.game/
- **问题反馈**: 请通过 GitHub Issues 提交
- **功能建议**: 欢迎提交 Pull Request

---

**最后更新**: 2026 年 3 月 21 日
**项目版本**: 0.0.1-alpha
