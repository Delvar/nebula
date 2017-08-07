define(
	'Vector3',
	[],
	function () {
	"use strict";
	function Vector3(x, y, z) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}

	Vector3.prototype.squareMagnitude = function () {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	};
	
	Vector3.prototype.magnitude = function () {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
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
		return (this.x * other.x + this.y * other.y + this.z * other.z ); 
	};
	
	return Vector3;
});
