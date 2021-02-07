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
                        game.configForm = game.loadConfigForm(data);
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
            if (data.host) {
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
            document.getElementById('submission_' + data.card).className = 'selectable-wrapper winner';

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
    var connectForm = document.createElement('form');
    connectForm.id = 'connect_form';

    // Heading
    var title = helper.element({ tag: 'h2', text: t('Connect to game server') });
    connectForm.appendChild(title);

    // Placeholder for errors
    var errorWrapper = helper.element({ tag:'div', class:'errors' });
    connectForm.appendChild(errorWrapper);

    // Host
    var hostWrapper = helper.element({ tag:'div', class:'field', id:'field_host' });
    connectForm.appendChild(hostWrapper);
    var hostLabel = helper.element({ tag:'label', for:'connect_host', text: t('Host') });
    hostWrapper.appendChild(hostLabel);
    var hostField = helper.element({ tag:'input', type: 'text', id:'connect_host', value: host });
    hostField.setAttribute('required', 'required');
    hostWrapper.appendChild(hostField);

    // Port
    var portWrapper = helper.element({ tag:'div', class:'field', id:'field_port' });
    connectForm.appendChild(portWrapper);
    var portLabel = helper.element({ tag:'label', for:'connect_port', text: t('Port') });
    portWrapper.appendChild(portLabel);
    var portField = helper.element({ tag:'input', type: 'text', id:'connect_port', value: port });
    portField.setAttribute('required', 'required');
    portField.setAttribute('size', '4');
    portWrapper.appendChild(portField);

    // Username
    var usernameWrapper = helper.element({ tag:'div', class:'field', id:'field_username' });
    connectForm.appendChild(usernameWrapper);
    var usernameLabel = helper.element({ tag:'label', for:'username', text: t('Username') });
    usernameWrapper.appendChild(usernameLabel);
    var usernameField = helper.element({ tag:'input', type: 'text', id:'username', value: username });
    usernameField.setAttribute('required', 'required');
    usernameWrapper.appendChild(usernameField);

    var rememberMeWrapper = helper.element({ tag:'div', class: 'field', id: 'field_remember' });
    var rememberMe = helper.element({ tag: 'input', id: 'remember_me', type: 'checkbox' });
    var rememberMeLabel = helper.element({ tag: 'label', for: 'remember_me', text: t('Remember these details') });
    if (remember_me) {
        rememberMe.checked = true;
    }

    rememberMeWrapper.appendChild(rememberMe);
    rememberMeWrapper.appendChild(rememberMeLabel);
    connectForm.appendChild(rememberMeWrapper);

    // Icon
    var iconWrapper = helper.element({ tag:'div', class:'field', id:'field_icon' });
    var iconLabel = helper.element({ tag:'label', for:'icon', text:t('Player face') });
    var iconField = helper.element({ tag:'input', type:'hidden', name:'icon', value:default_icon });
    iconWrapper.appendChild(iconLabel);
    iconWrapper.appendChild(iconField);

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
        rememberMe: rememberMe,
        icon: iconField,
        submitButton: submitButton
    };
};

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
    var connectedUsers = document.createElement('div');
    connectedUsers.id = 'connected_users';
    this.components.playerList = new PlayerList(this, connectedUsers);
    this.components.playerList.redraw();
    wrapper.appendChild(connectedUsers);

    // Return the field elements, which sets game.configForm variable
    return {
        maxTime: maxTimeSelect,
        winningScore: winScoreSelect,
        allowCustomText: allowCustomTextCheck,
        allowImages: allowImagesCheck,
        cardPacks: cardPacksCheckboxes
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

    game.socket.send('{ "action": "start_game", "winningScore": "' + game.winningScore + '", "maxRoundTime": "' + game.maxTime + '", "allowCustomText": ' + game.allowCustomText + ', "allowImages": ' + game.allowImages + ', "cardPacks": ' + cardPacks + ' }');

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

    this.components.playerList = new PlayerList(this, connectedUsers);
    this.components.playerList.redraw();

    wrapper.appendChild(lhs);
    wrapper.appendChild(connectedUsers);

    this.parentElement.appendChild(wrapper);
};

BlanksGame.prototype.loadGameScreen = function(data) {
    var helper = new DOMHelper();
    var game = window.BlanksGameInstance;

    var wrapper = helper.element({ tag:'div', id:'game_window' });
    var heading = helper.element({ tag:'h2', text:t('Choose your card(s)') });
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

    // In play wrapper
    var inPlay = helper.element({ tag:'div', id:'in_play' });
    wrapper.appendChild(inPlay);

    // Question
    var blackCard = helper.element({ tag:'div', id:'question_card', html:data.questionCard.text })
    inPlay.appendChild(blackCard);

    var labels = [t('First card'), t('Second card'), t('Third card')];

    // Active placeholders
    var activePlaceholdersRequired = game.currentQuestion.blanks;
    for (var aph = 0; aph < activePlaceholdersRequired; aph++) {
        var placeholder = helper.element({ tag:'div', class:'input-wrapper' });

        var label = helper.element({ tag:'p', text:labels[aph] });
        placeholder.appendChild(label);

        var dropzone = helper.element({ tag:'div', class:'card-dropzone' });
        placeholder.appendChild(dropzone);

        $(dropzone).droppable({
            drop: function(event, ui) {
                var draggedCard = ui.draggable;

                // Enable the original parent to now be droppable
                draggedCard.parent().droppable("enable");

                $(this).append(draggedCard);
                draggedCard.css('top', 0);
                draggedCard.css('left', 0);

                // Disable so no more cards can be added to this space
                $(event.target).droppable("disable");

                // Enable the edit button
                $(this.parentElement).find('button.edit-card').prop('disabled', false);
            }
        });

        if (game.allowCustomText || game.allowImages) {
            var editButton = helper.element({ tag:'button', text:t('Edit card'), class:'edit-card' });
            editButton.setAttribute('disabled', 'disabled');

            editButton.addEventListener('click', function (e) {
                var card = $(this.parentElement).find('p.card');
                var cardID = card.attr('id');
                game.showEditCardModal(cardID);
                e.preventDefault();
            });

            placeholder.appendChild(editButton);
        }

        inPlay.appendChild(placeholder);
    }

    // Inactive placeholders
    // Hard coded 3 - max number of blanks in one card!
    var placeholdersRequired = 3 - game.currentQuestion.blanks;
    for (var ph = 0; ph < placeholdersRequired; ph++) {
        var placeholder = helper.element({ tag:'div', class:'card-no-dropzone' });
        inPlay.appendChild(placeholder);
    }

    // Submit button
    var submitCardsButton = helper.element({ tag:'button', class:'big', text:t('Play card(s)') });
    wrapper.appendChild(submitCardsButton);

    // Answer cards
    var playerCardsWrapper = helper.element({ tag:'div', id:'player_hand' });
    this.components.playerDeck = new PlayerDeck(this, playerCardsWrapper);
    this.components.playerDeck.submitButton = submitCardsButton;
    submitCardsButton.addEventListener('click', this.components.playerDeck.submitCards);
    this.components.playerDeck.redraw();

    wrapper.appendChild(playerCardsWrapper);
    this.parentElement.appendChild(wrapper);
};

BlanksGame.prototype.showEditCardModal = function (cardID) {

    var card = $('#' + cardID);
    if (!card.length == 1) {
        console.error('Card not found!');
        return;
    }

    if (card.find('.text').length > 0) {
        var text = card.find('.text').html();
        var image = card.find('img').attr('src');
    }
    else {
        var text = card.html();
        var image = '';
    }

    var helper = new DOMHelper();
    var container = document.getElementById('card_edit_box');
    if (container) {
        container.style.display = 'block';
    }
    else {
        container = helper.element({ tag:'div', id:'card_edit_box' });
        document.body.appendChild(container);
    }

    $('body').css('overflow', 'hidden');
    $('html').css('overflow', 'hidden');

    var innerContainer = helper.element({ tag:'div', class:'container' });
    container.appendChild(innerContainer);

    var containerHeading = helper.element({ tag:'h2', text:t('Edit card') });
    innerContainer.appendChild(containerHeading);

    if (this.allowCustomText) {
        // Custom text
        var customCardWrapper = helper.element({ tag:'div', id:'custom_text_wrapper' });
        var textBoxLabel = helper.element({ tag:'label', for:'custom_text_input', text:t('Text / Caption') });
        var textBox = helper.element({ tag:'textarea', id:'custom_text_input', value:text });
        
        customCardWrapper.appendChild(textBoxLabel);
        customCardWrapper.appendChild(textBox);
        innerContainer.appendChild(customCardWrapper);
    }
    
    if (this.allowImages) {    
        // Image
        var imageHeading = helper.element({ tag:'h3', text:t('Add an image') });
        innerContainer.appendChild(imageHeading);

        var customImageWrapper = helper.element({ tag:'div', id:'custom_image_wrapper' , class:'custom-image-wrapper' });
        var imageSourceLabel = helper.element({ tag:'label', for:'custom_image_input', text:t('Image URL') });
        customImageWrapper.appendChild(imageSourceLabel);
    
        var imageSource = helper.element({ tag:'input', type:'text', id:'custom_image_input', value:image });
        imageSource.placeholder = 'http://example.com/image.jpg';
        imageSource.style.width = '100%';
        imageSource.addEventListener('keyup', function (e) {
            $('#preview_image').attr('src', $(this).val());
        });
        customImageWrapper.appendChild(imageSource);

        var previewImage = helper.element({ tag:'img', id:'preview_image', src: image });
        customImageWrapper.appendChild(previewImage);
        
        if (config.giphy_api_key) {
            var orText = helper.element({ tag:'p', text:t('- or -') });
            customImageWrapper.appendChild(orText);

            var paragraph = helper.element({ tag:'p', text:t('Enter your search text to search Giphy API for GIFs, click the image you want to use, this will replace the URL above.') });
            customImageWrapper.appendChild(paragraph);

            var giphyContainer = helper.element({ tag:'div', class:'giphy-search-box' });
            customImageWrapper.appendChild(giphyContainer);

            var giphyLogo = helper.element({ tag:'img', src:'/images/giphy_logo.png', alt:'GIPHY' });
            giphyContainer.appendChild(giphyLogo);

            var searchInputWrapper = helper.element({ tag:'div', class:'search-input-wrapper' });
            giphyContainer.appendChild(searchInputWrapper);

            var innerInput = helper.element({ tag:'input', type:'text', id:'giphy_search_text', placeholder:'Your search text' });
            searchInputWrapper.appendChild(innerInput);

            var innerButton = helper.element({ tag:'button', type:'button', id:'giphy_search_button', text:t('Search') });
            innerButton.addEventListener('click', function(e) {
                var searchTerm = encodeURIComponent(document.getElementById('giphy_search_text').value);
                var xhr = $.get({
                    url:"http://api.giphy.com/v1/gifs/search?q=" + searchTerm + "&api_key=" + config.giphy_api_key + "&limit=16",
                    crossDomain: true
                });
                xhr.done(function(data) {
                    var wrapper = document.getElementById('giphy_results');

                    for(var i = 0; i < data.data.length; i++) {
                        var item = data.data[i];
                        var imageURL = item.images.fixed_width_downsampled.url;
                        var selectableDiv = helper.element({ tag:'div', class:'giphy_selectable', data: {url:imageURL } });
                        var giphyImage = helper.element({ tag:'img', src:imageURL, alt:item.title });
                        selectableDiv.appendChild(giphyImage);
                        wrapper.appendChild(selectableDiv);

                        selectableDiv.addEventListener('click', function(e) {
                            $('.giphy_selectable.active').removeClass('active');
                            this.className = 'giphy_selectable active';
                            $('#custom_image_input')
                                .val($(this).find('img').attr('src'));

                            var event = new Event('keyup');
                            document.getElementById('custom_image_input').dispatchEvent(event);
                        });
                    }
                });

                e.preventDefault();
            });
            searchInputWrapper.appendChild(innerButton);

            var resultsArea = helper.element({ tag:'div', id:'giphy_results' });
            giphyContainer.appendChild(resultsArea);
        }
    
        innerContainer.appendChild(customImageWrapper);
    }

    var actionsWrapper = helper.element({ tag:'div', class:'actions' });
    innerContainer.appendChild(actionsWrapper);

    var closeWindow = function() {
        var container = document.getElementById('card_edit_box');
        container.innerHTML = '';
        container.style.display = 'none';
        $('body').css('overflow', 'visible');
        $('html').css('overflow', 'visible');
    };

    var submitButton = helper.element({ tag:'button', type:'button', id:'edit_save', text:t('Save') });
    actionsWrapper.appendChild(submitButton);
    submitButton.addEventListener('click', function(e) {
        var imageUrl = false;
        if (document.getElementById('custom_image_input')) {
            imageUrl = document.getElementById('custom_image_input').value;
        }
        var imageCaption = false;
        if (document.getElementById('custom_text_input')) {
            imageCaption = document.getElementById('custom_text_input').value;
        }
        else {
            imageCaption = text;
        }

        var newCardContent = '';
        if (imageUrl) {
            newCardContent += '<a href="' + imageUrl + '" target="_blank"><img src="' + imageUrl + '" alt="Image not valid" style="max-width:100%; max-height:90%"></a><br><small>' + t('Click to view full size') + '</small>';
        }
        if (imageCaption) {
            newCardContent += '<div class="text">' + imageCaption + '</div>';
        }

        document.getElementById(cardID).innerHTML = newCardContent;
        closeWindow();
    });

    var closeButton = helper.element({ tag:'button', type:'button', id:'edit_close', text:t('Discard') });
    actionsWrapper.appendChild(closeButton);
    closeButton.addEventListener('click', closeWindow);
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
