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

	const checkboxName = 'asin';
	const unknownName = 'fumei';
	const categoryName = 'category';
	const editNoName = 'edit_no';
	const checkboxClassName = prefix + checkboxName;
	const unknownClassName = prefix + unknownName;
	const categoryClassName = prefix + categoryName;

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
					query = yearSMName + '=' + date.getFullYear()
						+ '&' + monthSMName + '=' + str_w(date.getMonth(), 2)
						+ '&' + dateSMName + '=' + str_w(date.getDate(), 2);
				} else {
					query = unknownName + '=1';
				}
				query += '&comment=';
				if((typeof category) === 'string' && category.length > 0) {
					query += '&' + categoryName + '=' + encodeURI(category);
				}
				query += '&category_pre=&asin=' + asin;
				query += '&' + editNoName + '=' + getEditNo(asin);
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

		var checks = getCheckElems(document.getElementById('main_left').getElementsByClassName('book'));
		remainNum = checks.length;
		var date = null;

		LOG("fumei is... " + document.getElementById(unknownClassName).checked);

		if(!document.getElementById(unknownClassName).checked) {
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
		var category = document.getElementById(categoryClassName).value;

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
			LOG('in getCheckElems( [' + (typeof elems.length ? elems.length : '') + '] )');

			var res = [];
			for(var i = 0; i < elems.length; ++i) {
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
		var readUnknown = createInput('checkbox', unknownName, '1');
		var category = createInput('text', categoryName, '');
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
		// }}} co-functions
	}	// }}}

	function addCheckbox(elem) {	// {{{
		LOG('in addCheckbox(e)');

		var checkbox = elem.appendChild(createInput('checkbox', checkboxName, elem.getElementsByTagName('a')[0].href.match(/[0-9a-zA-Z]+$/)));
		checkbox.removeAttribute('id');
		checkbox.className = checkboxClassName;
		checkbox.addEventListener('click', function(event) {
			LOG('in checkbox.onclick handler');
			const remainNum = getRemainNum();
			var m = event.target.checked ? 1 : -1;
			updateRemainCounter(remainNum + m);
		}, false);
	}	// }}}

	function createInput(type, name, value) {	// {{{
		var elem = document.createElement('input');
		elem.type = type;
		elem.name = name;
		elem.id = prefix + name;
		elem.value = value;
		return elem;
	}	// }}}

	function str_w(src, w) { // {{{
		const needW = w - src.toString().length;
		return (needW <= 0 ? '' : (new Array(needW + 1)).join('0')) + src;
	}	// }}}

 	// via: http://www.dustindiaz.com/top-ten-javascript/
	function insertAfter(parent, node, referenceNode) { // {{{
		parent.insertBefore(node, referenceNode.nextSibling);
	}	// }}}

	for(var candidateElems = document.getElementById('main_left').getElementsByClassName('book'), i = 0; i < candidateElems.length; ++i) {
		addCheckbox(candidateElems[i]);
	}
	window.addEventListener('AutoPagerize_DOMNodeInserted', function(event) { addCheckbox(event.target); }, false);
	addSubmitForm();


// for debug time {{{
function LOG(msg) { (typeof DEBUG !== typeof (void 0)) && GM_log(msg); }
// }}}
})();
// vim: set fdm=marker :
