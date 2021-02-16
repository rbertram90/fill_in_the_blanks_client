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
        $(cardElement).draggable({
            revert: "invalid"
        });
        cardWrapper.appendChild(cardElement);

        $(cardWrapper).droppable({
            disabled: true,
            drop: function(event, ui) {
                if ($(this).find('p.card').length > 0) {

                }
                else {
                    var draggedCard = ui.draggable;

                    // Enable the original parent to now be droppable
                    draggedCard.parent().droppable("enable");

                    $(this).append(draggedCard);
                    draggedCard.css('top', 0);
                    draggedCard.css('left', 0);

                    // Disable so no more cards can be added to this space
                    $(event.target).droppable("disable");
                }
            }
        });

        form.appendChild(cardWrapper);
    }  
};

/**
 * Set the parent DOM element to attach the PlayerDeck to
 * 
 * @param {object} parentElement 
 */
PlayerDeck.prototype.setParent = function(parentElement) {
    this.parentElement = parentElement;
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
    // var form = document.forms.namedItem("player_hand");
    var thisComponent = game.getComponentInstance('playerDeck');
    thisComponent.submitButton.disabled = true;
    var helper = new DOMHelper();

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

    var connectedUsers = helper.element({ tag:'div', id:'connected_users', parent:game.parentElement });
    var playerList = game.getComponentInstance('playerList')
    playerList.setParent(connectedUsers);
    playerList.redraw();
};