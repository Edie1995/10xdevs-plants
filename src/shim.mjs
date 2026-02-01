import { MessageChannel } from "node:worker_threads";

if (!globalThis.MessageChannel) {
  globalThis.MessageChannel = MessageChannel;
}
