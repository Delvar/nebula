export default class Gaussian {
	constructor(mean, variance, range, prng) {
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

	pdf(x) {
		var m = this.standardDeviation * Math.sqrt(2 * Math.PI);
		var e = Math.exp(-Math.pow(x - this.mean, 2) / (2 * this.variance));
		return e / m * this.scale * this.range;
	}

	//without the range multiplication.
	pdfBase(x) {
		var m = this.standardDeviation * Math.sqrt(2 * Math.PI);
		var e = Math.exp(-Math.pow(x - this.mean, 2) / (2 * this.variance));
		return e / m * this.scale;
	}

	random() {
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
}