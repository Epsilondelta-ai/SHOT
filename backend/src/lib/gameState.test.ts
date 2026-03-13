import { beforeEach, describe, expect, it } from "bun:test";
import { applyGameAction, createOmniscientSnapshot, createSnapshot, forceAdvanceTurn, initializeGame } from "./gameState";

const basePlayers = [
  {
    id: "p1",
    userId: "u1",
    name: "Leader",
    avatarSrc: null,
    type: "human" as const,
    canManageBots: true,
    assistantId: null,
    assistantName: null,
    llmModelId: null,
    modelName: null,
    language: null,
    botId: null,
    ready: true,
  },
  {
    id: "p2",
    userId: "u2",
    name: "Agent 2",
    avatarSrc: null,
    type: "human" as const,
    canManageBots: false,
    assistantId: null,
    assistantName: null,
    llmModelId: null,
    modelName: null,
    language: null,
    botId: null,
    ready: true,
  },
  {
    id: "p3",
    userId: "u3",
    name: "Agent 3",
    avatarSrc: null,
    type: "human" as const,
    canManageBots: false,
    assistantId: null,
    assistantName: null,
    llmModelId: null,
    modelName: null,
    language: null,
    botId: null,
    ready: true,
  },
  {
    id: "p4",
    userId: "u4",
    name: "Agent 4",
    avatarSrc: null,
    type: "human" as const,
    canManageBots: false,
    assistantId: null,
    assistantName: null,
    llmModelId: null,
    modelName: null,
    language: null,
    botId: null,
    ready: true,
  },
  {
    id: "p5",
    userId: "u5",
    name: "Spy",
    avatarSrc: null,
    type: "human" as const,
    canManageBots: false,
    assistantId: null,
    assistantName: null,
    llmModelId: null,
    modelName: null,
    language: null,
    botId: null,
    ready: true,
  },
];

describe("gameState", () => {
  beforeEach(() => {
    initializeGame("room-test", basePlayers);
  });

  function getCurrentTurnUserId(viewerUserId: string): string {
    const snap = createSnapshot("room-test", viewerUserId, { allowSpectator: true });
    const turnPlayer = snap.players.find((p) => p.id === snap.currentTurnPlayerId);
    // Map back to userId via basePlayers
    const basePlayer = basePlayers.find((bp) => bp.id === turnPlayer?.id);
    return basePlayer?.userId ?? viewerUserId;
  }

  it("creates a leader turn with initial turn chat", () => {
    const snapshot = createSnapshot("room-test", "u1");
    const validPlayerIds = basePlayers.map((p) => p.id);
    expect(validPlayerIds).toContain(snapshot.currentTurnPlayerId);
    expect(snapshot.phase).toBe("chatting");
    expect(snapshot.remainingChatTurns).toBe(1);
    expect(snapshot.players).toHaveLength(5);
    const leaderPlayer = snapshot.players.find((p) => p.role === "leader");
    expect(leaderPlayer).toBeDefined();
  });

  it("moves from chat phase to acting phase when chat is skipped", () => {
    const turnUserId = getCurrentTurnUserId("u1");
    applyGameAction("room-test", turnUserId, { type: "skip-chat" });

    const snapshot = createSnapshot("room-test", "u1");
    expect(snapshot.phase).toBe("acting");
    expect(snapshot.remainingChatTurns).toBe(0);
  });

  it("grants an extra chat after a spy reveals", () => {
    // Find the actual spy using omniscient view
    const omniscient = createOmniscientSnapshot("room-test");
    expect(omniscient).not.toBeNull();
    const spyPlayer = omniscient!.players.find((p) => p.role === "spy");
    expect(spyPlayer).toBeDefined();
    const spyPlayerId = spyPlayer!.id;
    const spyBasePlayer = basePlayers.find((bp) => bp.id === spyPlayerId);
    expect(spyBasePlayer).toBeDefined();
    const spyUserId = spyBasePlayer!.userId;

    // Advance turns until it's the spy's turn
    for (let i = 0; i < 10; i++) {
      const snap = createSnapshot("room-test", spyUserId);
      if (snap.canReveal) break;
      const turnUserId = getCurrentTurnUserId("u1");
      forceAdvanceTurn("room-test", turnUserId);
    }

    let snapshot = createSnapshot("room-test", spyUserId);
    expect(snapshot.canReveal).toBe(true);
    expect(snapshot.phase).toBe("chatting");

    applyGameAction("room-test", spyUserId, { type: "skip-chat" });
    applyGameAction("room-test", spyUserId, { type: "reveal" });

    snapshot = createSnapshot("room-test", spyUserId);
    expect(snapshot.phase).toBe("chatting");
    expect(snapshot.remainingChatTurns).toBe(1);
    const revealedPlayer = snapshot.players.find((player) => player.id === spyPlayerId);
    expect(revealedPlayer?.role).toBe("revealed");
  });

  it("builds a public spectator snapshot without private roles", () => {
    const snapshot = createSnapshot("room-test", "spectator-user", {
      allowSpectator: true,
    });

    expect(snapshot.viewerMode).toBe("spectator");
    expect(snapshot.myPlayerId).toBeNull();
    expect(snapshot.myTeam).toBeNull();
    expect(snapshot.canReveal).toBe(false);
    // All players should appear as "normal" or "leader" (revealed) to a spectator - never "spy"
    const visibleRoles = snapshot.players.map((p) => p.role);
    expect(visibleRoles.every((r) => r === "normal" || r === "leader")).toBe(true);
  });
});
