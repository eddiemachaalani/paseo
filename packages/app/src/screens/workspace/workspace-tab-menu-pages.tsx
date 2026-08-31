import { useMemo } from "react";
import { MenuItem, type MenuPageDefinition } from "@/components/ui/menu";
import type { WorkspaceTabMenuEntry } from "@/screens/workspace/workspace-tab-menu";

/**
 * The pages behind a tab menu's submenu entries, in the shape a menu surface
 * takes as `pages`. The desktop context menu and the mobile sheet render the
 * same rows, so the page content is built here once.
 */
export function buildWorkspaceTabMenuPages(
  menuEntries: readonly WorkspaceTabMenuEntry[],
): MenuPageDefinition[] {
  const pages: MenuPageDefinition[] = [];
  for (const entry of menuEntries) {
    if (entry.kind !== "submenu") {
      continue;
    }
    pages.push({
      id: entry.page.id,
      title: entry.page.title,
      content: entry.page.options.map((option) => (
        <MenuItem
          key={option.key}
          testID={option.testID}
          description={option.description}
          onSelect={option.onSelect}
        >
          {option.label}
        </MenuItem>
      )),
    });
  }
  return pages;
}

export function useWorkspaceTabMenuPages(
  menuEntries: readonly WorkspaceTabMenuEntry[],
): MenuPageDefinition[] {
  return useMemo(() => buildWorkspaceTabMenuPages(menuEntries), [menuEntries]);
}
