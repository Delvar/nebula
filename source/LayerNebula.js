define(
	'LayerNebula',
	['Layer', 'Colour', 'Noise',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Noise/Blender/TwoD/FastVoroni'],
	function (Layer, Colour, Noise) {
	"use strict";

	function LayerNebula(canvas, settings) {
		Layer.call(this, canvas);
		this.settings = settings;
		this.status = Layer.Status.ReadyForProcessing;
	}

	LayerNebula.prototype = Object.create(Layer.prototype);
	LayerNebula.prototype.constructor = LayerNebula;

	// --------------------------------------------
	// -- 2d Noise, Runs far faster!
	// --------------------------------------------

	function getDistortion2d(x, y, distortion, distortionScale, noisefunc) {
		var r = {
			dx: noisefunc((x + 13.5) * distortionScale, (y + 13.5) * distortionScale) * distortion,
			dy: noisefunc((x) * distortionScale, (y) * distortionScale) * distortion,
		};
		r.x = x + r.dx;
		r.y = y + r.dy;
		return r;
	}

	LayerNebula.prototype.generateNebulaColourArrayFromDataArray = function (dataArray) {
		var m = new Array(this.canvas.width * this.canvas.height);
		var c = this.settings.colour;
		var d;
		for (var x = 0, j = 0; x < this.canvas.height; x++) {
			for (var y = 0; y < this.canvas.width; y++, j++) {
				d = dataArray[j];
				var tc = Colour.hslaToRgba((c.h + (d.h * this.settings.density.dh)) % 1, c.s, d.a, d.a);
				m[j] = new Colour.rgba(this.interp(tc.r, 0, d.l), this.interp(tc.g, 0, d.l), this.interp(tc.b, 0, d.l), Math.max(d.a, d.l));
			}
		}
		return m;
	};

	LayerNebula.prototype.interp = function (a, b, c) {
		return a + ((b - a) * c);
	}
	
	// --------------------------------------------

	LayerNebula.prototype.getDataAt = function (x, y) {
		var nm = (1 / 2.783090005787192) * 1.5;

		var lacunarity = this.settings.density.lacunarity;
		var h = this.settings.density.h;
		var distortion = this.settings.density.distortion;
		var distortionScale = this.settings.density.distortionScale;
		var exponent = this.settings.density.exponent;

		var upOctaves = this.settings.density.octaves;

		var r = {
			a: 0,
			l: 0,
			h: 0
		};

		var noisefunc = Noise.Blender.TwoD.FastVoronoi_F1;
		var distortfunk = Noise.perlin2; //Noise.simplex2;//
		var dist = getDistortion2d(x, y, distortion, distortionScale, distortfunk);

		r.h = (dist.dx / distortion) * (dist.dy / distortion);

		var value = noisefunc(dist.x, dist.y) * nm;

		var pwHL = Math.pow(lacunarity, -h);
		var pwr = pwHL;

		x *= lacunarity;
		y *= lacunarity;

		var increment;

		var value2 = value;

		if (value <= 0) {
			return r;
		}

		for (var i = 1; i < Math.floor(upOctaves); i++) {
			dist = getDistortion2d(x, y, distortion, distortionScale, distortfunk);
			increment = (noisefunc(dist.x, dist.y) * pwr * value);
			r.h = r.h + ((dist.dx / distortion) * (dist.dy / distortion) * pwr);
			value += increment;

			//switch the distortion to get the dark matter
			dist = getDistortion2d(y, x, distortion, distortionScale, distortfunk);
			increment = (noisefunc(dist.x, dist.y) * pwr * value2);
			value2 += increment;

			pwr *= pwHL;
			x *= lacunarity;
			y *= lacunarity;
		}

		var rmd = upOctaves - Math.floor(upOctaves);
		if (rmd != 0.0) {
			dist = getDistortion2d(x, y, distortion, distortionScale, distortfunk);
			increment = noisefunc(dist.x, dist.y) * pwr * value;
			value += rmd * increment;
		}

		r.a = Math.pow(value, this.settings.density.exponent);
		r.l = Math.pow(value2, this.settings.density.exponent * 3);
		return r;
	}

	// --------------------------------------------

	LayerNebula.prototype.normalizeData = function (dataArray) {
		var toMin = 0;
		var toMax = 1;
		var minA = dataArray[0].a;
		var maxA = dataArray[0].a;
		var minL = dataArray[0].a;
		var maxL = dataArray[0].a;
		var i;
		var l = dataArray.length;
		for (i = 0; i < l; i++) {
			minA = Math.min(minA, dataArray[i].a);
			maxA = Math.max(maxA, dataArray[i].a);
			minL = Math.min(minL, dataArray[i].l);
			maxL = Math.max(maxL, dataArray[i].l);
		}
		var range = toMax - toMin;
		var ratioA = range / (maxA - minA);
		var ratioL = range / (maxL - minL);

		for (i = 0; i < l; i++) {
			dataArray[i].a = ((dataArray[i].a - minA) * ratioA) + toMin;
			dataArray[i].l = ((dataArray[i].l - minL) * ratioL) + toMin;
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.generateNebulaData = function () {
		var s = this.settings.density;
		this.data = Array();
		this.settings.normalize = false;
		var minA = 9999;
		var maxA = 0;
		var minL = 9999;
		var maxL = 0;

		for (var x = 0, j = 0; x < this.canvas.height; x++) {
			for (var y = 0; y < this.canvas.width; y++, j++) {
				this.data[j] = this.getDataAt(s.dx + x / s.scale, s.dy + y / s.scale);
				minA = Math.min(minA, this.data[j].a);
				maxA = Math.max(maxA, this.data[j].a);
			}
		}

		//console.log('normalize: ' + ((maxA - minA) < 0.5) + ' || ' + (minA > 0.5) + ' || ' + (maxA > 1) + ' || ' + ((maxL - minL) < 0.5) + ' || ' + (minL > 0.5) + ' || ' + (maxL > 1));

		if (((maxA - minA) < 0.5) || (minA > 0.5) || (maxA > 1) || ((maxL - minL) < 0.5) || (minL > 0.5) || (maxL > 1)) {
			this.settings.normalize = true;
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		this.generateNebulaData();
		var density = this.nDensity;
		if (this.settings.normalize) {
			this.normalizeData(this.data);
		}

		var nebulaColourArray = this.generateNebulaColourArrayFromDataArray(this.data);
		this.colourArrayToCanvas(nebulaColourArray, this.canvas);

		this.settings.layer = this;

		this.status = Layer.Status.Success;
	}

	return LayerNebula;
});
