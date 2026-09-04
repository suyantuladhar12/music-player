import { useEffect, useState } from "react";
import { mpd, type FindSong } from "../../services/mpd/mpd";
import type { SortDirection } from "../layout/ListFilterBar";
function formatTime(seconds: number | null): string {
  if (seconds === null) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
interface AlbumTabProps {
  selectedAlbum: string | null;
  selectedSongFile: string | null;
  onSelectAlbum: (album: string | null) => void;
  onSelectSong: (file: string | null) => void;
  searchQuery?: string;
  sortDirection?: SortDirection;
}
export function AlbumTab({
  selectedAlbum,
  selectedSongFile,
  onSelectAlbum,
  onSelectSong,
  searchQuery = "",
  sortDirection = "asc",
}: AlbumTabProps) {
  const [albums, setAlbums] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drilledAlbum, setDrilledAlbum] = useState<string | null>(null);
  const [songs, setSongs] = useState<FindSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    mpd
      .listAlbums()
      .then((result) => {
        if (!cancelled) {
          setAlbums(result);
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
  }, []);
  const openDrilldown = (album: string) => {
    setDrilledAlbum(album);
    setSongsLoading(true);
    mpd
      .findByAlbum(album)
      .then(setSongs)
      .finally(() => setSongsLoading(false));
  };
  const handleSelectAlbum = (album: string) => {
    onSelectSong(null);
    onSelectAlbum(album === selectedAlbum ? null : album);
  };
  const handleSelectSong = (file: string) => {
    onSelectAlbum(null);
    onSelectSong(file === selectedSongFile ? null : file);
  };
  const query = searchQuery.trim().toLowerCase();
  const sortMultiplier = sortDirection === "asc" ? 1 : -1;
  const visibleAlbums = albums
    .filter((album) => !query || album.toLowerCase().includes(query))
    .sort(
      (a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }) * sortMultiplier,
    );
  const visibleSongs = songs
    .filter(
      (song) => !query || (song.title ?? "").toLowerCase().includes(query),
    )
    .sort(
      (a, b) =>
        (a.title ?? "").localeCompare(b.title ?? "", undefined, {
          sensitivity: "base",
        }) * sortMultiplier,
    );
  if (drilledAlbum) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.list}>
          <button
            style={styles.backButton}
            onClick={() => setDrilledAlbum(null)}
            title="Go back"
          >
            ← Back
          </button>
          {songsLoading && <div style={styles.status}> Loading… </div>}
          {!songsLoading && visibleSongs.length === 0 && (
            <div style={styles.status}>
              {query ? "No matching songs" : "No songs found"}
            </div>
          )}
          {!songsLoading &&
            visibleSongs.map((song) => {
              const isSelected = song.file === selectedSongFile;
              return (
                <div
                  key={song.file}
                  onClick={() => handleSelectSong(song.file)}
                  style={{
                    ...styles.songRow,
                    ...(isSelected ? styles.rowSelected : {}),
                  }}
                >
                  <div style={styles.songInfo}>
                    <div style={styles.songTitle}>
                      {song.title ?? "Unknown title"}
                    </div>
                    <div style={styles.songSub}> {song.artist ?? ""} </div>
                  </div>
                  <span style={styles.songDuration}>
                    {formatTime(song.duration)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    );
  }
  return (
    <div style={styles.list}>
      {isLoading && <div style={styles.status}> Loading… </div>}
      {!isLoading && error && <div style={styles.statusError}> {error} </div>}
      {!isLoading && !error && visibleAlbums.length === 0 && (
        <div style={styles.status}>
          {query ? "No matching albums" : "No albums found"}
        </div>
      )}
      {!isLoading &&
        !error &&
        visibleAlbums.map((album) => {
          const isSelected = album === selectedAlbum;
          return (
            <div
              key={album}
              style={{
                ...styles.row,
                ...(isSelected ? styles.rowSelected : {}),
              }}
            >
              <span
                style={styles.rowName}
                onClick={() => handleSelectAlbum(album)}
              >
                {album}
              </span>
              <button
                style={styles.drillButton}
                onClick={(e) => {
                  e.stopPropagation();
                  openDrilldown(album);
                }}
                title="View songs"
              >
                ▶
              </button>
            </div>
          );
        })}
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
    height: "100%",
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
    justifyContent: "space-between",
    padding: "8px 10px",
    borderRadius: "10px",
    userSelect: "none",
  },
  rowSelected: { background: "var(--color-primary)" },
  rowName: {
    flex: 1,
    fontSize: "13px",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
  },
  drillButton: {
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    fontSize: "11px",
    cursor: "pointer",
    padding: "4px 6px",
  },
  songRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "10px",
    cursor: "pointer",
    userSelect: "none",
  },
  songInfo: { flex: 1, minWidth: 0 },
  songTitle: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  songSub: { fontSize: "11px", color: "var(--color-text-muted)" },
  songDuration: { fontSize: "11px", color: "var(--color-text-muted)" },
};
