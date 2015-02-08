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

var _storeComments = co.wrap(function* _storeComments(tableName, comments) {
	yield r.table(tableName).insert(comments);
});

var _fetchComments = co.wrap(function* _fetchComments() {
	var comments = yield reddit.raw('http://www.reddit.com/comments.json').get({ limit: 100 });
	return comments.data.children;
});

var _watchChanges = co.wrap(function* _watchChanges(tableName) {
	var cursor = yield r.table(tableName).changes();
	cursor.on('data', function(data) {
		app.io.emit('comment', data);
	});
});

var getComments = co.wrap(function* getComments() {
	var tableName = 'comments';

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
		setTimeout(co.wrap(function*() {
			var comments = yield _fetchComments();
			yield _storeComments(tableName, comments);
			keepFetching();
		}), 2000);
	})();
});

module.exports.getComments = getComments;
