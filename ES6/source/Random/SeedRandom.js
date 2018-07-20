/*
Copyright 2014 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */
//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
class ARC4 {
	constructor(key, width, mask) {
		this.width = width;
		this.mask = mask;
		this.i = this.j = 0;
		this.S = [];

		var t,
		keylen = key.length;

		// The empty key [] is treated as [0].
		if (!keylen) {
			key = [keylen++];
		}

		// Set up S using the standard key scheduling algorithm.
		while (this.i < this.width) {
			this.S[this.i] = this.i++;
		}
		for (this.i = 0; this.i < this.width; this.i++) {
			this.S[this.i] = this.S[this.j = this.mask & (this.j + key[this.i % keylen] + (t = this.S[this.i]))];
			this.S[this.j] = t;
		}
		this.g(this.width);
	}

	g(count) {
		// Using instance members instead of closure state nearly doubles speed.
		var t,
		r = 0;
		while (count--) {
			t = this.S[this.i = this.mask & (this.i + 1)];
			r = r * this.width + this.S[this.mask & ((this.S[this.i] = this.S[this.j = this.mask & (this.j + t)]) + (this.S[this.j] = t))];
		}

		return r;
		// For robust unpredictability, the function call below automatically
		// discards an initial batch of values.  This is called RC4-drop[256].
		// See http://google.com/search?q=rsa+fluhrer+response&btnI
	}
}

export default
class SeedRandom {
	constructor(seed, pool, math) {
		if (pool == undefined) {
			pool = [];
		}
		this.pool = pool;

		if (math == undefined) {
			math = Math;
		}
		this.math = math;
		
		//
		// The following constants are related to IEEE 754 limits.
		//
		this.width = 256; // each RC4 output is 0 <= x < 256
		this.chunks = 6; // at least six RC4 outputs for each double
		this.digits = 52; // there are 52 significant digits in a double
		this.startdenom = this.math.pow(this.width, this.chunks);
		this.significance = this.math.pow(2, this.digits);
		this.overflow = this.significance * 2;
		this.mask = this.width - 1;

		//
		// When seedrandom.js is loaded, we immediately mix a few bits
		// from the built-in RNG into the entropy pool.  Because we do
		// not want to interfere with deterministic PRNG state later,
		// seedrandom will not call this.math.random on its own again after
		// initialization.
		//
		this.mixkey(this.math.random(), this.pool);

		this.setSeed(seed);
	}

	//
	// setSeed()
	//
	setSeed(seed, options, callback) {
		var key = [];
		options = (options == true) ? {
			entropy: true
		}
		 : (options || {});

		// Flatten the seed string or build one from local entropy if needed.
		var shortseed = this.mixkey(this.flatten(
					options.entropy ? [seed, tostring(this.pool)] :
					(seed == null) ? this.autoseed() : seed, 3), key);

		// Use the seed to initialize an ARC4 generator.
		this.arc4 = new ARC4(key, this.width, this.mask);

		// Mix the randomness into accumulated entropy.
		this.mixkey(this.tostring(this.arc4.S), this.pool);

		return this;
	}

	// This function returns a random double in [0, 1] that contains
	// randomness in every bit of the mantissa of the IEEE 754 value.
	prng() {
		var n = this.arc4.g(this.chunks), // Start with a numerator n < 2 ^ 48
		d = this.startdenom, //   and denominator d = 2 ^ 48.
		x = 0; //   and no 'extra last byte'.
		while (n < this.significance) { // Fill up all significant digits by
			n = (n + x) * this.width; //   shifting numerator and
			d *= this.width; //   denominator and generating a
			x = this.arc4.g(1); //   new least-significant-byte.
		}
		while (n >= this.overflow) { // To avoid rounding up, before adding
			n /= 2; //   last byte, shift everything
			d /= 2; //   right using integer math until
			x >>>= 1; //   we have exactly the desired bits.
		}
		return (n + x) / d; // Form the number within [0, 1).
	}

	prng_int32() {
		return this.arc4.g(4) | 0;
	}

	prng_quick() {
		return this.arc4.g(4) / 0x100000000;
	}

	between(min, max) {
		if (min > max) {
			var t = max;
			max = min;
			min = t;
		}
		var range = max - min;
		return min + this.prng() * range;
	}

	betweenPow(min, max, pow) {
		if (min > max) {
			var t = max;
			max = min;
			min = t;
		}
		var range = max - min;
		return min + this.math.pow(this.prng(), pow) * range;
	}

	//
	// copy()
	// Copies internal state of ARC4 to or from a plain object.
	//
	copy(f, t) {
		t.i = f.i;
		t.j = f.j;
		t.S = f.S.slice();
		return t;
	};

	//
	// flatten()
	// Converts an object tree to nested arrays of strings.
	//
	flatten(obj, depth) {
		var result = [],
		typ = (typeof obj),
		prop;
		if (depth && typ == 'object') {
			for (prop in obj) {
				try {
					result.push(flatten(obj[prop], depth - 1));
				} catch (e) {}
			}
		}
		return (result.length ? result : typ == 'string' ? obj : obj + '\0');
	}

	//
	// mixkey()
	// Mixes a string seed into a key that is an array of integers, and
	// returns a shortened string seed that is equivalent to the result key.
	//
	mixkey(seed, key) {
		var stringseed = seed + '',
		smear,
		j = 0;
		while (j < stringseed.length) {
			key[this.mask & j] =
				this.mask & ((smear ^= key[this.mask & j] * 19) + stringseed.charCodeAt(j++));
		}
		return this.tostring(key);
	}

	//
	// autoseed()
	// Returns an object for autoseeding, using window.crypto and Node crypto
	// module if available.
	//
	autoseed() {
		try {
			var out = new Uint8Array(width);
			(window.crypto || window.msCrypto).getRandomValues(out);
			return tostring(out);
		} catch (e) {
			var browser = window.navigator,
			plugins = browser && browser.plugins;
			return [+new Date, window, plugins, window.screen, this.tostring(this.pool)];
		}
	}

	//
	// tostring()
	// Converts an array of charcodes to a string
	//
	tostring(a) {
		return String.fromCharCode.apply(0, a);
	}
}

//alias random to prng...
SeedRandom.prototype.random = SeedRandom.prototype.prng;
