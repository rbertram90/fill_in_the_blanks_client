/**
 * Messages panel
 */
function MessagesPanel(game) {
    Component.call(this, game);

    this.messageIndex = 0;
    this.wrapper = document.getElementById('server_messages');

    this.showMessage(t('Welcome to Fill in the Blanks!'));
    this.showMessage(t('To start playing, enter the host details, pick your player name, and click <strong>Connect</strong>.'));
};

MessagesPanel.prototype = Object.create(Component.prototype);
MessagesPanel.prototype.constructor = MessagesPanel;

MessagesPanel.prototype.playerConnected = function(message) {
    var connectedText = t('<strong>[username]</strong> connected');
    connectedText = connectedText.replace('[username]', message.playerName);
    this.showMessage(connectedText);
};

MessagesPanel.prototype.playerDisconnected = function(message) {
    var connectedText = t('<strong>[username]</strong> disconnected');
    connectedText = connectedText.replace('[username]', message.playerName);
    this.showMessage(connectedText);
};

MessagesPanel.prototype.roundStart = function(message) {
    var roundStartText = t("Round started - <strong>[username]</strong> is the card czar.");
    roundStartText = roundStartText.replace('[username]', message.currentJudge.username);
    this.showMessage(roundStartText, 'success');

    var currentJudge = message.currentJudge.username;

    if (currentJudge !== this.game.usernameField.value) {
        this.showMessage(t("Choose your card(s)"));
    }
    else {
        this.showMessage(t("Waiting for other players to choose card(s)"));
    }
};

MessagesPanel.prototype.answerCardUpdate = function(message) {
    this.showMessage(t('Cards receieved'));
};

/**
 * Error handler for when server failed to start game, this would
 * likely be because there aren't enough players!
 * 
 * @param {string} details Message from server
 */
MessagesPanel.prototype.startGameFail = function(message) {
    if (this.game.clientIsGameHost) {
        this.showMessage(t('Failed to start game') + ' - ' + t(message.message), 'error');
        this.game.startGameButton.disabled = false;
    }
};

MessagesPanel.prototype.playerSubmitted = function (message) {
    this.showMessage('<strong>' + message.playerName + '</strong> '+ t('played their card(s)'));
};

MessagesPanel.prototype.roundJudge = function (message) {
    this.showMessage(t('All players have played their card(s)'));
};

MessagesPanel.prototype.roundWinner = function (message) {
    this.showMessage(t('Round winner is') + ': <strong>' + message.winner.username + '</strong>', 'success');
};

MessagesPanel.prototype.gameReset = function (message) {
    this.showMessage(t('Game has been reset'), 'success');
};

/**
 * Add a message to the messages panel
 * 
 * @param {string} text Message to show
 * @param {string} type Message context - success, error or info
 */
MessagesPanel.prototype.showMessage = function(text, type='info') {
    var d = new Date();
    var hours = "0" + d.getHours();
    var minutes = "0" + d.getMinutes();
    var time = hours.substring(hours.length - 2) + ':' + minutes.substring(minutes.length - 2);
    // serverMessages.innerHTML = "<p class='message " + type + "' id='message" + messageIndex + "' title='Added at " + time + "' data-added-at='" + time + "'>" + text + "</p>" + serverMessages.innerHTML;

    var message = document.createElement('p');
    message.id = 'message' + this.messageIndex;
    message.className = 'message ' + type;
    message.setAttribute('title', t('Added at ') + time);
    message.setAttribute('data-added-at', time);
    message.innerHTML = text;

    if (this.messageIndex > 0) {
        this.wrapper.insertBefore(message, document.getElementById('message' + (this.messageIndex-1)));
    }
    else {
        this.wrapper.appendChild(message);
    }

    this.animateCSS('#message' + this.messageIndex, 'flipInX');

    this.messageIndex++;
};

/**
 * Handle animating one message at a time
 */
MessagesPanel.prototype.animateCSS = function (element, animationName, callback)
{
    var node = document.querySelector(element)
    node.classList.add('animated', animationName)

    function handleAnimationEnd() {
        node.classList.remove('animated', animationName)
        node.removeEventListener('animationend', handleAnimationEnd)

        if (typeof callback === 'function') callback()
    }

    node.addEventListener('animationend', handleAnimationEnd)
};