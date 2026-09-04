import { useEffect, useState } from "react";
import { mpd, type PlaylistInfo } from "../../services/mpd/mpd";
import type { SortDirection } from "../layout/ListFilterBar";

interface PlaylistTabProps {
  selectedPlaylist: string | null;
  onSelect: (name: string | null) => void;
  searchQuery?: string;
  sortDirection?: SortDirection;
}

export function PlaylistTab({
  selectedPlaylist,
  onSelect,
  searchQuery = "",
  sortDirection = "asc",
}: PlaylistTabProps) {
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    mpd
      .listPlaylists()
      .then((result) => {
        if (!cancelled) setPlaylists(result);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const sortMultiplier = sortDirection === "asc" ? 1 : -1;

  const visiblePlaylists = playlists
    .filter((pl) => !query || pl.name.toLowerCase().includes(query))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) *
        sortMultiplier,
    );

  return (
    <div style={styles.list}>
      {isLoading && <div style={styles.status}>Loading…</div>}
      {!isLoading && error && <div style={styles.statusError}>{error}</div>}
      {!isLoading && !error && visiblePlaylists.length === 0 && (
        <div style={styles.status}>
          {query ? "No matching playlists" : "No saved playlists"}
        </div>
      )}
      {!isLoading &&
        !error &&
        visiblePlaylists.map((pl) => {
          const isSelected = pl.name === selectedPlaylist;
          return (
            <div
              key={pl.name}
              onClick={() => onSelect(isSelected ? null : pl.name)}
              style={{
                ...styles.row,
                ...(isSelected ? styles.rowSelected : {}),
              }}
            >
              {pl.name}
            </div>
          );
        })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    overflowY: "auto",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "12px",
    padding: "8px",
    height: "100%",
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
    padding: "8px 10px",
    borderRadius: "10px",
    cursor: "pointer",
    userSelect: "none",
    fontSize: "13px",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowSelected: {
    background: "var(--color-primary)",
  },
};
