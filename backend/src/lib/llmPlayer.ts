import { eq } from "drizzle-orm";
import { db } from "../db";
import { assistant, llmModel, llmProvider, gameRulebook } from "../db/schema";
import {
  applyGameAction,
  createSnapshot,
  getCurrentTurnController,
  type GameAction,
  type GameSnapshot,
} from "./gameState";
import { broadcastGameState } from "../ws/gameWs";
import { llmLog } from "./llmLogger";

const MAX_ACTIONS_PER_TURN = 10;
const MAX_RETRIES = 3;
const MAX_HISTORY_MESSAGES = 400; // 200 user-assistant pairs

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

// roomId -> playerId -> conversation messages
const conversationHistories = new Map<
  string,
  Map<string, ConversationMessage[]>
>();

function getHistory(
  roomId: string,
  playerId: string,
): ConversationMessage[] {
  if (!conversationHistories.has(roomId)) {
    conversationHistories.set(roomId, new Map());
  }
  const roomHistories = conversationHistories.get(roomId)!;
  if (!roomHistories.has(playerId)) {
    roomHistories.set(playerId, []);
  }
  return roomHistories.get(playerId)!;
}

function appendToHistory(
  roomId: string,
  playerId: string,
  userMessage: string,
  assistantMessage: string,
): void {
  const history = getHistory(roomId, playerId);
  history.push(
    { role: "user", content: userMessage },
    { role: "assistant", content: assistantMessage },
  );
  while (history.length > MAX_HISTORY_MESSAGES) {
    history.shift();
    history.shift();
  }
}

export function clearConversationHistory(roomId: string): void {
  conversationHistories.delete(roomId);
}

type LlmContext = {
  systemPrompt: string;
  provider: "anthropic" | "openai" | "google" | "xai";
  apiModelName: string;
  apiKey: string;
  assistantName: string;
};

async function fetchLlmContext(
  assistantId: string,
  llmModelId: string,
): Promise<LlmContext | null> {
  const [assistantRow, modelRow] = await Promise.all([
    db.query.assistant.findFirst({ where: eq(assistant.id, assistantId) }),
    db.query.llmModel.findFirst({ where: eq(llmModel.id, llmModelId) }),
  ]);

  if (!assistantRow || !modelRow) return null;

  const [providerRow, activeRulebook] = await Promise.all([
    db.query.llmProvider.findFirst({
      where: eq(llmProvider.provider, modelRow.provider),
    }),
    db.query.gameRulebook.findFirst({
      where: eq(gameRulebook.active, true),
    }),
  ]);

  if (!providerRow || !providerRow.apiKey) return null;

  const systemPrompt = activeRulebook
    ? `${assistantRow.prompt}\n\n== GAME RULEBOOK ==\n${activeRulebook.content}`
    : assistantRow.prompt;

  return {
    systemPrompt,
    assistantName: assistantRow.name,
    provider: modelRow.provider,
    apiModelName: modelRow.apiModelName,
    apiKey: providerRow.apiKey,
  };
}

function getValidActions(snapshot: GameSnapshot, userId: string): GameAction[] {
  const me = snapshot.players.find((p) => p.userId === userId);
  if (!me || !me.alive) return [{ type: "end-turn" }];
  if (snapshot.currentTurnPlayerId !== me.id) return [];

  const actions: GameAction[] = [];

  if (snapshot.phase === "chatting") {
    actions.push({ type: "chat", text: "" }); // placeholder; LLM will fill text
    actions.push({ type: "skip-chat" });
    return actions;
  }

  if (snapshot.phase === "acting") {
    if (snapshot.canReveal) {
      actions.push({ type: "reveal" });
    }

    const alivePlayers = snapshot.players.filter(
      (p) => p.alive && p.id !== me.id,
    );

    if (me.attacks > 0) {
      for (const target of alivePlayers) {
        actions.push({ type: "play-card", card: "attack", targetId: target.id });
      }
    }

    const healTargets = snapshot.players.filter(
      (p) => p.alive && p.hp < p.maxHp,
    );
    if (me.cards.includes("heal") && healTargets.length > 0) {
      for (const target of healTargets) {
        actions.push({ type: "play-card", card: "heal", targetId: target.id });
      }
    }

    if (me.cards.includes("jail")) {
      for (const target of alivePlayers.filter((p) => !p.isJailed)) {
        actions.push({ type: "play-card", card: "jail", targetId: target.id });
      }
    }

    if (me.cards.includes("verify")) {
      const verifyTargets = alivePlayers.filter(
        (p) => p.role === "normal" && !p.isJailed,
      );
      for (const target of verifyTargets) {
        actions.push({ type: "play-card", card: "verify", targetId: target.id });
      }
    }

    actions.push({ type: "end-turn" });
  }

  return actions;
}

function buildPrompt(
  snapshot: GameSnapshot,
  validActions: GameAction[],
  userId: string,
): string {
  const me = snapshot.players.find((p) => p.userId === userId);
  const recentLogs = snapshot.logs.slice(-10);
  const recentChats = snapshot.chatMessages.slice(-10);

  const myStatus = me
    ? `name=${me.name}, hp=${me.hp}/${me.maxHp}, alive=${me.alive}, jailed=${me.isJailed}, attacks=${me.attacks}, cards=${me.cards.join(",")}, role=${me.role}`
    : "unknown";

  const playerList = snapshot.players
    .map(
      (p) =>
        `  - ${p.name}: hp=${p.hp}/${p.maxHp}, alive=${p.alive}, role=${p.role}, jailed=${p.isJailed}`,
    )
    .join("\n");

  const logText = recentLogs.map((l) => `  [${l.type}] ${l.text}`).join("\n");
  const chatText = recentChats
    .map((c) => `  ${c.playerName}: ${c.text}`)
    .join("\n");

  return `YOUR STATUS: ${myStatus}
ROUND: ${snapshot.round}
PHASE: ${snapshot.phase}

PLAYERS:
${playerList}

RECENT LOG:
${logText || "  (none)"}

CHAT HISTORY:
${chatText || "  (none)"}

VALID ACTIONS (choose exactly one):
${JSON.stringify(validActions, null, 2)}

Respond with ONLY a JSON object matching one of the valid actions above. No explanation, no markdown.`;
}

async function callLlmApi(
  provider: "anthropic" | "openai" | "google" | "xai",
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ConversationMessage[],
): Promise<string> {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = (await res.json()) as {
      content?: { type: string; text: string }[];
    };
    return data.content?.[0]?.text ?? "";
  }

  if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 256 },
        }),
      },
    );
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  // openai + xai (OpenAI-compatible)
  const baseUrl =
    provider === "xai"
      ? "https://api.x.ai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  const data = (await res.json()) as {
    choices?: { message?: { content: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

function parseActionFromResponse(
  text: string,
  validActions: GameAction[],
): GameAction | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    if (typeof parsed.type !== "string") return null;

    // Verify the action type is valid
    const validTypes = new Set(validActions.map((a) => a.type));
    if (!validTypes.has(parsed.type as GameAction["type"])) return null;

    return parsed as unknown as GameAction;
  } catch {
    return null;
  }
}

function forceEndTurn(roomId: string, userId: string): void {
  try {
    applyGameAction(roomId, userId, { type: "end-turn" });
  } catch {
    // ignore if already ended
  }
}

// @MX:ANCHOR: maybeRunLlmTurn is called from gameWs message handler and games.ts routes
// @MX:REASON: [AUTO] fan_in >= 3 — core LLM auto-play loop, entry point from multiple callers
export async function maybeRunLlmTurn(roomId: string): Promise<void> {
  let actionsThisTurn = 0;

  while (true) {
    const info = getCurrentTurnController(roomId);
    if (!info || info.controller !== "llm") return;

    if (actionsThisTurn >= MAX_ACTIONS_PER_TURN) {
      forceEndTurn(roomId, info.userId);
      await broadcastGameState(roomId);
      actionsThisTurn = 0;
      continue;
    }

    if (!info.assistantId || !info.llmModelId) {
      llmLog({
        roomId,
        round: 0,
        phase: "unknown",
        player: { userId: info.userId, name: info.playerId, assistantId: "", provider: "", model: "" },
        attempt: 0,
        systemPrompt: "",
        userPrompt: "",
        rawResponse: null,
        parsedAction: null,
        success: false,
        error: "Missing assistantId or llmModelId",
        outcome: "no_context",
      });
      forceEndTurn(roomId, info.userId);
      await broadcastGameState(roomId);
      return;
    }

    const ctx = await fetchLlmContext(info.assistantId, info.llmModelId);
    if (!ctx) {
      llmLog({
        roomId,
        round: 0,
        phase: "unknown",
        player: { userId: info.userId, name: info.playerId, assistantId: info.assistantId, provider: "", model: "" },
        attempt: 0,
        systemPrompt: "",
        userPrompt: "",
        rawResponse: null,
        parsedAction: null,
        success: false,
        error: "LLM context not found (missing DB rows or apiKey)",
        outcome: "no_context",
      });
      forceEndTurn(roomId, info.userId);
      await broadcastGameState(roomId);
      return;
    }

    const snapshot = createSnapshot(roomId, info.userId);
    const validActions = getValidActions(snapshot, info.userId);
    if (validActions.length === 0) {
      forceEndTurn(roomId, info.userId);
      await broadcastGameState(roomId);
      return;
    }

    const userPrompt = buildPrompt(snapshot, validActions, info.userId);
    const playerName = snapshot.players.find((p) => p.userId === info.userId)?.name ?? info.playerId;

    const history = getHistory(roomId, info.playerId);
    const messages: ConversationMessage[] = [
      ...history,
      { role: "user", content: userPrompt },
    ];

    const baseLogFields = {
      roomId,
      round: snapshot.round,
      phase: snapshot.phase,
      player: {
        userId: info.userId,
        name: playerName,
        assistantId: info.assistantId,
        assistantName: ctx.assistantName,
        provider: ctx.provider,
        model: ctx.apiModelName,
      },
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      historyLength: history.length,
    };

    let action: GameAction | null = null;
    let lastRawResponse: string | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const responseText = await callLlmApi(
          ctx.provider,
          ctx.apiKey,
          ctx.apiModelName,
          ctx.systemPrompt,
          messages,
        );
        lastRawResponse = responseText;
        const parsed = parseActionFromResponse(responseText, validActions);

        if (parsed) {
          action = parsed;
          llmLog({
            ...baseLogFields,
            attempt: attempt + 1,
            rawResponse: responseText,
            parsedAction: parsed,
            success: true,
            error: null,
            outcome: "action_applied",
          });
          break;
        }

        lastError = `Parse failed on attempt ${attempt + 1}`;
        llmLog({
          ...baseLogFields,
          attempt: attempt + 1,
          rawResponse: responseText,
          parsedAction: null,
          success: false,
          error: lastError,
          outcome: "parse_failed",
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        llmLog({
          ...baseLogFields,
          attempt: attempt + 1,
          rawResponse: lastRawResponse,
          parsedAction: null,
          success: false,
          error: lastError,
          outcome: "api_error",
        });
      }
    }

    if (!action) {
      llmLog({
        ...baseLogFields,
        attempt: MAX_RETRIES,
        rawResponse: lastRawResponse,
        parsedAction: null,
        success: false,
        error: lastError ?? "All retries exhausted",
        outcome: "force_end_turn",
      });
      forceEndTurn(roomId, info.userId);
      await broadcastGameState(roomId);
      actionsThisTurn = 0;
      continue;
    }

    // For chat actions, LLM may have returned an empty text placeholder;
    // if text is empty, fall back to skip-chat
    if (action.type === "chat" && !("text" in action && (action as { text: string }).text.trim())) {
      action = { type: "skip-chat" };
    }

    try {
      applyGameAction(roomId, info.userId, action);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      llmLog({
        ...baseLogFields,
        attempt: MAX_RETRIES,
        rawResponse: lastRawResponse,
        parsedAction: action,
        success: false,
        error: `applyGameAction failed: ${errMsg}`,
        outcome: "force_end_turn",
      });
      forceEndTurn(roomId, info.userId);
      await broadcastGameState(roomId);
      actionsThisTurn = 0;
      continue;
    }

    appendToHistory(roomId, info.playerId, userPrompt, lastRawResponse ?? "");
    await broadcastGameState(roomId);

    if (action.type === "end-turn") {
      actionsThisTurn = 0; // reset counter for the next player's turn
      continue;
    }

    actionsThisTurn++;
  }
}
