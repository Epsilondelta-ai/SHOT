import { beforeEach, describe, expect, it } from "bun:test";
import { applyGameAction, createSnapshot, initializeGame } from "./gameState";

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

  it("creates a leader turn with initial turn chat", () => {
    const snapshot = createSnapshot("room-test", "u1");
    expect(snapshot.currentTurnPlayerId).toBe("p1");
    expect(snapshot.phase).toBe("chatting");
    expect(snapshot.remainingChatTurns).toBe(1);
    expect(snapshot.players).toHaveLength(5);
    expect(snapshot.players.find((player) => player.id === "p1")?.role).toBe(
      "leader",
    );
  });

  it("moves from chat phase to acting phase when chat is skipped", () => {
    applyGameAction("room-test", "u1", { type: "skip-chat" });

    const snapshot = createSnapshot("room-test", "u1");
    expect(snapshot.phase).toBe("acting");
    expect(snapshot.remainingChatTurns).toBe(0);
  });

  it("grants an extra chat after a spy reveals", () => {
    applyGameAction("room-test", "u1", { type: "skip-chat" });
    applyGameAction("room-test", "u1", { type: "end-turn" });
    applyGameAction("room-test", "u2", { type: "skip-chat" });
    applyGameAction("room-test", "u2", { type: "end-turn" });
    applyGameAction("room-test", "u3", { type: "skip-chat" });
    applyGameAction("room-test", "u3", { type: "end-turn" });
    applyGameAction("room-test", "u4", { type: "skip-chat" });
    applyGameAction("room-test", "u4", { type: "end-turn" });

    let snapshot = createSnapshot("room-test", "u5");
    expect(snapshot.canReveal).toBe(true);
    expect(snapshot.phase).toBe("chatting");

    applyGameAction("room-test", "u5", { type: "skip-chat" });
    applyGameAction("room-test", "u5", { type: "reveal" });

    snapshot = createSnapshot("room-test", "u5");
    expect(snapshot.phase).toBe("chatting");
    expect(snapshot.remainingChatTurns).toBe(1);
    expect(snapshot.players.find((player) => player.id === "p5")?.role).toBe(
      "revealed",
    );
  });

  it("builds a public spectator snapshot without private roles", () => {
    const snapshot = createSnapshot("room-test", "spectator-user", {
      allowSpectator: true,
    });

    expect(snapshot.viewerMode).toBe("spectator");
    expect(snapshot.myPlayerId).toBeNull();
    expect(snapshot.myTeam).toBeNull();
    expect(snapshot.canReveal).toBe(false);
    expect(snapshot.players.find((player) => player.id === "p5")?.role).toBe(
      "normal",
    );
  });
});
