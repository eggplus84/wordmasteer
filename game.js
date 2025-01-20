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

    // Initialize game state from session storage
    function initializeGame() {
        const storedPlayers = JSON.parse(sessionStorage.getItem('gamePlayers') || '[]');
        players = storedPlayers;
        
        // Initialize scores and hangman states
        players.forEach(player => {
            scores[player] = 0;
            hangmanStates[player] = 0;
        });

        // Clear used words
        usedWords.clear();
        updateUsedWordsList();

        updatePlayersDisplay();
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

    async function displayNewWord() {
        // Show loading state
        wordDisplay.innerHTML = '<span class="loading">Loading new word...</span>';
        
        try {
            // Get random word from dictionary
            currentWord = await getRandomWord();
            console.log('Current word set to:', currentWord); // Debug log
            
            // Select random letter position to highlight
            highlightedIndex = Math.floor(Math.random() * currentWord.length);
            highlightedLetter = currentWord[highlightedIndex];

            // Display word with highlighted letter
            const displayHTML = currentWord.split('').map((letter, index) => {
                return `<span class="${index === highlightedIndex ? 'highlighted' : ''}">${letter}</span>`;
            }).join('');
            
            console.log('Display HTML:', displayHTML); // Debug log
            wordDisplay.innerHTML = displayHTML;

            // Update instruction
            document.querySelector('.instruction').textContent = 
                `Type a word that starts with the letter "${highlightedLetter}"`;
        } catch (error) {
            console.error('Error displaying new word:', error);
            wordDisplay.innerHTML = '<span class="error">Error loading word. Please try again.</span>';
            // Retry after a short delay
            setTimeout(() => displayNewWord(), 2000);
        }
    }

    function startTimer() {
        timeRemaining = TIMER_DURATION;
        if (timer) clearInterval(timer);
        
        timeLeft.textContent = timeRemaining;
        
        timer = setInterval(() => {
            timeRemaining--;
            timeLeft.textContent = timeRemaining;
            
            // Add warning class when time is running low
            if (timeRemaining <= 5) {
                timeLeft.classList.add('warning');
            } else {
                timeLeft.classList.remove('warning');
            }
            
            if (timeRemaining <= 0) {
                clearInterval(timer);
                handleError(players[currentPlayerIndex], "Time's up!");
                nextTurn();
            }
        }, 1000);
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

    function addScore(player, points) {
        scores[player] += points;
        updatePlayersDisplay();
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

    function nextTurn() {
        // Move to next player
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        updatePlayersDisplay();

        // Reset input and start new round
        wordInput.value = '';
        displayNewWord();
        startTimer();
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
    displayNewWord();
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