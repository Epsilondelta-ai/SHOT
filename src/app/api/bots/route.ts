import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bots } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

// GET: list current user's bots
export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userBots = await db
      .select()
      .from(bots)
      .where(eq(bots.ownerId, session.userId));

    return NextResponse.json({ bots: userBots });
  } catch (error) {
    console.error("List bots error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: create a bot
// Body: { name: string, backendType: 'shot-llm' | 'external', backendConfig?: { webhookUrl?: string } }
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, backendType, backendConfig } = body as {
    name?: unknown;
    backendType?: unknown;
    backendConfig?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (backendType !== "shot-llm" && backendType !== "external") {
    return NextResponse.json(
      { error: "backendType must be 'shot-llm' or 'external'" },
      { status: 400 }
    );
  }

  if (backendType === "external") {
    const cfg = backendConfig as { webhookUrl?: unknown } | undefined;
    if (!cfg?.webhookUrl || typeof cfg.webhookUrl !== "string") {
      return NextResponse.json(
        { error: "backendConfig.webhookUrl is required for external bots" },
        { status: 400 }
      );
    }
  }

  try {
    const id = crypto.randomUUID();
    await db.insert(bots).values({
      id,
      ownerId: session.userId,
      name: name.trim(),
      backendType,
      backendConfig: backendConfig ? JSON.stringify(backendConfig) : null,
    });

    const [created] = await db.select().from(bots).where(eq(bots.id, id));
    return NextResponse.json({ bot: created }, { status: 201 });
  } catch (error) {
    console.error("Create bot error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
