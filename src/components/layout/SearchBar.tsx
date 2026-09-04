import { useEffect, useRef, useState } from "react";
import { Icon } from "@nsmr/pixelart-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    onChange("");
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  return (
    <div style={styles.wrapper}>
      <div
        style={{
          ...styles.inputTrack,
          width: isOpen ? "100%" : "0px",
          opacity: isOpen ? 1 : 0,
          marginRight: isOpen ? "6px" : "0px",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!value) setIsOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleClose();
          }}
          style={styles.input}
        />
      </div>

      <button
        style={styles.iconButton}
        onClick={isOpen ? handleClose : handleOpen}
        title={isOpen ? "Close search" : "Search"}
      >
        <Icon name={isOpen ? "Close" : "Search"} size={16} />
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  inputTrack: {
    overflow: "hidden",
    transition: "width 0.18s ease, opacity 0.15s ease, margin-right 0.18s ease",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "var(--color-text)",
    fontFamily: "var(--font-ui)",
    outline: "none",
  },
  iconButton: {
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
