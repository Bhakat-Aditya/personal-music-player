document.addEventListener('DOMContentLoaded', function() {
    console.log("Aditya's Music Player Initialized");

    // Global variables
    let currentsong = new Audio();
    let songs = [];
    let currfolder = "";
    let isSeeking = false;
    let autoPlayNext = true;
    let isDragging = false;

    // DOM elements
    const elements = {
        playButton: document.getElementById("play"),
        previousButton: document.getElementById("previous"),
        nextButton: document.getElementById("next"),
        songInfo: document.getElementById("song-info"),
        songTime: document.getElementById("song-time"),
        seekbarContainer: document.querySelector(".seekbar-container"),
        seekbarProgress: document.querySelector(".seekbar-progress"),
        seekCircle: document.querySelector(".seek-circle"),
        volumeControl: document.querySelector(".volume-slider"),
        volumeIcon: document.querySelector(".volume-controls img"),
        songListUL: document.querySelector(".songlist ul"),
        cardContainer: document.querySelector(".cardContainer"),
        libraryPanel: document.querySelector(".library"),
        hamburger: document.querySelector(".hamburger"),
        closeButton: document.querySelector(".close"),
        toggleAutoPlayBtn: document.getElementById("toggleAutoPlay")
    };

    // Utility functions
    function secondsToMinutesSeconds(seconds) {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function getCurrentSongIndex() {
        if (!currentsong.src || songs.length === 0) return -1;
        const currentSongName = currentsong.src.split('/').pop();
        return songs.indexOf(currentSongName);
    }

    function playNextSong() {
        if (!autoPlayNext || songs.length === 0) return;
        
        const currentIndex = getCurrentSongIndex();
        if (currentIndex === -1) return;
        
        const nextIndex = (currentIndex + 1) % songs.length;
        playMusic(songs[nextIndex]);
    }

    function playPreviousSong() {
        if (songs.length === 0) return;
        
        const currentIndex = getCurrentSongIndex();
        if (currentIndex === -1) return;
        
        // If song is more than 3 seconds in, restart it
        if (currentsong.currentTime > 3) {
            currentsong.currentTime = 0;
            return;
        }
        
        const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
        playMusic(songs[prevIndex]);
    }

    // Fetch songs from a folder
    async function getsongs(folder) {
        try {
            currfolder = folder;
            const response = await fetch(`/${folder}/`);
            if (!response.ok) throw new Error(`Failed to fetch ${folder}`);
            
            const html = await response.text();
            const div = document.createElement("div");
            div.innerHTML = html;
            const anchors = div.getElementsByTagName("a");
            
            songs = Array.from(anchors)
                .filter(anchor => anchor.href.endsWith(".mp3"))
                .map(anchor => anchor.href.split(`/${folder}/`)[1])
                .filter(Boolean);

            updateSongListUI();
            return songs;
        } catch (error) {
            console.error("Error in getsongs:", error);
            updateSongListUI("Error loading songs");
            return [];
        }
    }

    // Update the song list UI
    function updateSongListUI(message = "") {
        if (!elements.songListUL) {
            console.error("Song list UL element not found");
            return;
        }
        
        if (message) {
            elements.songListUL.innerHTML = `<li>${message}</li>`;
            return;
        }
        
        if (songs.length === 0) {
            elements.songListUL.innerHTML = "<li>No songs found</li>";
            return;
        }
        
        elements.songListUL.innerHTML = songs.map(song => `
            <li>
                <div class="songcardlib">
                    <img src="img/music.svg" style="filter: invert(100%);" alt="">
                    <div class="songdetails">${decodeURIComponent(song.replaceAll("%20", " ").replace(".mp3", ""))}</div>
                    <div class="libplay">
                        <img src="img/play.svg" style="filter: invert(100%);" alt="">
                    </div>
                </div>
            </li>
        `).join("");
        
        // Add click handlers to each song
        elements.songListUL.querySelectorAll("li").forEach((li, index) => {
            li.addEventListener("click", () => {
                playMusic(songs[index]);
            });
        });
    }

    // Play music function
    function playMusic(track, pause = false) {
        if (!track || !songs.includes(track)) {
            console.error("Invalid track to play:", track);
            return;
        }
        
        try {
            currentsong.src = `/${currfolder}/${track}`;
            updateSongInfo(track);
            highlightCurrentSong(track);
            
            if (!pause) {
                currentsong.play()
                    .then(() => {
                        elements.playButton.src = "img/pause.svg";
                    })
                    .catch(error => {
                        console.error("Playback failed:", error);
                    });
            }
        } catch (error) {
            console.error("Error in playMusic:", error);
        }
    }

    // Update song info display
    function updateSongInfo(track) {
        elements.songInfo.textContent = decodeURIComponent(track).replace('.mp3', '');
    }

    // Highlight current song in playlist
    function highlightCurrentSong(track) {
        if (!elements.songListUL) return;
        
        const songItems = elements.songListUL.querySelectorAll("li");
        const currentSongName = decodeURIComponent(track);
        
        songItems.forEach(item => {
            const songName = item.querySelector(".songdetails").textContent.trim();
            if (songName === currentSongName.replace('.mp3', '')) {
                item.style.backgroundColor = "#535353";
                item.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                item.style.backgroundColor = "";
            }
        });
    }

    // Display all albums
    async function displayAlbums() {
        try {
            const response = await fetch(`/songs/`);
            if (!response.ok) throw new Error("Failed to fetch albums");
            
            const html = await response.text();
            const div = document.createElement("div");
            div.innerHTML = html;
            const anchors = div.getElementsByTagName("a");
            
            if (!elements.cardContainer) {
                console.error("Card container not found");
                return;
            }
            
            elements.cardContainer.innerHTML = "";
            
            for (const anchor of anchors) {
                if (anchor.href.includes("/songs/") && !anchor.href.endsWith("/songs/") && !anchor.href.includes(".htaccess")){
                    const folder = anchor.href.split("/").slice(-2)[0];
                    
                    try {
                        const infoResponse = await fetch(`/songs/${folder}/info.json`);
                        if (infoResponse.ok) {
                            const info = await infoResponse.json();
                            elements.cardContainer.innerHTML += `
                                <div data-folder="${folder}" class="card">
                                    <div class="songimg">
                                        <img src="/songs/${folder}/cover.jpg" alt="${info.title}">
                                    </div>
                                    <div class="playlistname">${info.title}</div>
                                    <div class="playlistdescription">${info.description}</div>
                                </div>`;
                        }
                    } catch (error) {
                        console.error(`Error loading info for ${folder}:`, error);
                    }
                }
            }
            
            // Add event listeners to cards
            elements.cardContainer.querySelectorAll(".card").forEach(card => {
                card.addEventListener("click", async () => {
                    const folder = card.dataset.folder;
                    await getsongs(`songs/${folder}`);
                    if (songs.length > 0) playMusic(songs[0]);
                });
            });
        } catch (error) {
            console.error("Error in displayAlbums:", error);
        }
    }

    // Update seekbar position and time
    function updateSeekbar() {
        if (!currentsong.src || isNaN(currentsong.duration)) return;
        
        const progressPercent = (currentsong.currentTime / currentsong.duration) * 100;
        elements.seekbarProgress.style.width = `${progressPercent}%`;
        elements.songTime.textContent = 
            `${secondsToMinutesSeconds(currentsong.currentTime)} / ${secondsToMinutesSeconds(currentsong.duration)}`;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Play/Pause button
        elements.playButton?.addEventListener("click", () => {
            if (currentsong.paused) {
                currentsong.play()
                    .then(() => {
                        elements.playButton.src = "img/pause.svg";
                    })
                    .catch(error => {
                        console.error("Playback failed:", error);
                    });
            } else {
                currentsong.pause();
                elements.playButton.src = "img/play.svg";
            }
        });
        
        // Previous button
        elements.previousButton?.addEventListener("click", playPreviousSong);
        
        // Next button
        elements.nextButton?.addEventListener("click", playNextSong);
        
        // Auto-play toggle
        elements.toggleAutoPlayBtn?.addEventListener("click", () => {
            autoPlayNext = !autoPlayNext;
            elements.toggleAutoPlayBtn.classList.toggle("active", autoPlayNext);
            localStorage.setItem('autoPlayNext', autoPlayNext);
        });
        
        // Seekbar functionality
        if (elements.seekbarContainer) {
            // Click to seek
            elements.seekbarContainer.addEventListener("click", (e) => {
                if (!currentsong.src || isNaN(currentsong.duration)) return;
                
                const rect = elements.seekbarContainer.getBoundingClientRect();
                const clickPosition = e.clientX - rect.left;
                const percent = (clickPosition / rect.width) * 100;
                
                currentsong.currentTime = (currentsong.duration * percent) / 100;
                updateSeekbar();
            });
            
            // Drag to seek
            elements.seekbarContainer.addEventListener("mousedown", () => {
                isDragging = true;
            });
            
            document.addEventListener("mousemove", (e) => {
                if (isDragging && currentsong.src && !isNaN(currentsong.duration)) {
                    const rect = elements.seekbarContainer.getBoundingClientRect();
                    let clickPosition = e.clientX - rect.left;
                    clickPosition = Math.max(0, Math.min(rect.width, clickPosition));
                    const percent = (clickPosition / rect.width) * 100;
                    
                    currentsong.currentTime = (currentsong.duration * percent) / 100;
                    updateSeekbar();
                }
            });
            
            document.addEventListener("mouseup", () => {
                isDragging = false;
            });
        }
        
        // Volume control
        elements.volumeControl?.addEventListener("input", (e) => {
            currentsong.volume = e.target.value / 100;
            if (currentsong.volume > 0) {
                elements.volumeIcon.src = "img/volume.svg";
            } else {
                elements.volumeIcon.src = "img/mute.svg";
            }
        });
        
        // Mute toggle
        elements.volumeIcon?.addEventListener("click", () => {
            if (currentsong.volume > 0) {
                currentsong.volume = 0;
                elements.volumeIcon.src = "img/mute.svg";
                elements.volumeControl.value = 0;
            } else {
                currentsong.volume = 0.7;
                elements.volumeIcon.src = "img/volume.svg";
                elements.volumeControl.value = 70;
            }
        });
        
        // Time update
        currentsong.addEventListener("timeupdate", updateSeekbar);
        
        // Song ended
        currentsong.addEventListener("ended", () => {
            if (autoPlayNext) {
                playNextSong();
            } else {
                elements.playButton.src = "img/play.svg";
            }
        });
        
        // Hamburger menu
        elements.hamburger?.addEventListener("click", () => {
            elements.libraryPanel.style.left = "0";
        });
        
        // Close library
        elements.closeButton?.addEventListener("click", () => {
            elements.libraryPanel.style.left = "-100%";
        });
    }

    // Initialize the application
    async function main() {
        try {
            // Load auto-play preference from localStorage
            const savedAutoPlay = localStorage.getItem('autoPlayNext');
            if (savedAutoPlay !== null) {
                autoPlayNext = savedAutoPlay === 'true';
                if (elements.toggleAutoPlayBtn) {
                    elements.toggleAutoPlayBtn.classList.toggle("active", autoPlayNext);
                }
            }
            
            // Set initial volume
            currentsong.volume = 0.7;
            if (elements.volumeControl) {
                elements.volumeControl.value = 70;
            }
            
            // Load initial content
            await getsongs("songs/english");
            await displayAlbums();
            
            // Setup all event listeners
            setupEventListeners();
            
            // Play first song (paused)
            if (songs.length > 0) {
                playMusic(songs[0], true);
            }
        } catch (error) {
            console.error("Initialization error:", error);
        }
    }

    // Start the application
    main();
});