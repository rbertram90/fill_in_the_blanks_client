<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Fill in the Blanks</title>
    <meta name="description" content="An open source browser card game, based on Cards Against Humanity with a twist.">

    <meta property="og:title" content="Fill in the Blanks">
    <meta property="og:description" content="An open source browser card game, based on Cards Against Humanity with a twist.">
    <meta property="og:image" content="http://fillintheblanks.rbwebdesigns.co.uk/images/banner.png">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="stylesheet" type="text/css" href="/css/front.css">
    <link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">
    <link href="/images/favicon.png" type="image/png" rel="icon">
</head>
<body>
<header>
    <h1><img src="/images/logo.png" class="logo" alt="Fill in the Blanks"></h1>
    <p>Client and server application for a 'Cards Against Humanity' style game.</p>
</header>
<main>
    <section>
        <h2>Client</h2>
        <p>The latest version of the client is available for public use at <a href="http://fillintheblanks.rbwebdesigns.co.uk/game.php">fillintheblanks.rbwebdesigns.co.uk/game.php</a> however it's down to individuals to host game servers, as described below.</p>
        <a href="/game.php" class="big-button">Play now</a>
    </section>
    <section>
        <h2>Updates</h2>
        <p>(07/02/2021) Added Spanish translations file see: <a href="game.php?lang=es">game.php?lang=es</a>.</p>
        <p>(07/02/2021) Added ability to select from available card packs in config form.</p>
        <p>(06/02/2021) Added ability to lock game host to specific username.</p>
        <p>(25/04/2020) Added ability to prefill IP, host from query string variables.</p>
        <p>(21/03/2020) Much improved drag and drop UI.</p>
        <p>(08/03/2020) Added 'remember these details' checkbox on login form.</p>
        <p>(08/03/2020) Added ability to toggle on and off submission types (images, custom text).</p>
        <p>(25/07/2019) Added ability to use images from <a href="https://giphy.com/" target="_blank">GIPHY</a>.</p>
        <p>(23/07/2019) More player face icons!</p>
        <p>(16/07/2019) Added win game screen.</p>
        <p>(15/07/2019) Added round timer.</p>
        <p>(07/05/2019) Re-written front-end, added logo.</p>
        <p>(17/03/2019) Early stages of development: there are missing features and features that aren't meant to be there (AKA bugs!)</p>

        <h3>Contributing</h3>
        <p>This project is open source, check it out on Github:
        <ul>
            <li><a href="https://github.com/rbertram90/fill_in_the_blanks" target="_blank">Server</a></li>
            <li><a href="https://github.com/rbertram90/fill_in_the_blanks_client" target="_blank">Client</a></li>
        </ul>
        <p>Feel free to open a ticket for a feature request/ bug report, if you know PHP/Javascript and want to get your hands dirty, i'm open to pull requests.</p>
    </section>
    <section>
        <h2>Server</h2>

        <h3>Requirements</h3>
        <ul>
            <li>PHP >= 5.4.2</li>
            <li>Composer (<a href="https://getcomposer.org/" target="_blank">https://getcomposer.org/</a>)</li>
        </ul>

        <h3>Setup</h3>
        <ul>
            <li>Clone repo</li>
            <li>Run <code><b>composer</b> install</code></li>
            <li>Download or create card pack(s)</li>
            <ul>
                <li>Starter packs are available from <a href="https://fillintheblanks.rbwebdesigns.co.uk/standard.zip">fillintheblanks.rbwebdesigns.co.uk/standard.zip</a>
                <li>Currently looks for white.txt and black.txt in card_packs/standard directory
                <li>Put each question is on a new line with four underscores (____) representing white card input
            </ul>
            <li>Copy to /card_packs folder</li>
        </ul>

        <h3>Starting the game</h3>
        <ul>
            <li>Open a terminal</li>
            <li>Change into project root directory</li>
            <li>Run command <code><b>php</b> start-server.php <i>[port number]</i></code></li>
            <li>Port number defaults to <b>8080</b></li>
        </ul>
    </section>
    <section>
        <a href="/game.php" class="big-button">Play now</a>
    </section>
</main>
</body>
</html>