'use strict';

var koa = require('koa');
var logger = require('koa-logger');
var serve = require('koa-static');
var router = require('koa-router');
var mount = require('koa-mount');
var views = require('co-views');
var co = require('co');
var path = require('path');
var bluebird = require('bluebird');
var request = bluebird.promisifyAll(require('request'));
var FeedParser = require('feedparser');

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



function Subreddit(name) {
	this.subreddit = name;
	this.commentsUrl = 'http://www.reddit.com/r/' + name + '/comments/.json';
}

Subreddit.prototype._fetchComments = function _fetchComments() {
	return co(function*() {
		var req = yield request.getAsync(this.commentsUrl);
		var comments = yield JSON.parse(req[0].body).data.children;
		//console.log(comments);
		return comments;
	}.bind(this))
	.catch(function(err) {
		console.error(err.stack);
	});
};

var kevrom = new Subreddit('kevrom');
kevrom._fetchComments().then(function(res) {
	console.log(res);
});


var port = 3000;
var host = '0.0.0.0';

if (!module.parent) {
	app.listen(port, host, function() {
		console.log('Now listening on http://' + host + ':' + port);
	});
}
