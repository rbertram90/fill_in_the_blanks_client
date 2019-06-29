/**
 * Round submissions component
 */
function PlayerDeck(game, parentElement) {
    Component.call(this, game);

    this.cardsSelectable = false;
    this.parentElement = parentElement;
    this.errorWrapper = null;
    this.submitButton = null;
};

PlayerDeck.prototype = Object.create(Component.prototype);
PlayerDeck.prototype.constructor = PlayerDeck;

PlayerDeck.prototype.redraw = function() {
    var helper = new DOMHelper();
    var player = this.game.player;

    var errorWrapper = helper.element({ tag:'div' });
    this.errorWrapper = errorWrapper;
    this.parentElement.appendChild(errorWrapper);

    var form = document.createElement('form');
    form.id = 'player_hand';
    this.parentElement.appendChild(form);

    // Answer types
    var typesWrapper = helper.element({ tag:'div', id:'answer_type_wrapper', class:'simple-grey-panel' });

    var switchType = function(type, cardIndex) {
        switch (type) {
            case 'premade':
                document.getElementById('custom_text_wrapper_'+cardIndex).style.display = 'none';
                document.getElementById('custom_image_wrapper_'+cardIndex).style.display = 'none';
                var card = document.getElementById('card_'+cardIndex);
                card.innerHTML = card.dataset.originalText;
                break;
            case 'customtext':
                document.getElementById('custom_text_wrapper_'+cardIndex).style.display = 'block';
                document.getElementById('custom_image_wrapper_'+cardIndex).style.display = 'none';
                break;
            case 'image':
                document.getElementById('custom_text_wrapper_'+cardIndex).style.display = 'none';
                document.getElementById('custom_image_wrapper_'+cardIndex).style.display = 'block';
                break;
        }
    };

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
        // cardElement.setAttribute('contenteditable', true);
        cardWrapper.appendChild(cardElement);

        var radiobuttonswrapper = helper.element({ tag:'div' });

        for (var i = 0; i < this.game.currentQuestion.blanks; i++) {
            
            var radioButton = helper.element({
                tag: 'input',
                type: 'radio',
                name: 'card_' + i,
                value: player.cards[c].id,
                data: {
                    cardnum: i+1
                }
            });
            radiobuttonswrapper.appendChild(radioButton);
        }

        cardWrapper.appendChild(radiobuttonswrapper);

        // Answer input type
        var answerType = helper.element({ tag:'select',
            id:'answer_type_'+c,
            class: 'card-type-select',
            data: {
                index: c
            }
        });

        var typeOption1 = helper.element({ tag:'option', value:'premade', text:t('Default text') });
        var typeOption2 = helper.element({ tag:'option', value:'customtext', text:t('Custom text') });
        var typeOption3 = helper.element({ tag:'option', value:'image', text:t('Image') });
        answerType.appendChild(typeOption1);
        answerType.appendChild(typeOption2);
        answerType.appendChild(typeOption3);
        
        cardWrapper.appendChild(answerType);
        answerType.addEventListener('change', function(event) {
            switchType(this.value, this.dataset.index);
        });

        // Custom text
        var customCardWrapper = helper.element({ tag:'div', id:'custom_text_wrapper_'+c, class:'custom-text-wrapper simple-grey-panel' });

        var textBoxLabel = helper.element({ tag:'label', for:'custom_text_input_'+c, text:t('Your text') });
        var textBox = helper.element({ tag:'textarea', id:'custom_text_input_'+c, data:{cardindex:c} });

        textBox.addEventListener('keyup', function(event) {
            document.getElementById('card_'+this.dataset.cardindex).innerText = this.value;
        });
        textBox.setAttribute('onkeydown', 'if(event.keyCode == 13) return false;');

        customCardWrapper.appendChild(textBoxLabel);
        customCardWrapper.appendChild(textBox);
        customCardWrapper.style.display = 'none';
        cardWrapper.appendChild(customCardWrapper);

        // Image
        var customImageWrapper = helper.element({ tag:'div', id:'custom_image_wrapper_'+c, class:'custom-image-wrapper' });
        var imageFieldWrapper = helper.element({ tag:'div', class:'simple-grey-panel' });
        var imageSourceLabel = helper.element({ tag:'label', for:'custom_image_input', text:t('URL to image')+': ' });
        imageFieldWrapper.appendChild(imageSourceLabel);

        var imageSource = helper.element({ tag:'input', type:'text', id:'custom_image_input', data:{cardindex:c} });
        imageSource.style.width = '100%';
        imageSource.placeholder = 'http://example.com/image.jpg';
        imageSource.addEventListener('keyup', function(event) {
            document.getElementById('card_'+this.dataset.cardindex).innerHTML = '<a href="' + this.value + '" target="_blank"><img src="' + this.value + '" alt="Image not valid" style="max-width:100%; max-height:90%"></a><br><small>' + t('Click to view full size') + '</small>';
        });
        imageFieldWrapper.appendChild(imageSource);

        if (config.giphy_api_key) {

            var giphyButton = helper.element({ tag:'button', type:'button', text:'Search for GIF', data:{cardindex:c} });
            giphyButton.addEventListener('click', function(e) {
                var cardIndex = this.dataset.cardindex;

                var container = document.getElementById('giphy_search_box');
                if (!container) {
                    container = helper.element({ tag:'div', id: 'giphy_search_box' });
                    document.body.appendChild(container);
                }

                var innerHeading = helper.element({ tag:'h1', text:t('Search GIPHY') });
                container.appendChild(innerHeading);

                var paragraph = helper.element({ tag:'p', text:t('Enter your search text to search giphy.com API for GIFs, then click the image you want to use and press "Select" to confirm.') });
                container.appendChild(paragraph);

                var innerInput = helper.element({ tag:'input', type:'text', id:'giphy_search_text', placeholder:'Your search text' });
                container.appendChild(innerInput);

                var innerButton = helper.element({ tag:'button', type:'button', id:'giphy_search', text:t('Search') });
                container.appendChild(innerButton);
                innerButton.addEventListener('click', function(e) {
                    var searchTerm = encodeURIComponent(document.getElementById('giphy_search_text').value);
                    var xhr = $.get({
                        url:"http://api.giphy.com/v1/gifs/search?q=" + searchTerm + "&api_key=" + config.giphy_api_key + "&limit=16",
                        crossDomain: true
                    });
                    xhr.done(function(data) {
                        var wrapper = document.getElementById('giphy_results');

                        for(var i = 0; i < data.data.length; i++) {
                            var item = data.data[i];
                            var imageURL = item.images.fixed_width_downsampled.url;
                            var selectableDiv = helper.element({ tag:'div', class:'giphy_selectable', data: {url:imageURL } });
                            var giphyImage = helper.element({ tag:'img', src:imageURL, alt:item.title });
                            selectableDiv.appendChild(giphyImage);
                            wrapper.appendChild(selectableDiv);

                            selectableDiv.addEventListener('click', function(e) {
                                $('.giphy_selectable.active').removeClass('active');

                                this.className = 'giphy_selectable active';

                                document.getElementById('giphy_submit').style.display = 'inline-block';
                            });
                        }

                    });

                    e.preventDefault();
                });

                var resultsArea = helper.element({ tag:'div', id:'giphy_results' });
                container.appendChild(resultsArea);

                var submitButton = helper.element({ tag:'button', type:'button', id:'giphy_submit', class:'big', text:t('Select') });
                submitButton.style.display = 'none';
                container.appendChild(submitButton);
                submitButton.addEventListener('click', function(e) {
                    // add URL to text box
                    var url = $('.giphy_selectable.active').data('url');
                    var imageInput = document.querySelector('input[data-cardindex="' + cardIndex +'"]');

                    imageInput.value = url;
                    imageInput.dispatchEvent(new Event('keyup'));

                    document.getElementById('giphy_search_box').innerHTML = '';
                    document.getElementById('giphy_search_box').style.display = 'none';
                });

                var closeButton = helper.element({ tag:'button', type:'button', class:'secondary', id:'giphy_close', text:t('Close') });
                container.appendChild(closeButton);
                closeButton.addEventListener('click', function(e) {
                    document.getElementById('giphy_search_box').innerHTML = '';
                    document.getElementById('giphy_search_box').style.display = 'none';
                });
                
                container.style.display = 'block';
                e.preventDefault();
            });

            imageFieldWrapper.appendChild(giphyButton);
        }
        
        customImageWrapper.style.display = 'none';
        customImageWrapper.appendChild(imageFieldWrapper);
        cardWrapper.appendChild(customImageWrapper);

        form.appendChild(cardWrapper);
    }  
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
    var form = document.forms.namedItem("player_hand");
    var thisComponent = game.components.playerDeck;

    thisComponent.submitButton.disabled = true;

    var answers = [];
    var answerIndexes = [];

    for (var i=0; i < game.currentQuestion.blanks; i++) {
        var card = form.elements['card_' + i]; // RadioNodeList

        // Check that the user has not selected the same card twice!
        if (answerIndexes.indexOf(card.value) > -1) {
            thisComponent.showError(t('Please select ' + game.currentQuestion.blanks + ' different cards.'));
            return;
        }
        else {
            answerIndexes.push(card.value);
        }
        
        // Extract card data
        if (card && card.value) {
            var cardText = document.querySelector('#' + form.id + ' p[data-id="' + card.value + '"]').innerHTML;
            
            if (cardText.length == 0) {
                thisComponent.showError(t('Please ensure selected cards have text entered'));
                return false;
            }

            answers.push({
                id: card.value,
                text: cardText
            });
        }
        else {
            thisComponent.showError(t('Please select the correct number of cards'));
            return false;
        }
    }

    game.socket.send('{ "action": "cards_submit", "cards": ' + JSON.stringify(answers) + ' }');

    var newContent = '<h2>' + t('Waiting for other players...') + '</h2>';
    game.parentElement.innerHTML = newContent;

    var connectedUsers = document.createElement('div');
    connectedUsers.id = 'connected_users';
    game.components.playerList = new PlayerList(this, connectedUsers);
    game.components.playerList.redraw();    
    game.parentElement.appendChild(connectedUsers);
};