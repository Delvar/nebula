define(
	'Vector3',
	['ObjectPool'],
	function (ObjectPool) {
	"use strict";
	function Vector3(x, y, z) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
		Vector3.count++;
	}

	Vector3.count = 0;

	Vector3.prototype.squareMagnitude = function () {
		//return this.x * this.x + this.y * this.y + this.z * this.z;
		return Vector3.squareMagnitude(this.x, this.y, this.z);
	};

	Vector3.prototype.magnitude = function () {
		return Vector3.magnitude(this.x, this.y, this.z);
	};

	Vector3.prototype.normalize = function () {
		var magnitude = this.magnitude();
		if (magnitude == 0) {
			return new Vector3(0, 0, 0);
		}
		return new Vector3(this.x / magnitude, this.y / magnitude, this.z / magnitude);
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
		return new Vector3(this.x, this.y, this.z);
	};

	Vector3.prototype.dotProduct = function (other) {
		//return (this.x * other.x + this.y * other.y + this.z * other.z );
		return Vector3.dotProduct(this.x, this.y, this.z, other.x, other.y, other.z);
	};

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

	// - Object Pool Testing
	Vector3.prototype.setObjectPool = function (pool, index) {
		this.pool = pool;
		this.poolIndex = index;
	};

	Vector3.prototype.getObjectPoolIndex = function () {
		return this.poolIndex;
	};

	Vector3.ObjectPool = new ObjectPool(50000, 10000, Vector3);

	Vector3.create = function () {
		return Vector3.ObjectPool.create.apply(Vector3.ObjectPool, arguments);
	}

	// - Object Pool Testing

	window.Vector3 = Vector3;
	return Vector3;

});
