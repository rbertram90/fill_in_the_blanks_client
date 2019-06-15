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
    if (data.for) element.setAttribute('for', data.for);
    if (data.name) element.name = data.name;
    if (data.type) element.type = data.type;
    if (data.value) element.value = data.value;
    
    if (data.data) {
        Object.keys(data.data).forEach(function(key,index) {
            element.setAttribute('data-' + key, data.data[key]);
        });
    }

    return element;
};