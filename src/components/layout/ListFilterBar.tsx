import { SearchBar } from "./SearchBar";
import { Icon } from "@nsmr/pixelart-react";

export type SortDirection = "asc" | "desc";

const ICON = {
  reload: "Reload",
};

interface ListFilterBarProps {
  sortDirection: SortDirection;
  onToggleSort: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onRefresh?: () => void;
}

export function ListFilterBar({
  sortDirection,
  onToggleSort,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  onRefresh,
}: ListFilterBarProps) {
  return (
    <div style={styles.wrapper}>
      <button style={styles.sortButton} onClick={onToggleSort}>
        <span>Name</span>
        <span style={styles.sortArrow}>
          {sortDirection === "asc" ? "▲" : "▼"}
        </span>
      </button>

      <div style={styles.rightGroup}>
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />

        <button
          style={styles.refreshButton}
          onClick={onRefresh}
          title="Refresh library"
        >
          <Icon name={ICON.reload} size={14} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  sortButton: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "var(--color-text)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
  },
  sortArrow: {
    fontSize: "9px",
    color: "var(--color-text-muted)",
  },
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  refreshButton: {
    width: "28px",
    height: "28px",
    minWidth: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },
};
