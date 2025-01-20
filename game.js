    // Remove this line from the constants section
    const currentPlayerDisplay = document.querySelector('.current-player');

    // Remove the displayCurrentPlayer function
    // function displayCurrentPlayer() {
    //     currentPlayerDisplay.textContent = `Current Player: ${players[currentPlayerIndex]}`;
    // }

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
        // Remove this line
        // displayCurrentPlayer();
    }

    function nextTurn() {
        // Move to next player
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        // Remove this line
        // displayCurrentPlayer();
        updatePlayersDisplay();

        // Reset input and start new round
        wordInput.value = '';
        displayNewWord();
        startTimer();
    }

    // Update eliminatePlayer function
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
            // Remove this line
            // displayCurrentPlayer();
        }
    }
