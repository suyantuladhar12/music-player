import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface PlayerStatus {
  state: "play" | "pause" | "stop";
  volume: number;
  elapsed: number | null;
  duration: number | null;
  repeat: boolean;
  random: boolean;
}

export interface TrackInfo {
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  id: number | null;
  file: string;
}

export interface PlaylistInfo {
  name: string;
}

export interface DirEntry {
  name: string;
  kind: "directory" | "file";
  path: string;
}

export interface FindSong {
  file: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
}

export const mpd = {
  status: () => invoke<PlayerStatus>("mpd_status"),
  currentSong: () => invoke<TrackInfo | null>("mpd_current_song"),
  play: () => invoke<void>("mpd_play"),
  pause: () => invoke<void>("mpd_pause"),
  updateDatabase: () => invoke<void>("mpd_update_database"),
  setPlay: (playing: boolean) => invoke<void>("mpd_set_play", { playing }),
  setRandom: (enabled: boolean) => invoke<void>("mpd_set_random", { enabled }),
  next: () => invoke<void>("mpd_next"),
  prev: () => invoke<void>("mpd_prev"),
  playId: (id: number) => invoke<void>("mpd_play_id", { id }),
  getQueue: () => invoke<TrackInfo[]>("mpd_get_queue"),
  clearQueue: () => invoke<void>("mpd_clear_queue"),
  removeId: (id: number) => invoke<void>("mpd_remove_id", { id }),
  listPlaylists: () => invoke<PlaylistInfo[]>("mpd_list_playlists"),
  addPlaylistToQueue: (name: string) =>
    invoke<void>("mpd_add_playlist_to_queue", { name }),
  replaceQueueWithPlaylist: (name: string) =>
    invoke<void>("mpd_replace_queue_with_playlist", { name }),
  albumArt: (uri: string) => invoke<string | null>("mpd_album_art", { uri }),
  lyrics: (file: string) => invoke<string | null>("mpd_lyrics", { file }),
  onChanged: (callback: () => void) => listen("mpd-changed", callback),
  onTick: (callback: () => void) => listen("mpd-tick", callback),
  listDirectory: (path?: string) =>
    invoke<DirEntry[]>("mpd_list_directory", { path: path ?? null }),
  listArtists: () => invoke<string[]>("mpd_list_artists"),
  listAlbums: (artist?: string) =>
    invoke<string[]>("mpd_list_albums", { artist: artist ?? null }),
  addToQueue: (uri: string) => invoke<void>("mpd_add_to_queue", { uri }),
  addToPlaylist: (playlist: string, uri: string) =>
    invoke<void>("mpd_add_to_playlist", { playlist, uri }),
  addArtistToQueue: (artist: string) =>
    invoke<void>("mpd_add_artist_to_queue", { artist }),
  addAlbumToQueue: (album: string) =>
    invoke<void>("mpd_add_album_to_queue", { album }),
  findByArtist: (artist: string) =>
    invoke<FindSong[]>("mpd_find_by_artist", { artist }),
  findByAlbum: (album: string) =>
    invoke<FindSong[]>("mpd_find_by_album", { album }),
  seek: (id: number, position: number) =>
    invoke<void>("mpd_seek", { id, position }),
  replaceQueueWithArtist: (artist: string) =>
    invoke<void>("mpd_replace_queue_with_artist", { artist }),
  replaceQueueWithAlbum: (album: string) =>
    invoke<void>("mpd_replace_queue_with_album", { album }),
  addArtistToPlaylist: (playlist: string, artist: string) =>
    invoke<void>("mpd_add_artist_to_playlist", { playlist, artist }),
  addAlbumToPlaylist: (playlist: string, album: string) =>
    invoke<void>("mpd_add_album_to_playlist", { playlist, album }),
  setVolume: (volume: number) => invoke<void>("mpd_set_volume", { volume }),
};
