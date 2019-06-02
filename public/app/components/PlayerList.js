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

PlayerList.prototype.serverDisconnected = function(message) {
    this.parentElement.innerHTML = '<p class="not-active-message">' + t("Awaiting connection to server") + '</p>';
};

PlayerList.prototype.redraw = function() {
    var output = "<h2>Players</h2><table cellpadding='5' cellspacing='1' width='100%'><tr><th></th><th>"
        + t("Username") + "</th><th>"
        + t("Score") + "</th><th>"
        + t("Status") + "</th></tr>";
        
    for (var p = 0; p < this.players.length; p++) {
        var player = this.players[p];
        if (!player.isActive) continue;

        // todo - make this more secure!
        // if (player.isGameHost && player.username == this.game.player.username) {
        //    clientIsGameHost = true;
            // why is this being done here??!
        //    document.getElementById("host_controls").style.display = 'block';
        // }

        output += '<tr data-player-name="' + player.username + '">';
        output += '<td>' + (player.isGameHost ? 'H' : '') + '</td>';
        output += '<td>' + player.username + '</td>';
        output += '<td>' + player.score + '</td>';
        output += '<td>' + t(player.status) + '</td></tr>';
    }
    this.parentElement.innerHTML = output + "</table>";
};