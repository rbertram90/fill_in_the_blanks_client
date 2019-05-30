/**
 * Round submissions component
 */
function RoundSubmissions(game) {
    Component.call(this, game);

    this.wrapper = document.getElementById('judging_outer');
    this.pickWinnerButton = null;
};

RoundSubmissions.prototype = Object.create(Component.prototype);
RoundSubmissions.prototype.constructor = RoundSubmissions;

RoundSubmissions.prototype.roundStart = function(message) {
    this.wrapper.innerHTML = "<p class='not-active-message'>" + t("Awaiting player submissions") + "</p>";
};

RoundSubmissions.prototype.connectedGameStatus = function (message) {
    if (message.game_status == 0) {
        // Awaiting game start
        this.wrapper.innerHTML = "<p class='not-active-message'>" + t("Awaiting game start") + "</p>";
    }
    else {
        // Awaiting next round to start
        this.wrapper.innerHTML = '<p class="not-active-message">' + t('Awaiting next round to start') + '</p>';
    }
};

RoundSubmissions.prototype.roundJudge = function (message) {
    var output = "";
    var originalQuestionText = document.querySelector('#question_outer .question').innerHTML; // should really store this somewhere!

    // Randomise submission ordering
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

        // use the ID of first card as we only need it for identifying who has won the round
        output += "<p class='card' id='played_card" + playerCards[0].id + "' data-id='" + playerCards[0].id + "'>" + questionText + "</p>";
    }

    if (message.currentJudge.username == this.game.usernameField.value) {
        output += '<button id="pick_winner">' + t('Confirm selection') + '</button>';
    }
    
    this.wrapper.innerHTML = output;

    if (message.currentJudge.username == this.game.usernameField.value) {
        var cards = document.querySelectorAll("#judging_outer .card");
        for (var c = 0; c < cards.length; c++) {
            cards[c].addEventListener('click', this.highlightWinner);
        }
        this.game.userIsPicking = true;
        this.pickWinnerButton = document.querySelector('#pick_winner');
        this.pickWinnerButton.addEventListener('click', this.pickWinner);
        this.game.components.messagePanel.showMessage(t("It\'s your turn to choose the winning card"));
    }
};

/**
 * Click handler for selecting winning card
 * 
 * @param {event} event
 */
RoundSubmissions.prototype.highlightWinner = function (event) {
    var game = window.BlanksGameInstance;

    if (game.userIsPicking) {
        var allCards = document.querySelectorAll("#judging_outer .card");
        for (i = 0; i < allCards.length; ++i) {
            allCards[i].className = "card";
        }

        // Toggle active class
        if (this.className.indexOf('active') > -1) {
            this.className = "card";
        }
        else {
            this.className = "card active";
        }
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
    var winningCard = document.querySelector("#judging_outer .card.active");

    if (!winningCard) {
        game.components.messagePanel.showMessage(t('Please select a card'), 'error');
        return;
    }

    roundSubmissions.pickWinnerButton.disabled = true;
    userIsPicking = false;

    game.socket.send('{ "action": "winner_picked", "card": ' + winningCard.dataset.id + ' }');
};

RoundSubmissions.prototype.serverDisconnected = function(message) {
    this.wrapper.innerHTML = '<p class="not-active-message">' + t('Awaiting connection to server') + '</p>';
};