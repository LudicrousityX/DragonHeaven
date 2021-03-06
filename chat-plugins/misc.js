/**
 * Miscellaneous commands
 */

'use strict';
/*eslint no-restricted-modules: [0]*/

let moment = require('moment');
let request = require('request');

let messages = [
	"has vanished into nothingness!",
	"used Explosion!",
	"fell into the void.",
	"went into a cave without a repel!",
	"has left the building.",
	"was forced to give StevoDuhHero's mom an oil massage!",
	"was hit by Magikarp's Revenge!",
	"ate a bomb!",
	"is blasting off again!",
	"(Quit: oh god how did this get here i am not good with computer)",
	"was unfortunate and didn't get a cool message.",
	"{{user}}'s mama accidently kicked {{user}} from the server!",
];

function clearRoom(room) {
	let len = (room.log && room.log.length) || 0;
	let users = [];
	while (len--) {
		room.log[len] = '';
	}
	for (let u in room.users) {
		users.push(u);
		Users.get(u).leaveRoom(room, Users.get(u).connections[0]);
	}
	len = users.length;
	setTimeout(function () {
		while (len--) {
			Users.get(users[len]).joinRoom(room, Users.get(users[len]).connections[0]);
		}
	}, 1000);
}

exports.commands = {
	stafflist: 'authority',
	auth: 'authority',
	authlist: 'authority',
	authority: function (target, room, user, connection) {
		let rankLists = {};
		let ranks = Object.keys(Config.groups);
		for (let u in Users.usergroups) {
			let rank = Users.usergroups[u].charAt(0);
			// In case the usergroups.csv file is not proper, we check for the server ranks.
			if (ranks.indexOf(rank) > -1) {
				let name = Users.usergroups[u].substr(1);
				if (!rankLists[rank]) rankLists[rank] = [];
				if (name) rankLists[rank].push(((Users.getExact(name) && Users.getExact(name).connected) ? '**' + name + '**' : name));
			}
		}

		let buffer = [];
		Object.keys(rankLists).sort(function (a, b) {
			return (Config.groups[b] || {rank: 0}).rank - (Config.groups[a] || {rank: 0}).rank;
		}).forEach(function (r) {
			buffer.push((Config.groups[r] ? r + Config.groups[r].name + "s (" + rankLists[r].length + ")" : r) + ":\n" + rankLists[r].sort().join(", "));
		});

		if (!buffer.length) {
			return connection.popup("This server has no auth.");
		}
		connection.popup(buffer.join("\n\n"));
	},

	clearall: function (target, room, user) {
		if (!this.can('declare')) return false;
		if (room.battle) return this.sendReply("You cannot clearall in battle rooms.");

		clearRoom(room);
	},

	gclearall: 'globalclearall',
	globalclearall: function (target, room, user) {
		if (!this.can('gdeclare')) return false;

		for (let u in Users.users) {
			Users.users[u].popup("All rooms are being clear.");
		}
		Rooms.rooms.forEach(clearRoom);
	},

	hide: function (target, room, user) {
		if (!this.can('lock')) return false;
		user.hiding = true;
		user.updateIdentity();
		this.sendReply("You have hidden your staff symbol.");
	},

	rk: 'kick',
	roomkick: 'kick',
	kick: function (target, room, user) {
		if (!target) return this.parse('/help kick');
		if (!this.canTalk() && !user.can('bypassall')) {
			return this.sendReply("You cannot do this while unable to talk.");
		}

		target = this.splitTarget(target);
		let targetUser = this.targetUser;
		if (!targetUser || !targetUser.connected) return this.sendReply("User \"" + this.targetUsername + "\" not found.");
		if (!this.can('mute', targetUser, room)) return false;

		this.addModCommand(targetUser.name + " was kicked from the room by " + user.name + ".");
		targetUser.popup("You were kicked from " + room.id + " by " + user.name + ".");
		targetUser.leaveRoom(room.id);
	},
	kickhelp: ["/kick - Kick a user out of a room. Requires: % @ # & ~"],

	masspm: 'pmall',
	pmall: function (target, room, user) {
		if (!this.can('pmall')) return false;
		if (!target) return this.parse('/help pmall');

		let pmName = ' Server PM [Do not reply]';

		Users.users.forEach(function (user) {
			let message = '|pm|' + pmName + '|' + user.getIdentity() + '|' + target;
			user.send(message);
		});
	},
	pmallhelp: ["/pmall [message] - PM all users in the server."],

	staffpm: 'pmallstaff',
	pmstaff: 'pmallstaff',
	pmallstaff: function (target, room, user) {
		if (!this.can('forcewin')) return false;
		if (!target) return this.parse('/help pmallstaff');

		let pmName = ' Staff PM [Do not reply]';

		Users.users.forEach(function (user) {
			if (!user.isStaff) return;
			let message = '|pm|' + pmName + '|' + user.getIdentity() + '|' + target;
			user.send(message);
		});
	},
	pmallstaffhelp: ["/pmallstaff [message] - Sends a PM to every staff member online."],

	d: 'poof',
	cpoof: 'poof',
	poof: function (target, room, user) {
		if (Config.poofOff) return this.sendReply("Poof is currently disabled.");
		if (target && !this.can('broadcast')) return false;
		if (room.id !== 'lobby') return false;
		let message = target || messages[Math.floor(Math.random() * messages.length)];
		if (message.indexOf('{{user}}') < 0) message = '{{user}} ' + message;
		message = message.replace(/{{user}}/g, user.name);
		if (!this.canTalk(message)) return false;

		let colour = '#' + [1, 1, 1].map(function () {
			let part = Math.floor(Math.random() * 0xaa);
			return (part < 0x10 ? '0' : '') + part.toString(16);
		}).join('');

		room.addRaw("<strong><font color=\"" + colour + "\">~~ " + Chat.escapeHTML(message) + " ~~</font></strong>");
		user.disconnectAll();
	},
	poofhelp: ["/poof - Disconnects the user and leaves a message in the room."],

	poofon: function () {
		if (!this.can('poofoff')) return false;
		Config.poofOff = false;
		return this.sendReply("Poof is now enabled.");
	},
	poofonhelp: ["/poofon - Enable the use /poof command."],

	nopoof: 'poofoff',
	poofoff: function () {
		if (!this.can('poofoff')) return false;
		Config.poofOff = true;
		return this.sendReply("Poof is now disabled.");
	},
	poofoffhelp: ["/poofoff - Disable the use of the /poof command."],

	regdate: function (target, room, user) {
		if (!this.runBroadcast()) return;
		if (!target || !toId(target)) return this.parse('/help regdate');
		let username = toId(target);
		request('http://pokemonshowdown.com/users/' + username, function (error, response, body) {
			if (error && response.statusCode !== 200) {
				this.sendReplyBox(Chat.escapeHTML(target) + " is not registered.");
				return room.update();
			}
			let regdate = body.split('<small>')[1].split('</small>')[0].replace(/(<em>|<\/em>)/g, '');
			if (regdate === '(Unregistered)') {
				this.sendReplyBox(Chat.escapeHTML(target) + " is not registered.");
			} else if (regdate === '(Account disabled)') {
				this.sendReplyBox(Chat.escapeHTML(target) + "'s account is disabled.");
			} else {
				this.sendReplyBox(Chat.escapeHTML(target) + " was registered on " + regdate.slice(7) + ".");
			}
			room.update();
		}.bind(this));
	},
	regdatehelp: ["/regdate - Please specify a valid username."],

	show: function (target, room, user) {
		if (!this.can('lock')) return false;
		user.hiding = false;
		user.updateIdentity();
		this.sendReply("You have revealed your staff symbol.");
	},

	sb: 'showdownboilerplate',
	showdownboilerplate: function (target, room, user) {
		if (!this.runBroadcast()) return;
		this.sendReply("|raw|This server uses <a href='https://github.com/CreaturePhil/Showdown-Boilerplate'>Showdown-Boilerplate</a>.");
	},
	showdownboilerplatehelp: ["/showdownboilerplate - Links to the Showdown-Boilerplate repository on Github."],

	seen: function (target, room, user) {
		if (!this.runBroadcast()) return;
		if (!target) return this.parse('/help seen');
		let targetUser = Users.get(target);
		if (targetUser && targetUser.connected) return this.sendReplyBox(targetUser.name + " is <b>currently online</b>.");
		target = Chat.escapeHTML(target);
		let seen = Db.seen.get(toId(target));
		if (!seen) return this.sendReplyBox(target + " has never been online on this server.");
		this.sendReplyBox(target + " was last seen <b>" + moment(seen).fromNow() + "</b>.");
	},
	seenhelp: ["/seen - Shows when the user last connected on the server."],
	ytmusic: "music",
	music: function (target, room, user, connection, cmd) {
		if (!target) return this.parse('/help music');
		if (!this.runBroadcast()) return;
		let musick = Chat.escapeHTML(target.trim());
		if(cmd=="ytmusic")
		{
			if(musick.substring(0,8)=="https://") musick = musick.substring(7,musick.length);
			if(musick.substring(0,7)=="http://") musick = musick.substring(6,musick.length);
			this.sendReplyBox('<audio  style="width: 99.6%;border: 6px solid #F74823; color:green;" controls="" src="http://www.youtubeinmp3.com/fetch/?video='+musick+'" >Your user agent does not support the HTML5 Audio element.</audio>');
			return;
		}
		this.sendReplyBox('<audio  style="width: 99.6%" controls="" src="'+target+'" border: 5px solid #E9DF15; background-color:Blue">Your user agent does not support the HTML5 Audio element.</audio>');
	},
	musichelp: ["/music <mp3 link>: Shows a box which can play mp3 music."],
distor: function (target, room, user, connection, cmd) {
	if (!this.runBroadcast()) return;
	this.sendReplyBox('<div class="message"><ul class="utilichart"><li class="result"><span class="col numcol"><b>Istor</b></span> <span class="col iconcol"><span style="background:transparent url(//play.pokemonshowdown.com/sprites/smicons-sheet.png?a1) no-repeat scroll -40px -2430px"></span></span> <span class="col pokemonnamecol" style="white-space:nowrap"><a href="https://github.com/XpRienzo/DragonHeaven/blob/master/mods/aurora/README.md" target="_blank">Yddraig</a></span> <span class="col typecol"><img src="//play.pokemonshowdown.com/sprites/types/Dragon.png" alt="Dragon" height="14" width="32"></span> <span style="float:left;min-height:26px"><span class="col abilitycol">Infernal Scales / Shed Skin</span><span class="col abilitycol"></span></span><span style="float:left;min-height:26px"><span class="col statcol"><em>HP</em><br>60</span> <span class="col statcol"><em>Atk</em><br>60</span> <span class="col statcol"><em>Def</em><br>55</span> <span class="col statcol"><em>SpA</em><br>75</span> <span class="col statcol"><em>SpD</em><br>55</span> <span class="col statcol"><em>Spe</em><br>85</span> <span class="col bstcol"><em>BST<br>390</em></span> </span></li><li style="clear:both"></li></ul></div>');	
	
	},
	tell: function (target, room, user, connection) {
		if (!target) return this.parse('/help tell');
		target = this.splitTarget(target);
		let targetUser = this.targetUser;
		if (!target) {
			this.sendReply("You forgot the comma.");
			return this.parse('/help tell');
		}

		if (targetUser && targetUser.connected) {
			return this.parse('/pm ' + this.targetUsername + ', ' + target);
		}

		if (user.locked) return this.popupReply("You may not send offline messages when locked.");
		if (target.length > 255) return this.popupReply("Your message is too long to be sent as an offline message (>255 characters).");

		if (Config.tellrank === 'autoconfirmed' && !user.autoconfirmed) {
			return this.popupReply("You must be autoconfirmed to send an offline message.");
		} else if (!Config.tellrank || Config.groupsranking.indexOf(user.group) < Config.groupsranking.indexOf(Config.tellrank)) {
			return this.popupReply("You cannot send an offline message because offline messaging is " +
				(!Config.tellrank ? "disabled" : "only available to users of rank " + Config.tellrank + " and above") + ".");
		}

		let userid = toId(this.targetUsername);
		if (userid.length > 18) return this.popupReply("\"" + this.targetUsername + "\" is not a legal username.");

		let sendSuccess = Tells.addTell(user, userid, target);
		if (!sendSuccess) {
			if (sendSuccess === false) {
				return this.popupReply("User " + this.targetUsername + " has too many offline messages queued.");
			} else {
				return this.popupReply("You have too many outgoing offline messages queued. Please wait until some have been received or have expired.");
			}
		}
		return connection.send('|pm|' + user.getIdentity() + '|' +
			(targetUser ? targetUser.getIdentity() : ' ' + this.targetUsername) +
			"|/text This user is currently offline. Your message will be delivered when they are next online.");
	},
	tellhelp: ["/tell [username], [message] - Send a message to an offline user that will be received when they log in."],

	credits: function (target, room, user) {
		let color = require('../config/color'), hashColor = function(name, bold) {
			return (bold ? "<b>" : "") + "<font color=" + color(name) + ">" + (Users(name) && Users(name).connected && Users.getExact(name) ? Chat.escapeHTML(Users.getExact(name).name) : Chat.escapeHTML(name)) + "</font>" + (bold ? "</b>" : "");
		};
		this.popupReply("|html|" + "<font size=4><center><u><b>Dragon Heaven Credits!</b></u></center></font><br />" +
					"<u>Owner:</u><br />" +
					"- " + hashColor('Spandan', true) + " (Development)<br />" +
					"- " + hashColor('Snaquaza', true) + " (Sysadmin, Policy, Formats, Development)<br />" +
					"<br />" +
					"- " + hashColor('XpRienzo', true) + " (Founder, Sysadmin)<br />" +
										"<br />" +
					"<u>Development:</u><br />" +
					"- " + hashColor('charizard8888', true) + " (Development, Roomintros, HTML, CSS)<br/>" +
					"- " + hashColor('Nixola', true) + " (Host)<br />" +
					"<br />" +
					"<u>Contributors:</u><br />" +
					"- " + hashColor('ClassyZ', true) + " (DHSSB, Development)<br />" +
					"- " + hashColor('Eternal Mayhem', true) + " (Roomintros)<br />" +
					"- " + hashColor('LightiumZ', true) + " (Development)<br />" +
					"- " + hashColor('Ludicrousity', true) + " (Development)<br />" +
					"<br />" +
					"<u>Special Thanks:</u><br />" +
					"- Current staff team<br />" +
					"- Our regular users<br />");
	},
formc: function (target, room, user, connection, cmd) {
    if (!this.runBroadcast()) return;
    if (!target) return this.parse('/formchelp');
    if (!target) target = 'help';
    let separated = target.split("/");
	 let target1 = (("" + separated[0]).trim()).toLowerCase();
    let target2 = (("" + separated[1]).trim());
    let target3 = (("" + separated[2]).trim());
    let target4 = (("" + separated[3]).trim());
    let target5 = (("" + separated[4]).trim());
    let target6 = (("" + separated[5]).trim());
    let target7 = (("" + separated[6]).trim());
    let target8 = (("" + separated[7]).trim());
    let target9 = (("" + separated[8]).trim());
    let target10 = (("" + separated[9]).trim());
    let target11 = (("" + separated[10]).trim());
    let target12 = (("" + separated[11]).trim());
    let target13 = (("" + separated[12]).trim());
    let target14 = (("" + separated[13]).trim());
    let target15 = (("" + separated[14]));
    this.sendReplyBox('<center><button name="receive" value="|html|'+target1+': {<br>num: '+target2+',<br> species: &quot;'+target3+'&quot;,<br> baseSpecies: &quot;'+target4+'&quot;,<br> forme: &quot;'+target5+'&quot;,<br>formeLetter: &quot;'+target6+'&quot;, <br> types: [<b>&quot;'+target7+'&quot;</b>], <br>baseStats:{hp: '+target8+', atk: '+target9+', def: '+target10+', spa: '+target11+', spd: '+target12+', spe: '+target13+'},<br>abilities: {<b>'+target14+'</b>}, <br> weightkg: '+target15+', <br> }," style="background-color:black;color:aqua;font-size:36px;border: 6px solid aqua;">Generate</button></center><br><marquee direction="left"><img src="http://www.pokestadium.com/assets/img/sprites/misc/icons/charizard-mega-x.png" width="40" height="30"></marquee>');

	},
	formchelp:function (target, room, user, connection, cmd) {
	this.sendReplyBox('/formc name, Dex Num, Name, Base, Forme, Forme Letter, Types, HP, Atk, Def, SpA, SpD, Spe, Abilities, Weight <br> <b>name:</b> For the first name add no hypens so it should be like charizardmegax <br> <b>Dex Num</b> is the Dex Number <br><b>Name:</b> Now type the name as you want it to be seen in battle like Charizard-Mega-X <br> <b>Base:</b> is for the base forme which in this case is Charizard <br> <b>Forme:</b> Eternal / Alola in this case it is Mega <br> <b>Forme Letter:</b> M for Mega, E for Eternal, A for Alola <br> <b>Types:</b> If the mon is a monotyped Pokemon like Dugtrio - Ground then just type that in and move on but if it is dual typed like Megazard X type in Fire, Dragon and after getting the output make add &quot; after Fire and before Dragon (Dont do this before or the command show broken result) | It should look like this &quot;Fire&quot;, &quot;Dragon&quot; | Two of the quote marks would be already there <br> Then come the stats HP, Atk, Def, SpA, SpD, Spe <br><b>Abilties:</b> This is complex <br><b>Weight:</b> The mon&#39;s weight<br>Use / (Forwards Slash) as separator <br><br><b>Example:</b><br>/formc charizardmegax/6/Charizard-Mega-X/Charizard/Mega/M/Fire, Dragon/78/130/111/130/85/100/0: Tough Claws/110.5 <br><br>Hit Generate and we&#39;re good!<br>Contact <b><font color=#FFA000>charizard8888</font></b> or <b><font color=#AC33D1>Ludicrousity</font></b> for more info!');
},

monc: function (target, room, user, connection, cmd) {
    if (!this.runBroadcast()) return;
    if (!target) return this.parse('/monchelp');
    if (!target) target = 'help';
    let separated = target.split("/");
	 let target1 = (("" + separated[0]).trim()).toLowerCase();
    let target2 = (("" + separated[1]).trim());
    let target3 = (("" + separated[2]).trim());
    let target4 = (("" + separated[3]).trim());
    let target5 = (("" + separated[4]).trim());
    let target6 = (("" + separated[5]).trim());
    let target7 = (("" + separated[6]).trim());
    let target8 = (("" + separated[7]).trim());
    let target9 = (("" + separated[8]).trim());
    let target10 = (("" + separated[9]).trim());
    let target11 = (("" + separated[10]).trim());
    let target12 = (("" + separated[11]).trim());
    let target13 = (("" + separated[12]).trim());
    let target14 = (("" + separated[13]).trim());
    let target15 = (("" + separated[14]));
    this.sendReplyBox('<center><button name="receive" value="|html|'+target1+': {<br>num: '+target2+',<br> species: &quot;'+target3+'&quot;,<br> types: [<b>&quot;'+target4+'&quot;</b>], <br>baseStats:{hp: '+target5+', atk: '+target6+', def: '+target7+', spa: '+target8+', spd: '+target9+', spe: '+target10+'},<br>abilities: {<b>'+target11+'</b>}, <br> weightkg: '+target12+', <br> }," style="background-color:black;color:aqua;font-size:36px;border: 6px solid aqua;">Generate</button></center><br><marquee direction="left"><img src="http://www.pokestadium.com/assets/img/sprites/misc/icons/charizard-mega-x.png" width="40" height="30"></marquee>');

	},
monchelp:function (target, room, user, connection, cmd) {
	this.sendReplyBox('/monc name, Dex Num, Name, Types, HP, Atk, Def, SpA, SpD, Spe, Abilities, Weight <br> <b>name:</b> For the first name add no hypens so it should be like charizard <br> <b>Dex Num</b> is the Dex Number <br><b>Name:</b> Now type the name as you want it to be seen in battle like Charizard <br><b>Types:</b> If the mon is a monotyped Pokemon like Dugtrio - Ground then just type that in and move on but if it is dual typed like Zard type in Fire, Flying and after getting the output make add &quot; after Fire and before Flying (Dont do this before or the command show broken result) | It should look like this &quot;Fire&quot;, &quot;Flying&quot; | Two of the quote marks would be already there <br> Then come the stats HP, Atk, Def, SpA, SpD, Spe <br><b>Abilties:</b> This is complex <br><b>Weight:</b> The mon&#39;s weight <br>Use / (Forwards Slash) as separator <br><br><b>Example:</b><br>/monc charizard/6/Charizard/Fire, Flying/78/84/78/109/85/100/0: Blaze, H: Solar Power/90.5 <br><br>Hit Generate and we&#39;re good!<br>Contact <b><font color=#FFA000>charizard8888</font></b> or <b><font color=#AC33D1>Ludicrousity</font></b> for more info!');
},
	mfat: function (target, room, user, connection, cmd) {
    if (!this.runBroadcast()) return;
    if (!target) return this.parse('/mfathelp');
    if (!target) target = 'help';
    let separated = target.split(",");
	 let target1 = (("" + separated[0]).trim());
    let target2 = (("" + separated[0]).trim()).toLowerCase();
    let target3 = (("" + separated[1]).trim());
    let target4 = (("" + separated[2]).trim());
    let target5 = (("" + separated[3]).trim());
    let target6 = (("" + separated[4]).trim());
    let target7 = (("" + separated[5]).trim());
    let target8 = (("" + separated[6]).trim());
    let target9 = (("" + separated[7]).trim());
    let target10 = (("" + separated[8]).trim());
    let target11 = (("" + separated[9]).trim());
    let target12 = (("" + separated[10]).trim());
    let target13 = (("" + separated[11]).trim());
    let target14 = (("" + separated[12]).trim()).toUpperCase();
    let target15 = (("" + separated[13]));
    let target16 = (("" + separated[14]));
    let target17 = (("" + separated[15]));
    this.sendReplyBox('<center><button name="receive" value="|html|<a href=>pokedex.js</a><br><br>'+target2+'mega : {<br>num: '+target3+',<br> species: &quot;'+target1+'-Mega&quot;,<br> baseSpecies: &quot;'+target1+'&quot;,<br> forme: &quot;Mega&quot;,<br>formeLetter: &quot;M&quot;, <br> types: [&quot;'+target4+'&quot;, &quot;'+target5+'&quot;], <br>baseStats:{hp: '+target6+', atk: '+target7+', def: '+target8+', spa: '+target9+', spd: '+target10+', spe: '+target11+'},<br>abilities: {0: &quot;'+target12+'&quot;}, <br> weightkg: '+target13+', <br> };<br><br><a href=>items.js</a><br><br>&quot;'+target1+'ite: {<br>id:&quot;'+target1+'ite&quot;, <br>name:&quot;'+target2+'ite&quot;,<br>megaStone: &quot;'+target1+'-Mega&quot;, <br> megaEvolves: &quot;'+target1+'&quot;,<br>onTakeItem: function (item, source) {<br>if (item.megaEvolves === source.baseTemplate.baseSpecies) return false;<br>return true;<br>},<br>gen: 6,<br>desc: &quot;If holder is a '+target1+', this item allows it to Mega Evolve in battle.&quot;,<br>}, <br><br><a href=>formats-data.js</a><br><br>'+target2+'mega: {<br>randomBattleMoves: [&quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;,], <br>randomDoubleBattleMoves: [&quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;,],<br>requiredItem: &quot;'+target2+'ite&quot;,<br>tier: &quot;'+target14+'&quot;,<br>}, <br><br><a href=>learnsets.js</a><br>'+target2+': {learnset: {<br>'+target15+': [&quot;7L1&quot;],<br>'+target16+': [&quot;7L1&quot;], <br> '+target17+': [&quot;7L1&quot;,]<br>}},,<br><br><a href=http://jsbeautifier.org/>jsbeautifier</a>" style="background-color:black;color:aqua;font-size:36px;border: 6px solid aqua;"><img src="http://play.pokemonshowdown.com/sprites/xyani/marshadow.gif" width="43" height="63">Generate<img src="http://play.pokemonshowdown.com/sprites/xyani/marshadow.gif" width="43" height="63"></button></center><br><marquee direction="left"><img src="http://www.pokestadium.com/assets/img/sprites/misc/icons/charizard-mega-x.png" width="40" height="30"></marquee>');

	},
	mfathelp:function (target, room, user, connection, cmd) {
	this.sendReplyBox('/mfat Pokemon, Dex#, Type 1, Type 2, HP, Atk, Def, SpA, SpD, Spe, Ability, Weight, Tier, New Move 1, New Move 2, New Move 3');
},
mfam: function (target, room, user, connection, cmd) {
    if (!this.runBroadcast()) return;
    if (!target) return this.parse('/mfamhelp');
    if (!target) target = 'help';
    let separated = target.split(",");
	 let target1 = (("" + separated[0]).trim());
    let target2 = (("" + separated[0]).trim()).toLowerCase();
    let target3 = (("" + separated[1]).trim());
    let target4 = (("" + separated[2]).trim());
    let target5 = (("" + separated[3]).trim());
    let target6 = (("" + separated[4]).trim());
    let target7 = (("" + separated[5]).trim());
    let target8 = (("" + separated[6]).trim());
    let target9 = (("" + separated[7]).trim());
    let target10 = (("" + separated[8]).trim());
    let target11 = (("" + separated[9]).trim());
    let target12 = (("" + separated[10]).trim());
    let target13 = (("" + separated[11]).trim()).toUpperCase();
    let target14 = (("" + separated[12]).trim());
    let target15 = (("" + separated[13]).trim());
    let target16 = (("" + separated[14]).trim());
    this.sendReplyBox('<center><button name="receive" value="|html|<a href=>pokedex.js</a><br><br>'+target2+'mega : {<br>num: '+target3+',<br> species: &quot;'+target1+'-Mega&quot;,<br> baseSpecies: &quot;'+target1+'&quot;,<br> forme: &quot;Mega&quot;,<br>formeLetter: &quot;M&quot;, <br> types: [&quot;'+target4+'&quot;], <br>baseStats:{hp: '+target5+', atk: '+target6+', def: '+target7+', spa: '+target8+', spd: '+target9+', spe: '+target10+'},<br>abilities: {0: &quot;'+target11+'&quot;}, <br> weightkg: '+target12+', <br> };<br><br><a href=>items.js</a><br><br>&quot;'+target1+'ite: {<br>id:&quot;'+target1+'ite&quot;, <br>name:&quot;'+target2+'ite&quot;,<br>megaStone: &quot;'+target1+'-Mega&quot;, <br> megaEvolves: &quot;'+target1+'&quot;,<br>onTakeItem: function (item, source) {<br>if (item.megaEvolves === source.baseTemplate.baseSpecies) return false;<br>return true;<br>},<br>gen: 6,<br>desc: &quot;If holder is a '+target1+', this item allows it to Mega Evolve in battle.&quot;,<br>}, <br><br><a href=>formats-data.js</a><br><br>'+target2+'mega: {<br>randomBattleMoves: [&quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;,], <br>randomDoubleBattleMoves: [&quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;, &quot;&quot;,],<br>requiredItem: &quot;'+target2+'ite&quot;,<br>tier: &quot;'+target13+'&quot;,<br>},<br><br> <a href=>learnsets.js</a><br>'+target2+': {learnset: {<br>'+target14+': [&quot;7L1&quot;],<br>'+target15+': [&quot;7L1&quot;], <br> '+target16+': [&quot;7L1&quot;,]<br>}} <br><br><a href=http://jsbeautifier.org/>jsbeautifier</a>" style="background-color:black;color:aqua;font-size:36px;border: 6px solid aqua;"><img src="http://play.pokemonshowdown.com/sprites/xyani/marshadow.gif" width="43" height="63">Generate<img src="http://play.pokemonshowdown.com/sprites/xyani/marshadow.gif" width="43" height="63"></button></center><br><marquee direction="left"><img src="http://www.pokestadium.com/assets/img/sprites/misc/icons/charizard-mega-x.png" width="40" height="30"></marquee>');

	},
	mfamhelp:function (target, room, user, connection, cmd) {
	this.sendReplyBox('/mfat Pokemon, Dex#, Type, HP, Atk, Def, SpA, SpD, Spe, Ability, Weight, Tier, New Move 1, New Move 2, New Move 3');
},
};
