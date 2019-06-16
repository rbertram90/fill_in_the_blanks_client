/**
 * Class BlanksGame
 */
function BlanksGame() {

    this.components = {};

    // Create and initialise all page components
    /*
        messagePanel: new MessagesPanel(this),
        playerList: new PlayerList(this),
        roundQuestion: new RoundQuestion(this),
        roundSubmissions: new RoundSubmissions(this),
        playerDeck: new PlayerDeck(this)
    };*/

    // Create outer wrapper
    this.parentElement = document.createElement('div');
    this.parentElement.id = 'blanks_game';
    document.body.appendChild(this.parentElement);

    this.socket = null;

    // Game variables
    this.player = null;
    this.playerList = [];
    this.currentJudge = null;
    this.clientIsGameHost = false;

    this.currentQuestion = {};
    this.winningScore = 5; // default
    this.maxTime = 120000; // default - 2 minutes

    // Initialise connection form
    this.connectForm = this.loadConnectForm();
    this.configForm = null;
}

/**
 * Create the connect to server form
 */
BlanksGame.prototype.loadConnectForm = function() {

    var username, host, port, default_icon;

    // Get last values
    if (lastConnection = window.localStorage.getItem('last_server_connection')) {
        lastConnection = JSON.parse(lastConnection);
        host = lastConnection.host;
        port = lastConnection.port;
        username = lastConnection.username;
        default_icon = lastConnection.icon;
    }
    else {
        host = 'localhost';
        port = 8080;
        username = 'player' + Date.now().toString().substr(-4);
    }
    if (!default_icon) {
        default_icon = Math.floor(Math.random() * 20) + 1;
    }

    // Form
    var connectForm = document.createElement('form');
    connectForm.id = 'connect_form';

    var helper = new DOMHelper();

    // Heading
    var title = helper.element({
        tag: 'h2',
        text: t('Connect to game server')
    });
    connectForm.appendChild(title);

    // Placeholder for errors
    var errorWrapper = helper.element({ tag:'div', class:'errors' });
    connectForm.appendChild(errorWrapper);

    // Host
    var hostWrapper = helper.element({ tag:'div', class:'field', id:'field_host' });
    connectForm.appendChild(hostWrapper);

    var hostLabel = document.createElement('label');
    hostLabel.setAttribute('for', 'host');
    hostLabel.innerText = t('Host');
    hostWrapper.appendChild(hostLabel);

    var hostField = document.createElement('input');
    hostField.id = 'connect_host';
    hostField.type = 'text';
    hostField.value = host;
    hostField.setAttribute('required', 'required');
    hostWrapper.appendChild(hostField);

    // Port
    var portWrapper = helper.element({ tag:'div', class:'field', id:'field_port' });
    connectForm.appendChild(portWrapper);

    var portLabel = document.createElement('label');
    portLabel.setAttribute('for', 'port');
    portLabel.innerText = t('Port');
    portWrapper.appendChild(portLabel);

    var portField = document.createElement('input');
    portField.id = 'connect_port';
    portField.type = 'text';
    portField.value = port;
    portField.setAttribute('required', 'required');
    portField.setAttribute('size', '4');
    portWrapper.appendChild(portField);

    // Username
    var usernameWrapper = helper.element({ tag:'div', class:'field', id:'field_username' });
    connectForm.appendChild(usernameWrapper);

    var usernameLabel = document.createElement('label');
    usernameLabel.setAttribute('for', 'username');
    usernameLabel.innerText = t('Username');
    usernameWrapper.appendChild(usernameLabel);

    var usernameField = document.createElement('input');
    usernameField.id = 'username';
    usernameField.type = 'text';
    usernameField.value = username;
    usernameField.setAttribute('required', 'required');
    usernameWrapper.appendChild(usernameField);

    // Icon
    var iconWrapper = helper.element({ tag:'div', class:'field', id:'field_icon' });
    var iconLabel = helper.element({ tag:'label', for:'icon', text:t('Player face') });
    var iconField = helper.element({ tag:'input', type:'hidden', name:'icon', value:default_icon });
    iconWrapper.appendChild(iconLabel);
    iconWrapper.appendChild(iconField);

    for (var i = 1; i <= 20; i++) {
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
    connectForm.appendChild(iconWrapper);

    // Actions
    var actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'actions';
    connectForm.appendChild(actionsWrapper);

    var submitButton = document.createElement('button');
    submitButton.id = 'connect_button';
    submitButton.type = 'button';
    submitButton.innerText = t('Connect');
    actionsWrapper.appendChild(submitButton);

    submitButton.addEventListener('click', this.openConnection);

    this.parentElement.appendChild(connectForm);

    return {
        form: connectForm,
        errors: errorWrapper,
        host: hostField,
        port: portField,
        username: usernameField,
        icon: iconField,
        submitButton: submitButton
    };
};

BlanksGame.prototype.loadConfigForm = function() {
    var helper = new DOMHelper();

    // Wrapper
    var wrapper = document.createElement('div');
    wrapper.id = 'game_config_form';

    var optionsWrapper = document.createElement('div');
    optionsWrapper.id = 'game_options';

    // Heading
    var heading = document.createElement('h2');
    heading.innerText = t('Configure game');
    optionsWrapper.appendChild(heading);

    // What's the winning score?
    var winScoreWrapper = document.createElement('div');
    var winScoreLabel = document.createElement('label');
    winScoreLabel.innerText = t('Winning score');
    winScoreLabel.setAttribute('for', 'winning_score');
    var winScoreSelect = document.createElement('select');
    winScoreSelect.id = 'winning_score';
    for (var i = 3; i < 11; i++) {
        var option = document.createElement('option');
        option.innerText = i;
        option.value = i;
        winScoreSelect.appendChild(option);
    }
    winScoreWrapper.appendChild(winScoreLabel);
    winScoreWrapper.appendChild(winScoreSelect);
    optionsWrapper.appendChild(winScoreWrapper);

    // What's the maximum time each round can last?
    var maxTimeWrapper = helper.element({ tag:'div' });
    var maxTimeLabel = helper.element({ tag:'label', text:t('Maximum turn time'), for:'max_time' });
    var maxTimeSelect = helper.element({ tag:'select', id:'max_time' });
    var maxTimeOptions = ['Infinite', '0:30', '1:00', '1:30', '2:00', '3:00', '5:00']; // this link to startGame function
    for (var i = 0; i < maxTimeOptions.length; i++) {
        var option = helper.element({ tag:'option', text:maxTimeOptions[i], value:i });
        maxTimeSelect.appendChild(option);
    }
    winScoreWrapper.appendChild(maxTimeLabel);
    winScoreWrapper.appendChild(maxTimeSelect);
    optionsWrapper.appendChild(maxTimeWrapper);

    // Finish button
    var submitButton = document.createElement('button');
    submitButton.setAttribute('type', 'button');
    submitButton.innerText = t('Start game');
    optionsWrapper.appendChild(submitButton);
    submitButton.addEventListener('click', this.startGame);

    wrapper.appendChild(optionsWrapper);

    // Connected users display
    var connectedUsers = document.createElement('div');
    connectedUsers.id = 'connected_users';

    this.components.playerList = new PlayerList(this, connectedUsers);
    this.components.playerList.redraw();

    wrapper.appendChild(connectedUsers);

    this.parentElement.appendChild(wrapper);

    return {
        maxTime: maxTimeSelect,
        winningScore: winScoreSelect
    };
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

    this.components.playerList = new PlayerList(this, connectedUsers);
    this.components.playerList.redraw();

    wrapper.appendChild(lhs);
    wrapper.appendChild(connectedUsers);

    this.parentElement.appendChild(wrapper);
};

BlanksGame.prototype.loadGameScreen = function(data) {
    var helper = new DOMHelper();

    var wrapper = document.createElement('div');
    wrapper.id = 'game_window';

    var heading = document.createElement('h2');
    heading.innerText = t('Choose your card(s)');
    wrapper.appendChild(heading);

    // @todo If someone connects half way through a round then the timer on their screen will be wrong...
    if (data.roundTime > 0) {
        var nowSeconds = Math.floor(new Date().getTime() / 1000);
        var roundEnd = nowSeconds + parseInt(data.roundTime / 1000);
        
        var timer = helper.element({ tag:'div', class:'round-timer', id:'round_timer', data:{ roundend: roundEnd } });
        wrapper.appendChild(timer);

        var tickTime = function() {
            var elem = document.getElementById('round_timer');

            if (!elem) return;
            var roundEnd = elem.dataset.roundend;
            
            var nowSeconds = Math.floor(new Date().getTime() / 1000);
        
            var seconds = (roundEnd - nowSeconds);
            var minutes = Math.floor(seconds / 60);
            seconds = seconds - (minutes*60);
            elem.innerText = t('Time remaining: ') + minutes + ':' + ('00' + seconds).slice(-2);
            
            if (minutes <= 0 && seconds <= 0) return;
            setTimeout(tickTime, 1000);
        };

        setTimeout(tickTime, 1);
    }

    var blackCard = document.createElement('div');
    blackCard.id = 'question_card';
    blackCard.innerHTML = data.questionCard.text;
    wrapper.appendChild(blackCard);

    // Players cards
    var playerCardsWrapper = document.createElement('div');
    playerCardsWrapper.id = 'player_hand';

    this.components.playerDeck = new PlayerDeck(this, playerCardsWrapper);
    this.components.playerDeck.redraw();

    var submitCardsButton = document.createElement('button');
    submitCardsButton.innerText = t('Play card(s)');
    submitCardsButton.addEventListener('click', this.components.playerDeck.submitCards);
    this.components.playerDeck.submitButton = submitCardsButton;

    playerCardsWrapper.appendChild(submitCardsButton);

    wrapper.appendChild(playerCardsWrapper);

    this.parentElement.appendChild(wrapper);
};

BlanksGame.prototype.loadJudgeWaitingScreen = function(data) {
    var helper = new DOMHelper();

    var wrapper = document.createElement('div');
    wrapper.id = 'czar_wait_window';

    var heading = document.createElement('h2');
    heading.innerText = t('You\'re the card czar - wait for players to submit answer');
    wrapper.appendChild(heading);

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
            elem.innerText = t('Time remaining: ') + minutes + ':' + ('00' + seconds).slice(-2);
            
            if (minutes == 0 && seconds == 0) {
                window.BlanksGameInstance.socket.send('{ "action": "round_expired" }');
                return;
            }

            setTimeout(tickTime, 1000);
        };

        setTimeout(tickTime, 1);
    }

    var blackCardWrapper = document.createElement('div');
    blackCardWrapper.id = 'question_card';
    blackCardWrapper.innerHTML = data.questionCard.text;
    wrapper.appendChild(blackCardWrapper);

    // Connected users display
    var connectedUsers = document.createElement('div');
    connectedUsers.id = 'connected_users';

    this.components.playerList = new PlayerList(this, connectedUsers);
    this.components.playerList.redraw();
    
    wrapper.appendChild(connectedUsers);
    this.parentElement.appendChild(wrapper);
};

BlanksGame.prototype.loadJudgeScreen = function(data, playerIsJudge) {
    // allCards
    // currentJudge

    // Connected users display
    var resultsWrapper = document.createElement('div');
    resultsWrapper.id = 'player_submissions';

    this.components.roundSubmissions = new RoundSubmissions(this, resultsWrapper);
    this.components.roundSubmissions.redraw(data, playerIsJudge);
    
    this.parentElement.appendChild(resultsWrapper);
};

BlanksGame.prototype.loadResultsScreen = function(data) {
    var helper = new DOMHelper();

    var heading = helper.element({ tag:'h2', text:t('Game finished') });
    this.parentElement.appendChild(heading);

    var leaderboard = helper.element({ tag:'div', id:'leaderboard' });

    this.components.playerList = new PlayerList(this, leaderboard);
    this.components.playerList.players = data.players;
    this.components.playerList.winScreen();

    this.parentElement.appendChild(leaderboard);
};

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
                    if (data.judge == null || data.judge.username == username) {
                        // Show configure game options screen
                        game.configForm = game.loadConfigForm();
                    }
                    else {
                        // Show awaiting game start screen
                        game.loadAwaitGameStart();
                    }
                    break;
                // Round in progress
                case 1:
                    // @todo
                    break;

                // Round Judging
                case 2:
                    break;
            }
            break;

        case 'player_connected':
            // Check if the player that connected is local player
            // If they are game host then enable buttons
            if (data.host) {
                game.clientIsGameHost = true;
            }
            break;

        case 'answer_card_update':
            game.player.cards = data.cards;
            break;

        case 'round_start':
            game.parentElement.innerHTML = '';
            game.currentJudge = data.currentJudge.username;
            game.currentQuestion = data.questionCard;
            game.currentQuestion.blanks = (game.currentQuestion.text.match(/____/g) || []).length;

            if (game.currentJudge == game.player.username) {
                game.loadJudgeWaitingScreen(data);
            }
            else {
                game.loadGameScreen(data);
            }
            break;

        case 'round_judge':
            game.parentElement.innerHTML = '';
            game.loadJudgeScreen(data, (game.currentJudge == game.player.username));
            break;

        case 'round_winner':
            document.getElementById('played_card' + data.card).className = 'card winner';

            if (game.clientIsGameHost) {
                window.setTimeout(game.startNextRound, 10000);
            }

            var winnerHeading = document.createElement('h3');
            winnerHeading.className = 'round-winner-label';
            winnerHeading.innerHTML = '<strong>' + data.winner.username + '</strong> ' + t('is the round winner') + ': ';
            game.parentElement.appendChild(winnerHeading);

            var connectedUsers = document.createElement('div');
            connectedUsers.id = 'connected_users';
            game.components.playerList = new PlayerList(this, connectedUsers);
            // game.components.playerList.redraw(); // this will happen when components refreshed
            game.parentElement.appendChild(connectedUsers);

            var nextRoundWarning = document.createElement('span');
            nextRoundWarning.innerText = t('next round starting in [time] seconds');
            nextRoundWarning.innerText = nextRoundWarning.innerText.replace('[time]', '10');
            winnerHeading.appendChild(nextRoundWarning);
            
            var timeToNextRound = 10;

            var refreshNextRound = function() {
                timeToNextRound--;
                var newText = t('next round starting in [time] seconds');
                newText = newText.replace('[time]', timeToNextRound);
                nextRoundWarning.innerText = t(newText);

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

    game.socket = new WebSocket('ws://' + host + ':' + port);

    game.socket.onopen = function(e) {
        // Show either waiting for game to start or game options

        game.socket.send('{ "action": "player_connected", "username": "' + username + '", "icon": "' + icon + '" }');

        window.localStorage.setItem('last_server_connection', JSON.stringify({
            host: host,
            port: port,
            username: username,
            icon: icon
        }));
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
 * Click handler for the start game button
 */
BlanksGame.prototype.startGame = function(event) {
    var game = window.BlanksGameInstance;
    if (!game.clientIsGameHost) return;

    game.winningScore = game.configForm.winningScore.value;

    var maxTimeOptions = [0, 30000, 60000, 90000, 120000, 180000, 300000];
    game.maxTime = maxTimeOptions[game.configForm.maxTime.value];
    if (typeof game.maxTime == 'undefined') game.maxTime = 0;

    game.socket.send('{ "action": "start_game", "winningScore": "' + game.winningScore + '", "maxRoundTime": "' + game.maxTime + '" }');

    game.configForm = null;

    // game.startGameButton.disabled = true;
    event.preventDefault();
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