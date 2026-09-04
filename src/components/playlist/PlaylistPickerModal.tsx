import { useEffect, useState } from "react";
import { mpd, type PlaylistInfo } from "../../services/mpd/mpd";

interface PlaylistPickerModalProps {
  onClose: () => void;
  onPick: (playlistName: string) => void;
}

export function PlaylistPickerModal({
  onClose,
  onPick,
}: PlaylistPickerModalProps) {
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    let cancelled = false;
    mpd
      .listPlaylists()
      .then((result) => {
        if (!cancelled) setPlaylists(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onPick(trimmed);
  };

  return (
    <div style={styles.overlay} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>Add to Playlist</span>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.list}>
          {isLoading && <div style={styles.status}>Loading…</div>}
          {!isLoading && playlists.length === 0 && (
            <div style={styles.status}>No playlists yet</div>
          )}
          {!isLoading &&
            playlists.map((pl) => (
              <div
                key={pl.name}
                style={styles.row}
                onClick={() => onPick(pl.name)}
              >
                {pl.name}
              </div>
            ))}
        </div>

        {isCreating ? (
          <div style={styles.createRow}>
            <input
              autoFocus
              style={styles.input}
              placeholder="New playlist name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setIsCreating(false);
              }}
            />
            <button style={styles.confirmButton} onClick={handleCreate}>
              Create
            </button>
          </div>
        ) : (
          <button
            style={styles.newPlaylistButton}
            onClick={() => setIsCreating(true)}
          >
            ＋ New Playlist
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius)",
  },
  modal: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "14px",
    width: "300px",
    maxHeight: "360px",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-ui)",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "var(--color-text)",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    fontSize: "13px",
    cursor: "pointer",
  },
  list: {
    flex: 1,
    minHeight: "80px",
    maxHeight: "220px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    overflowY: "auto",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "12px",
    padding: "8px",
  },
  status: {
    fontSize: "12px",
    color: "var(--color-text-muted)",
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
  newPlaylistButton: {
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "8px",
    fontSize: "12px",
    color: "var(--color-text)",
    cursor: "pointer",
  },
  createRow: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px",
    color: "var(--color-text)",
    fontFamily: "var(--font-ui)",
    outline: "none",
  },
  confirmButton: {
    background: "var(--color-primary)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "8px 14px",
    fontSize: "12px",
    color: "var(--color-background)",
    cursor: "pointer",
  },
};
