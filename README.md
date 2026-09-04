# Music Player

A lightweight, borderless desktop widget for controlling [MPD](https://www.musicpd.org/) (Music Player Daemon), built with Tauri v2 and React. Retro pixel-art aesthetic, self-resizing window, and a handful of window states (full player, mini pill, queue, library, docked corner widget) that all live in the same OS window.

![status](https://img.shields.io/badge/status-in--development-yellow)

<img width="320" height="480" alt="image" src="https://github.com/user-attachments/assets/5b2ca895-6757-4072-842b-117e68ef893e" />
<br>
<img width="399" height="521" alt="image" src="https://github.com/user-attachments/assets/41cae5d9-2440-4949-8706-e120d5e64533" />
<br>
<img width="458" height="562" alt="image" src="https://github.com/user-attachments/assets/faa0de5e-56ba-4156-a754-a3c249e34bca" />
<br>
<img width="221" height="305" alt="image" src="https://github.com/user-attachments/assets/1dcb4c52-d4ee-4b1e-9ec9-6da132187d92" />


## Features

- **Full player** — album art (click to reveal synced lyrics), draggable progress bar, transport controls, volume, shuffle
- **Mini/collapsed mode** — a compact pill with spinning "vinyl" album art, play/pause/skip
- **Queue view** — see and manage what's currently queued
- **Library browser** — tabbed by Directory / Artist / Album / Playlist, each with:
  - Search-by-name (slides open from a search icon)
  - Sortable "Name" column (ascending/descending)
  - A refresh button that triggers `mpc update` (library rescan)
  - Drill-down from Artist/Album into their songs
- **Playlists** — add tracks/albums/artists to existing MPD playlists via a picker modal
- **Docked mode** — a small always-on-top circular handle that expands into a compact widget pinned to a screen corner
- **Notifications** — lightweight in-app toasts for actions like "Added to Queue"
- **Smooth panel transitions** — cross-fade + subtle scale between window states

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Backend**: Tauri v2 (Rust)
- **State management**: Zustand
- **Styling**: Inline styles only (no Tailwind/CSS framework), theming via CSS custom properties
- **Icons**: [`@nsmr/pixelart-react`](https://www.npmjs.com/package/@nsmr/pixelart-react) (MIT, free pixel icon set)
- **MPD connection**: Raw TCP to `127.0.0.1:6600`, no authentication

## Requirements

- [MPD](https://www.musicpd.org/) installed and running locally, listening on `127.0.0.1:6600`
- Node.js and npm
- Rust toolchain (for Tauri)
- **Linux only**: an X11-capable display (see [Linux notes](#linux-notes) below)

## Getting started

```bash
npm install
npm run tauri dev
```

**On Linux**, prefix with the X11 backend variable (see why below):

```bash
GDK_BACKEND=x11 npm run tauri dev
```

## Building / packaging

```bash
npm run tauri build
```

Produces installable bundles (e.g. `.deb`, `.AppImage`) under `src-tauri/target/release/bundle/`, per whatever targets are configured in `tauri.conf.json`. The Linux `GDK_BACKEND=x11` requirement is baked into the packaged binary itself (set as the first line of `main()`), so end users don't need to set any environment variables when running the built app.

Linux bundling dependencies (Debian/Ubuntu example):

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Project structure

```
src/
├── app/                  — app shell / routing
├── components/
│   ├── dock/              — docked-mode handle + expanded widget
│   ├── layout/             — shared UI: search bar, filter bar, marquee text, volume control, nav
│   ├── notification/       — toast popup
│   ├── playlist/           — "add to playlist" picker modal
│   └── tabs/                — Directory / Artist / Album / Playlist tab content
├── hooks/
│   ├── useAutoResizeWindow.ts — keeps the OS window sized to its content
│   └── useDockedPosition.ts   — corner-anchoring + always-on-top logic for docked mode
├── pages/
│   ├── home/               — main player (all window states orchestrated here)
│   ├── library/             — tab container
│   ├── queue/                — queue view
│   └── settings/              — (scaffolded, not yet built out)
├── services/mpd/           — typed `invoke()` wrappers around Tauri commands
├── stores/                 — Zustand stores (player state, notifications)
└── styles/                 — global CSS (design tokens, keyframes)

src-tauri/
└── src/mpd_client.rs      — all MPD command handlers (playback, queue, playlists, library browsing, media)
```

## MPD backend command inventory

Two connection patterns are used:
- **Managed connection** (`MpdState`) — typed methods via the `mpd` crate, self-healing on error
- **Raw one-shot TCP** (`send_raw_command`) — for commands the crate doesn't wrap, or where full control over parsing is needed (album art, lyrics, directory listing, bulk playlist adds, database update)

| Category | Commands |
|---|---|
| Playback | status, current song, play/pause, play by ID, next/prev, seek, random toggle, volume |
| Queue | get queue, clear, remove by ID, add (file/dir), add artist/album to queue |
| Playlists | list playlists, add/replace queue from playlist, replace from artist/album, add song/artist/album to a playlist |
| Library browsing | list directory, list artists/albums, find by artist/album |
| Media | album art (readpicture/albumart), lyrics (reads local `.lrc` files) |
| Maintenance | database update (`update`) |

## Known constraints & open items

- **Wayland**: absolute window positioning isn't supported under native Wayland (protocol limitation). The docked mode requires XWayland — see [Linux notes](#linux-notes).
- **GNOME always-on-top**: stock GNOME has no always-on-top support; users need a Shell extension (e.g. "Window on Top") for docked mode to actually stay on top.
- **Icon names**: several `@nsmr/pixelart-react` icon names in the codebase were chosen without confirming against the package's real export list, since the wrapped free set differs in naming from the full Pixelarticons library it's based on. Some have already needed correcting (e.g. `Refresh` → `Reload`); if an icon renders incorrectly, verify the real export names with:
  ```bash
  node -e "console.log(Object.keys(require('@nsmr/pixelart-react')))"
  ```
- **Album/artist "Add to Playlist" caveat**: matches by album title alone, not album+artist — same-named albums by different artists could collide.
- **Multi-select** in Library tabs is not implemented.
- **Online lyrics lookup** is not implemented — only local `.lrc` files (same directory as the audio file) are read.
- **Theme switching UI** is not implemented — design tokens exist, but there's no selector yet.
- **Favorites/hearts** are currently decorative only, not wired to MPD stickers or persisted anywhere.
- **A floating (outside-window) volume popup** isn't achievable with CSS alone under the current windowing model (window size = measured content size); it would require a second real OS-level Tauri window.

## Linux notes

MPD itself needs to be installed and running separately — this app is a *client*, not a server. A minimal `mpd.conf` pointing `music_directory` at your library and enabling network access on `127.0.0.1:6600` is sufficient.

**Why `GDK_BACKEND=x11` is needed**: native Wayland doesn't support setting an absolute window position (a protocol-level restriction, not a bug in this app), which the docked-corner feature depends on. Running under XWayland via this environment variable works around it. This is set automatically inside the packaged/built binary, so it's only something you need to pass manually when running via `npm run tauri dev`.
