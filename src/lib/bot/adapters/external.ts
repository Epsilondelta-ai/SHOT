import type { BotDecisionInput, BotDecisionOutput } from "./types";

export async function externalAgentDecide(
  webhookUrl: string,
  input: BotDecisionInput
): Promise<BotDecisionOutput> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) throw new Error(`Webhook returned ${response.status}`);

    const data = (await response.json()) as {
      action: string;
      targetId?: string;
      reasoning?: string;
    };

    const action = input.validActions.find(
      (a) =>
        a.type === data.action &&
        (data.action === "PASS" || a.targetId === data.targetId)
    );

    if (!action) {
      return {
        action: input.validActions[0],
        reasoning: "fallback - invalid response",
      };
    }

    return { action, reasoning: data.reasoning };
  } catch (error) {
    console.error("External agent error:", error);
    return {
      action: input.validActions[0],
      reasoning: "fallback - error",
    };
  }
}
