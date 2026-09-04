import { forwardRef, useMemo, useState } from "react";
import { Icon } from "@nsmr/pixelart-react";
import { VolumeControl } from "../layout/VolumeControl";

const ICON = {
  play: "Play",
  pause: "Pause",
  skipBack: "Prev",
  skipForward: "Next",
  shuffle: "Shuffle",
  minimize: "Minus",
  expand: "Expand",
  notes: "Notes",
} as const;

interface LyricLine {
  time: number;
  text: string;
}

interface DockedExpandedProps {
  title: string;
  artist: string;
  albumArtUrl: string | null;
  isPlaying: boolean;
  isShuffled: boolean;
  lyricsText?: LyricLine[];
  currentTime?: number;
  volume: number;
  onTogglePlay: () => void;
  onToggleRandom: () => void;
  onNext: () => void;
  onPrev: () => void;
  onMinimize: () => void;
  onExpandToFull: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onVolumeChange: (volume: number) => void;
}

export const DockedExpanded = forwardRef<HTMLDivElement, DockedExpandedProps>(
  (
    {
      title,
      artist,
      albumArtUrl,
      isPlaying,
      isShuffled,
      lyricsText = [],
      currentTime = 0,
      volume,
      onTogglePlay,
      onNext,
      onPrev,
      onMinimize,
      onExpandToFull,
      onMouseDown,
      onToggleRandom,
      onVolumeChange,
    },
    ref,
  ) => {
    const [isLyricsOpen, setIsLyricsOpen] = useState(false);

    const activeLyricIndex = useMemo(() => {
      if (!lyricsText.length) return -1;

      let activeIndex = -1;

      for (let i = 0; i < lyricsText.length; i++) {
        if (lyricsText[i].time <= currentTime) {
          activeIndex = i;
        } else {
          break;
        }
      }

      return activeIndex;
    }, [lyricsText, currentTime]);

    return (
      <div ref={ref} style={styles.wrapper} onMouseDown={onMouseDown}>
        <div style={styles.topRow}>
          <button
            style={styles.smallButton}
            onClick={onExpandToFull}
            title="Open full player"
          >
            <Icon name={ICON.expand} size={15} />
          </button>

          <button
            style={styles.smallButton}
            onClick={onMinimize}
            title="Minimize"
          >
            <Icon name={ICON.minimize} size={15} />
          </button>
        </div>

        {isLyricsOpen ? (
          <div
            style={styles.lyricsBox}
            onClick={() => setIsLyricsOpen(false)}
            title="Show album art"
          >
            {lyricsText.length > 0 ? (
              <div style={styles.lyricsList}>
                {lyricsText.map((line, index) => (
                  <div
                    key={`${line.time}-${index}`}
                    style={{
                      ...styles.lyricLine,
                      ...(index === activeLyricIndex
                        ? styles.lyricLineActive
                        : {}),
                    }}
                  >
                    {line.text || "♪"}
                  </div>
                ))}
              </div>
            ) : (
              <span style={styles.artPlaceholder}>No lyrics found.</span>
            )}
          </div>
        ) : (
          <div
            style={styles.art}
            onClick={() => setIsLyricsOpen(true)}
            title="Show lyrics"
          >
            {albumArtUrl ? (
              <img src={albumArtUrl} alt="Album art" style={styles.artImage} />
            ) : (
              <span style={styles.artPlaceholder}>♪</span>
            )}
          </div>
        )}

        <div style={styles.info}>
          <div style={styles.title}>{title}</div>
          <div style={styles.artist}>{artist}</div>
        </div>

        <div style={styles.controls}>
          <VolumeControl
            volume={volume}
            onChange={onVolumeChange}
            popupBottomOffset={45}
          />

          <button style={styles.iconButton} onClick={onPrev} title="Previous">
            <Icon name={ICON.skipBack} size={18} />
          </button>

          <button
            style={styles.playButton}
            onClick={onTogglePlay}
            title={isPlaying ? "Pause" : "Play"}
          >
            <Icon name={isPlaying ? ICON.pause : ICON.play} size={16} />
          </button>

          <button style={styles.iconButton} onClick={onNext} title="Next">
            <Icon name={ICON.skipForward} size={18} />
          </button>

          <button
            style={{
              ...styles.shuffleButton,
              ...(isShuffled ? styles.shuffleButtonActive : {}),
            }}
            onClick={onToggleRandom}
            title={isShuffled ? "Shuffle on" : "Shuffle off"}
          >
            <Icon name={ICON.shuffle} size={16} />
          </button>
        </div>
      </div>
    );
  },
);

DockedExpanded.displayName = "DockedExpanded";

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    width: "220px",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-ui)",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)",
    boxSizing: "border-box",
  },

  topRow: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "4px",
    width: "100%",
    marginBottom: "-6px",
    marginTop: "-6px",
  },

  smallButton: {
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    padding: 0,
  },

  art: {
    width: "196px",
    height: "180px",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  artImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  artPlaceholder: {
    fontSize: "10px",
    color: "var(--color-text-disabled)",
  },

  lyricsBox: {
    width: "196px",
    height: "180px",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    padding: "10px 8px",
    overflowY: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  lyricsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },

  lyricLine: {
    fontSize: "11px",
    lineHeight: "1.5",
    color: "var(--color-text-muted)",
    opacity: 0.6,
    transition: "color 0.2s ease, opacity 0.2s ease",
  },

  lyricLineActive: {
    color: "var(--color-primary)",
    opacity: 1,
    fontWeight: "bold",
  },

  info: {
    textAlign: "center",
    width: "100%",
  },

  title: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  artist: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },

  iconButton: {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    padding: 0,
  },

  playButton: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "var(--color-background)",
    border: "var(--pixel-border) solid var(--color-border)",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    padding: 0,
  },

  shuffleButton: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "transparent",
    border: "var(--pixel-border) solid transparent",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    transition:
      "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  },

  shuffleButtonActive: {
    background: "var(--color-primary)",
    border: "var(--pixel-border) solid var(--color-border)",
    color: "var(--color-background)",
  },
};
