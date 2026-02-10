import * as vscode from "vscode";
import { Message } from "../providers/types";

export interface MessageCluster {
  label: string;
  description: string;
  messages: Message[];
}

/**
 * Simple clustering: group by thread and standalone messages.
 */
export function clusterMessages(messages: Message[]): MessageCluster[] {
  const threadMap = new Map<string, Message[]>();
  const standalone: Message[] = [];

  for (const msg of messages) {
    if (msg.threadId) {
      const key = `${msg.channel}:${msg.threadId}`;
      const existing = threadMap.get(key) ?? [];
      existing.push(msg);
      threadMap.set(key, existing);
    } else {
      standalone.push(msg);
    }
  }

  const clusters: MessageCluster[] = [];

  for (const [, threadMsgs] of threadMap) {
    const first = threadMsgs[0];
    const preview = first.text.slice(0, 80) + (first.text.length > 80 ? "..." : "");
    clusters.push({
      label: `Thread in #${first.channel} (${threadMsgs.length} messages)`,
      description: preview,
      messages: threadMsgs,
    });
  }

  for (const msg of standalone) {
    const preview = msg.text.slice(0, 80) + (msg.text.length > 80 ? "..." : "");
    clusters.push({
      label: `${msg.author} in #${msg.channel}`,
      description: preview,
      messages: [msg],
    });
  }

  return clusters;
}

/**
 * Show a QuickPick allowing the user to choose which message cluster(s) are relevant.
 */
export async function disambiguate(
  clusters: MessageCluster[]
): Promise<MessageCluster[] | undefined> {
  if (clusters.length === 0) return undefined;
  if (clusters.length === 1) return clusters;

  const items = clusters.map((cluster, i) => ({
    label: cluster.label,
    description: cluster.description,
    detail: `${cluster.messages.length} message(s)`,
    index: i,
    picked: false,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: "Multiple topics found — which are relevant?",
    placeHolder: "Select the relevant discussions",
    canPickMany: true,
  });

  if (!selected || selected.length === 0) return undefined;

  return selected.map((item) => clusters[item.index]);
}
