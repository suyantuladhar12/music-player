import { forwardRef } from "react";

interface DockHandleProps {
  onClick: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const DockHandle = forwardRef<HTMLDivElement, DockHandleProps>(
  ({ onClick, onMouseDown }, ref) => {
    return (
      <div
        ref={ref}
        style={styles.handle}
        onClick={onClick}
        onMouseDown={onMouseDown}
      >
        <span style={styles.glyph}>♪</span>
      </div>
    );
  },
);

const styles: Record<string, React.CSSProperties> = {
  handle: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  },
  glyph: {
    fontSize: "20px",
    color: "var(--color-text-muted)",
  },
};
