
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


/*
English	https://en.oxforddictionaries.com/
Spanish	https://es.oxforddictionaries.com/
Hindi	https://hi.oxforddictionaries.com/
Indonesian	https://id.oxforddictionaries.com/
isiZulu	https://zu.oxforddictionaries.com/
Latvian	https://lv.oxforddictionaries.com/
Malay	https://ms.oxforddictionaries.com/
Northern Sotho	https://nso.oxforddictionaries.com/
Romanian	https://ro.oxforddictionaries.com/
Setswana	https://tn.oxforddictionaries.com/
Swahili	https://sw.oxforddictionaries.com/
Urdu	https://ur.oxforddictionaries.com/
Other Languages	http://en.bab.la/
*/
var ODs = {
	en: 'English',
	es: 'Spanish',
	hi: 'Hindi',
	id: 'Indonesian',
	zu: 'isiZulu',
	lv: 'Latvian',
	ms: 'Malay',
	nso: 'Northern Sotho',
	ro: 'Romanian',
	tn: 'Setswana',
	sw: 'Swahili',
	ur: 'Urdu'
};

var isoldsite;

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

var jsonr = function(method, url, data, callback, ex) {
	if(!data) data = {};
	if(!isoldsite) {
		data['_'] = new Date().getTime();
		//data['callback'] = 'jQuery0000000000000000000000_' + data['_'];
	};
	$.ajax({
		type: method.toUpperCase(),
		url: url,
		data: data,
		success: function(r) {
			if(!isoldsite){
				window.r = r;
				var rr = s2r(r);
				if(rr) return callback(rr, ex);
			}
			callback(r, ex);
		},
		dataType: isoldsite ? 'json' : 'text',
		headers: isoldsite ? {} : {
			'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
			//'Referer': url,
			//'X-CSRF-Token': '',
			'X-Requested-With': 'XMLHttpRequest',
			'X-Origin': document.location.href
		}
	});
};

var s2r = function(js) {
	var s = js.split('.html("');
	if (s.length == 3) {
		var s2 = s[2].split('");');
		if (s2.length == 2) {
			var s3 = s2[0];
			try {
				var h = JSON.parse('"' + s3 + '"');
				var r = [];
				$(h).find('li a').each(function(i, e) {
					r.push({
						searchtext: e.innerText,
						href: e.getAttribute('href')
					})
				});
				//{"results":[{"searchtext":"ENTRY"}]}
				return {results: r};
			} catch (e) {}
		}
	}
	return false;
};

var text2tp = function(text) {
	text = text.replace(/[`^]/g, '#');
	var term = text.split('#')[0];
	var matches = text.match(/#/g);
	var page = matches === null ? 0 : matches.length;
	var temp = text.split(/#+/);
	var dict = temp.length > 1 ? temp.reverse()[0] : vars.dict;
	return {term: term, page: page, dict: dict};
};

var autocomplete2suggest = function(data, extras) {
	var a = new Array();
	var tp = text2tp(extras.text);
	if(data && data.results != undefined) {
		data.results.forEach(function(v){
			var dictionaries = v.dictionaries && typeof v.dictionaries == "object" && v.dictionaries.length ? v.dictionaries : [vars.dict];
			var re = new RegExp('(' + escapeRegExp(extras.text) + ')', 'i');
			dictionaries.forEach(function(dict){
				a.push({
					content: vars.dict == dict ? v.href || v.searchtext : v.searchtext + '#' + dict,
					description: '<url>' + v.searchtext.replace(re, '<match>$1</match>') + '</url><dim> from <url>' + sitedicts[vars.site][dict].label + '</url> of ' + sitenames[vars.site] + '</dim>'
			});
			});
		});
		a.push({
			content: '___CHANGE_SETTINGS___',
			description: !a.length ?
				'<dim>No matching entries.</dim> <url><match>Change dictionary</match></url>' :
				'<dim>dictionary: <match>' + sitenames[vars.site] + '</match> / <match>' + sitedicts[vars.site][vars.dict].label + '</match></dim> <url><match>Change</match></url>'
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
	return extras.callback(querycache[vars.site + vars.dict + tp.page + tp.term] || querycache[vars.site + vars.dict + 0 + tp.term] || [{
		content: '___CHANGE_SETTINGS___',
		description: '<dim>Request error. Please report to the author or <url>change settings</url>.</dim>'
	}]);
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
	suggest([{
		content: '___CHANGE_SETTINGS___',
		description: '<dim>invalid request url, please report to the author. </dim> <url><match>Change settings</match></url>'
	}]);
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
	var url = geturl(vars.site, 'search', tp.dict, tp.term);
	if(url) {
		if(text.substr(0, 1) == '/') url = $('<a>').prop('href', url).prop('origin') + text;
		navigate(url);
	}
	else gotooptions();
};


var sitenames = {
	old: 'Oxford Learner\'s Dictionaries',
	od: 'Oxford Dictionaries'
};

var siteurls = {
	old: {
		// http://www.oxfordlearnersdictionaries.com/autocomplete/american_english/?q=test&contentType=...
		autocomplete: 'https://www.oxfordlearnersdictionaries.com/autocomplete/DICT/',
		// http://www.oxfordlearnersdictionaries.com/search/english/?q=
		searchall: 'https://www.oxfordlearnersdictionaries.com/search/DICT/',
		search: 'https://www.oxfordlearnersdictionaries.com/search/DICT/'
	},
	_od: {
		// http://www.oxforddictionaries.com/autocomplete/all/?multi=1&q=test&contentType=application%2Fjson%3B+charset%3Dutf-8
		autocomplete: 'https://www.oxforddictionaries.com/autocomplete/DICT/', // ?multi=1&q=test&contentType=...
		search: 'https://www.oxforddictionaries.com/search/', // ?direct=1&dictCode=english&q=test
		searchall: 'https://www.oxforddictionaries.com/search/' // ?multi=1&dictCode=all&q=test
	}
};
for (var k in ODs) {
	sitenames[k] = 'Oxford Living Dictionaries - ' + ODs[k];
	siteurls[k] = {};
	siteurls[k]['search'] = siteurls[k]['searchall'] = siteurls[k]['autocomplete'] = 'https://' + k + '.oxforddictionaries.com/search';
}

/*
20161212


https://en.oxforddictionaries.com/search?callback=jQuery111103892465813912578_1481535430162&query=word&filter=dictionary&_=1481535430167
https://en.oxforddictionaries.com/search?callback=jQuery111103892465813912578_1481535430162&query=word&filter=noad&_=1481535430170


var s = ''; $.each($('.mainHeader form.search select.dictionary option'), function(i,e){s+= e.value + '\t' + e.innerText + '\n'}); console.log(s); copy(s)

*/

var ODdicts = `
en

dictionary	Dictionary	Eng (UK)
noad	Dictionary (US)	Eng (US)
grammar	Grammar
thesaurus	Thesaurus


es

dictionary	Spanish
to_english	Spanish - English
from_english	English - Spanish
grammar	Grammar


hi

dictionary	हिंदी


lv

dictionary	Latviešu vārdnīca


ro

dictionary	ROMÂNĂ
from_english	ENGLEZĂ - ROMÂNĂ


sw

dictionary	Kiswahili
`;


/*

*language_pair


id

english-indonesia	English to Indonesian
indonesia-english	Indonesian to English


zu

english-isizulu	English to isiZulu
isizulu-english	isiZulu to English


ms

english-bahasa_melayu	English to Malay
bahasa_melayu-english	Malay to English


nso

english-sesothosaleboa	English to Northern Sotho
sesothosaleboa-english	Northern Sotho to English


tn

english-setswana	English to Setswana
setswana-english	Setswana to English


ur

اردو-english	Urdu to English




OLD

english English false
american_english American English false
practical-english-usage Practical English Usage true
schulwoerterbuch_German-English German-English true
schulwoerterbuch_English-German English-German true


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
		'american_english': { label: 'Eng (US)', desc: 'US English' },
		'practical-english-usage': { label: 'Practical English Usage', desc: 'Practical English Usage (*)' },
		'schulwoerterbuch_German-English': { label: 'Ger > Eng', desc: 'German-English (*)' },
		'schulwoerterbuch_English-German': { label: 'Eng > Ger', desc: 'US English (*)' }
	},
	_od: {
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

ODdicts.trim().split('\n\n\n').forEach(function(langdict) {
	var ld = langdict.trim().split('\n\n');
	var lang = ld[0];
	sitedicts[lang] = {};
	var ds = ld[1].trim().split('\n');
	ds.forEach(function(dl) {
		var d = dl.trim().split('\t');
		sitedicts[lang][d[0]] = {
			desc: d[1],
			label: d[2] ? d[2] : d[1]
		};
	})
});

var geturl = function(site, action, dict, query) {
	var url = (siteurls && siteurls[site] && siteurls[site][action] || '').replace('DICT', dict);
	if(!url || !query) return false;
	var param = {};
	param[isoldsite ? 'q' : 'query'] = query;
	if(!isoldsite) {
		if(action != 'autocomplete') param['utf8'] = '%E2%9C%93'; // ✓
		param['filter'] = dict;
	} else if (action == 'autocomplete') {
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
	dict: 'american_english',
	site: 'old'
};

var default_vars = vars;

var reloadvars = function(callback) {
	chrome.storage.sync.get(vars, function(r){
		console.log(vars, r);
		for (var k in r) {
			if (r.hasOwnProperty(k) && !r[k]) r[k] = default_vars[k];
		}
		vars = r;
		if(!sitedicts.hasOwnProperty(vars.site)) vars.site = default_vars.site;
		if(!sitedicts[vars.site].hasOwnProperty(vars.dict)) {
			vars.site = default_vars.site;
			vars.dict = default_vars.dict;
		}
		isoldsite = ['old', 'od', '_od'].indexOf(vars.site) > -1;
		if(callback) callback(r);
	});
};

reloadvars();

// https://chromium.googlesource.com/chromium/chromium/+/master/chrome/browser/autocomplete/autocomplete_result.cc
// const size_t AutocompleteResult::kMaxMatches = 6;
var limit_suggestions = 6 - 2;

