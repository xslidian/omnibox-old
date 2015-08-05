

var fillselect = function(e, kv, subkey) {
	e.innerHTML = '';
	for (var k in kv) {
		if (kv.hasOwnProperty(k)) {
			var o = document.createElement('option');
			o.setAttribute('value', k);
			o.innerText = subkey ? kv[k][subkey] : kv[k];
			e.appendChild(o);
		}
	}
};

s_site.onchange = function() {
	fillselect(s_dict, sitedicts[s_site.value], 'desc');
};

b_save.onclick = function() {
	chrome.storage.sync.set({
		site: s_site.value,
		dict: s_dict.value
	}, function(){
		msg.innerText = 'Saved.';
		msg.display = 'block';
		reloadbg();
		setTimeout(function(){
			msg.display = 'none';
			msg.innerText = '';
		}, 1000);
	});
};

fillselect(s_site, sitenames);

chrome.storage.sync.get(vars, function(r){
	console.log(vars, r);
	vars = r;
	s_site.value = vars.site;
	s_site.onchange();
	setTimeout(function(){
		s_dict.value = vars.dict;
	}, 200);
});

