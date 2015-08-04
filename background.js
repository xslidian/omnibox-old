
function navigate(url) {
	// taken from https://developer.chrome.com/extensions/examples/extensions/chrome_search/background.js
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.update(tabs[0].id, {url: url});
	});
}

function escapeRegExp(string){
	// taken from https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}



var o2p = function(o) {
	if (Object.prototype.toString.call(o) == '[object Number]') {
		return o;
	}
	if (Object.prototype.toString.call(o) == '[object String]') {
		return encodeURIComponent(o);
	}
	var a = new Array();
	if (Object.prototype.toString.call(o) == '[object Array]') {
		o.forEach(function(v, k){
			a.push( encodeURIComponent(k) + '=' + o2p(v));
		});
	}
	if (Object.prototype.toString.call(o) == '[object Object]') {
		for (var k in o) {
			if (o.hasOwnProperty(k)) {
				a.push( encodeURIComponent(k) + '=' + o2p(o[k]));
			}
		}
	}
	return a.join('&');
};

var jsonr = function(method, url, data, callback, callbackparam){
	var xhr = new XMLHttpRequest();
	xhr.open(method, url, true);
	xhr.responseType = 'json';
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			callback(xhr.response, callbackparam);
		}
	};
	xhr.send(data);
};

var autocomplete2suggest = function(data, extras) {
	var a = new Array();
	if(data && data.results != undefined) {
		data.results.forEach(function(v){
			var re = new RegExp('(' + escapeRegExp(extras.text) + ')', 'i');
			a.push({
				content: v.searchtext,
				description: '<url>' + v.searchtext.replace(re, '<match>$1</match>') + '</url><dim> from Oxford Learner\'s Dictionaries</dim>'
			});
		});
	}
	if(a.length) querycache[extras.text] = a;
	return extras.callback(a);
};

var autocomplete = function(text, suggest) {
	if(querycache[text] != undefined) return suggest(querycache[text]);
	
	var param = {q: text, contentType: 'application/json; charset=utf-8'};
	var url = 'http://www.oxfordlearnersdictionaries.com/autocomplete/english/?' + o2p(param);
	return jsonr('get', url, null, autocomplete2suggest, {text: text, callback: suggest});
};

var gotoword = function(text, disposition) {
	// http://www.oxfordlearnersdictionaries.com/search/english/?q=
	var param = {q: text};
	var url = 'http://www.oxfordlearnersdictionaries.com/search/english/?' + o2p(param);
	navigate(url);
};

var querycache = {};

chrome.omnibox.setDefaultSuggestion({description: '<url><match>%s</match></url>'});

chrome.omnibox.onInputChanged.addListener(autocomplete);

chrome.omnibox.onInputEntered.addListener(gotoword);

