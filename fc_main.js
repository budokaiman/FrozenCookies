
function FCStart() { //ok
    logEvent("Load", "Initial Load of Frozen Cookies v " + FrozenCookies.branch + "." + FrozenCookies.version + ". (You should only ever see this once.)");
	
    // Set all cycleable preferencesau
    _.keys(FrozenCookies.preferenceValues).forEach(function(preference) {
        FrozenCookies[preference] = preferenceParse(preference, FrozenCookies.preferenceValues[preference].default);
	});
	
    // Separate because these are user-input values
    FrozenCookies.cookieClickSpeed = preferenceParse('cookieClickSpeed', 0);
    FrozenCookies.frenzyClickSpeed = preferenceParse('frenzyClickSpeed', 0);
    FrozenCookies.HCAscendAmount = preferenceParse('HCAscendAmount', 0);
    FrozenCookies.minCpSMult = preferenceParse('minCpSMult', 1);
    FrozenCookies.cursorMax = preferenceParse('cursorMax', 500);
    FrozenCookies.manaMax = preferenceParse('manaMax', 100);
    FrozenCookies.maxSpecials = preferenceParse('maxSpecials', 1);
	
    // Get historical data
    FrozenCookies.frenzyTimes = JSON.parse(localStorage.getItem('frenzyTimes')) || {};
    FrozenCookies.lastHCAmount = Number(localStorage.getItem('lastHCAmount'));
    FrozenCookies.lastHCTime = Number(localStorage.getItem('lastHCTime'));
    FrozenCookies.prevLastHCTime = Number(localStorage.getItem('prevLastHCTime'));
    FrozenCookies.maxHCPercent = Number(localStorage.getItem('maxHCPercent'));
	FrozenCookies.gcProbs=JSON.parse(localStorage.getItem('gcProbs')) || {};
	if (!FrozenCookies.gcProbs.totalclicks) FrozenCookies.gcProbs.totalclicks=0;
    
	// Basic Settings
	FrozenCookies.frequency = 100; // Base timer interval 100ms
	
	//Init probabilites
	calcProbs('golden');
	calcProbs('reindeer');	
	
	// Set default values for calculations
    FrozenCookies.clicks=0;
	FrozenCookies.clicksvalue=0;
	FrozenCookies.clickstimer=0;
	FrozenCookies.clickstimerlast=Date.now();
	
	FrozenCookies.gcclicks=0;
	FrozenCookies.gcclicksvalue=0;
	FrozenCookies.gcclickstimer=0;
	FrozenCookies.gcclickstimerlast=Date.now();
	
	FrozenCookies.reindeerclicks=0;
	FrozenCookies.reindeerclicksvalue=0;
    FrozenCookies.reindeerclickstimer=0;
	FrozenCookies.reindeerclickstimerlast=Date.now();
	
	FrozenCookies.hc_gain = 0;
    FrozenCookies.hc_gain_time = Date.now();
    FrozenCookies.last_gc_state = (Game.hasBuff('Frenzy') ? Game.buffs['Frenzy'].multCpS : 1) * (clickBuffBonus()/(Game.hasBuff('Devastation')?Game.buffs['Devastation'].multCpS:1));// remove devastaion due to variabiliy)
    FrozenCookies.last_gc_time = Date.now();

    // Caching
    FrozenCookies.recalculateCaches = true;
    FrozenCookies.caches = {};
    FrozenCookies.caches.nextPurchase = {};
    FrozenCookies.caches.recommendationList = [];
    FrozenCookies.caches.buildings = [];
    FrozenCookies.caches.upgrades = [];
	
	//Banks
	FrozenCookies.banks = [nullBank(), luckyBank(), chainBank()];
	
	//ExtraSettings, like other banks, Fps and Autobulk
	updateExtraSettings();	

	FrozenCookies.recalcCount=0;	
    
	if (!blacklist[FrozenCookies.blacklist]) {
        FrozenCookies.blacklist = 0;
	}
    
	//as Beautify is already included in CC, just add the choose from FC
    eval("Beautify="+Beautify.toString().replace(/Game\.prefs\.format\?2:1/g, 'FrozenCookies\.numberDisplay'));
	
	FrozenCookies.calculatedCps=0;
	FrozenCookies.calculatedunbuffedCps=0;
	FrozenCookies.calculatedcomputedMouseCps
	FrozenCookies.calculatedCpsByType=[];
	eval('FrozenCookies.safeGainsCalc = ' + Game.CalculateGains.toString()
	.replace(/Game\.cookiesPs/g, 'FrozenCookies.calculatedCps')
	.replace(/Game\.unbuffedCps/g, 'FrozenCookies.calculatedunbuffedCps')
	.replace(/Game\.computedMouseCps/g, 'FrozenCookies.calculatedcomputedMouseCps')
	.replace(/Game\.globalCpsMult/g, 'mult')
	.replace(/Game\.computeLumpTimes\(\)\;/g, '')
	.replace(/\(rawCookiesPs/g,'(0')); //prevent getting cps achievements

	Game.sayTime = function(time, detail) {
        return timeDisplay(time / Game.fps);
	}
    
	Game.oldReset = Game.Reset;
    Game.Reset = fcReset;
    
	Game.oldAscend = Game.Ascend;
	Game.Ascend = fcAscend;
	    
	Game.oldBackground = Game.DrawBackground;   
    Game.DrawBackground = function() {
        Game.oldBackground();
	    if (FrozenCookies.fancyui) updateTimers();
	}
	
	Game.oldUpdateMenu = Game.UpdateMenu;
	Game.UpdateMenu = function() {
        if (Game.onMenu=='fc_menu') 
		{ return FCMenu();}
	    else
		{ return Game.oldUpdateMenu();}	
	}
	
    // Initalise nextPurchase
    nextPurchase(true);
	
	// Smart tracking details
    FrozenCookies.trackedStats = [];
    FrozenCookies.lastGraphDraw = 0;
    FrozenCookies.smartTrackingBot = 0;
    FrozenCookies.minDelay = 1000 * 10; // 10s minimum reporting between purchases with "smart tracking" on
    FrozenCookies.delayPurchaseCount = 0;
	
	// Setup Timers
	FrozenCookies.menutimer = 0;
	FrozenCookies.autoClickBot = 0;
	FrozenCookies.autoClickBotMode=0;
    FrozenCookies.statBot = 0;
    FrozenCookies.smartTrackingBot = 0;
	
	StartTimer();
	
    // Give free achievements!
    if (!Game.HasAchiev('Third-party')) { Game.Win('Third-party'); }
}

function StopTimer() { // ok	
    if (FrozenCookies.cookieBot) {
		clearInterval(FrozenCookies.cookieBot);      
        FrozenCookies.cookieBot = 0;
	}
    if (FrozenCookies.autoClickBot) {
        clearInterval(FrozenCookies.autoClickBot);
        FrozenCookies.autoClickBot = 0;
	}
	if (FrozenCookies.statBot) {
        clearInterval(FrozenCookies.statBot);
        FrozenCookies.statBot = 0;
	}
	if (FrozenCookies.smartTrackingBot) {
        clearInterval(FrozenCookies.smartTrackingBot);
        FrozenCookies.smartTrackingBot = 0;
	}
}

function StartTimer() {	//ok
	//  To allow polling frequency to change, clear intervals before setting new ones.
	StopTimer();
	// Now create new intervals with their specified frequencies.
 	if (FrozenCookies.frequency) {
		FrozenCookies.cookieBot = setTimeout(autoCookie, FrozenCookies.frequency);
	}
    if (FrozenCookies.autoClick && FrozenCookies.cookieClickSpeed) {
		FrozenCookies.autoClickBot = setInterval(fcClickCookie, 1000 / FrozenCookies.cookieClickSpeed);
		FrozenCookies.autoClickBotMode=0;
	}  
    if (statSpeed(FrozenCookies.trackStats) > 0) {
        FrozenCookies.statBot = setInterval(saveStats, statSpeed(FrozenCookies.trackStats));
		} else if (FrozenCookies.trackStats == 6 && !FrozenCookies.smartTrackingBot) {
        FrozenCookies.smartTrackingBot = setTimeout(function() {
            smartTrackingStats(FrozenCookies.minDelay * 8)
		}, FrozenCookies.minDelay);
	}
	
    FCMenu();
}

function fcAscend(bypass) { //ok
  earthShatter(false); //sell everything 
  Game.oldAscend(bypass);	
}

function fcReset() { //ok
    StopTimer();
    Game.oldReset();
    FrozenCookies.frenzyTimes = {};
    FrozenCookies.last_gc_state = (Game.hasBuff('Frenzy') ? Game.buffs['Frenzy'].multCpS : 1) * (clickBuffBonus()/(Game.hasBuff('Devastation')?Game.buffs['Devastation'].multCpS:1));// remove devastaion due to variabiliy)
    FrozenCookies.last_gc_time = Date.now();
    FrozenCookies.lastHCAmount = Game.HowMuchPrestige(Game.cookiesEarned + Game.cookiesReset + wrinklerValue());
    FrozenCookies.lastHCTime = Date.now();
    FrozenCookies.maxHCPercent = 0;
    FrozenCookies.prevLastHCTime = Date.now();
    FrozenCookies.trackedStats = [];
	FrozenCookies.recalcCount=0;    
	
	// Set default values for calculations
    FrozenCookies.clicks=0;
	FrozenCookies.clicksvalue=0;
	FrozenCookies.clickstimer=0;
	FrozenCookies.clickstimerlast=Date.now();
	
	FrozenCookies.gcclicks=0;
	FrozenCookies.gcclicksvalue=0;
	FrozenCookies.gcclickstimer=0;
	FrozenCookies.gcclickstimerlast=Date.now();
	
	FrozenCookies.reindeerclicks=0;
	FrozenCookies.reindeerclicksvalue=0;
    FrozenCookies.reindeerclickstimer=0;
	FrozenCookies.reindeerclickstimerlast=Date.now();
	
	updateLocalStorage();
	recommendationList(true);
    StartTimer();
}

var T = Game.Objects['Temple'].minigame;
var M = Game.Objects['Wizard tower'].minigame;

// Auto Rigidel function
function autoRigidel() {
    if (!T) return; //Exit if pantheon doesnt even exist
    var timeToRipe = (Game.lumpRipeAge - (Date.now() - Game.lumpT))/60000; //Minutes until sugar lump ripens
    var orderLvl = Game.hasGod('order') ? Game.hasGod('order') : 0;
    switch (orderLvl) {
        case 0: //Rigidel isn't in a slot
		if (T.swaps < 2 || (T.swaps == 1 && T.slot[0] == -1) ) return; //Don't do anything if we can't swap Rigidel in
		if (timeToRipe < 60) {
			var prev = T.slot[0] //cache whatever god you have equipped
			swapIn(10,0); //swap in rigidel
			Game.computeLumpTimes();
			rigiSell(); //Meet the %10 condition
			Game.clickLump(); //harvest the ripe lump
			if (prev != -1) swapIn(prev, 0); //put the old one back
		}
        case 1: //Rigidel is already in diamond slot
		if(timeToRipe < 60) {
			rigiSell();
			Game.computeLumpTimes();
			Game.clickLump();
		}
        case 2: //Rigidel in Ruby slot,
		if(timeToRipe < 40) {
			rigiSell();
			Game.computeLumpTimes();
			Game.clickLump();
		}
        case 3: //Rigidel in Jade slot
		if (timeToRipe < 20) {
			rigiSell();
			Game.computeLumpTimes();
			Game.clickLump();
		}
	}
}

// Auto Rigidel helper functions
function rigiSell() { //Sell enough cursors to enable Rigidels effect
    if (Game.BuildingsOwned%10) Game.Objects['Cursor'].sell(Game.BuildingsOwned%10);
    return;
}

function swapIn(godId, targetSlot) { //mostly code copied from minigamePantheon.js, tweaked to avoid references to "dragging"
    if (T.swaps == 0) return;
    T.useSwap(1);
    T.lastSwapT = 0;
    var div  = l('templeGod' + godId);
    var prev = T.slot[targetSlot] //id of God currently in slot
    if (prev != -1) { //when something's in there already
        prev = T.godsById[prev]; //prev becomes god object
        var prevDiv = l('templeGod' + prev.id);
        if (T.godsById[godId].slot != -1) l('templeSlot' + T.godsById[godId].slot).appendChild(prevDiv);
        else {
            var other = l('templeGodPlaceholder'+(prev.id));
            other.parentNode.insertBefore(prevDiv, other);
		}
	}
    l('templeSlot' + targetSlot).appendChild(l('templeGod' + godId));
    T.slotGod(T.godsById[godId], targetSlot);
}

// Auto Spell Caster
function autoCast() {
    if (!M) return; //Just leave if you don't have grimoire
    if (M.magic == M.magicM) {
        switch (FrozenCookies.autoSpell) {
            case 0:
				return;
            case 1:
				var CBG = M.spellsById[0];
				if (M.magicM < Math.floor(CBG.costMin + CBG.costPercent*M.magicM)) return;
				if(multBuffBonus() >= FrozenCookies.minCpSMult) {
					setTimeout(M.castSpell(CBG), 500);
					logEvent('AutoSpell', 'Cast Conjure Baked Goods');
				}
				return;
            case 2:
				var FTHOF = M.spellsById[1];
				if (M.magicM < Math.floor(FTHOF.costMin + FTHOF.costPercent*M.magicM)) return;
				if(multBuffBonus() >= FrozenCookies.minCpSMult || Game.hasBuff('Dragonflight') || Game.hasBuff('Click frenzy')) {
					M.castSpell(FTHOF);
					logEvent('AutoSpell', 'Cast Force the Hand of Fate');
				}
				return;
            case 3:
				var SE = M.spellsById[3];
				if (M.magicM < Math.floor(SE.costMin + SE.costPercent*M.magicM)) return;
				if (edificeBank()>0) {
					M.castSpell(SE);
					logEvent('AutoSpell', 'Cast Spontaneous Edifice');
				}
				return;
            case 4:
				var hagC = M.spellsById[4];
				if (M.magicM < Math.floor(hagC.costMin + hagC.costPercent*M.magicM)) return;
				M.castSpell(hagC);
				logEvent('AutoSpell', 'Cast Haggler\'s Charm');
				return;
		}
	}
}

//Probabilities for spawn of golden cookies and reindeers functions
var Modlist={golden: [1,0.5,0.25,0.01], //just some basic values, rest will be added as needed by function
reindeer:[1,0.97,0.95,0.9215,0.9025,0.9,0.855,0.5,0.485,0.475,0.46075,0.45125,0.45,0.4275,0.01]}; //should be complete for 2.016
var cumulativeProbabilityList={golden: [0], reindeer: [0]};	

function calcProbs(listType) { //ok
	if (listType=='golden')   cumulativeProbabilityList[listType]=Modlist[listType].reduce(function(r,x) { r[x] = generateProbabilities(x, 5 * 60 * Game.fps, 3); return r;}, {})
	if (listType=='reindeer') cumulativeProbabilityList[listType]=Modlist[listType].reduce(function(r,x) { r[x] = generateProbabilities(x, 3 * 60 * Game.fps, 2); return r;}, {})	
}

function generateProbabilities(upgradeMult, minBase, maxMult) { //ok
    var cumProb = [];
    var remainingProbability = 1;
    var minTime = minBase * upgradeMult;
    var maxTime = maxMult * minTime;
    var spanTime = maxTime - minTime;
    for (var i=0; i<maxTime; i++) {
        var thisFrame = remainingProbability * Math.pow(Math.max(0,(i-minTime)/spanTime),5);
        remainingProbability -= thisFrame;
        cumProb.push(1 - remainingProbability);
	}
    return cumProb;
}

function getProbabilityList(listType) { //ok
    return cumulativeProbabilityList[listType][getProbabilityModifiers(listType)];
}

function getProbabilityModifiers(listType) { //ok 
	var i=(eval('me='+Game.shimmerTypes[listType].getTimeMod.toString().replace(/me\.wrath/,Game.elderWrath))(me,1))/(Game.fps*60);
	if (Modlist[listType].indexOf(i)==-1) { Modlist[listType].push(i); calcProbs(listType);}
	return i;
}

function probabilitySpan(listType, start, endProbability) { //ok
	var pl=getProbabilityList(listType);
	if (typeof pl=='undefined') return 0; //don't know why this happens at first call after start or reset
	var startProbability=pl[start];
    return _.sortedIndex(pl, (startProbability + endProbability - startProbability * endProbability));
}

// Buff Functions
function clickBuffBonus() { // ok 
    var ret = 1;
    for (var i in Game.buffs) {
        if (typeof Game.buffs[i].multClick != 'undefined') {
            ret *= Game.buffs[i].multClick;
		}
	}
	return ret;
}

function multBuffBonus() { // ok
    var ret = 1;
    for (var i in Game.buffs) {
        if (typeof Game.buffs[i].multCpS != 'undefined') {
            ret *= Game.buffs[i].multCpS;
		}
	}
	return ret;
}

function hasClickBuff() { // ok
	//'Click frenzy' 'Dragonflight' 'Devastation' 'Cursed finger'
	var ret = 0;
    for (var i in Game.buffs) {
        if (typeof Game.buffs[i].multClick != 'undefined') ret++;
	}
	if (Game.hasBuff('Cursed finger')) ret++;
	return ret;
}

function hasMultBuff() { //ok
	// 'Frenzy' 'Elder frenzy' 'Clot' 'Dragon Harvest' 'building buff' 'building debuff' 'Sugar frenzy'
	var ret = 0;
    for (var i in Game.buffs) {
        if (typeof Game.buffs[i].multCpS != 'undefined') ret++;
	}
	return ret;
}

// Reindeer Stuff
function reindeerValue(cps,wrathValue,aura) { //ok
    cps = cps != null ? cps : Game.cookiesPs;
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
	var index= (aura != null)? aura: getCookieIndex();
	var value = 0;	
	if (Game.season == 'christmas') {
        var remaining = 1 - (cookieInfo[index].frenzy.odds[wrathValue] + cookieInfo[index].blood.odds[wrathValue]);
		value=Math.max(25,cps * 60 * (0.5 * cookieInfo[index].blood.odds[wrathValue] + 0.75 * cookieInfo[index].frenzy.odds[wrathValue] + 1 * remaining)) * (Game.Has('Ho ho ho-flavored frosting') ? 2 : 1) * Game.eff('reindeerGain');
	}
    return value;
}

function reindeerCps(cps,wrathValue,aura) { //ok
    var averageTime = probabilitySpan('reindeer', 0, 0.5) / Game.fps;
    return reindeerValue(cps,wrathValue,aura) / averageTime;
}

//Golden Cookie Stuff
function goldenValue(amount, wrathValue, wrinklerCount) { //ok
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    wrinklerCount = wrinklerCount != null ? wrinklerCount : getactiveWrinklers();
    amount = amount != null ? amount : Game.cookies;
	var wrinkler = wrinklerMod(wrinklerCount);
    var cps = Game.cookiesPs;
    var clickCps = baseClickingCps(FrozenCookies.autoClick * FrozenCookies.cookieClickSpeed);
    var frenzyCps = baseClickingCps(FrozenCookies.autoClick * FrozenCookies.frenzyClickSpeed);
    var durationMod = gcEffectDuration(wrathValue);
    var valueMod = gcMult(wrathValue);
	
	//calculate mean of all buildings 
	var buildingcount=0;
	gcBuildingPower= Game.ObjectsById.reduce(function(a,b) { if(b.amount>=10) {buildingcount++;} return a+((b.amount>=10)?b.amount/10:0);},0);
    gcBuildingPower= (buildingcount==0)? 0 : gcBuildingPower/=buildingcount;
	
	var index= getCookieIndex();
	var value = 0;

	// building special (min 10 buildings, else frenzy), on wrath: 30% chance for debuff
	// chance: 25%
	// time: 30*effectDurMod
	// power: amount/10 + 1
    value += cookieInfo[index].building.odds[wrathValue] * cps * gcBuildingPower * Math.ceil(durationMod * 30); 
	
	// free sugar lump (if possible)
	// chance: 0.05%	
    value += 0; //no direct effect on value
	
	// frenzy
	// chance: 100% on normal
	// time: 77*effectDurMod
	// power: 7
    value += cookieInfo[index].frenzy.odds[wrathValue] * cps * 6 * Math.ceil(durationMod * 77); 
	
	// dragon harvest (needs aura Reaper of Fields)
	// chance: 15% or 5% on wrath
	// time: 60*effectDurMod
	// power: 15
    if (Game.hasAura('Reaper of Fields'))
		value += cookieInfo[index].harvest.odds[wrathValue] * cps * 14 * Math.ceil(durationMod * 60);
	
	// everything must go (only fools season)
	// chance: 5%
	// time: 8*effectDurMod
	// power: buildings are 5% cheaper
	value +=0; //no direct effect on value
	
	// multiply cookies
	// chance: 100% 
	// cookies: mult*Math.min(Game.cookies*0.15,Game.cookiesPs*60*15)+13
    value += cookieInfo[index].lucky.odds[wrathValue] * (valueMod*Math.min(amount * 0.15, cps * 60 * 15) + 13);
	
	// ruin cookies
	// chance: 100% on wrath + 200% if hasGod(scorn)
	// -cookies: Math.min(Game.cookies*0.05,Game.cookiesPs*60*10)+13
    value -= cookieInfo[index].ruin.odds[wrathValue] * (Math.min(amount * 0.05, cps * 60 * 10) + 13);
	
	// blood frenzy (elder frenzy) (wrath only)
	// chance: 30% on wrath
	// time: 6*effectDurMod
	// power: 666
    value += cookieInfo[index].blood.odds[wrathValue] * cps * 665 * Math.ceil(durationMod * 6); 

	// clot:
	// chance: 100% on wrath + 200% if hasGod(scorn)
	// time: 66*effectDurMod
	// power: 0.5
    value += cookieInfo[index].clot.odds[wrathValue] * cps * -0.5 * Math.ceil(durationMod * 66); 
	
	// cursed finger (wrath only)
	// chance: 10% 
	// time: 10*effectDurMod
	// power: Game.cookiesPs*Math.ceil(10*effectDurMod)
    value += cookieInfo[index].finger.odds[wrathValue] * ((cps * -1)+(frenzyCps*Math.ceil(10*durationMod))-clickCps) * Math.ceil(durationMod * 10); 
	
	// click frenzy
	// chance: (Math.random()<0.1 && (Math.random()<0.05 || !Game.hasBuff('Dragonflight')))
	// time: 13*effectDurMod
	// power: 777
    value += cookieInfo[index].cfrenzy.odds[wrathValue] * (frenzyCps*777-clickCps) * Math.ceil(durationMod * 13);
	
	// dragonflight: (needs aura dragonflight) chance of 80% to kill ClickFrenzy
	// chance: 15% or 5% when wrath
	// time: 10*effectDurMod
	// power: 1111
	if (Game.hasAura('Dragonflight'))
		if (index==1)
			value += cookieInfo[index].harvest.odds[wrathValue] * (frenzyCps*1111-clickCps) * Math.ceil(durationMod * 10);
		else
			value += cookieInfo[index].flight.odds[wrathValue] * (frenzyCps*1111-clickCps) * Math.ceil(durationMod * 10);
		
	// chain cookie: 1% chance to break for every step, maxout if next is > Math.min(Game.cookiesPs*60*60*6,Game.cookies*0.5)*mult;
	// chance: 3% on normal or 30% on wrath
	// cookies: 
    value += cookieInfo[index].chain.odds[wrathValue] * calculateChainValue(amount, cps, wrathValue);

	// cookie storm
	// chance: 3% on normal or 30% on wrath
	// time: 7*effectDurMod
	// power: 7  	
	// cookie strom drop
	// cookies: Math.max(mult*(Game.cookiesPs*60*Math.floor(Math.random()*7+1)),Math.floor(Math.random()*7+1));
    value += cookieInfo[index].storm.odds[wrathValue] * 7*0.5*Game.fps *(Math.max(valueMod*(cps*60*3.5), 3.5));
		
	// blab 
	// chance: 0.1%
	value +=0;
	
    return value;
}

function goldenValueNew(amount, wrathValue, wrinklerCount) { //ok
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    wrinklerCount = wrinklerCount != null ? wrinklerCount : getactiveWrinklers();
    amount = amount != null ? amount : Game.cookies;
	var wrinkler = wrinklerMod(wrinklerCount);
    var cps = FrozenCookies.calculatedCps;
    var clickCps = baseClickingCpsNew(FrozenCookies.autoClick * FrozenCookies.cookieClickSpeed);
    var frenzyCps = baseClickingCpsNew(FrozenCookies.autoClick * FrozenCookies.frenzyClickSpeed);
    var durationMod = gcEffectDuration(wrathValue);
    var valueMod = gcMult(wrathValue);
	
	// needed: as clicks and wrinkler gain more/less cookies the difference should be included, but no idea how to do it yet
	
	//calculate mean of all buildings 
	var buildingcount=0;
	gcBuildingPower= Game.ObjectsById.reduce(function(a,b) { if(b.amount>=10) {buildingcount++;} return a+((b.amount>=10)?b.amount/10:0);},0);
    gcBuildingPower= (buildingcount==0)? 0 : gcBuildingPower/=buildingcount;
	
	var index= getCookieIndex();
	var value = 0;

	// building special (min 10 buildings, else frenzy), on wrath: 30% chance for debuff
	// chance: 25%
	// time: 30*effectDurMod
	// power: amount/10 + 1
    value += cookieInfo[index].building.odds[wrathValue] * cps * gcBuildingPower * Math.ceil(durationMod * 30); 
	
	// free sugar lump (if possible)
	// chance: 0.05%	
    value += 0; //no direct effect on value
	
	// frenzy
	// chance: 100% on normal
	// time: 77*effectDurMod
	// power: 7
    value += cookieInfo[index].frenzy.odds[wrathValue] * cps * 6 * Math.ceil(durationMod * 77); 
	
	// dragon harvest (needs aura Reaper of Fields)
	// chance: 15% or 5% on wrath
	// time: 60*effectDurMod
	// power: 15
    if (Game.hasAura('Reaper of Fields'))
		value += cookieInfo[index].harvest.odds[wrathValue] * cps * 14 * Math.ceil(durationMod * 60);
	
	// everything must go (only fools season)
	// chance: 5%
	// time: 8*effectDurMod
	// power: buildings are 5% cheaper
	value +=0; //no direct effect on value
	
	// multiply cookies
	// chance: 100% 
	// cookies: mult*Math.min(Game.cookies*0.15,Game.cookiesPs*60*15)+13
    value += cookieInfo[index].lucky.odds[wrathValue] * (valueMod*Math.min(amount * 0.15, cps * 60 * 15) + 13);
	
	// ruin cookies
	// chance: 100% on wrath + 200% if hasGod(scorn)
	// -cookies: Math.min(Game.cookies*0.05,Game.cookiesPs*60*10)+13
    value -= cookieInfo[index].ruin.odds[wrathValue] * (Math.min(amount * 0.05, cps * 60 * 10) + 13);
	
	// blood frenzy (elder frenzy) (wrath only)
	// chance: 30% on wrath
	// time: 6*effectDurMod
	// power: 666
    value += cookieInfo[index].blood.odds[wrathValue] * cps * 665 * Math.ceil(durationMod * 6); 

	// clot:
	// chance: 100% on wrath + 200% if hasGod(scorn)
	// time: 66*effectDurMod
	// power: 0.5
    value += cookieInfo[index].clot.odds[wrathValue] * cps * -0.5 * Math.ceil(durationMod * 66); 
	
	// cursed finger (wrath only)
	// chance: 10% 
	// time: 10*effectDurMod
	// power: Game.cookiesPs*Math.ceil(10*effectDurMod)
    value += cookieInfo[index].finger.odds[wrathValue] * ((cps * -1)+(frenzyCps*Math.ceil(10*durationMod))-clickCps) * Math.ceil(durationMod * 10); 
	
	// click frenzy
	// chance: (Math.random()<0.1 && (Math.random()<0.05 || !Game.hasBuff('Dragonflight')))
	// time: 13*effectDurMod
	// power: 777
    value += cookieInfo[index].cfrenzy.odds[wrathValue] * (frenzyCps*777-clickCps) * Math.ceil(durationMod * 13);
	
	// dragonflight: (needs aura dragonflight) chance of 80% to kill ClickFrenzy
	// chance: 15% or 5% when wrath
	// time: 10*effectDurMod
	// power: 1111
	if (Game.hasAura('Dragonflight'))
		if (index==1)
			value += cookieInfo[index].harvest.odds[wrathValue] * (frenzyCps*1111-clickCps) * Math.ceil(durationMod * 10);
		else
			value += cookieInfo[index].flight.odds[wrathValue] * (frenzyCps*1111-clickCps) * Math.ceil(durationMod * 10);
		
	// chain cookie: 1% chance to break for every step, maxout if next is > Math.min(Game.cookiesPs*60*60*6,Game.cookies*0.5)*mult;
	// chance: 3% on normal or 30% on wrath
	// cookies: 
    value += cookieInfo[index].chain.odds[wrathValue] * calculateChainValue(amount, cps, wrathValue);

	// cookie storm
	// chance: 3% on normal or 30% on wrath
	// time: 7*effectDurMod
	// power: 7  	
	// cookie strom drop
	// cookies: Math.max(mult*(Game.cookiesPs*60*Math.floor(Math.random()*7+1)),Math.floor(Math.random()*7+1));
    value += cookieInfo[index].storm.odds[wrathValue] * 7*0.5*Game.fps *(Math.max(valueMod*(cps*60*3.5), 3.5));
		
	// blab 
	// chance: 0.1%
	value +=0;
	
    return value;
}

function getCookieIndex() { //ok
	return Game.hasAura('Dragonflight')?1:0 + Game.hasAura('Reaper of Fields')?1:0;
}

function goldenCps(amount) { //ok
    amount = amount != null ? amount : goldenValue();
    var averageTime = probabilitySpan('golden', 0, 0.5) / Game.fps;
    return amount / averageTime;
}

function calculateChainValue(amount, cps, wrathValue) { //ok, awfull but exact
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    amount = amount != null ? amount : Game.cookies;
	cps= cps != null ? cps : Game.cookiesPs;
 	var digit=(wrathValue==0)?7:6;
	var mult=gcMult(wrathValue);
	var chainstart=1+Math.max(0,Math.ceil(Math.log(amount)/Math.LN10)-10);
    var maxpayout=Math.min(cps*60*60*6,amount*0.5)*mult;
	var sum=0,p=0,pn=0,step=0;
	mult*=digit*(1/9);
	while (1)
	{	p=Math.max(digit,Math.min(Math.floor(Math.pow(10,chainstart)*mult),maxpayout)); 
		pn=Math.max(digit,Math.min(Math.floor(Math.pow(10,chainstart+1)*mult),maxpayout));
		sum+=p; 
		chainstart+=1; step+=1;
		if (pn >=maxpayout) break;
	}
	return sum*Math.pow(0.99,step-1); //1% fail rate per step;
}

function gcEffectDuration(wrathValue) { //ok
	wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
	var effectDurMod=1;
	if (Game.Has('Get lucky')) effectDurMod*=2;
	if (Game.Has('Lasting fortune')) effectDurMod*=1.1;
	if (Game.Has('Lucky digit')) effectDurMod*=1.01;
	if (Game.Has('Lucky number')) effectDurMod*=1.01;
	if (Game.Has('Green yeast digestives')) effectDurMod*=1.01;
	if (Game.Has('Lucky payout')) effectDurMod*=1.01;
	if (Game.hasAura('Epoch Manipulator')) effectDurMod*=1.05;
	if (!wrathValue) effectDurMod*=Game.eff('goldenCookieEffDur');
	else effectDurMod*=Game.eff('wrathCookieEffDur');
					
	if (Game.hasGod)
	{	var godLvl=Game.hasGod('decadence');
		if (godLvl==1) effectDurMod*=1.07;
		else if (godLvl==2) effectDurMod*=1.05;
		else if (godLvl==3) effectDurMod*=1.02;
	}
	return effectDurMod;
}

function gcMult(wrathValue) { //ok
	wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
	var mult=1;
	if (wrathValue>0 && Game.hasAura('Unholy Dominion')) mult*=1.1;
	else if (wrathValue==0 && Game.hasAura('Ancestral Metamorphosis')) mult*=1.1;
	if (Game.Has('Green yeast digestives')) mult*=1.01;
	if (!wrathValue) mult*=Game.eff('goldenCookieGain');
	else mult*=Game.eff('wrathCookieGain');
	return mult;
}

// Earth Shatter
function earthShatter(valueonly) { //ok
    if ((typeof valueonly=='undefined') || (valueonly==null)) valueonly==true;
	var value = 0;
    value+=Game.cookies;
	value+=wrinklerValue();
	Game.ObjectsById.forEach(function(b) { value+=(b.getReverseSumPrice(b.amount)*(Game.hasAura('Earth Shatterer')?2:1));}); 
	
	var highestBuilding = 0;
	Game.ObjectsById.forEach(function(b) { if (b.amount > 0) highestBuilding=b;}); 
    if (!Game.hasAura('Earth Shatterer') && (Game.dragonLevel>=8) && (highestBuilding!=0)) value-= highestBuilding.getPrice(1);	
    if (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg')) value *= 0.05;
	
	if (valueonly==false) //you shoud do this only when ascending ;)
	{ if (!Game.hasAura('Earth Shatterer') && (Game.dragonLevel>=8)) setDragonAura('Earth Shatterer');
		Game.ObjectsById.forEach(function(b) { b.sell(-1);});
		Game.CollectWrinklers();
		if (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg')) Game.Upgrades['Chocolate egg'].buy();
	} 
    return value;
}

//Chocolate Egg
function chocolateEggValue() { //ok
    var value = 0;
    if (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg')) value = Game.cookies * 0.05;
    return value;
}

//Wrinkler Stuff
function getactiveWrinklers() { //ok
	return Game.wrinklers.reduce(function (sum,a){return (a.phase==2)?1:0;},0); //only active wrinklers
}

function wrinklerValue() { //ok
    return Game.wrinklers.reduce(function(s, w) {
        return s + popValue(w);
	}, 0);
}

function popValue(w) { //ok
    var toSuck=1.1;
    if (Game.Has('Sacrilegious corruption')) toSuck*=1.05;
    if (w.type==1) toSuck*=3;//shiny wrinklers are an elusive, profitable breed
    var sucked = w.sucked*toSuck;//cookie dough does weird things inside wrinkler digestive tracts
    if (Game.Has('Wrinklerspawn')) sucked*=1.05;
    if (Game.hasGod)
	{ var godLvl=Game.hasGod('scorn');
		if      (godLvl==1) sucked*=1.15;
		else if (godLvl==2) sucked*=1.1;
		else if (godLvl==3) sucked*=1.05;
	}
	return sucked;
}

function liveWrinklers() { //ok
    return _.select(Game.wrinklers, function(w) {
        return w.sucked > 0.5 && w.phase > 0 && ((FrozenCookies.shinyPop == 0)? w.type==0:1)
	}).sort(function(w1, w2) {return w2.sucked - w1.sucked});
}

function wrinklerMod(num) { //ok
    return num*(num*0.05*1.1)*(Game.Has('Wrinklerspawn')?1.05:1)* (Game.Has('Sacrilegious corruption')?1.05:1)+ (1 - 0.05 * num);
}

function shouldPopWrinklers() {
    var toPop = [];
    var living = liveWrinklers();
    if (living.length > 0) {
        if ((Game.season == 'halloween' || Game.season == 'easter') && !haveAll(Game.season)) {
            toPop = living.map(function(w) { 
                return w.id
			});
		}
		else
		{ var bankAmount = bestBankAmount();
			var wrinklerList = (FrozenCookies.shinyPop == 0) ? Game.wrinklers.filter(v => v.type == 0) : Game.wrinklers;
			var nextRecNeeded = nextPurchase().cost + bankAmount - Game.cookies;
			var nextRecCps = nextPurchase().delta_cps;
			var wrinklersNeeded = wrinklerList
			.sort(function(w1, w2) { return w2.sucked - w1.sucked })
			.reduce(function(current, w)
			{ var futureWrinklers = living.length - (current.ids.length + 1);
				if (current.total < nextRecNeeded && effectiveCps(bankAmount, Game.elderWrath, futureWrinklers) + nextRecCps > effectiveCps())
				{ current.ids.push(w.id);
					current.total += popValue(w);
				}	
				return current;
			},{ total: 0, ids: [] }
			);
			toPop = (wrinklersNeeded.total > nextRecNeeded) ? wrinklersNeeded.ids : toPop;
		}
	}
    return toPop;
}

//Bank stuff
function nullBank(){ //ok
return 	{'name': 'null', 'calc': 'nullBank()', 'cost': 0, 'efficiency': Number.POSITIVE_INFINITY};
}
	
function edificeBank() { //ok as edifice is random, choose the highest price of all possibilitys
    var buildings=[];
	var max=0;
	var n=0;
	for (var i in Game.Objects)
	{ if (Game.Objects[i].amount>max) max=Game.Objects[i].amount;
		if (Game.Objects[i].amount>0) n++;
	}
	for (var i in Game.Objects)
	{	if ((Game.Objects[i].amount<max || n==1) && Game.Objects[i].getPrice()<=Game.cookies*2 && Game.Objects[i].amount<400) buildings.push(Game.Objects[i].getPrice());}
	var value = buildings.reduce(function(a,b){ return Math.max(a,b);},0)/2;	
    return { 'name': 'edifice', 'calc': 'edificeBank()', 'cost': value, 'efficiency': bankEfficiency(Game.cookies, value)};
}

function luckyBank(cps) { //ok, exact
    cps = cps != null ? cps : Game.cookiesPs;
	var value = cps*60*100;
    return { 'name': 'lucky', 'calc': 'luckyBank()', 'cost': value, 'efficiency': bankEfficiency(Game.cookies, value)};
}

function chainBank(cps, wrathValue) { //ok, exact
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    cps = cps != null ? cps : Game.cookiesPs;
    var digit = wrathValue ? 6:7;
	var value= 1 + 2*(Math.floor(7/9*Math.pow(10,Math.floor(Math.log10(60*60*6*cps*gcMult())))));
    return { 'name': 'chain', 'calc': 'chainBank()', 'cost': value, 'efficiency': bankEfficiency(Game.cookies, value)};
}

function harvestBank() {
    FrozenCookies.harvestMinutes = 0;
    FrozenCookies.harvestMaxPercent = 0;
    FrozenCookies.harvestFrenzy = 1;
    FrozenCookies.harvestBuilding = 1;
    FrozenCookies.harvestPlant = '';
	
    if(FrozenCookies.setHarvestBankType == 1 || FrozenCookies.setHarvestBankType == 3){
        FrozenCookies.harvestFrenzy = 7;
	}
	
    if(FrozenCookies.setHarvestBankType == 2 || FrozenCookies.setHarvestBankType == 3){
		var harvestBuildingArray = [Game.Objects['Cursor'].amount,
			Game.Objects['Grandma'].amount,
			Game.Objects['Farm'].amount,
			Game.Objects['Mine'].amount,
			Game.Objects['Factory'].amount,
			Game.Objects['Bank'].amount,
			Game.Objects['Temple'].amount,
			Game.Objects['Wizard tower'].amount,
			Game.Objects['Shipment'].amount,
			Game.Objects['Alchemy lab'].amount,
			Game.Objects['Portal'].amount,
			Game.Objects['Time machine'].amount,
			Game.Objects['Antimatter condenser'].amount,
			Game.Objects['Prism'].amount,
			Game.Objects['Chancemaker'].amount,
		Game.Objects['Fractal engine'].amount];
	    
		harvestBuildingArray.sort(function(a, b){return b-a});
	    
		for(var buildingLoop = 0; buildingLoop < FrozenCookies.maxSpecials ; buildingLoop++){
			FrozenCookies.harvestBuilding *= harvestBuildingArray[buildingLoop];
		}    
	}
	
    switch(FrozenCookies.setHarvestBankPlant){
        case 1:
	    FrozenCookies.harvestPlant = 'Bakeberry';
		FrozenCookies.harvestMinutes = 30;
		FrozenCookies.harvestMaxPercent = 0.03;
		break;
		
        case 2:
	    FrozenCookies.harvestPlant = 'Chocoroot';
		FrozenCookies.harvestMinutes = 3;
		FrozenCookies.harvestMaxPercent = 0.03;
		break;
		
        case 3:
	    FrozenCookies.harvestPlant = 'White Chocoroot';
		FrozenCookies.harvestMinutes = 3;
		FrozenCookies.harvestMaxPercent = 0.03;
		break;
		
        case 4:
	    FrozenCookies.harvestPlant = 'Queenbeet';
		FrozenCookies.harvestMinutes = 60;
		FrozenCookies.harvestMaxPercent = 0.04;
		break;
		
        case 5:
	    FrozenCookies.harvestPlant = 'Duketater';
		FrozenCookies.harvestMinutes = 120;
		FrozenCookies.harvestMaxPercent = 0.08;
		break;
		
        case 6:
	    FrozenCookies.harvestPlant = 'Crumbspore';
		FrozenCookies.harvestMinutes = 1;
		FrozenCookies.harvestMaxPercent = 0.01;
		break;
		
        case 7:
	    FrozenCookies.harvestPlant = 'Doughshroom';
		FrozenCookies.harvestMinutes = 5;
		FrozenCookies.harvestMaxPercent = 0.03;
		break;
	}
    
    if(FrozenCookies.maxSpecials == 0){
		FrozenCookies.maxSpecials = 1;
	}
	
    var value= Game.unbuffedCps * 60 * FrozenCookies.harvestMinutes * FrozenCookies.harvestFrenzy * FrozenCookies.harvestBuilding / Math.pow(10, FrozenCookies.maxSpecials) / FrozenCookies.harvestMaxPercent;
    return { 'name': 'harvest', 'calc': 'harvestBank()', 'cost': value, 'efficiency': bankEfficiency(Game.cookies, value)};
}

function updateBanks() { //ok
	FrozenCookies.banks=FrozenCookies.banks.map(function(a){return eval(a.calc);});
}
	
function bestBank(minEfficiency) { //ok
	var bestBank=FrozenCookies.banks
		.sort(function(a, b) { return b.cost - a.cost;})
		.filter(function(bank) { return (bank.efficiency >= 0 && bank.efficiency <= minEfficiency) ? bank : null;});
   if (bestBank.length > 0 ) return bestBank[0];
   else return nullBank();
 }

function bankEfficiency(startAmount, bankAmount) { //ok
    var results;
	if (bankAmount <= startAmount) {
        results = 0;
	}
    else
	{	var cost = bankAmount - startAmount;
        var deltaCps = effectiveCps(bankAmount) - effectiveCps(startAmount);
        results = divCps(cost, deltaCps);
	}
    return results;
}

function bestBankAmount() { //ok
    return bestBank(nextChainedPurchase().efficiency).cost;
}

// General buying stuff
function defaultPurchase() { //ok
    return {
        id: 0,
        efficiency: Infinity,
        delta_cps: 0,
        base_delta_cps: 0,
        cost: Infinity,
        type: 'other',
        purchase: {
            id: 0,
            name: 'No valid purchases!',
            buy: function() {},
            getCost: function() {
                return Infinity;
			}
		}
	}
}

/*function checkPrices(currentUpgrade) {
    var value = 0;
    if (FrozenCookies.caches.recommendationList.length > 0) {
        var nextRec = FrozenCookies.caches.recommendationList.filter(function(i) {
            return i.id != currentUpgrade.id;
		})[0];
        var nextPrereq = (nextRec.type == 'upgrade') ? unfinishedUpgradePrereqs(nextRec.purchase) : null;
        nextRec = (nextPrereq == null || nextPrereq.filter(function(u) {
            return u.cost != null;
			}).length == 0) ? nextRec : FrozenCookies.caches.recommendationList.filter(function(a) {
            return nextPrereq.some(function(b) {
                return b.id == a.id && b.type == a.type
			})
		})[0];
        value = nextRec.cost == null ? 0 : (nextRec.cost / totalDiscount(nextRec.type == 'building')) - nextRec.cost;
	}
    return value;
}
*/

function purchaseEfficiency(price, deltaCps, baseDeltaCps, currentCps) { //ok
    var efficiency = divCps(price, currentCps); //base efficiency.. how long does it take to buy it 
    if (deltaCps > 0) efficiency -= divCps(price, deltaCps); // subtract time we win 
	else if(baseDeltaCps > 0) efficiency -= divCps(price, baseDeltaCps);
    return Math.min(0,efficiency);
}

function recommendationList(recalculate) { //ok
    if (recalculate) {
		var saveAchievements = Game.AchievementsById.map(function(item) {return item.won});
		var saveAchievementsOwned=Game.AchievementsOwned;
		var existingWrath = Game.elderWrath;
		
//        FrozenCookies.caches.recommendationList = addScores(
		FrozenCookies.caches.recommendationList = (upgradeStats(recalculate)
		.concat(buildingStats(recalculate))
		.concat(santaStats())
		.concat(dragonStats()))
		.sort(function(a, b) {
			return a.efficiency != b.efficiency ? a.efficiency - b.efficiency : (a.delta_cps != b.delta_cps ? b.delta_cps - a.delta_cps : a.cost - b.cost);
		}) /*)*/;
		
        if (FrozenCookies.pastemode) { FrozenCookies.caches.recommendationList.reverse();}

		Game.AchievementsOwned = saveAchievementsOwned;
		saveAchievements.forEach(function(won, index) {Game.AchievementsById[index].won= won;});
		Game.elderWrath = existingWrath;
		Game.recalculateGains = 1;
	}
    return FrozenCookies.caches.recommendationList;
}


/*function addScores(recommendations) { //ok - just for optics.. no other use
    var filteredList = recommendations.filter(function(a) {
        return a.efficiency < Number.POSITIVE_INFINITY && a.efficiency > Number.NEGATIVE_INFINITY;
	})
    if (filteredList.length > 0) {
        var minValue = Math.log(recommendations[0].efficiency);
        var maxValue = Math.log(recommendations[filteredList.length - 1].efficiency);
        var spread = maxValue - minValue;
        recommendations.forEach(function(purchaseRec, index) {
            if (purchaseRec.efficiency < Number.POSITIVE_INFINITY && purchaseRec.efficiency > Number.NEGATIVE_INFINITY) {
                var purchaseValue = Math.log(purchaseRec.efficiency);
                var purchaseSpread = purchaseValue - minValue;
                recommendations[index].efficiencyScore = 1 - (purchaseSpread / spread);
				} else {
                recommendations[index].efficiencyScore = 0;
			}
		});
		} else {
        recommendations.forEach(function(purchaseRec, index) {
            recommendations[index].efficiencyScore = 0;
		});
	}
    return recommendations;
}
*/

function nextPurchase(recalculate) { //ok
    if (recalculate) {
        var recList = recommendationList(recalculate);
        var purchase = null;
        var target = null;
        for (var i = 0; i < recList.length; i++) {
            target = recList[i];
			if (target.type == 'upgrade') {
                var prereqList = unfinishedUpgradePrereqs(Game.UpgradesById[target.id]);
                if (prereqList) {
					purchase = recList.filter(function(a) {
						return prereqList.some(function(b) {
							return b.id == a.id && b.type == a.type
						})
					})[0];
				}
				else purchase = target;
			} 
			else if (target.type == 'dragon') {
				var prereqList = unfinishedDragonPrereqs(target.id-1);
                if (prereqList) {
					purchase = recList.filter(function(a) {
						return prereqList.some(function(b) {
							return b.id == a.id && b.type == a.type
						})
					})[0];
				}
				else purchase = target;
			}
			else {
                purchase = target;
			}
            if (purchase) {
                FrozenCookies.caches.nextPurchase = purchase;
                FrozenCookies.caches.nextChainedPurchase = target;
                break;
			}
		}
        if (purchase == null) {
            FrozenCookies.caches.nextPurchase = defaultPurchase();
            FrozenCookies.caches.nextChainedPurchase = defaultPurchase();
		}
	}
    return FrozenCookies.caches.nextPurchase;
}

function nextChainedPurchase(recalculate) { //ok
    nextPurchase(recalculate);
    return FrozenCookies.caches.nextChainedPurchase;
}

//Buy Buildings Stuff
function buildingStats(recalculate) { //ok
    if (recalculate) {
        var buildingBlacklist = blacklist[FrozenCookies.blacklist].buildings;
		var baseCpsOrig = Game.cookiesPs + baseClickingCps();
        var cpsOrig = effectiveCps();
		FrozenCookies.caches.buildings = Game.ObjectsById.map(function(current, index) {
            if (isBuildingUnavailable(current, buildingBlacklist)) {return null;}
            buildingToggle(current,0);
            var baseCpsNew = FrozenCookies.calculatedCps+baseClickingCpsNew();
            var cpsNew = effectiveCpsNew(); 
            buildingToggle(current,1);
            var deltaCps = cpsNew - cpsOrig;
            var baseDeltaCps = baseCpsNew - baseCpsOrig;
            var efficiency = purchaseEfficiency(current.getPrice(), deltaCps, baseDeltaCps, baseCpsOrig);
            return {
                'id': current.id,
                'efficiency': efficiency,
                'base_delta_cps': baseDeltaCps,
                'delta_cps': deltaCps,
                'cost': current.getPrice(),
                'purchase': current,
                'type': 'building'
			};
			}).filter(function(a) {
            return a;
		});
	}
    return FrozenCookies.caches.buildings;
}

function cumulativeBuildingCost(basePrice, startingNumber, endingNumber) { //ok
    return basePrice * totalDiscount(true) * ((Math.pow(Game.priceIncrease, endingNumber) - Math.pow(Game.priceIncrease, startingNumber)) / (Game.priceIncrease - 1));
}

function buildingToggle(building, reverse) { //ok
    if (!reverse) {
        building.amount += 1;
        building.bought += 1;
        Game.BuildingsOwned += 1;
	}
	else {
        building.amount -= 1;
        building.bought -= 1;
        Game.BuildingsOwned -= 1;
	}
    FrozenCookies.safeGainsCalc();
}

function isBuildingUnavailable(building, buildingBlacklist) { //ok , but needs more logic to temporary disable build block to buy upgrades
	if ((buildingBlacklist === true) || (_.contains(buildingBlacklist, building.id))) { return true; }
        
	//Stop buying wizard towers at max Mana if enabled
    if ((building.id==7) && M && FrozenCookies.towerLimit && (M.magicM >= FrozenCookies.manaMax)) { return true; }
    
	//Stop buying Cursors if at set limit
    if ((building.id==0) && FrozenCookies.cursorLimit && (Game.Objects['Cursor'].amount >= FrozenCookies.cursorMax)) { return true; }

	return false;
}

// Buy Upgrades Stuff
function upgradeStats(recalculate) { //ok
    if (recalculate) {
        var upgradeBlacklist = blacklist[FrozenCookies.blacklist].upgrades;
//		var n1=Game.UpgradesById.filter(function(a,b){return !a.unlocked && !a.bought && a.pool!='debug' && a.pool!='prestige';}).length;
//		var n2=Game.UpgradesById.filter(function(a,b){return a.unlocked && !a.bought && a.pool!='debug' && a.pool!='prestige';}).length;
//		if ((n2>25)&&(n2<=n1)) var list=Game.UpgradesById.filter(function(a,b){return a.unlocked && !a.bought && a.pool!='debug' && a.pool!='prestige';});
//		else var list=Game.UpgradesById.filter(function(a,b){return !a.bought && a.pool!='debug' && a.pool!='prestige';});
		var list=Game.UpgradesById.filter(function(a,b){return !a.bought && a.pool!='debug' && a.pool!='prestige';}).sort(function(a,b){ return (a.unlocked!=b.unlocked)?b.unlocked-a.unlocked:a.basePrice-b.basePrice;}).slice(0,25);
		var baseCpsOrig = Game.cookiesPs + baseClickingCps();
		var cpsOrig = effectiveCps();
		FrozenCookies.caches.upgrades = list
		.map(function(current) {
			if (isUpgradeUnavailable(current, upgradeBlacklist)) {return null;}
			var cost = upgradePrereqCost(current);
//			var discountsOrig = totalDiscount() + totalDiscount(true);
			var reverseFunctions = upgradeToggle(current,0);
            var baseCpsNew = FrozenCookies.calculatedCps+baseClickingCpsNew();
			var cpsNew = effectiveCpsNew();
//			var discounsNew = (discounts == (totalDiscount() + totalDiscount(true))) 
			upgradeToggle(current, 1, reverseFunctions);
			var deltaCps = cpsNew - cpsOrig;
			var baseDeltaCps = baseCpsNew - baseCpsOrig;
			var efficiency = purchaseEfficiency(cost, deltaCps, baseDeltaCps, baseCpsOrig);
//			var priceReduction=(discountOrig==discountNew)? 0 : checkPrices(current);
//			if (priceReduction > cost) efficiency = 1;			
			return {
				'id': current.id,
				'efficiency': efficiency,
				'base_delta_cps': baseDeltaCps,
				'delta_cps': deltaCps,
				'cost': cost,
				'purchase': current,
				'type': 'upgrade'
			};
		}
		)
		.filter(function(a) { return a;}); //remove empty elements
	}
    return FrozenCookies.caches.upgrades;
}

function upgradePrereqCost(upgrade) { //ok
    var cost = upgrade.getPrice();
    if (upgrade.unlocked) {
        return cost;
	}
    var prereqs = upgradeJson[upgrade.id];
    if (prereqs) {
        cost += prereqs.buildings.reduce(function(sum, item, index) {
            var building = Game.ObjectsById[index];
            if (item && building.amount < item) {
                sum += cumulativeBuildingCost(building.basePrice, building.amount, item);
			}
            return sum;
		}, 0);
        cost += prereqs.upgrades.reduce(function(sum, item) {
            var reqUpgrade = Game.UpgradesById[item];
            if (!upgrade.bought) {
                sum += upgradePrereqCost(reqUpgrade);
			}
            return sum;
		}, 0);
	}
    return cost;
}

function unfinishedUpgradePrereqs(upgrade) { //ok
    if (upgrade.unlocked) {
        return null;
	}
    var needed = [];
    var prereqs = upgradeJson[upgrade.id];
    if (prereqs) {
        prereqs.buildings.forEach(function(a, b) {
            if (a && Game.ObjectsById[b].amount < a) {
                needed.push({
                    'type': 'building',
                    'id': b
				});
			}
		});
        prereqs.upgrades.forEach(function(a) {
            if (!Game.UpgradesById[a].bought) {
				if (Game.UpgradesById[a].unlocked) { //if unlocked buy it
					needed.push({'type': 'upgrade','id': a});
				}
				else { // what is needed for this than
					var recursiveUpgrade = Game.UpgradesById[a];
					var recursivePrereqs = unfinishedUpgradePrereqs(recursiveUpgrade);
				    if (!recursivePrereqs) { // Research is being done. 
					}
					else { // put it all in
						recursivePrereqs.forEach(function(a) { //remove double entries
							if (!needed.some(function(b) { return b.id == a.id && b.type == a.type;})) {
								needed.push(a);
							}
						});
					}
				}
			}
		});
	}
    return needed.length ? needed : null;
}

function upgradeToggle(upgrade, reverse, reverseFunctions) { //ok 
    if (!reverse) {
        reverseFunctions = {};
        if (!upgrade.unlocked) {
            var prereqs = upgradeJson[upgrade.id];
            if (prereqs) {
                reverseFunctions.prereqBuildings = [];
                prereqs.buildings.forEach(function(a, b) {
                    var building = Game.ObjectsById[b];
                    if (a && building.amount < a) {
                        var difference = a - building.amount;
                        reverseFunctions.prereqBuildings.push({
                            id: b,
                            amount: difference
						});
                        building.amount += difference;
                        building.bought += difference;
                        Game.BuildingsOwned += difference;
					}
				});
                reverseFunctions.prereqUpgrades = [];
                if (prereqs.upgrades.length > 0) {
                    prereqs.upgrades.forEach(function(id) {
                        var upgrade = Game.UpgradesById[id];
                        if (!upgrade.bought) {
                            reverseFunctions.prereqUpgrades.push({
                                id: id,
                                reverseFunctions: upgradeToggle(upgrade,0)
							});
						}
					});
				}
			}
		}
        upgrade.bought = 1;
        Game.UpgradesOwned += 1;
      reverseFunctions.current = buyFunctionToggle(upgrade);
	} 
	else {
		if (reverseFunctions.prereqBuildings) {
			reverseFunctions.prereqBuildings.forEach(function(b) {
				var building = Game.ObjectsById[b.id];
				building.amount -= b.amount;
				building.bought -= b.amount;
				Game.BuildingsOwned -= b.amount;
			});
		}
		if (reverseFunctions.prereqUpgrades) {
			reverseFunctions.prereqUpgrades.forEach(function(u) {
				var upgrade = Game.UpgradesById[u.id];
				upgradeToggle(upgrade, 1, u.reverseFunctions);
			});
		}
		upgrade.bought = 0;
		Game.UpgradesOwned -= 1;
		buyFunctionToggle(reverseFunctions.current);	
	}
    FrozenCookies.safeGainsCalc();
    return reverseFunctions;
}

function isUpgradeUnavailable(upgrade, upgradeBlacklist) { //ok
    var needed = unfinishedUpgradePrereqs(upgrade);
    if (!upgrade.unlocked && !needed) return true;
    if (upgradeBlacklist === true) return true;
    if (_.contains(upgradeBlacklist, upgrade.id)) return true;
 
	//dont'buy Elder Pledge if Wrinklers are needed - so only in easter or halloween season and when not all upgrades for this season are bought
	if ((upgrade.id==74) && (((Game.season=='easter') && !haveAll('easter')) || ((Game.season=='halloween')&& !haveAll('halloween')))) return true;

	if ((upgrade.id==87) && (Game.pledges<10)) return true; // Sacrificial rolling pins only after 10 elder pledges
	
	if (typeof upgrade.season != 'undefined' ) { // want season change?
		if (!haveAll(Game.season)) return true; //don't if not all upgrades of current season purchased
	    if ((upgrade.season != seasons[FrozenCookies.defaultSeason]) && haveAll(upgrade.season)) return true; //do not revisite season unless it is the default season
	}
	
	if  ((upgrade.id == 331) || (upgrade.id ==332)) return true; // blacklist golden switch from being used *needs logic*
    if ((upgrade.id == 563) || (upgrade.id == 564)) return true; // blacklist shimmering veil switch from being used *needs logic*
	if ((upgrade.id == 84) || (upgrade.id==85)) return true; // blacklist (Revoke) Elder Covenant from being used *needs logic*
    if (upgrade.id == 333) return true; // blacklist milk selector from being used
    if (upgrade.id == 414) return true; // blacklist background selector from being used
    if (upgrade.id == 361) return true; // blacklist golden cookie sound selector from being used
    if (upgrade.id == 452) return true; // blacklist sugar frenzy from being used randomly *needs logic*
    if (upgrade.id == 227) return true; // blacklist chocolate egg from being used ramdomly

    return false;
}

function buyFunctionToggle(upgrade) { //ok, simplified as only these id matter here
var reverse=null;
	if (upgrade && !upgrade.length) {
        if (!upgrade.buyFunction) { return null;}
		if (upgrade.id==69) {reverse=['Game.elderWrath='+Game.elderWrath]; Game.elderWrath=1;}
		if (upgrade.id==71) {reverse=['Game.elderWrath='+Game.elderWrath]; Game.elderWrath=2;}
		if (upgrade.id==73) {reverse=['Game.elderWrath='+Game.elderWrath]; Game.elderWrath=3;}
		if (upgrade.id==74) {reverse=['Game.elderWrath='+Game.elderWrath]; Game.elderWrath=0;}
		if ((upgrade.id==182) ||
			(upgrade.id==183) ||
			(upgrade.id==184) ||
			(upgrade.id==185) ||
			(upgrade.id==209)) { reverse=['Game.season=\''+Game.season+'\'']; Game.season=upgrade.season;}	
		return reverse;
	}
	else if (upgrade && upgrade.length) { upgrade.forEach(function(f) { eval(f);});}
    return null;
}

// Buy Santa Stuff
function santaStats() { //ok
    if (Game.Has('A festive hat') && (Game.santaLevel + 1 < Game.santaLevels.length)) { 
		var costs=singleSantaCost(Game.santaLevel);
		return { id: santaJson[Game.santaLevel],
			efficiency: purchaseEfficiency(costs, 0, 0, Game.cookiesPs + baseClickingCps()),
			base_delta_cps: 0,
			delta_cps: 0,
			cost: costs,
			type: 'santa',
			purchase: {
				id: santaJson[Game.santaLevel],
				name: 'Santa Upgrade ' + (Game.santaLevel + 1),
				buy: buySanta,
				getCost: function() { return singleSantaCost(Game.santaLevel);}
			}
		}
	}
	else return [];
}

function singleSantaCost(level) { //ok costs for given level
    return Math.pow(level+1,level+1);
}

function cumulativeSantaCost(level) { //ok costs for all levels needed to complete
	var sum=0;
	for (var i=level; i< Game.santaLevels.length; i++) { sum+=singleSantaCost(i); }
    return sum;
}

function buySanta() { //ok
    Game.specialTab = 'santa';
    Game.UpgradeSanta();
    Game.ToggleSpecialMenu();
}

// Buy Dragon Stuff
function dragonStats() { //ok
    if (Game.Has('A crumbly egg') && (Game.dragonLevel + 1 < Game.dragonLevels.length)) {		
		var costs=singleDragonCost(Game.dragonLevel);
		return { id: Game.dragonLevel + 1,
			efficiency: purchaseEfficiency(costs, 0, 0, Game.cookiesPs + baseClickingCps()),
			base_delta_cps: 0,
			delta_cps: 0,
			cost: costs,
			type: 'dragon',
			purchase: {
				id: Game.dragonLevel + 1,
				name: 'Dragon Upgrade ' + (Game.dragonLevel + 1),
				buy: buyDragon,
				getCost: function() { return singleDragonCost(Game.dragonLevel);}
			}
		}
	}
	else return[];
}

function singleDragonCost(level) { //ok, cookie costs or costs to rebuy buildings for given level
    var dcost=[1000000,1000000*2,1000000*4,1000000*8,1000000*16]
	.concat(Game.ObjectsById.map(function(a) { return cumulativeBuildingCost(a.basePrice, a.amount<=100?a.amount:a.amount-100, a.amount<=100?100:a.amount);}))
	.concat(Game.ObjectsById.map(function(a) { return cumulativeBuildingCost(a.basePrice, a.amount<=50?a.amount:a.amount-50, a.amount<=50?50:a.amount);}).reduce(function(a,b) { return a+b;},0))
	.concat(Game.ObjectsById.map(function(a) { return cumulativeBuildingCost(a.basePrice, a.amount<=200?a.amount:a.amount-200, a.amount<=200?200:a.amount);}).reduce(function(a,b) { return a+b;},0));
	
	return dcost[level];
}

function cumulativeDragonCost(level) { //ok costs for all levels needed to complete
	var sum=0;
	for (var i=level; i< Game.dragonLevels.length; i++) { sum+=singleDragonCost(i); }
    return sum;
}

function unfinishedDragonPrereqs(dragonid) { //ok
	var needed = [];
	if (dragonid==Game.dragonLevels.length-1) return null;
	var prereqs = dragonJson[dragonid + 1];
	//	logEvent('Dragon','Prereq Dragon Level '+dragonid);
	prereqs.buildings.forEach(function(a, b) {
		if (a && Game.ObjectsById[b].amount < a) {
			needed.push({
				'type': 'building',
				'id': b
			});
		}
	});
	return needed.length ? needed : null;
}

function buyDragon() { //ok
    Game.specialTab = 'dragon';
    Game.UpgradeDragon();
    Game.ToggleSpecialMenu();
	autoAura();
}

function setDragonAura(aura,slot) { //ok - non cheating version
	var auraid=-1;
	for (var i in Game.dragonAuras) { if (Game.dragonAuras[i].name==aura) { auraid=parseInt(i); break;}}
	if (auraid==-1) return false; //unknown aura
	if (Game.dragonLevel < auraid+4) return false; // level too low for aura
	if ((Game.dragonAura==auraid) || (Game.dragonAura2==auraid)) return true; // already set

	if (typeof slot!='undefined') {
		if ((slot==1) && (Game.dragonLevel<23)) return false; // don't have second auro yet
		if (slot==0) Game.dragonAura=auraid;
		else Game.dragonAura2=auraid;
	}
	else { //auto-select slot
		if (Game.dragonAura==0) Game.dragonAura=auraid;
		else if ((Game.dragonAura2==0) && (Game.dragonLevel>=23)) Game.dragonAura2=auraid;
		else Game.dragonAura=auraid; //first slot if nothing is free	
	}		

	var highestBuilding=0;
	for (var i in Game.Objects) {if (Game.Objects[i].amount>0) highestBuilding=Game.Objects[i];}
	if (highestBuilding!=0) highestBuilding.sacrifice(1);
	
	return true;
}

function autoAura(){ //work in progress, set best auras as soon as they are availble
	if (Game.dragonLevel>=5){ // first aura
		switch (Game.dragonLevel)
		{ 	case 0:
			case 1:
			case 2:
			case 3:
			case 4: break;
			case 5: setDragonAura('Breath of Milk',0); break;
			case 6: setDragonAura('Dragon Cursor',0); break;
			case 7: setDragonAura('Elder Battalion',0); break;
			case 8: 
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17: 
			case 18: setDragonAura('Reaper of Fields',0); break;
			case 19: 
			case 20:
			case 21:
			case 22: setDragonAura('Radiant Appetite',0); break;
			case 23: setDragonAura('Dragonflight',0); break;			
		}
	}	
	if (Game.dragonLevel==23) { //second aura
		setDragonAura('Radiant Appetite',1);
	}
}

//Misc functions
function haveAll(holiday) { //ok
    if ((typeof holiday == 'undefined' )||(holiday == '')||(holiday=='fools')) return true;
	else return holidayCookies[holiday].every(function(id) { return Game.UpgradesById[id].unlocked; });
}

function divCps(value, cps) { //ok
    var result = 0;
    if (cps) {
        result = value / cps;
	} 
	else {
        result = Number.POSITIVE_INFINITY;
	}
    return result;
}

function baseClickingCps(clickSpeed) { //ok
    clickSpeed= (clickSpeed!=null) ? clickSpeed : FrozenCookies.cookieClickSpeed * FrozenCookies.autoClick;
	var cpc = Game.computedMouseCps / clickBuffBonus();
    return clickSpeed * cpc;
}

function baseClickingCpsNew(clickSpeed) { //ok
    clickSpeed= (clickSpeed!=null) ? clickSpeed : FrozenCookies.cookieClickSpeed * FrozenCookies.autoClick;
    var cpc = FrozenCookies.calculatedcomputedMouseCps / clickBuffBonus();
    return clickSpeed * cpc;
}

function effectiveCpsNew(amount, wrathValue, wrinklerCount) { //ok
    amount = amount != null ? amount : Game.cookies;
	wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    wrinklerCount = wrinklerCount != null ? wrinklerCount : getactiveWrinklers();
	
    return FrozenCookies.calculatedCps * wrinklerMod(wrinklerCount) + 
	goldenCps(goldenValueNew(amount, wrathValue, wrinklerCount)) +
	baseClickingCpsNew() +
	reindeerCps(FrozenCookies.calculatedCps,wrathValue);
}

function effectiveCps(amount, wrathValue, wrinklerCount) { //ok
    amount = amount != null ? amount : Game.cookies;
	wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    wrinklerCount = wrinklerCount != null ? wrinklerCount : getactiveWrinklers();
	
    return Game.cookiesPs * wrinklerMod(wrinklerCount) + 
	goldenCps(goldenValue(amount, wrathValue, wrinklerCount)) +
	baseClickingCps() +
	reindeerCps(Game.cookiesPs,wrathValue);
}

function totalDiscount(is_building) { //need more work
    var price = 1;
    if (is_building) { //Building price reduction
		if (Game.Has('Season savings')) price*=0.99;
		if (Game.Has('Santa\'s dominion')) price*=0.99;
		if (Game.Has('Faberge egg')) price*=0.99;
		if (Game.Has('Divine discount')) price*=0.99;
		if (Game.hasAura('Fierce Hoarder')) price*=0.98;
		if (Game.hasBuff('Everything must go')) price*=0.95;
		if (Game.hasBuff('Crafty pixies')) price*=0.98;
		if (Game.hasBuff('Nasty goblins')) price*=1.02;
		price*=Game.eff('buildingCost');
		if (Game.hasGod)
		{
			var godLvl=Game.hasGod('creation');
			if (godLvl==1) price*=0.93;
			else if (godLvl==2) price*=0.95;
			else if (godLvl==3) price*=0.98;
		}
	}
	else { // Upgrade price reduction
		if (Game.Has('Toy workshop')) price*=0.95;
		if (Game.Has('Five-finger discount')) price*=Math.pow(0.99,Game.Objects['Cursor'].amount/100);
		if (Game.Has('Santa\'s dominion')) price*=0.98;
		if (Game.Has('Faberge egg')) price*=0.99;
		if (Game.Has('Divine sales')) price*=0.99;
		if (Game.hasBuff('Haggler\'s luck')) price*=0.98;
		if (Game.hasBuff('Haggler\'s misery')) price*=1.02;
		if (Game.hasAura('Master of the Armory')) price*=0.98;
		price*=Game.eff('upgradeCost');
		//if (this.pool=='cookie' && Game.Has('Divine bakeries')) price/=5;
	}
    return price;
}

function logEvent(event, text, popup) { //ok
    var time = '[' + timeDisplay((Date.now() - Game.startDate) / 1000) + ']';
    var output = time + ' ' + event + ': ' + text;
    if (FrozenCookies.logging) {
        console.log(output);
	}
    if (popup) {
        Game.Popup(text);
	}
}

function preferenceParse(setting, defaultVal) { //ok
    var value = localStorage.getItem(setting);
    if (typeof(value) == 'undefined' || value == null || isNaN(Number(value))) {
        value = defaultVal;
        localStorage.setItem(setting, value);
	}
    return Number(value);
}

function updateLocalStorage() { //ok
    _.keys(FrozenCookies.preferenceValues).forEach(function(preference) {
        localStorage[preference] = FrozenCookies[preference];
	});
	
    localStorage.frenzyClickSpeed = FrozenCookies.frenzyClickSpeed;
    localStorage.cookieClickSpeed = FrozenCookies.cookieClickSpeed;
    localStorage.HCAscendAmount = FrozenCookies.HCAscendAmount;
    localStorage.cursorMax = FrozenCookies.cursorMax;
    localStorage.minCpSMult = FrozenCookies.minCpSMult;
    localStorage.frenzyTimes = JSON.stringify(FrozenCookies.frenzyTimes);
    localStorage.lastHCAmount = FrozenCookies.lastHCAmount;
    localStorage.maxHCPercent = FrozenCookies.maxHCPercent;
    localStorage.lastHCTime = FrozenCookies.lastHCTime;
    localStorage.manaMax = FrozenCookies.manaMax;
    localStorage.maxSpecials = FrozenCookies.maxSpecials;
    localStorage.prevLastHCTime = FrozenCookies.prevLastHCTime;
	localStorage.gcProbs=JSON.stringify(FrozenCookies.gcProbs);
}

//Helper functions for Stats
function statSpeed() { //ok
    var speed = 0;
    switch (FrozenCookies.trackStats) {
        case 1: // 60s
		speed = 1000 * 60;
		break;
        case 2: // 30m
		speed = 1000 * 60 * 30;
		break;
        case 3: // 1h
		speed = 1000 * 60 * 60;
		break;
        case 4: // 24h
		speed = 1000 * 60 * 60 * 24;
		break;
	}
    return speed;
}

function transpose(a) { //ok
    return Object.keys(a[0]).map(function(c) {
        return a.map(function(r) {
            return r[c];
		});
	});
}

function viewStatGraphs() { //ok
    saveStats(true);
    var containerDiv = $('#statGraphContainer').length ?
	$('#statGraphContainer') :
	$('<div>').attr('id', 'statGraphContainer')
	.html($('<div>')
	.attr('id', 'statGraphs'))
	.appendTo('body')
	.dialog({
		modal: true,
		title: 'Frozen Cookies Tracked Stats',
		width: $(window).width() * 0.8,
		height: $(window).height() * 0.8
	});
    if (containerDiv.is(':hidden')) {
        containerDiv.dialog();
	}
    if (FrozenCookies.trackedStats.length > 0 && (Date.now() - FrozenCookies.lastGraphDraw) > 1000) {
        FrozenCookies.lastGraphDraw = Date.now();
        $('#statGraphs').empty();
        var graphs = $.jqplot('statGraphs', transpose(FrozenCookies.trackedStats.map(function(s) {
			return [
				[s.time / 1000, s.baseCps],
				[s.time / 1000, s.effectiveCps],
				[s.time / 1000, s.hc]
			]
		})), //
		{
			legend: {
				show: true
			},
			height: containerDiv.height() - 50,
			axes: {
				xaxis: {
					tickRenderer: $.jqplot.CanvasAxisTickRenderer,
					tickOptions: {
						angle: -30,
						fontSize: '10pt',
						showGridline: false,
						formatter: function(ah, ai) {
							return timeDisplay(ai);
						}
					}
				},
				yaxis: {
					padMin: 0,
					renderer: $.jqplot.LogAxisRenderer,
					tickDistribution: 'even',
					tickOptions: {
						formatter: function(ah, ai) {
							return Beautify(ai);
						}
					}
				},
				y2axis: {
					padMin: 0,
					tickOptions: {
						showGridline: false,
						formatter: function(ah, ai) {
							return Beautify(ai);
						}
					}
				}
			},
			highlighter: {
				show: true,
				sizeAdjust: 15
			},
			series: [{
				label: 'Base CPS'
                }, {
				label: 'Effective CPS'
                }, {
				label: 'Earned HC',
				yaxis: 'y2axis'
			}]
		});
	}
}

//statBot
function saveStats(fromGraph) { //ok
    FrozenCookies.trackedStats.push({
        time: Date.now() - Game.startDate,
        baseCps: Game.unbuffedCps,
        effectiveCps: effectiveCps(),
        hc: Game.HowMuchPrestige(Game.cookiesEarned + Game.cookiesReset + wrinklerValue())
	});
    if ($('#statGraphContainer').length > 0 && !$('#statGraphContainer').is(':hidden') && !fromGraph) {
        viewStatGraphs();
	}
}

//smartTrackingBot
function smartTrackingStats(delay) { //ok
    saveStats();
    if (FrozenCookies.trackStats == 6) {
        delay /= (FrozenCookies.delayPurchaseCount == 0) ? (1 / 1.5) : (delay > FrozenCookies.minDelay ? 2 : 1);
        FrozenCookies.smartTrackingBot = setTimeout(function() {
            smartTrackingStats(delay);
		}, delay);
        FrozenCookies.delayPurchaseCount = 0;
	}
}

//autoClick function
function fcClickCookie() { //ok
    if (!Game.OnAscend && !Game.AscendTimer && !Game.specialTabHovered) {
		var tmp=Game.cookies;
		Game.ClickCookie();
		FrozenCookies.clicksvalue+=(Game.cookies-tmp);
		FrozenCookies.clicks++;
		tmp=Date.now();
		FrozenCookies.clickstimer+=(tmp-FrozenCookies.clickstimerlast);
		FrozenCookies.clickstimerlast=tmp;
	}
}

//main function
function autoCookie() { //ok
    if (!Game.OnAscend && !Game.AscendTimer) {		
		//Update Banks
		updateBanks();
		
		// Get HC stats
		var currentHCAmount = Game.HowMuchPrestige(Game.cookiesEarned + Game.cookiesReset + wrinklerValue());
        if (Math.floor(FrozenCookies.lastHCAmount) < Math.floor(currentHCAmount)) {
            var changeAmount = currentHCAmount - FrozenCookies.lastHCAmount;
            FrozenCookies.lastHCAmount = currentHCAmount;
            FrozenCookies.prevLastHCTime = FrozenCookies.lastHCTime;
            FrozenCookies.lastHCTime = Date.now();
            var currHCPercent = (60 * 60 * (FrozenCookies.lastHCAmount - Game.heavenlyChips) / ((FrozenCookies.lastHCTime - Game.startDate) / 1000));
            if ((Game.heavenlyChips < (currentHCAmount - changeAmount)) && currHCPercent > FrozenCookies.maxHCPercent) {
                FrozenCookies.maxHCPercent = currHCPercent;
			}
            FrozenCookies.hc_gain += changeAmount;
            updateLocalStorage();
		}
 		
		// Get Frenzy stats
		var currentFrenzy = (Game.hasBuff('Frenzy') ? Game.buffs['Frenzy'].multCpS : 1) * (clickBuffBonus()/(Game.hasBuff('Devastation')?Game.buffs['Devastation'].multCpS:1)); // remove devastaion due to variabiliy)
        if (currentFrenzy != FrozenCookies.last_gc_state) {
            if (FrozenCookies.last_gc_state != 1 && currentFrenzy == 1) {
                logEvent('GC', 'Frenzy ended, cookie production x1');
                if (FrozenCookies.hc_gain) {
					
                    logEvent('HC', 'Won ' + FrozenCookies.hc_gain + ' heavenly chips during Frenzy. Rate: ' + (FrozenCookies.hc_gain * 1000) / (Date.now() - FrozenCookies.hc_gain_time) + ' HC/s.');
                    FrozenCookies.hc_gain_time = Date.now();
                    FrozenCookies.hc_gain = 0;
				}
				} else {
                if (FrozenCookies.last_gc_state != 1) {
                    logEvent('GC', 'Previous Frenzy x' + FrozenCookies.last_gc_state + 'interrupted.')
					} else if (FrozenCookies.hc_gain) {
                    logEvent('HC', 'Won ' + FrozenCookies.hc_gain + ' heavenly chips outside of Frenzy. Rate: ' + (FrozenCookies.hc_gain * 1000) / (Date.now() - FrozenCookies.hc_gain_time) + ' HC/s.');
                    FrozenCookies.hc_gain_time = Date.now();
                    FrozenCookies.hc_gain = 0;
				}
                logEvent('GC', 'Starting ' + (hasClickBuff() ? 'Clicking ' : '') + 'Frenzy x' + currentFrenzy);
			}
            if (FrozenCookies.frenzyTimes[FrozenCookies.last_gc_state] == null) {
                FrozenCookies.frenzyTimes[FrozenCookies.last_gc_state] = 0;
			}
            FrozenCookies.frenzyTimes[FrozenCookies.last_gc_state] += Date.now() - FrozenCookies.last_gc_time;
            FrozenCookies.last_gc_state = currentFrenzy;
            FrozenCookies.last_gc_time = Date.now();
            updateLocalStorage();
		}
        
		// Normal cookie click rate or frenzy click rate logic
		if (FrozenCookies.autoClick) {
			if (hasClickBuff()) {
				if (FrozenCookies.frenzyClickSpeed && (FrozenCookies.autoClickBotMode==0)) {
					clearInterval(FrozenCookies.autoClickBot);
					FrozenCookies.autoClickBot = setInterval(fcClickCookie, 1000 / FrozenCookies.frenzyClickSpeed);
					FrozenCookies.autoClickBotMode=1;
					//					logEvent('AutoClick', 'Clicking cookie on frency speed with  ' + FrozenCookies.frenzyClickSpeed + ' clicks per second.');
				}	
			}
			else {
				if (FrozenCookies.cookieClickSpeed && (FrozenCookies.autoClickBotMode==1)) {
					clearInterval(FrozenCookies.autoClickBot);
					FrozenCookies.autoClickBot = setInterval(fcClickCookie, 1000 / FrozenCookies.cookieClickSpeed);		
					FrozenCookies.autoClickBotMode=0;
					//					logEvent('AutoClick', 'Clicking cookie on normal speed with  ' + FrozenCookies.cookieClickSpeed + ' clicks per second.');
				}
			}
		}
		
		//Harvest Sugar Lump
        if (FrozenCookies.autoSL == 2) autoRigidel(); //must come before normal harvest
        if (FrozenCookies.autoSL) {
			var started = Game.lumpT;
			var ripeAge = Game.lumpRipeAge;
			if ((Date.now() - started) >= ripeAge) {
				Game.clickLump();
				logEvent('AutoHarvestSL', 'Got a new Sugar Lump for you.');
			}
		}
		
		//Pop Wrinklers
		if (FrozenCookies.autoWrinkler == 1) { //efficent pop
            var popCount = 0;
            var popList = shouldPopWrinklers();
            _.filter(Game.wrinklers, function(w) {
                return _.contains(popList, w.id)
				}).forEach(function(w) {
                w.hp = 0;
                popCount += 1;
			});
            if (popCount > 0) {
                logEvent('Wrinkler', 'Popped ' + popCount + ' wrinklers.');
			}
		}
        if (FrozenCookies.autoWrinkler == 2) {  //instant pop
            var popCount = 0;
            var popList = (FrozenCookies.shinyPop == 0) ? Game.wrinklers.filter(v => v.type == 0) : Game.wrinklers;
            popList.forEach(function(w) {
                if (w.close == true) {
                    w.hp = 0;
                    popCount += 1;
				}
			});
            if (popCount > 0) {
                logEvent('Wrinkler', 'Popped ' + popCount + ' wrinklers.');
			}
		}
        
		// Pop Golden Cookie
        if (FrozenCookies.autoGC) {
            for (var i in Game.shimmers) {
                if (Game.shimmers[i].type == 'golden') {
                    Game.shimmers[i].pop();
					FrozenCookies.gcclicksvalue=Game.cookies;// start value
                    FrozenCookies.gcclicks++;
					FrozenCookies.gcProbs.totalclicks++;
					var tmp=Date.now();
					FrozenCookies.gcclickstimer+=(tmp-FrozenCookies.gcclickstimerlast);
					FrozenCookies.gcclickstimerlast=tmp;
				    if (typeof FrozenCookies.gcProbs[Game.shimmerTypes.golden.last] == 'undefined') FrozenCookies.gcProbs[Game.shimmerTypes.golden.last]={clicks:[0,0,0,0]};
					FrozenCookies.gcProbs[Game.shimmerTypes.golden.last].clicks[Game.elderWrath]++;
				}
			}
		}
        
		// Pop Reindeer
		if (FrozenCookies.autoReindeer) {
            for (var i in Game.shimmers) {
                if (Game.shimmers[i].type == 'reindeer') {
                    var tmp=Game.cookies;
					Game.shimmers[i].pop();
					FrozenCookies.reindeerclicksvalue+=(Game.cookies-tmp);
					FrozenCookies.reindeerclicks++;
					tmp=Date.now();
					FrozenCookies.reindeerclickstimer+=(tmp-FrozenCookies.reindeerclickstimerlast);
					FrozenCookies.reindeerclickstimerlast=tmp;
				}
			}
		}
        
		// AutoGodzamok, needs work
		if (T && FrozenCookies.autoGodzamok) {
			//Now has option to not trigger until current Devastation buff expires (i.e. won't rapidly buy & sell cursors throughout Godzamok duration)
			if (Game.hasGod('ruin') && (Game.Objects['Cursor'].amount > 10)) {
				if ((FrozenCookies.autoGodzamok == 1) && Game.hasBuff('Devastation')){ // crazy mode, only during Devastation
					var count = Game.Objects['Cursor'].amount;
					Game.Objects['Cursor'].sell(count);
					Game.Objects['Cursor'].buy(count);
				}
				if ((FrozenCookies.autoGodzamok == 2) && hasClickBuff()) { // do it in a sane way for every clickBuff
					var count = Game.Objects['Cursor'].amount;
					Game.Objects['Cursor'].sell(count);
				}
				if ((FrozenCookies.autoGodzamok == 2) && hasClickBuff()) { // do it in an insane way for every clickBuff
					var count = Game.Objects['Cursor'].amount;
					Game.Objects['Cursor'].sell(count);
					Game.Objects['Cursor'].buy(count);
				}	
			}
		}
		
		// AutoCast
		if (M && FrozenCookies.autoSpell) autoCast();
		
		// AutoGS
		if (hasClickBuff()) {
			if (Game.Upgrades['Golden switch [off]'].unlocked && !Game.Upgrades['Golden switch [off]'].bought) {
				Game.Upgrades['Golden switch [off]'].buy();
			}
		} else {
			if (Game.Upgrades['Golden switch [on]'].unlocked && !Game.Upgrades['Golden switch [on]'].bought) {
				Game.CalculateGains(); // Ensure price is updated since Frenzy ended
				Game.Upgrades['Golden switch [on]'].buy();
			}
		}
		
		// Autoblacklist handling
		if (FrozenCookies.autoBlacklistOff) {
            switch (FrozenCookies.blacklist) {
				case 1:
				FrozenCookies.blacklist = (Game.cookiesEarned >= 1000000) ? 0 : 1;
				break;
				case 2:
				FrozenCookies.blacklist = (Game.cookiesEarned >= 1000000000) ? 0 : 2;
				break;
				case 3:
				FrozenCookies.blacklist = (haveAll('halloween') && haveAll('valentines')) ? 0 : 3;
				break;
			}
		}
        
		// Yeah, buy some stuff
        var recommendation = nextPurchase(FrozenCookies.recalculateCaches);
		if (FrozenCookies.autoBuy && (Game.cookies >= bestBankAmount() + recommendation.cost)) {
			recommendation.time = Date.now() - Game.startDate;
			recommendation.purchase.clickFunction = null;
			recommendation.purchase.buy();
            
			//Smart Stats
			if (FrozenCookies.trackStats == 5 && recommendation.type == 'upgrade') {
				saveStats();
			} 
			else if (FrozenCookies.trackStats == 6) {
				FrozenCookies.delayPurchaseCount += 1;
			}
			
			logEvent('Store', 'Autobought ' + recommendation.purchase.name + ' for ' + Beautify(recommendation.cost) + ', resulting in ' + Beautify(recommendation.delta_cps) + ' more CPS.');
            
			FrozenCookies.recalculateCaches = true;
			FrozenCookies.recalcCount=0;			
		}
		else { FrozenCookies.recalcCount++; FrozenCookies.recalculateCaches = false;}
		if (FrozenCookies.recalcCount==10){FrozenCookies.recalculateCaches = true; FrozenCookies.recalcCount=0;	}	
		
		// handle autoAscend
        if (FrozenCookies.autoAscend) {
            var currPrestige = Game.prestige;
            var resetPrestige = Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned + earthShatter(true));
            var ascendChips = FrozenCookies.HCAscendAmount;
            if ((resetPrestige - currPrestige) >= ascendChips && ascendChips > 0) {
				Game.ClosePrompt();
                fcAscend(1);
                setTimeout(function() {
                    Game.ClosePrompt();
                    Game.Reincarnate(1);
				}, 10000);
			}
		}
	}
    if (Game.T%(Game.fps*5)==0 && !Game.mouseDown && (Game.onMenu=='fc_menu')) FCMenu();
	if (FrozenCookies.frequency) {
        FrozenCookies.cookieBot = setTimeout(autoCookie, FrozenCookies.frequency);
	}
}

