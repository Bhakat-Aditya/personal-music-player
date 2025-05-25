const baseUrl = window.location.href.includes('github.io')
    ? '/personal-music-player/'
    : '/';


// Global variables
let currentSong = new Audio();
let songs = [];
let currFolder;
let isAutoPlay = false;
let lastVolume = 1.0;

// Utility function to format time
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

// Fetch songs from a folder
async function getSongs(folder) {
    currFolder = folder;
    try {
        let response = await fetch(`${baseUrl}${folder}/`);
        let text = await response.text();
        let div = document.createElement("div");
        div.innerHTML = text;
        let as = div.getElementsByTagName("a");
        songs = [];

        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith(".mp3")) {
                songs.push(element.href.split(`/${folder}/`)[1]);
            }
        }

        // Update the song list in the library
        let songUL = document.querySelector(".songlist ul");
        songUL.innerHTML = "";

        for (const song of songs) {
            const songName = decodeURIComponent(song.replaceAll("%20", " "));
            songUL.innerHTML += `
                <li>
                    <div class="songcardlib">
                        <div class="songdetails">
                            ${songName}
                        </div>
                        <div class="libplay">
                            <img src="${baseUrl}img/play1.svg" alt="Play">
                        </div>
                    </div>
                </li>`;
        }

        // Attach event listeners to each song in the library
        Array.from(document.querySelectorAll(".songlist li")).forEach((e, index) => {
            e.addEventListener("click", () => {
                playMusic(songs[index]);
                updateActiveSong(index);
            });
        });

        return songs;
    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

// Play a specific track
function playMusic(track, pause = false) {
    currentSong.src = `${baseUrl}${currFolder}/${track}`;
    document.getElementById("song-info").textContent = decodeURIComponent(track.replaceAll("%20", " "));
    document.getElementById("song-time").textContent = "00:00 / 00:00";

    if (!pause) {
        currentSong.play()
            .then(() => {
                document.getElementById("play").src = `${baseUrl}img/pause.svg`;
            })
            .catch(error => {
                console.error("Playback failed:", error);
            });
    }
}

// Update the active song in the library
function updateActiveSong(index) {
    const allSongs = document.querySelectorAll(".songlist li");
    allSongs.forEach(song => song.classList.remove("active"));

    if (index >= 0 && index < allSongs.length) {
        allSongs[index].classList.add("active");
    }
}

// Display all albums
async function displayAlbums() {
    try {
        let response = await fetch(`${baseUrl}songs/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let text = await response.text();

        // Create a parser to extract links
        let parser = new DOMParser();
        let htmlDoc = parser.parseFromString(text, 'text/html');
        let links = htmlDoc.getElementsByTagName('a');

        let cardContainer = document.querySelector(".cardContainer");
        if (!cardContainer) {
            console.error("Card container not found");
            return;
        }
        cardContainer.innerHTML = ""; // Clear existing content

        for (let link of links) {
            let href = link.href;
            if (!href) continue;

            // Skip non-folder links and hidden files
            if (!href.includes('/songs/') || href.includes('.htaccess')) continue;

            // Extract just the folder name
            let folderName = href.split('/songs/')[1].replace('/', '');
            if (!folderName) continue;

            try {
                // Fetch album info
                let infoResponse = await fetch(`/songs/${folderName}/info.json`);
                if (!infoResponse.ok) {
                    // If no info.json, create a basic card
                    cardContainer.innerHTML += `
            <div class="card" data-folder="${baseUrl}songs/${folderName}">
                <div class="songimg">
                    <img src="${baseUrl}songs/${folderName}/cover.jpg" alt="${info.title}" onerror="this.src='${baseUrl}img/music.svg'">
                </div>
                            <div class="playlistname">${folderName}</div>
                            <div class="playlistdescription">Music collection</div>
                        </div>`;
                    continue;
                }

                let info = await infoResponse.json();

                // Create album card
                cardContainer.innerHTML += `
                    <div class="card" data-folder="songs/${folderName}">
                        <div class="songimg">
                            <img src="${baseUrl}songs/${folderName}/cover.jpg" alt="${info.title}" onerror="this.src='${baseUrl}img/music.svg'">
                        </div>
                        <div class="playlistname">${info.title}</div>
                        <div class="playlistdescription">${info.description}</div>
                    </div>`;
            } catch (error) {
                console.error(`Error processing ${folderName}:`, error);
                // Fallback card if there's an error
                cardContainer.innerHTML += `
                    <div class="card" data-folder="songs/${folderName}">
                        <div class="songimg">
                            <img src="img/music.svg" alt="${folderName}">
                        </div>
                        <div class="playlistname">${folderName}</div>
                        <div class="playlistdescription">Music collection</div>
                    </div>`;
            }
        }

        // Add event listeners to cards
        Array.from(document.querySelectorAll(".card")).forEach(card => {
            card.addEventListener("click", async () => {
                const folder = card.dataset.folder;
                songs = await getSongs(folder);
                if (songs.length > 0) {
                    playMusic(songs[0]);
                    updateActiveSong(0);
                }

                // Close library on mobile
                if (window.innerWidth <= 768) {
                    document.querySelector(".library").classList.remove("active");
                }
            });
        });
    } catch (error) {
        console.error("Failed to display albums:", error);
        // Show error message to user
        const cardContainer = document.querySelector(".cardContainer");
        if (cardContainer) {
            cardContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to load albums. Please check:</p>
                    <ol>
                        <li>Your server is running</li>
                        <li>You have a 'songs' folder in your root directory</li>
                        <li>The folder contains subfolders with music</li>
                    </ol>
                </div>`;
        }
    }
}

// Initialize the music player
async function initializePlayer() {
    // Load initial songs and display albums
    try {
        await displayAlbums();

        if (songs.length === 0) {
            await getSongs("songs/alan-walker");
        }

        if (songs.length > 0) {
            playMusic(songs[0], true);
            updateActiveSong(0);
        }
    } catch (error) {
        console.error("Initialization error:", error);
    }

    // Player controls event listeners
    document.getElementById("play").addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
                .then(() => {
                    document.getElementById("play").src = `${baseUrl}img/pause.svg`;
                })
                .catch(error => {
                    console.error("Playback failed:", error);
                });
        } else {
            currentSong.pause();
            document.getElementById("play").src = `${baseUrl}img/play1.svg`;
        }
    });

    // Time update listener
    currentSong.addEventListener("timeupdate", () => {
        document.getElementById("song-time").textContent =
            `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;

        const progressPercent = (currentSong.currentTime / currentSong.duration) * 100;
        document.querySelector(".seekbar-progress").style.width = `${progressPercent}%`;
    });

    // Seekbar click handler
    document.querySelector(".seekbar-container").addEventListener("click", (e) => {
        const seekbar = document.querySelector(".seekbar-container");
        const percent = (e.offsetX / seekbar.clientWidth) * 100;
        document.querySelector(".seekbar-progress").style.width = `${percent}%`;
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Previous button
    document.getElementById("previous").addEventListener("click", () => {
        if (songs.length === 0) return;

        currentSong.pause();
        const currentIndex = songs.indexOf(currentSong.src.split("/").pop());
        const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
        playMusic(songs[prevIndex]);
        updateActiveSong(prevIndex);
    });

    // Next button
    document.getElementById("next").addEventListener("click", () => {
        if (songs.length === 0) return;

        currentSong.pause();
        const currentIndex = songs.indexOf(currentSong.src.split("/").pop());
        const nextIndex = (currentIndex + 1) % songs.length;
        playMusic(songs[nextIndex]);
        updateActiveSong(nextIndex);
    });

    // Volume control implementation
    const volumeSlider = document.querySelector(".volume-slider");
    const volumeIcon = document.querySelector(".volume-controls img");

    // Set initial volume
    currentSong.volume = lastVolume;
    volumeSlider.value = lastVolume * 100;

    volumeSlider.addEventListener("input", (e) => {
        const volumeValue = e.target.value / 100;
        currentSong.volume = volumeValue;
        lastVolume = volumeValue;

        // Update icon
        volumeIcon.src = volumeValue === 0 ? `${baseUrl}img/mute.svg` : `${baseUrl}img/volume.svg`;
    });

    // Mute/unmute functionality
    volumeIcon.addEventListener("click", () => {
        if (currentSong.volume > 0) {
            // Mute
            lastVolume = currentSong.volume;
            currentSong.volume = 0;
            volumeSlider.value = 0;
            volumeIcon.src = `${baseUrl}img/mute.svg`;
        } else {
            // Unmute
            currentSong.volume = lastVolume;
            volumeSlider.value = lastVolume * 100;
            volumeIcon.src = `${baseUrl}img/volume.svg`;
        }
    });

    // Song ended handler
    currentSong.addEventListener("ended", () => {
        if (isAutoPlay) {
            document.getElementById("next").click();
        } else {
            document.getElementById("play").src = `${baseUrl}img/play1.svg`;
        }
    });

    // Auto-play toggle
    document.getElementById("toggleAutoPlay").addEventListener("click", () => {
        isAutoPlay = !isAutoPlay;
        const btn = document.getElementById("toggleAutoPlay");
        if (isAutoPlay) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Mobile menu toggle
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".library").classList.add("active");
    });

    // Close mobile menu
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".library").classList.remove("active");
    });
}

// Initialize the player when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializePlayer);