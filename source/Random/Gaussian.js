define(
	'Random/Gaussian',
	['Random'],
	function (Random) {
	"use strict";

	function Gaussian(mean, variance, range, prng) {
		if (variance <= 0) {
			throw new Error('Variance must be > 0 (but was ' + variance + ')');
		}

		this.mean = mean;
		this.variance = variance;
		this.standardDeviation = Math.sqrt(variance);

		this.range = range || 1;

		if (this.range <= 0) {
			throw new Error('Range must be > 0 (but was ' + this.range + ')');
		}

		//scale so that maximum at mean is 1 then multiple by range later.
		this.scale = this.standardDeviation * Math.sqrt(2 * Math.PI);

		this.prng = prng || Math.random;
	}

	Gaussian.prototype.pdf = function (x) {
		var m = this.standardDeviation * Math.sqrt(2 * Math.PI);
		var e = Math.exp(-Math.pow(x - this.mean, 2) / (2 * this.variance));
		return e / m * this.scale * this.range;
	};

	//without the range multiplication.
	Gaussian.prototype.pdfBase = function (x) {
		var m = this.standardDeviation * Math.sqrt(2 * Math.PI);
		var e = Math.exp(-Math.pow(x - this.mean, 2) / (2 * this.variance));
		return e / m * this.scale;
	};

	Gaussian.prototype.random = function () {
		var V1,
		V2,
		S,
		X;
		do {
			V1 = 2 * this.prng() - 1;
			V2 = 2 * this.prng() - 1;
			S = V1 * V1 + V2 * V2;
		} while (S > 1);

		X = Math.sqrt(-2 * Math.log(S) / S) * V1;
		X = this.mean + this.standardDeviation * X;
		return X;
	}

	Random.Gaussian = Gaussian;
	return Gaussian;
});
/*
var x =0;
var mean =0;
var variance = 1;
var standardDeviation = Math.sqrt(variance);
var m = standardDeviation * Math.sqrt(2 * Math.PI);
var e = Math.exp(-Math.pow(x - mean, 2) / (2 * variance));
*/
