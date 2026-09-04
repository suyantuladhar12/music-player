import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAutoResizeWindow } from "../../hooks/useAutoResizeWindow";
import { Queue } from "../queue/Queue";
import { Library } from "../library/Library";
import { PanelTransition } from "../../components/layout/PanelTransition";
import { usePlayerStore } from "../../stores/playerStore";
import { DockHandle } from "../../components/dock/DockHandle";
import { DockedExpanded } from "../../components/dock/DockedExpanded";
import {
  moveWindowToDockedCorner,
  setDockedAlwaysOnTop,
} from "../../hooks/useDockedPosition";
import MarqueeText from "../../components/layout/MarqueeText";
import { Icon } from "@nsmr/pixelart-react";
import { VolumeControl } from "../../components/layout/VolumeControl";

const ICON = {
  play: "Play",
  pause: "Pause",
  skipBack: "Prev",
  skipForward: "Next",
  shuffle: "Shuffle",
  minimize: "Minus",
  expand: "Expand",
  close: "Close",
} as const;

function formatTime(seconds: number | null): string {
  if (seconds === null || isNaN(seconds)) return "0:00";

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AlbumArt({
  url,
  style,
  imageStyle,
  placeholderStyle,
  placeholderText,
  onClick,
}: {
  url: string | null;
  style: React.CSSProperties;
  imageStyle: React.CSSProperties;
  placeholderStyle: React.CSSProperties;
  placeholderText: string;
  onClick?: () => void;
}) {
  return (
    <div
      style={{
        ...style,
        ...(onClick ? { cursor: "pointer" } : {}),
      }}
      onClick={onClick}
    >
      {url ? (
        <img src={url} alt="Album art" style={imageStyle} draggable={false} />
      ) : (
        <span style={placeholderStyle}>{placeholderText}</span>
      )}
    </div>
  );
}

const DOCK_HANDLE_SIZE = {
  width: 44,
  height: 44,
};

const DOCK_EXPANDED_SIZE = {
  width: 244,
  height: 310,
};

export function Home() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLyricsOpen, setLyricsOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [isDockExpanded, setIsDockExpanded] = useState(false);

  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const resizeRef = useAutoResizeWindow<HTMLDivElement>();

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);
  const previousFileRef = useRef<string | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const {
    init,
    status,
    currentSong,
    queue,
    albumArtUrl,
    lyricsText,
    togglePlay,
    next,
    prev,
    toggleRandom,
    seek,
    setVolume,
  } = usePlayerStore(
    useShallow((s) => ({
      init: s.init,
      status: s.status,
      currentSong: s.currentSong,
      queue: s.queue,
      albumArtUrl: s.albumArtUrl,
      lyricsText: s.lyricsText,
      togglePlay: s.togglePlay,
      next: s.next,
      prev: s.prev,
      toggleRandom: s.toggleRandom,
      seek: s.seek,
      setVolume: s.setVolume,
    })),
  );

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isDocked) {
      setDockedAlwaysOnTop(false);
      return;
    }

    setDockedAlwaysOnTop(true);

    if (isDockExpanded) {
      moveWindowToDockedCorner(
        DOCK_EXPANDED_SIZE.width,
        DOCK_EXPANDED_SIZE.height,
      );
    } else {
      moveWindowToDockedCorner(DOCK_HANDLE_SIZE.width, DOCK_HANDLE_SIZE.height);
    }
  }, [isDocked, isDockExpanded]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest(
        "button, .progress-bar-interactive, input",
      )
    ) {
      return;
    }

    getCurrentWindow().startDragging();
  };

  const isPlaying = status?.state === "play";
  const isShuffled = status?.random ?? false;

  const title = currentSong?.title ?? "No song playing";
  const artist = currentSong?.artist ?? "";
  const album = currentSong?.album ?? "";

  const currentTime = status?.elapsed ?? 0;
  const duration = status?.duration ?? 0;

  const actualProgress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  const displayProgress = isDraggingProgress ? dragProgress : actualProgress;

  const displayTime = isDraggingProgress
    ? dragProgress * duration
    : currentTime;

  const progressFromClientX = (clientX: number) => {
    const el = progressBarRef.current;

    if (!el) return 0;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;

    return Math.max(0, Math.min(1, x / rect.width));
  };

  useEffect(() => {
    if (!isDraggingProgress) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragProgress(progressFromClientX(e.clientX));
    };

    const handleMouseUp = (e: MouseEvent) => {
      const finalProgress = progressFromClientX(e.clientX);

      setIsDraggingProgress(false);

      if (duration > 0) {
        seek(finalProgress * duration);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingProgress, duration]);

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

  useEffect(() => {
    if (!isLyricsOpen) return;
    if (activeLyricIndex < 0) return;
    if (!activeLyricRef.current) return;

    activeLyricRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeLyricIndex, isLyricsOpen]);

  useEffect(() => {
    const currentFile = currentSong?.file ?? null;

    if (currentFile !== previousFileRef.current) {
      previousFileRef.current = currentFile;

      if (lyricsContainerRef.current) {
        lyricsContainerRef.current.scrollTo({
          top: 0,
          behavior: "auto",
        });
      }
    }
  }, [currentSong?.file]);

  const queueTracks = useMemo(
    () =>
      queue.map((track, i) => ({
        id: String(track.id ?? `idx-${i}`),
        mpdId: track.id,
        title: track.title ?? "Unknown title",
        artist: track.artist ?? "Unknown artist",
        duration: formatTime(track.duration),
        isCurrent: track.id === currentSong?.id,
      })),
    [queue, currentSong?.id],
  );
  // Docked Window
  if (isDocked) {
    if (!isDockExpanded) {
      return <DockHandle onClick={() => setIsDockExpanded(true)} />;
    }

    return (
      <DockedExpanded
        title={title}
        artist={artist}
        albumArtUrl={albumArtUrl}
        isPlaying={isPlaying}
        isShuffled={isShuffled}
        lyricsText={lyricsText}
        currentTime={status?.elapsed ?? 0}
        volume={status?.volume ?? 0}
        onVolumeChange={setVolume}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrev={prev}
        onToggleRandom={toggleRandom}
        onMinimize={() => setIsDockExpanded(false)}
        onExpandToFull={() => {
          setIsDockExpanded(false);
          setIsDocked(false);
        }}
      />
    );
  }
  // Library Window
  if (isLibraryOpen) {
    return (
      <PanelTransition panelKey="library">
        <Library
          ref={resizeRef}
          onClose={() => setIsLibraryOpen(false)}
          onMouseDown={handleDragStart}
        />
      </PanelTransition>
    );
  }

  // Queue Windo
  if (isQueueOpen) {
    return (
      <PanelTransition panelKey="queue">
        <Queue
          ref={resizeRef}
          tracks={queueTracks}
          onClose={() => setIsQueueOpen(false)}
          onOpenPlaylists={() => setIsLibraryOpen(true)}
          onMouseDown={handleDragStart}
        />
      </PanelTransition>
    );
  }

  // Mini collapsed player
  if (isCollapsed) {
    return (
      <PanelTransition panelKey="mini">
        <div
          ref={resizeRef}
          style={styles.miniWrapper}
          onMouseDown={handleDragStart}
        >
          <AlbumArt
            url={albumArtUrl}
            style={styles.miniArt}
            imageStyle={{
              ...styles.miniArtImage,
              animation: "spin-disk 3s linear infinite",
              animationPlayState: isPlaying ? "running" : "paused",
            }}
            placeholderStyle={styles.miniArtPlaceholder}
            placeholderText="♪"
          />

          <div style={styles.miniInfo}>
            <MarqueeText text={title} style={styles.miniTitle} />

            <MarqueeText text={artist} style={styles.miniArtist} />
          </div>

          <div style={styles.miniControls}>
            <button
              style={styles.iconButtonSmall}
              onClick={prev}
              title="Previous"
            >
              <Icon name={ICON.skipBack} size={22} />
            </button>

            <button
              style={styles.playButtonSmall}
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              <Icon name={isPlaying ? ICON.pause : ICON.play} size={17} />
            </button>

            <button style={styles.iconButtonSmall} onClick={next} title="Next">
              <Icon name={ICON.skipForward} size={22} />
            </button>
          </div>

          <button
            style={styles.expandButton}
            onClick={() => setIsCollapsed(false)}
            title="Expand"
          >
            <Icon name={ICON.expand} size={18} />
          </button>
        </div>
      </PanelTransition>
    );
  }

  // Full view of Now Playing Window
  return (
    <PanelTransition panelKey="full">
      <div ref={resizeRef} style={styles.wrapper} onMouseDown={handleDragStart}>
        <div style={styles.topRow}>
          <button
            style={styles.powerButton}
            onClick={() => getCurrentWindow().close()}
            title="Quit"
          >
            <Icon name={ICON.close} size={14} />
          </button>
          <div style={styles.titlePill}>
            <MarqueeText text={`${title} - ${artist}`} />
          </div>

          <div style={styles.topButtonGroup}>
            <button
              style={styles.topIconButton}
              onClick={() => setIsCollapsed(true)}
              title="Minimize"
            >
              <Icon name={ICON.minimize} size={14} />
            </button>

            <button
              style={styles.topIconButton}
              onClick={() => setIsDocked(true)}
              title="Dock to corner"
            >
              <Icon name={ICON.expand} size={14} />
            </button>
          </div>
        </div>

        {isLyricsOpen ? (
          <div
            ref={lyricsContainerRef}
            style={styles.lyricsBox}
            onClick={() => setLyricsOpen(false)}
          >
            {lyricsText.length > 0 ? (
              <div style={styles.lyricsList}>
                {lyricsText.map((line, index) => {
                  const isActive = index === activeLyricIndex;

                  return (
                    <div
                      key={`${line.time}-${index}`}
                      ref={isActive ? activeLyricRef : null}
                      style={{
                        ...styles.lyricLine,
                        ...(isActive ? styles.lyricLineActive : {}),
                      }}
                    >
                      {line.text || "♪"}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span style={styles.albumArtPlaceholder}>No lyrics found.</span>
            )}
          </div>
        ) : (
          <AlbumArt
            url={albumArtUrl}
            style={styles.albumArt}
            imageStyle={styles.albumArtImage}
            placeholderStyle={styles.albumArtPlaceholder}
            placeholderText="No Album Art"
            onClick={() => setLyricsOpen(true)}
          />
        )}

        <div style={styles.songInfo}>
          <MarqueeText text={title} style={styles.songTitle} />

          <MarqueeText text={artist} style={styles.songSub} />

          {album && <MarqueeText text={album} style={styles.songSub} />}
        </div>

        <div style={styles.footerGroup}>
          <div style={styles.controlBar}>
            <div
              ref={progressBarRef}
              className="progress-bar-interactive"
              style={styles.progressBar}
              onMouseDown={(e) => {
                e.stopPropagation();

                if (!duration) return;

                setDragProgress(progressFromClientX(e.clientX));

                setIsDraggingProgress(true);
              }}
            >
              <div style={styles.progressTrackBg} />

              <div
                style={{
                  ...styles.progressFill,
                  width: `${displayProgress * 100}%`,
                  transition: isDraggingProgress ? "none" : "width 0.1s linear",
                }}
              />

              <div
                style={{
                  ...styles.progressThumb,
                  left: `${displayProgress * 100}%`,
                }}
              />
            </div>

            <div style={styles.progressTimes}>
              <span>{formatTime(displayTime)}</span>

              <span>{formatTime(duration)}</span>
            </div>

            <div style={styles.mainControls}>
              <VolumeControl
                volume={status?.volume ?? 0}
                onChange={setVolume}
              />

              <button style={styles.iconButton} onClick={prev} title="Previous">
                <Icon name={ICON.skipBack} size={25} />
              </button>

              <button
                style={styles.playButton}
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play"}
              >
                <Icon name={isPlaying ? ICON.pause : ICON.play} size={23} />
              </button>

              <button style={styles.iconButton} onClick={next} title="Next">
                <Icon name={ICON.skipForward} size={25} />
              </button>

              <button
                style={{
                  ...styles.shuffleButton,
                  ...(isShuffled ? styles.shuffleButtonActive : {}),
                }}
                onClick={toggleRandom}
                title={isShuffled ? "Shuffle on" : "Shuffle off"}
              >
                <Icon name={ICON.shuffle} size={23} />
              </button>
            </div>
          </div>

          <div style={styles.bottomRow}>
            <button
              style={styles.menuButton}
              onClick={() => setIsQueueOpen(true)}
            >
              Menu
            </button>

            <div style={styles.hearts}>
              <Icon name="Heart" size={16} />
              <Icon name="Heart" size={16} />
              <Icon name="Heart" size={16} />
            </div>
          </div>
        </div>
      </div>
    </PanelTransition>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    width: "320px",
    height: "480px",
    overflow: "hidden",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-ui)",
    boxSizing: "border-box",
  },
  topRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexShrink: 0,
  },

  topButtonGroup: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
  },

  topIconButton: {
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "2px",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },
  albumArt: {
    width: "250px",
    height: "220px",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },

  albumArtImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  lyricsBox: {
    width: "250px",
    height: "220px",
    boxSizing: "border-box",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    padding: "20px 12px",
    overflowY: "auto",
    overflowX: "hidden",
    display: "block",
    scrollBehavior: "smooth",
    flexShrink: 0,
  },

  lyricsList: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "12px",
    padding: "70px 0",
    boxSizing: "border-box",
  },

  lyricLine: {
    flexShrink: 0,
    textAlign: "center",
    fontSize: "12px",
    lineHeight: "1.5",
    color: "var(--color-text-muted)",
    opacity: 0.6,
    transition: "color 0.2s ease, opacity 0.2s ease, transform 0.2s ease",
    padding: "3px 8px",
  },

  lyricLineActive: {
    color: "var(--color-primary)",
    opacity: 1,
    fontWeight: "bold",
    transform: "scale(1.05)",
  },
  titlePill: {
    flex: "0 1 auto",
    width: "150px",
    minWidth: 0,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "20px",
    padding: "3px 10px",
    fontSize: "11px",
    color: "var(--color-text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },

  albumArtPlaceholder: {
    color: "var(--color-text-disabled)",
    fontSize: "12px",
  },

  songInfo: {
    textAlign: "center",
    width: "100%",
    maxWidth: "250px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    flexShrink: 0,
    overflow: "hidden",
  },
  songTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    maxWidth: "100%",
  },
  songSub: {
    fontSize: "13px",
    color: "var(--color-text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    maxWidth: "100%",
  },

  controlBar: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "2px",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    padding: "8px 12px 10px",
    flexShrink: 0,
  },

  /*
   * Actual playback buttons.
   */
  mainControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    width: "100%",
    marginTop: "2px",
  },

  iconButton: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },

  shuffleButton: {
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderRadius: "50%",
    background: "transparent",
    border: "var(--pixel-border) solid transparent",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
    transition:
      "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  },

  shuffleButtonActive: {
    background: "var(--color-primary)",
    border: "var(--pixel-border) solid var(--color-border)",
    color: "var(--color-background)",
  },

  playButton: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderRadius: "50%",
    background: "var(--color-background)",
    border: "var(--pixel-border) solid var(--color-border)",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },

  /*
   * Progress bar container.
   */
  progressBar: {
    position: "relative",
    width: "100%",
    height: "16px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none",
    boxSizing: "border-box",
  },

  /*
   * Dark/background portion of progress.
   */
  progressTrackBg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: "10px",
    borderRadius: "999px",
    background: "var(--color-background)",
    border: "var(--pixel-border) solid var(--color-border)",
    transform: "translateY(-50%)",
    boxSizing: "border-box",
    pointerEvents: "none",
  },

  /*
   * Played portion.
   */
  progressFill: {
    position: "absolute",
    left: 0,
    top: "50%",
    height: "10px",
    borderRadius: "999px",
    background: "var(--color-primary)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },

  /*
   * Current-position thumb.
   */
  progressThumb: {
    position: "absolute",
    top: "50%",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "var(--color-primary)",
    border: "var(--pixel-border) solid var(--color-border)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    zIndex: 1,
  },

  /*
   * Time labels below the progress bar.
   */
  progressTimes: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    fontSize: "9px",
    lineHeight: "1",
    color: "var(--color-text-muted)",
    boxSizing: "border-box",
    padding: "0 1px",
  },

  bottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    flexShrink: 0,
  },
  footerGroup: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "auto",
    flexShrink: 0,
  },

  menuButton: {
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    color: "var(--color-text-muted)",
    fontSize: "13px",
    cursor: "pointer",
    padding: "5px 9px",
    fontFamily: "var(--font-ui)",
    lineHeight: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  hearts: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    color: "#ff1a1a",
  },

  /*
   * MINI PLAYER
   */
  miniWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "5px 10px 5px 5px",
    width: "fit-content",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    fontFamily: "var(--font-ui)",
  },

  miniArt: {
    width: "60px",
    height: "60px",
    minWidth: "32px",
    borderRadius: "50%",
    overflow: "hidden",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  miniArtImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  miniArtPlaceholder: {
    fontSize: "25px",
    color: "var(--color-text-disabled)",
  },

  miniInfo: {
    flex: 1,
    minWidth: 0,
  },

  miniTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "var(--color-text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "140px",
  },

  miniArtist: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
  },

  miniControls: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },

  iconButtonSmall: {
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },

  playButtonSmall: {
    width: "29px",
    height: "29px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderRadius: "50%",
    background: "var(--color-background)",
    border: "var(--pixel-border) solid var(--color-border)",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },

  expandButton: {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },
  powerButton: {
    position: "absolute",
    left: 0,
    top: "50%",
    transform: "translateY(-50%)",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "2px",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    flexShrink: 0,
  },
};
