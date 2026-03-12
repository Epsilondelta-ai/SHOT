import type { SerializedRoomPlayer } from "./roomPlayers";

export type ActionCard = "attack" | "heal" | "jail" | "verify";
type HiddenRole = "leader" | "agent" | "spy";
type Controller = "human" | "llm" | "bot";
type WinnerTeam = "agents" | "spies" | "draw";

type InternalPlayer = {
  id: string;
  userId: string;
  name: string;
  controller: Controller;
  assistantId: string | null;
  llmModelId: string | null;
  language: string | null;
  role: HiddenRole;
  revealed: boolean;
  verified: boolean;
  alive: boolean;
  hp: number;
  maxHp: number;
  isJailed: boolean;
  cards: ActionCard[];
};

type GameLog = {
  id: string;
  text: string;
  type: "shot" | "eliminated" | "round" | "result";
};

type GameChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
};

type GameState = {
  roomId: string;
  round: number;
  maxRound: number;
  currentTurnPlayerId: string;
  pendingChatTurns: number;
  attackUsedThisTurn: boolean;
  players: InternalPlayer[];
  deck: ActionCard[];
  discard: ActionCard[];
  logs: GameLog[];
  chatMessages: GameChatMessage[];
  winnerTeam: WinnerTeam | null;
};

export type GamePlayerView = {
  id: string;
  userId: string;
  name: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  isJailed: boolean;
  attacks: number;
  cards: Exclude<ActionCard, "attack">[];
  role: "normal" | "spy" | "leader" | "revealed";
  verified: boolean;
};

export type GameSnapshot = {
  roomId: string;
  round: number;
  maxRound: number;
  currentTurnPlayerId: string;
  viewerMode: "player" | "spectator";
  myPlayerId: string | null;
  myTeam: WinnerTeam | null;
  phase: "chatting" | "acting" | "finished";
  remainingChatTurns: number;
  canReveal: boolean;
  mustUseAttack: boolean;
  winnerTeam: WinnerTeam | null;
  players: GamePlayerView[];
  logs: GameLog[];
  chatMessages: GameChatMessage[];
};

export type GameAction =
  | { type: "chat"; text: string }
  | { type: "skip-chat" }
  | { type: "reveal" }
  | { type: "play-card"; card: ActionCard; targetId?: string }
  | { type: "end-turn" };

const games = new Map<string, GameState>();

const cardLimits: Record<ActionCard, number> = {
  attack: 6,
  heal: 2,
  jail: 1,
  verify: Number.POSITIVE_INFINITY,
};

function createId() {
  return crypto.randomUUID();
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function getSpyCount(playerCount: number) {
  if (playerCount <= 5) return 1;
  if (playerCount <= 7) return 2;
  return 3;
}

function createDeck(playerCount: number, spyCount: number) {
  return shuffle<ActionCard>([
    ...Array.from({ length: playerCount * 5 }, () => "attack" as const),
    ...Array.from({ length: playerCount * 2 }, () => "heal" as const),
    ...Array.from({ length: playerCount }, () => "jail" as const),
    ...Array.from({ length: spyCount }, () => "verify" as const),
  ]);
}

function addLog(
  state: GameState,
  text: string,
  type: GameLog["type"] = "round",
) {
  state.logs.push({ id: createId(), text, type });
}

function getPhase(state: GameState): GameSnapshot["phase"] {
  if (state.winnerTeam) return "finished";
  return state.pendingChatTurns > 0 ? "chatting" : "acting";
}

function getAttackCount(player: InternalPlayer) {
  return player.cards.filter((card) => card === "attack").length;
}

function recycleDeckIfNeeded(state: GameState) {
  if (state.deck.length > 0 || state.discard.length === 0) return;
  state.deck = shuffle(state.discard);
  state.discard = [];
}

function drawCard(state: GameState) {
  recycleDeckIfNeeded(state);
  return state.deck.shift() ?? null;
}

function addCardToHand(
  state: GameState,
  player: InternalPlayer,
  card: ActionCard,
) {
  const currentCount = player.cards.filter((entry) => entry === card).length;
  if (currentCount >= cardLimits[card]) {
    state.discard.push(card);
    return false;
  }

  player.cards.push(card);
  return true;
}

function drawCards(state: GameState, player: InternalPlayer, count: number) {
  for (let index = 0; index < count; index += 1) {
    const card = drawCard(state);
    if (!card) return;
    addCardToHand(state, player, card);
  }
}

function removeCardFromHand(
  state: GameState,
  player: InternalPlayer,
  card: ActionCard,
) {
  const cardIndex = player.cards.findIndex((entry) => entry === card);
  if (cardIndex < 0) return false;

  const [usedCard] = player.cards.splice(cardIndex, 1);
  if (usedCard) {
    state.discard.push(usedCard);
  }
  return true;
}

function getCurrentPlayer(state: GameState) {
  return (
    state.players.find((player) => player.id === state.currentTurnPlayerId) ??
    null
  );
}

function getPlayerById(state: GameState, playerId: string) {
  return state.players.find((player) => player.id === playerId) ?? null;
}

function getNextAlivePlayer(state: GameState, currentPlayerId: string) {
  const alivePlayers = state.players.filter((player) => player.alive);
  if (alivePlayers.length === 0) return null;

  const currentIndex = state.players.findIndex(
    (player) => player.id === currentPlayerId,
  );
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const next = state.players[(currentIndex + offset) % state.players.length];
    if (next?.alive) return next;
  }

  return null;
}

function maybeFinishGame(state: GameState) {
  const leaderAlive = state.players.some(
    (player) => player.role === "leader" && player.alive,
  );
  const aliveSpies = state.players.filter(
    (player) => player.role === "spy" && player.alive,
  );
  const aliveAgents = state.players.filter(
    (player) => player.role !== "spy" && player.alive,
  );

  if (!leaderAlive || aliveAgents.length === 0) {
    state.winnerTeam = "spies";
    addLog(state, "스파이 팀이 승리했습니다.", "result");
    return true;
  }

  if (aliveSpies.length === 0) {
    state.winnerTeam = "agents";
    addLog(state, "대원 팀이 승리했습니다.", "result");
    return true;
  }

  if (state.round > state.maxRound) {
    state.winnerTeam = "draw";
    addLog(state, "제한 턴 초과. 무승부로 게임이 종료됩니다.", "result");
    return true;
  }

  return false;
}

function rewardKill(
  state: GameState,
  actor: InternalPlayer,
  target: InternalPlayer,
) {
  if (actor.role !== "spy" && target.role !== "spy") return;

  actor.hp = Math.min(actor.maxHp, actor.hp + 1);
  drawCards(state, actor, 2);
  addLog(state, `${actor.name}이(가) 처치 보상을 받았습니다.`, "round");
}

function maybeApplyFriendlyFirePenalty(
  state: GameState,
  actor: InternalPlayer,
  target: InternalPlayer,
) {
  if (target.role === "spy") return;
  if (actor.role === "spy" && actor.revealed) return;

  actor.isJailed = true;
  addLog(state, `${actor.name}이(가) 아군 오사로 구금되었습니다.`, "round");
}

function revealPlayerRole(player: InternalPlayer) {
  if (player.role === "spy") {
    player.revealed = true;
    return;
  }

  player.verified = true;
}

function startTurn(state: GameState, player: InternalPlayer) {
  state.currentTurnPlayerId = player.id;
  state.attackUsedThisTurn = false;
  drawCards(state, player, 2);
  addLog(state, `${player.name}이(가) 행동 카드 2장을 뽑았습니다.`, "round");
  state.pendingChatTurns = 1;

  if (player.role === "spy" && player.revealed) {
    drawCards(state, player, 2);
    addLog(
      state,
      `${player.name}이(가) 정체가 밝혀진 스파이로서 카드 2장을 추가로 뽑았습니다.`,
      "round",
    );
    state.pendingChatTurns += 1;
  }
}

function endTurn(state: GameState) {
  const currentPlayer = getCurrentPlayer(state);
  if (!currentPlayer) return;

  currentPlayer.isJailed = false;
  const nextPlayer = getNextAlivePlayer(state, currentPlayer.id);
  if (!nextPlayer) return;

  state.round += 1;
  if (maybeFinishGame(state)) return;
  startTurn(state, nextPlayer);
}

function ensureActionPhase(state: GameState) {
  if (getPhase(state) !== "acting") {
    throw new Error("You must finish or skip turn chat first.");
  }
}

function ensureTarget(
  state: GameState,
  targetId: string | undefined,
  options: { allowSelf?: boolean; allowLeader?: boolean } = {},
) {
  if (!targetId) {
    throw new Error("A target is required.");
  }

  const target = getPlayerById(state, targetId);
  if (!target || !target.alive) {
    throw new Error("Target is not available.");
  }
  if (!options.allowSelf && target.id === state.currentTurnPlayerId) {
    throw new Error("You cannot target yourself.");
  }
  if (!options.allowLeader && target.role === "leader") {
    throw new Error("Target is not available.");
  }

  return target;
}

function playAttack(
  state: GameState,
  actor: InternalPlayer,
  target: InternalPlayer,
) {
  if (actor.isJailed) {
    throw new Error("You cannot attack while jailed.");
  }
  if (target.role === "leader" && !(actor.role === "spy" && actor.revealed)) {
    throw new Error("Only a revealed spy can attack the Captain.");
  }
  if (!removeCardFromHand(state, actor, "attack")) {
    throw new Error("No attack card available.");
  }

  target.hp = Math.max(0, target.hp - 1);
  addLog(state, `${actor.name}이(가) ${target.name}을(를) 공격했습니다.`, "shot");

  if (target.hp > 0) return;

  target.alive = false;
  revealPlayerRole(target);
  addLog(state, `${target.name}이(가) 제거되었습니다.`, "eliminated");
  rewardKill(state, actor, target);
  maybeApplyFriendlyFirePenalty(state, actor, target);
  maybeFinishGame(state);
}

function playHeal(
  state: GameState,
  actor: InternalPlayer,
  target: InternalPlayer,
) {
  if (!removeCardFromHand(state, actor, "heal")) {
    throw new Error("No heal card available.");
  }
  if (target.hp >= target.maxHp) {
    throw new Error("Target is already at full HP.");
  }

  target.hp = Math.min(target.maxHp, target.hp + 1);
  addLog(state, `${actor.name}이(가) ${target.name}을(를) 치료했습니다.`, "round");
}

function playJail(
  state: GameState,
  actor: InternalPlayer,
  target: InternalPlayer,
) {
  if (!removeCardFromHand(state, actor, "jail")) {
    throw new Error("No jail card available.");
  }
  if (target.isJailed) {
    throw new Error("Target is already jailed.");
  }

  target.isJailed = true;
  addLog(state, `${actor.name}이(가) ${target.name}을(를) 구금했습니다.`, "round");
}

function playVerify(
  state: GameState,
  actor: InternalPlayer,
  target: InternalPlayer,
) {
  if (!removeCardFromHand(state, actor, "verify")) {
    throw new Error("No verify card available.");
  }
  if (target.role === "leader" || target.verified || target.revealed) {
    throw new Error("Target cannot be verified again.");
  }

  if (target.role === "spy") {
    target.revealed = true;
    drawCards(state, actor, 2);
    addLog(state, `${actor.name}이(가) ${target.name}을(를) 스파이로 밝혀냈습니다.`, "round");
    return;
  }

  target.verified = true;
  addLog(state, `${actor.name}이(가) ${target.name}을(를) 대원으로 확인했습니다.`, "round");
}

function buildRoleForViewer(
  player: InternalPlayer,
  viewerId: string | null,
  omniscient?: boolean,
): GamePlayerView["role"] {
  if (player.role === "leader") return "leader";
  if (player.role === "spy" && player.revealed) return "revealed";
  if (omniscient && player.role === "spy") return "spy";
  if (viewerId && player.role === "spy" && player.userId === viewerId) {
    return "spy";
  }
  return "normal";
}

export function initializeGame(
  roomId: string,
  roomPlayers: SerializedRoomPlayer[],
) {
  if (roomPlayers.length < 5) {
    throw new Error("At least 5 players are required to start the game.");
  }

  const spyCount = getSpyCount(roomPlayers.length);
  const shuffledPlayers = shuffle(roomPlayers);
  const leaderPlayer = shuffledPlayers[0];
  if (!leaderPlayer) {
    throw new Error("No players found.");
  }

  const spyIds = new Set(
    shuffledPlayers.slice(-spyCount).map((player) => player.id),
  );
  const players: InternalPlayer[] = shuffledPlayers.map((player) => {
    const isLeader = player.id === leaderPlayer.id;
    const role: HiddenRole = isLeader
      ? "leader"
      : spyIds.has(player.id)
        ? "spy"
        : "agent";
    const maxHp = isLeader ? 5 : 3;
    return {
      id: player.id,
      userId: player.userId,
      name: player.name,
      controller: player.type,
      assistantId: player.assistantId ?? null,
      llmModelId: player.llmModelId ?? null,
      language: player.language ?? null,
      role,
      revealed: isLeader,
      verified: isLeader,
      alive: true,
      hp: maxHp,
      maxHp,
      isJailed: false,
      cards: [],
    };
  });

  const state: GameState = {
    roomId,
    round: 1,
    maxRound: players.length * 3,
    currentTurnPlayerId: leaderPlayer.id,
    pendingChatTurns: 0,
    attackUsedThisTurn: false,
    players: shuffle(players),
    deck: createDeck(players.length, spyCount),
    discard: [],
    logs: [],
    chatMessages: [],
    winnerTeam: null,
  };

  for (const player of state.players) {
    drawCards(state, player, 2);
  }

  addLog(state, "게임이 시작되었습니다.", "round");
  startTurn(state, state.players[0]!);
  games.set(roomId, state);
  return state;
}

export function getCurrentTurnController(roomId: string): {
  controller: "human" | "llm" | "bot";
  playerId: string;
  userId: string;
  assistantId: string | null;
  llmModelId: string | null;
  language: string | null;
} | null {
  const state = games.get(roomId);
  if (!state || state.winnerTeam) return null;
  const player = state.players.find(
    (p) => p.id === state.currentTurnPlayerId,
  );
  if (!player || !player.alive) return null;
  return {
    controller: player.controller,
    playerId: player.id,
    userId: player.userId,
    assistantId: player.assistantId,
    llmModelId: player.llmModelId,
    language: player.language,
  };
}

export function getGame(roomId: string) {
  return games.get(roomId) ?? null;
}

export function deleteGame(roomId: string): void {
  games.delete(roomId);
}

export function forceAdvanceTurn(roomId: string, userId: string): void {
  const state = getGame(roomId);
  if (!state) return;
  const actor = state.players.find((p) => p.userId === userId);
  if (!actor || state.currentTurnPlayerId !== actor.id) return;
  if (!actor.alive || state.winnerTeam) return;
  state.attackUsedThisTurn = true;
  state.pendingChatTurns = 0;
  endTurn(state);
}

export function createSnapshot(
  roomId: string,
  viewerUserId: string,
  options: { allowSpectator?: boolean; omniscient?: boolean } = {},
): GameSnapshot {
  const state = getGame(roomId);
  if (!state) {
    throw new Error("Game not found.");
  }

  const isOmniscient = options.omniscient === true;

  const viewer = isOmniscient
    ? undefined
    : state.players.find((player) => player.userId === viewerUserId);
  const isSpectator = !viewer && (options.allowSpectator === true || isOmniscient);
  if (!viewer && !isSpectator) {
    throw new Error("You are not part of this game.");
  }

  return {
    roomId: state.roomId,
    round: state.round,
    maxRound: state.maxRound,
    currentTurnPlayerId: state.currentTurnPlayerId,
    viewerMode: isOmniscient ? "spectator" : viewer ? "player" : "spectator",
    myPlayerId: isOmniscient ? null : (viewer?.id ?? null),
    myTeam: isOmniscient ? null : viewer ? (viewer.role === "spy" ? "spies" : "agents") : null,
    phase: getPhase(state),
    remainingChatTurns: state.pendingChatTurns,
    canReveal: isOmniscient
      ? false
      : viewer !== undefined &&
        state.currentTurnPlayerId === viewer.id &&
        viewer.role === "spy" &&
        !viewer.revealed &&
        viewer.alive,
    mustUseAttack: isOmniscient
      ? false
      : viewer !== undefined &&
        state.currentTurnPlayerId === viewer.id &&
        !state.attackUsedThisTurn &&
        !viewer.isJailed &&
        getAttackCount(viewer) > 0,
    winnerTeam: state.winnerTeam,
    players: state.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      name: player.name,
      hp: player.hp,
      maxHp: player.maxHp,
      alive: player.alive,
      isJailed: player.isJailed,
      attacks: getAttackCount(player),
      cards: player.cards.filter(
        (card): card is Exclude<ActionCard, "attack"> => card !== "attack",
      ),
      role: buildRoleForViewer(player, viewer?.userId ?? null, isOmniscient),
      verified: player.verified || (!player.alive && player.role === "agent"),
    })),
    logs: [...state.logs],
    chatMessages: [...state.chatMessages],
  };
}

export function createOmniscientSnapshot(roomId: string): GameSnapshot | null {
  const state = getGame(roomId);
  if (!state) return null;
  return createSnapshot(roomId, "", { omniscient: true });
}

export function applyGameAction(
  roomId: string,
  viewerUserId: string,
  action: GameAction,
) {
  const state = getGame(roomId);
  if (!state) {
    throw new Error("Game not found.");
  }

  const actor = state.players.find((player) => player.userId === viewerUserId);
  if (!actor) {
    throw new Error("You are not part of this game.");
  }
  if (state.currentTurnPlayerId !== actor.id) {
    throw new Error("It is not your turn.");
  }
  if (!actor.alive) {
    throw new Error("Eliminated players cannot act.");
  }
  if (state.winnerTeam) {
    throw new Error("The game is already finished.");
  }

  if (action.type === "chat") {
    if (state.pendingChatTurns <= 0) {
      throw new Error("No turn chat is available.");
    }
    const text = action.text.trim();
    if (!text) {
      throw new Error("Chat message is empty.");
    }
    state.chatMessages.push({
      id: createId(),
      playerId: actor.id,
      playerName: actor.name,
      text,
    });
    state.pendingChatTurns -= 1;
    return;
  }

  if (action.type === "skip-chat") {
    state.pendingChatTurns = 0;
    return;
  }

  if (action.type === "reveal") {
    ensureActionPhase(state);
    if (actor.role !== "spy" || actor.revealed) {
      throw new Error("You cannot reveal right now.");
    }
    actor.revealed = true;
    drawCards(state, actor, 2);
    state.pendingChatTurns += 1;
    addLog(state, `${actor.name}이(가) 스파이로 정체를 드러내고 카드 2장을 뽑았습니다.`, "round");
    return;
  }

  if (action.type === "play-card") {
    ensureActionPhase(state);

    if (action.card === "attack") {
      const target = ensureTarget(state, action.targetId, {
        allowLeader: true,
      });
      playAttack(state, actor, target);
      state.attackUsedThisTurn = true;
      return;
    }

    if (action.card === "heal") {
      const target = ensureTarget(state, action.targetId, {
        allowSelf: true,
        allowLeader: true,
      });
      playHeal(state, actor, target);
      return;
    }

    if (action.card === "jail") {
      const target = ensureTarget(state, action.targetId);
      playJail(state, actor, target);
      return;
    }

    const target = ensureTarget(state, action.targetId);
    playVerify(state, actor, target);
    return;
  }

  ensureActionPhase(state);
  if (
    !state.attackUsedThisTurn &&
    !actor.isJailed &&
    getAttackCount(actor) > 0
  ) {
    throw new Error(
      "You must use at least one attack card before ending your turn.",
    );
  }
  endTurn(state);
}
