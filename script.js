document.addEventListener('DOMContentLoaded', function() {
    const playerNameInput = document.getElementById('playerName');
    const addPlayerButton = document.getElementById('addPlayer');
    const startGameButton = document.getElementById('startGame');
    const gameLinkInput = document.getElementById('gameLink');
    const copyLinkButton = document.getElementById('copyLink');
    const playersList = document.getElementById('playersList');
    const currentPlayersCount = document.getElementById('currentPlayers');
    
    let players = [];
    const MIN_PLAYERS = 2;

    // Generate a unique game ID
    const gameId = generateGameId();
    const gameLink = generateGameLink();
    gameLinkInput.value = gameLink;

    // Check if user came from a shared link
    const urlParams = new URLSearchParams(window.location.search);
    const joinGameId = urlParams.get('game');

    if (joinGameId) {
        // User is joining an existing game
        console.log('Joining game:', joinGameId);
        document.querySelector('h1').textContent = 'Join Word Master Game';
        const joinMessage = document.createElement('p');
        joinMessage.className = 'join-message';
        joinMessage.textContent = 'You are joining an existing game';
        document.querySelector('.welcome-section').insertBefore(
            joinMessage, 
            document.querySelector('.player-setup')
        );
    }

    addPlayerButton.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        if (playerName === '') {
            alert('Please enter a player name');
            return;
        }
        
        if (players.includes(playerName)) {
            alert('This player name is already taken');
            return;
        }

        addPlayer(playerName);
        playerNameInput.value = '';
        playerNameInput.focus();
    });

    function addPlayer(name) {
        players.push(name);
        updatePlayersList();
        updateStartButton();
    }

    function removePlayer(name) {
        players = players.filter(player => player !== name);
        updatePlayersList();
        updateStartButton();
    }

    function updatePlayersList() {
        playersList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${player}
                <button class="remove-player" onclick="removePlayer('${player}')">✕</button>
            `;
            playersList.appendChild(li);
        });
        currentPlayersCount.textContent = players.length;
    }

    function updateStartButton() {
        startGameButton.disabled = players.length < MIN_PLAYERS;
    }

    startGameButton.addEventListener('click', () => {
        if (players.length < MIN_PLAYERS) {
            alert(`At least ${MIN_PLAYERS} players are required to start the game`);
            return;
        }
        startGame(players, joinGameId || gameId);
    });

    // Make removePlayer function available globally
    window.removePlayer = removePlayer;

    function generateGameId() {
        return Math.random().toString(36).substring(2, 15);
    }

    function generateGameLink() {
        // Use the specific URL instead of window.location
        const baseUrl = 'https://eggplus84.github.io/wordmasteer';
        const gameLink = `${baseUrl}?game=${gameId}`;
        return gameLink;
    }

    function startGame(playersList, gameId) {
        console.log(`Starting game with players:`, playersList);
        console.log(`Game ID: ${gameId}`);
        
        // Store game data in sessionStorage
        sessionStorage.setItem('gamePlayers', JSON.stringify(playersList));
        sessionStorage.setItem('gameId', gameId);
        
        // Redirect to game page
        window.location.href = 'game.html';
    }

    // Add this new code for creating bubbles
    function createBubbles() {
        const container = document.body;
        // Increase bubble count from 15 to 30
        const bubbleCount = 30;

        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            
            // Increase max size range from 20-100px to 20-150px
            const size = Math.random() * 130 + 20;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            
            // Random position
            bubble.style.left = `${Math.random() * 100}%`;
            
            // Increase animation duration range from 8-20s to 8-25s
            const duration = Math.random() * 17 + 8;
            bubble.style.animationDuration = `${duration}s`;
            
            // Add more randomness to delay
            bubble.style.animationDelay = `${Math.random() * 8}s`;
            
            // Add slight random opacity
            bubble.style.opacity = (Math.random() * 0.4 + 0.1).toString();
            
            container.appendChild(bubble);
        }
    }

    createBubbles();

    // Decrease interval from 20000ms to 15000ms for more frequent bubble creation
    setInterval(createBubbles, 15000);

    // Update the copy link functionality
    copyLinkButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(gameLink);
            copyLinkButton.textContent = 'Copied!';
            setTimeout(() => {
                copyLinkButton.textContent = 'Copy Link';
            }, 2000);
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            gameLinkInput.select();
            document.execCommand('copy');
            copyLinkButton.textContent = 'Copied!';
            setTimeout(() => {
                copyLinkButton.textContent = 'Copy Link';
            }, 2000);
        }
    });

    // Add click-to-select functionality for the game link input
    gameLinkInput.addEventListener('click', function() {
        this.select();
    });
}); 
