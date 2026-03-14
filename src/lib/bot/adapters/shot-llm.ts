import Anthropic from "@anthropic-ai/sdk";
import type { BotDecisionInput, BotDecisionOutput } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function shotLLMDecide(
  input: BotDecisionInput
): Promise<BotDecisionOutput> {
  const { gameState, myPlayerId, myPlayerState, validActions, gameHistory } =
    input;

  const alivePlayers = gameState.players.filter((p) => p.status === "alive");

  const prompt = `You are playing SHOT, a turn-based board game.

Game Rules:
- Each player has 5 HP
- On your turn: SHOOT a target (deals 1 damage) or PASS
- Player eliminated at 0 HP
- Last player standing wins
- If all players PASS in a full round, it's a DRAW

Current State:
- You are: ${myPlayerState.name} (HP: ${myPlayerState.hp}/5)
- Turn: ${gameState.turn}

All Players:
${alivePlayers.map((p) => `- ${p.name}: HP ${p.hp}/5 ${p.id === myPlayerId ? "(YOU)" : ""}`).join("\n")}

Recent actions:
${gameHistory.slice(-5).join("\n") || "Game just started"}

Available actions:
${validActions.map((a, i) => `${i + 1}. ${a.type}${a.targetName ? " " + a.targetName : ""}`).join("\n")}

Choose an action. Respond with JSON only:
{"action": "SHOOT", "targetId": "<player_id>", "reasoning": "<brief reason>"}
or
{"action": "PASS", "reasoning": "<brief reason>"}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      action: string;
      targetId?: string;
      reasoning?: string;
    };

    // Validate action
    const action = validActions.find(
      (a) =>
        a.type === parsed.action &&
        (parsed.action === "PASS" || a.targetId === parsed.targetId)
    );

    if (!action) {
      // Fallback to first valid action
      return { action: validActions[0], reasoning: "fallback" };
    }

    return { action, reasoning: parsed.reasoning };
  } catch (error) {
    console.error("LLM decision error:", error);
    // Fallback: random action
    const randomAction =
      validActions[Math.floor(Math.random() * validActions.length)];
    return { action: randomAction, reasoning: "fallback" };
  }
}
