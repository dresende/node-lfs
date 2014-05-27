var path = require("path");
var fs   = require("fs");

module.exports = LFS;

function LFS(opts) {
	this.opts   = opts || {};
	this.layers = [];
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

	if (typeof next != "function") {
		// synchronous check
		for (; i < this.layers.length; i++) {
			filename = path.join(this.layers[i], fs_path);

			if (fs.existsSync(filename)) {
				return filename;
			}
		}

		return null;
	}

	var check_next = function () {
		if (i >= this.layers.length) {
			return next(null);
		}

		var filename = path.join(this.layers[i], fs_path);

		fs.exists(filename, function (exists) {
			if (exists) {
				return next(filename);
			}

			i += 1;
			return check_next();
		});
	}.bind(this);

	check_next();

	return this;
};
