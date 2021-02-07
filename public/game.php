<?php
    session_start();

    include __DIR__ .'/../Translate.php';

    if (isset($_GET['lang'])) {
        $_SESSION['user_lang'] = $_GET['lang'];
    }
    $lang = isset($_SESSION['user_lang']) ? $_SESSION['user_lang'] : 'en';

    if (file_exists(__DIR__ .'/../lang/'. $lang .'.php')) {
        Translate::$language = $lang;
    }
?><!DOCTYPE html>
<html lang="<?php print $lang ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Fill in the Blanks game client</title>
    <meta name="description" content="An open source browser card game, based on Cards Against Humanity with a twist.">

    <meta property="og:title" content="Fill in the Blanks">
    <meta property="og:description" content="An open source browser card game, based on Cards Against Humanity with a twist.">
    <meta property="og:image" content="http://fillintheblanks.rbwebdesigns.co.uk/images/banner.png">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="stylesheet" type="text/css" href="/css/game.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.7.0/animate.min.css">
    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro" rel="stylesheet">
    <link href="/images/favicon.png" type="image/png" rel="icon">
    <!-- https://www.dafont.com/karmatic-arcade.font -->
</head>
<body>
    <script>
    <?php if ($lang == 'en'): ?>
        var translations = {};
    <?php else: ?>
        var translations = <?php print json_encode(Translate::getTranslations()); ?>;
    <?php endif; ?>

    <?php if (file_exists(__DIR__ .'/../config.json')): ?>
        var config = <?php include (__DIR__ .'/../config.json') ?>;
    <?php else: ?>
        var config = {};
    <?php endif; ?>
    </script>

    <script src="/lib/jquery-3.4.1.min.js"></script>
    <script src="/lib/jquery-ui.min.js"></script>
    <script src="/lib/jquery-ui-touch-punch.min.js"></script>
    <script src="/app/helpers/DOMHelper.js"></script>
    <script src="/app/translate.js"></script>
    <script src="/app/Player.js"></script>
    <script src="/app/Component.js"></script>
    <script src="/app/components/PlayerList.js"></script>
    <script src="/app/components/RoundSubmissions.js"></script>
    <script src="/app/components/PlayerDeck.js"></script>
    <script src="/app/main.js"></script>

</body>
</html>