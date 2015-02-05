'use strict';

var io = require('socket.io-client');
var socket = io('http://0.0.0.0:3000');

socket.on('comment', function(data) {
	console.log(data);
});
