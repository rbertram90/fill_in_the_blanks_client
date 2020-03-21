function t(string) {
    if (typeof translations[string] === 'undefined') {
        console.warn('Notice: no translation entry for ' + string);
        return string;
    }
    else {
        return translations[string];
    }
}