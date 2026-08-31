import type { ProviderSnapshotEntry } from "@getpaseo/protocol/agent-types";

export interface AgentProviderSwitchTarget {
  provider: string;
  label: string;
  description?: string;
}

/**
 * Follows `derivedFromProviderId` to the provider that runs an entry. Entries
 * sharing a root run the same agent, so an agent's session can be resumed by
 * any of them.
 */
export function resolveProviderRuntimeRoot(
  entries: readonly ProviderSnapshotEntry[],
  provider: string,
): string {
  const byId = new Map(entries.map((entry) => [entry.provider, entry]));
  const visited = new Set<string>();
  let current = provider;
  while (!visited.has(current)) {
    visited.add(current);
    const base = byId.get(current)?.derivedFromProviderId;
    if (!base) {
      return current;
    }
    current = base;
  }
  return current;
}

/**
 * The providers a live agent can move to: every other enabled entry with the
 * same runtime root that is not known to be unavailable. A `loading` entry is
 * offered — the daemon rejects the switch if it turns out unavailable.
 */
export function selectAgentProviderSwitchTargets(input: {
  entries: readonly ProviderSnapshotEntry[];
  currentProvider: string;
}): AgentProviderSwitchTarget[] {
  const { entries, currentProvider } = input;
  const root = resolveProviderRuntimeRoot(entries, currentProvider);
  return entries
    .filter(
      (entry) =>
        entry.provider !== currentProvider &&
        entry.enabled !== false &&
        (entry.status === "ready" || entry.status === "loading") &&
        resolveProviderRuntimeRoot(entries, entry.provider) === root,
    )
    .map((entry) => {
      const target: AgentProviderSwitchTarget = {
        provider: entry.provider,
        label: entry.label ?? entry.provider,
      };
      if (entry.description) {
        target.description = entry.description;
      }
      return target;
    });
}
