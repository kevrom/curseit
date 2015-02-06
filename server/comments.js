'use strict';

var app = global.app;
var co = require('co');
var bluebird = require('bluebird');
var request = bluebird.promisifyAll(require('request'));
var r = require('rethinkdbdash')({ db: 'curseit' });

var Snoocore = require('snoocore');
var reddit = new Snoocore({
	userAgent: 'curseit@0.0.1 by kevrom',
	throttle: 4000
});

function _storeComments(tableName, comments) {
	return co(function*() {
		yield r.table(tableName).insert(comments);
	});
}

function _fetchComments() {
	return co(function*() {
		var comments = yield reddit.raw('http://www.reddit.com/comments.json').get({ limit: 100 });
		return comments.data.children;
	});
}

function _watchChanges(tableName) {
	return co(function*() {
		var cursor = yield r.table(tableName).changes();
		cursor.on('data', function(data) {
			console.log('Emitting new data');
			app.io.emit('comment', data);
		});
	})
	.catch(function(err) {
		console.error(err.stack);
	});
}

function getComments() {
	var tableName = 'comments';

	co(function*() {
		try {
			yield r.tableCreate(tableName);
		} catch (err) {
			console.error('Table already exists.');
		}

		app.io.on('connection', function(socket) {
			co(function*() {
				var initialPayload = yield r.table(tableName);
				socket.emit('comment', initialPayload);
			});
		});

		_watchChanges(tableName);

		(function keepFetching() {
			setTimeout(function() {
				_fetchComments().then(function(comments) {
					_storeComments(tableName, comments).then(function() {
						keepFetching();
					});
				});
			}, 2000);
		})();
	});
}

module.exports.getComments = getComments;
