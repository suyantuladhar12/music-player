mod mpd_client;

use mpd_client::MpdState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(MpdState(Mutex::new(None)))
        .setup(|app| {
            let idle_handle = app.handle().clone();
            std::thread::spawn(move || {
                mpd_client::run_idle_loop(idle_handle);
            });

            let ticker_handle = app.handle().clone();
            std::thread::spawn(move || {
                mpd_client::run_ticker(ticker_handle);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            mpd_client::mpd_status,
            mpd_client::mpd_current_song,
            mpd_client::mpd_play,
            mpd_client::mpd_pause,
            mpd_client::mpd_set_play,
            mpd_client::mpd_next,
            mpd_client::mpd_prev,
            mpd_client::mpd_get_queue,
            mpd_client::mpd_clear_queue,
            mpd_client::mpd_play_id,
            mpd_client::mpd_remove_id,
            mpd_client::mpd_list_playlists,
            mpd_client::mpd_add_playlist_to_queue,
            mpd_client::mpd_replace_queue_with_playlist,
            mpd_client::mpd_album_art,
            mpd_client::mpd_set_random,
            mpd_client::mpd_lyrics,
            mpd_client::mpd_list_directory,
            mpd_client::mpd_list_artists,
            mpd_client::mpd_list_albums,
            mpd_client::mpd_add_to_queue,
            mpd_client::mpd_add_to_playlist,
            mpd_client::mpd_find_by_artist,
            mpd_client::mpd_find_by_album,
            mpd_client::mpd_add_artist_to_queue,
            mpd_client::mpd_add_album_to_queue,
            mpd_client::mpd_seek,
            mpd_client::mpd_replace_queue_with_artist,
            mpd_client::mpd_replace_queue_with_album,
            mpd_client::mpd_add_album_to_playlist,
            mpd_client::mpd_add_artist_to_playlist,
            mpd_client::mpd_set_volume,
            mpd_client::mpd_update_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
