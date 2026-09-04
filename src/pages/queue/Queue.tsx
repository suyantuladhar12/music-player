import { forwardRef, useState } from "react";
import { usePlayerStore } from "../../stores/playerStore";
import { useNotificationStore } from "../../stores/notificationStore";

interface Track {
  id: string;
  mpdId: number | null;
  title: string;
  artist: string;
  duration: string;
  isCurrent?: boolean;
  isFavorite?: boolean;
}

interface QueueProps {
  tracks: Track[];
  onClose: () => void;
  onOpenPlaylists: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const Queue = forwardRef<HTMLDivElement, QueueProps>(
  ({ tracks, onClose, onOpenPlaylists, onMouseDown }, ref) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const playTrack = usePlayerStore((s) => s.playTrack);
    const clearQueue = usePlayerStore((s) => s.clearQueue);
    const removeTrack = usePlayerStore((s) => s.removeTrack);
    const notify = useNotificationStore((s) => s.notify);

    const handlePlay = (track: Track) => {
      if (track.mpdId === null) return;
      playTrack(track.mpdId);
    };

    const selectedTrack = tracks.find((t) => t.id === selectedId) ?? null;

    const handleRemoveSelected = async () => {
      if (!selectedTrack || selectedTrack.mpdId === null) return;

      await removeTrack(selectedTrack.mpdId);
      setSelectedId(null);
    };

    return (
      <div ref={ref} style={styles.wrapper} onMouseDown={onMouseDown}>
        <div style={styles.header}>
          <span style={styles.headerDecor}>❋ ✦</span>
          <span style={styles.headerTitle}>Queue</span>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={styles.list} onMouseDown={(e) => e.stopPropagation()}>
          {tracks.map((track, i) => {
            const isSelected = track.id === selectedId;
            return (
              <div
                key={track.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSelectedId(track.id)}
                onDoubleClick={() => handlePlay(track)}
                style={{
                  ...styles.row,
                  ...(track.isCurrent ? styles.rowActive : {}),
                  ...(isSelected && !track.isCurrent ? styles.rowSelected : {}),
                }}
              >
                <span style={styles.rowNumber}>{i + 1}.</span>
                <div style={styles.rowInfo}>
                  <div
                    style={{
                      ...styles.rowTitle,
                      ...(track.isCurrent ? styles.rowTitleActive : {}),
                    }}
                  >
                    {track.title}
                  </div>
                  <div style={styles.rowArtist}>{track.artist}</div>
                </div>
                <span style={styles.rowDuration}>{track.duration}</span>
                <span
                  style={{
                    ...styles.rowHeart,
                    ...(track.isFavorite ? styles.rowHeartActive : {}),
                  }}
                >
                  ♥
                </span>
              </div>
            );
          })}
        </div>
        <div style={styles.actions}>
          <button
            style={styles.actionButton}
            onClick={async () => {
              await clearQueue();
              notify("Queue cleared");
            }}
          >
            Clear
          </button>
          <button style={styles.actionButton} onClick={onOpenPlaylists}>
            Load
          </button>
          <button
            style={{
              ...styles.actionButton,
              ...(selectedTrack ? {} : styles.actionButtonDisabled),
            }}
            disabled={!selectedTrack}
            onClick={async () => {
              await handleRemoveSelected();
              notify("Track removed");
            }}
          >
            Remove
          </button>
        </div>
      </div>
    );
  },
);

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "12px",
    height: "520px",
    width: "400px",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-ui)",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 4px",
  },
  headerDecor: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
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
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    overflowY: "auto",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "12px",
    padding: "8px",
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
  rowActive: {
    background: "var(--color-primary)",
  },
  rowSelected: {
    background: "var(--color-surface)",
    boxShadow: "inset 0 0 0 var(--pixel-border) var(--color-border)",
  },
  rowNumber: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
    width: "34px", // widened to fit 4-digit queue positions without crowding
    flexShrink: 0, // never let it get squeezed by the title/artist column
    whiteSpace: "nowrap",
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowTitleActive: {
    color: "var(--color-background)",
  },
  rowArtist: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
  },
  rowDuration: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
  },
  rowHeart: {
    fontSize: "12px",
    color: "var(--color-border)",
  },
  rowHeartActive: {
    color: "var(--color-danger)",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "auto",
    flexShrink: 0,
  },
  actionButton: {
    flex: 1,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "8px",
    fontSize: "12px",
    color: "var(--color-text)",
    cursor: "pointer",
  },
  actionButtonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};
