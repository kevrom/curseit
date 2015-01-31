'use strict';

var koa = require('koa');
var logger = require('koa-logger');
var serve = require('koa-static');
var router = require('koa-router');
var mount = require('koa-mount');
var views = require('co-views');
var path = require('path');

var routes = require('./server/routes');

var app = koa();

app.use(function *(next) {
	yield next;
});

app.use(function *(next) {
	var render = views('server/views', {
		default: 'jade'
	});
	this.render = render;
	yield next;
});

app.use(serve(path.join(__dirname, '/public')));
app.use(routes.middleware());


var port = 3000;
var host = '0.0.0.0';

if (!module.parent) {
	app.listen(port, host, function() {
		console.log('Now listening on http://' + host + ':' + port);
	});
}
