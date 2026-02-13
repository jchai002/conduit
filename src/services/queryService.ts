import { BusinessContextProvider } from "../providers/businessContextProvider";
import { CodingAgent } from "../providers/codingAgent";
import { Message, Thread } from "../providers/types";
import { SlackProvider } from "../providers/business-context/slack/slackProvider";
import { analyzeQuery, extractMentions } from "../query/queryAnalyzer";
import { buildContextPrompt } from "../contextPromptBuilder";
import { clusterMessages, MessageCluster } from "../ui/disambiguation";

export interface QueryProgress {
  report(message: string): void;
}

export interface MentionResolver {
  resolveAmbiguousUser(
    rawUser: string,
    matches: Array<{ name: string; realName: string }>
  ): Promise<string | undefined>;

  resolveAmbiguousChannel(
    rawChannel: string,
    matches: Array<{ name: string }>
  ): Promise<string | undefined>;
}

export interface DisambiguationHandler {
  disambiguate(
    clusters: MessageCluster[]
  ): Promise<MessageCluster[] | undefined>;
}

export interface QueryOutput {
  log(text: string): void;
  agentOutput(text: string): void;
  agentError(text: string): void;
}

export interface QueryServiceConfig {
  maxSearchResults: number;
  maxThreadMessages: number;
}

export interface QueryResult {
  success: boolean;
  error?: string;
  messagesFound: number;
  threadsFound: number;
}

export async function executeQuery(params: {
  userInput: string;
  provider: BusinessContextProvider;
  agent: CodingAgent;
  workDir: string;
  config: QueryServiceConfig;
  progress: QueryProgress;
  mentionResolver: MentionResolver;
  disambiguation: DisambiguationHandler;
  output: QueryOutput;
  isCancelled: () => boolean;
}): Promise<QueryResult> {
  const {
    provider,
    agent,
    workDir,
    config,
    progress,
    mentionResolver,
    disambiguation,
    output,
    isCancelled,
  } = params;
  let { userInput } = params;

  // Step 1: Resolve @user and #channel mentions
  let resolvedInput = userInput;
  const mentions = extractMentions(userInput);

  if (
    provider instanceof SlackProvider &&
    (mentions.users.length > 0 || mentions.channels.length > 0)
  ) {
    for (const rawUser of mentions.users) {
      const matches = await provider.resolveUser(rawUser);
      if (matches.length === 1) {
        resolvedInput = resolvedInput.replace(`@${rawUser}`, matches[0].name);
      } else if (matches.length > 1) {
        const picked = await mentionResolver.resolveAmbiguousUser(
          rawUser,
          matches.map((m) => ({ name: m.name, realName: m.realName }))
        );
        if (!picked) return { success: false, error: "Cancelled", messagesFound: 0, threadsFound: 0 };
        resolvedInput = resolvedInput.replace(`@${rawUser}`, picked);
      }
    }

    for (const rawChannel of mentions.channels) {
      const matches = await provider.resolveChannel(rawChannel);
      if (matches.length === 1) {
        resolvedInput = resolvedInput.replace(`#${rawChannel}`, `#${matches[0].name}`);
      } else if (matches.length > 1) {
        const picked = await mentionResolver.resolveAmbiguousChannel(
          rawChannel,
          matches.map((c) => ({ name: c.name }))
        );
        if (!picked) return { success: false, error: "Cancelled", messagesFound: 0, threadsFound: 0 };
        resolvedInput = resolvedInput.replace(`#${rawChannel}`, `#${picked}`);
      }
    }
  }

  // Step 2: Analyze the query
  progress.report("Analyzing query...");
  const analyzed = analyzeQuery(resolvedInput);

  output.log(`[Query Analysis]`);
  output.log(`  Confidence: ${analyzed.confidence}`);
  output.log(`  Stakeholders: ${analyzed.stakeholders.join(", ") || "none"}`);
  output.log(`  Keywords: ${analyzed.keywords.join(", ") || "none"}`);
  output.log(`  Timeframe: ${JSON.stringify(analyzed.timeframe)}`);

  // Step 3: Search for messages
  progress.report(`Searching ${provider.displayName}...`);

  let allMessages: Message[] = [];

  if (provider instanceof SlackProvider) {
    const plan = provider.buildSearchPlan(analyzed);
    for (const query of plan.queries) {
      if (isCancelled()) return { success: false, error: "Cancelled", messagesFound: 0, threadsFound: 0 };
      output.log(`[Search] ${query}`);
      const results = await provider.searchMessages({
        query,
        maxResults: config.maxSearchResults,
      });
      allMessages.push(...results);
    }
  } else {
    const query = analyzed.keywords.join(" ") || analyzed.rawQuery;
    output.log(`[Search] ${query}`);
    allMessages = await provider.searchMessages({
      query,
      maxResults: config.maxSearchResults,
    });
  }

  // Deduplicate
  const seen = new Set<string>();
  const uniqueMessages = allMessages.filter((msg) => {
    const key = `${msg.channel}:${msg.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  output.log(`[Results] Found ${uniqueMessages.length} unique messages`);

  if (uniqueMessages.length === 0) {
    return { success: true, error: "No messages found matching your query.", messagesFound: 0, threadsFound: 0 };
  }

  // Step 4: Disambiguate
  progress.report("Organizing results...");
  const clusters = clusterMessages(uniqueMessages);

  let selectedMessages: Message[];

  if (clusters.length > 1) {
    const chosen = await disambiguation.disambiguate(clusters);
    if (!chosen) return { success: false, error: "Cancelled", messagesFound: uniqueMessages.length, threadsFound: 0 };
    selectedMessages = chosen.flatMap((c) => c.messages);
  } else {
    selectedMessages = uniqueMessages;
  }

  // Step 5: Fetch threads
  progress.report("Fetching thread context...");
  const threads: Thread[] = [];
  const threadsSeen = new Set<string>();

  for (const msg of selectedMessages) {
    if (isCancelled()) return { success: false, error: "Cancelled", messagesFound: uniqueMessages.length, threadsFound: threads.length };
    if (msg.threadId) {
      const key = `${msg.channel}:${msg.threadId}`;
      if (threadsSeen.has(key)) continue;
      threadsSeen.add(key);

      try {
        const thread = await provider.getThread(msg.channel, msg.threadId);
        if (thread) threads.push(thread);
      } catch (err: any) {
        output.log(`[Warning] Could not fetch thread: ${err.message}`);
      }
    }
  }

  // Step 6: Build prompt
  progress.report("Building context prompt...");
  const contextPrompt = buildContextPrompt(userInput, selectedMessages, threads);

  output.log("[Context Prompt Preview]");
  output.log(contextPrompt.slice(0, 500) + "...");

  // Step 7: Run coding agent
  progress.report(`Running ${agent.displayName}...`);

  const result = await agent.execute({
    prompt: contextPrompt,
    workingDirectory: workDir,
    onOutput: (text) => output.agentOutput(text),
    onError: (text) => output.agentError(text),
  });

  return {
    success: result.success,
    error: result.error,
    messagesFound: uniqueMessages.length,
    threadsFound: threads.length,
  };
}
