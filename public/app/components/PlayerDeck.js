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
    var helper = new DOMHelper();
    var player = this.game.player;

    var errorWrapper = helper.element({ tag:'div' });
    this.errorWrapper = errorWrapper;
    this.parentElement.appendChild(errorWrapper);

    var form = document.createElement('form');
    form.id = 'player_hand';
    this.parentElement.appendChild(form);

    for (var c = 0; c < player.cards.length; c++) {
        var cardWrapper = helper.element({ tag:'div', class:'form-element' });
        var cardElement = helper.element({
            tag: 'p',
            class: 'card',
            id: 'card_'+c,
            html: player.cards[c].text,
            data: {
                id: player.cards[c].id,
                'original-text': player.cards[c].text
            }
        });
        cardElement.setAttribute('draggable', true);
        cardWrapper.appendChild(cardElement);

        cardElement.addEventListener("dragstart", function (e) {
            var game = window.BlanksGameInstance;
            game.draggedCard = e.target;
            e.dataTransfer.effectAllowed = "move";
        });

        cardWrapper.addEventListener("dragover", function (e) {
            // this is called all the time the element is droppable on here
            e.preventDefault();
        });
        cardWrapper.addEventListener("dragenter", function (e) {
            if ($(this).find('p.card').length > 0) {
                this.style.backgroundColor = "red";
            }
            else {
                this.style.backgroundColor = "#666";
                e.dataTransfer.dropEffect = "move";
            }
            e.preventDefault();
        });
        cardWrapper.addEventListener("dragleave", function (e) {
            this.style.backgroundColor = "transparent";
            e.preventDefault();
        });
        cardWrapper.addEventListener("drop", function (e) {
            var game = window.BlanksGameInstance;
            if ($(this).find('p.card').length > 0) {
            }
            else {
                $(game.draggedCard)
                    .parent()
                    .css('background-color', 'transparent');
                $(game.draggedCard.parentElement.parentElement)
                    .find('button.edit-card')
                    .prop('disabled', true);
                this.append(game.draggedCard);
                game.draggedCard = null;
            }
            this.style.backgroundColor = "transparent";
        });
        
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
    var form = document.forms.namedItem("player_hand");
    var thisComponent = game.components.playerDeck;

    thisComponent.submitButton.disabled = true;

    var answers = [];
    var answerIndexes = [];

    for (var i=0; i < game.currentQuestion.blanks; i++) {
        var card = $('#in_play .card').eq(i);

        // Extract card data
        if (card.length == 0) {
            thisComponent.showError(t('Please select the correct number of cards'));
            return false;
        }
        else {
            var cardText = card.html();
            
            if (cardText.length == 0) {
                thisComponent.showError(t('Please ensure all selected cards have text entered.'));
                return false;
            }

            answers.push({
                id: card.data('id'),
                text: cardText
            });
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