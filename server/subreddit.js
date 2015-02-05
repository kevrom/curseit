'use strict';

var app = global.app;
var co = require('co');
var bluebird = require('bluebird');
var request = bluebird.promisifyAll(require('request'));
var r = require('rethinkdbdash')({ db: 'curseit' });

function _fetchComments(subreddit, url) {
	return co(function*() {
		var req = yield request.getAsync(url);
		var raw = yield JSON.parse(req[0].body).data.children;
		var comments = raw.map(function(c) {
			return c.data;
		});
		yield r.table(subreddit).insert(comments);
		return comments;
	}.bind(this))
	.catch(function(err) {
		console.error(err.stack);
	});
}

function _watchChanges(subreddit) {
	co(function*() {
		var cursor = yield r.table(subreddit).changes();
		cursor.on('data', function(data) {
			console.log(data);
			app.io.emit('comment', {
				sub: subreddit,
				data: data
			});
		});
	})
	.catch(function(err) {
		console.error(err.stack);
	});
}

function subreddit(name) {
	var commentsUrl = 'http://www.reddit.com/r/' + name + '/comments/.json';

	co(function*() {
		try {
			var table = yield r.tableCreate(name);
		} catch (err) {
			console.error('Table already exists.');
		}

		app.io.on('connection', function(socket) {
			co(function*() {
				var initialPayload = yield r.table(name);
				socket.emit('comment', {
					sub: name,
					data: initialPayload
				});
			});
		});

		_watchChanges(name);

		(function keepFetching() {
			setTimeout(function() {
				_fetchComments(name, commentsUrl).then(function() {
					keepFetching();
				});
			}, 1000);
		})();
	});
}

module.exports = subreddit;
