type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

// In-memory SSE broker (single-server MVP)
const gameClients = new Map<string, SSEClient[]>();

export function subscribe(gameId: string, clientId: string): ReadableStream {
  const stream = new ReadableStream({
    start(controller) {
      const client: SSEClient = { id: clientId, controller };
      if (!gameClients.has(gameId)) {
        gameClients.set(gameId, []);
      }
      gameClients.get(gameId)!.push(client);

      // Send initial connection event
      const data = `data: ${JSON.stringify({ type: "CONNECTED", clientId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    },
    cancel() {
      unsubscribe(gameId, clientId);
    },
  });

  return stream;
}

export function publish(
  gameId: string,
  event: Record<string, unknown>
): void {
  const clients = gameClients.get(gameId);
  if (!clients) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoded = new TextEncoder().encode(data);

  const toRemove: string[] = [];
  for (const client of clients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      toRemove.push(client.id);
    }
  }

  // Clean up disconnected clients
  for (const id of toRemove) {
    unsubscribe(gameId, id);
  }
}

export function unsubscribe(gameId: string, clientId: string): void {
  const clients = gameClients.get(gameId);
  if (!clients) return;
  const filtered = clients.filter((c) => c.id !== clientId);
  if (filtered.length === 0) {
    gameClients.delete(gameId);
  } else {
    gameClients.set(gameId, filtered);
  }
}
