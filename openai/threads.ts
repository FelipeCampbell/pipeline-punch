import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface PendingAction {
  type: "create_transfer";
  data: Record<string, unknown>;
}

export interface Thread {
  id: string;
  messages: ChatCompletionMessageParam[];
  mfaPending: PendingAction | null;
  createdAt: Date;
}

const threads = new Map<string, Thread>();

export function getOrCreateThread(threadId?: string): Thread {
  if (threadId && threads.has(threadId)) {
    return threads.get(threadId)!;
  }

  const id = threadId ?? crypto.randomUUID();
  const thread: Thread = {
    id,
    messages: [],
    mfaPending: null,
    createdAt: new Date(),
  };
  threads.set(id, thread);
  return thread;
}

export function appendMessage(
  threadId: string,
  message: ChatCompletionMessageParam
): void {
  const thread = threads.get(threadId);
  if (thread) {
    thread.messages.push(message);
  }
}

export function setPendingAction(
  threadId: string,
  action: PendingAction | null
): void {
  const thread = threads.get(threadId);
  if (thread) {
    thread.mfaPending = action;
  }
}

export function getPendingAction(
  threadId: string
): PendingAction | null {
  return threads.get(threadId)?.mfaPending ?? null;
}
