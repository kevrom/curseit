'use strict';

var app = global.app;
var co = require('co');
var bluebird = require('bluebird');
var request = bluebird.promisifyAll(require('request'));
var r = require('rethinkdbdash')({ db: 'curseit' });

function _storeComments(subreddit, comments) {
	return co(function*() {
		yield r.table(subreddit).insert(comments);
	});
}

function _fetchComments(url) {
	return co(function*() {
		var req = yield request.getAsync(url);
		var raw = yield JSON.parse(req[0].body).data.children;
		var comments = raw.map(function(c) {
			return c.data;
		});
		return comments;
	})
	.catch(function(err) {
		console.error(err.stack);
	});
}

function _watchChanges(subreddit) {
	return co(function*() {
		var cursor = yield r.table(subreddit).changes();
		cursor.on('data', function(data) {
			console.log('Emitting new data');
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
	var commentsUrl = 'http://www.reddit.com/r/' + name + '/comments/.json?sort=new';

	var after;

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
				_fetchComments(commentsUrl).then(function(comments) {
					_storeComments(name, comments).then(function() {
						keepFetching();
					});
				});
			}, 1000 * 60);
		})();
	});
}

module.exports = subreddit;
