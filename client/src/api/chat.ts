import { api } from "./client";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export function sendChatMessage(message: string, history: ChatTurn[]) {
  return api.post<{ reply: string }>("/chat", { message, history });
}
