import { useCallback, useRef } from "react";
import {
  getCurrentWindow,
  LogicalSize,
  LogicalPosition,
} from "@tauri-apps/api/window";

export function useAutoResizeWindow<T extends HTMLElement>() {
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    if (!el) return;

    const resize = async () => {
      const { width, height } = el.getBoundingClientRect();
      const win = getCurrentWindow();
      const oldSize = await win.outerSize();
      const oldPos = await win.outerPosition();
      const dx = (oldSize.width - width) / 2;
      const dy = (oldSize.height - height) / 2;
      await win.setSize(new LogicalSize(width, height));
      await win.setPosition(new LogicalPosition(oldPos.x + dx, oldPos.y + dy));
    };

    resize();
    observerRef.current = new ResizeObserver(resize);
    observerRef.current.observe(el);
  }, []);

  return ref;
}
