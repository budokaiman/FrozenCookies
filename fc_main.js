//Version 1.7.3
function FCStart() {
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
    
	// Basic Settings
	FrozenCookies.frequency = 100; // Base timer interval 100ms

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
    FrozenCookies.last_gc_state = (Game.hasBuff('Frenzy') ? Game.buffs['Frenzy'].multCpS : 1) * clickBuffBonus();
    FrozenCookies.last_gc_time = Date.now();
    FrozenCookies.lastCPS = Game.cookiesPs;
    FrozenCookies.lastCookieCPS = 0;
    FrozenCookies.lastUpgradeCount = 0;
    FrozenCookies.currentBank = {
        'cost': 0,
        'efficiency': 0
    };
    FrozenCookies.targetBank = {
        'cost': 0,
        'efficiency': 0
    };
    FrozenCookies.calculatedCpsByType = {};


    // Caching
    FrozenCookies.recalculateCaches = true;
    FrozenCookies.caches = {};
    FrozenCookies.caches.nextPurchase = {};
    FrozenCookies.caches.recommendationList = [];
    FrozenCookies.caches.buildings = [];
    FrozenCookies.caches.upgrades = [];

    if (!blacklist[FrozenCookies.blacklist]) {
        FrozenCookies.blacklist = 0;
    }
    
	//as Beautify is already included in CC, just add the choose from FC
    eval("Beautify="+Beautify.toString().replace(/Game\.prefs\.format\?2:1/g, 'FrozenCookies\.numberDisplay'));
	
	//Copy some code for internal use and modify
	eval('FrozenCookies.safeGainsCalc = ' + Game.CalculateGains.toString().replace(/Game\.cookiesPs/g, 'FrozenCookies.calculatedCps').replace(/Game\.globalCpsMult/g, 'mult'));
	
	Game.sayTime = function(time, detail) {
        return timeDisplay(time / Game.fps);
    }
    
	Game.oldReset = Game.Reset;
    Game.Reset = fcReset;
    
    Game.Win = fcWin; //Block showing fast-click achievments every few seconds
    
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

	//next 2 not needed?
	//Game.RefreshStore();
    //Game.RebuildUpgrades();

	// Smart tracking details
    FrozenCookies.trackedStats = [];
    FrozenCookies.lastGraphDraw = 0;
    FrozenCookies.smartTrackingBot = 0;
    FrozenCookies.minDelay = 1000 * 10; // 10s minimum reporting between purchases with "smart tracking" on
    FrozenCookies.delayPurchaseCount = 0;
   
	// Setup Timers
	FrozenCookies.menutimer = 0;
	FrozenCookies.cookieBot = 0;
    FrozenCookies.autoClickBot = 0;
	FrozenCookies.autoFClickBot = 0;
    FrozenCookies.autoGodzamokBot = 0;
	FrozenCookies.autoSpellBot = 0;
    FrozenCookies.statBot = 0;
    FrozenCookies.smartTrackingBot = 0;
    StartTimer();
	
    // Give free achievements!
    if (!Game.HasAchiev('Third-party')) { Game.Win('Third-party'); }
}

function StartTimer() {
   //  To allow polling frequency to change, clear intervals before setting new ones.
    if (FrozenCookies.cookieBot) {
        clearInterval(FrozenCookies.cookieBot);
        FrozenCookies.cookieBot = 0;
    }
    if (FrozenCookies.autoClickBot) {
        clearInterval(FrozenCookies.autoClickBot);
        FrozenCookies.autoClickBot = 0;
    }
	if (FrozenCookies.autoFClickBot) {
        clearInterval(FrozenCookies.autoFClickBot);
        FrozenCookies.autoFClickBot = 0;
    }
    if (FrozenCookies.autoGodzamokBot) {
        clearInterval(FrozenCookies.autoGodzamokBot);
        FrozenCookies.autoGodzamokBot = 0;
    }
    if (FrozenCookies.autoSpellBot) {
        clearInterval(FrozenCookies.autoSpellBot);
        FrozenCookies.autoSpellBot = 0;
    }
	if (FrozenCookies.statBot) {
        clearInterval(FrozenCookies.statBot);
        FrozenCookies.statBot = 0;
    }
	if (FrozenCookies.smartTrackingBot) {
        clearInterval(FrozenCookies.smartTrackingBot);
        FrozenCookies.smartTrackingBot = 0;
    }
	
    // Now create new intervals with their specified frequencies.
    if (FrozenCookies.frequency) {
        FrozenCookies.cookieBot = setTimeout(autoCookie, FrozenCookies.frequency);
    }
    if (FrozenCookies.autoClick && FrozenCookies.cookieClickSpeed) {
	  FrozenCookies.autoClickBot = setInterval(fcClickCookie, 1000 / FrozenCookies.cookieClickSpeed);
	}  
	if (FrozenCookies.autoGodzamok) {
        FrozenCookies.autoGodzamokBot = setInterval(autoGodzamokAction, FrozenCookies.frequency)
    }
    if (FrozenCookies.autoSpell) {
        FrozenCookies.autoSpellBot = setInterval(autoCast, FrozenCookies.frequency)
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

function fcReset() {
    Game.CollectWrinklers();
    if (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg')) {
        Game.ObjectsById.forEach(function(b) {
            b.sell(-1);
        });
        Game.Upgrades['Chocolate egg'].buy();
    }
    Game.oldReset();
    FrozenCookies.frenzyTimes = {};
    FrozenCookies.last_gc_state = (Game.hasBuff('Frenzy') ? Game.buffs['Frenzy'].multCpS : 1) * clickBuffBonus();
    FrozenCookies.last_gc_time = Date.now();
    FrozenCookies.lastHCAmount = Game.HowMuchPrestige(Game.cookiesEarned + Game.cookiesReset + wrinklerValue());
    FrozenCookies.lastHCTime = Date.now();
    FrozenCookies.maxHCPercent = 0;
    FrozenCookies.prevLastHCTime = Date.now();
    FrozenCookies.lastCps = 0;
    FrozenCookies.trackedStats = [];
    updateLocalStorage();
    recommendationList(true);
}

//updated code to 2.016 version
function fcWin(what) { //ok
    if (typeof what === 'string') {
        if (Game.Achievements[what]) {
            if (Game.Achievements[what].won == 0) {
                
		var name=Game.Achievements[what].shortName?Game.Achievements[what].shortName:Game.Achievements[what].name;
		Game.Achievements[what].won=1;
		if (Game.prefs.popups) Game.Popup('Achievement unlocked :<br>'+name);
	    // suppress notify because of fast clicking
		// else Game.Notify('Achievement unlocked','<div class="title" style="font-size:18px;margin-top:-2px;">'+name+'</div>',Game.Achievements[what].icon);
		if (Game.CountsAsAchievementOwned(Game.Achievements[what].pool)) Game.AchievementsOwned++;
		Game.recalculateGains=1;    		    
            }
        }
    } 
    else { for (var i in what) { Game.Win(what[i]); }}
}

var T = Game.Objects['Temple'].minigame;
var M = Game.Objects['Wizard tower'].minigame;

function rigiSell() {
    //Sell enough cursors to enable Rigidels effect
    if (Game.BuildingsOwned%10) Game.Objects['Cursor'].sell(Game.BuildingsOwned%10);
    return;
}

function lumpIn(mins) { //For debugging, set minutes until next lump is *ripe*
    Game.lumpT = Date.now() - Game.lumpRipeAge + (60000*mins)
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
    
    PlaySound('snd/tick.mp3');
    PlaySound('snd/spirit.mp3');
         
    var rect=l('templeGod' + godId).getBoundingClientRect();
    Game.SparkleAt((rect.left+rect.right)/2,(rect.top+rect.bottom)/2-24);
}

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
                Game.clickLump(); //harvest the ripe lump, AutoSL probably covers this but this should avoid issues with autoBuy going first and disrupting Rigidel
                if (prev != -1) swapIn(prev, 0); //put the old one back
            }
        case 1: //Rigidel is already in diamond slot
            if(timeToRipe < 60 && Game.BuildingsOwned%10) {
                rigiSell();
                Game.computeLumpTimes();
                Game.clickLump();
            }
        case 2: //Rigidel in Ruby slot,
            if(timeToRipe < 40 && Game.BuildingsOwned%10) {
                rigiSell();
                Game.computeLumpTimes();
                Game.clickLump();
            }
        case 3: //Rigidel in Jade slot
            if (timeToRipe < 20 && Game.BuildingsOwned%10) {
                rigiSell();
                Game.computeLumpTimes();
                Game.clickLump();
            }
    }
}
                        
function autoCast() {
    if (!M) return; //Just leave if you don't have grimoire
    if (M.magic == M.magicM) {
        switch (FrozenCookies.autoSpell) {
            case 0:
                return;
            case 1:
                var CBG = M.spellsById[0];
                if (M.magicM < Math.floor(CBG.costMin + CBG.costPercent*M.magicM)) return;
                if(cpsBonus() >= FrozenCookies.minCpSMult) {
                    M.castSpell(CBG);
                    logEvent('AutoSpell', 'Cast Conjure Baked Goods');
                }
                return;
            case 2:
                var FTHOF = M.spellsById[1];
                if (M.magicM < Math.floor(FTHOF.costMin + FTHOF.costPercent*M.magicM)) return;
                if(cpsBonus() >= FrozenCookies.minCpSMult || Game.hasBuff('Dragonflight') || Game.hasBuff('Click frenzy')) {
                    M.castSpell(FTHOF);
                    logEvent('AutoSpell', 'Cast Force the Hand of Fate');
                }
                return;
            case 3:
                var SE = M.spellsById[3];
                //If you don't have any Fractal engine yet, or can't cast SE, just give up.
                if (Game.Objects['Fractal engine'].amount == 0 || M.magicM < Math.floor(SE.costMin + SE.costPercent*M.magicM)) return;
                //If we have over 400 CM, always going to sell down to 399. If you don't have half a Fractal engine in bank, sell one
                while (Game.Objects['Fractal engine'].amount >= 400 || Game.cookies < Game.Objects['Fractal engine'].price/2) {
                   Game.Objects['Fractal engine'].sell(1);
                   logEvent('Store', 'Sold 1 Fractal engine for ' + Beautify(Game.Objects['Fractal engine'].price*1.15*.85));
                }
                M.castSpell(SE);
                logEvent('AutoSpell', 'Cast Spontaneous Edifice');
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

//calculate Probabilities for spawn of golden cookies and reindeers 
var cumulativeProbabilityList = {
    golden : [1, 0.95, 0.5, 0.475, 0.25, 0.2375].reduce(function(r,x) {
        r[x] = generateProbabilities(x, 5 * 60 * Game.fps, 3);
        return r;
    }, {}),
    reindeer : [1, 0.5].reduce(function(r,x) {
        r[x] = generateProbabilities(x, 3 * 60 * Game.fps, 2);
        return r;
    }, {})
};

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

function getProbabilityModifiers(listType) { //ok spawnrate modifier
   eval('me='+Game.shimmerTypes[listType].getTimeMod.toString().replace(/me\.wrath/,Game.elderWrath))
   return me.getTimeMod(me,1)/(Game.fps*60);
}

function probabilitySpan(listType, start, endProbability) { //ok
    var startProbability = getProbabilityList(listType)[start];
    return _.sortedIndex(getProbabilityList(listType), (startProbability + endProbability - startProbability * endProbability));
}


// math
function clickBuffBonus() {
    var ret = 1
    for (var i in Game.buffs) {
        // Devastation, Godzamok's buff, is too variable
        if (typeof Game.buffs[i].multClick != 'undefined' && Game.buffs[i].name != 'Devastation') {
            ret *= Game.buffs[i].multClick;
        }
    }
	return ret;
}

function divCps(value, cps) {
    var result = 0;
    if (value) {
        if (cps) {
            result = value / cps;
        } else {
            result = Number.POSITIVE_INFINITY;
        }
    }
    return result;
}

function cpsBonus() {
    var ret = 1
    for (var i in Game.buffs) {
        if (typeof Game.buffs[i].multCpS != 'undefined') {
            ret *= Game.buffs[i].multCpS;
        }
    }
    return ret;
}

function hasClickBuff() {
    return Game.hasBuff('Cursed finger') || clickBuffBonus() != 1;
}

function baseClickingCps(clickSpeed) {
    var cpc = Game.mouseCps() / clickBuffBonus();
    return clickSpeed * cpc;
}


function effectiveCps(bankAmount, wrathValue, wrinklerCount) { //ok
    bankAmount = bankAmount != null ? bankAmount : Game.unbuffedCps;
	wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    wrinklerCount = wrinklerCount != null ? wrinklerCount : getactiveWrinklers();

    return Game.unbuffedCps * wrinklerMod(wrinklerCount) + 
		   gCps(cookieValue(bankAmount, wrathValue, wrinklerCount)) +
		   baseClickingCps(FrozenCookies.cookieClickSpeed * FrozenCookies.autoClick) +
		   reindeerCps(wrathValue);
}

function frenzyProbability(wrathValue) {
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    return cookieInfo.frenzy.odds[wrathValue]; 
}

function clotProbability(wrathValue) {
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    return cookieInfo.clot.odds[wrathValue]; 
}

function elderfrenzyProbability(wrathValue) {
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    return cookieInfo.elderfrenzy.odds[wrathValue];
}

function cookieValue(bankAmount, wrathValue, wrinklerCount) {
    var cps = Game.unbuffedCps;
    var clickCps = baseClickingCps(FrozenCookies.autoClick * FrozenCookies.cookieClickSpeed);
    var frenzyCps = baseClickingCps(FrozenCookies.autoClick * FrozenCookies.frenzyClickSpeed);
    var luckyMod = Game.Has('Get lucky') ? 2 : 1;
    wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
    wrinklerCount = wrinklerCount != null ? wrinklerCount : getactiveWrinklers();
    var wrinkler = wrinklerMod(wrinklerCount);

    var value = 0;
    // Clot
    value -= cookieInfo.clot.odds[wrathValue] * (wrinkler * cps + clickCps) * luckyMod * 66 * 0.5;
    // Frenzy
    value += cookieInfo.frenzy.odds[wrathValue] * (wrinkler * cps + clickCps) * luckyMod * 77 * 6;
    // ElderFrenzy
    value += cookieInfo.elderfrenzy.odds[wrathValue] * (wrinkler * cps + clickCps) * luckyMod * 6 * 665;
    // Chain
    value += cookieInfo.chain.odds[wrathValue] * calculateChainValue(bankAmount, cps, (7 - (wrathValue / 3)));
    // Ruin
    value -= cookieInfo.ruin.odds[wrathValue] * (Math.min(bankAmount * 0.05, cps * 60 * 10) + 13);
    // Frenzy + Ruin
    value -= cookieInfo.frenzyRuin.odds[wrathValue] * (Math.min(bankAmount * 0.05, cps * 60 * 10 * 7) + 13);
    // Clot + Ruin
    value -= cookieInfo.clotRuin.odds[wrathValue] * (Math.min(bankAmount * 0.05, cps * 60 * 10 * 0.5) + 13);
    // Lucky
    value += cookieInfo.lucky.odds[wrathValue] * (Math.min(bankAmount * 0.15, cps * 60 * 15) + 13);
    // Frenzy + Lucky
    value += cookieInfo.frenzyLucky.odds[wrathValue] * (Math.min(bankAmount * 0.15, cps * 60 * 15 * 7) + 13);
    // Clot + Lucky
    value += cookieInfo.clotLucky.odds[wrathValue] * (Math.min(bankAmount * 0.15, cps * 60 * 15 * 0.5) + 13);
    // Click
    value += cookieInfo.click.odds[wrathValue] * frenzyCps * luckyMod * 13 * 777;
    // Frenzy + Click
    value += cookieInfo.frenzyClick.odds[wrathValue] * frenzyCps * luckyMod * 13 * 777 * 7;
    // Clot + Click
    value += cookieInfo.clotClick.odds[wrathValue] * frenzyCps * luckyMod * 13 * 777 * 0.5;
    // Blah
    value += 0;
    return value;
}

function reindeerValue(wrathValue) { //ok
    var value = 0;
    if (Game.season == 'christmas') {
        var remaining = 1 - (frenzyProbability(wrathValue) + elderfrenzyProbability(wrathValue));
		value=Math.max(25,Game.cookiesPs * 60 * (0.5 * elderfrenzyProbability(wrathValue) + 0.75 * frenzyProbability(wrathValue) + 1 *remaining)) * (Game.Has('Ho ho ho-flavored frosting') ? 2 : 1) * Game.eff('reindeerGain');
    }
    return value;
}

function reindeerCps(wrathValue) { // needs testing
    var averageTime = probabilitySpan('reindeer', 0, 0.5) / Game.fps;
    return reindeerValue(wrathValue) / averageTime * FrozenCookies.simulatedGCPercent;
}

function gCps(gcValue) { //needs testing
    var averageGCTime = probabilitySpan('golden', 0, 0.5) / Game.fps;
    return gcValue / averageGCTime * FrozenCookies.simulatedGCPercent;
}

function gcEfficiency() {
    if (gCps(weightedCookieValue()) <= 0) {
        return Number.MAX_VALUE;
    }
    var cost = Math.max(0, (maxLuckyValue() * 10 - Game.cookies));
    var deltaCps = gCps(weightedCookieValue() - weightedCookieValue(true));
    return divCps(cost, deltaCps);
}

function calculateChainValue(bankAmount, cps, digit) {
    x = Math.min(bankAmount, (cps * 60 * 60 * 6 * 4));
    n = Math.floor(Math.log((9 * x) / (4 * digit)) / Math.LN10);
    return 125 * Math.pow(9, (n - 3)) * digit;
}

function chocolateValue(bankAmount, earthShatter) {
    var value = 0;
    if (Game.HasUnlocked('Chocolate egg') && !Game.Has('Chocolate egg')) {
        bankAmount = (bankAmount != null && bankAmount !== 0) ? bankAmount : Game.cookies;
        var sellRatio = 0.25;
        var highestBuilding = 0;
        if (earthShatter == null) {
            if (Game.hasAura('Earth Shatterer')) sellRatio = 0.5;
        } else if (earthShatter) {
            sellRatio = 0.5;
            if (!Game.hasAura('Earth Shatterer')) {
                for (var i in Game.Objects) {
                    if (Game.Objects[i].amount > 0) highestBuilding = Game.Objects[i];
                }
            }
        }
        value = 0.05 * (wrinklerValue() + bankAmount + Game.ObjectsById.reduce(function(s, b) {
            return s + cumulativeBuildingCost(b.basePrice, 1, (b == highestBuilding ? b.amount : b.amount + 1) - b.free) * sellRatio
        }, 0));
    }
    return value;
}

//functions for dealing with the wrinklers
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
    }).sort(function(w1, w2) {
        return w2.sucked - w1.sucked
    });
}

function wrinklerMod(num) { //ok
    return num*(num*0.05*1.1)*(Game.Has('Wrinklerspawn')?1.05:1)* (Game.Has('Sacrilegious corruption')?1.05:1)+ (1 - 0.05 * num);
}

function shouldPopWrinklers() { //ok?
    var toPop = [];
    var living = liveWrinklers();
    if (living.length > 0) {
        if ((Game.season == 'halloween' || Game.season == 'easter') && !haveAll(Game.season)) {
            toPop = living.map(function(w) { 
                return w.id
            });
        }
		else
		{ var delay = delayAmount();
          var wrinklerList = (FrozenCookies.shinyPop == 0) ? Game.wrinklers.filter(v => v.type == 0) : Game.wrinklers;
          var nextRecNeeded = nextPurchase().cost + delay - Game.cookies;
          var nextRecCps = nextPurchase().delta_cps;
          var wrinklersNeeded = wrinklerList
				.sort(function(w1, w2) { return w2.sucked - w1.sucked })
		        .reduce(function(current, w)
					{ var futureWrinklers = living.length - (current.ids.length + 1);
						if (current.total < nextRecNeeded && effectiveCps(delay, Game.elderWrath, futureWrinklers) + nextRecCps > effectiveCps())
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

function canCastSE() {
    if (M.magicM >= 80 && Game.Objects['Fractal engine'].amount > 0) return 1;
    return 0;
}

function edificeBank() {
    if (!canCastSE) return 0;
    var cmCost = Game.Objects['Fractal engine'].price;
    return Game.hasBuff('everything must go') ? (cmCost * (100/95))/2 : cmCost/2;
}

function luckyBank() {
    return Game.unbuffedCps * 60 * 100;
}

function luckyFrenzyBank() {
    return Game.unbuffedCps * 60 * 100 * 7;
}

function chainBank() {
    //  More exact
    var digit = 7 - Math.floor(Game.elderWrath / 3);
    return 4 * Math.floor(digit / 9 * Math.pow(10, Math.floor(Math.log(194400 * Game.unbuffedCps / digit) / Math.LN10)));
    //  return Game.unbuffedCps * 60 * 60 * 6 * 4;
}

function harvestBank() {
    if(!FrozenCookies.setHarvestBankPlant) return 0;
    
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

    return Game.unbuffedCps * 60 * FrozenCookies.harvestMinutes * FrozenCookies.harvestFrenzy * FrozenCookies.harvestBuilding / Math.pow(10, FrozenCookies.maxSpecials) / FrozenCookies.harvestMaxPercent;
}

function cookieEfficiency(startingPoint, bankAmount) {
    var results = Number.MAX_VALUE;
    var currentValue = cookieValue(startingPoint);
    var bankValue = cookieValue(bankAmount);
    var bankCps = gCps(bankValue);
    if (bankCps > 0) {
        if (bankAmount <= startingPoint) {
            results = 0;
        } else {
            var cost = Math.max(0, (bankAmount - startingPoint));
            var deltaCps = gCps(bankValue - currentValue);
            results = divCps(cost, deltaCps);
        }
    } else if (bankAmount <= startingPoint) {
        results = 0;
    }
    return results;
}

function bestBank(minEfficiency) {
    var results = {};
    var edifice = ((FrozenCookies.autoSpell == 3 || FrozenCookies.holdSEBank) ?  edificeBank() : 0);
    var bankLevels = [0, luckyBank(), luckyFrenzyBank(), harvestBank()].sort(function(a, b) {
        return b - a;
    }).map(function(bank) {
        return {
            'cost': bank,
            'efficiency': cookieEfficiency(Game.cookies, bank)
        };
    }).filter(function(bank) {
        return (bank.efficiency >= 0 && bank.efficiency <= minEfficiency || FrozenCookies.setHarvestBankPlant) ? bank : null;
    });
    if (bankLevels[0].cost > edifice || FrozenCookies.setHarvestBankPlant) {
        return bankLevels[0];
    }
    return {
        'cost': edifice,
        'efficiency': 1
    };
}

function weightedCookieValue(useCurrent) {
    var cps = Game.unbuffedCps;
    var lucky_mod = Game.Has('Get lucky');
    var base_wrath = lucky_mod ? 401.835 * cps : 396.51 * cps;
    //  base_wrath += 192125500000;
    var base_golden = lucky_mod ? 2804.76 * cps : 814.38 * cps;
    if (Game.cookiesEarned >= 100000) {
        var remainingProbability = 1;
        var startingValue = '6666';
        var rollingEstimate = 0;
        for (var i = 5; i < Math.min(Math.floor(Game.cookies).toString().length, 12); i++) {
            startingValue += '6';
            rollingEstimate += 0.1 * remainingProbability * startingValue;
            remainingProbability -= remainingProbability * 0.1;
        }
        rollingEstimate += remainingProbability * startingValue;
        //    base_golden += 10655700000;
        base_golden += rollingEstimate * 0.0033;
        base_wrath += rollingEstimate * 0.0595;
    }
    if (useCurrent && Game.cookies < maxLuckyBank()) {
        if (lucky_mod) {
            base_golden -= ((900 * cps) - Math.min(900 * cps, Game.cookies * 0.15)) * 0.49 * 0.5 + (maxLuckyValue() - (Game.cookies * 0.15)) * 0.49 * 0.5;
        } else {
            base_golden -= (maxLuckyValue() - (Game.cookies * 0.15)) * 0.49;
            base_wrath -= (maxLuckyValue() - (Game.cookies * 0.15)) * 0.29;
        }
    }
    return Game.elderWrath / 3.0 * base_wrath + (3 - Game.elderWrath) / 3.0 * base_golden;
}

function maxLuckyValue() {
    var gcMod = Game.Has('Get lucky') ? 6300 : 900;
    return Game.unbuffedCps * gcMod;
}

function maxLuckyBank() {
    return Game.Has('Get lucky') ? luckyFrenzyBank() : luckyBank();
}

function maxCookieTime() {
    return Game.shimmerTypes.golden.maxTime
}

function delayAmount() {
    return bestBank(nextChainedPurchase().efficiency).cost;
}

function haveAll(holiday) { //ok
    if ((typeof holiday == 'undefined' )||(holiday == '')||(holiday=='fools')) return true;
	else return holidayCookies[holiday].every(function(id) { return Game.UpgradesById[id].unlocked; });
}

function checkPrices(currentUpgrade) {
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

// Use this for changes to future efficiency calcs
function purchaseEfficiency(price, deltaCps, baseDeltaCps, currentCps) {
    var efficiency = Number.POSITIVE_INFINITY;
    if (deltaCps > 0) {
        efficiency = divCps(price, currentCps) + divCps(price, deltaCps);
    }
    return efficiency;
}

function recommendationList(recalculate) { //ok, but needs more logic to tempory disable build block to buy upgrades
    if (recalculate) {
        FrozenCookies.caches.recommendationList = addScores(
            upgradeStats(recalculate)
            .concat(buildingStats(recalculate))
            .concat(santaStats())
//			.concat(dragonStats())
            .sort(function(a, b) {
                return a.efficiency != b.efficiency ? a.efficiency - b.efficiency : (a.delta_cps != b.delta_cps ? b.delta_cps - a.delta_cps : a.cost - b.cost);
            }));
		
		//If autocasting Spontaneous Edifice, don't buy any Fractal engines after 399
        if (M && FrozenCookies.autoSpell == 3 && Game.Objects['Fractal engine'].amount >= 399) {
            for (var i = 0; i < FrozenCookies.caches.recommendationList.length; i++) {
                if (FrozenCookies.caches.recommendationList[i].id == 15) {
                    FrozenCookies.caches.recommendationList.splice(i , 1);
                }
            }
        }
        //Stop buying wizard towers at max Mana if enabled
        if (M && FrozenCookies.towerLimit && M.magicM >= FrozenCookies.manaMax) {
            for (var i = 0; i < FrozenCookies.caches.recommendationList.length; i++) {
                if (FrozenCookies.caches.recommendationList[i].id == 7) {
                    FrozenCookies.caches.recommendationList.splice(i , 1);
                }
            }
        }
        //Stop buying Cursors if at set limit
        if (FrozenCookies.cursorLimit && Game.Objects['Cursor'].amount >= FrozenCookies.cursorMax) {
            for (var i = 0; i < FrozenCookies.caches.recommendationList.length; i++) {
                if (FrozenCookies.caches.recommendationList[i].id == 0) {
                    FrozenCookies.caches.recommendationList.splice(i, 1);
                }
            }
        }
        if (FrozenCookies.pastemode) {
            FrozenCookies.caches.recommendationList.reverse();
        }
    }
    return FrozenCookies.caches.recommendationList;
}

function isUnavailable(upgrade, upgradeBlacklist) { //ok
    var result = false;

    var needed = unfinishedUpgradePrereqs(upgrade);
    result = result || (!upgrade.unlocked && !needed);
    result = result || (upgradeBlacklist === true);
    result = result || _.contains(upgradeBlacklist, upgrade.id);
    result = result || (needed && (_.find(needed, function(a) { return a.type == "wrinklers"}) != null) && (Game.elderWrath==0) && ((upgrade.id==74) || (upgrade.id==84))); //grandmapocalyps nicht beenden wenn wrinkler nötig

	if (typeof upgrade.season != 'undefined' ) {
		result = result || (!haveAll(Game.season)); //no season change if not all upgrades of current season purchased
	    result = result || ((upgrade.season != seasons[FrozenCookies.defaultSeason]) && haveAll(upgrade.season)); //no season change if all upgrades of that season purchased
	}

	if  ((upgrade.id == 331) || (upgrade.id ==332)) {
        result = true; // blacklist golden switch from being used
    }
    
    if ((upgrade.id == 563) || (upgrade.id == 564)) {
        result = true; // blacklist shimmering veil switch from being used
    }
    
    if (upgrade.id == 333) {
        result = true; // blacklist milk selector from being used
    }
    
    if (upgrade.id == 414) {
        result = true; // blacklist background selector from being used
    }

    if (upgrade.id == 361) {
        result = true; // blacklist golden cookie sound selector from being used
    }
    
    if (upgrade.id == 452) {
        result = true; // blacklist sugar frenzy from being used
    }

    if (upgrade.id == 227) {
        result = true; // blacklist chocolate egg from being used
    }

    return result;
}

function addScores(recommendations) { // ok, but needs possible some efficiency tweaks for special upgrades
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

function nextPurchase(recalculate) {
    if (recalculate) {
        var recList = recommendationList(recalculate);
        var purchase = null;
        var target = null;
        for (var i = 0; i < recList.length; i++) {
            target = recList[i];
            if (target.type == 'upgrade' && unfinishedUpgradePrereqs(Game.UpgradesById[target.id])) {
                var prereqList = unfinishedUpgradePrereqs(Game.UpgradesById[target.id]);
                purchase = recList.filter(function(a) {
                    return prereqList.some(function(b) {
                        return b.id == a.id && b.type == a.type
                    })
                })[0];
            } else {
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

function nextChainedPurchase(recalculate) {
    nextPurchase(recalculate);
    return FrozenCookies.caches.nextChainedPurchase;
}

function buildingStats(recalculate) {
    if (recalculate) {
        var buildingBlacklist = blacklist[FrozenCookies.blacklist].buildings;
 //       var currentBank = bestBank(0).cost;
        FrozenCookies.caches.buildings = Game.ObjectsById.map(function(current, index) {
            if (buildingBlacklist === true || _.contains(buildingBlacklist, current.id)) {
                return null;
            }
            var baseCpsOrig = Game.unbuffedCps;
//            var cpsOrig = effectiveCps(Math.min(Game.cookies, currentBank)); 
            var cpsOrig = effectiveCps(Game.cookies); 
            var existingAchievements = Game.AchievementsById.map(function(item, i) {
                return item.won
            });
            buildingToggle(current);
            var baseCpsNew = Game.unbuffedCps;
//            var cpsNew = effectiveCps(Math.min(Game.cookies, currentBank)); 
            var cpsNew = effectiveCps(Game.cookies); 
            buildingToggle(current, existingAchievements);
            var deltaCps = cpsNew - cpsOrig;
            var baseDeltaCps = baseCpsNew - baseCpsOrig;
            var efficiency = purchaseEfficiency(current.getPrice(), deltaCps, baseDeltaCps, cpsOrig);
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

function upgradeStats(recalculate) {
    if (recalculate) {
        var upgradeBlacklist = blacklist[FrozenCookies.blacklist].upgrades;
 //       var currentBank = bestBank(0).cost;
        FrozenCookies.caches.upgrades = Game.UpgradesById.map(function(current) {
            if (!current.bought) {
                if (isUnavailable(current, upgradeBlacklist)) {
                    return null;
                }
                var needed = unfinishedUpgradePrereqs(current);
                var cost = upgradePrereqCost(current);
                var baseCpsOrig = Game.unbuffedCps;
//                var cpsOrig = effectiveCps(Math.min(Game.cookies, currentBank)); 
				var cpsOrig = effectiveCps(Game.cookies); 
                var existingAchievements = Game.AchievementsById.map(function(item) {
                    return item.won
                });
                var existingWrath = Game.elderWrath;
                var discounts = totalDiscount() + totalDiscount(true);
                var reverseFunctions = upgradeToggle(current);
                var baseCpsNew =Game.unbuffedCps;
//                var cpsNew = effectiveCps(currentBank);
                var cpsNew = effectiveCps(Game.cookies);
                var priceReduction = (discounts == (totalDiscount() + totalDiscount(true))) ? 0 : checkPrices(current);
                upgradeToggle(current, existingAchievements, reverseFunctions);
                Game.elderWrath = existingWrath;
                var deltaCps = cpsNew - cpsOrig;
                var baseDeltaCps = baseCpsNew - baseCpsOrig;
                var efficiency = ((typeof current.season != 'undefinded') && (current.season == seasons[FrozenCookies.defaultSeason])) ? cost / baseCpsOrig : (priceReduction > cost) ? 1 : purchaseEfficiency(cost, deltaCps, baseDeltaCps, cpsOrig);
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
        }).filter(function(a) {
            return a;
        });
    }
    return FrozenCookies.caches.upgrades;
}

function santaStats() { //ok, more work needed
    return Game.Has('A festive hat') && (Game.santaLevel + 1 < Game.santaLevels.length) ? {
        id: 999,
        efficiency: 1,
        base_delta_cps: 0,
        delta_cps: 0,
        cost: singleSantaCost(Game.santaLevel),
        type: 'santa',
        purchase: {
            id: 999,
            name: 'Santa Upgrade ' + Game.santaLevel,
            buy: buySanta,
            getCost: function() {
                return singleSantaCost(Game.santaLevel);
            }
        }
    } : [];
}

function singleSantaCost(level) { //ok costs for given level
    return Math.pow(level+1,level+1);
}

function cumulativeSantaCost(level) { // ok costs for all levels needed to complete
	var sum=0;
	for (var i=level; i< Game.santaLevels.length; i++) { sum+=singleSantaCost(i); }
    return sum;
}

function buySanta() { //ok
    Game.specialTab = 'santa';
    Game.UpgradeSanta();
    Game.ToggleSpecialMenu();
}

function dragonStats() { //more work needed, check for needed buildings,calculate real efficency
    return Game.Has('A crumbly egg') && (Game.dragonLevel + 1 < Game.dragonLevels.length) ? {
        id: 998,
        efficiency: 1,
        base_delta_cps: 0,
        delta_cps: 0,
        cost: singleDragonCost(Game.dragonLevel),
        type: 'dragon',
        purchase: {
            id: 998,
            name: 'Dragon Upgrade ' + Game.dragonLevel,
            buy: buyDragon,
            getCost: function() {
                return singleDragonCost(Game.dragonLevel);
            }
        }
    } : [];
}

function buyDragon() { //ok
    Game.specialTab = 'dragon';
    Game.UpgradeDragon();
    Game.ToggleSpecialMenu();

}

function singleDragonCost(level) { //ok, cookie costs or costs to rebuy buildings for given level
    var dcost=[1000000,1000000*2,1000000*4,1000000*8,1000000*16]
	.concat(Game.ObjectsById.map(function(a) { return cumulativeBuildingCost(a.basePrice, a.amount<=100?1:a.amount-100, a.amount);}))
	.concat(Game.ObjectsById.map(function(a) { return cumulativeBuildingCost(a.basePrice, a.amount<=50?1:a.amount-50, a.amount);}).reduce(function(a,b) { return a+b;},0))
	.concat(Game.ObjectsById.map(function(a) { return cumulativeBuildingCost(a.basePrice, a.amount<=200?1:a.amount-200, a.amount);}).reduce(function(a,b) { return a+b;},0));
		
	return dcost[level];
}

function cumulativeDragonCost(level) { // ok costs for all levels needed to complete
	var sum=0;
	for (var i=level; i< Game.dragonLevels.length; i++) { sum+=singleDragonCost(i); }
    return sum;
}

function defaultPurchase() {
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

function cumulativeBuildingCost(basePrice, startingNumber, endingNumber) { //ok, fixed
    return basePrice * totalDiscount(true) * ((Math.pow(Game.priceIncrease, endingNumber) - Math.pow(Game.priceIncrease, startingNumber)) / (Game.priceIncrease - 1));
}

function upgradePrereqCost(upgrade) { //ok, calculate cost for upgrade
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

function unfinishedUpgradePrereqs(upgrade) { //looks ok, unsure about wrinklers
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
        if (prereqs.wrinklers && Game.elderWrath == 0) { needed.push({type: 'wrinklers',id: 0});}
    }
    return needed.length ? needed : null;
}

function upgradeToggle(upgrade, achievements, reverseFunctions) { //tut so als würde ein upgrade gekauft
    if (!achievements) {
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
                                reverseFunctions: upgradeToggle(upgrade)
                            });
                        }
                    });
                }
            }
        }
        upgrade.bought = 1;
        Game.UpgradesOwned += 1;
        reverseFunctions.current = buyFunctionToggle(upgrade);
    } else {
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
                upgradeToggle(upgrade, [], u.reverseFunctions);
            });
        }
        upgrade.bought = 0;
        Game.UpgradesOwned -= 1;
        buyFunctionToggle(reverseFunctions.current);
        Game.AchievementsOwned = 0;
        achievements.forEach(function(won, index) {
            var achievement = Game.AchievementsById[index];
            achievement.won = won;
            if (won && achievement.pool != 'shadow') {
                Game.AchievementsOwned += 1;
            }
        });
    }
    Game.recalculateGains = 1;
    Game.CalculateGains();
    return reverseFunctions;
}

function buildingToggle(building, achievements) { //tut so als würde ein building gekauft
    if (!achievements) {
        building.amount += 1;
        building.bought += 1;
        Game.BuildingsOwned += 1;
    } else {
        building.amount -= 1;
        building.bought -= 1;
        Game.BuildingsOwned -= 1;
        Game.AchievementsOwned = 0;
        achievements.forEach(function(won, index) {
            var achievement = Game.AchievementsById[index];
            achievement.won = won;
            if (won && achievement.pool != 'shadow') {
                Game.AchievementsOwned += 1;
            }
        });
    }
    Game.recalculateGains = 1;
    Game.CalculateGains();
}

function buyFunctionToggle(upgrade) {
    if (upgrade && upgrade.id==452) return null;
    if (upgrade && !upgrade.length) {
        if (!upgrade.buyFunction) {
            return null;
        }

        var ignoreFunctions = [
            /Game\.Earn\('.*\)/,
            /Game\.Lock\('.*'\)/,
            /Game\.Unlock\(.*\)/,
            /Game\.Objects\['.*'\]\.drawFunction\(\)/,
            /Game\.Objects\['.*'\]\.redraw\(\)/,
            /Game\.SetResearch\('.*'\)/,
            /Game\.Upgrades\['.*'\]\.basePrice=.*/,
            /Game\.CollectWrinklers\(\)/,
            /Game\.RefreshBuildings\(\)/,
            /Game\.storeToRefresh=1/,
            /Game\.upgradesToRebuild=1/,
            /Game\.Popup\(.*\)/,
            /Game\.Notify\(.*\)/,
            /var\s+.+\s*=.+/,
            /Game\.computeSeasonPrices\(\)/,
            /Game\.seasonPopup\.reset\(\)/,
            /\S/
        ];
        var buyFunctions = upgrade.buyFunction.toString()
            .replace(/[\n\r\s]+/g, ' ')
            .replace(/function\s*\(\)\s*{(.+)\s*}/, "$1")
            .replace(/for\s*\(.+\)\s*\{.+\}/, '')
            .replace(/if\s*\(this\.season\)\s*Game\.season=this\.season\;/, ('Game.season="' + upgrade.season + '";'))
            .replace(/if\s*\(.+\)\s*[^{}]*?\;/, '')
            .replace(/if\s*\(.+\)\s*\{.+\}/, '')
            .replace(/else\s+\(.+\)\s*\;/, '')
            .replace('++', '+=1')
            .replace('--', '-=1')
            .split(';')
            .map(function(a) {
                return a.trim();
            })
            .filter(function(a) {
                ignoreFunctions.forEach(function(b) {
                    a = a.replace(b, '')
                });
                return a != '';
            });

        if (buyFunctions.length == 0) {
            return null;
        }

        var reversedFunctions = buyFunctions.map(function(a) {
            var reversed = '';
            var achievementMatch = /Game\.Win\('(.*)'\)/.exec(a);
            if (a.indexOf('+=') > -1) {
                reversed = a.replace('+=', '-=');
            } else if (a.indexOf('-=') > -1) {
                reversed = a.replace('-=', '+=');
            } else if (achievementMatch && Game.Achievements[achievementMatch[1]].won == 0) {
                reversed = 'Game.Achievements[\'' + achievementMatch[1] + '\'].won=0';
            } else if (a.indexOf('=') > -1) {
                var expression = a.split('=');
                var expressionResult = eval(expression[0]);
                var isString = _.isString(expressionResult);
                reversed = expression[0] + '=' + (isString ? "'" : '') + expressionResult + (isString ? "'" : '');
            }
            return reversed;
        });
        buyFunctions.forEach(function(f) {
            eval(f);
        });
        return reversedFunctions;
    } else if (upgrade && upgrade.length) {
        upgrade.forEach(function(f) {
            eval(f);
        });
    }
    return null;
}

function updateCaches() {
    var recommendation, currentBank, targetBank, currentCookieCPS, currentUpgradeCount;
    var recalcCount = 0;
    do {
        recommendation = nextPurchase(FrozenCookies.recalculateCaches);
        FrozenCookies.recalculateCaches = false;
        currentBank = bestBank(0);
        targetBank = bestBank(recommendation.efficiency);
        currentCookieCPS = gCps(cookieValue(currentBank.cost));
        currentUpgradeCount = Game.UpgradesInStore.length;
        FrozenCookies.safeGainsCalc();

        if (FrozenCookies.lastCPS != FrozenCookies.calculatedCps) {
            FrozenCookies.recalculateCaches = true;
            FrozenCookies.lastCPS = FrozenCookies.calculatedCps;
        }

        if (FrozenCookies.currentBank.cost != currentBank.cost) {
            FrozenCookies.recalculateCaches = true;
            FrozenCookies.currentBank = currentBank;
        }

        if (FrozenCookies.targetBank.cost != targetBank.cost) {
            FrozenCookies.recalculateCaches = true;
            FrozenCookies.targetBank = targetBank;
        }

        if (FrozenCookies.lastCookieCPS != currentCookieCPS) {
            FrozenCookies.recalculateCaches = true;
            FrozenCookies.lastCookieCPS = currentCookieCPS;
        }

        if (FrozenCookies.lastUpgradeCount != currentUpgradeCount) {
            FrozenCookies.recalculateCaches = true;
            FrozenCookies.lastUpgradeCount = currentUpgradeCount;
        }
        recalcCount += 1;
    } while (FrozenCookies.recalculateCaches && recalcCount < 10);
}

//Misc functions
function logEvent(event, text, popup) {
    var time = '[' + timeDisplay((Date.now() - Game.startDate) / 1000) + ']';
    var output = time + ' ' + event + ': ' + text;
    if (FrozenCookies.logging) {
        console.log(output);
    }
    if (popup) {
        Game.Popup(text);
    }
}

function preferenceParse(setting, defaultVal) {
    var value = localStorage.getItem(setting);
    if (typeof(value) == 'undefined' || value == null || isNaN(Number(value))) {
        value = defaultVal;
        localStorage.setItem(setting, value);
    }
    return Number(value);
}

function updateLocalStorage() {
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
}

//Helper functions for Stats
function statSpeed() {
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

function transpose(a) {
    return Object.keys(a[0]).map(function(c) {
        return a.map(function(r) {
            return r[c];
        });
    });
}

function viewStatGraphs() {
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
function saveStats(fromGraph) {
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
function smartTrackingStats(delay) {
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
function fcClickCookie() {
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

//autoGodzamokBot
function autoGodzamokAction() {
    if (!T) return; //Just leave if Pantheon isn't here yet
    //Now has option to not trigger until current Devastation buff expires (i.e. won't rapidly buy & sell cursors throughout Godzamok duration)
    if (Game.hasGod('ruin') && Game.Objects['Cursor'].amount > 10 && (!Game.hasBuff('Devastation') || FrozenCookies.autoGodzamok == 1 || FrozenCookies.autoGodzamok == 3) && hasClickBuff()) {
        var count = Game.Objects['Cursor'].amount;
        Game.Objects['Cursor'].sell(count);
        if (FrozenCookies.autoGodzamok > 1) Game.Objects['Cursor'].buy(count);
    }
}

//main function
function autoCookie() {
    if (!Game.OnAscend && !Game.AscendTimer) {
		// Objectclick stats
		
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
		var currentFrenzy = (Game.hasBuff('Frenzy') ? Game.buffs['Frenzy'].multCpS : 1) * clickBuffBonus();
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
			if (hasClickBuff()){
				if (!FrozenCookies.autoFClickBot) {
					clearInterval(FrozenCookies.autoClickBot);
					FrozenCookies.autoClickBot=0;
					if (FrozenCookies.frenzyClickSpeed) {
							FrozenCookies.autoFClickBot = setInterval(fcClickCookie, 1000 / FrozenCookies.frenzyClickSpeed);
							logEvent('AutoClick', 'Clicking cookie on frency speed with  ' + FrozenCookies.frenzyClickSpeed + ' clicks per second.');
					}
				}
			}
			else {
				if (!FrozenCookies.autoClickBot) { 
					clearInterval(FrozenCookies.autoFClickBot);
					FrozenCookies.autoFClickBot=0;
					if (FrozenCookies.cookieClickSpeed) {
							FrozenCookies.autoClickBot = setInterval(fcClickCookie, 1000 / FrozenCookies.cookieClickSpeed);		
							logEvent('AutoClick', 'Clicking cookie on normal speed with  ' + FrozenCookies.cookieClickSpeed + ' clicks per second.');
					}
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
                    FrozenCookies.gcclicks++;
					var tmp=Date.now();
					FrozenCookies.gcclickstimer+=(tmp-FrozenCookies.gcclickstimerlast);
					FrozenCookies.gcclickstimerlast=tmp;
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
        
		if ((Date.now()-FrozenCookies.stime)>1000) {
		}
		// AutoGS
		if (hasClickBuff()) {
			if (Game.Upgrades['Golden switch [off]'].unlocked &&
               !Game.Upgrades['Golden switch [off]'].bought) {
				Game.Upgrades['Golden switch [off]'].buy();
			}
		} else if (cpsBonus() <= 1) {
			if (Game.Upgrades['Golden switch [on]'].unlocked &&
			   !Game.Upgrades['Golden switch [on]'].bought) {
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
        
		//shoud move to fc_button somehow
		//Automatically buy in bulk if setting turned on
        if (FrozenCookies.autoBulk != 0){
            if (FrozenCookies.autoBulk == 1){ //Buy x10
                document.getElementById('storeBulk10').click();
            }
            if (FrozenCookies.autoBulk == 2){ //Buy x100
                document.getElementById('storeBulk100').click();
            }
        }         

//        shoud move to fc_button somehow
//        var fps_amounts = ['24', '25', '30', '48', '50', '60', '72', '90', '100', '120', '144', '200', '240', '300'];
//        if (parseInt(fps_amounts[FrozenCookies["fpsModifier"]]) != Game.fps) {
//            Game.fps = parseInt(fps_amounts[FrozenCookies["fpsModifier"]]);
//        }
        
		// Yeah, buy some stuff
		updateCaches();
        var recommendation = nextPurchase();
        var delay = delayAmount(); //save cookies for bank
     
//       if (FrozenCookies.autoBuy && 
//		((Game.cookies >= delay + recommendation.cost) || recommendation.purchase.name == "Elder Pledge") &&
//		 (FrozenCookies.pastemode || isFinite(nextChainedPurchase().efficiency))) {
         if (FrozenCookies.autoBuy && (Game.cookies >= delay + recommendation.cost)) {
            recommendation.time = Date.now() - Game.startDate;
            recommendation.purchase.clickFunction = null;
            recommendation.purchase.buy();
            
			//Smart Stats
            if (FrozenCookies.trackStats == 5 && recommendation.type == 'upgrade') {
                saveStats();
            } else if (FrozenCookies.trackStats == 6) {
                FrozenCookies.delayPurchaseCount += 1;
            }
			
            logEvent('Store', 'Autobought ' + recommendation.purchase.name + ' for ' + Beautify(recommendation.cost) + ', resulting in ' + Beautify(recommendation.delta_cps) + ' more CPS.');
            
            FrozenCookies.recalculateCaches = true;
        }

		// handle autoAscend
        if (FrozenCookies.autoAscend) {
            var currPrestige = Game.prestige;
            var resetPrestige = Game.HowMuchPrestige(Game.cookiesReset + Game.cookiesEarned + wrinklerValue() + chocolateValue());
            var ascendChips = FrozenCookies.HCAscendAmount;
            if ((resetPrestige - currPrestige) >= ascendChips && ascendChips > 0) {
                Game.ClosePrompt();
                Game.Ascend(1);
                setTimeout(function() {
                    Game.ClosePrompt();
                    Game.Reincarnate(1);
                }, 10000);
            }
        }
	}
    if (FrozenCookies.frequency) {
        FrozenCookies.cookieBot = setTimeout(autoCookie, FrozenCookies.frequency);
    }
}

