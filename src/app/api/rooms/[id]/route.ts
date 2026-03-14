import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rooms, roomParticipants, users, bots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: roomId } = await params;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

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

  return NextResponse.json({ ...room, participants: participantsWithNames });
}
