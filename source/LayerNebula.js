define(
	'LayerNebula',
	['Layer', 'Colour', 'Noise', 'Vector3',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Noise/Blender/TwoD/FastVoroni'],
	function (Layer, Colour, Noise, Vector3) {
	"use strict";

	function LayerNebula(canvas, canvasNormal, canvasHeight, canvasLight, settings, brightStars) {
		Layer.call(this, canvas);
		this.canvasNormal = canvasNormal;
		this.canvasHeight = canvasHeight;
		this.canvasLight = canvasLight;
		this.settings = settings;
		this.brightStars = brightStars || [];
		this.status = Layer.Status.ReadyForProcessing;
	}

	LayerNebula.prototype = Object.create(Layer.prototype);
	LayerNebula.prototype.constructor = LayerNebula;

	// --------------------------------------------
	// -- 2d Noise, Runs far faster!
	// --------------------------------------------

	function getDistortion2d(x, y, distortionFactor, distortionScale, noisefunc) {
		var r = {};
		r.nx = noisefunc((x + 13.5) * distortionScale, (y + 13.5) * distortionScale);
		r.ny = noisefunc((x) * distortionScale, (y) * distortionScale);
		r.dx = r.nx * distortionFactor,
		r.dy = r.ny * distortionFactor,
		r.x = x + r.dx;
		r.y = y + r.dy;
		return r;
	}

	LayerNebula.prototype.getBrightnessAt = function (x, y, z, normal, alpha, brightStars) {
		var brightness = 0;

		for (var i = 0; i < brightStars.length; i++) {
			var l = brightStars[i];
			var v = new Vector3(x - l.x, y - l.y, z - l.tz); //using tz as it couldbe pushed forward.
			var sqMag = v.squareMagnitude();
			v.normalizeOverwrite();
			var dotProduct = normal.dotProduct(v);
			brightness += ((l.brightness * l.glowRadius * l.glowRadius) / sqMag) * dotProduct;

		}
		//return this.clamp(0, brightness + this.settings.ambiant , 1);
		return brightness + this.settings.ambiant;
	}

	LayerNebula.prototype.generateBrightness = function (dataArray) {
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				dataArray[j].brightness = this.getBrightnessAt(x, y, dataArray[j].z, dataArray[j].normal, dataArray[j].alpha, this.brightStars);
			}
		}
	};

	LayerNebula.prototype.generateBrightnessColourArrayFromDataArray = function (dataArray) {
		var m = new Array(this.canvas.width * this.canvas.height);
		var d;
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				d = this.clamp(0, dataArray[j].smoothBrightness, 1);
				m[j] = new Colour.rgba(d, d, d, 1);
			}
		}
		return m;
	};

	LayerNebula.prototype.generateNebulaColourArrayFromDataArray = function (dataArray) {
		var m = new Array(this.canvas.width * this.canvas.height);
		var c = this.settings.colour;
		var d;
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				d = dataArray[j];
				var cBrightness = this.clamp(0, d.smoothBrightness, 1);
				var colour = Colour.hslaToRgba((c.h + (d.dHue * this.settings.hueFactor)) % 1, c.s, d.alpha + (d.alpha * Math.sqrt(Math.max(0, d.smoothBrightness - 1)) / 5), Math.max(d.alpha, d.l));

				// apply dark matter & brightness
				colour.r = this.interp(colour.r * cBrightness, 0, d.l);
				colour.g = this.interp(colour.g * cBrightness, 0, d.l);
				colour.b = this.interp(colour.b * cBrightness, 0, d.l);
				m[j] = colour;
				
				//new Colour.rgba(colour.r * cBrightness, colour.g * cBrightness, colour.b * cBrightness, d.alpha);
				//var colour_light = new Colour.rgba(colour.r * cBrightness, colour.g * cBrightness, colour.b * cBrightness, d.alpha);
				/*
					//var tc = Colour.hslaToRgba((c.h + (d.dHue * this.settings.hueFactor)) % 1, c.s, this.clamp(0, d.alpha + (Math.max(0,d.smoothBrightness-1)),2), d.alpha);
					//var tc = Colour.hslaToRgba((c.h + (d.dHue * this.settings.hueFactor)) % 1, c.s, this.clamp(0, d.alpha + (Math.max(0,d.smoothBrightness)),2), d.alpha);
					//var tc = Colour.hslaToRgba((c.h + (d.dHue * this.settings.hueFactor)) % 1, c.s, d.alpha, d.alpha);
				var tc = Colour.hslaToRgba((c.h + (d.dHue * this.settings.hueFactor)) % 1, c.s, d.alpha + (d.alpha * Math.sqrt(Math.max(0, d.smoothBrightness - 1)) / 5), d.alpha);
				var tc2 = new Colour.rgba(tc.r * cBrightness, tc.g * cBrightness, tc.b * cBrightness, d.alpha);
				var lightAlpha = this.clamp(0, (Math.sqrt(Math.max(0, d.smoothBrightness - 2)) / 5)* d.alpha * 2, 1) ;
					//var lightAlpha = this.clamp(0, d.alpha+(d.alpha * this.clamp(0,Math.max(0, d.smoothBrightness - 2),1)),1);
					//var lightAlpha = this.clamp(0, (d.alpha * 2 * this.clamp(0,Math.max(0, d.smoothBrightness - 2),1)),1);
				m[j] = new Colour.rgba(this.interp(tc2.r, 0, d.l), this.interp(tc2.g, 0, d.l), this.interp(tc2.b, 0, d.l), Math.max(d.alpha, d.l, lightAlpha));
					//var dlb = 2-d.brightness;//Math.min(d.l,d.brightness);
					//m[j] = new Colour.rgba(this.interp(tc.r, 0, d.l), this.interp(tc.g, 0, d.l), this.interp(tc.b, 0, d.l), Math.max(d.alpha, d.l));
					//m[j] = new Colour.rgba( this.clamp(0,tc.r * d.brightness,1), this.clamp(0,tc.g * d.brightness,1), this.clamp(0,tc.b * d.brightness,1), Math.max(d.alpha, d.l));
				*/
			}
		}
		return m;
	};

	LayerNebula.prototype.generateHeightColourArrayFromDataArray = function (dataArray) {
		var m = new Array(this.canvas.width * this.canvas.height);
		var d;
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				d = dataArray[j];
				m[j] = new Colour.rgba(d.alpha, d.alpha, d.alpha, 1);
			}
		}
		return m;
	};

	LayerNebula.prototype.generateNormalColourArrayFromDataArray = function (dataArray) {
		var m = new Array(this.canvas.width * this.canvas.height);
		var d;
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				d = dataArray[j];
				m[j] = new Colour.rgba((d.normal.x + 1) * 0.5, (d.normal.y + 1) * 0.5, (d.normal.z * -0.5) + 0.5, 1);
			}
		}
		return m;
	};

	LayerNebula.prototype.interp = function (a, b, c) {
		return a + ((b - a) * c);
	}

	// --------------------------------------------

	LayerNebula.prototype.getDataAtLumps = function (x, y) {

		x = (x - this.settings.offsetX) * this.settings.scale;
		y = (y - this.settings.offsetY) * this.settings.scale;

		var r = {
			alpha: Math.sin((x / this.canvas.width) * Math.PI * 10) * Math.sin((y / this.canvas.height) * Math.PI * 10),
			l: 0,
			dHue: 0
		};

		r.alpha = Math.pow(r.alpha, 10);
		return r;
	}

	// --------------------------------------------

	LayerNebula.prototype.getDataAt = function (x, y) {
		var tweakFactor = (1 / 2.783090005787192) * 1.5; //tweak to get the output in a nice range.

		var lacunarity = this.settings.lacunarity;
		var roughness = this.settings.roughness;
		var distortionFactor = this.settings.distortionFactor;
		var distortionScale = this.settings.distortionScale;
		var alphaExponent = this.settings.alphaExponent;

		var r = {
			alpha: 0,
			l: 0,
			dHue: 0,
			z: 0,
		};

		var noiseFunc = Noise.Blender.TwoD.FastVoronoi_F1;
		var distortionFunk = Noise.perlin2; //Noise.simplex2;//
		var dist = getDistortion2d(x, y, distortionFactor, distortionScale, distortionFunk);

		var dHue = dist.nx * dist.ny;

		var value = noiseFunc(dist.x, dist.y) * tweakFactor;

		var pwHL = this.settings.powLacunarityRoughness; //Math.pow(lacunarity, -roughness);
		var pwr = pwHL;
		var dHuePwr = this.settings.dHuePwr;

		x *= lacunarity;
		y *= lacunarity;

		var increment;

		var value2 = value;

		if (value <= 0) {
			return r;
		}

		for (var i = 1; i < Math.floor(this.settings.octaves); i++) {
			dist = getDistortion2d(x, y, distortionFactor, distortionScale, distortionFunk);
			increment = (noiseFunc(dist.x, dist.y) * pwr * value);
			dHue += (dist.nx * dist.ny * dHuePwr);
			value += increment;

			//switch the distortion to get the dark matter
			dist = getDistortion2d(y, x, distortionFactor, distortionScale, distortionFunk);
			increment = (noiseFunc(dist.x, dist.y) * pwr * value2);
			value2 += increment;

			dHuePwr *= pwHL;
			pwr *= pwHL;
			x *= lacunarity;
			y *= lacunarity;
		}

		var rmd = this.settings.octaves - Math.floor(this.settings.octaves);
		if (rmd != 0.0) {
			dist = getDistortion2d(x, y, distortionFactor, distortionScale, distortionFunk);
			increment = noiseFunc(dist.x, dist.y) * pwr * value;
			value += rmd * increment;
		}

		r.alpha = Math.pow(value, alphaExponent);
		r.l = Math.pow(value2, alphaExponent * 3);
		r.z = Math.max(r.alpha, r.l) * 100;
		r.dHue = dHue;
		return r;
	}

	// --------------------------------------------

	LayerNebula.prototype.normalizeData = function (dataArray) {
		var minA = dataArray[0].alpha;
		var maxA = dataArray[0].alpha;
		var minL = dataArray[0].l;
		var maxL = dataArray[0].l;
		var minZ = dataArray[0].z;
		var maxZ = dataArray[0].z;
		var i;
		var l = dataArray.length;
		for (i = 0; i < l; i++) {
			minA = Math.min(minA, dataArray[i].alpha);
			maxA = Math.max(maxA, dataArray[i].alpha);
			minL = Math.min(minL, dataArray[i].l);
			maxL = Math.max(maxL, dataArray[i].l);
			minZ = Math.min(minZ, dataArray[i].z);
			maxZ = Math.max(maxZ, dataArray[i].z);
		}
		var ratioA = 1 / (maxA - minA);
		var ratioL = 1 / (maxL - minL);
		var ratioZ = 100 / (maxZ - minZ);

		for (i = 0; i < l; i++) {
			dataArray[i].alpha = ((dataArray[i].alpha - minA) * ratioA);
			dataArray[i].l = ((dataArray[i].l - minL) * ratioL);
			dataArray[i].z = ((dataArray[i].z - minZ) * ratioZ);
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.generateNebulaData = function () {
		var s = this.settings;
		this.data = Array();
		//s.normalize = false;
		var minA = 9999;
		var maxA = 0;
		var minL = 9999;
		var maxL = 0;

		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				this.data[j] = this.getDataAt(s.offsetX + x / s.scale, s.offsetY + y / s.scale);
				minA = Math.min(minA, this.data[j].alpha);
				maxA = Math.max(maxA, this.data[j].alpha);
				minL = Math.min(minL, this.data[j].l);
				maxL = Math.max(maxL, this.data[j].l);
			}
		}

		console.log('normalize: ' + ((maxA - minA) < 0.5) + ' || ' + (minA > 0.5) + ' || ' + (maxA > 1) + ' || ' + ((maxL - minL) < 0.5) + ' || ' + (minL > 0.5) + ' || ' + (maxL > 1));

		if (((maxA - minA) < 0.5) || (minA > 0.5) || (maxA > 1) || ((maxL - minL) < 0.5) || (minL > 0.5) || (maxL > 1)) {
			s.normalize = true;
			this.normalizeData(this.data);
		}

		this.pushBrightStarsForward();
		this.generateNormalMap(this.data);
		this.generateBrightness(this.data);
		this.smoothBrightnes(this.data);
	}

	// --------------------------------------------
	// bit of a hack to ensure bright stars do not appear totaly behind the nebula
	LayerNebula.prototype.pushBrightStarsForward = function () {
		var w = this.canvas.width;
		for (var i = 0; i < this.brightStars.length; i++) {
			var l = this.brightStars[i];
			var z = this.data[l.x + (l.y * w)].z;
			l.tz = Math.max(z+10+l.starRealRadius, l.z);
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.generateNormalMap = function (data) {
		var w = this.canvas.width;
		var h = this.canvas.height;
		for (var y = 0, j = 0; y < h; y++) {
			for (var x = 0; x < w; x++, j++) {
				var px = ((x + 1) < w) ? (x + 1) : x;
				var py = ((y + 1) < h) ? (y + 1) : y;
				var nx = ((x - 1) >= 0) ? (x - 1) : x;
				var ny = ((y - 1) >= 0) ? (y - 1) : y;

				var topLeft = data[nx + (ny * w)].alpha;
				var top = data[x + (ny * w)].alpha;
				var topRight = data[px + (ny * w)].alpha;

				var left = data[nx + (y * w)].alpha;
				var center = data[x + (y * w)].alpha;
				var right = data[px + (y * w)].alpha;

				var bottomLeft = data[nx + (py * w)].alpha;
				var bottom = data[x + (py * w)].alpha;
				var bottomRight = data[px + (py * w)].alpha;

				var dx = (topRight + 2.0 * right + bottomRight) - (topLeft + 2.0 * left + bottomLeft);
				var dy = (bottomLeft + 2.0 * bottom + bottomRight) - (topLeft + 2.0 * top + topRight);
				var dz = -1;
				data[j].normal = (new Vector3(dx, dy, dz)).normalizeOverwrite();
			}
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.smoothBrightnes = function (data) {
		var w = this.canvas.width;
		var h = this.canvas.height;
		for (var y = 0, j = 0; y < h; y++) {
			for (var x = 0; x < w; x++, j++) {
				var px = ((x + 1) < w) ? (x + 1) : x;
				var py = ((y + 1) < h) ? (y + 1) : y;
				var nx = ((x - 1) >= 0) ? (x - 1) : x;
				var ny = ((y - 1) >= 0) ? (y - 1) : y;

				var topLeft = data[nx + (ny * w)].brightness;
				var top = data[x + (ny * w)].brightness;
				var topRight = data[px + (ny * w)].brightness;

				var left = data[nx + (y * w)].brightness;
				var center = data[x + (y * w)].brightness;
				var right = data[px + (y * w)].brightness;

				var bottomLeft = data[nx + (py * w)].brightness;
				var bottom = data[x + (py * w)].brightness;
				var bottomRight = data[px + (py * w)].brightness;

				data[j].smoothBrightness = (topLeft + top + topRight + left + center + right + bottomLeft + bottom + bottomRight) / 9;
			}
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		this.generateNebulaData();

		var heightColourArray = this.generateHeightColourArrayFromDataArray(this.data);
		this.colourArrayToCanvas(heightColourArray, this.canvasHeight);
		heightColourArray = undefined;

		var normalColourArray = this.generateNormalColourArrayFromDataArray(this.data);
		this.colourArrayToCanvas(normalColourArray, this.canvasNormal);
		normalColourArray = undefined;

		var brightnessColourArray = this.generateBrightnessColourArrayFromDataArray(this.data);
		this.colourArrayToCanvas(brightnessColourArray, this.canvasLight);
		brightnessColourArray = undefined;

		var nebulaColourArray = this.generateNebulaColourArrayFromDataArray(this.data);
		this.colourArrayToCanvas(nebulaColourArray, this.canvas);
		nebulaColourArray = undefined;

		this.data = undefined;

		this.settings.layer = this;

		this.status = Layer.Status.Success;
	}

	return LayerNebula;
});
