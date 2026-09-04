import {
  getCurrentWindow,
  currentMonitor,
  primaryMonitor,
} from "@tauri-apps/api/window";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";

const RIGHT_MARGIN = 12;
const BOTTOM_MARGIN = 48;

export async function moveWindowToDockedCorner(width: number, height: number) {
  const win = getCurrentWindow();
  let monitor = await currentMonitor();
  if (!monitor) {
    monitor = await primaryMonitor();
  }
  if (!monitor) {
    console.error(
      "[dock] no monitor could be detected — window was NOT resized or repositioned.",
    );
    return;
  }

  const scaleFactor = monitor.scaleFactor;
  const monitorXLogical = monitor.position.x / scaleFactor;
  const monitorYLogical = monitor.position.y / scaleFactor;
  const screenWidthLogical = monitor.size.width / scaleFactor;
  const screenHeightLogical = monitor.size.height / scaleFactor;

  const x = monitorXLogical + screenWidthLogical - width - RIGHT_MARGIN;
  const y = monitorYLogical + screenHeightLogical - height - BOTTOM_MARGIN;

  await win.setSize(new LogicalSize(width, height));
  await new Promise((resolve) => setTimeout(resolve, 50));
  await win.setPosition(new LogicalPosition(x, y));
}

export async function setDockedAlwaysOnTop(enabled: boolean) {
  const win = getCurrentWindow();
  await win.setAlwaysOnTop(enabled);
}
