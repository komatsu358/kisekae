/*
 *  きせかえシステム"siori"  Ver.2.50
 *  Copyright (C)2011.3.30 by みなみせい (http://sei.sakuraweb.com/)
 */
var PREF_CEL = "cel-";

var conf = {
	snapRange: 16,
	safemode: /^\?safe$/i.test(location.search)
};

var ua = (document.getElementById && [].push) ? {
/*@cc_on
	IMGLD: !conf.safemode && (9 > @_jscript_version),
@*/
	fixup: function() {
		var g = $("imgpeek");
		if (conf.safemode || !(g && g.getContext)) return;
		g = g.getContext("2d");

		ua.getAlpha = function(el, x, y) {
			try {
				g.clearRect(0,0,1,1);
				g.drawImage(el, x,y,1,1, 0,0,1,1);
				return g.getImageData(0,0,1,1).data[3];
			}
			catch (ex) {
				return 256;
			}
		};

		if (ua.getAlpha($("imgpeek"), 0,0) & ~255) ua.getAlpha = null;
	}
} : null;

var cels = [];
var group = [];
var mvcels;

var orgX;
var orgY;
var wobble = -1;

var posMode;
var posNo;

/*
 *  その他の関数
 */
function $(nm)
{
	return document.getElementById(nm);
}

function parseInfo(str)
{
	var i, wk, arg = [];

	wk = str.replace(/\s/g, "").split(";");
	for (i = 0; i < wk.length; i++) arg[i] = wk[i].replace(/:/, ",").split(",");
	return arg;
}

/*
 *  セルのオブジェクト
 */
function Cel(name, click, ld)
{
	this.name = name;
	this.click = click | 0;
	this.ld = ld;
	this.el;
	this.snapX;
	this.snapY;
}

/*
 *  グループ化セルのオブジェクト
 */
function Group()
{
	this.item = [];
}

Group.prototype.snap = function(range) {
	var i, x, y, wk = this.item[0];

	if ((null != wk.snapX) && (null != wk.snapY)) {
		x = wk.snapX - parseInt(wk.el.style.left);
		y = wk.snapY - parseInt(wk.el.style.top);

		wk = this.item;
		if ((range > Math.abs(x)) && (range > Math.abs(y))) {
			for (i = 0; i < wk.length; i++) {
				wk[i].el.style.left = parseInt(wk[i].el.style.left) + x + "px";
				wk[i].el.style.top  = parseInt(wk[i].el.style.top)  + y + "px";
			}
		}
	}
};

/*
 *  移動セルのオブジェクト
 */
function MoveCels(no)
{
	this.item = (cels[no].name) ? group[cels[no].name].item : [cels[no]];
	this.orgX = [];
	this.orgY = [];

	with (this) {
		for (var i = 0; i < item.length; i++) {
			orgX[i] = parseInt(item[i].el.style.left);
			orgY[i] = parseInt(item[i].el.style.top);
		}
	}
}

MoveCels.prototype = new Group();

/*
 *  イベント処理
 */
function pickCel(no)
{
	var el, x, y;

	if (ua.getAlpha) {
		for (; no >= 0; no--) {
			el = cels[no].el;
			x = parseInt(el.style.left);
			y = parseInt(el.style.top);

			if (("visible" == el.style.visibility)
			&& (x <= orgX) && (orgX < x + el.offsetWidth)
			&& (y <= orgY) && (orgY < y + el.offsetHeight)
			&& (1 <= ua.getAlpha(el, orgX - x, orgY - y))) break;
		}
	}

	return no;
}

function mouseDown(e)
{
	var no;

	if (e) {
		orgX = e.pageX;
		orgY = e.pageY;
	}
	else {
		orgX = event.clientX + document.documentElement.scrollLeft + document.body.scrollLeft;
		orgY = event.clientY + document.documentElement.scrollTop  + document.body.scrollTop;
	}

	if (0 <= (no = pickCel(this.id.substr(PREF_CEL.length) | 0))) {
		mvcels = new MoveCels(no);

		with (mvcels.item[0]) {
			click--;
			wobble = (15 <= click) ? 0 : ((0 <= click) ? 2 : -1);
		}
	}

	return false;
}

function mouseMove(e)
{
	var i, x, y;

	if (!mvcels) return;

	if (e) {
		x = e.pageX - orgX;
		y = e.pageY - orgY;
	}
	else {
		x = event.clientX + document.documentElement.scrollLeft + document.body.scrollLeft - orgX;
		y = event.clientY + document.documentElement.scrollTop  + document.body.scrollTop  - orgY;
	}

	if (0 <= wobble) {
		if ((wobble < Math.abs(x)) || (wobble < Math.abs(y))) x = y = 0;
	}

	for (i = 0; i < mvcels.item.length; i++) {
		mvcels.item[i].el.style.left = mvcels.orgX[i] + x + "px";
		mvcels.item[i].el.style.top  = mvcels.orgY[i] + y + "px";
	}

	return false;
}



function mouseUp(e)
{
  if (!mvcels) return;

  var no = mvcels.item[0].el.id.substr(PREF_CEL.length) | 0;

  if (0 <= wobble) {
    for (var i = 0; i < mvcels.item.length; i++) {
      mvcels.item[i].el.style.left = mvcels.orgX[i] + "px";
      mvcels.item[i].el.style.top  = mvcels.orgY[i] + "px";
    }
  }
  else {
    mvcels.snap(conf.snapRange);
  }

  mvcels = null;

  if (0 <= wobble) {
    eventClick(no);
  }
}




function filterChg()
{
	if (!this.filters[0].src) this.firstChild.style.visibility = "visible";
}

function sioriInit()
{
	var i, o;

	if (!ua) return;
	ua.fixup();

	for (i = 0; i < cels.length; i++) {
		o = cels[i];
		o.el = $(PREF_CEL + i);
		o.el.onmousedown = mouseDown;
		if (o.ld) o.el.onfilterchange = filterChg;
	}

	document.onmousemove = mouseMove;
	document.onmouseup   = mouseUp;
}

/*
 *  セット切り替え
 */
function startpos(mode)
{
	var i = 0, l = cels.length;

	if ("cel" == mode) {
		for (; i < l; i++) cels[i].el.style.visibility = "hidden";
	}
	else if ("snap" == mode) {
		for (; i < l; i++) cels[i].snapX = cels[i].snapY = null;
	}

	posNo = 0;
	posMode = mode;
}

function setpos(str)
{
	var i, x, y, arg = parseInfo(str);

	for (i = 0; i < arg.length; i++, posNo++) {
		if (cels.length <= posNo) break;

		x = arg[i][0] | 0;
		y = arg[i][1] | 0;

		if ("cel" == posMode) {
			cels[posNo].el.style.left = x + "px";
			cels[posNo].el.style.top  = y + "px";

			if ("*" != arg[i][2]) cels[posNo].el.style.visibility = "visible";
		}
		else if ("snap" == posMode) {
			if ("*" != arg[i][2]) {
				cels[posNo].snapX = x;
				cels[posNo].snapY = y;
			}
		}
	}
}

var sets = new function() {
	var curNo = -1;

	function save(no) {
		var i, o, s;
		sets[no] = null;
		sets[no] = [];

		for (i = 0; i < cels.length; i++) {
			o = cels[i];
			s = o.el.style;
			sets[no].push(s.left, s.top, s.visibility, o.snapX, o.snapY);
		}
	}

	function load(no) {
		var i, o, s, d = sets[no];

		for (i = 0; i < cels.length; i++) {
			o = cels[i];
			s = o.el.style;
			s.left  = d[i * 5 + 0];
			s.top   = d[i * 5 + 1];
			s.visibility = d[i * 5 + 2];
			o.snapX = d[i * 5 + 3];
			o.snapY = d[i * 5 + 4];
		}
	}

	this.change = (!conf.safemode) ? function(no, mode) {
		if (mvcels) return;
		if (-1 != curNo) save(curNo);

		if (!mode && sets[no]) {
			load(curNo = no);
		}
		else {
			posMode = null;
			setChange(no);
			if (posMode) curNo = no;
		}
	} : function(no) {
		if (mvcels) return;
		setChange(no);
	};

	this.reset = function(nm) {
		var i, wk = document.getElementsByName(nm);

		for (i = 0; i < wk.length; i++) {
			if (wk[i].checked) {
				this.change(i, true);
				break;
			}
		}
	};
};

/*
 *  セルの読み込み
 */
function cel(str)
{
	var i, j, wk, nm, no = cels.length, arg = [];

	if (!ua) return;

	wk = parseInfo(str);
	for (i = 0; i < wk.length; i++) {
		for (j = 1; j < wk[i].length; j++) arg[wk[i][0] + j] = wk[i][j];
	}

	wk = cels[no] = new Cel(nm = arg.name1, arg.click1, (ua.IMGLD && /\.png$/i.test(arg.src1)));

	if (nm) {
		if (!group[nm]) group[nm] = new Group();
		group[nm].item.push(wk);
	}

	if (wk.ld) {
		document.write('<span id="' + PREF_CEL + no +
			'" style="position:absolute; visibility:hidden; left:0; top:0; filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\'' + arg.src1 +
			'\')" title="' + (arg.title1 || "") + '"><span style="visibility:hidden">CelNo.' + no + '</span></span>\n');
	}
	else {
		document.write('<img id="' + PREF_CEL + no +
			'" style="position:absolute; visibility:hidden; left:0; top:0" src="' + arg.src1 + '" alt="CelNo.' + no +
			'" title="' + (arg.title1 || "") + '">\n');
	}
}




function eventClick(no){

  switch(no){

    case 0:
      changeHair();
      break;

  }

}

var hairIndex = 1;
var maxHair = 5;

function changeHair(){

  hairIndex++;

  if(hairIndex > maxHair){
    hairIndex = 1;
  }

  document.getElementById("hair").src = "hair"+hairIndex+".png";

}
