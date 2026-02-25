/**
 * Tests for utility functions used in the webview.
 */
import { describe, it, expect } from "vitest";
import { shortenPath } from "../utils/shortenPath";
import { formatRelativeTime } from "../utils/formatRelativeTime";

describe("shortenPath", () => {
  it("returns short paths unchanged", () => {
    expect(shortenPath("src/foo.ts")).toBe("src/foo.ts");
  });

  it("returns 3-segment paths unchanged", () => {
    expect(shortenPath("src/chat/messages.ts")).toBe("src/chat/messages.ts");
  });

  it("shortens long paths to last 3 segments with ... prefix", () => {
    expect(shortenPath("/home/user/projects/tether/src/chat/messages.ts")).toBe(
      ".../src/chat/messages.ts"
    );
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(shortenPath("C:\\Users\\Jerry\\src\\chat\\messages.ts")).toBe(
      ".../src/chat/messages.ts"
    );
  });

  it("handles single segment", () => {
    expect(shortenPath("file.ts")).toBe("file.ts");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for timestamps within the last minute", () => {
    expect(formatRelativeTime(Date.now() - 10 * 1000)).toBe("just now");
  });

  it("returns minutes ago for recent timestamps", () => {
    expect(formatRelativeTime(Date.now() - 5 * 60 * 1000)).toBe("5m ago");
  });

  it("returns hours ago for today's timestamps", () => {
    expect(formatRelativeTime(Date.now() - 3 * 60 * 60 * 1000)).toBe("3h ago");
  });

  it("returns 'yesterday' for 1-day-old timestamps", () => {
    expect(formatRelativeTime(Date.now() - 24 * 60 * 60 * 1000)).toBe("yesterday");
  });

  it("returns days ago for this week", () => {
    expect(formatRelativeTime(Date.now() - 3 * 24 * 60 * 60 * 1000)).toBe("3d ago");
  });

  it("returns formatted date for older timestamps", () => {
    const result = formatRelativeTime(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Should be a date like "Jan 7" — just check it's not a relative format
    expect(result).not.toContain("ago");
    expect(result).not.toBe("yesterday");
  });
});
