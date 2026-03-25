import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const allSongs = [
            { id: 1, title: "Midnight City", artist: "M83", album: "Hurry Up", duration: "4:03", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
            { id: 2, title: "Electric Love", artist: "BØRNS", album: "Dopamine", duration: "3:38", cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
            { id: 3, title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: "3:20", cover: "https://images.unsplash.com/photo-1619983081563-430f63602796?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
            { id: 4, title: "Starboy", artist: "The Weeknd", album: "Starboy", duration: "3:50", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
            { id: 5, title: "Heat Waves", artist: "Glass Animals", album: "Dreamland", duration: "3:58", cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
            { id: 6, title: "Save Your Tears", artist: "The Weeknd", album: "After Hours", duration: "3:35", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
            { id: 7, title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: "3:23", cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
            { id: 10, title: "Nightcall", artist: "Kavinsky", album: "OutRun", duration: "4:18", cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=100", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" }
        ];

        let playlists = [{ id: 'favs', name: 'Mis Favoritos', songs: [], cover: null, isReadOnly: false }];
        const publicPlaylists = [
            { id: 'public-euphoria', name: 'Euphoria Mix', songs: [1, 3, 10], cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300', isPublic: true, isReadOnly: true }
        ];

        let currentView = 'inicio', activePlaylistId = null, currentSongIndex = -1, isPlaying = false;
        let isShuffle = false, isRepeat = false;
        let currentPlaylistContext = [], selectedCoverBase64 = null, editingPlaylistId = null;
        let currentPlayingSongId = null;
        let db, auth, user, appId;
        let navigationHistory = [{ view: 'inicio', playlistId: null }], historyIndex = 0;

        const audio = document.getElementById('audio-player');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const progressBar = document.getElementById('progress-bar');
        const progressContainer = document.getElementById('progress-container');
        const volumeSlider = document.getElementById('volume-slider');
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');
        const shuffleBtn = document.getElementById('shuffle-btn');
        const repeatBtn = document.getElementById('repeat-btn');
        const searchInput = document.getElementById('search-input');
        const internalSearchInput = document.getElementById('playlist-internal-search');

        // Modales y CRUD
        window.showPlaylistModal = (pl = null) => {
            const overlay = document.getElementById('modal-overlay');
            const title = document.getElementById('modal-title');
            const nameInput = document.getElementById('playlist-name-input');
            const deleteBtn = document.getElementById('delete-playlist-btn');
            const preview = document.getElementById('playlist-preview');
            const dropZone = document.getElementById('drop-zone');

            overlay.classList.remove('hidden');
            if (pl) {
                editingPlaylistId = pl.id;
                title.innerText = "Editar Playlist";
                nameInput.value = pl.name;
                deleteBtn.classList.remove('hidden');
                deleteBtn.onclick = () => confirmDeletePlaylist(pl.id);
                if (pl.cover) { preview.src = pl.cover; preview.style.display = 'block'; dropZone.style.display = 'none'; }
                else { preview.style.display = 'none'; dropZone.style.display = 'flex'; }
            } else {
                editingPlaylistId = null;
                title.innerText = "Nueva Playlist";
                nameInput.value = "";
                deleteBtn.classList.add('hidden');
                preview.style.display = 'none';
                dropZone.style.display = 'flex';
            }
            selectedCoverBase64 = pl ? pl.cover : null;
        };

        window.closePlaylistModal = () => document.getElementById('modal-overlay').classList.add('hidden');

        window.confirmDeletePlaylist = (id) => {
            const confirmOverlay = document.getElementById('confirm-overlay');
            const confirmBtn = document.getElementById('confirm-delete-action-btn');
            confirmOverlay.classList.remove('hidden');
            confirmBtn.onclick = () => deletePlaylist(id);
        };

        window.closeConfirmModal = () => document.getElementById('confirm-overlay').classList.add('hidden');

        window.savePlaylist = async () => {
            const name = document.getElementById('playlist-name-input').value.trim();
            if (!name) return;
            if (editingPlaylistId) {
                const idx = playlists.findIndex(p => p.id === editingPlaylistId);
                if (idx !== -1) { playlists[idx].name = name; playlists[idx].cover = selectedCoverBase64; }
            } else {
                playlists.push({ id: 'pl-' + Date.now(), name: name, songs: [], cover: selectedCoverBase64, isReadOnly: false });
            }
            await savePlaylists();
            closePlaylistModal();
            updateUI(true);
        };

        const deletePlaylist = async (id) => {
            if (id === 'favs') return;
            playlists = playlists.filter(p => p.id !== id);
            await savePlaylists();
            closeConfirmModal();
            closePlaylistModal();
            switchView('inicio');
        };

        document.getElementById('file-input').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                selectedCoverBase64 = event.target.result;
                const preview = document.getElementById('playlist-preview');
                preview.src = selectedCoverBase64;
                preview.style.display = 'block';
                document.getElementById('drop-zone').style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        // Firebase
        const initFirebase = async () => {
            const firebaseConfig = JSON.parse(window.__firebase_config);
            const app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'neostream-player';
            if (window.__initial_auth_token) await signInWithCustomToken(auth, window.__initial_auth_token);
            else await signInAnonymously(auth);
            onAuthStateChanged(auth, (u) => { if (u) { user = u; document.getElementById('user-display-name').innerText = user.isAnonymous ? 'Invitado' : user.displayName || 'Usuario'; setupDataListeners(); } });
        };

        const setupDataListeners = () => {
            const playlistsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'user_playlists');
            onSnapshot(playlistsRef, (snap) => {
                if (snap.exists()) { playlists = JSON.parse(snap.data().json); updateUI(true); }
                else savePlaylists();
            });
        };

        const savePlaylists = async () => {
            if (!user) return;
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'user_playlists'), { json: JSON.stringify(playlists) });
        };

        // Navegacion de vistas
        window.switchView = (viewId, playlistId = null, isNavigating = false) => {
            if (!isNavigating) {
                if (currentView === viewId && activePlaylistId === playlistId) return;
                navigationHistory = navigationHistory.slice(0, historyIndex + 1);
                navigationHistory.push({ view: viewId, playlistId: playlistId });
                historyIndex = navigationHistory.length - 1;
            }
            currentView = viewId;
            activePlaylistId = playlistId;
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.sidebar-item').forEach(v => v.classList.remove('active', 'text-slate-400'));
            const targetView = document.getElementById(`view-${viewId}`);
            if (targetView) targetView.classList.add('active');
            const navItem = document.getElementById(`nav-${viewId}`);
            if (navItem) navItem.classList.add('active');
            document.getElementById('search-bar-container').classList.toggle('hidden', viewId !== 'buscar');
            updateUI(true);
        };

        window.goBack = () => { if (historyIndex > 0) { historyIndex--; const prev = navigationHistory[historyIndex]; switchView(prev.view, prev.playlistId, true); } };
        window.goForward = () => { if (historyIndex < navigationHistory.length - 1) { historyIndex++; const next = navigationHistory[historyIndex]; switchView(next.view, next.playlistId, true); } };

        const updateUI = (full = false) => {
            updateSidebar();
            if (currentView === 'inicio') renderSongs(allSongs.slice(0, 5), 'playlist-container-inicio');
            if (currentView === 'biblioteca') renderLibrary();
            if (currentView === 'playlist-detail') renderPlaylistDetail(activePlaylistId);
            if (currentView === 'buscar') renderSongs(allSongs.filter(s => s.title.toLowerCase().includes(searchInput.value.toLowerCase())), 'search-results');
            updateNavBtns();
        };

        const updateSidebar = () => {
            const container = document.getElementById('sidebar-playlists');
            container.innerHTML = playlists.map(pl => `
                <div class="sidebar-item p-2 px-3 rounded-lg cursor-pointer flex items-center justify-between group transition ${activePlaylistId === pl.id ? 'active' : 'text-slate-400'} text-sm truncate" onclick="switchView('playlist-detail', '${pl.id}')">
                    <span class="truncate">${pl.name}</span>
                </div>`).join('');
        };

        const renderSongs = (songList, containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = songList.map((song, idx) => {
                const isNowPlaying = song.id === currentPlayingSongId;
                return `
                <div class="song-row flex items-center gap-4 px-4 py-3 rounded-md transition cursor-pointer group ${isNowPlaying ? 'is-playing-row' : ''}" onclick="playFromList('${songList.map(s => s.id).join(',')}', ${idx})">
                    <span class="w-4 text-xs text-slate-500 index-col">${isNowPlaying ? '<i class="fas fa-volume-up text-xs"></i>' : idx + 1}</span>
                    <img src="${song.cover}" class="w-10 h-10 rounded">
                    <div class="flex-1 truncate"><p class="text-sm font-bold text-white song-title">${song.title}</p><p class="text-xs text-slate-400">${song.artist}</p></div>
                    <span class="text-xs text-slate-500 font-mono">${song.duration}</span>
                </div>`;
            }).join('');
        };

        const renderLibrary = () => {
            const container = document.getElementById('library-grid');
            container.innerHTML = playlists.map(pl => `
                <div class="bg-slate-800/40 p-4 rounded-xl hover:bg-slate-800 transition cursor-pointer" onclick="switchView('playlist-detail', '${pl.id}')">
                    <div class="aspect-square bg-slate-700 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        ${pl.cover ? `<img src="${pl.cover}" class="w-full h-full object-cover">` : `<i class="fas fa-music text-4xl text-slate-600"></i>`}
                    </div>
                    <h3 class="font-bold text-sm truncate">${pl.name}</h3>
                    <p class="text-xs text-slate-500 mt-1">${pl.songs.length} canciones</p>
                </div>`).join('');
        };

        const renderPlaylistDetail = (id) => {
            const pl = [...playlists, ...publicPlaylists].find(p => p.id === id);
            if (!pl) return;
            document.getElementById('detail-playlist-name').innerText = pl.name;
            document.getElementById('detail-playlist-info').innerText = `${pl.songs.length} canciones`;
            const artContainer = document.getElementById('detail-playlist-art-container');
            artContainer.innerHTML = pl.cover ? `<img src="${pl.cover}" class="w-full h-full object-cover">` : `<i class="fas fa-music"></i>`;

            const plSongs = pl.songs.map(sid => allSongs.find(s => s.id === sid)).filter(Boolean);
            renderSongs(plSongs, 'playlist-detail-songs');

            document.getElementById('edit-playlist-btn').classList.toggle('hidden', pl.isReadOnly);
            document.getElementById('edit-playlist-btn').onclick = () => showPlaylistModal(pl);
            document.getElementById('playlist-add-section').classList.toggle('hidden', pl.isReadOnly);

            if (!pl.isReadOnly) {
                renderRecommendations(pl);
            }
        };

        const renderRecommendations = (pl) => {
            const container = document.getElementById('recommendations-container');
            const available = allSongs.filter(s => !pl.songs.includes(s.id));
            const shuffled = [...available].sort(() => 0.5 - Math.random());
            const recommendations = shuffled.slice(0, 3);

            container.innerHTML = recommendations.map(song => `
                <div class="flex items-center gap-4 px-4 py-2 rounded-md hover:bg-white/5 group transition">
                    <img src="${song.cover}" class="w-10 h-10 rounded">
                    <div class="flex-1 truncate">
                        <p class="text-sm font-bold text-white">${song.title}</p>
                        <p class="text-xs text-slate-500">${song.artist}</p>
                    </div>
                    <button onclick="addSongToPlaylist('${pl.id}', ${song.id})" class="text-xs border border-slate-700 text-slate-300 px-4 py-1.5 rounded-full hover:border-white hover:text-white transition font-bold">Añadir</button>
                </div>
            `).join('');

            if (recommendations.length === 0) {
                container.innerHTML = '<p class="text-xs text-slate-500 px-4 italic">No hay más recomendaciones disponibles por ahora.</p>';
            }
        };

        window.playFromList = (idsStr, idx) => {
            const ids = idsStr.split(',').map(Number);
            currentPlaylistContext = ids.map(id => allSongs.find(s => s.id === id)).filter(Boolean);
            loadSong(idx);
        };

        window.playPlaylistFromTop = () => {
            const pl = [...playlists, ...publicPlaylists].find(p => p.id === activePlaylistId);
            if (pl && pl.songs.length > 0) {
                playFromList(pl.songs.join(','), 0);
            }
        };

        const safePlay = async () => {
            try {
                await audio.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause text-xs"></i>';
                isPlaying = true;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Playback error:", err);
                }
            }
        };

        const loadSong = async (idx) => {
            if (idx < 0 || idx >= currentPlaylistContext.length) return;
            currentSongIndex = idx;
            const song = currentPlaylistContext[idx];

            currentPlayingSongId = song.id;
            document.getElementById('curr-track-art-container').innerHTML = `<img src="${song.cover}" class="w-full h-full object-cover">`;
            document.getElementById('curr-track-title').innerText = song.title;
            document.getElementById('curr-track-artist').innerText = song.artist;

            audio.pause();
            audio.src = song.url;
            audio.load();
            updateUI();

            await safePlay();
        };

        const checkRepeatAndAction = async () => {
            if (isRepeat && currentSongIndex !== -1) {
                audio.currentTime = 0;
                await safePlay();
                return true;
            }
            return false;
        };

        const playNext = async () => {
            if (await checkRepeatAndAction()) return;

            if (isShuffle) {
                const nextIdx = Math.floor(Math.random() * currentPlaylistContext.length);
                loadSong(nextIdx);
                return;
            }
            if (currentSongIndex < currentPlaylistContext.length - 1) {
                loadSong(currentSongIndex + 1);
            } else {
                loadSong(0);
            }
        };

        const playPrev = async () => {
            if (await checkRepeatAndAction()) return;

            if (audio.currentTime > 3) {
                audio.currentTime = 0;
                await safePlay();
            } else if (currentSongIndex > 0) {
                loadSong(currentSongIndex - 1);
            } else {
                loadSong(currentPlaylistContext.length - 1);
            }
        };

        playPauseBtn.onclick = async () => {
            if (!audio.src) return;
            if (isPlaying) {
                audio.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play ml-0.5 text-xs"></i>';
                isPlaying = false;
            } else {
                await safePlay();
            }
        };

        shuffleBtn.onclick = () => {
            isShuffle = !isShuffle;
            shuffleBtn.classList.toggle('control-btn-active', isShuffle);
        };

        repeatBtn.onclick = () => {
            isRepeat = !isRepeat;
            repeatBtn.classList.toggle('control-btn-active', isRepeat);
        };

        nextBtn.onclick = playNext;
        prevBtn.onclick = playPrev;

        volumeSlider.oninput = (e) => {
            audio.volume = e.target.value;
        };

        progressContainer.onclick = (e) => {
            if (!audio.duration) return;
            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pos * audio.duration;
        };

        audio.ontimeupdate = () => {
            if (audio.duration) {
                progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
                document.getElementById('curr-time').innerText = formatTime(audio.currentTime);
                document.getElementById('total-time').innerText = formatTime(audio.duration);
            }
        };

        audio.onended = async () => {
            if (isRepeat) {
                audio.currentTime = 0;
                await safePlay();
            } else {
                await playNext();
            }
        };

        const updateNavBtns = () => {
            document.getElementById('btn-back').disabled = historyIndex === 0;
            document.getElementById('btn-forward').disabled = historyIndex === navigationHistory.length - 1;
        };

        const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

        searchInput.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allSongs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
            renderSongs(filtered, 'search-results');
        };

        internalSearchInput.oninput = (e) => {
            const q = e.target.value.toLowerCase();
            const pl = playlists.find(p => p.id === activePlaylistId);
            if (!pl || !q) { document.getElementById('add-songs-suggestions').innerHTML = ''; return; }
            const filtered = allSongs.filter(s => !pl.songs.includes(s.id) && s.title.toLowerCase().includes(q));
            document.getElementById('add-songs-suggestions').innerHTML = filtered.map(s => `
                <div class="flex items-center justify-between p-2 hover:bg-white/5 rounded">
                    <p class="text-sm">${s.title}</p>
                    <button onclick="addSongToPlaylist('${activePlaylistId}', ${s.id})" class="text-xs bg-violet-600 px-3 py-1 rounded-full">Añadir</button>
                </div>`).join('');
        };

        window.addSongToPlaylist = (plId, songId) => {
            const pl = playlists.find(p => p.id === plId);
            if (pl && !pl.songs.includes(songId)) {
                pl.songs.push(songId);
                savePlaylists();
                updateUI();
            }
        };

        window.onload = initFirebase;
