import { useNotificationStore } from "../../stores/notificationStore";

export function NotificationPopup() {
  const message = useNotificationStore((s) => s.message);
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (!message) return null;

  return (
    <div style={styles.overlay} onClick={dismiss}>
      <div style={styles.box}>
        <div style={styles.message}>{message}</div>
        <div style={styles.hint}>▸ Click to continue</div>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.25)",
    zIndex: 1000,
    cursor: "pointer",
    animation: "notif-fade-in 0.08s ease-out",
  },
  box: {
    minWidth: "220px",
    maxWidth: "80%",
    padding: "16px 18px 10px",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-ui)",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
    animation: "notif-pop-in 0.12s ease-out",
  },
  message: {
    fontSize: "13px",
    color: "var(--color-text)",
    lineHeight: "1.5",
    textAlign: "center",
    marginBottom: "10px",
  },
  hint: {
    fontSize: "10px",
    color: "var(--color-text-muted)",
    textAlign: "right",
  },
};
