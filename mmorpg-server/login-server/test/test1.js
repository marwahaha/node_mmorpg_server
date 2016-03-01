net = require('net');
var GmBuffer = require("../utils/gmBuffer");

var client = new net.Socket();

client.connect(1336, '127.0.0.1', function() {
	console.log('Connected');
});

client.on('data', function(data) {
	data = new GmBuffer(data);
	console.log('Received: ' + data.u8() + ' - ' + data.u8() + ' > ' + data.buffer);
});

client.on('close', function() {
	console.log('Connection closed');
});


setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(2);//signup
	buff.wstr('Snabel');
	buff.wstr('asfgsa');
	buff.wstr('email');
	client.write(buff.getBuffer());
},1000);

setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(1);//Login
	buff.wstr('Snabel');
	buff.wstr('test');
	client.write(buff.getBuffer());
},2000);

setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(3);//logout
	buff.wstr('Snabel');
	buff.wstr('test');
	client.write(buff.getBuffer());
},3000);

setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(1);//Login
	buff.wstr('Snabel');
	buff.wstr('test');
	client.write(buff.getBuffer());
},4000);

setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(4);//Add char
	buff.wstr('SnabelChar4');
	client.write(buff.getBuffer());
},5000);

setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(5);//Remove char
	buff.wu32(9);
	client.write(buff.getBuffer());
},6000);

setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(6);//Get char
	buff.wu32(7);
	client.write(buff.getBuffer());
},7000);

setTimeout(function(){
	var buff = new GmBuffer(256);
	buff.wu8(7);//Auth char (start game)
	buff.wu32(7);
	client.write(buff.getBuffer());
},8000);