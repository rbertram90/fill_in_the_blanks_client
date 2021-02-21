/**
 * Class BlanksGame
 * 
 * The following is an outline of the messaging between the client and the server
 * and the key javascript functions that are called in the process.
 * 
 * Player loads game.php
 *  > game.loadConnectForm
 * 
 * Player completes form and submits
 *  > game.openConnection - should be called validate form?
 *  > game.createServerConnection - this is where the actual connection gets opened!
 * 
 * Player is connected to server
 *  > player_connected message sent to server
 *  > game.handleMessage is listening for WebSocket messages
 *  > connected_game_status message is sent back from server
 *  > player_connected message is sent back from server
 *  > user is either shown waiting to start game screen or config form if host
 *  > unless the game is already underway in which player could either see
 *    round judge or round play screens
 * 
 * Host starts game
 *  > start_game message is sent to server
 *  > answer_card_update message is sent to each player, dealing out cards
 *  > round_start message is sent to all players from server with details on judge and question
 *  > responsibility for generating this view then gets handed off to PlayerDeck component
 * 
 * Player chooses a card
 *  > cards_submit message sent to server
 *  > player_submitted message gets sent to all players
 * 
 * All players have submitted cards
 *  > round_judge message sent to all players
 *  > responsibility for generating this view then gets handed off to RoundSubmissions component
 * 
 * Winning card is picked (standard judging mode)
 *  > winner_picked sent to server
 *  > round_winner is sent to all players
 *  > countdown of 10 seconds to next round starts
 * 
 * Next round begins
 *  > answer_card_update is sent to each player to replace the cards played in the previous round
 *  > round_start message is sent to all players
 *  > game continues until a player has reached the winning score
 * 
 * Player reaches winning score
 *  > countdown of 10 seconds to next round has happened
 *  > game_won message sent to all players
 *  > the server should now be restarted to start a new game (todo: make a button to reset without stopping server!)
 * 
 */
function BlanksGame() {
    this.components = {};

    // Create outer wrapper
    this.parentElement = document.createElement('div');
    this.parentElement.id = 'blanks_game';
    document.body.appendChild(this.parentElement);

    // Connection to server
    this.socket = null;

    // Game variables
    this.player = null;
    this.playerList = [];
    this.currentJudge = null;
    this.clientIsGameHost = false;

    this.currentQuestion = {};

    this.winningScore = 5;
    this.winingScoreOptions = [3,4,5,6,7,8,9,10];

    this.maxTime = 120000; // default - 2 minutes
    this.maxTimeOptions = [0,30000,60000,90000,120000,180000,300000];

    this.allowCustomText = true;
    this.allowImages = false;

    // Initialise connection form
    this.connectForm = this.loadConnectForm();
    this.configForm = null;
}

BlanksGame.prototype.handleMessage = function(e) {
    var data = JSON.parse(e.data);
    var game = window.BlanksGameInstance;

    switch (data.type) {
        case 'connected_game_status':
            var username = game.connectForm.username.value;

            // Remove connect form from DOM
            game.connectForm.form.parentElement.removeChild(game.connectForm.form);
            game.connectForm = null;

            // Create player
            game.player = new Player(game, username);

            switch (data.game_status) {
                // Awaiting game start
                case 0:
                    if (data.player_is_host) {
                        // Show configure game options screen
                        window.BlanksGameInstance.configForm = game.loadConfigForm(data);
                    }
                    else {
                        // Show awaiting game start screen
                        game.loadAwaitGameStart();
                    }
                    break;
                // Round in progress
                // This is handled by resending the round_start message from server
                // case 1:
                //     break;

                // Round Judging
                // This is handled by resending the round_judge message from server
                // case 2:
                //    break;
            }
            break;

        case 'player_connected':
            // Check if the player that connected is local player
            // If they are game host then enable buttons
            if (data.host && data.playerName == game.player.username) {
                game.clientIsGameHost = true;
            }
            break;

        case 'start_game_fail':
            switch (data.errorType) {
                case 'more_players_needed':
                    document.getElementById('start_game_errors').innerHTML = '<p class="error message">' + t('Not enough players to start game') + '</p>';
                    break;
            }
            break;

        case 'answer_card_update':
            game.player.cards = data.cards;
            break;

        case 'round_start':
            if (game.configForm) {
                game.configForm = null;
            }

            game.allowCustomText = data.allowCustomText;
            game.allowImages = data.allowImages;
            game.parentElement.innerHTML = '';
            game.currentJudge = data.currentJudge ? data.currentJudge.username : null;
            game.currentQuestion = data.questionCard;
            game.currentQuestion.blanks = (game.currentQuestion.text.match(/____/g) || []).length;

            game.player.selectedCards = [];

            if (game.currentJudge == game.player.username) {
                game.loadJudgeWaitingScreen(data);
            }
            else {
                game.loadGameScreen(data);
            }
            break;

        case 'round_judge':
            game.parentElement.innerHTML = '';
            if (data.judgeMode == 1) { // GAME_JM_COMMITTEE
                var playerIsJudge = true; // Everyone's a judge
            }
            else {
                var playerIsJudge = game.currentJudge == game.player.username
            }
            game.loadJudgeScreen(data, playerIsJudge);
            break;

        case 'player_judged':
            game.getComponentInstance('playerList').triggerRedraw(data);
            break;

        case 'round_winner':
            document.getElementById('submission_' + data.card).className = 'selectable-wrapper winner';

            if (game.clientIsGameHost) {
                window.setTimeout(game.startNextRound, 10000);
            }

            var winnerHeading = document.createElement('h3');
            winnerHeading.className = 'round-winner-label';
            winnerHeading.innerHTML = '<strong>' + data.winner.username + '</strong> ' + t('is the round winner') + ': ';
            game.parentElement.appendChild(winnerHeading);

            game.getComponentInstance('playerList').redraw();

            var nextRoundWarning = document.createElement('span');
            nextRoundWarning.innerText = t('Next round starting in [time] seconds');
            nextRoundWarning.innerText = nextRoundWarning.innerText.replace('[time]', '10');
            winnerHeading.appendChild(nextRoundWarning);
            
            var timeToNextRound = 10;

            var refreshNextRound = function() {
                timeToNextRound--;
                var newText = t('Next round starting in [time] seconds');
                newText = newText.replace('[time]', timeToNextRound);
                nextRoundWarning.innerText = newText;

                if (timeToNextRound > 0) {
                    window.setTimeout(refreshNextRound, 1000);
                }
            };
            window.setTimeout(refreshNextRound, 1000);

            break;

        case 'game_reset':
            /*
            if (game.clientIsGameHost) {
                game.startGameButton.disabled = false;
            }
            */
            break;

        case 'duplicate_username':
            game.connectForm.errors.innerHTML = '<p class="error">' + t('Username already in use') + '</p>';
            break;

        case 'game_won':
            game.parentElement.innerHTML = '';
            game.loadResultsScreen(data);
            break;
    }

    // Main call to let the UI update itself!
    game.updateComponents(data);
};

/**
 * Helper function to get a game component that means only
 * one instances is created
 * 
 * @param {string} componentName
 */
BlanksGame.prototype.getComponentInstance = function(componentName) {
    var game = window.BlanksGameInstance;
    
    if (typeof game.components[componentName] === 'undefined') {
        switch (componentName) {
            case 'playerList':
                game.components[componentName] = new PlayerList(game, game.parentElement);
                break;
            case 'roundSubmissions':
                game.components[componentName] = new RoundSubmissions(game, game.parentElement);
                break;
            case 'playerDeck':
                game.components[componentName] = new PlayerDeck(game, game.parentElement);
                break;
            default:
                // Unknown component
                console.error('Failed to initialise component ' + componentName);
                break;
        }
    }
    
    return game.components[componentName];
};

/**
 * Create the connect to server form
 */
BlanksGame.prototype.loadConnectForm = function() {

    var username, host, port, default_icon;
    var helper = new DOMHelper();

    // Get last values
    if (lastConnection = window.localStorage.getItem('last_server_connection')) {
        lastConnection = JSON.parse(lastConnection);
        host = lastConnection.host;
        port = lastConnection.port;
        username = lastConnection.username;
        default_icon = lastConnection.icon;
        remember_me = true;
    }
    else {
        // Defaults
        host = 'localhost';
        port = 8080;
        username = 'player' + Date.now().toString().substr(-4);
        remember_me = false;
    }

    // Check if the host/port has been provided in URL
    if (window.location.search) {
        var searchParts = window.location.search.substring(1).split('&');
        for (var p = 0; p < searchParts.length; p++) {
            var varParts = searchParts[p].split('=');
            if (varParts[0] == 'host') {
                host = varParts[1];
            }
            if (varParts[0] == 'port') {
                port = varParts[1];
            }
        }
    }

    if (!default_icon) {
        default_icon = Math.floor(Math.random() * 20) + 1;
    }

    // Form
    var connectForm = helper.element({ tag:'form', id:'connect_form' });

    // Heading
    helper.element({ tag:'h2', text:t('Connect to game server'), parent:connectForm });

    // Placeholder for errors
    var errorWrapper = helper.div({ class:'errors', parent:connectForm });

    // Host
    var hostWrapper = helper.div({ class:'field', id:'field_host', parent:connectForm });
    var hostField = helper.textField({ label:t('Host server'), id:'connect_host', value:host, parent:hostWrapper });
    hostField.setAttribute('required', 'required');

    // Port
    var portWrapper = helper.div({ class:'field', id:'field_port', parent:connectForm });
    var portField = helper.textField({ label:t('Port'), id:'connect_port', value:port, parent:portWrapper });
    portField.setAttribute('required', 'required');
    portField.setAttribute('size', '4');

    // Username
    var usernameWrapper = helper.div({ class:'field', id:'field_username', parent:connectForm });
    var usernameField = helper.textField({ label:t('Username'), id:'username', value:username, parent:usernameWrapper });
    usernameField.setAttribute('required', 'required');

    // Remember me?
    var rememberMeWrapper = helper.div({ class:'field', id:'field_remember', parent:connectForm });
    var rememberMe = helper.element({ tag:'input', id:'remember_me', type:'checkbox', parent:rememberMeWrapper });
    helper.element({ tag:'label', for:'remember_me', text:t('Remember these details'), parent:rememberMeWrapper });
    if (remember_me) {
        rememberMe.checked = true;
    }

    // Icon
    var iconWrapper = helper.div({ class:'field', id:'field_icon', parent:connectForm });
    helper.element({ tag:'label', for:'icon', text:t('Player face'), parent:iconWrapper });
    var iconField = helper.element({ tag:'input', type:'hidden', name:'icon', value:default_icon, parent:iconWrapper });

    for (var i = 1; i <= 28; i++) {
        var icon = helper.element({ tag: 'img', src: '/images/player-icons/' + i + '.png', class: 'player-icon',
            alt: 'Player icon ' + i, data: { index:i } });
        if (i == default_icon) icon.className = 'player-icon selected';

        icon.addEventListener('click', function() {
            iconField.value = this.dataset.index;
            var elements = document.querySelectorAll('#field_icon img.player-icon');

            for (var e = 0; e < elements.length; e++) {
                elements[e].className = 'player-icon';
            }

            this.className = 'player-icon selected';
        });
        iconWrapper.appendChild(icon);
    }

    // Actions
    var actionsWrapper = helper.div({ class:'actions', parent:connectForm });
    var submitButton = helper.element({ tag:'button', id:'connect_button', type:'button', text:t('Connect'), parent:actionsWrapper });
    submitButton.addEventListener('click', this.openConnection);

    this.parentElement.appendChild(connectForm);

    // Return form fields for later reference
    return {
        form: connectForm,
        errors: errorWrapper,
        host: hostField,
        port: portField,
        username: usernameField,
        rememberMe: rememberMe,
        icon: iconField,
        submitButton: submitButton
    };
};

/**
 * Load the game configration form for the 'host' user
 * 
 * @param {mixed[]} data 
 */
BlanksGame.prototype.loadConfigForm = function(data) {
    var helper = new DOMHelper();

    // Wrapper
    var wrapper = helper.element({ tag:'div', id:'game_config_form', parent:this.parentElement });
    var optionsWrapper = helper.element({ tag:'div', id:'game_options', parent:wrapper });

    // Title
    helper.element({ tag:'h2', text:t('Configure game'), parent:optionsWrapper });

    // Status message holder
    helper.element({ tag:'div', id:'start_game_errors', parent:optionsWrapper });

    // What's the winning score?
    var winScoreWrapper = helper.element({ tag:'div', parent:optionsWrapper });
    helper.element({ tag:'label', for:'winning_score', text:t('Winning score'), parent:winScoreWrapper });
    var winScoreSelect = helper.dropdown({ id:'winning_score', options:[3,4,5,6,7,8,9,10], parent:winScoreWrapper });

    // What's the maximum time each round can last?
    var maxTimeWrapper = helper.element({ tag:'div', parent:optionsWrapper });
    helper.element({ tag:'label', text:t('Maximum turn time'), for:'max_time', parent:maxTimeWrapper });
    var maxTimeSelect = helper.dropdown({ id:'max_time', options:['Infinite','0:30','1:00','1:30','2:00','3:00','5:00'], parent:maxTimeWrapper });
    // these options match those in startGame function
    // @todo can we safely translate 'infinite' without the game breaking?

    // Enable custom text
    var typeWrapper = helper.element({ tag:'div', parent:optionsWrapper });
    helper.label({ text:t('Allow custom text'), for:'allow_custom_text', parent:typeWrapper });
    var allowCustomTextCheck = helper.element({ tag:'input', type:'checkbox', id:'allow_custom_text', parent:typeWrapper });
    allowCustomTextCheck.setAttribute('checked', 'checked');

    // Enable images
    helper.label({ text:t('Allow images'), for:'allow_images', parent:typeWrapper });
    var allowImagesCheck = helper.element({ tag:'input', type:'checkbox', id:'allow_images', parent:typeWrapper });
    
    // Switch to 'committee mode'
    helper.label({ text:t('Judging mode'), for:'judging_mode', parent:typeWrapper });
    var judgingMode = helper.dropdown({ name:'judging_mode', id:'judging_mode', options:['Normal mode', 'Committee vote mode'], parent:typeWrapper });

    // Choose card packs
    var packsWrapper = helper.element({ tag:'div', class:'card-pack-selection', parent:optionsWrapper });
    helper.element({ tag:'h3', text:t('Select card pack(s)'), parent:packsWrapper });
    var cardPacksCheckboxes = [];

    if (data.card_packs.length) {
        for (var p = 0; p < data.card_packs.length; p++) {
            var packId = data.card_packs[p];
            var packName = packId.replace(/_/g, ' ');
            var packWrapper = helper.element({ tag:'div', class:'card-pack', parent:packsWrapper });
            cardPacksCheckboxes.push(helper.element({ tag:'input', type:'checkbox', name:'card_packs', id:'card_packs_' + packId, parent:packWrapper }));
            helper.element({ tag:'label', for:'card_packs_' + packId, text:packName, parent:packWrapper })
        }
    }

    // Finish button
    var submitButton = document.createElement('button');
    submitButton.setAttribute('type', 'button');
    submitButton.innerText = t('Start game');
    optionsWrapper.appendChild(submitButton);
    submitButton.addEventListener('click', this.startGame);

    // Connected users display
    var connectedUsers = helper.element({ tag:'div', id:'connected_users', parent:wrapper });
    var playerList = this.getComponentInstance('playerList');
    playerList.setParent(connectedUsers);
    
    // Return the field elements, which sets game.configForm variable
    return {
        maxTime: maxTimeSelect,
        winningScore: winScoreSelect,
        allowCustomText: allowCustomTextCheck,
        allowImages: allowImagesCheck,
        cardPacks: cardPacksCheckboxes,
        judgingMode: judgingMode
    };
};

/**
 * Click handler for the start game button
 */
BlanksGame.prototype.startGame = function(event) {
    var game = window.BlanksGameInstance;
    if (!game.clientIsGameHost) return;

    game.winningScore = game.winingScoreOptions[game.configForm.winningScore.selectedIndex];
    game.maxTime = game.maxTimeOptions[game.configForm.maxTime.selectedIndex];
    game.allowCustomText = game.configForm.allowCustomText.checked;
    game.allowImages = game.configForm.allowImages.checked;
    game.judgingMode = game.configForm.judgingMode.selectedIndex;
    var cardPacks = [];

    for (var p = 0; p < game.configForm.cardPacks.length; p++) {
        var cardPack = game.configForm.cardPacks[p];
        if (cardPack.checked) {
            var packId = cardPack.id.replace('card_packs_', '');
            cardPacks.push(packId);
        }
    }

    if (cardPacks.length === 0) {
        document.getElementById('start_game_errors').innerHTML = '<p class="error message">' + t('Please select at least 1 card pack') + '</p>';
        return;
    }

    cardPacks = JSON.stringify(cardPacks);

    game.socket.send('{ "action": "start_game", "winningScore": "' + game.winningScore + '", "maxRoundTime": "' + game.maxTime + '", "allowCustomText": ' + game.allowCustomText + ', "allowImages": ' + game.allowImages + ', "cardPacks": ' + cardPacks + ', "judgingMode": "' + game.judgingMode + '" }');

    // game.startGameButton.disabled = true;
    event.preventDefault();
};

BlanksGame.prototype.loadAwaitGameStart = function() {
    var wrapper = document.createElement('div');
    wrapper.id = 'awaiting_game_start';

    var lhs = document.createElement('div');
    lhs.className = 'waiting_panel';

    var heading = document.createElement('h2');
    heading.innerText = t('Waiting for host to start the game...');
    lhs.appendChild(heading);

    var image = document.createElement('img');
    image.src = '/images/waiting.gif';
    image.alt = t('Humorous animation of a person waiting');
    lhs.appendChild(image);

    // Connected users display
    var connectedUsers = document.createElement('div');
    connectedUsers.id = 'connected_users';

    var playerList = this.getComponentInstance('playerList');
    playerList.setParent(connectedUsers);
    playerList.redraw();

    wrapper.appendChild(lhs);
    wrapper.appendChild(connectedUsers);

    this.parentElement.appendChild(wrapper);
};

/**
 * Generate the main game screen, farmed out to PlayerDeck
 * 
 * @param {mixed} data
 */
BlanksGame.prototype.loadGameScreen = function(data) {
    var playerDeck = this.getComponentInstance('playerDeck');
    playerDeck.setParent(this.parentElement);
    playerDeck.redraw(data);
};

BlanksGame.prototype.loadJudgeWaitingScreen = function(data) {
    var helper = new DOMHelper();
    var wrapper = helper.element({ tag:'div', id:'czar_wait_window' });
    helper.element({ tag:'h2', text:t('You\'re the card czar - wait for players to submit answer'), parent:wrapper });

    if (data.roundTime > 0) {
        var nowSeconds = Math.floor(new Date().getTime() / 1000);
        var roundEnd = nowSeconds + parseInt(data.roundTime / 1000);
        
        var timer = helper.element({ tag:'div', class:'round-timer', id: 'round_timer', data: { roundend: roundEnd } });
        wrapper.appendChild(timer);

        var tickTime = function() {
            var elem = document.getElementById('round_timer');
            if (!elem) return;
            var roundEnd = elem.dataset.roundend;
            
            var nowSeconds = Math.floor(new Date().getTime() / 1000);
        
            var seconds = (roundEnd - nowSeconds);
            var minutes = Math.floor(seconds / 60);
            seconds = seconds - (minutes*60);
            elem.innerText = t('Time remaining:') + ' ' + minutes + ':' + ('00' + seconds).slice(-2);
            
            if (minutes == 0 && seconds == 0) {
                window.BlanksGameInstance.socket.send('{ "action": "round_expired" }');
                return;
            }

            setTimeout(tickTime, 1000);
        };

        setTimeout(tickTime, 1);
    }

    // Black card wrapper
    helper.element({ tag:'div', id:'question_card', html:data.questionCard.text, parent:wrapper });

    // Connected users display
    var connectedUsers = helper.element({ tag:'div', id:'connected_users', parent:wrapper });
    var playerList = this.getComponentInstance('playerList');
    playerList.setParent(connectedUsers);
    playerList.triggerRedraw(data);
    
    this.parentElement.appendChild(wrapper);
};

BlanksGame.prototype.loadJudgeScreen = function(data, playerIsJudge) {
    // Delegate this to the round submissions component!
    var helper = new DOMHelper();
    var resultsWrapper = helper.element({ tag:'div', id:'player_submissions', parent:this.parentElement });

    var roundSubmissions = this.getComponentInstance('roundSubmissions');
    roundSubmissions.setParent(resultsWrapper);
    roundSubmissions.redraw(data, playerIsJudge);
};

BlanksGame.prototype.loadResultsScreen = function(data) {
    var helper = new DOMHelper();
    helper.element({ tag:'h2', text:t('Game finished'), parent:this.parentElement });

    var leaderboard = helper.element({ tag:'div', id:'leaderboard', parent:this.parentElement });
    var playerList = this.getComponentInstance('playerList');
    playerList.setParent(leaderboard);
    playerList.players = data.players;
    playerList.winScreen();
};

BlanksGame.prototype.updateComponents = function(message) {
    for (var i in this.components) {
        this.components[i].sendMessage(message);
    }
};

/**
 * Click event for connect to server 
 * 
 * @param {object} event 
 */
BlanksGame.prototype.openConnection = function(event) {
    var game = window.BlanksGameInstance;
    var form = game.connectForm;

    // Validate form
    if (form.username.value.length == 0) {
        form.errors.innerHTML = '<p class="error">' + t('Please enter a username') + '</p>';
        return;
    }
    if (form.host.value.length == 0) {
        form.errors.innerHTML = '<p class="error">' + t('Please enter the hosts IP address') + '</p>';
        return;
    }
    if (form.port.value.length == 0) {
        form.errors.innerHTML = '<p class="error">' + t('Please enter the hosts port number (8080 by default)') + '</p>';
        return;
    }

    form.username.disabled = true;
    form.submitButton.disabled = true;
    form.host.disabled = true;
    form.port.disabled = true;

    game.createServerConnection();

    event.preventDefault();
};

/**
 * Try and open a connection to the server
 * 
 * @param {object} event 
 */
BlanksGame.prototype.createServerConnection = function () {
    var game = window.BlanksGameInstance;
    var form = game.connectForm;
    form.errors.innerHTML = '<p class="info loader"><img src="/images/ajax-loader.gif">' + t('Connecting to server') + '</p>';
    var host = form.host.value;
    var port = form.port.value;
    var username = form.username.value;
    var icon = form.icon.value;
    var rememberMe = form.rememberMe.checked;

    game.socket = new WebSocket('ws://' + host + ':' + port);

    game.socket.onopen = function(e) {
        // Show either waiting for game to start or game options

        game.socket.send('{ "action": "player_connected", "username": "' + username + '", "icon": "' + icon + '" }');

        if (rememberMe) {
            window.localStorage.setItem('last_server_connection', JSON.stringify({
                host: host,
                port: port,
                username: username,
                icon: icon
            }));
        }
        else {
            window.localStorage.removeItem('last_server_connection');
        }
    };

    game.socket.onmessage = game.handleMessage;

    game.socket.onclose = function(e) {
        var form = window.BlanksGameInstance.connectForm;
        
        if (form) {
            form.errors.innerHTML = '<p class="error">' + t('Connection to server failed') + "</p>";
            form.username.disabled = false;
            form.submitButton.disabled = false;
            form.host.disabled = false;
            form.port.disabled = false;
        }
        else {
            // Lazy way to reset everything...
            // Ideally would show an error message saying connection lost
            window.location.reload();
        }
        
        // game.updateComponents({
        //    type: 'server_disconnected'
        // });
    };
};

/**
 * Click handler for start next round button
 * 
 * @param {event} event 
 */
BlanksGame.prototype.startNextRound = function(event) {
    var game = window.BlanksGameInstance;
    if (!game.clientIsGameHost) return;
    game.socket.send('{ "action": "next_round" }');
};

/**
 * Click handler for reset game button
 */
BlanksGame.prototype.resetGame = function () {
    if (!clientIsGameHost) return;
    if (!confirm('Are you sure you want to reset the game?')) return false;

    socket.send('{ "action": "reset_game" }');
};

window.BlanksGameInstance = new BlanksGame();
