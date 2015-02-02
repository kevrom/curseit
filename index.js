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
	this.commentsUrl = 'http://www.reddit.com/r/' + name + '/comments/.rss';
	this.comments = null;
}

Subreddit.prototype.fetchComments = function fetchComments() {
	var feedparser = bluebird.promisifyAll(new FeedParser());
	co(function*() {
		var comments = [];
		var req = yield request.getAsync(this.commentsUrl);

		feedparser.on('readable', function() {
			var stream = this;
			var meta = this.meta;
			var item;

			while (!!(item = stream.read())) {
				comments.push(item.summary);
			}
		});

		yield feedparser.writeAsync(req[0].body);
		return yield comments;
	}.bind(this))
	.then(function(res) {
		this.comments = res;
	}.bind(this))
	.catch(function(err) {
		console.error(err.stack);
	});
};

var kevrom = new Subreddit('kevrom');
kevrom.fetchComments();


var port = 3000;
var host = '0.0.0.0';

if (!module.parent) {
	app.listen(port, host, function() {
		console.log('Now listening on http://' + host + ':' + port);
	});
}
