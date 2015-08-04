

var querycache = {};

chrome.omnibox.setDefaultSuggestion({description: '<url><match>%s</match></url>'});

chrome.omnibox.onInputChanged.addListener(autocomplete);

chrome.omnibox.onInputEntered.addListener(gotoword);

