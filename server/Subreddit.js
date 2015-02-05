'use strict';

var app = global.app;
var co = require('co');
var bluebird = require('bluebird');
var request = bluebird.promisifyAll(require('request'));
var r = require('rethinkdbdash')({ db: 'curseit' });

function Subreddit(name) {
	this.subreddit = name;
	this.commentsUrl = 'http://www.reddit.com/r/' + name + '/comments/.json';

	co(function*() {
		try {
			var table = yield r.tableCreate(name, {
				primaryKey: 'link_id'
			});
			console.log(table);
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
	});

	this._watchChanges();
}

Subreddit.prototype._fetchComments = function _fetchComments() {
	return co(function*() {
		var req = yield request.getAsync(this.commentsUrl);
		var comments = yield JSON.parse(req[0].body).data.children;
		return comments;
	}.bind(this))
	.catch(function(err) {
		console.error(err.stack);
	});
};

Subreddit.prototype._watchChanges = function _watchChanges() {
	var self = this;
	co(function*() {
		var cursor = yield r.table(self.subreddit).changes();
		cursor.on('data', function(data) {
			console.log(data);
			app.io.emit('comment', {
				sub: self.subreddit,
				data: data
			});
		});
	})
	.catch(function(err) {
		console.error(err.stack);
	});
};

module.exports = Subreddit;
