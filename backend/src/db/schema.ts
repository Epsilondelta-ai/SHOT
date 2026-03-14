import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ── Auth schema ──────────────────────────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  role: text("role").default("user").notNull(),
  banStart: integer("ban_start", { mode: "timestamp_ms" }),
  banEnd: integer("ban_end", { mode: "timestamp_ms" }),
  banReason: text("ban_reason"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const banHistory = sqliteTable(
  "ban_history",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    banStart: integer("ban_start", { mode: "timestamp_ms" }),
    banEnd: integer("ban_end", { mode: "timestamp_ms" }).notNull(),
    banReason: text("ban_reason"),
    unbannedAt: integer("unbanned_at", { mode: "timestamp_ms" }),
    unbanReason: text("unban_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("ban_history_userId_idx").on(table.userId)],
);

// ── App schema ───────────────────────────────────────────────────────────────

export const task = sqliteTable("task", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  priority: integer("priority").notNull().default(1),
});

export const room = sqliteTable("room", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("swords"),
  maxPlayers: integer("max_players").notNull().default(5),
  hostUserId: text("host_user_id").notNull(),
  status: text("status", {
    enum: ["waiting", "full", "starting_soon", "in_progress"],
  })
    .notNull()
    .default("waiting"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const roomPlayer = sqliteTable("room_player", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  roomId: text("room_id")
    .notNull()
    .references(() => room.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  playerType: text("player_type", { enum: ["human", "llm", "bot"] })
    .notNull()
    .default("human"),
  displayName: text("display_name"),
  ready: integer("ready", { mode: "boolean" }).notNull().default(false),
  canManageBots: integer("can_manage_bots", { mode: "boolean" })
    .notNull()
    .default(false),
  assistantId: text("assistant_id").references(() => assistant.id, {
    onDelete: "set null",
  }),
  llmModelId: text("llm_model_id").references(() => llmModel.id, {
    onDelete: "set null",
  }),
  language: text("language"),
  botId: text("bot_id").references(() => bot.id, { onDelete: "set null" }),
});

export const assistant = sqliteTable("assistant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id"),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const bot = sqliteTable("bot", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().default(""),
  presenceStatus: text("presence_status", { enum: ["online", "offline"] })
    .notNull()
    .default("offline"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const llmProvider = sqliteTable("llm_provider", {
  provider: text("provider", {
    enum: ["anthropic", "openai", "google", "xai"],
  }).primaryKey(),
  apiKey: text("api_key").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const llmModel = sqliteTable("llm_model", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  provider: text("provider", { enum: ["anthropic", "openai", "google", "xai"] })
    .notNull()
    .references(() => llmProvider.provider, { onDelete: "cascade" }),
  apiModelName: text("api_model_name").notNull(),
  displayName: text("display_name").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const gameRulebook = sqliteTable("game_rulebook", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  content: text("content").notNull(),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const gameRecord = sqliteTable("game_record", {
  roomId: text("room_id").primaryKey(),
  playerCount: integer("player_count").notNull(),
  playerNames: text("player_names").notNull(), // JSON array of strings
  winnerTeam: text("winner_team"), // null until game ends
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  replayData: text("replay_data"), // JSON array of {snapshot, actionSummary}, written at game end
});

export const gameReplayFrame = sqliteTable(
  "game_replay_frame",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    seq: integer("seq").notNull(),
    snapshot: text("snapshot").notNull(), // JSON of GameSnapshot
    actionSummary: text("action_summary"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("game_replay_frame_roomId_seq_idx").on(table.roomId, table.seq)],
);

export const gameParticipant = sqliteTable(
  "game_participant",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull(),
    userId: text("user_id").notNull(),
    participationType: text("participation_type").notNull(), // 'player' | 'spectator'
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("game_participant_userId_idx").on(table.userId),
    index("game_participant_roomId_idx").on(table.roomId),
  ],
);

// ── Relations ────────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  banHistories: many(banHistory),
}));

export const banHistoryRelations = relations(banHistory, ({ one }) => ({
  user: one(user, { fields: [banHistory.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const roomRelations = relations(room, ({ many }) => ({
  players: many(roomPlayer),
}));

export const roomPlayerRelations = relations(roomPlayer, ({ one }) => ({
  room: one(room, { fields: [roomPlayer.roomId], references: [room.id] }),
}));
