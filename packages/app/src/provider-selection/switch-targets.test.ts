import { describe, expect, it } from "vitest";
import type { ProviderSnapshotEntry } from "@getpaseo/protocol/agent-types";
import {
  resolveProviderRuntimeRoot,
  selectAgentProviderSwitchTargets,
} from "@/provider-selection/switch-targets";

function entry(
  overrides: Partial<ProviderSnapshotEntry> & { provider: string },
): ProviderSnapshotEntry {
  return { status: "ready", enabled: true, ...overrides };
}

const ENTRIES: ProviderSnapshotEntry[] = [
  entry({ provider: "claude", label: "Claude" }),
  entry({
    provider: "claude-work",
    label: "Claude (Work)",
    description: "Work account",
    derivedFromProviderId: "claude",
  }),
  entry({
    provider: "claude-personal",
    label: "Claude (Personal)",
    derivedFromProviderId: "claude",
  }),
  entry({ provider: "codex", label: "Codex" }),
  entry({ provider: "codex-work", label: "Codex (Work)", derivedFromProviderId: "codex" }),
];

describe("resolveProviderRuntimeRoot", () => {
  it("returns a built-in provider as its own root", () => {
    expect(resolveProviderRuntimeRoot(ENTRIES, "claude")).toBe("claude");
  });

  it("follows a chain of extends to the built-in", () => {
    const chained = [
      ...ENTRIES,
      entry({ provider: "claude-team", derivedFromProviderId: "claude-work" }),
    ];
    expect(resolveProviderRuntimeRoot(chained, "claude-team")).toBe("claude");
  });

  it("stops on a cycle instead of looping", () => {
    const cyclic = [
      entry({ provider: "a", derivedFromProviderId: "b" }),
      entry({ provider: "b", derivedFromProviderId: "a" }),
    ];
    expect(resolveProviderRuntimeRoot(cyclic, "a")).toBe("a");
  });

  it("treats an unknown provider as its own root", () => {
    expect(resolveProviderRuntimeRoot(ENTRIES, "missing")).toBe("missing");
  });
});

describe("selectAgentProviderSwitchTargets", () => {
  it("offers every other entry that runs the same provider, including the built-in", () => {
    const targets = selectAgentProviderSwitchTargets({
      entries: ENTRIES,
      currentProvider: "claude-work",
    });
    expect(targets).toEqual([
      { provider: "claude", label: "Claude" },
      { provider: "claude-personal", label: "Claude (Personal)" },
    ]);
  });

  it("carries the entry description so the row can explain the account", () => {
    const targets = selectAgentProviderSwitchTargets({
      entries: ENTRIES,
      currentProvider: "claude-personal",
    });
    expect(targets).toContainEqual({
      provider: "claude-work",
      label: "Claude (Work)",
      description: "Work account",
    });
  });

  it("skips disabled, unavailable, and errored entries", () => {
    const entries = [
      entry({ provider: "claude" }),
      entry({ provider: "claude-off", derivedFromProviderId: "claude", enabled: false }),
      entry({ provider: "claude-gone", derivedFromProviderId: "claude", status: "unavailable" }),
      entry({ provider: "claude-broken", derivedFromProviderId: "claude", status: "error" }),
      entry({ provider: "claude-warming", derivedFromProviderId: "claude", status: "loading" }),
    ];
    expect(
      selectAgentProviderSwitchTargets({ entries, currentProvider: "claude" }).map(
        (target) => target.provider,
      ),
    ).toEqual(["claude-warming"]);
  });

  it("returns nothing when the agent's provider has no siblings", () => {
    expect(
      selectAgentProviderSwitchTargets({ entries: ENTRIES, currentProvider: "codex" }),
    ).toEqual([{ provider: "codex-work", label: "Codex (Work)" }]);
    expect(
      selectAgentProviderSwitchTargets({
        entries: ENTRIES.filter((candidate) => !candidate.provider.startsWith("codex-")),
        currentProvider: "codex",
      }),
    ).toEqual([]);
  });

  it("falls back to the provider id when an entry has no label", () => {
    const entries = [
      entry({ provider: "claude" }),
      entry({ provider: "claude-unlabeled", derivedFromProviderId: "claude" }),
    ];
    expect(selectAgentProviderSwitchTargets({ entries, currentProvider: "claude" })).toEqual([
      { provider: "claude-unlabeled", label: "claude-unlabeled" },
    ]);
  });
});
