import { useEffect, useState } from "react";
import { mpd, type DirEntry } from "../../services/mpd/mpd";
import type { SortDirection } from "../layout/ListFilterBar";
interface DirectoryTabProps {
  selectedPath: string | null;
  onSelect: (path: string | null) => void;
  searchQuery?: string;
  sortDirection?: SortDirection;
}
export function DirectoryTab({
  selectedPath,
  onSelect,
  searchQuery = "",
  sortDirection = "asc",
}: DirectoryTabProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    onSelect(null);
    mpd
      .listDirectory(currentPath || undefined)
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentPath]);
  const goBack = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join("/"));
  };
  const query = searchQuery.trim().toLowerCase();
  const filteredEntries = query
    ? entries.filter((entry) => entry.name.toLowerCase().includes(query))
    : entries;
  const visibleEntries = [...filteredEntries].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }
    const cmp = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
    return sortDirection === "asc" ? cmp : -cmp;
  });
  return (
    <div style={styles.wrapper}>
      <div style={styles.list}>
        {currentPath && (
          <button style={styles.backButton} onClick={goBack} title="Go back">
            ← Back
          </button>
        )}
        {isLoading && <div style={styles.status}> Loading… </div>}
        {!isLoading && error && <div style={styles.statusError}> {error} </div>}
        {!isLoading && !error && visibleEntries.length === 0 && (
          <div style={styles.status}>
            {query ? "No matching files" : "Empty folder"}
          </div>
        )}
        {!isLoading &&
          !error &&
          visibleEntries.map((entry) => {
            const isSelected = entry.path === selectedPath;
            return (
              <div
                key={entry.path}
                onClick={() => {
                  if (entry.kind === "directory") {
                    setCurrentPath(entry.path);
                  } else {
                    onSelect(isSelected ? null : entry.path);
                  }
                }}
                style={{
                  ...styles.row,
                  ...(isSelected ? styles.rowSelected : {}),
                }}
              >
                <span style={styles.rowIcon}>
                  {entry.kind === "directory" ? "📁" : "🎵"}
                </span>
                <span style={styles.rowName}> {entry.name} </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    height: "100%",
  },
  list: {
    flex: 1,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    overflowY: "auto",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "12px",
    padding: "8px",
  },
  backButton: {
    position: "absolute",
    top: "8px",
    right: "8px",
    zIndex: 2,
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "8px",
    padding: "3px 7px",
    fontSize: "10px",
    color: "var(--color-text)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  status: {
    fontSize: "12px",
    color: "var(--color-text-muted)",
    padding: "8px",
    textAlign: "center",
  },
  statusError: {
    fontSize: "12px",
    color: "var(--color-danger)",
    padding: "8px",
    textAlign: "center",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "10px",
    cursor: "pointer",
    userSelect: "none",
  },
  rowSelected: { background: "var(--color-primary)" },
  rowIcon: { fontSize: "13px" },
  rowName: {
    fontSize: "13px",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};
