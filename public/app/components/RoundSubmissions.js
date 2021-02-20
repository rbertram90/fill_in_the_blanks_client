/**
 * Round submissions (judging) component
 */
function RoundSubmissions(game, parentElement) {
    Component.call(this, game);

    this.parentElement = parentElement;
    this.pickWinnerButton = null;
};

RoundSubmissions.prototype = Object.create(Component.prototype);
RoundSubmissions.prototype.constructor = RoundSubmissions;

/**
 * Generate judging display
 * 
 * @param {object} message
 * @param {boolean} playerIsJudge
 */
RoundSubmissions.prototype.redraw = function (message, playerIsJudge) {
    var helper = new DOMHelper();

    var heading = document.createElement('h2');
    var errorWrapper = null;
    var subheading = null;

    if (playerIsJudge) {
        heading.innerText = t ('Choose a winner');
        errorWrapper = document.createElement('div');
        errorWrapper.id = 'pick_errors';
    }
    else {
        heading.innerText = t ('Player submissions');
        subheading = helper.element({ tag:'p', text: t('Card czar is picking the winner'), class:'simple-grey-panel' });
    }

    this.parentElement.appendChild(heading);
    if (errorWrapper) this.parentElement.appendChild(errorWrapper);
    if (subheading) this.parentElement.appendChild(subheading);

    var blackCard = helper.element({ tag:'div', id:'question_card', html:message.currentQuestion.text })
    this.parentElement.appendChild(blackCard);

    var submissionsWrapper = helper.element({ tag:'div', id:'player_card_submissions', parent:this.parentElement });
    var originalQuestionText = message.currentQuestion.text;

    // Randomise submission ordering - should this have been done server
    // side so that everyone sees the same random order!
    var randomisedCards = new Array(message.allCards.length);

    // Create an array of available indexes (0..n)
    var indexes = [];
    for (var i = 0; i < message.allCards.length; i++) indexes.push(i);

    // Copy cards from first array into random array in random order
    while (message.allCards.length > 0) {
        var random = Math.floor(Math.random() * Math.floor(indexes.length));
        var randomIndex = indexes[random];
        indexes.splice(random, 1);
        var card = message.allCards.pop();
        randomisedCards[randomIndex] = card;
    }

    for (var c = 0; c < randomisedCards.length; c++) {
        var playerCards = randomisedCards[c];

        var thisPlayerCard = this.game.player.selectedCards[0];
        var isSelectable = true;

        if (message.judgeMode == 1 && this.game.player.selectedCards[0] && playerCards[0].id == thisPlayerCard.id) {
            isSelectable = false;
        }

        var selectableWrapper = helper.element({
            tag: 'div',
            class: 'selectable-wrapper',
            id: 'submission_' + playerCards[0].id,
            data: {
                'card-index': playerCards[0].id,
                'selectable': isSelectable
            }
        });

        for (var d = 0; d < playerCards.length; d++) {
            var card = playerCards[d];
            helper.element({ tag:'p', class:'card', html:card.text, parent:selectableWrapper });
        }

        if (playerIsJudge && isSelectable) {
            selectableWrapper.addEventListener('click', this.highlightWinner);
        }
    
        submissionsWrapper.appendChild(selectableWrapper);
    }

    if (playerIsJudge) {
        this.pickWinnerButton = helper.element({ tag:'button', id:'pick_winner', text:t('Confirm selection'), parent:this.parentElement });
        this.pickWinnerButton.addEventListener('click', this.pickWinner);
    }

    if (this.game.clientIsGameHost) {
        var forceNextRoundButton = helper.element({ tag:'button', id:'force_next_round', text:t('Force decision (player is AFK)'), parent:this.parentElement });
        forceNextRoundButton.addEventListener('click', this.triggerNextRound);
    }

    // Draw player list
    var playerListWrapper = helper.element({ tag:'div', id:'player_list', parent:this.parentElement });
    var playerList = this.game.getComponentInstance('playerList');
    playerList.setParent(playerListWrapper);
    playerList.triggerRedraw(message);
};

/**
 * Update the parent DOM element to attach RoundSubmissions to
 * 
 * @param {object} parentElement 
 */
RoundSubmissions.prototype.setParent = function(parentElement) {
    this.parentElement = parentElement;
};

/**
 * Click handler for selecting winning card
 * 
 * @param {event} event
 */
RoundSubmissions.prototype.highlightWinner = function (event) {
    var game = window.BlanksGameInstance;
    var roundSubmissions = game.getComponentInstance('roundSubmissions');

    var allCards = document.querySelectorAll('#' + roundSubmissions.parentElement.id + ' .selectable-wrapper');

    for (i = 0; i < allCards.length; i++) {
        allCards[i].classList.remove('active');
    }

    this.classList.toggle('active');
};

/**
 * Click handler for confirm selection button
 * Judging player has picked a winning card
 * 
 * @param {event} event
 */
RoundSubmissions.prototype.pickWinner = function (event) {
    var game = window.BlanksGameInstance;
    var roundSubmissions = game.getComponentInstance('roundSubmissions');
    var winningCard = document.querySelector('#' + roundSubmissions.parentElement.id + " .selectable-wrapper.active");

    if (!winningCard) {
        document.getElementById('pick_errors').innerHTML = '<p class="error">' + t('Please choose the winning card') + '</p>';
        return;
    }

    roundSubmissions.pickWinnerButton.disabled = true;

    // Ensure the cards are no longer selectable
    var selectableElements = document.querySelectorAll('#player_card_submissions .selectable-wrapper');
    for (var s = 0; s < selectableElements.length; s++) {
        selectableElements[s].removeEventListener('click', RoundSubmissions.prototype.highlightWinner);
    }

    game.socket.send('{ "action": "winner_picked", "card": ' + winningCard.dataset.cardIndex + ' }');
};

/**
 * In case that someone has gone AFK
 */
RoundSubmissions.prototype.triggerNextRound = function (event) {
    var game = window.BlanksGameInstance;
    game.socket.send('{ "action": "force_decision" }');
    event.preventDefault();
};