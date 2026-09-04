import { useEffect, useRef, useState } from "react";
import { Icon } from "@nsmr/pixelart-react";

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
  buttonStyle?: React.CSSProperties;
  popupBottomOffset?: number;
}

const POPUP_WIDTH = 160;
const EDGE_PADDING = 6;
const DEFAULT_POPUP_BOTTOM = 90;

export function VolumeControl({
  volume,
  onChange,
  buttonStyle,
  popupBottomOffset = DEFAULT_POPUP_BOTTOM,
}: VolumeControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupLeft, setPopupLeft] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isDragging) setLocalVolume(volume);
  }, [volume, isDragging]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const positionPopup = () => {
      const btnRect = buttonRef.current!.getBoundingClientRect();
      const btnCenter = btnRect.left + btnRect.width / 2;
      const windowWidth = document.documentElement.clientWidth;
      let left = btnCenter - POPUP_WIDTH / 2;
      left = Math.max(EDGE_PADDING, left);
      left = Math.min(windowWidth - POPUP_WIDTH - EDGE_PADDING, left);
      setPopupLeft(left);
    };
    positionPopup();
    window.addEventListener("resize", positionPopup);
    return () => window.removeEventListener("resize", positionPopup);
  }, [isOpen]);

  const speakerIconName = volume === 0 ? "VolumeX" : "Volume2";

  return (
    <div
      ref={wrapperRef}
      style={styles.wrapper}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isOpen && popupLeft !== null && (
        <div
          style={{
            ...styles.popup,
            left: `${popupLeft}px`,
            bottom: `${popupBottomOffset}px`,
          }}
        >
          <div style={styles.sliderTrack}>
            <div style={styles.sliderTrackBg} />
            <div
              style={{
                ...styles.sliderFill,
                width: `${localVolume}%`,
              }}
            />
            <div
              style={{
                ...styles.sliderThumb,
                left: `${localVolume}%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={localVolume}
              onChange={(e) => setLocalVolume(Number(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={(e) => {
                setIsDragging(false);
                onChange(Number((e.target as HTMLInputElement).value));
              }}
              onKeyUp={(e) => {
                if (!isDragging)
                  onChange(Number((e.target as HTMLInputElement).value));
              }}
              style={styles.sliderInput}
            />
          </div>
          <span style={styles.volumeLabel}>{localVolume}</span>
        </div>
      )}
      <button
        ref={buttonRef}
        style={{ ...styles.iconButton, ...buttonStyle }}
        onClick={() => setIsOpen((v) => !v)}
        title="Volume"
      >
        <Icon name={speakerIconName} size={20} />
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  iconButton: {
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
  },
  popup: {
    position: "fixed",
    minWidth: "160px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.2)",
    whiteSpace: "nowrap",
    zIndex: 10,
  },
  sliderTrack: {
    position: "relative",
    width: "100px",
    height: "14px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  sliderTrackBg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: "6px",
    borderRadius: "999px",
    background: "var(--color-surface-raised)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: "50%",
    height: "6px",
    borderRadius: "999px",
    background: "var(--color-primary)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  sliderThumb: {
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
  sliderInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    opacity: 0,
    cursor: "pointer",
  },
  volumeLabel: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    fontFamily: "var(--font-ui)",
    minWidth: "20px",
    textAlign: "right",
  },
};
