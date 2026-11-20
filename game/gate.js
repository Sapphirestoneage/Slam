/* ===== gate.js: extras, part one. Some parts of the game do not live in these files. They arrive from the signed-in account, and only for an account the game's owner has switched them on for. This file answers one question for the rest of the game: is a given extra on, right now, for the person on screen? No extra is named anywhere in these files. State: ADX (what has arrived this visit), c.x.ao (which extras the owner switched on for this person), c.x.aok (a person's own one-time yes to an extra that asks for one), G.plain (Demo mode: the standard look and no extras, for everyone). ===== */
var ADX={has:{},meta:{},gl:{},own:false,quiet:0,test:false,st:"off",err:"",plainSH:null,ro:null};
function adQuiet(){try{if(ADX.quiet>0)return true;if(typeof G!=="undefined"&&G&&G.plain)return true;return !!(ADX.plainSH&&SH&&SH===ADX.plainSH)}catch(e){return false}}
function adMine(id,c){const x=(c&&c.x)||{};return ADX.own?!!(x.ao||{})[id]:true}
function adOn(id){if(!id)return true;if(!ADX.has[id]||adQuiet())return false;if(ADX.test)return true;let c=null;try{c=C()}catch(e){}if(!c)return false;if(!adMine(id,c))return false;if((ADX.meta[id]||{}).gate&&!((c.x||{}).aok||{})[id])return false;return true}
function adOk(o){return !o||!o.pk||adOn(o.pk)}
function adKey(k){return !ADX.gl[k]||adOn(ADX.gl[k])}
function adPlain(fn){ADX.quiet++;try{return fn()}finally{ADX.quiet--}}
function thUse(id,fb){try{return !adQuiet()&&id&&THEMES[id]&&adOk(THEMES[id])?id:fb}catch(e){return fb}}
