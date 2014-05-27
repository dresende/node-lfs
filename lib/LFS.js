var path = require("path");
var fs   = require("fs");

module.exports = LFS;

function LFS(opts) {
	this.opts   = opts || {};
	this.layers = [];
	this.cache  = {};
}

LFS.prototype.add = function (fs_path) {
	try {
		var stat = fs.statSync(fs_path);
	} catch (e) {
		if (e.code == "ENOENT") {
			throw new Error(fs_path + " is not a directory");
		}
		throw e;
	}

	if (!stat.isDirectory()) {
		throw new Error(fs_path + " is not a directory");
	}

	this.layers.push(fs_path);

	return this;
};

LFS.prototype.get = function (fs_path, next) {
	var i = 0, filename;
	var ret = function (val) {
		if (this.opts.cache > 0 && !this.cache.hasOwnProperty(fs_path)) {
			this.cache[fs_path] = {
				val : val,
				exp : Date.now() + this.opts.cache
			};
		}
		if (typeof next != "function") {
			return val;
		}
		return next(val);
	}.bind(this);

	if (this.opts.cache > 0 && this.cache[fs_path]) {
		if (this.cache[fs_path].exp > Date.now()) {
			return ret(this.cache[fs_path].val);
		}
		delete this.cache[fs_path];
	}

	if (typeof next != "function") {
		// synchronous check
		for (; i < this.layers.length; i++) {
			filename = path.join(this.layers[i], fs_path);

			if (fs.existsSync(filename)) {
				return ret(filename);
			}
		}

		return ret(null);
	}

	var check_next = function () {
		if (i >= this.layers.length) {
			return ret(null);
		}

		var filename = path.join(this.layers[i], fs_path);

		fs.exists(filename, function (exists) {
			if (exists) {
				return ret(filename);
			}

			i += 1;
			return check_next();
		});
	}.bind(this);

	check_next();

	return this;
};
