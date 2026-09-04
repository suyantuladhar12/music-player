import { useEffect, useState, type ReactNode } from "react";

interface PanelTransitionProps {
  panelKey: string;
  children: ReactNode;
}

export function PanelTransition({ panelKey, children }: PanelTransitionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [panelKey]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 100ms steps(4)",
      }}
    >
      {children}
    </div>
  );
}
