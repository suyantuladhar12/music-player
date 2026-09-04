import { create } from "zustand";
import { mpd, type PlayerStatus, type TrackInfo } from "../services/mpd/mpd";

export interface LyricLine {
  time: number;
  text: string;
}

function parseLyrics(text: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (!match) continue;
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const lyricText = match[3].trim();
    lines.push({
      time: minutes * 60 + seconds,
      text: lyricText,
    });
  }
  return lines.sort((a, b) => a.time - b.time);
}

interface PlayerState {
  status: PlayerStatus | null;
  currentSong: TrackInfo | null;
  queue: TrackInfo[];
  albumArtUrl: string | null;
  lyricsText: LyricLine[];
  isInitialized: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  playTrack: (id: number) => Promise<void>;
  clearQueue: () => Promise<void>;
  removeTrack: (id: number) => Promise<void>;
  tick: () => void;
  toggleRandom: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  addToQueue: (uri: string) => Promise<void>;
  addArtistToQueue: (artist: string) => Promise<void>;
  addAlbumToQueue: (album: string) => Promise<void>;
  addPlaylistToQueue: (name: string) => Promise<void>;
  replaceQueueWithPlaylist: (name: string) => Promise<void>;
  replaceQueueWithArtist: (artist: string) => Promise<void>;
  replaceQueueWithAlbum: (album: string) => Promise<void>;
  addArtistToPlaylist: (playlist: string, artist: string) => Promise<void>;
  addAlbumToPlaylist: (playlist: string, album: string) => Promise<void>;
  addToPlaylist: (playlist: string, uri: string) => Promise<void>;
  updateDatabase: () => void;
}

let optimisticSeek: {
  file: string;
  position: number;
} | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => {
  let lastTickTime = performance.now();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    status: null,
    currentSong: null,
    queue: [],
    albumArtUrl: null,
    lyricsText: [],
    isInitialized: false,
    init: async () => {
      if (get().isInitialized) return;
      await get().refresh();

      mpd.onChanged(() => {
        get().refresh();
      });

      // Internal tick fallback to guarantee progress updates every 200ms
      if (!intervalId) {
        lastTickTime = performance.now();
        intervalId = setInterval(() => {
          get().tick();
        }, 200);
      }

      set({ isInitialized: true });
    },
    refresh: async () => {
      const prevFile = get().currentSong?.file;
      const [status, currentSong, queue] = await Promise.all([
        mpd.status(),
        mpd.currentSong(),
        mpd.getQueue(),
      ]);
      lastTickTime = performance.now();
      if (
        optimisticSeek &&
        currentSong?.file === optimisticSeek.file &&
        status.state === "play"
      ) {
        set({
          status: {
            ...status,
            elapsed: optimisticSeek.position,
          },
          currentSong,
          queue,
        });
      } else {
        set({ status, currentSong, queue });
      }
      if (currentSong && currentSong.file !== prevFile) {
        try {
          const artUrl = await mpd.albumArt(currentSong.file);
          set({ albumArtUrl: artUrl });
        } catch (e) {
          console.error("[albumArt] fetch failed:", e);
          set({ albumArtUrl: null });
        }
        try {
          const lyrics = await mpd.lyrics(currentSong.file);
          set({
            lyricsText: lyrics ? parseLyrics(lyrics) : [],
          });
        } catch (e) {
          console.error("[lyrics] fetch failed:", e);
          set({ lyricsText: [] });
        }
      } else if (!currentSong) {
        set({
          albumArtUrl: null,
          lyricsText: [],
        });
      }
    },
    togglePlay: async () => {
      const wasPlaying = get().status?.state === "play";
      set((s) => ({
        status: s.status
          ? {
              ...s.status,
              state: wasPlaying ? "pause" : "play",
            }
          : s.status,
      }));
      lastTickTime = performance.now();
      await mpd.setPlay(!wasPlaying);
    },
    seek: async (position: number) => {
      const { currentSong, status } = get();

      if (currentSong?.id == null || !status?.duration) return;

      const target = Math.max(0, Math.min(position, status.duration));

      optimisticSeek = {
        file: currentSong.file,
        position: target,
      };

      set((state) => ({
        status: state.status
          ? {
              ...state.status,
              elapsed: target,
            }
          : state.status,
      }));

      await mpd.seek(currentSong.id, target);
    },
    toggleRandom: async () => {
      const wasShuffled = get().status?.random ?? false;
      set((s) => ({
        status: s.status
          ? {
              ...s.status,
              random: !wasShuffled,
            }
          : s.status,
      }));
      await mpd.setRandom(!wasShuffled);
    },
    updateDatabase: async () => {
      await mpd.updateDatabase();
    },
    next: async () => {
      await mpd.next();
    },
    prev: async () => {
      await mpd.prev();
    },
    playTrack: async (id: number) => {
      await mpd.playId(id);
    },
    clearQueue: async () => {
      await mpd.clearQueue();
    },
    removeTrack: async (id: number) => {
      await mpd.removeId(id);
    },
    addToQueue: async (uri: string) => {
      await mpd.addToQueue(uri);
    },
    addArtistToQueue: async (artist: string) => {
      await mpd.addArtistToQueue(artist);
    },
    addAlbumToQueue: async (album: string) => {
      await mpd.addAlbumToQueue(album);
    },
    addPlaylistToQueue: async (name: string) => {
      await mpd.addPlaylistToQueue(name);
    },
    replaceQueueWithPlaylist: async (name: string) => {
      await mpd.replaceQueueWithPlaylist(name);
      await mpd.play();
    },
    replaceQueueWithArtist: async (artist: string) => {
      await mpd.replaceQueueWithArtist(artist);
      await mpd.play();
    },
    replaceQueueWithAlbum: async (album: string) => {
      await mpd.replaceQueueWithAlbum(album);
      await mpd.play();
    },
    setVolume: async (volume: number) => {
      set((s) => (s.status ? { status: { ...s.status, volume } } : s));
      await mpd.setVolume(volume);
    },
    tick: () => {
      const now = performance.now();
      const delta = (now - lastTickTime) / 1000;
      lastTickTime = now;
      const { status } = get();
      if (!status || status.state !== "play" || status.elapsed === null) {
        return;
      }
      set({
        status: {
          ...status,
          elapsed: status.elapsed + delta,
        },
      });
    },
    addArtistToPlaylist: async (playlist: string, artist: string) => {
      await mpd.addArtistToPlaylist(playlist, artist);
    },
    addAlbumToPlaylist: async (playlist: string, album: string) => {
      await mpd.addAlbumToPlaylist(playlist, album);
    },
    addToPlaylist: async (playlist: string, uri: string) => {
      await mpd.addToPlaylist(playlist, uri);
    },
  };
});
