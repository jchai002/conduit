import { BusinessContextProvider } from "../../businessContextProvider";
import { Message, Thread, SearchOptions } from "../../types";

const FAKE_MESSAGES: Message[] = [
  {
    id: "1706800000.000100",
    text: "We need to add rate limiting to the API before the launch. I'm thinking 100 requests per minute per user, with a 429 response when exceeded.",
    author: "sarah",
    source: "mock",
    channel: "backend",
    timestamp: "1706800000.000100",
    threadId: "1706800000.000100",
    permalink: "https://mock.slack.com/archives/C01/p1706800000000100",
  },
  {
    id: "1706800060.000200",
    text: "100/min sounds reasonable. Should we use a sliding window or fixed window? Sliding is more fair but harder to implement.",
    author: "mike",
    source: "mock",
    channel: "backend",
    timestamp: "1706800060.000200",
    threadId: "1706800000.000100",
    permalink: "https://mock.slack.com/archives/C01/p1706800060000200",
  },
  {
    id: "1706800120.000300",
    text: "Let's go with token bucket — it's the industry standard and Redis has good primitives for it. I'll write up the design doc.",
    author: "sarah",
    source: "mock",
    channel: "backend",
    timestamp: "1706800120.000300",
    threadId: "1706800000.000100",
    permalink: "https://mock.slack.com/archives/C01/p1706800120000300",
  },
  {
    id: "1706886400.000400",
    text: "The new onboarding flow needs a progress indicator. Users are dropping off at step 3 because they don't know how many steps are left.",
    author: "lisa",
    source: "mock",
    channel: "product",
    timestamp: "1706886400.000400",
    permalink: "https://mock.slack.com/archives/C02/p1706886400000400",
  },
  {
    id: "1706886500.000500",
    text: "Agreed. Let's add a stepper component — 5 steps total, highlight the current one. Should match the design system.",
    author: "david",
    source: "mock",
    channel: "product",
    timestamp: "1706886500.000500",
    threadId: "1706886400.000400",
    permalink: "https://mock.slack.com/archives/C02/p1706886500000500",
  },
  {
    id: "1706972800.000600",
    text: "Deployment to staging is blocked — the database migration from PR #247 is failing on the large users table. Need to batch it.",
    author: "mike",
    source: "mock",
    channel: "engineering",
    timestamp: "1706972800.000600",
    permalink: "https://mock.slack.com/archives/C03/p1706972800000600",
  },
  {
    id: "1706973000.000700",
    text: "I'll split the migration into chunks of 10k rows. Should be safe to run during off-peak hours.",
    author: "mike",
    source: "mock",
    channel: "engineering",
    timestamp: "1706973000.000700",
    threadId: "1706972800.000600",
    permalink: "https://mock.slack.com/archives/C03/p1706973000000700",
  },
  {
    id: "1707050000.000750",
    text: "We need a sign up form but NOT on the home page — put it on a dedicated /join route. Fields: work email (no gmail/yahoo, must be company domain), full name, and a dropdown for team size with these exact options: 1-5, 6-20, 21-100, 100+. No password field — we're doing magic link auth.",
    author: "sarah",
    source: "mock",
    channel: "product",
    timestamp: "1707050000.000750",
    threadId: "1707050000.000750",
    permalink: "https://mock.slack.com/archives/C02/p1707050000000750",
  },
  {
    id: "1707050100.000760",
    text: "Magic link only? What about SSO? And should we validate the email domain on the client side or server side?",
    author: "david",
    source: "mock",
    channel: "product",
    timestamp: "1707050100.000760",
    threadId: "1707050000.000750",
    permalink: "https://mock.slack.com/archives/C02/p1707050100000760",
  },
  {
    id: "1707050200.000770",
    text: "SSO comes later. Validate email domain client-side with a blocklist of free providers (gmail, yahoo, hotmail, outlook.com). Show inline error: \"Please use your work email\". Button text should be \"Request Access\" not \"Sign Up\" — we're doing a waitlist, not open registration. Oh and add a checkbox: \"I agree to the Beta Terms\" that links to /legal/beta-terms.",
    author: "sarah",
    source: "mock",
    channel: "product",
    timestamp: "1707050200.000770",
    threadId: "1707050000.000750",
    permalink: "https://mock.slack.com/archives/C02/p1707050200000770",
  },
  {
    id: "1707059200.000800",
    text: "Can we add webhook support for the billing events? Partners want to get notified when a subscription changes.",
    author: "sarah",
    source: "mock",
    channel: "backend",
    timestamp: "1707059200.000800",
    permalink: "https://mock.slack.com/archives/C01/p1707059200000800",
  },
  {
    id: "1707059400.000900",
    text: "The auth token refresh is broken in production. Users are getting logged out every 15 minutes instead of every 24 hours.",
    author: "lisa",
    source: "mock",
    channel: "engineering",
    timestamp: "1707059400.000900",
    permalink: "https://mock.slack.com/archives/C03/p1707059400000900",
  },
  {
    id: "1707059500.001000",
    text: "Found it — the refresh endpoint is returning the old expiry value. Fix is in PR #251.",
    author: "david",
    source: "mock",
    channel: "engineering",
    timestamp: "1707059500.001000",
    threadId: "1707059400.000900",
    permalink: "https://mock.slack.com/archives/C03/p1707059500001000",
  },
];

export class MockProvider implements BusinessContextProvider {
  readonly id = "mock";
  readonly displayName = "Mock (Test Data)";

  isConfigured(): boolean {
    return true;
  }

  async configure(): Promise<void> {
    // No configuration needed for mock
  }

  async searchMessages(options: SearchOptions): Promise<Message[]> {
    const query = options.query.toLowerCase();
    const max = options.maxResults ?? 20;

    // Strip Slack-style search operators for keyword matching
    const keywords = query
      .replace(/from:\S+/g, "")
      .replace(/in:\S+/g, "")
      .replace(/after:\S+/g, "")
      .replace(/before:\S+/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const fromMatch = query.match(/from:(\S+)/);
    const inMatch = query.match(/in:(\S+)/);

    let results = FAKE_MESSAGES.filter((msg) => {
      if (fromMatch && !msg.author.toLowerCase().includes(fromMatch[1])) return false;
      if (inMatch && !msg.channel.toLowerCase().includes(inMatch[1])) return false;
      if (keywords.length === 0) return true;
      // Search both message text AND author name for keyword matches
      const text = msg.text.toLowerCase();
      const author = msg.author.toLowerCase();
      return keywords.some((kw) => text.includes(kw) || author.includes(kw));
    });

    return results.slice(0, max);
  }

  async getThread(channelId: string, threadId: string): Promise<Thread | null> {
    const threadMessages = FAKE_MESSAGES.filter(
      (msg) => msg.threadId === threadId
    );

    if (threadMessages.length === 0) return null;

    return {
      parentMessage: threadMessages[0],
      replies: threadMessages.slice(1),
    };
  }
}
