import * as vscode from "vscode";
import { WebClient } from "@slack/web-api";
import { BusinessContextProvider } from "../../businessContextProvider";
import { Message, Thread, SearchOptions } from "../../types";
import { AnalyzedQuery } from "../../../query/queryAnalyzer";
import { SlackCache, SlackUser, SlackChannel } from "./slackCache";

export interface SlackSearchPlan {
  queries: string[];
  strategy: "broad" | "targeted" | "multi";
}

export class SlackProvider implements BusinessContextProvider {
  readonly id = "slack";
  readonly displayName = "Slack";

  private client: WebClient | null = null;
  private cache: SlackCache = new SlackCache(() => this.getClient());

  isConfigured(): boolean {
    return this.getToken() !== "";
  }

  async configure(): Promise<void> {
    const token = await vscode.window.showInputBox({
      title: "Configure Slack User Token",
      prompt: "Enter your Slack User OAuth Token (starts with xoxp-)",
      placeHolder: "xoxp-...",
      password: true,
      validateInput: (value) => {
        if (value && !value.startsWith("xoxp-")) {
          return "Slack User Token should start with xoxp-";
        }
        return undefined;
      },
    });

    if (token !== undefined) {
      const config = vscode.workspace.getConfiguration("businessContext");
      await config.update("slack.userToken", token, vscode.ConfigurationTarget.Global);
      this.client = null;
      vscode.window.showInformationMessage("Slack token saved successfully.");
    }
  }

  async searchMessages(options: SearchOptions): Promise<Message[]> {
    const client = this.getClient();
    const maxResults = options.maxResults ?? this.getMaxSearchResults();

    const result = await client.search.messages({
      query: options.query,
      sort: "timestamp",
      sort_dir: "desc",
      count: maxResults,
      page: 1,
    });

    const matches = (result.messages as any)?.matches ?? [];

    return matches.map((match: any) => this.toMessage(match));
  }

  async getThread(channelId: string, threadId: string): Promise<Thread | null> {
    const client = this.getClient();
    const limit = this.getMaxThreadMessages();

    const result = await client.conversations.replies({
      channel: channelId,
      ts: threadId,
      limit,
    });

    const messages = result.messages ?? [];
    if (messages.length === 0) return null;

    return {
      parentMessage: this.toMessage(messages[0], channelId),
      replies: messages.slice(1).map((msg: any) => this.toMessage(msg, channelId)),
    };
  }

  buildQuery(params: {
    keywords?: string;
    from?: string;
    inChannel?: string;
    after?: string;
    before?: string;
  }): string {
    const parts: string[] = [];

    if (params.keywords) parts.push(params.keywords);
    if (params.from) parts.push(`from:${params.from}`);
    if (params.inChannel) parts.push(`in:${params.inChannel}`);
    if (params.after) parts.push(`after:${params.after}`);
    if (params.before) parts.push(`before:${params.before}`);

    return parts.join(" ");
  }

  buildSearchPlan(analyzed: AnalyzedQuery): SlackSearchPlan {
    const { confidence, stakeholders, timeframe, keywords } = analyzed;

    if (confidence === "specific") {
      const query = this.buildQuery({
        keywords: keywords.join(" "),
        from: stakeholders[0],
        after: timeframe.after,
        before: timeframe.before,
      });
      return { queries: [query], strategy: "targeted" };
    }

    if (confidence === "partial") {
      const queries: string[] = [];

      if (stakeholders.length > 0 && keywords.length > 0) {
        queries.push(
          this.buildQuery({
            keywords: keywords.join(" "),
            from: stakeholders[0],
            after: timeframe.after,
            before: timeframe.before,
          })
        );
        queries.push(
          this.buildQuery({
            keywords: keywords.join(" "),
            after: timeframe.after,
            before: timeframe.before,
          })
        );
      } else if (stakeholders.length > 0) {
        queries.push(
          this.buildQuery({
            from: stakeholders[0],
            after: timeframe.after ?? this.defaultAfter(),
            before: timeframe.before,
          })
        );
      } else {
        queries.push(
          this.buildQuery({
            keywords: keywords.join(" "),
            after: timeframe.after ?? this.defaultAfter(),
            before: timeframe.before,
          })
        );
      }

      return { queries, strategy: "multi" };
    }

    const queries: string[] = [];

    if (stakeholders.length > 0) {
      queries.push(
        this.buildQuery({
          from: stakeholders[0],
          after: timeframe.after ?? this.defaultAfter(),
        })
      );
    }

    if (keywords.length > 0) {
      queries.push(
        this.buildQuery({
          keywords: keywords.join(" "),
          after: timeframe.after ?? this.defaultAfter(),
        })
      );
    }

    if (queries.length === 0) {
      queries.push(this.buildQuery({ after: this.defaultAfter() }));
    }

    return { queries, strategy: "broad" };
  }

  async resolveUser(input: string): Promise<SlackUser[]> {
    return this.cache.fuzzyMatchUser(input);
  }

  async resolveChannel(input: string): Promise<SlackChannel[]> {
    return this.cache.fuzzyMatchChannel(input);
  }

  // ── Private ───────────────────────────────────────────

  private getToken(): string {
    return vscode.workspace
      .getConfiguration("businessContext")
      .get<string>("slack.userToken", "");
  }

  private getMaxSearchResults(): number {
    return vscode.workspace
      .getConfiguration("businessContext")
      .get<number>("maxSearchResults", 20);
  }

  private getMaxThreadMessages(): number {
    return vscode.workspace
      .getConfiguration("businessContext")
      .get<number>("maxThreadMessages", 50);
  }

  private getClient(): WebClient {
    const token = this.getToken();
    if (!this.client || (this.client as any).token !== token) {
      this.client = new WebClient(token);
    }
    return this.client;
  }

  private toMessage(raw: any, channelId?: string): Message {
    return {
      id: raw.ts ?? "",
      text: raw.text ?? "",
      author: raw.user ?? raw.username ?? "unknown",
      source: "slack",
      channel: raw.channel?.name ?? raw.channel?.id ?? channelId ?? "",
      timestamp: raw.ts ?? "",
      threadId: raw.thread_ts,
      permalink: raw.permalink ?? "",
    };
  }

  private defaultAfter(): string {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split("T")[0];
  }
}
