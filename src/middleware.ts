import { MessageChannel } from "node:worker_threads";
import { defineMiddleware } from "astro:middleware";

if (!globalThis.MessageChannel) {
  // Używamy 'as any', aby uciszyć TypeScript - wiemy, że wstawiamy wersję Node'ową
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.MessageChannel = MessageChannel as any;
}

export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
