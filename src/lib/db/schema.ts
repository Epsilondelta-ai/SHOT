import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const bots = sqliteTable("bots", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  backendType: text("backend_type").notNull(), // 'shot-llm' | 'external'
  backendConfig: text("backend_config"), // JSON string
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("waiting"), // 'waiting' | 'playing' | 'finished'
  maxPlayers: integer("max_players").notNull().default(4),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  gameId: text("game_id"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const roomParticipants = sqliteTable("room_participants", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  userId: text("user_id").references(() => users.id),
  botId: text("bot_id").references(() => bots.id),
  role: text("role").notNull(), // 'player' | 'spectator'
  joinedAt: text("joined_at").default(sql`(datetime('now'))`),
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id),
  status: text("status").notNull().default("active"), // 'active' | 'finished'
  stateJson: text("state_json").notNull(), // current game state
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  endedAt: text("ended_at"),
});

export const gamePlayers = sqliteTable("game_players", {
  id: text("id").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  userId: text("user_id").references(() => users.id),
  botId: text("bot_id").references(() => bots.id),
  seat: integer("seat").notNull(),
  hp: integer("hp").notNull().default(5),
  status: text("status").notNull().default("alive"), // 'alive' | 'eliminated'
});

export const gameEvents = sqliteTable("game_events", {
  id: text("id").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  turn: integer("turn").notNull(),
  eventType: text("event_type").notNull(), // 'GAME_STARTED' | 'TURN_CHANGED' | 'ACTION_TAKEN' | 'PLAYER_ELIMINATED' | 'GAME_ENDED'
  eventData: text("event_data").notNull(), // JSON string
  actorId: text("actor_id"), // userId or botId who caused the event
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const replays = sqliteTable("replays", {
  id: text("id").primaryKey(),
  gameId: text("game_id")
    .notNull()
    .references(() => games.id),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
