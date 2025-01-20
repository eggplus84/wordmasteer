document.addEventListener('DOMContentLoaded', function() {
    const DICTIONARY_API_KEY = 'e3307e72-0917-4377-9065-034ce7f230da';
    const DICTIONARY_API_URL = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json/';
    
    const wordDisplay = document.querySelector('.vocabulary-word');
    const wordInput = document.getElementById('wordInput');
    const submitButton = document.getElementById('submitWord');
    const timeLeft = document.getElementById('timeLeft');
    const currentPlayerDisplay = document.querySelector('.current-player');
    const playersStatus = document.querySelector('.players-status');
    
    let currentWord = '';
    let highlightedLetter = '';
    let highlightedIndex = -1;
    let timer = null;
    let timeRemaining = 15;
    let players = [];
    let currentPlayerIndex = 0;
    let usedWords = new Map();
    let scores = {};
    let hangmanStates = {};
    const MAX_HANGMAN_TRIES = 6;
    const HANGMAN_STATES = [
        '🎯', // Start state
        '😃', // Head
        '😟', // Head worried
        '😨', // Head scared
        '😰', // Head very scared
        '😱', // Head terrified
        '💀'  // Game over
    ];
    const TIMER_DURATION = 15; // Changed from 30 to 15 seconds

    // Get game ID from session storage
    const gameId = sessionStorage.getItem('gameId');
    
    // Add function to sync game state
    function syncGameState() {
        // Get latest state from localStorage
        const storedPlayers = JSON.parse(localStorage.getItem(`game_${gameId}_players`) || '[]');
        const storedScores = JSON.parse(localStorage.getItem(`game_${gameId}_scores`) || '{}');
        const storedUsedWords = JSON.parse(localStorage.getItem(`game_${gameId}_usedWords`) || '[]');
        const storedCurrentPlayerIndex = parseInt(localStorage.getItem(`game_${gameId}_currentPlayerIndex`) || '0');
        const storedCurrentWord = localStorage.getItem(`game_${gameId}_currentWord`) || '';

        // Update local state
        players = storedPlayers;
        scores = storedScores;
        currentPlayerIndex = storedCurrentPlayerIndex;
        usedWords = new Map(storedUsedWords);
        if (storedCurrentWord && storedCurrentWord !== currentWord) {
            currentWord = storedCurrentWord;
            displayStoredWord(currentWord);
        }

        updatePlayersDisplay();
        updateUsedWordsList();
    }

    // Function to save game state
    function saveGameState() {
        localStorage.setItem(`game_${gameId}_players`, JSON.stringify(players));
        localStorage.setItem(`game_${gameId}_scores`, JSON.stringify(scores));
        localStorage.setItem(`game_${gameId}_usedWords`, JSON.stringify(Array.from(usedWords.entries())));
        localStorage.setItem(`game_${gameId}_currentPlayerIndex`, currentPlayerIndex.toString());
        localStorage.setItem(`game_${gameId}_currentWord`, currentWord);
    }

    // Display stored word without fetching new one
    function displayStoredWord(word) {
        currentWord = word;
        highlightedIndex = Math.floor(Math.random() * word.length);
        highlightedLetter = word[highlightedIndex];

        wordDisplay.innerHTML = word.split('').map((letter, index) => {
            return `<span class="${index === highlightedIndex ? 'highlighted' : ''}">${letter}</span>`;
        }).join('');

        document.querySelector('.instruction').textContent = 
            `Type a word that starts with the letter "${highlightedLetter}"`;
    }

    // Modify displayNewWord to save the word
    async function displayNewWord() {
        wordDisplay.innerHTML = '<span class="loading">Loading new word...</span>';
        
        try {
            currentWord = await getRandomWord();
            localStorage.setItem(`game_${gameId}_currentWord`, currentWord);
            
            highlightedIndex = Math.floor(Math.random() * currentWord.length);
            highlightedLetter = currentWord[highlightedIndex];

            const displayHTML = currentWord.split('').map((letter, index) => {
                return `<span class="${index === highlightedIndex ? 'highlighted' : ''}">${letter}</span>`;
            }).join('');
            
            wordDisplay.innerHTML = displayHTML;

            document.querySelector('.instruction').textContent = 
                `Type a word that starts with the letter "${highlightedLetter}"`;
        } catch (error) {
            console.error('Error displaying new word:', error);
            wordDisplay.innerHTML = '<span class="error">Error loading word. Please try again.</span>';
            setTimeout(() => displayNewWord(), 2000);
        }
    }

    // Add periodic sync
    setInterval(syncGameState, 1000); // Sync every second

    // Modify game state changes to save state
    function nextTurn() {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        saveGameState();
        updatePlayersDisplay();
        
        wordInput.value = '';
        if (currentPlayerIndex === 0) { // Only fetch new word when round completes
            displayNewWord();
        }
        startTimer();
    }

    // Update other functions to save state
    function addScore(player, points) {
        scores[player] += points;
        saveGameState();
        updatePlayersDisplay();
    }

    async function checkWord() {
        const submittedWord = wordInput.value.trim().toUpperCase();
        const currentPlayer = players[currentPlayerIndex];
        
        if (submittedWord === '') {
            alert('Please enter a word!');
            return;
        }

        // Check if the word matches the displayed vocabulary
        if (submittedWord === currentWord) {
            handleError(currentPlayer, 'You cannot use the displayed word!');
            return;
        }

        if (submittedWord[0] !== highlightedLetter) {
            alert(`Your word must start with the letter "${highlightedLetter}"!`);
            return;
        }

        if (usedWords.has(submittedWord)) {
            handleError(currentPlayer, 'This word has already been used!');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Checking...';

        // Validate word with dictionary API
        const isValid = await validateWord(submittedWord.toLowerCase());

        if (!isValid) {
            handleError(currentPlayer, 'Invalid word! Please enter a valid English word.');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit';
            return;
        }

        // Word is valid - add to used words and update score
        usedWords.set(submittedWord, currentPlayer);
        saveGameState();
        updateUsedWordsList();
        addScore(currentPlayer, 5);
        
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
        
        showSuccessMessage();
        nextTurn();
    }

    function handleError(player, message) {
        hangmanStates[player]++;
        updatePlayersDisplay();

        if (hangmanStates[player] >= MAX_HANGMAN_TRIES) {
            eliminatePlayer(player);
        } else {
            alert(`${message}\nWarning: ${MAX_HANGMAN_TRIES - hangmanStates[player]} tries left!`);
        }
    }

    function eliminatePlayer(player) {
        alert(`Game Over for ${player}! Too many mistakes!`);
        
        // Remove player from game
        const playerIndex = players.indexOf(player);
        players = players.filter(p => p !== player);
        
        // If eliminated player was current player, move to next
        if (playerIndex === currentPlayerIndex) {
            currentPlayerIndex = currentPlayerIndex % players.length;
        } else if (playerIndex < currentPlayerIndex) {
            currentPlayerIndex--;
        }

        // Check if game is over
        if (players.length < 2) {
            endGame();
        } else {
            updatePlayersDisplay();
        }
    }

    function endGame() {
        clearInterval(timer);
        const winner = players[0];
        const allPlayers = Object.keys(scores);
        const sortedPlayers = allPlayers.sort((a, b) => scores[b] - scores[a]);
        
        let message = 'Game Over!\n\nFinal Scores:\n';
        sortedPlayers.forEach(player => {
            message += `${player}: ${scores[player]} points\n`;
        });
        
        if (winner) {
            message += `\nWinner: ${winner}!`;
        }
        
        alert(message);
        window.location.href = 'index.html'; // Return to main menu
    }

    function showSuccessMessage() {
        const successMessages = [
            'Great word!',
            'Excellent!',
            'Well done!',
            'Perfect!',
            'Amazing!'
        ];
        const message = successMessages[Math.floor(Math.random() * successMessages.length)];
        alert(`${message} +5 points!`);
    }

    function updatePlayersDisplay() {
        playersStatus.innerHTML = players.map((player, index) => `
            <div class="player-badge ${index === currentPlayerIndex ? 'active' : ''}">
                <div class="player-info">
                    <span class="player-name">${player}</span>
                    <span class="player-score">Score: ${scores[player]}</span>
                </div>
                <div class="hangman-status">
                    <span class="hangman-state">${HANGMAN_STATES[hangmanStates[player]]}</span>
                    <span class="tries-text">${MAX_HANGMAN_TRIES - hangmanStates[player]} tries left</span>
                </div>
            </div>
        `).join('');
    }

    function updateUsedWordsList() {
        const usedWordsList = document.getElementById('usedWordsList');
        usedWordsList.innerHTML = '';
        
        // Convert Map to Array and sort by insertion order (most recent first)
        Array.from(usedWords.entries()).reverse().forEach(([word, player]) => {
            const wordElement = document.createElement('span');
            wordElement.className = 'used-word';
            wordElement.innerHTML = `
                <span class="player-initial">${player[0]}</span>: ${word}
            `;
            usedWordsList.appendChild(wordElement);
        });
    }

    async function validateWord(word) {
        try {
            const response = await fetch(`${DICTIONARY_API_URL}${word}?key=${DICTIONARY_API_KEY}`);
            const data = await response.json();
            
            // Check if the response contains valid dictionary entries
            return Array.isArray(data) && data.length > 0 && typeof data[0] !== 'string';
        } catch (error) {
            console.error('Dictionary API error:', error);
            return false;
        }
    }

    async function getRandomWord() {
        // List of common letters to start searching with
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const randomLetter = letters[Math.floor(Math.random() * letters.length)];
        
        try {
            console.log('Fetching word starting with:', randomLetter); // Debug log
            const response = await fetch(`${DICTIONARY_API_URL}${randomLetter}?key=${DICTIONARY_API_KEY}`);
            const data = await response.json();
            
            console.log('API Response:', data); // Debug log
            
            // Filter valid words (longer than 4 letters, no spaces or hyphens)
            const validWords = data.filter(entry => {
                if (!entry || typeof entry !== 'object') return false;
                const word = entry.hwi?.hw || ''; // Changed from meta.id to hwi.hw
                return word.length >= 4 && 
                       !word.includes(' ') && 
                       !word.includes('-') &&
                       !word.includes(':') &&
                       !word.includes('*');
            });

            console.log('Valid words found:', validWords.length); // Debug log

            if (validWords.length === 0) {
                console.log('No valid words found, retrying...'); // Debug log
                return await getRandomWord(); // Try again with different letter
            }

            // Get random word from filtered list
            const randomWord = validWords[Math.floor(Math.random() * validWords.length)];
            const finalWord = randomWord.hwi.hw.replace(/\*/g, '').toUpperCase();
            console.log('Selected word:', finalWord); // Debug log
            return finalWord;

        } catch (error) {
            console.error('Error fetching random word:', error);
            // Return a fallback word from a local list
            const fallbackWords = ['EXAMPLE', 'WELCOME', 'PROGRAM', 'COMPUTER', 'KEYBOARD'];
            return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
        }
    }

    // Event listeners
    submitButton.addEventListener('click', checkWord);
    wordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !submitButton.disabled) {
            checkWord();
        }
    });

    // Initialize game
    initializeGame();
    syncGameState(); // Initial sync
    if (currentWord) {
        displayStoredWord(currentWord);
    } else {
        displayNewWord();
    }
    startTimer();

    // Add bubbles to game page
    function createBubbles() {
        const container = document.body;
        const bubbleCount = 30;

        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            
            const size = Math.random() * 130 + 20;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            
            bubble.style.left = `${Math.random() * 100}%`;
            
            const duration = Math.random() * 17 + 8;
            bubble.style.animationDuration = `${duration}s`;
            
            bubble.style.animationDelay = `${Math.random() * 8}s`;
            
            bubble.style.opacity = (Math.random() * 0.4 + 0.1).toString();
            
            container.appendChild(bubble);
        }
    }

    createBubbles();
    setInterval(createBubbles, 15000);
}); 