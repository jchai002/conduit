/**
 * Platform-agnostic data types shared across all context providers and coding agents.
 */

export interface Message {
  id: string;
  text: string;
  author: string;
  source: string;
  channel: string;
  timestamp: string;
  threadId?: string;
  permalink?: string;
}

export interface Thread {
  parentMessage: Message;
  replies: Message[];
}

export interface SearchOptions {
  query: string;
  maxResults?: number;
}
