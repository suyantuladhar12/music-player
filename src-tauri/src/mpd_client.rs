use mpd::{Client, Song, State};
use serde::Serialize;
use std::sync::Mutex;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;

const MPD_ADDR: &str = "127.0.0.1:6600";

pub struct MpdState(pub Mutex<Option<Client>>);

fn fetch_art_via_command(cmd_name: &str, uri: &str) -> Result<Option<Vec<u8>>, String> {
    let stream = TcpStream::connect(MPD_ADDR).map_err(|e| e.to_string())?;
    let mut writer = stream.try_clone().map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(stream);

    // consume greeting line, e.g. "OK MPD 0.23.x"
    let mut greeting = String::new();
    reader.read_line(&mut greeting).map_err(|e| e.to_string())?;

    let mut data: Vec<u8> = Vec::new();
    let mut offset: usize = 0;

    loop {
        let cmd = format!("{} \"{}\" {}\n", cmd_name, uri.replace('"', "\\\""), offset);
        writer.write_all(cmd.as_bytes()).map_err(|e| e.to_string())?;

        let mut size_line = String::new();
        reader.read_line(&mut size_line).map_err(|e| e.to_string())?;

        if size_line.starts_with("ACK") {
            return Ok(None);
        }

        let total: usize = size_line
            .trim()
            .strip_prefix("size: ")
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| format!("unexpected response: {size_line}"))?;

        let chunk_len: usize = loop {
            let mut line = String::new();
            reader.read_line(&mut line).map_err(|e| e.to_string())?;
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("binary: ") {
                break rest
                    .parse()
                    .map_err(|_| format!("bad binary line: {trimmed}"))?;
            }
            if trimmed.is_empty() {
                return Err("hit end of response before finding binary line".into());
            }
        };

        let mut chunk = vec![0u8; chunk_len];
        reader.read_exact(&mut chunk).map_err(|e| e.to_string())?;
        data.extend_from_slice(&chunk);

        let mut trailer = String::new();
        reader.read_line(&mut trailer).map_err(|e| e.to_string())?;
        let mut ok_line = String::new();
        reader.read_line(&mut ok_line).map_err(|e| e.to_string())?;

        offset += chunk_len;
        if offset >= total || chunk_len == 0 {
            break;
        }
    }

    if data.is_empty() {
        Ok(None)
    } else {
        Ok(Some(data))
    }
}

fn fetch_album_art_bytes(uri: &str) -> Result<Option<Vec<u8>>, String> {
    if let Some(bytes) = fetch_art_via_command("readpicture", uri)? {
        return Ok(Some(bytes));
    }
    fetch_art_via_command("albumart", uri)
}

#[tauri::command]
pub fn mpd_album_art(uri: String) -> Result<Option<String>, String> {
    let bytes = fetch_album_art_bytes(&uri)?;
    Ok(bytes.map(|b| {
        let mime = if b.starts_with(&[0xFF, 0xD8]) {
            "image/jpeg"
        } else if b.starts_with(b"\x89PNG") {
            "image/png"
        } else {
            "image/jpeg"
        };
        let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &b);
        format!("data:{mime};base64,{encoded}")
    }))
}

fn get_client(state: &MpdState) -> Result<std::sync::MutexGuard<'_, Option<Client>>, String> {
    let mut guard = match state.0.lock() {
        Ok(g) => g,
        Err(poisoned) => {
            println!("[mpd] mutex was poisoned, recovering");
            poisoned.into_inner()
        }
    };
    if guard.is_none() {
        let client = Client::connect(MPD_ADDR).map_err(|e| e.to_string())?;
        *guard = Some(client);
    }
    Ok(guard)
}

#[derive(Serialize)]
pub struct PlayerStatus {
    pub state: String,
    pub volume: i8,
    pub elapsed: Option<f64>,
    pub duration: Option<f64>,
    pub repeat: bool,
    pub random: bool,
}

#[derive(Serialize)]
pub struct TrackInfo {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<f64>,
    pub id: Option<u32>,
    pub file: String, 
}

fn song_to_track(song: Song) -> TrackInfo {
    let get_tag = |key: &str| {
        song.tags
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.clone())
    };

    TrackInfo {
      title: song.title.clone(),
        artist: song.artist.clone(),
        album: get_tag("Album"),
        duration: song.duration.map(|d| d.as_secs_f64()),
        id: song.place.map(|p| p.id.0),
        file: song.file.clone(), 
    }
}

#[tauri::command]
pub fn mpd_status(state: tauri::State<MpdState>) -> Result<PlayerStatus, String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.status() {
        Ok(status) => Ok(PlayerStatus {
            state: match status.state {
                State::Play => "play".into(),
                State::Pause => "pause".into(),
                State::Stop => "stop".into(),
            },
            volume: status.volume,
            elapsed: status.elapsed.map(|d| d.as_secs_f64()),
            duration: status.duration.map(|d| d.as_secs_f64()),
            repeat: status.repeat,
            random: status.random,
        }),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_current_song(state: tauri::State<MpdState>) -> Result<Option<TrackInfo>, String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.currentsong() {
        Ok(song) => Ok(song.map(song_to_track)),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_update_database() -> Result<(), String> {
    send_raw_command("update\n").map(|_| ())
}

#[tauri::command]
pub fn mpd_remove_id(state: tauri::State<MpdState>, id: u32) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.delete(mpd::song::Id(id)) {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[derive(Serialize)]
pub struct PlaylistInfo {
    pub name: String,
}

#[tauri::command]
pub fn mpd_list_playlists(state: tauri::State<MpdState>) -> Result<Vec<PlaylistInfo>, String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.playlists() {
        Ok(playlists) => Ok(playlists
            .into_iter()
            .map(|p| PlaylistInfo { name: p.name })
            .collect()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_add_playlist_to_queue(state: tauri::State<MpdState>, name: String) -> Result<(), String> {
    // Appends the playlist's songs to whatever's already queued — no clear.
    {
        let mut guard = get_client(&state)?;
        let client = guard.as_mut().ok_or("no client")?;
        match client.load(name.clone(), ..) {
            Ok(()) => return Ok(()),
            Err(_) => {
                *guard = None;
            }
        }
    }
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    client.load(name, ..).map_err(|e| {
        *guard = None;
        e.to_string()
    })
}

#[tauri::command]
pub fn mpd_replace_queue_with_playlist(state: tauri::State<MpdState>, name: String) -> Result<(), String> {
    {
        let mut guard = get_client(&state)?;
        let client = guard.as_mut().ok_or("no client")?;
        if let Err(e) = client.clear() {
            *guard = None;
            return Err(e.to_string());
        }
    }
    {
        let mut guard = get_client(&state)?;
        let client = guard.as_mut().ok_or("no client")?;
        match client.load(name.clone(), ..) {
            Ok(()) => return Ok(()),
            Err(_) => {
                *guard = None;
            }
        }
    }
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    client.load(name, ..).map_err(|e| {
        *guard = None;
        e.to_string()
    })
}

#[tauri::command]
pub fn mpd_play(state: tauri::State<MpdState>) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.play() {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_play_id(state: tauri::State<MpdState>, id: u32) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.switch(mpd::song::Id(id)) {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_pause(state: tauri::State<MpdState>) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.pause(true) {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_set_play(state: tauri::State<MpdState>, playing: bool) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    let result = if playing {
        client.play().map_err(|e| e.to_string())
    } else {
        client.pause(true).map_err(|e| e.to_string())
    };
    if result.is_err() {
        *guard = None;
    }
    result
}

#[tauri::command]
pub fn mpd_set_volume(state: tauri::State<MpdState>, volume: i8) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.volume(volume) {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_set_random(state: tauri::State<MpdState>, enabled: bool) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    let result = client.random(enabled).map_err(|e| e.to_string());
    if result.is_err() {
        *guard = None;
    }
    result
}

#[tauri::command]
pub fn mpd_next(state: tauri::State<MpdState>) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.next() {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_prev(state: tauri::State<MpdState>) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.prev() {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_get_queue(state: tauri::State<MpdState>) -> Result<Vec<TrackInfo>, String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.queue() {
        Ok(queue) => Ok(queue.into_iter().map(song_to_track).collect()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_clear_queue(state: tauri::State<MpdState>) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;
    match client.clear() {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

use mpd::idle::Idle;
use tauri::{AppHandle, Emitter};
use std::time::Duration;
use std::thread;

pub fn run_idle_loop(app: AppHandle) {
    loop {
        match Client::connect(MPD_ADDR) {
            Ok(mut client) => {
                loop {
                    match client.idle(&[]) {
                        Ok(guard) => match guard.get() {
                            Ok(_subsystems) => {
                                let _ = app.emit("mpd-changed", ());
                            }
                            Err(_e) => {
                                break;
                            }
                        },
                        Err(_e) => {
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                println!("[mpd idle] connect failed: {e:?}, retrying in 2s");
                thread::sleep(Duration::from_secs(2));
            }
        }
        thread::sleep(Duration::from_secs(1));
    }
}

pub fn run_ticker(app: AppHandle) {
    loop {
        thread::sleep(Duration::from_secs(1));
        let _ = app.emit("mpd-tick", ());
    }
}

fn fetch_music_directory() -> Result<Option<String>, String> {
    let home = std::env::var("HOME").unwrap_or_default();

    let candidate_paths = [
        format!("{home}/.config/mpd/mpd.conf"),
        format!("{home}/.mpdconf"),
        "/etc/mpd.conf".to_string(),
    ];

    for path in candidate_paths {
        if let Ok(contents) = std::fs::read_to_string(&path) {
            for line in contents.lines() {
                let trimmed = line.trim();
                if let Some(rest) = trimmed.strip_prefix("music_directory") {
                    let rest = rest.trim();
                    // rest looks like: "/home/suyan/Music/deemix Music"
                    let unquoted = rest.trim_matches('"');
                    if unquoted.is_empty() {
                        continue;
                    }
                    let expanded = if let Some(stripped) = unquoted.strip_prefix("~/") {
                        format!("{home}/{stripped}")
                    } else {
                        unquoted.to_string()
                    };
                    return Ok(Some(expanded));
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub fn mpd_lyrics(file: String) -> Result<Option<String>, String> {
    let music_dir = match fetch_music_directory()? {
        Some(dir) => dir,
        None => return Ok(None),
    };

    let audio_path = std::path::Path::new(&music_dir).join(&file);
    let lrc_path = audio_path.with_extension("lrc");

    match std::fs::read_to_string(&lrc_path) {
        Ok(contents) => Ok(Some(contents)),
        Err(_) => Ok(None),
    }
}

fn send_raw_command(cmd: &str) -> Result<Vec<String>, String> {
    let stream = TcpStream::connect(MPD_ADDR).map_err(|e| e.to_string())?;
    let mut writer = stream.try_clone().map_err(|e| e.to_string())?;
    let mut reader = BufReader::new(stream);

    let mut greeting = String::new();
    reader.read_line(&mut greeting).map_err(|e| e.to_string())?;

    writer
        .write_all(format!("{cmd}\n").as_bytes())
        .map_err(|e| e.to_string())?;

    let mut lines = Vec::new();
    loop {
        let mut line = String::new();
        let bytes_read = reader.read_line(&mut line).map_err(|e| e.to_string())?;
        if bytes_read == 0 {
            break; // connection closed unexpectedly
        }
        let trimmed = line.trim_end().to_string();
        if trimmed == "OK" {
            break;
        }
        if trimmed.starts_with("ACK") {
            return Err(trimmed);
        }
        lines.push(trimmed);
    }
    Ok(lines)
}

fn mpd_quote(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub kind: String, // "directory" | "file"
    pub path: String,  // full MPD-relative path, needed to descend or add
}

#[tauri::command]
pub fn mpd_list_directory(path: Option<String>) -> Result<Vec<DirEntry>, String> {
    let target = path.unwrap_or_default();
    let cmd = format!("lsinfo {}", mpd_quote(&target));
    let lines = send_raw_command(&cmd)?;

    let mut entries = Vec::new();
    let mut current_kind: Option<String> = None;
    let mut current_path: Option<String> = None;

    for line in lines {
        if let Some(rest) = line.strip_prefix("directory: ") {
            current_kind = Some("directory".to_string());
            current_path = Some(rest.to_string());
        } else if let Some(rest) = line.strip_prefix("file: ") {
            current_kind = Some("file".to_string());
            current_path = Some(rest.to_string());
        } else if line.starts_with("playlist: ") {
            // stored playlists also show up in lsinfo at the root — skip,
            // the Playlist tab already handles these via mpd_list_playlists
            current_kind = None;
            current_path = None;
        }

        if let (Some(kind), Some(full_path)) = (&current_kind, &current_path) {
            // Only push once per entry — use the last path segment as display name
            if line.starts_with("directory: ") || line.starts_with("file: ") {
                let name = full_path
                    .rsplit('/')
                    .next()
                    .unwrap_or(full_path)
                    .to_string();
                entries.push(DirEntry {
                    name,
                    kind: kind.clone(),
                    path: full_path.clone(),
                });
            }
        }
    }
    Ok(entries)
}

#[tauri::command]
pub fn mpd_list_artists() -> Result<Vec<String>, String> {
    let lines = send_raw_command("list artist")?;
    Ok(lines
        .into_iter()
        .filter_map(|l| l.strip_prefix("Artist: ").map(|s| s.to_string()))
        .collect())
}

#[tauri::command]
pub fn mpd_list_albums(artist: Option<String>) -> Result<Vec<String>, String> {
    let cmd = match artist {
        Some(a) => format!("list album artist {}", mpd_quote(&a)),
        None => "list album".to_string(),
    };
    let lines = send_raw_command(&cmd)?;
    Ok(lines
        .into_iter()
        .filter_map(|l| l.strip_prefix("Album: ").map(|s| s.to_string()))
        .collect())
}

#[tauri::command]
pub fn mpd_add_to_queue(uri: String) -> Result<(), String> {
    send_raw_command(&format!("add {}", mpd_quote(&uri))).map(|_| ())
}

#[tauri::command]
pub fn mpd_add_to_playlist(playlist: String, uri: String) -> Result<(), String> {
    send_raw_command(&format!(
        "playlistadd {} {}",
        mpd_quote(&playlist),
        mpd_quote(&uri)
    ))
    .map(|_| ())
}    

#[derive(Serialize)]
pub struct FindSong {
    pub file: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub duration: Option<f64>,
}

fn parse_find_songs(lines: Vec<String>) -> Vec<FindSong> {
    let mut songs = Vec::new();
    let mut current: Option<FindSong> = None;

    for line in lines {
        if let Some(file) = line.strip_prefix("file: ") {
            if let Some(song) = current.take() {
                songs.push(song);
            }
            current = Some(FindSong {
                file: file.to_string(),
                title: None,
                artist: None,
                album: None,
                duration: None,
            });
        } else if let Some(rest) = line.strip_prefix("Title: ") {
            if let Some(s) = current.as_mut() {
                s.title = Some(rest.to_string());
            }
        } else if let Some(rest) = line.strip_prefix("Artist: ") {
            if let Some(s) = current.as_mut() {
                s.artist = Some(rest.to_string());
            }
        } else if let Some(rest) = line.strip_prefix("Album: ") {
            if let Some(s) = current.as_mut() {
                s.album = Some(rest.to_string());
            }
        } else if let Some(rest) = line.strip_prefix("Time: ") {
            if let Some(s) = current.as_mut() {
                s.duration = rest.parse().ok();
            }
        } else if let Some(rest) = line.strip_prefix("duration: ") {
            if let Some(s) = current.as_mut() {
                s.duration = rest.parse().ok();
            }
        }
    }
    if let Some(song) = current.take() {
        songs.push(song);
    }
    songs
}

#[tauri::command]
pub fn mpd_find_by_artist(artist: String) -> Result<Vec<FindSong>, String> {
    let lines = send_raw_command(&format!("find artist {}", mpd_quote(&artist)))?;
    Ok(parse_find_songs(lines))
}

#[tauri::command]
pub fn mpd_find_by_album(album: String) -> Result<Vec<FindSong>, String> {
    let lines = send_raw_command(&format!("find album {}", mpd_quote(&album)))?;
    Ok(parse_find_songs(lines))
}

#[tauri::command]
pub fn mpd_add_artist_to_queue(artist: String) -> Result<(), String> {
    send_raw_command(&format!(
        "findadd artist {}",
        mpd_quote(&artist)
    ))
    .map(|_| ())
}

#[tauri::command]
pub fn mpd_add_album_to_queue(album: String) -> Result<(), String> {
    send_raw_command(&format!(
        "findadd album {}",
        mpd_quote(&album)
    ))
    .map(|_| ())
}

#[tauri::command]
pub fn mpd_replace_queue_with_artist(artist: String) -> Result<(), String> {
    send_raw_command("clear")?;
    send_raw_command(&format!("findadd artist {}", mpd_quote(&artist))).map(|_| ())
}

#[tauri::command]
pub fn mpd_replace_queue_with_album(album: String) -> Result<(), String> {
    send_raw_command("clear")?;
    send_raw_command(&format!("findadd album {}", mpd_quote(&album))).map(|_| ())
}

#[tauri::command]
pub fn mpd_seek(
    state: tauri::State<MpdState>,
    id: u32,
    position: f64,
) -> Result<(), String> {
    let mut guard = get_client(&state)?;
    let client = guard.as_mut().ok_or("no client")?;

    match client.seek(mpd::song::Id(id), Duration::from_secs_f64(position)) {
        Ok(()) => Ok(()),
        Err(e) => {
            *guard = None;
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn mpd_add_artist_to_playlist(playlist: String, artist: String) -> Result<(), String> {
    let lines = send_raw_command(&format!("find artist {}", mpd_quote(&artist)))?;
    let songs = parse_find_songs(lines);
    for song in songs {
        send_raw_command(&format!(
            "playlistadd {} {}",
            mpd_quote(&playlist),
            mpd_quote(&song.file)
        ))?;
    }
    Ok(())
}

#[tauri::command]
pub fn mpd_add_album_to_playlist(playlist: String, album: String) -> Result<(), String> {
    let lines = send_raw_command(&format!("find album {}", mpd_quote(&album)))?;
    let songs = parse_find_songs(lines);
    for song in songs {
        send_raw_command(&format!(
            "playlistadd {} {}",
            mpd_quote(&playlist),
            mpd_quote(&song.file)
        ))?;
    }
    Ok(())
}
