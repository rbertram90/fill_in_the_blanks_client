/**
 * Round submissions component
 */
function PlayerDeck(game, parentElement) {
    Component.call(this, game);

    this.cardsSelectable = false;
    this.parentElement = parentElement;
    this.errorWrapper = null;
    this.submitButton = null;
    this.cardID = 0;
};

PlayerDeck.prototype = Object.create(Component.prototype);
PlayerDeck.prototype.constructor = PlayerDeck;

PlayerDeck.prototype.redraw = function(data) {
    var helper = new DOMHelper();
    var player = this.game.player;

    var wrapper = helper.div({ id:'game_window', parent:this.parentElement });
    helper.element({ tag:'h2', text:t('Choose your card(s)'), parent:wrapper });

    if (data.currentReader) {
        var readerText = t("It's [player] turn to read");
        readerText = readerText.replace("[player]", data.currentReader.username);
        helper.element({ tag:'h3', text:readerText, parent:wrapper });
    }

    // @todo If someone connects half way through a round then the timer on their screen will be wrong...
    if (data.roundTime > 0) {
        var nowSeconds = Math.floor(new Date().getTime() / 1000);
        var roundEnd = nowSeconds + parseInt(data.roundTime / 1000);
        
        var timer = helper.element({ tag:'div', class:'round-timer', id:'round_timer', data:{ roundend: roundEnd } });
        wrapper.appendChild(timer);

        var tickTime = function() {
            var elem = document.getElementById('round_timer');

            if (!elem) return;
            var roundEnd = elem.dataset.roundend;
            var nowSeconds = Math.floor(new Date().getTime() / 1000);
            var seconds = (roundEnd - nowSeconds);
            var minutes = Math.floor(seconds / 60);
            seconds = seconds - (minutes*60);
            elem.innerText = t('Time remaining:') + ' ' + minutes + ':' + ('00' + seconds).slice(-2);
            
            if (minutes <= 0 && seconds <= 0) return;
            setTimeout(tickTime, 1000);
        };
        
        setTimeout(tickTime, 1);
    }

    // In play wrapper
    var inPlay = helper.div({ id:'in_play', parent:wrapper });

    // Question card
    helper.element({ tag:'div', id:'question_card', html:data.questionCard.text, parent:inPlay })

    var labels = [t('First card'), t('Second card'), t('Third card')];

    // Active placeholders
    var activePlaceholdersRequired = this.game.currentQuestion.blanks;
    for (var aph = 0; aph < activePlaceholdersRequired; aph++) {
        var placeholder = helper.element({ tag:'div', class:'input-wrapper' });

        var label = helper.element({ tag:'p', text:labels[aph] });
        placeholder.appendChild(label);

        var dropzone = helper.element({ tag:'div', class:'card-dropzone' });
        placeholder.appendChild(dropzone);

        $(dropzone).droppable({
            drop: function(event, ui) {
                var draggedCard = ui.draggable;

                // Enable the original parent to now be droppable
                draggedCard.parent().droppable("enable");

                $(this).append(draggedCard);
                draggedCard.css('top', 0);
                draggedCard.css('left', 0);

                // Disable so no more cards can be added to this space
                $(event.target).droppable("disable");

                // Enable the edit button
                $(this.parentElement).find('button.edit-card').prop('disabled', false);
            }
        });

        if (this.game.allowCustomText || this.game.allowImages) {
            var editButton = helper.element({ tag:'button', text:t('Edit card'), class:'edit-card' });
            editButton.setAttribute('disabled', 'disabled');

            editButton.addEventListener('click', function (e) {
                var card = $(this.parentElement).find('p.card');
                var cardID = card.attr('id');
                var thisComponent = window.BlanksGameInstance.getComponentInstance('playerDeck');
                thisComponent.showEditCardModal(cardID);
                e.preventDefault();
            });

            placeholder.appendChild(editButton);
        }

        inPlay.appendChild(placeholder);
    }

    // Inactive placeholders
    // Hard coded 3 - max number of blanks in one card!
    var placeholdersRequired = 3 - this.game.currentQuestion.blanks;
    for (var ph = 0; ph < placeholdersRequired; ph++) {
        var placeholder = helper.element({ tag:'div', class:'card-no-dropzone' });
        inPlay.appendChild(placeholder);
    }

    // Submit button
    var submitCardsButton = helper.element({ tag:'button', class:'big', text:t('Play card(s)'), parent:wrapper });
    this.submitButton = submitCardsButton;
    submitCardsButton.addEventListener('click', this.submitCards);

    // Answer cards
    var playerCardsWrapper = helper.div({ id:'player_hand', parent:wrapper });

    var errorWrapper = helper.element({ tag:'div' });
    this.errorWrapper = errorWrapper;
    playerCardsWrapper.appendChild(errorWrapper);

    var form = document.createElement('form');
    form.id = 'player_hand';
    playerCardsWrapper.appendChild(form);

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
                if ($(this).find('p.card').length > 0) {}
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

    game.player.selectedCards = answers;

    // todo: this should be its own component!
    var newContent = '<h2>' + t('Waiting for other players...') + '</h2>';
    game.parentElement.innerHTML = newContent;

    var connectedUsers = helper.element({ tag:'div', id:'connected_users', parent:game.parentElement });
    var playerList = game.getComponentInstance('playerList')
    playerList.setParent(connectedUsers);
    playerList.redraw();
};

PlayerDeck.prototype.showEditCardModal = function (cardID) {

    this.cardID = cardID;

    var helper = new DOMHelper();
    var card = $('#' + cardID);
    if (!card.length == 1) {
        console.error('Card not found!');
        return;
    }

    if (card.find('.text').length > 0) {
        var text = card.find('.text').html();
        var image = card.find('img').attr('src');
    }
    else {
        var text = card.html();
        var image = '';
    }

    var container = document.getElementById('card_edit_box');
    if (container) {
        container.style.display = 'block';
    }
    else {
        container = helper.div({ id:'card_edit_box' });
        document.body.appendChild(container);
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    var innerContainer = helper.div({ class:'container', parent:container });
    helper.element({ tag:'h2', text:t('Edit card'), parent:innerContainer });

    if (this.game.allowCustomText) {
        // Custom text form field
        var customCardWrapper = helper.div({ id:'custom_text_wrapper', parent:innerContainer });
        helper.element({ tag:'label', for:'custom_text_input', text:t('Text / Caption'), parent:customCardWrapper });
        helper.element({ tag:'textarea', id:'custom_text_input', value:text, parent:customCardWrapper });
    }
    
    if (this.game.allowImages) {    
        // Image
        helper.element({ tag:'h3', text:t('Add an image'), parent:innerContainer });

        var customImageWrapper = helper.div({ id:'custom_image_wrapper', class:'custom-image-wrapper', parent:innerContainer });    
        var imageSource = helper.textField({ id:'custom_image_input', label:t('Image URL'), value:image, parent:customImageWrapper });
        imageSource.placeholder = 'http://example.com/image.jpg';
        imageSource.style.width = '100%';
        imageSource.addEventListener('keyup', function (e) {
            $('#preview_image').attr('src', $(this).val());
        });

        helper.element({ tag:'img', id:'preview_image', src:image, parent:customImageWrapper });
        
        if (this.game.config.giphy_api_key) {
            helper.element({ tag:'p', text:t('- or -'), parent:customImageWrapper });
            helper.element({ tag:'p', text:t('Enter your search text to search Giphy API for GIFs, click the image you want to use, this will replace the URL above.'), parent:customImageWrapper });

            // Giphy wrapper
            var giphyContainer = helper.div({ class:'giphy-search-box', parent:customImageWrapper });
            helper.element({ tag:'img', src:'/images/giphy_logo.png', alt:'GIPHY', parent:giphyContainer });

            // Search wrapper
            var searchInputWrapper = helper.div({ class:'search-input-wrapper', parent:giphyContainer });

            // Input element
            helper.textField({ id:'giphy_search_text', placeholder:t('Your search text'), parent:searchInputWrapper });

            // Search Button
            var innerButton = helper.element({ tag:'button', type:'button', id:'giphy_search_button', text:t('Search'), parent:searchInputWrapper });
            innerButton.addEventListener('click', PlayerDeck.prototype.giphyRunSearch);

            // Results placeholder
            helper.div({ id:'giphy_results', parent:giphyContainer });
        }
    }

    var actionsWrapper = helper.div({ class:'actions', parent:innerContainer });

    var submitButton = helper.element({ tag:'button', type:'button', id:'edit_save', text:t('Save'), parent:actionsWrapper });
    submitButton.addEventListener('click', PlayerDeck.prototype.saveCardEdit);

    var closeButton = helper.element({ tag:'button', type:'button', id:'edit_close', text:t('Discard'), parent:actionsWrapper });
    closeButton.addEventListener('click', PlayerDeck.prototype.closeWindow);
};

/**
 * Generate and populate the new card content from player input
 * And calls close window
 * 
 * @param {event} e  Click Event
 */
PlayerDeck.prototype.saveCardEdit = function(e) {
    var game = window.BlanksGameInstance;
    var thisComponent = game.getComponentInstance('playerDeck');

    var imageUrl = false;
    if (document.getElementById('custom_image_input')) {
        imageUrl = document.getElementById('custom_image_input').value;
    }
    var imageCaption = false;
    if (document.getElementById('custom_text_input')) {
        imageCaption = document.getElementById('custom_text_input').value;
    }
    else {
        imageCaption = text;
    }

    var newCardContent = '';
    if (imageUrl) {
        newCardContent += '<a href="' + imageUrl + '" target="_blank"><img src="' + imageUrl + '" alt="Image not valid" style="max-width:100%; max-height:90%"></a><br><small>' + t('Click to view full size') + '</small>';
    }
    if (imageCaption) {
        newCardContent += '<div class="text">' + imageCaption + '</div>';
    }

    document.getElementById(thisComponent.cardID).innerHTML = newCardContent;
    thisComponent.closeWindow(e);
};

/**
 * Close the card edit modal window
 * 
 * @param {event} e  Click Event
 */
PlayerDeck.prototype.closeWindow = function(e) {
    var container = document.getElementById('card_edit_box');
    container.innerHTML = '';
    container.style.display = 'none';
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';
};

/**
 * Run giphy search
 * 
 * @param {event} e  Click Event
 */
PlayerDeck.prototype.giphyRunSearch = function (e) {
    var game = window.BlanksGameInstance;
    var searchTerm = encodeURIComponent(document.getElementById('giphy_search_text').value);
    var xhr = $.get({
        url:"http://api.giphy.com/v1/gifs/search?q=" + searchTerm + "&api_key=" + game.config.giphy_api_key + "&limit=16",
        crossDomain: true
    });
    xhr.done(function(data) {
        var wrapper = document.getElementById('giphy_results');

        for (var i = 0; i < data.data.length; i++) {
            var item = data.data[i];
            var imageURL = item.images.fixed_width_downsampled.url;
            var selectableDiv = helper.element({ tag:'div', class:'giphy_selectable', data: {url:imageURL }, parent:wrapper });
            selectableDiv.addEventListener('click', PlayerDeck.prototype.giphyImageSelect);
            helper.element({ tag:'img', src:imageURL, alt:item.title, parent:selectableDiv });
        }
    });

    e.preventDefault();
};

/**
 * Select giphy image
 * 
 * @param {event} e  Click Event
 */
PlayerDeck.prototype.giphyImageSelect = function(e) {
    // Remove active class on all images
    document.querySelector('.giphy_selectable.active').classList.remove('active');

    // Add active class to this element
    this.classList.add('active');

    // Copy src to form field
    var imageSrcInput = document.getElementById('custom_image_input')
    imageSrcInput.value = $(this).find('img').attr('src');

    // Trigger update of preview image
    var event = new Event('keyup');
    imageSrcInput.dispatchEvent(event);
};