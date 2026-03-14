import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rooms, roomParticipants, users, bots } from "@/lib/db/schema";
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

  const body = (await request.json()) as { role?: unknown };
  const role = body.role;
  if (role !== "player" && role !== "spectator") {
    return NextResponse.json(
      { error: "role must be 'player' or 'spectator'" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(roomParticipants)
    .where(
      and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, session.userId)
      )
    );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Already joined this room" },
      { status: 409 }
    );
  }

  if (role === "player") {
    const players = await db
      .select()
      .from(roomParticipants)
      .where(
        and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.role, "player")
        )
      );
    if (players.length >= room.maxPlayers) {
      return NextResponse.json({ error: "Room is full" }, { status: 409 });
    }
  }

  const participantId = crypto.randomUUID();
  await db.insert(roomParticipants).values({
    id: participantId,
    roomId,
    userId: session.userId,
    role,
  });

  // Rebuild room details for SSE broadcast
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
        const [bot] = await db
          .select({ id: bots.id, name: bots.name })
          .from(bots)
          .where(eq(bots.id, p.botId));
        return { ...p, name: bot?.name ?? null };
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
