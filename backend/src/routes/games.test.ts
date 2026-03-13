import { beforeEach, describe, expect, mock, it } from "bun:test";
import Elysia from "elysia";
import type { SerializedRoomPlayer } from "../lib/roomPlayers";

const mockUser = { id: "u1", name: "Host" };
const mockGetUser = mock(async () => mockUser);
const mockGetRoomById = mock(async () => ({
  id: "room-1",
  hostUserId: "u1",
  maxPlayers: 5,
  status: "waiting",
}));
const mockGetSerializedRoomPlayers = mock(async (): Promise<SerializedRoomPlayer[]> => []);
const mockInitializeGame = mock(() => {});
const mockGetGame = mock(() => ({ roomId: "room-1" }));
const mockCreateSnapshot = mock(() => ({ roomId: "room-1" }));
const mockApplyGameAction = mock(() => {});
const mockBroadcastPlayers = mock(async () => {});
const mockMaybeRunAutomatedTurn = mock(async () => {});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdate = mock((..._args: any[]): any => ({
  set: (..._: unknown[]) => ({
    where: (...__: unknown[]) => Promise.resolve(),
  }),
}));

mock.module("../db", () => ({
  db: {
    update: mockUpdate,
  },
}));

mock.module("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ op: "eq", a, b }),
  and: (...args: unknown[]) => ({ op: "and", args }),
  or: (...args: unknown[]) => ({ op: "or", args }),
  count: (col: unknown) => ({ op: "count", col }),
  desc: (col: unknown) => ({ op: "desc", col }),
  inArray: (col: unknown, vals: unknown) => ({ op: "inArray", col, vals }),
  isNull: (col: unknown) => ({ op: "isNull", col }),
  relations: () => ({}),
  sql: {},
}));

mock.module("../lib/getUser", () => ({
  getUser: mockGetUser,
}));

mock.module("../lib/roomState", () => ({
  getRoomById: mockGetRoomById,
  getHumanRoomPlayer: mock(async () => null),
  parseRoomCapacity: mock((v: unknown) => { const p = Number(v); return Number.isInteger(p) && p >= 5 && p <= 8 ? p : null; }),
  syncRoomAfterHumanDeparture: mock(async () => ({ deleted: false, hostUserId: null })),
  MIN_ROOM_PLAYERS: 5,
  MAX_ROOM_PLAYERS: 8,
}));

mock.module("../lib/roomPlayers", () => ({
  getSerializedRoomPlayers: mockGetSerializedRoomPlayers,
}));

mock.module("../lib/gameState", () => ({
  initializeGame: mockInitializeGame,
  getGame: mockGetGame,
  createSnapshot: mockCreateSnapshot,
  applyGameAction: mockApplyGameAction,
}));

mock.module("../ws/roomWs", () => ({
  broadcastPlayers: mockBroadcastPlayers,
}));

mock.module("../ws/gameWs", () => ({
  broadcastGameState: mock(async () => {}),
}));

mock.module("../lib/replayStore", () => ({
  recordGameStart: mock(() => {}),
  recordFrame: mock(() => {}),
  recordGameEnd: mock(() => {}),
  recordSpectator: mock(() => {}),
}));

mock.module("../lib/llmPlayer", () => ({
  maybeRunLlmTurn: mock(async () => {}),
  clearConversationHistory: mock(() => {}),
}));

mock.module("../lib/botPlayer", () => ({
  maybeRunAutomatedTurn: mockMaybeRunAutomatedTurn,
}));

const { gameRoutes } = await import("./games");

function makeApp() {
  return new Elysia().use(gameRoutes);
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue(mockUser);
  mockGetRoomById.mockReset();
  mockGetRoomById.mockResolvedValue({
    id: "room-1",
    hostUserId: "u1",
    maxPlayers: 5,
    status: "waiting",
  });
  mockGetSerializedRoomPlayers.mockReset();
  mockGetSerializedRoomPlayers.mockResolvedValue([]);
  mockInitializeGame.mockReset();
  mockGetGame.mockReset();
  mockGetGame.mockReturnValue({ roomId: "room-1" });
  mockCreateSnapshot.mockReset();
  mockCreateSnapshot.mockReturnValue({ roomId: "room-1" });
  mockApplyGameAction.mockReset();
  mockBroadcastPlayers.mockReset();
  mockUpdate.mockReset();
  mockUpdate.mockImplementation((..._args: unknown[]) => ({
    set: (..._: unknown[]) => ({
      where: (...__: unknown[]) => Promise.resolve(),
    }),
  }));
});

describe("POST /api/games/:id/start", () => {
  it("rejects start when a non-host player is not ready", async () => {
    mockGetSerializedRoomPlayers.mockResolvedValueOnce([
      { id: "p1", userId: "u1", name: "P1", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: false },
      { id: "p2", userId: "u2", name: "P2", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: true },
      { id: "p3", userId: "u3", name: "P3", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: false },
      { id: "p4", userId: "u4", name: "P4", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: true },
      { id: "p5", userId: "u5", name: "P5", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: true },
    ]);

    const app = makeApp();
    const res = await app.handle(
      new Request("http://localhost/api/games/room-1/start", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe(
      "All non-host players must be ready before starting",
    );
    expect(mockInitializeGame).not.toHaveBeenCalled();
  });

  it("starts the game when readiness requirements are satisfied", async () => {
    mockGetSerializedRoomPlayers.mockResolvedValueOnce([
      { id: "p1", userId: "u1", name: "P1", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: false },
      { id: "p2", userId: "u2", name: "P2", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: true },
      { id: "p3", userId: "u3", name: "P3", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: true },
      { id: "p4", userId: "u4", name: "P4", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: true },
      { id: "p5", userId: "u5", name: "P5", avatarSrc: null, type: "human", canManageBots: false, assistantId: null, assistantName: null, llmModelId: null, modelName: null, language: null, botId: null, ready: true },
    ]);

    const app = makeApp();
    const res = await app.handle(
      new Request("http://localhost/api/games/room-1/start", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockInitializeGame).toHaveBeenCalled();
    expect(mockBroadcastPlayers).toHaveBeenCalledWith("room-1");
  });
});

describe("GET /api/games/:id", () => {
  it("passes spectator mode through to snapshot creation", async () => {
    const app = makeApp();
    const res = await app.handle(
      new Request("http://localhost/api/games/room-1?spectator=1"),
    );

    expect(res.status).toBe(200);
    expect(mockCreateSnapshot).toHaveBeenCalledWith("room-1", "u1", {
      allowSpectator: true,
    });
  });
});
