/**
 * Messages panel
 */
function PlayerList(game, parentElement) {
    Component.call(this, game);

    this.parentElement = parentElement;
    this.players = [];
};

PlayerList.prototype = Object.create(Component.prototype);
PlayerList.prototype.constructor = PlayerList;

PlayerList.prototype.triggerRedraw = function(message) {
    this.players = message.players;
    this.redraw();
};

PlayerList.prototype.playerConnected = PlayerList.prototype.triggerRedraw;
PlayerList.prototype.playerDisconnected = PlayerList.prototype.triggerRedraw;
PlayerList.prototype.roundStart = PlayerList.prototype.triggerRedraw;
PlayerList.prototype.playerSubmitted = PlayerList.prototype.triggerRedraw;
PlayerList.prototype.roundWinner = PlayerList.prototype.triggerRedraw;
PlayerList.prototype.gameReset = PlayerList.prototype.triggerRedraw;

PlayerList.prototype.setParent = function(newParent) {
    this.parentElement = newParent;
};

PlayerList.prototype.redraw = function() {
    var helper = new DOMHelper();
    this.parentElement.innerHTML = '';
    helper.element({ tag:'h2', text:t('Players'), parent:this.parentElement });

    for (var p = 0; p < this.players.length; p++) {
        var player = this.players[p];
        if (!player.isActive) continue;

        var playerWrapper = helper.element({ tag:'div', class:'player-card', parent:this.parentElement });
        
        helper.element({ tag:'img', src:'/images/player-icons/'+ player.icon +'.png', alt:'Player icon', parent:playerWrapper });

        if (player.status == 'Card(s) submitted' || player.status == 'Card czar' || player.status == 'Waiting') {
            playerWrapper.className = 'player-card player-ready';
        }

        helper.element({ tag:'span', text:player.score, class:'score', parent:playerWrapper });
        helper.element({ tag:'h4', text:player.username, parent:playerWrapper });
        helper.element({ tag:'p', text:t(player.status), parent:playerWrapper });
    }
};

PlayerList.prototype.winScreen = function() {
    var helper = new DOMHelper();

    var heading = helper.element({ tag:'h2', text:t('Final scores') });
    this.parentElement.appendChild(heading);

    this.players.sort((a, b) => (a.score > b.score) ? -1 : 1);

    var winner = helper.element({ tag:'h3', text:t('[name] is the game winner'), class:'winner-text' });
    winner.innerHTML = winner.innerText.replace('[name]', '<strong>' + this.players[0].username + '</strong>');
    this.parentElement.appendChild(winner);

    var playercardWrapper = helper.element({ tag:'div', class:'playercards' });

    for (var p = 0; p < this.players.length; p++) {
        var player = this.players[p];
        if (!player.isActive) continue;

        var playerWrapper = helper.element({ tag:'div', class:'player-card' });
        
        var playerIcon = helper.element({ tag:'img', src:'/images/player-icons/' + player.icon + '.png', alt:'Player icon' });
        playerWrapper.appendChild(playerIcon);

        var playerScore = helper.element({ tag:'span', text:player.score, class:'score' });
        playerWrapper.appendChild(playerScore);
        
        var playerName = helper.element({ tag:'h3', text:player.username });
        playerWrapper.appendChild(playerName);

        playercardWrapper.appendChild(playerWrapper);
    }

    this.parentElement.appendChild(playercardWrapper);
};