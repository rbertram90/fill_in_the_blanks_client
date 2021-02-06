/**
 * Helper functions to make creating interfaces using
 * javascript a bit friendlier and more consise
 */
/**
 * Round submissions component
 */
function DOMHelper() {};

DOMHelper.prototype.constructor = DOMHelper;

DOMHelper.prototype.element = function (data) {
    var element = document.createElement(data.tag);

    // Inner content
    if (data.text) element.innerText = data.text;
    else if (data.html) element.innerHTML = data.html;

    // Attributes
    if (data.class)  element.className = data.class;
    if (data.id) element.id = data.id;

    if (data.src) element.src = data.src;
    if (data.alt) element.alt = data.alt;
    if (data.for) element.setAttribute('for', data.for);
    if (data.name) element.name = data.name;
    if (data.type) element.type = data.type;
    if (data.value) element.value = data.value;
    if (data.placeholder) element.placeholder = data.placeholder;
    
    if (data.data) {
        Object.keys(data.data).forEach(function(key,index) {
            element.setAttribute('data-' + key, data.data[key]);
        });
    }

    if (data.parent) {
        data.parent.appendChild(element);
    }

    return element;
};

// Shortcuts

DOMHelper.prototype.label = function (data) {
    data.tag = 'label';
    return this.element(data);
};

DOMHelper.prototype.dropdown = function (data) {
    data.tag = 'select';
    var elem = this.element(data);

    for (var i=0; i<data.options.length; i++) {
        var option = this.element({ tag:'option', text:data.options[i], value:i });
        elem.appendChild(option);
    }

    return elem;
};