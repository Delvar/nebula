define(
	'Vector3',
	['ObjectPool'],
	function (ObjectPool) {
	"use strict";
	function Vector3(x, y, z) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
		Object.seal(this);
		/*
		// - Object Pool Testing
		this.pool = undefined;
		this.poolIndex = -1;
		Object.seal(this);
		//Object.preventExtensions(this);
		// - Object Pool Testing
		 */
		//Vector3.count++;
	}

	//Vector3.count = 0;

	Vector3.prototype.squareMagnitude = function () {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	};

	Vector3.prototype.magnitude = function () {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
	};

	Vector3.prototype.normalize = function () {
		var magnitude = this.magnitude();
		if (magnitude == 0) {
			return Vector3.create(0, 0, 0);
		}
		return Vector3.create(this.x / magnitude, this.y / magnitude, this.z / magnitude);
	};

	Vector3.prototype.normalizeOverwrite = function () {
		var magnitude = this.magnitude();
		if (magnitude == 0) {
			return this;
		}
		this.x = this.x / magnitude;
		this.y = this.y / magnitude;
		this.z = this.z / magnitude;
		return this;
	};

	Vector3.prototype.clone = function () {
		return Vector3.create(this.x, this.y, this.z);
	};

	Vector3.prototype.dotProduct = function (other) {
		return (this.x * other.x + this.y * other.y + this.z * other.z);
	};

	// - Static Methods
	Vector3.squareMagnitude = function (x, y, z) {
		return x * x + y * y + z * z;
	};

	Vector3.magnitude = function (x, y, z) {
		return Math.sqrt(Vector3.squareMagnitude(x, y, z));
	};

	Vector3.normalize = function (x, y, z) {
		var magnitude = Vector3.magnitude(x, y, z);
		if (magnitude == 0) {
			return [0, 0, 0];
		}
		return [x / magnitude, y / magnitude, z / magnitude];
	};

	Vector3.dotProduct = function (x1, y1, z1, x2, y2, z2) {
		return (x1 * x2 + y1 * y2 + z1 * z2);
	};
	// - Static Methods

	// - Object Pool Testing
	/*
	Vector3.prototype._poolSetObjectPool = function (pool, index) {
	this.pool = pool;
	this.poolIndex = index;
	};

	Vector3.prototype._poolGetObjectPoolIndex = function () {
	return this.poolIndex;
	};

	Vector3.prototype.destroy = function () {
	Vector3.ObjectPool.destroy(this);
	};

	Vector3.prototype._poolInit = function (x, y, z) {
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
	}

	Vector3.ObjectPool = new ObjectPool(100, 50, Vector3);

	Vector3.create = function () {
	return Vector3.ObjectPool.create.apply(Vector3.ObjectPool, arguments);
	}*/
	// - Object Pool Testing

	//window.Vector3 = Vector3;
	return Vector3;

});
