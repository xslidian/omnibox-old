
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
				description: '<url>' + v.searchtext.replace(re, '<match>$1</match>') + '</url><dim> from ' + sitenames[vars.site] + '</dim>'
			});
		});
		a.push({
			content: '___CHANGE_SETTINGS___',
			description: '<dim>searching <match>' + extras.text + '</match> in <match>' + sitedicts[vars.site][vars.dict].label + ' ' + sitenames[vars.site] + '</match>... </dim> <url><match>Change</match></url>'
		});
		querycache[vars.site + vars.dict + extras.text] = a;
	}
	return extras.callback(a);
};

var autocomplete = function(text, suggest) {
	if(querycache[vars.site + vars.dict + text] != undefined) return suggest(querycache[vars.site + vars.dict + text]);
	
	var url = geturl(vars.site, 'autocomplete', vars.dict, text);
	if(url) return jsonr('get', url, null, autocomplete2suggest, {
		text: text,
		callback: suggest,
		site: vars.site,
		dict: vars.dict
	});
};

var gotooptions = function(){
	if(chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
	else window.open(chrome.runtime.getURL('options.html'));
	return;
}

var gotoword = function(text, disposition) {
	if( !text || !text.trim() ) return; // empty query string
	if(text == '___CHANGE_SETTINGS___') return gotooptions();
	
	var url = geturl(vars.site, 'search', vars.dict, text.trimLeft());
	if(url) navigate(url);
};


var sitenames = {
	old: 'Oxford Learner\'s Dictionaries',
	od: 'Oxford Dictionaries'
};

var siteurls = {
	old: {
		// http://www.oxfordlearnersdictionaries.com/autocomplete/american_english/?q=test&contentType=...
		autocomplete: 'http://www.oxfordlearnersdictionaries.com/autocomplete/DICT/',
		// http://www.oxfordlearnersdictionaries.com/search/english/?q=
		search: 'http://www.oxfordlearnersdictionaries.com/search/DICT/'
	},
	od: {
		// http://www.oxforddictionaries.com/autocomplete/all/?multi=1&q=test&contentType=application%2Fjson%3B+charset%3Dutf-8
		autocomplete: 'http://www.oxforddictionaries.com/autocomplete/DICT/', // ?multi=1&q=test&contentType=...
		search: 'http://www.oxforddictionaries.com/search/', // ?direct=1&dictCode=english&q=test
		searchall: 'http://www.oxforddictionaries.com/search/' // ?multi=1&dictCode=all&q=test
	}
};

/*
data-label	value	locked	innerHTML
All	all	false	All
Eng (UK)	english	false	British & World English
Eng (US)	american_english	false	US English
Spanish	spanish	false	Spanish
Synonyms	english-thesaurus	false	English synonyms
Synonyms	american_english-thesaurus	false	US English synonyms
Eng > Fr	english-french	true	English-French
Fr > Eng	french-english	true	French-English
Eng > Ger	english-german	true	English-German
Ger > Eng	german-english	true	German-English
Eng > It	english-italian	true	English-Italian
It > Eng	italian-english	true	Italian-English
Eng > Por	english-portuguese	true	English-Portuguese
Por > Eng	portuguese-english	true	Portuguese-English
Eng > Sp	english-spanish	false	English-Spanish
Sp > Eng	spanish-english	false	Spanish-English
Eng > Ar	english-arabic	true	English-Arabic
Ar > Eng	arabic-english	true	Arabic-English
Eng > Ch	english-chinese	true	English-Chinese
Ch > Eng	chinese-english	true	Chinese-English
Eng > Ru	english-russian	true	English-Russian
Ru > Eng	russian-english	true	Russian-English
Hart's	harts_rules	true	New Hart's Rules
Legal	garner_dict_legal_usage	true	Garner's Dictionary of Legal Usage
Writers	ox_dict_writers_editors	true	New Oxford Dictionary for Writers & Editors
Fowler's	pocket_fowlers_modern_eng_usage	true	Pocket Fowler's Modern English Usage
Grammar	words	false	Grammar & usage
*/
var sitedicts = {
	old: {
		'all': { label: 'All', desc: 'All' },
		'english': { label: 'Eng (UK)', desc: 'British & World English' }
	},
	od: {
		'all': { label: 'All', desc: 'All' },
		'english': { label: 'Eng (UK)', desc: 'British & World English' },
		'american_english': { label: 'Eng (US)', desc: 'US English' },
		'spanish': { label: 'Spanish', desc: 'Spanish' },
		'english-thesaurus': { label: 'Synonyms', desc: 'English synonyms' },
		'american_english-thesaurus': { label: 'Synonyms', desc: 'US English synonyms' },
		'english-spanish': { label: 'Eng > Sp', desc: 'English-Spanish' },
		'spanish-english': { label: 'Sp > Eng', desc: 'Spanish-English' },
		'words': { label: 'Grammar', desc: 'Grammar & usage' }
	}
};

var geturl = function(site, action, dict, query) {
	var url = (siteurls && siteurls[site] && siteurls[site][action] || '').replace('DICT', dict);
	if(!url) return false;
	var param = {q: query};
	if (action == 'autocomplete') {
		param['contentType'] = 'application/json; charset=utf-8';
		if(site == 'od') param['multi'] = 1;
	} else if (action == 'search') {
		if(site == 'od') {
			param['direct'] = 1;
			param['dictCode'] = dict;
		}
	}
	return url + '?' + o2p(param);
};

var vars = {
	dict: 'english',
	site: 'old'
};

chrome.storage.sync.get(vars, function(r){
	vars = r;
});

