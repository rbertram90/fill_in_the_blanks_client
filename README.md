<img src="https://raw.githubusercontent.com/rbertram90/fill_in_the_blanks_client/master/public/images/logo.png" width="300" alt="Fill in the Blanks logo">

## Fill in the Blanks game client
This application contains client code for a 'Cards Against Humanity' style game. The code repository for the server is on https://github.com/rbertram90/fill_in_the_blanks_server. The client and server communication is achieved through WebSockets for a seemless gaming experience!

### Client
The lastest version of this client is available for anyone to use at http://fillintheblanks.rbwebdesigns.co.uk/game.php however it is down to individuals to host the game server.

### Playing the game
To play you will need to connect to a server, enter the server IP address and port then type a username and choose your player icon. All these settings will be saved to local storage within the browser for when you play next.

<img src="https://raw.githubusercontent.com/rbertram90/fill_in_the_blanks_client/master/public/images/screenshots/login.jpg" width="400px" alt="Connect screen">

Once the game has been started, each player (other than the judge) chooses the card(s) they wish to play in the current round.

<img src="https://raw.githubusercontent.com/rbertram90/fill_in_the_blanks_client/master/public/images/screenshots/choosing.jpg" width="400px" alt="Card selection screen">

When all submissions have been receieved, or the timer has run out, the judge then selects the card combination they feel should win the round.

<img src="https://raw.githubusercontent.com/rbertram90/fill_in_the_blanks_client/master/public/images/screenshots/judge.jpg" width="400px" alt="Judging results screen">

The game ends when a player has reached the target number of round wins. They can now proceed to rub it in their competitors faces!

<img src="https://raw.githubusercontent.com/rbertram90/fill_in_the_blanks_client/master/public/images/screenshots/win.jpg" width="400px" alt="Game finished screen">

The server is then be restarted to play another game; no data from the previous game has been saved.