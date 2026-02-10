/**
 * Analyzes a natural language user query to extract structured search parameters.
 * Extracts: stakeholders (people), timeframes, keywords, and confidence level.
 */

export type QueryConfidence = "vague" | "partial" | "specific";

export interface AnalyzedQuery {
  confidence: QueryConfidence;
  stakeholders: string[];
  timeframe: { after?: string; before?: string };
  keywords: string[];
  rawQuery: string;
}

// Common time references mapped to date offsets
const TIMEFRAME_PATTERNS: Record<string, () => { after: string; before?: string }> = {
  "last week": () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { after: formatDate(d) };
  },
  "this week": () => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return { after: formatDate(d) };
  },
  yesterday: () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return { after: formatDate(d), before: formatDate(new Date()) };
  },
  today: () => ({ after: formatDate(new Date()) }),
  "last month": () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return { after: formatDate(d) };
  },
  "this month": () => {
    const d = new Date();
    d.setDate(1);
    return { after: formatDate(d) };
  },
  recently: () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return { after: formatDate(d) };
  },
};

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Words to strip when extracting keywords
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "was", "were", "are", "been", "be",
  "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can",
  "about", "above", "after", "before", "between", "but", "by",
  "for", "from", "in", "into", "of", "on", "or", "to", "with",
  "that", "this", "these", "those", "what", "which", "who", "whom",
  "said", "mentioned", "talked", "discussed", "told", "asked",
  "something", "anything", "thing", "stuff", "it", "they", "them",
  "he", "she", "his", "her", "their", "our", "my", "your",
  "want", "wants", "wanted", "need", "needs", "needed",
  "implement", "build", "create", "make", "add", "fix",
  "pull", "up", "look", "find", "get", "check",
  "me", "i", "we", "you", "us",
  "last", "this", "next", "week", "month", "day", "yesterday", "today", "recently",
]);

// Pattern: @name or common name references like "Sarah said", "from John"
const NAME_PATTERNS = [
  /@(\w+)/g,
  /(?:from|by|with|@)\s+(\w+)/gi,
  /(\w+)\s+(?:said|mentioned|talked|discussed|told|asked|wants?|suggested|proposed|requested)/gi,
  /(?:what|whatever)\s+(\w+)\s+(?:said|mentioned|talked|discussed|wants?)/gi,
];

export interface ExtractedMentions {
  users: string[];     // text after @ (e.g. ["sara"])
  channels: string[];  // text after # (e.g. ["backend"])
  cleanedQuery: string; // query with @/# tokens removed
}

export function extractMentions(rawQuery: string): ExtractedMentions {
  const users: string[] = [];
  const channels: string[] = [];

  let cleaned = rawQuery;

  // Match @username tokens (not preceded by non-whitespace, so emails don't match)
  const userRegex = /(?:^|\s)@(\w[\w.]*)/g;
  let match;
  while ((match = userRegex.exec(rawQuery)) !== null) {
    users.push(match[1]);
    cleaned = cleaned.replace("@" + match[1], "");
  }

  // Match #channel tokens
  const channelRegex = /(?:^|\s)#(\w[\w-]*)/g;
  while ((match = channelRegex.exec(rawQuery)) !== null) {
    channels.push(match[1]);
    cleaned = cleaned.replace("#" + match[1], "");
  }

  return {
    users,
    channels,
    cleanedQuery: cleaned.replace(/\s+/g, " ").trim(),
  };
}

export function analyzeQuery(rawQuery: string): AnalyzedQuery {
  const lower = rawQuery.toLowerCase();

  // Extract stakeholders
  const stakeholders = extractStakeholders(rawQuery);

  // Extract timeframe
  const timeframe = extractTimeframe(lower);

  // Extract keywords (everything that isn't a name, timeframe, or stop word)
  const keywords = extractKeywords(lower, stakeholders);

  // Determine confidence
  const confidence = determineConfidence(stakeholders, timeframe, keywords);

  return { confidence, stakeholders, timeframe, keywords, rawQuery };
}

function extractStakeholders(query: string): string[] {
  const names = new Set<string>();

  for (const pattern of NAME_PATTERNS) {
    // Reset regex state
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(query)) !== null) {
      const name = match[1].toLowerCase();
      if (!STOP_WORDS.has(name) && name.length > 1) {
        names.add(name);
      }
    }
  }

  return Array.from(names);
}

function extractTimeframe(query: string): { after?: string; before?: string } {
  for (const [pattern, getRange] of Object.entries(TIMEFRAME_PATTERNS)) {
    if (query.includes(pattern)) {
      return getRange();
    }
  }

  // Try to find explicit date references
  const dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return { after: dateMatch[1] };
  }

  return {};
}

function extractKeywords(query: string, stakeholders: string[]): string[] {
  const stakeholderSet = new Set(stakeholders.map((s) => s.toLowerCase()));

  const words = query
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.has(word) &&
        !stakeholderSet.has(word)
    );

  // Deduplicate
  return Array.from(new Set(words));
}

function determineConfidence(
  stakeholders: string[],
  timeframe: { after?: string; before?: string },
  keywords: string[]
): QueryConfidence {
  let score = 0;

  if (stakeholders.length > 0) score += 1;
  if (timeframe.after || timeframe.before) score += 1;
  if (keywords.length >= 2) score += 2;
  else if (keywords.length === 1) score += 1;

  if (score >= 3) return "specific";
  if (score >= 1) return "partial";
  return "vague";
}
