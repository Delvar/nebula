define(
	'LayerNebula2',
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

		this.alphaArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.dHueArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.depthArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.brightnessArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.smoothBrightnessArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.normalArray = new Array(this.canvas.width * this.canvas.height);
		this.maxDepth = 100;
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

	// --------------------------------------------
		
	LayerNebula.prototype.getBrightnessAt = function (x, y, z, normal, alpha, brightStars) {
		var brightness = 0;

		for (var i = 0; i < brightStars.length; i++) {
			var l = brightStars[i];
			var v = new Vector3(x - l.x, y - l.y, z - l.tz); //using tz as it could be pushed forward.
			var sqMag = v.squareMagnitude();
			v.normalizeOverwrite();
			var dotProduct = normal.dotProduct(v);
			brightness += ((l.brightness * l.glowRadius * l.glowRadius) / sqMag) * dotProduct;
		}
		return brightness + this.settings.ambiant;
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
			dHue: 0,
			depth: 0,
		};

		var dist = getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2);
		var dHue = dist.nx * dist.ny;
		var value = Noise.Blender.TwoD.FastVoronoi_F1(dist.x, dist.y) * tweakFactor;
		var pwHL = this.settings.powLacunarityRoughness;
		var pwr = pwHL;
		var dHuePwr = this.settings.dHuePwr;

		x *= lacunarity;
		y *= lacunarity;

		var increment;

		if (value <= 0) {
			return r;
		}

		var fOctaves = Math.floor(this.settings.octaves);
		for (var i = 1; i < fOctaves; i++) {
			dist = getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2);
			increment = (Noise.Blender.TwoD.FastVoronoi_F1(dist.x, dist.y) * pwr * value);
			dHue += (dist.nx * dist.ny * dHuePwr);
			value += increment;

			dHuePwr *= pwHL;
			pwr *= pwHL;
			x *= lacunarity;
			y *= lacunarity;
		}

		var rmd = this.settings.octaves - fOctaves;
		if (rmd != 0.0) {
			dist = getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2);
			increment = Noise.Blender.TwoD.FastVoronoi_F1(dist.x, dist.y) * pwr * value;
			value += rmd * increment;
		}

		r.alpha = Math.pow(value, alphaExponent);
		r.depth = r.alpha * this.maxDepth;
		r.dHue = dHue;
		return r;
	}

	// --------------------------------------------

	LayerNebula.prototype.normalizeData = function () {
		var minA = this.alphaArray[0];
		var maxA = this.alphaArray[0];
		var minDepth = this.depthArray[0];
		var maxDepth = this.depthArray[0];
		var i;
		var l = this.canvas.width * this.canvas.height;

		for (i = 0; i < l; i++) {
			minA = Math.min(minA, this.alphaArray[i]);
			maxA = Math.max(maxA, this.alphaArray[i]);
			minDepth = Math.min(minDepth, this.depthArray[i]);
			maxDepth = Math.max(maxDepth, this.depthArray[i]);
		}
		var ratioA = 1 / (maxA - minA);
		var ratioDepth = this.maxDepth / (maxDepth - minDepth);

		for (i = 0; i < l; i++) {
			this.alphaArray[i] = ((this.alphaArray[i] - minA) * ratioA);
			this.depthArray[i] = ((this.depthArray[i] - minDepth) * ratioDepth);
		}
	}
	
	// --------------------------------------------

	LayerNebula.prototype.generateNebulaData = function () {
		var w = this.canvas.width;
		var h = this.canvas.height;
		var s = this.settings;
		var minAlpha = 999999;
		var maxAlpha = -99999;

		var minDepth = 999999;
		var maxDepth = -99999;

		for (var y = 0, j = 0; y < h; y++) {
			for (var x = 0; x < w; x++, j++) {
				var d = this.getDataAt(s.offsetX + x / s.scale, s.offsetY + y / s.scale);
				this.alphaArray[j] = d.alpha;
				this.depthArray[j] = d.depth;
				this.dHueArray[j] = d.dHue;

				minAlpha = Math.min(minAlpha, this.alphaArray[j]);
				maxAlpha = Math.max(maxAlpha, this.alphaArray[j]);
				minDepth = Math.min(minDepth, this.depthArray[j]);
				maxDepth = Math.max(maxDepth, this.depthArray[j]);
			}
		}

		console.log('normalize: ' + ((maxAlpha - minAlpha) < 0.5) + ' || ' + (minAlpha > 0.5) + ' || ' + (maxAlpha > 1) + ' || ' + (minDepth < 0) + ' || ' + (maxDepth > this.maxDepth));

		if (((maxAlpha - minAlpha) < 0.5) || (minAlpha > 0.5) || (maxAlpha > 1) || (minDepth < 0) || (maxDepth > this.maxDepth)) {
			s.normalize = true;
			this.normalizeData(this.data);
		}
	}
	
	// --------------------------------------------
	
	LayerNebula.prototype.heightArrayToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvasHeight.width * this.canvasHeight.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var alpha = Math.floor(this.alphaArray[j] * 255);
			imageDataUint8[i] = alpha;
			imageDataUint8[i + 1] = alpha;
			imageDataUint8[i + 2] = alpha;
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasHeight.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasHeight.width, this.canvasHeight.height), 0, 0);
		imageDataUint8 = undefined;
	};
	
	// --------------------------------------------
	
	LayerNebula.prototype.generateNormalMap = function () {
		var w = this.canvas.width - 1;
		var h = this.canvas.height - 1;
		for (var y = 0, j = 0; y <= h; y++) {
			var ndy = (y < h) ? +1 + w : 0;
			var pdy = (y > 0) ? -1 - w : 0;

			for (var x = 0; x <= w; x++, j++) {
				var ndx = (x < w) ? +1 : 0;
				var pdx = (x > 0) ? -1 : 0;

				var topLeft = this.depthArray[j + pdx + pdy];
				var top = this.depthArray[j + pdy];
				var topRight = this.depthArray[j + ndx + pdy];

				var left = this.depthArray[j + pdx];
				var center = this.depthArray[j];
				var right = this.depthArray[j + ndx];

				var bottomLeft = this.depthArray[j + pdx + ndy];
				var bottom = this.depthArray[j + ndy];
				var bottomRight = this.depthArray[j + ndx + ndy];

				var dx = (topRight + 2.0 * right + bottomRight) - (topLeft + 2.0 * left + bottomLeft);
				var dy = (bottomLeft + 2.0 * bottom + bottomRight) - (topLeft + 2.0 * top + topRight);
				var dz = -this.maxDepth;
				this.normalArray[j] = (new Vector3(dx, dy, dz)).normalizeOverwrite();
			}
		}
	}
	
	// --------------------------------------------

	LayerNebula.prototype.normalArrayToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvasNormal.width * this.canvasNormal.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			imageDataUint8[i] = Math.floor(((this.normalArray[j].x + 1) * 0.5) * 255);
			imageDataUint8[i + 1] = Math.floor(((this.normalArray[j].y + 1) * 0.5) * 255);
			//FIXME: ???? why is z different!
			imageDataUint8[i + 2] = Math.floor(((this.normalArray[j].z * -0.5) + 0.5) * 255);
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasNormal.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasNormal.width, this.canvasNormal.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------
	// bit of a hack to ensure bright stars do not appear totaly behind the nebula
	LayerNebula.prototype.pushBrightStarsForward = function () {
		var w = this.canvas.width;
		for (var i = 0; i < this.brightStars.length; i++) {
			var l = this.brightStars[i];
			var z = this.depthArray[l.x + (l.y * w)];
			l.tz = Math.max(z + 10 + l.starRealRadius, l.z);
		}
	}	
	
	// --------------------------------------------
	
	LayerNebula.prototype.generateBrightness = function (dataArray) {
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				this.brightnessArray[j] = this.getBrightnessAt(x, y, this.depthArray[j], this.normalArray[j], this.alphaArray[j], this.brightStars);
			}
		}
	};	

	// --------------------------------------------
		
	LayerNebula.prototype.smoothBrightnes = function (data) {
		var w = this.canvas.width;
		var h = this.canvas.height;
		var w2 = w - 1;
		var h2 = h - 1;

		//FIXME: ignore outer edge...
		for (var y = 1, j = 1 + w; y < h2; y++) {
			for (var x = 1; x < w2; x++, j++) {
				this.smoothBrightnessArray[j] = (this.brightnessArray[j - 1 - w] +
					this.brightnessArray[j - w] +
					this.brightnessArray[j + 1 - w] +
					this.brightnessArray[j - 1] +
					this.brightnessArray[j] +
					this.brightnessArray[j + 1] +
					this.brightnessArray[j - 1 + w] +
					this.brightnessArray[j + w] +
					this.brightnessArray[j + 1 + w]) / 9;
			}
		}
	}

	// --------------------------------------------
	
	LayerNebula.prototype.smoothBrightnessArrayToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvasLight.width * this.canvasLight.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var alpha = Math.floor(this.clamp(0, this.smoothBrightnessArray[j], 1) * 255);
			imageDataUint8[i] = alpha;
			imageDataUint8[i + 1] = alpha;
			imageDataUint8[i + 2] = alpha;
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasLight.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasLight.width, this.canvasLight.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------
		
	LayerNebula.prototype.nebulaToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4);

		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var cBrightness = this.clamp(0, this.smoothBrightnessArray[j], 1);
			var colour = Colour.hslaToRgba((this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor)) % 1, this.settings.colour.s, this.alphaArray[j] + (this.alphaArray[j] * Math.sqrt(Math.max(0, this.smoothBrightnessArray[j] - 1)) / 5), this.alphaArray[j]);

			var alpha = Math.floor(this.clamp(0, this.smoothBrightnessArray[j], 1) * 255);
			imageDataUint8[i] = Math.floor(this.clamp(0, colour.r * cBrightness, 1) * 255);
			imageDataUint8[i + 1] = Math.floor(this.clamp(0, colour.g * cBrightness, 1) * 255); ;
			imageDataUint8[i + 2] = Math.floor(this.clamp(0, colour.b * cBrightness, 1) * 255); ;
			imageDataUint8[i + 3] = Math.floor(this.alphaArray[j] * 255);
		}
		var ctx = this.canvas.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvas.width, this.canvas.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------

	LayerNebula.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		this.generateNebulaData();
		this.heightArrayToCanvas();

		this.generateNormalMap();
		this.normalArrayToCanvas();

		this.pushBrightStarsForward();
		this.generateBrightness();
		this.smoothBrightnes();
		this.smoothBrightnessArrayToCanvas();

		this.nebulaToCanvas();

		this.settings.layer = this;

		this.status = Layer.Status.Success;
	}

	return LayerNebula;
});
