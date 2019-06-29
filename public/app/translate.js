function t(string) {
    if (typeof translations[string] === 'undefined') {
        console.log('Notice: no translation entry for ' + string);
        return string;
    }
    else {
        return translations[string];
    }
}