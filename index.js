'use strict';

var koa = require('koa.io');
var logger = require('koa-logger');
var serve = require('koa-static');
var router = require('koa-router');
var views = require('co-views');
var path = require('path');

var app = global.app = koa();
var routes = require('./server/routes');
var comments = require('./server/comments');

app.use(function *(next) {
	var render = views('server/views', {
		default: 'jade'
	});
	this.render = render;
	yield next;
});

app.use(serve(path.join(__dirname, '/dist')));
app.use(routes.middleware());

app.io.use(function*(next) {
	// someone connected
	yield* next;
	// someone disconnected
});

var port = 3000;
var host = '0.0.0.0';

if (!module.parent) {
	app.listen(port, host, function() {
		console.log('Now listening on http://' + host + ':' + port);
	});
}

comments.getComments();
