/**
 * Round submissions component
 */
function PlayerDeck(game, parentElement) {
    Component.call(this, game);

    this.cardsSelectable = false;
    this.parentElement = parentElement;
    this.errorWrapper = null;
    this.submitButton = null;
};

PlayerDeck.prototype = Object.create(Component.prototype);
PlayerDeck.prototype.constructor = PlayerDeck;

PlayerDeck.prototype.redraw = function() {
    var player = this.game.player;

    var errorWrapper = document.createElement('div');
    this.errorWrapper = errorWrapper;
    this.parentElement.appendChild(errorWrapper);

    var form = document.createElement('form');
    form.id = 'player_card_submissions';
    this.parentElement.appendChild(form);

    for (var c = 0; c < player.cards.length; c++) {
        var cardWrapper = document.createElement('div');
        cardWrapper.className = 'form-element';

        var cardElement = document.createElement('p');
        cardElement.dataset.id = player.cards[c].id;
        cardElement.setAttribute('contenteditable', true);
        cardElement.innerHTML = player.cards[c].text;
        cardElement.className = 'card';
        // cardElement.addEventListener('click', this.selectCard);
        cardWrapper.appendChild(cardElement);

        for (var i = 0; i < this.game.currentQuestion.blanks; i++) {
            var radioButton = document.createElement('input');
            radioButton.type = 'radio';
            radioButton.name = 'card_' + i;
            radioButton.value = player.cards[c].id;
            radioButton.setAttribute('data-cardnum', i+1);
            cardWrapper.appendChild(radioButton);
        }

        form.appendChild(cardWrapper);
    }
};

/**
 * Helper function for showing an error with submission
 * 
 * @param {string} text
 */
PlayerDeck.prototype.showError = function(text) {
    this.errorWrapper.innerHTML = '';
    var error = document.createElement('p');
    error.className = 'error';
    error.innerHTML = text;
    this.errorWrapper.appendChild(error);
    this.submitButton.disabled = false;
};

/**
 * Click handler for submit card(s) button
 * 
 * @param {event} event
 */
PlayerDeck.prototype.submitCards = function (event) {
    var game = window.BlanksGameInstance;
    var form = document.forms.namedItem("player_card_submissions");
    var thisComponent = game.components.playerDeck;

    thisComponent.submitButton.disabled = true;

    var answers = [];
    var answerIndexes = [];

    for (var i=0; i < game.currentQuestion.blanks; i++) {
        var card = form.elements['card_' + i]; // RadioNodeList

        // Check that the user has not selected the same card twice!
        if (answerIndexes.indexOf(card.value) > -1) {
            thisComponent.showError(t('Please select ' + game.currentQuestion.blanks + ' different cards.'));
            return;
        }
        else {
            answerIndexes.push(card.value);
        }
        
        // Extract card data
        if (card && card.value) {
            var cardText = document.querySelector('#' + form.id + ' p[data-id="' + card.value + '"]').innerHTML;
            
            if (cardText.length == 0) {
                thisComponent.showError(t('Please ensure selected cards have text entered'));
                return false;
            }

            answers.push({
                id: card.value,
                text: cardText
            });
        }
        else {
            thisComponent.showError(t('Please select the correct number of cards'));
            return false;
        }
    }

    game.socket.send('{ "action": "cards_submit", "cards": ' + JSON.stringify(answers) + ' }');

    var newContent = '<h2>' + t('Waiting for other players...') + '</h2>';
    game.parentElement.innerHTML = newContent;

    var connectedUsers = document.createElement('div');
    connectedUsers.id = 'connected_users';
    game.components.playerList = new PlayerList(this, connectedUsers);
    game.components.playerList.redraw();    
    game.parentElement.appendChild(connectedUsers);
};