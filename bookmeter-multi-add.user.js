// ==UserScript==
// @name           bookmeter-multi-add
// @version        0.9.0.20110810
// @namespace      http://amaisaeta.seesaa.net/
// @description    読書メーターの検索画面にて、複数書籍の一括登録の為のUIを用意します。
// @license        MIT License; http://www.opensource.org/licenses/mit-license.php
// @include        http://book.akahoshitakuya.com/s*
// ==/UserScript==

(function() {
//	var DEBUG = 1;	// [DEBUG]

	const prefix = 'bookmeter_multi_add_';
	const checkboxClassName = prefix + 'asin';
	const candidatesBlock = document.getElementById('main_left').getElementsByClassName('inner')[0];
	const results = document.evaluate('*[contains(concat(" ", normalize-space(@class), " "), " book ")]', candidatesBlock, null, 7, null);

	function registerBook(asin, date, category) {
		LOG('in registerBook('+asin+',('
			+ (date ? date.getFullYear()+'/'+date.getMonth()+'/'+date.getDate() : 'NULL')
			+'),"'+category+'")');

		var xhr = new XMLHttpRequest();
		var succeededAdd = false;
		var url, query;
		var pageDoc;

		// add
		url = '/add.php?asin=' + asin;
		LOG('add: url: ' + url);
		xhr.open('GET', url, false);
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4/*complete*/ && xhr.status == 200) {
				succeededAdd = true;
				LOG('add asin='+asin+' completed!');
			}
		}
		xhr.send(null);

		if(!succeededAdd) { return 0; }

		// edit information
		xhr = new XMLHttpRequest();
		url = '/b';
		if(date) {
			query = 'read_date_y=' + date.getFullYear() + '&read_date_m=' + str_w(date.getMonth(), 2) + '&read_date_d=' + str_w(date.getDate(), 2);
		} else {
			query = 'fumei=1';
		}
		query += '&comment=';
		if((typeof category) === 'string' && category.length > 0) {
			query += '&category=' + encodeURI(category);
		}
		query += '&category_pre=&asin=' + asin;
		query += '&edit_no=' + getEditNo(asin);
		xhr.open('POST', url, false);
		LOG('edit: url: ' + url + '\nquery: ' + query);
		xhr.onreadystatechange = function() {
			if(xhr.readyState == 4/*complete*/ && xhr.status == 200) {
				LOG('edit query="'+query+'" completed!');
			}
		}
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded;charset=UTF-8"); xhr.send(query);

		return 1;

		function getEditNo(asin) { // {{{
			// 非XMLなHTMLは、XMLHttpRequest.responseXMLや、DOMParserでのDOM取得が不可能なので、HTMLソース文字列から正規表現でedit_noの値を取得する。

			LOG('in getEditNo(' + asin + ')');

			var xhr = new XMLHttpRequest();
			xhr.open('GET', '/b/' + asin, false);
			xhr.send(null);
			var html = xhr.responseText;

			res = html.toString().match(/<input type="hidden" name="edit_no" value="([^"]+)">/);
			if(res) LOG('find edit_no. [ ' + RegExp.$1 + ']');
			else LOG('not find.');

			return res ? RegExp.$1 : null;
		}	// }}}
	}

	function registerBooks(event) {
		LOG("in registerBooks()");

		var date = null;

		LOG("fumei is... " + document.getElementById(prefix + 'fumei').checked);

		if(!document.getElementById(prefix + 'fumei').checked) {
			var dateY = document.getElementById(prefix + 'read_date_y');
			var dateM = document.getElementById(prefix + 'read_date_m');
			var dateD = document.getElementById(prefix + 'read_date_d');

			LOG('dateY:' + dateY.selectedIndex + ' ' + dateY.options[dateY.selectedIndex].value);
			LOG('dateM:' + dateM.selectedIndex + ' ' + dateM.options[dateM.selectedIndex].value);
			LOG('dateD:' + dateD.selectedIndex + ' ' + dateD.options[dateD.selectedIndex].value);

			date = new Date(
				dateY.options[dateY.selectedIndex].value,
				dateM.options[dateM.selectedIndex].value,
				dateD.options[dateD.selectedIndex].value
			);
		}
		var category = document.getElementById(prefix + 'category').value;

		LOG('category: ' + category);

		LOG('item num: ' + results.snapshotLength);
		for(var i = 0; i < results.snapshotLength; ++i) {
			var item = results.snapshotItem(i).getElementsByTagName('input')[0];
			if(item.checked) {
				LOG('find checked item[asin=' + item.value + ']!');
				if(!registerBook(item.value, date, category)) {
					LOG('failed: ' + item.value);
				}
			}
		}
		alert("completed!");
		event.preventDefault();
	}

	function addSubmitForm() { // {{{
		const now = new Date();

		var readY = createSelect('read_date_y', 10, function(i) {
			var y = (new Date()).getFullYear() - i;
			return { value: y, text: y + '年' };
		});
		var readM = createSelect('read_date_m', 12, function(i) {
			i += 1;
			return { value: str_w(i, 2), text: i + '月' };
		});
		var readD = createSelect('read_date_d', 31, function(i) {
			i += 1;
			return { value: str_w(i, 2), text: i + '日' };
		});
		var readUnknown = createInput('checkbox', 'fumei', '1');
		var category = createInput('text', 'category', '');
		var submit = createInput('submit', '', '一括追加');
		submit.className += ' submit';

		var form = document.createElement('form');
		form.id = prefix + 'form';
//		form.action = '/b';
//		form.method = 'POST';
		form.addEventListener('submit', registerBooks, true);

		var fs = document.createElement('fieldset');
		fs.appendChild(document.createTextNode('読み終わった日'));
		fs.appendChild(readY);
		fs.appendChild(readM);
		fs.appendChild(readD);
		fs.appendChild(readUnknown);
		fs.appendChild(document.createTextNode('不明'));
		form.appendChild(fs);

		fs = document.createElement('fieldset');
		fs.appendChild(document.createTextNode('カテゴリ'));
		fs.appendChild(category);
		form.appendChild(fs);

		fs = document.createElement('fieldset');
		fs.appendChild(submit);
		form.appendChild(fs);

		var block = document.createElement('div');
		block.className = 'book_edit_area';
		block.appendChild(form);
		candidatesBlock.parentNode.insertBefore(block, candidatesBlock);

		// co-functions {{{
		function createSelect(name, num, func) {
			var select = document.createElement('select');
			select.name = name;
			select.id = prefix + name;
			for(var i = 0; i < num; ++i) {
				var v = func(i);
				var opt = document.createElement('option');
				opt.value = v.value;
				opt.appendChild(document.createTextNode(v.text));
				select.appendChild(opt);
			}
			return select;
		}
		function createInput(type, name, value) {
			var elem = document.createElement('input');
			elem.type = type;
			elem.name = name;
			elem.id = prefix + name
			elem.value = value;
			return elem;
		}
		// }}} co-functions
	}	// }}}

	function addCheckboxies() {	// {{{
		for(var i = 0; i < results.snapshotLength; ++i) {
			var ssItem = results.snapshotItem(i);
			var checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.className = checkboxClassName;
			checkbox.name = checkboxClassName;
			checkbox.value = ssItem.getElementsByTagName('a')[0].href.match(/[0-9a-zA-Z]+$/);
			ssItem.appendChild(checkbox);

		}
	}	// }}}

	function str_w(src, w) { // {{{
		const needW = w - src.toString().length;
		return (needW <= 0 ? '' : (new Array(needW + 1)).join('0')) + src;
	}	// }}}

	addCheckboxies();
	addSubmitForm();


// for debug time {{{
function LOG(msg) { (typeof DEBUG !== typeof (void 0)) && GM_log(msg); }
// }}}
})();
// vim: set fdm=marker :
