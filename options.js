

var fillselect = function(e, kv, subkey) {
	e.innerHTML = '';
	for (var k in kv) {
		if (kv.hasOwnProperty(k)) {
			var l = document.createElement('label');
			var o = document.createElement('input');
			o.setAttribute('type', 'radio');
			o.setAttribute('name', 'r_' + e.id);
			o.setAttribute('value', k);
			l.appendChild(o);
			var t = document.createTextNode( subkey ? kv[k][subkey] : kv[k] );
			l.appendChild(t);
			var br = document.createElement('br');
			l.appendChild(br);
			e.appendChild(l);
		}
	}
};

var radioget = function(name) {
	var r = document.getElementsByName(name);
	for(var i = 0; i < r.length; i++) {
		if(r[i] && r[i].checked) return r[i].value;
	}
	return null;
};

var radioset = function(name, val) {
	var r = document.getElementsByName(name);
	for(var i = 0; i < r.length; i++) {
		if(r[i] && r[i].value == val) {
			r[i].checked = true;
			r[i].setAttribute('checked', true);
			return r[i].value;
		}
	}
	return false;
};

s_site.onchange = function() {
	fillselect(s_dict, sitedicts[radioget('r_s_site')], 'desc');
};

b_save.onclick = function() {
	chrome.storage.sync.set({
		site: radioget('r_s_site'),
		dict: radioget('r_s_dict')
	}, function(){
		msg.innerText = 'Saved.';
		msg.display = 'block';
		reloadbg();
		reloadvars();
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
	radioset('r_s_site', vars.site);
	s_site.onchange();
	setTimeout(function(){
		radioset('r_s_dict', vars.dict);
	}, 200);
});

