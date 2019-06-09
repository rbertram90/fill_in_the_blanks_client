/**
 * Round submissions component
 */
function RoundSubmissions(game, parentElement) {
    Component.call(this, game);

    this.parentElement = parentElement;
    this.pickWinnerButton = null;
};

RoundSubmissions.prototype = Object.create(Component.prototype);
RoundSubmissions.prototype.constructor = RoundSubmissions;

RoundSubmissions.prototype.redraw = function (message, playerIsJudge) {
    var output = "";

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
        subheading = document.createElement('p');
        subheading.innerText = t('Card czar is picking the winner');
    }

    this.parentElement.appendChild(heading);
    if (errorWrapper) this.parentElement.appendChild(errorWrapper);
    if (subheading) this.parentElement.appendChild(subheading);

    var submissionsWrapper = document.createElement('div');
    submissionsWrapper.id = 'player_card_submissions';

    var originalQuestionText = this.game.currentQuestion.text;

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
        // Build up a new string, replacing blanks in question with card text
        var playerCards = randomisedCards[c];
        var cardIndex = 0;
        var questionText = originalQuestionText;

        while (questionText.indexOf('____') > -1) {
            questionText = questionText.replace('____', '<strong>' + playerCards[cardIndex].text + '</strong>');
            cardIndex++;
        }

        var formElement = document.createElement('div');
        formElement.className = 'form-element';

        var cardElement = document.createElement('p');
        cardElement.className = 'card';
        // use the ID of first card as we only need it for identifying who has won the round
        cardElement.id = 'played_card' + playerCards[0].id;
        cardElement.dataset.id = playerCards[0].id;
        cardElement.innerHTML = questionText;

        if (playerIsJudge) {
            cardElement.addEventListener('click', this.highlightWinner);
        }

        formElement.appendChild(cardElement);
        submissionsWrapper.appendChild(formElement);
    }

    this.parentElement.appendChild(submissionsWrapper);

    if (playerIsJudge) {
        var pickWinnerButton = document.createElement('button');
        pickWinnerButton.id = 'pick_winner';
        pickWinnerButton.innerText = t('Confirm selection');
        pickWinnerButton.addEventListener('click', this.pickWinner);
        this.parentElement.appendChild(pickWinnerButton);
        this.pickWinnerButton = pickWinnerButton;
    }
};

/**
 * Click handler for selecting winning card
 * 
 * @param {event} event
 */
RoundSubmissions.prototype.highlightWinner = function (event) {
    var game = window.BlanksGameInstance;
    var roundSubmissions = game.components.roundSubmissions;

    var allCards = document.querySelectorAll('#' + roundSubmissions.parentElement.id + ' .card');

    // console.log('#' + roundSubmissions.parentElement.id + ' .card');
    // console.log(allCards);

    for (i = 0; i < allCards.length; i++) {
        if (allCards[i].className == 'card active') {
            allCards[i].className = "card";
        }
    }

    // Toggle active class
    if (this.className.indexOf('active') > -1) {
        this.className = "card";
    }
    else {
        this.className = "card active";
    }
};

/**
 * Click handler for confirm selection button
 * Judging player has picked a winning card
 * 
 * @param {event} event
 */
RoundSubmissions.prototype.pickWinner = function (event) {
    var game = window.BlanksGameInstance;
    var roundSubmissions = game.components.roundSubmissions;
    var winningCard = document.querySelector('#' + roundSubmissions.parentElement.id + " .card.active");

    if (!winningCard) {
        document.getElementById('pick_errors').innerHTML = '<p class="error">' + t('Please select the winning card') + '</p>';
        // game.components.messagePanel.showMessage(t('Please select a card'), 'error');
        return;
    }

    roundSubmissions.pickWinnerButton.disabled = true;

    game.socket.send('{ "action": "winner_picked", "card": ' + winningCard.dataset.id + ' }');
};