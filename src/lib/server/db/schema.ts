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
	maxPlayers: integer('max_players').notNull().default(4),
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
	userId: text('user_id').notNull()
});

export const roomRelations = relations(room, ({ many }) => ({
	players: many(roomPlayer)
}));

export const roomPlayerRelations = relations(roomPlayer, ({ one }) => ({
	room: one(room, { fields: [roomPlayer.roomId], references: [room.id] })
}));

export * from './auth.schema';
