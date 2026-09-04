import { forwardRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "../../stores/playerStore";
import { DirectoryTab } from "../../components/tabs/DirectoryTab";
import { ArtistTab } from "../../components/tabs/ArtistTab";
import { AlbumTab } from "../../components/tabs/AlbumTab";
import { PlaylistTab } from "../../components/tabs/PlaylistTab";
import { PlaylistPickerModal } from "../../components/playlist/PlaylistPickerModal";
import { useNotificationStore } from "../../stores/notificationStore";
import {
  ListFilterBar,
  type SortDirection,
} from "../../components/layout/ListFilterBar";

type TabKey = "directory" | "artist" | "album" | "playlist";

interface LibraryProps {
  onClose: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export const Library = forwardRef<HTMLDivElement, LibraryProps>(
  ({ onClose, onMouseDown }, ref) => {
    const [activeTab, setActiveTab] = useState<TabKey>("directory");
    const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = useState(false);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
    const [selectedArtistSong, setSelectedArtistSong] = useState<string | null>(
      null,
    );
    const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
    const [selectedAlbumSong, setSelectedAlbumSong] = useState<string | null>(
      null,
    );
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(
      null,
    );

    const [directoryQuery, setDirectoryQuery] = useState("");
    const [artistQuery, setArtistQuery] = useState("");
    const [albumQuery, setAlbumQuery] = useState("");
    const [playlistQuery, setPlaylistQuery] = useState("");

    const [directorySort, setDirectorySort] = useState<SortDirection>("asc");
    const [artistSort, setArtistSort] = useState<SortDirection>("asc");
    const [albumSort, setAlbumSort] = useState<SortDirection>("asc");
    const [playlistSort, setPlaylistSort] = useState<SortDirection>("asc");

    const {
      addToQueue,
      addArtistToQueue,
      addAlbumToQueue,
      addPlaylistToQueue,
      replaceQueueWithPlaylist,
      replaceQueueWithArtist,
      replaceQueueWithAlbum,
      addToPlaylist,
      addArtistToPlaylist,
      addAlbumToPlaylist,
      updateDatabase,
    } = usePlayerStore(
      useShallow((s) => ({
        addToQueue: s.addToQueue,
        addArtistToQueue: s.addArtistToQueue,
        addAlbumToQueue: s.addAlbumToQueue,
        addPlaylistToQueue: s.addPlaylistToQueue,
        replaceQueueWithPlaylist: s.replaceQueueWithPlaylist,
        replaceQueueWithArtist: s.replaceQueueWithArtist,
        replaceQueueWithAlbum: s.replaceQueueWithAlbum,
        addToPlaylist: s.addToPlaylist,
        addArtistToPlaylist: s.addArtistToPlaylist,
        addAlbumToPlaylist: s.addAlbumToPlaylist,
        updateDatabase: s.updateDatabase,
      })),
    );

    const hasSelectionForTab =
      (activeTab === "directory" && selectedPath !== null) ||
      (activeTab === "artist" &&
        (selectedArtist !== null || selectedArtistSong !== null)) ||
      (activeTab === "album" &&
        (selectedAlbum !== null || selectedAlbumSong !== null)) ||
      (activeTab === "playlist" && selectedPlaylist !== null);

    const handleAddToQueue = async () => {
      if (activeTab === "directory" && selectedPath) {
        await addToQueue(selectedPath);
        return true;
      }
      if (activeTab === "artist") {
        if (selectedArtistSong) {
          await addToQueue(selectedArtistSong);
          return true;
        }
        if (selectedArtist) {
          await addArtistToQueue(selectedArtist);
          return true;
        }
      }
      if (activeTab === "album") {
        if (selectedAlbumSong) {
          await addToQueue(selectedAlbumSong);
          return true;
        }
        if (selectedAlbum) {
          await addAlbumToQueue(selectedAlbum);
          return true;
        }
      }
      if (activeTab === "playlist" && selectedPlaylist) {
        await addPlaylistToQueue(selectedPlaylist);
        return true;
      }
      return false;
    };

    // const handleLoadPlaylist = () => {
    //   if (selectedPlaylist) {
    //     replaceQueueWithPlaylist(selectedPlaylist);
    //   }
    // };

    const showLoadButton =
      (activeTab === "artist" && selectedArtist !== null) ||
      (activeTab === "album" && selectedAlbum !== null) ||
      (activeTab === "playlist" && selectedPlaylist !== null);

    const handleLoad = async () => {
      if (activeTab === "artist" && selectedArtist) {
        replaceQueueWithArtist(selectedArtist);
      } else if (activeTab === "album" && selectedAlbum) {
        replaceQueueWithAlbum(selectedAlbum);
      } else if (activeTab === "playlist" && selectedPlaylist) {
        replaceQueueWithPlaylist(selectedPlaylist);
      }
    };

    const canAddToPlaylist =
      (activeTab === "directory" && selectedPath !== null) ||
      (activeTab === "artist" &&
        (selectedArtist !== null || selectedArtistSong !== null)) ||
      (activeTab === "album" &&
        (selectedAlbum !== null || selectedAlbumSong !== null));

    const notify = useNotificationStore((s) => s.notify);

    const handleUpdateDatabase = async () => {
      await updateDatabase();
      notify("Library updated.");
    };

    const handlePickPlaylist = (playlistName: string) => {
      if (activeTab === "directory" && selectedPath) {
        addToPlaylist(playlistName, selectedPath);
        notify(`Added to "${playlistName}"`);
      } else if (activeTab === "artist") {
        if (selectedArtistSong) {
          addToPlaylist(playlistName, selectedArtistSong);
          notify(`Added to "${playlistName}"`);
        } else if (selectedArtist) {
          addArtistToPlaylist(playlistName, selectedArtist);
          notify(`Added ${selectedArtist} to "${playlistName}"`);
        }
      } else if (activeTab === "album") {
        if (selectedAlbumSong) {
          addToPlaylist(playlistName, selectedAlbumSong);
        } else if (selectedAlbum) {
          addAlbumToPlaylist(playlistName, selectedAlbum);
        }
      }
      setIsPlaylistPickerOpen(false);
    };

    const tabs: { key: TabKey; label: string }[] = [
      { key: "directory", label: "Directory" },
      { key: "artist", label: "Artist" },
      { key: "album", label: "Album" },
      { key: "playlist", label: "Playlist" },
    ];

    const activeQuery =
      activeTab === "directory"
        ? directoryQuery
        : activeTab === "artist"
          ? artistQuery
          : activeTab === "album"
            ? albumQuery
            : playlistQuery;

    const setActiveQuery =
      activeTab === "directory"
        ? setDirectoryQuery
        : activeTab === "artist"
          ? setArtistQuery
          : activeTab === "album"
            ? setAlbumQuery
            : setPlaylistQuery;

    const activeSort =
      activeTab === "directory"
        ? directorySort
        : activeTab === "artist"
          ? artistSort
          : activeTab === "album"
            ? albumSort
            : playlistSort;

    const setActiveSort =
      activeTab === "directory"
        ? setDirectorySort
        : activeTab === "artist"
          ? setArtistSort
          : activeTab === "album"
            ? setAlbumSort
            : setPlaylistSort;

    const toggleActiveSort = () => {
      setActiveSort(activeSort === "asc" ? "desc" : "asc");
    };

    return (
      <div ref={ref} style={styles.wrapper} onMouseDown={onMouseDown}>
        <div style={styles.header}>
          <span style={styles.headerDecor}>❋ ✦</span>
          <span style={styles.headerTitle}>Library</span>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {}),
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ListFilterBar
          sortDirection={activeSort}
          onToggleSort={toggleActiveSort}
          searchQuery={activeQuery}
          onSearchChange={setActiveQuery}
          searchPlaceholder={`Search ${activeTab}...`}
          onRefresh={handleUpdateDatabase}
        />

        <div style={styles.content}>
          {activeTab === "directory" && (
            <DirectoryTab
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              searchQuery={directoryQuery}
              sortDirection={directorySort}
            />
          )}
          {activeTab === "artist" && (
            <ArtistTab
              selectedArtist={selectedArtist}
              selectedSongFile={selectedArtistSong}
              onSelectArtist={setSelectedArtist}
              onSelectSong={setSelectedArtistSong}
              searchQuery={artistQuery}
              sortDirection={artistSort}
            />
          )}
          {activeTab === "album" && (
            <AlbumTab
              selectedAlbum={selectedAlbum}
              selectedSongFile={selectedAlbumSong}
              onSelectAlbum={setSelectedAlbum}
              onSelectSong={setSelectedAlbumSong}
              searchQuery={albumQuery}
              sortDirection={albumSort}
            />
          )}
          {activeTab === "playlist" && (
            <PlaylistTab
              selectedPlaylist={selectedPlaylist}
              onSelect={setSelectedPlaylist}
              searchQuery={playlistQuery}
              sortDirection={playlistSort}
            />
          )}
        </div>

        <div style={styles.actions}>
          <button
            style={{
              ...styles.actionButton,
              ...(hasSelectionForTab ? {} : styles.actionButtonDisabled),
            }}
            disabled={!hasSelectionForTab}
            onClick={async () => {
              const added = await handleAddToQueue();
              if (added) {
                notify("Added to Queue");
              }
            }}
          >
            Add to Queue
          </button>
          {showLoadButton && (
            <button
              style={styles.actionButton}
              onClick={async () => {
                await handleLoad();
                notify("Queue Loaded");
              }}
            >
              Load
            </button>
          )}
          <button
            style={{
              ...styles.actionButton,
              ...(canAddToPlaylist ? {} : styles.actionButtonDisabled),
            }}
            disabled={!canAddToPlaylist}
            onClick={() => setIsPlaylistPickerOpen(true)}
          >
            Add to Playlist
          </button>
        </div>

        {isPlaylistPickerOpen && (
          <PlaylistPickerModal
            onClose={() => setIsPlaylistPickerOpen(false)}
            onPick={handlePickPlaylist}
          />
        )}
      </div>
    );
  },
);

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "12px",
    height: "560px",
    width: "460px",
    background: "var(--color-surface)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-ui)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 4px",
  },
  headerDecor: {
    fontSize: "11px",
    color: "var(--color-text-muted)",
  },
  headerTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "var(--color-text)",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "var(--color-text-muted)",
    fontSize: "13px",
    cursor: "pointer",
  },
  tabBar: {
    display: "flex",
    gap: "6px",
  },
  tabButton: {
    flex: 1,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "6px",
    fontSize: "12px",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },
  tabButtonActive: {
    background: "var(--color-primary)",
    color: "var(--color-background)",
  },
  content: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  actionButton: {
    flex: 1,
    background: "var(--color-surface-raised)",
    border: "var(--pixel-border) solid var(--color-border)",
    borderRadius: "999px",
    padding: "8px",
    fontSize: "12px",
    color: "var(--color-text)",
    cursor: "pointer",
  },
  actionButtonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};
