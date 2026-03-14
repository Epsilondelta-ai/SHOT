import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rooms, roomParticipants, bots, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { publish } from "@/lib/sse/broker";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: roomId } = await params;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "waiting") {
    return NextResponse.json(
      { error: "Room is not accepting new participants" },
      { status: 409 }
    );
  }

  const body = (await request.json()) as { botId?: unknown };
  const botId = body.botId;
  if (typeof botId !== "string") {
    return NextResponse.json({ error: "botId is required" }, { status: 400 });
  }

  const [bot] = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.ownerId, session.userId)));
  if (!bot) {
    return NextResponse.json(
      { error: "Bot not found or does not belong to you" },
      { status: 404 }
    );
  }

  const existing = await db
    .select()
    .from(roomParticipants)
    .where(
      and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.botId, botId))
    );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Bot is already in this room" },
      { status: 409 }
    );
  }

  const players = await db
    .select()
    .from(roomParticipants)
    .where(
      and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.role, "player"))
    );
  if (players.length >= room.maxPlayers) {
    return NextResponse.json({ error: "Room is full" }, { status: 409 });
  }

  await db.insert(roomParticipants).values({
    id: crypto.randomUUID(),
    roomId,
    botId,
    role: "player",
  });

  // Rebuild participants for broadcast
  const participants = await db
    .select()
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, roomId));

  const participantsWithNames = await Promise.all(
    participants.map(async (p) => {
      if (p.userId) {
        const [user] = await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(eq(users.id, p.userId));
        return { ...p, name: user?.username ?? null };
      }
      if (p.botId) {
        const [botRow] = await db
          .select({ id: bots.id, name: bots.name })
          .from(bots)
          .where(eq(bots.id, p.botId));
        return { ...p, name: botRow?.name ?? null };
      }
      return { ...p, name: null };
    })
  );

  publish(`room:${roomId}`, {
    type: "ROOM_UPDATED",
    room: { ...room, participants: participantsWithNames },
  });

  return NextResponse.json({ success: true });
}
