function t(string) {
    if (typeof translations[string] === 'undefined') {
        return string;
    }
    else {
        return translations[string];
    }
}