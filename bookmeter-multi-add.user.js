// ==UserScript==
// @name           bookmeter-multi-add
// @version        0.9.3.20110817
// @namespace      http://amaisaeta.seesaa.net/
// @description    読書メーターの検索画面にて、複数書籍の一括登録の為のUIを用意します。
// @license        MIT License; http://www.opensource.org/licenses/mit-license.php
// @include        http://book.akahoshitakuya.com/s*
// ==/UserScript==

(function() {
//	var DEBUG = 1;	// [DEBUG]

	const prefix = 'bookmeter_multi_add_';

	const yearSMName = 'read_date_y';
	const monthSMName = 'read_date_m';
	const dateSMName = 'read_date_d';

	const checkboxClassName = prefix + 'asin';
	const results = document.getElementById('main_left').getElementsByClassName('book');

	var remainCounterElem;
	function updateRemainCounter(num) {
		LOG('in updateRemainConter(' + num + ')');
		remainCounterElem.nodeValue = num;
	}
	function getRemainNum() {
		LOG('in getRemainNum()');
		return parseInt(remainCounterElem.nodeValue);
	}

	function registerBook(asin, date, category) {
		LOG('in registerBook('+asin+',('
			+ (date ? date.getFullYear()+'/'+date.getMonth()+'/'+date.getDate() : 'NULL')
			+'),"'+category+'")');

		// add
		var xhr = new XMLHttpRequest();
		var url = '/add.php?asin=' + asin;

		LOG('add: url: ' + url);
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function(event) {
			const my = event.target;

			if(my.readyState == 4/*complete*/ && my.status == 200) {
				LOG('add asin='+asin+' completed!');

				// edit
				var xhr = new XMLHttpRequest();
				var url = '/b';
				var query;

				if(date) {
					query = 'read_date_y=' + date.getFullYear()
						+ '&read_date_m=' + str_w(date.getMonth(), 2)
						+ '&read_date_d=' + str_w(date.getDate(), 2);
				} else {
					query = 'fumei=1';
				}
				query += '&comment=';
				if((typeof category) === 'string' && category.length > 0) {
					query += '&category=' + encodeURI(category);
				}
				query += '&category_pre=&asin=' + asin;
				query += '&edit_no=' + getEditNo(asin);
				xhr.open('POST', url, true);
				xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
				LOG('edit: url: ' + url + '\nquery: ' + query);
				xhr.onreadystatechange = function() {
					const remainNum = getRemainNum();
					if(xhr.readyState == 4/*complete*/) {
						if(xhr.status == 200) {
							LOG('edit query="'+query+'" completed!');
						} else {
							LOG('edit query="'+query+'" failed!');
						}
						updateRemainCounter(remainNum - 1);
						LOG("remain: " + remainNum - 1);
					}
				}
				xhr.send(query);
			}
		}
		xhr.send(null);

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

		var checks = getCheckElems(results);
		remainNum = checks.length;
		var date = null;

		LOG("fumei is... " + document.getElementById(prefix + 'fumei').checked);

		if(!document.getElementById(prefix + 'fumei').checked) {
			var dateY = document.getElementById(prefix + yearSMName);
			var dateM = document.getElementById(prefix + monthSMName);
			var dateD = document.getElementById(prefix + dateSMName);

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

		LOG('item num: ' + checks.length);
		for(var i = 0; i < checks.length; ++i) {
			var item = checks[i].getElementsByTagName('input')[0];
			if(!registerBook(item.value, date, category)) {
				LOG('failed: ' + item.value);
			}
			LOG('remain: ' + (checks.length - i) + ' / ' + checks.length);
		}

		// 全完了時通知
		var completeCheckerTID = setInterval(function() {
			if(remainNum <= 0) {
				clearInterval(completeCheckerTID);
				alert('complate!');
			}
		}, 100);

		event.preventDefault();

		// co-functions {{{
		function getCheckElems(elems) {
			LOG('in getCheckElems(' + (typeof elems) + (typeof elems === 'Array' ? '['+elem.length+']':'') + ')');

			var res = [];
			for(var i = 0; i < elems.length; ++i) {
				// [TODO] Autopagerizeで読み込んだ部分にはcheckboxが付与されていないので、そのチェックを行っている。
				// [TODO] Autopagerize対応は次更新時に行う予定である
				var e = elems[i].getElementsByClassName(checkboxClassName);
				if((e.length != 0) && e[0].checked) {
					res.push(elems[i]);
				}
			}
			return res;
		}
		// }}}
	}

	function addSubmitForm() { // {{{
		LOG('in addSubmitForm()');

		const now = new Date();

		var readY = createSelect(yearSMName, 10, function(i) {
			var y = (new Date()).getFullYear() - i;
			return { value: y, text: y + '年' };
		});
		var readM = createSelect(monthSMName, 12, function(i) {
			i += 1;
			return { value: str_w(i, 2), text: i + '月' };
		});
		var readD = createSelect(dateSMName, 31, function(i) {
			i += 1;
			return { value: str_w(i, 2), text: i + '日' };
		});
		var readUnknown = createInput('checkbox', 'fumei', '1');
		var category = createInput('text', 'category', '');
		var submit = createInput('submit', '', '一括追加');
		submit.className += ' submit';

		var form = document.createElement('form');
		form.id = prefix + 'form';
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
		fs.appendChild((function() {
			var parent = document.createElement('dl');
			var head = parent.appendChild(document.createElement('dt'));
			var body = parent.appendChild(document.createElement('dd'));
			head.appendChild(document.createTextNode('残り'));
			remainCounterElem = body.appendChild(document.createTextNode('0'));
			parent.style.display  = head.style.display = body.style.display = 'inline';
			parent.style.marginLeft = '1em';
			head.style.paddingRight = '1em';

			return parent;
		})());
		form.appendChild(fs);

		var block = document.createElement('div');
		block.className = 'book_edit_area';
		block.appendChild(form);

		var pos = document.getElementById('main_left').getElementsByClassName('inner')[0];
		pos.parentNode.insertBefore(block, pos);
		//insertAfter(pos.parentNode, block, pos);

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
		LOG('in addCheckboxies()');

		for(var i = 0; i < results.length; ++i) {
			var checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.className = checkboxClassName;
			checkbox.name = checkboxClassName;
			checkbox.value = results[i].getElementsByTagName('a')[0].href.match(/[0-9a-zA-Z]+$/);
			checkbox.addEventListener('click', function(event) {
				LOG('in checkbox.onclick handler');
				const remainNum = getRemainNum();
				var m = event.target.checked ? 1 : -1;
				updateRemainCounter(remainNum + m);
				enableSubmitButton(remainNum > 0);
			}, false);
			results[i].appendChild(checkbox);

		}
	}	// }}}

	function str_w(src, w) { // {{{
		const needW = w - src.toString().length;
		return (needW <= 0 ? '' : (new Array(needW + 1)).join('0')) + src;
	}	// }}}

 	// via: http://www.dustindiaz.com/top-ten-javascript/
	function insertAfter(parent, node, referenceNode) { // {{{
		parent.insertBefore(node, referenceNode.nextSibling);
	}	// }}}

	addCheckboxies();
	addSubmitForm();


// for debug time {{{
function LOG(msg) { (typeof DEBUG !== typeof (void 0)) && GM_log(msg); }
// }}}
})();
// vim: set fdm=marker :
