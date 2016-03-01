var Redis = require("redis");
var GmBuffer = require("./utils/gmBuffer");

function Client(socket) {
	this.socket = socket;
	this.name = socket.remoteAddress + ":" + socket.remotePort
	this.redis = Redis.createClient();
	this.user = null;
	this.log("join");
};

Client.prototype.onMessage = function(mess) {
	//this.log("Mess: " + mess);
	mess = new GmBuffer(mess);
	switch(mess.u8()) {
		case 0://Ping
		break;

		case 1://Login
		this.login(mess.str(), mess.str());
		break;

		case 2://Signup
		this.signup(mess.str(), mess.str(), mess.str());
		break;

		case 3://Logout
		this.logout();
		break;

		case 4://Add char
		this.addCharacter(mess.str());
		break;

		case 5://Remove char
		this.removeCharacter(mess.u32());
		break;

		case 6://Get char data
		this.getCharacters(mess.u32());
		break;

		case 7://Auth char
		this.authCharacter(mess.u32());
		break;
	}
};

Client.prototype.onError = function(e) {
	this.log("Error: " + e);
	this.socket.destroy();
};

Client.prototype.onTimeout = function() {
	this.log("Timeout");
	this.socket.end();
};

Client.prototype.onEnd = function() {
	this.log("end");
};

Client.prototype.dispose = function() {
	this.redis.quit();
	this.log("quit");
};

Client.prototype.log = function(mess) {
	console.log(this.name + "> " + mess);
};

Client.prototype.send = function(gmBuffer) {
	this.socket.write(gmBuffer.getBuffer());
};

Client.prototype.login = function(username, password) {

	var loginGetUser = function(err, userId) {
		if (err) {//internal error
			this.log('Login error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(1);
			buff.wu8(2);
			this.send(buff);
			return
		}

		if (userId == null) {//User did not exist
			var buff = new GmBuffer(64);
			buff.wu8(1);
			buff.wu8(3);
			this.send(buff);
			return
		}

		this.redis.mget(
			"U:" + userId + ":id",
			"U:" + userId + ":name",
			"U:" + userId + ":pass", 
			"U:" + userId + ":char1", 
			"U:" + userId + ":char2", 
			"U:" + userId + ":char3", 
			loginAuth.bind(this));
	};

	var loginAuth = function(err, user) {
		if (err) {//internal error
			this.log('Login error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(1);
			buff.wu8(2);
			this.send(buff);
			return
		}

		if (password != user[2]) {//Password does not match
			var buff = new GmBuffer(64);
			buff.wu8(1);
			buff.wu8(4);
			this.send(buff);
			return
		}

		//Successful Login
		this.user = {
			id: user[0],
			name: user[1],
			char: [
				user[3],
				user[4],
				user[5]
			]
		};

		var buff = new GmBuffer(256);
		buff.wu8(1);
		buff.wu8(0);
		buff.wu32(this.user.id);
		buff.wstr(this.user.name);
		buff.wu32(this.user.char[0]);
		buff.wu32(this.user.char[1]);
		buff.wu32(this.user.char[2]);
		this.send(buff);

		this.getCharacters(this.user.char);//Send character data to client

		this.log('Login as '+this.user.name+'('+this.user.id+')');
	};

	if (this.user) {//Already logged in
		var buff = new GmBuffer(64);
		buff.wu8(1);
		buff.wu8(1);
		this.send(buff);
		return
	}
	
	this.redis.get("Un:" + username.toLowerCase(), loginGetUser.bind(this));
};

Client.prototype.signup = function(username, password, email) {

	var signupReply = function(err, existingUser) {
		if (err) {//internal error
			this.log('Signup error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(2);
			buff.wu8(2);
			this.send(buff);
			return
		}

		if (existingUser) {//Username taken
			var buff = new GmBuffer(64);
			buff.wu8(2);
			buff.wu8(3);
			this.send(buff);
			return
		}

		this.redis.incr("Uid", signupDo.bind(this));
	};

	var signupDo = function(err, userId) {
		if (err) {//internal error
			this.log('Signup error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(2);
			buff.wu8(2);
			this.send(buff);
			return
		}

		this.redis.mset("U:" + userId + ":id", userId,
			"U:" + userId + ":name", username,
			"U:" + userId + ":pass", password,
			"U:" + userId + ":email", email,
			"Un:" + username.toLowerCase(), userId,
			signupSuccess.bind(this)
		);
	};

	var signupSuccess = function(err) {
		if (err) {//internal error
			this.log('Signup error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(2);
			buff.wu8(2);
			this.send(buff);
			return
		}

		//Success
		this.log('New user "' + username + '"');
		var buff = new GmBuffer(64);
		buff.wu8(2);
		buff.wu8(0);
		this.send(buff);

	};

	if (this.user) {//Already logged in
		var buff = new GmBuffer(64);
		buff.wu8(2);
		buff.wu8(1);
		this.send(buff);
		return
	}

	this.redis.get("Un:" + username.toLowerCase(), signupReply.bind(this));
};

Client.prototype.logout = function() {
	if (!this.user) {//Not logged in
		var buff = new GmBuffer(64);
		buff.wu8(3);
		buff.wu8(1);
		this.send(buff);
	}

	this.log('Logout user ' + this.user.name + "(" + this.user.id + ")");
	this.user = null;
	var buff = new GmBuffer(64);
	buff.wu8(3);
	buff.wu8(0);
	this.send(buff);
};

Client.prototype.addCharacter = function(charName) {

	var addCharacterCheck = function(err, existingChar) {
		if (err) {//internal error
			this.log('Add character error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(4);
			buff.wu8(3);
			this.send(buff);
			return
		};

		if (existingChar) {//CharacterName taken
			var buff = new GmBuffer(64);
			buff.wu8(4);
			buff.wu8(4);
			this.send(buff);
			return
		};

		this.redis.incr("Cid", addCharacterDo.bind(this));
	};

	var addCharacterDo = function(err, charId) {
		if (err) {//internal error
			this.log('Add character error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(4);
			buff.wu8(3);
			this.send(buff);
			return
		};

		var slot = 1;
		if (this.user.char[0]) {
			slot = 2;
			if (this.user.char[1]) slot = 3;
		}

		this.user.char[slot - 1] = charId;

		this.redis.mset("U:" + this.user.id + ":char" + slot, charId,
			"Cn:" + charName.toLowerCase(), charId,
			"C:" + charId + ":id", charId,
			"C:" + charId + ":name", charName,
			addCharacterSuccess.bind(this)
		);
	};

	var addCharacterSuccess = function(err) {
		if (err) {//internal error
			this.log('Add character error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(4);
			buff.wu8(3);
			this.send(buff);
			return
		};

		//Success
		this.log('New character');

		var buff = new GmBuffer(64);
		buff.wu8(4);
		buff.wu8(0);
		this.send(buff);
	};

	if (!this.user) {//Not logged in
		var buff = new GmBuffer(64);
		buff.wu8(4);
		buff.wu8(1);
		this.send(buff);
		return
	}

	if (this.user.char[0] && this.user.char[1] && this.user.char[2]) {//No slots available
		var buff = new GmBuffer(64);
		buff.wu8(4);
		buff.wu8(2);
		this.send(buff);
		return
	}

	this.redis.get("Cn:" + charName.toLowerCase(), addCharacterCheck.bind(this));
};

Client.prototype.removeCharacter = function(charId) {

	var removeCharacterDo = function(err, charName) {
		if (err) {//internal error
			this.log('Remove character error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(5);
			buff.wu8(3);
			this.send(buff);
			return
		};

		this.redis.del(
			"Cn:" + charName.toLowerCase(), 
			"U:" + this.user.id + ":char" + (this._charId + 1),
			removeCharacterSuccess.bind(this)
		);
	}

	var removeCharacterSuccess = function(err) {
		this.log('Deleted char');
		var buff = new GmBuffer(64);
		buff.wu8(5);
		buff.wu8(0);
		this.send(buff);
	};
	
	if (!this.user) {//Not logged in
		var buff = new GmBuffer(64);
		buff.wu8(5);
		buff.wu8(1);
		this.send(buff);
		return
	}

	this._charId = -1;
	if (this.user.char[0] == charId) this._charId = 0;
	if (this.user.char[1] == charId) this._charId = 1;
	if (this.user.char[2] == charId) this._charId = 2;


	if (this._charId == -1) {//UserId not found
		var buff = new GmBuffer(64);
		buff.wu8(5);
		buff.wu8(2);
		this.send(buff);
		return
	}

	this.redis.get("C:" + charId + ":name", removeCharacterDo.bind(this));
};

Client.prototype.getCharacters = function(charId) {

	var getCharactersSend = function(charId) {
		this.redis.mget(
			"C:" + charId + ":id",
			"C:" + charId + ":name",
			getCharactersReply.bind(this)
		);
	};

	var getCharactersReply = function(err, charData) {
		if (err) {//internal error
			this.log('Login error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(6);
			buff.wu8(2);
			this.send(buff);
			return
		}

		var buff = new GmBuffer(64);
		buff.wu8(6);
		buff.wu8(0);
		buff.wu32(charData[0]);//Id
		buff.wstr(charData[1]);//Name
		this.send(buff);
	};

	if (!this.user) {//Not logged in
		var buff = new GmBuffer(64);
		buff.wu8(6);
		buff.wu8(1);
		this.send(buff);
		return
	}

	if (!Array.isArray(charId)) {
		charId = [charId];
	};

	for (var i = 0; i < charId.length; i++){
		if (this.user.char[0] == charId[i] || this.user.char[1] == charId[i] || this.user.char[2] == charId[i]) {
			setTimeout(getCharactersSend.bind(this, charId[i]), 100 * i);
			//This is to prevent the async function from writing multiple messages to the client
		}else {
			var buff = new GmBuffer(64);
			buff.wu8(6);
			buff.wu8(3);
			this.send(buff);
		}
	}
};

Client.prototype.authCharacter = function(charId) {

	var authCharacterSuccess = function(err) {
		if (err) {//internal error
			this.log('Auth char error: '+err);
			var buff = new GmBuffer(64);
			buff.wu8(7);
			buff.wu8(2);
			this.send(buff);
			return
		};

		var buff = new GmBuffer(64);
		buff.wu8(7);
		buff.wu8(0);
		buff.wstr(this._session);
		this.send(buff);
	};
	
	if (!this.user) {//Not logged in
		var buff = new GmBuffer(64);
		buff.wu8(7);
		buff.wu8(1);
		this.send(buff);
		return
	};

	if (this.user.char[0] != charId && this.user.char[1] != charId && this.user.char[2] != charId) {
		var buff = new GmBuffer(64);
		buff.wu8(7);
		buff.wu8(3);
		this.send(buff);
	};

	this._session = this.generateSession();

	this.redis.set("C:" + charId + ":sess", this._session,
		authCharacterSuccess.bind(this)
	);
};

Client.prototype.generateSession = function() {
	var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for(var i=0; i<32; i++) {
    	text += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return text;
};

module.exports = Client;