
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

var text2tp = function(text) {
	text = text.replace(/[`^]/g, '#');
	var term = text.split('#')[0];
	var matches = text.match(/#/g);
	var page = matches === null ? 0 : matches.length;
	return {term: term, page: page};
};

var autocomplete2suggest = function(data, extras) {
	var a = new Array();
	var tp = text2tp(extras.text);
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
			description: '<dim>searching <match>' + tp.term + '</match> in <match>' + sitedicts[vars.site][vars.dict].label + ' ' + sitenames[vars.site] + '</match>... </dim> <url><match>Change</match></url>'
		});
		// querycache[vars.site + vars.dict + extras.text] = a;
		var totalpages = Math.floor(a.length / limit_suggestions) + (a.length % limit_suggestions ? 1 : 0);
		for(var i = 0; i < a.length / limit_suggestions; i++) {
			var arr = a.slice(i * limit_suggestions, (i + 1) * limit_suggestions);
			if(totalpages > 1)arr.push({
				content: tp.term + '#'.repeat(i + 1),
				description: '<match>' + (i + 1) + '</match>/' + totalpages + '. ' + (a.length - 1) + ' total. <dim>Add or remove <url><match>#</match></url> or <url><match>`</match></url> for more results.</dim>'
			});
			querycache[vars.site + vars.dict + i + tp.term] = arr;
		}
	}
	return extras.callback(querycache[vars.site + vars.dict + tp.page + tp.term] || querycache[vars.site + vars.dict + 0 + tp.term]);
};

var autocomplete = function(text, suggest) {
	var tp = text2tp(text);
	if(querycache[vars.site + vars.dict + 0 + tp.term] != undefined) return suggest(querycache[vars.site + vars.dict + tp.page + tp.term] || querycache[vars.site + vars.dict + 0 + tp.term]);
	
	var url = geturl(vars.site, 'autocomplete', vars.dict, tp.term);
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

var reloadbg = function(){
	chrome.runtime.getBackgroundPage(function(b) {
		b.document.location.reload();
	});
};

var gotoword = function(text, disposition) {
	if( !text || !text.trim() ) return; // empty query string
	if(text == '___CHANGE_SETTINGS___') return gotooptions();
	var tp = text2tp(text.trimLeft());
	var url = geturl(vars.site, 'search', vars.dict, tp.term);
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
		searchall: 'http://www.oxfordlearnersdictionaries.com/search/DICT/',
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
		'english': { label: 'Eng (UK)', desc: 'British & World English' },
		'american_english': { label: 'Eng (US)', desc: 'US English' }
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
		'english-french': { label: 'Eng > Fr', desc: 'English-French (*)' },
		'french-english': { label: 'Fr > Eng', desc: 'French-English (*)' },
		'english-german': { label: 'Eng > Ger', desc: 'English-German (*)' },
		'german-english': { label: 'Ger > Eng', desc: 'German-English (*)' },
		'english-italian': { label: 'Eng > It', desc: 'English-Italian (*)' },
		'italian-english': { label: 'It > Eng', desc: 'Italian-English (*)' },
		'english-portuguese': { label: 'Eng > Por', desc: 'English-Portuguese (*)' },
		'portuguese-english': { label: 'Por > Eng', desc: 'Portuguese-English (*)' },
		'english-arabic': { label: 'Eng > Ar', desc: 'English-Arabic (*)' },
		'arabic-english': { label: 'Ar > Eng', desc: 'Arabic-English (*)' },
		'english-chinese': { label: 'Eng > Ch', desc: 'English-Chinese (*)' },
		'chinese-english': { label: 'Ch > Eng', desc: 'Chinese-English (*)' },
		'english-russian': { label: 'Eng > Ru', desc: 'English-Russian (*)' },
		'russian-english': { label: 'Ru > Eng', desc: 'Russian-English (*)' },
		'harts_rules': { label: 'Hart\'s', desc: 'New Hart\'s Rules (*)' },
		'garner_dict_legal_usage': { label: 'Legal', desc: 'Garner\'s Dictionary of Legal Usage (*)' },
		'ox_dict_writers_editors': { label: 'Writers', desc: 'New Oxford Dictionary for Writers & Editors (*)' },
		'pocket_fowlers_modern_eng_usage': { label: 'Fowler\'s', desc: 'Pocket Fowler\'s Modern English Usage (*)' },
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
	} else if (action == 'searchall') {
		if(site == 'od') {
			param['multi'] = 1;
			param['dictCode'] = dict;
		}
	}
	return url + '?' + o2p(param);
};

var vars = {
	dict: 'english',
	site: 'od'
};

var default_vars = vars;

var reloadvars = function(callback) {
	chrome.storage.sync.get(vars, function(r){
		console.log(vars, r);
		for (var k in r) {
			if (r.hasOwnProperty(k) && !r[k]) r[k] = default_vars[k];
		}
		vars = r;
		if(callback) callback(r);
	});
};

reloadvars();

// https://chromium.googlesource.com/chromium/chromium/+/master/chrome/browser/autocomplete/autocomplete_result.cc
// const size_t AutocompleteResult::kMaxMatches = 6;
var limit_suggestions = 6 - 2;

