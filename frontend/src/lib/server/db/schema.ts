import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const task = sqliteTable('task', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const room = sqliteTable('room', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	icon: text('icon').notNull().default('swords'),
	maxPlayers: integer('max_players').notNull().default(5),
	hostUserId: text('host_user_id').notNull(),
	status: text('status', { enum: ['waiting', 'full', 'starting_soon', 'in_progress'] })
		.notNull()
		.default('waiting'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

export const roomPlayer = sqliteTable('room_player', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	roomId: text('room_id')
		.notNull()
		.references(() => room.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(),
	playerType: text('player_type', { enum: ['human', 'llm', 'bot'] }).notNull().default('human'),
	displayName: text('display_name'),
	canManageBots: integer('can_manage_bots', { mode: 'boolean' }).notNull().default(false),
	assistantId: text('assistant_id').references(() => assistant.id, { onDelete: 'set null' }),
	llmModelId: text('llm_model_id').references(() => llmModel.id, { onDelete: 'set null' }),
	botId: text('bot_id').references(() => bot.id, { onDelete: 'set null' })
});

export const roomRelations = relations(room, ({ many }) => ({
	players: many(roomPlayer)
}));

export const roomPlayerRelations = relations(roomPlayer, ({ one }) => ({
	room: one(room, { fields: [roomPlayer.roomId], references: [room.id] })
}));

export const assistant = sqliteTable('assistant', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id'),
	name: text('name').notNull(),
	prompt: text('prompt').notNull(),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

export const bot = sqliteTable('bot', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	apiKey: text('api_key').notNull(),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

export const llmProvider = sqliteTable('llm_provider', {
	provider: text('provider', { enum: ['anthropic', 'openai', 'google', 'xai'] }).primaryKey(),
	apiKey: text('api_key').notNull().default(''),
	active: integer('active', { mode: 'boolean' }).notNull().default(false),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

export const llmModel = sqliteTable('llm_model', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	provider: text('provider', { enum: ['anthropic', 'openai', 'google', 'xai'] })
		.notNull()
		.references(() => llmProvider.provider, { onDelete: 'cascade' }),
	apiModelName: text('api_model_name').notNull(),
	displayName: text('display_name').notNull(),
	active: integer('active', { mode: 'boolean' }).notNull().default(true),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull()
});

export * from './auth.schema';
