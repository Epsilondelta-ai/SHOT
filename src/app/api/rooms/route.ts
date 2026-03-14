import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rooms, roomParticipants } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq, or } from "drizzle-orm";

export async function GET(): Promise<NextResponse> {
  const activeRooms = await db
    .select()
    .from(rooms)
    .where(or(eq(rooms.status, "waiting"), eq(rooms.status, "playing")));

  const roomsWithCount = await Promise.all(
    activeRooms.map(async (room) => {
      const participants = await db
        .select()
        .from(roomParticipants)
        .where(eq(roomParticipants.roomId, room.id));
      return { ...room, participantCount: participants.length };
    })
  );

  return NextResponse.json(roomsWithCount);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: unknown; maxPlayers?: unknown };
  const name = body.name;
  const maxPlayers = body.maxPlayers;

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (
    typeof maxPlayers !== "number" ||
    maxPlayers < 2 ||
    maxPlayers > 6
  ) {
    return NextResponse.json(
      { error: "maxPlayers must be between 2 and 6" },
      { status: 400 }
    );
  }

  const roomId = crypto.randomUUID();
  const participantId = crypto.randomUUID();

  const [room] = await db
    .insert(rooms)
    .values({
      id: roomId,
      name: name.trim(),
      maxPlayers,
      createdBy: session.userId,
      status: "waiting",
    })
    .returning();

  await db.insert(roomParticipants).values({
    id: participantId,
    roomId,
    userId: session.userId,
    role: "player",
  });

  return NextResponse.json(room, { status: 201 });
}
