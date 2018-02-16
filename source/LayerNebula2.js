define(
	'LayerNebula2',
	['Layer', 'Colour', 'Noise', 'Vector3', 'Random',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Noise/Blender/TwoD/FastVoroni', 'Random/SeedRandom'],
	function (Layer, Colour, Noise, Vector3, Random) {
	"use strict";

	function LayerNebula(canvas, canvasNormal, canvasDensity, canvasDirectLight, canvasDepth, settings, brightStars) {
		Layer.call(this, canvas);
		this.canvasNormal = canvasNormal;
		this.canvasDensity = canvasDensity;
		this.canvasDirectLight = canvasDirectLight;
		this.canvasDepth = canvasDepth;

		this.settings = settings;
		this.brightStars = brightStars || [];
		this.status = Layer.Status.ReadyForProcessing;

		this.densityArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.dHueArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.depthArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.directLightArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.smoothDirectLightArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.normalArray = new Array(this.canvas.width * this.canvas.height);

		this.seedRandom = new Random.SeedRandom(settings.seed);
	}

	LayerNebula.prototype = Object.create(Layer.prototype);
	LayerNebula.prototype.constructor = LayerNebula;

	// --------------------------------------------
	// -- 2d Noise, Runs far faster!
	// --------------------------------------------

	function getDistortion2d(x, y, distortionFactor, distortionScale, noisefunc) {
		var r = {};
		r.nx = noisefunc((x + 13.5) * distortionScale, (y + 13.5) * distortionScale);
		r.ny = noisefunc(x * distortionScale, y * distortionScale);
		r.dx = r.nx * distortionFactor,
		r.dy = r.ny * distortionFactor,
		r.x = x + r.dx;
		r.y = y + r.dy;
		return r;
	}

	function fakeVoronoi(x, y) {
		var x = Noise.perlin2(x, y);
		x = x * x;
		return x;
	}

	// --------------------------------------------

	LayerNebula.prototype.getDataAt = function (originalX, originalY, offsetX, offsetY, scale) {
		var x = originalX / scale + offsetX;
		var y = originalY / scale + offsetY;

		var tweakFactor = (1 / 2.783090005787192) * 1.5; //tweak to get the output in a nice range.

		var lacunarity = this.settings.lacunarity;
		var roughness = this.settings.roughness;
		var distortionFactor = this.settings.distortionFactor;
		var distortionScale = this.settings.distortionScale;
		var alphaExponent = this.settings.alphaExponent;

		var r = [0.0, 0.0, 0.0];

		var dist = getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2);
		var dHue = dist.nx * dist.ny;
		var value = Noise.Blender.TwoD.FastVoronoi_F1(dist.x, dist.y) * tweakFactor;

		var pwHL = Math.pow(this.settings.lacunarity, -this.settings.roughness); //this.settings.powLacunarityRoughness;
		var pwr = pwHL;
		var dHuePwr = this.settings.dHuePwr;

		x *= lacunarity;
		y *= lacunarity;

		var increment;

		if (value <= 0) {
			return r;
		}

		for (var i = 1; i < this.settings.octaves; i++) {
			dist = getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2);
			increment = (Noise.Blender.TwoD.FastVoronoi_F1(dist.x, dist.y) * pwr * value);
			//increment = (fakeVoronoi(dist.x, dist.y) * pwr * value);

			dHue += (dist.nx * dist.ny * dHuePwr);
			value += increment;

			dHuePwr *= pwHL;
			pwr *= pwHL;
			x *= lacunarity;
			y *= lacunarity;
		}

		r[0] = Math.pow(value, alphaExponent);
		r[1] = value * 0.5;

		/* // Make depth domes...
		var numberOfDomes = 1;
		var p = this.canvas.width / numberOfDomes / 2;
		var ox = (originalX - p) * numberOfDomes / (this.canvas.width / 2);
		var oy = (originalY - p) * numberOfDomes / (this.canvas.width / 2);
		var tx = 1 - Math.abs(ox % 2 - 1);
		var ty = 1 - Math.abs(oy % 2 - 1);
		var over = 1.25;
		var d = Math.sqrt(tx * tx + ty * ty) * over;
		var d = this.clamp(0, d, 1) * Math.PI / 2;
		r[1] = Math.cos(d) / (numberOfDomes * over);
		 */

		r[2] = dHue;
		return r;
	}

	// --------------------------------------------

	LayerNebula.prototype.normalizeData = function (minDensity, maxDensity, minDepth, maxDepth) {
		var ratioDensity = 1 / (maxDensity - minDensity);
		var ratioDepth = 0.5 / (maxDepth - minDepth);
		var l = this.canvas.width * this.canvas.height;

		for (var i = 0; i < l; i++) {
			this.densityArray[i] = ((this.densityArray[i] - minDensity) * ratioDensity);
			this.depthArray[i] = ((this.depthArray[i] - minDepth) * ratioDepth);
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.generateNebulaData = function () {
		var w = this.canvas.width;
		var h = this.canvas.height;
		var s = this.settings;
		var minDensity = 999999;
		var maxDensity = -99999;
		var minDepth = 999999;
		var maxDepth = -99999;

		this.settings.octaves = Math.floor(this.settings.octaves);

		for (var y = 0, j = 0; y < h; y++) {
			for (var x = 0; x < w; x++, j++) {
				var d = this.getDataAt(x, y, s.offsetX, s.offsetY, s.scale);
				this.densityArray[j] = d[0];
				this.depthArray[j] = d[1];
				this.dHueArray[j] = d[2];

				minDensity = Math.min(minDensity, this.densityArray[j]);
				maxDensity = Math.max(maxDensity, this.densityArray[j]);
				minDepth = Math.min(minDepth, this.depthArray[j]);
				maxDepth = Math.max(maxDepth, this.depthArray[j]);
			}
		}

		console.log('normalize: ' + ((maxDensity - minDensity) < 0.5) + ' || ' + (minDensity > 0.5) + ' || ' + (maxDensity > 1) + ' || ' + (minDepth < 0) + ' || ' + (maxDepth > this.maxDepth));
		console.log('maxDensity: ', maxDensity, 'minDensity', minDensity, 'maxDepth', maxDepth, 'minDepth', minDepth);

		if (((maxDensity - minDensity) < 0.5) || (minDensity > 0.5) || (maxDensity > 1) || (minDepth < 0) || (maxDepth > this.maxDepth)) {
			s.normalize = true;
			this.normalizeData(minDensity, maxDensity, minDepth, maxDepth);
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.densityArrayToCanvas = function () {
		if (typeof this.canvasDensity === "undefined")
			return;

		var imageDataUint8 = new Uint8ClampedArray(this.canvasDensity.width * this.canvasDensity.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var density = Math.floor(this.clamp(0, this.densityArray[j], 1) * 255);
			imageDataUint8[i] = density;
			imageDataUint8[i + 1] = density;
			imageDataUint8[i + 2] = density;
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasDensity.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasDensity.width, this.canvasDensity.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------

	LayerNebula.prototype.depthArrayToCanvas = function () {
		if (typeof this.canvasDepth === "undefined")
			return;

		var imageDataUint8 = new Uint8ClampedArray(this.canvasDepth.width * this.canvasDepth.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var depth = Math.floor(this.clamp(0, this.depthArray[j], 1) * 255);
			imageDataUint8[i] = depth;
			imageDataUint8[i + 1] = depth;
			imageDataUint8[i + 2] = depth;
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasDepth.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasDepth.width, this.canvasDepth.height), 0, 0);
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

				//==============
				// from https://en.wikipedia.org/wiki/Sobel_operator

				var topLeft = this.depthArray[j + pdx + pdy];
				var top = this.depthArray[j + pdy];
				var topRight = this.depthArray[j + ndx + pdy];

				var left = this.depthArray[j + pdx];
				var center = this.depthArray[j];
				var right = this.depthArray[j + ndx];

				var bottomLeft = this.depthArray[j + pdx + ndy];
				var bottom = this.depthArray[j + ndy];
				var bottomRight = this.depthArray[j + ndx + ndy];

				var dx = (topLeft + 2.0 * left + bottomLeft) - (topRight + 2.0 * right + bottomRight);
				var dy = (topLeft + 2.0 * top + topRight) - (bottomLeft + 2.0 * bottom + bottomRight);

				//==============
				// from https://squircleart.github.io/shading/normal-map-generation.html

				var nx = Math.pow(Math.pow(dx, -2) + 1, -0.5) * Math.sign(dx);
				var ny = Math.pow(Math.pow(dy, -2) + 1, -0.5) * Math.sign(dy);
				//var nz = (1 / this.maxDepth) * Math.pow(1 - (nx * nx) + (ny * ny), 0.5);
				var nz = 0.5 * Math.pow(1 - (nx * nx) + (ny * ny), 0.5);

				this.normalArray[j] = (new Vector3(nx, ny, nz)).normalizeOverwrite();
				//==============
			}
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.normalArrayToCanvas = function () {
		if (typeof this.canvasNormal === "undefined")
			return;

		var imageDataUint8 = new Uint8ClampedArray(this.canvasNormal.width * this.canvasNormal.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			imageDataUint8[i] = Math.floor(this.clamp(0, this.normalArray[j].x * 0.5 + 0.5, 1) * 255);
			imageDataUint8[i + 1] = Math.floor(this.clamp(0, this.normalArray[j].y * 0.5 + 0.5, 1) * 255);
			imageDataUint8[i + 2] = Math.floor(this.clamp(0, this.normalArray[j].z * 0.5 + 0.5, 1) * 255);
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
			var z = this.depthArray[l.realX + (l.realY * w)];
			l.tz = Math.max(z + this.seedRandom.between(0.005, 0.02), l.z);
		}
	}

	// --------------------------------------------
	var tempVector3 = new Vector3();

	LayerNebula.prototype.getDirectLightAt = function (x, y, j) {
		var directLight = 0;

		var depth = this.depthArray[j];
		var normal = this.normalArray[j];
		var density = this.densityArray[j];

		var v = tempVector3; //new Vector3();
		var aspect = this.canvas.height / this.canvas.width;
		var dotProduct = 0;

		for (var i = 0; i < this.brightStars.length; i++) {
			var l = this.brightStars[i];

			/*
			var rx = x * this.canvas.width;
			var ry = y * this.canvas.height;

			var lrx = l.x * this.canvas.width;
			var lry = l.y * this.canvas.height;

			var tDist = Math.sqrt((rx - lrx) * (rx - lrx) + (ry - lry) * (ry - lry));
			if (tDist < 10 && tDist > 8) {
			directLight = 2;
			continue;
			} else if (tDist <= 8) {
			directLight = (rx + ry) % 2;
			continue;
			}
			 */

			v.x = l.x - x;
			v.y = (l.y - y) * aspect;
			v.z = l.tz - depth;

			var sqMag = v.squareMagnitude();
			var mag = Math.sqrt(sqMag);

			if (mag > 0) {
				v.x = v.x / mag;
				v.y = v.y / mag;
				v.z = v.z / mag;
			} else {
				v.x = 0;
				v.y = 0;
				v.z = 0;
			}

			sqMag = sqMag * 250;

			dotProduct = normal.dotProduct(v);
			dotProduct = Math.pow(dotProduct, 5) * Math.sign(dotProduct);
			directLight += (l.brightness / sqMag) * dotProduct

		}
		v.x = 0.5 - x;
		v.y = (0.5 - y) * aspect;
		v.z = 10;
		dotProduct = normal.dotProduct(v.normalizeOverwrite());

		//v.destroy();
		return directLight + (Math.pow(Math.max(dotProduct, 0), 2 + (10 * density)) * this.settings.ambiant);
	}

	// --------------------------------------------

	LayerNebula.prototype.generateDirectLight = function (dataArray) {
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				this.directLightArray[j] = this.getDirectLightAt(x / this.canvas.width, y / this.canvas.height, j);
			}
		}
	};

	// --------------------------------------------

	LayerNebula.prototype.smoothDirectLight = function (data) {
		var w = this.canvas.width;
		var h = this.canvas.height;
		var w2 = w - 1;
		var h2 = h - 1;

		//FIXME: ignore outer edge...
		for (var y = 1, j = 1 + w; y < h2; y++) {
			for (var x = 1; x < w2; x++, j++) {

				this.smoothDirectLightArray[j] = (this.directLightArray[j - 1 - w] +
					this.directLightArray[j - w] +
					this.directLightArray[j + 1 - w] +
					this.directLightArray[j - 1] +
					this.directLightArray[j] +
					this.directLightArray[j + 1] +
					this.directLightArray[j - 1 + w] +
					this.directLightArray[j + w] +
					this.directLightArray[j + 1 + w]) / 9;

				//this.smoothDirectLightArray[j] = this.directLightArray[j];
			}
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.smoothDirectLightArrayToCanvas = function () {
		if (typeof this.canvasDirectLight === "undefined")
			return;

		var imageDataUint8 = new Uint8ClampedArray(this.canvasDirectLight.width * this.canvasDirectLight.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var light = Math.floor(this.clamp(0, this.smoothDirectLightArray[j], 1) * 255);
			imageDataUint8[i] = light;
			imageDataUint8[i + 1] = light;
			imageDataUint8[i + 2] = light;
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasDirectLight.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasDirectLight.width, this.canvasDirectLight.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------

	LayerNebula.prototype.nebulaToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4);

		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var cBrightness = this.clamp(0, this.smoothDirectLightArray[j], 1);
			var colour = Colour.hslaToRgba((this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor)) % 1, this.settings.colour.s, this.densityArray[j] + (this.densityArray[j] * Math.sqrt(Math.max(0, this.smoothDirectLightArray[j] - 1)) / 2.5), this.densityArray[j]);

			imageDataUint8[i] = Math.floor(this.clamp(0, colour.r * cBrightness, 1) * 255);
			imageDataUint8[i + 1] = Math.floor(this.clamp(0, colour.g * cBrightness, 1) * 255); ;
			imageDataUint8[i + 2] = Math.floor(this.clamp(0, colour.b * cBrightness, 1) * 255); ;
			imageDataUint8[i + 3] = Math.floor(this.densityArray[j] * 255);
		}
		var ctx = this.canvas.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvas.width, this.canvas.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------

	LayerNebula.prototype.startProcessing = function () {
		this.setProcessingStartTime();
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		this.generateNebulaData();
		this.densityArrayToCanvas();

		this.depthArrayToCanvas();

		this.generateNormalMap();
		this.normalArrayToCanvas();

		this.pushBrightStarsForward();
		this.generateDirectLight();
		this.smoothDirectLight();
		this.smoothDirectLightArrayToCanvas();

		this.nebulaToCanvas();

		this.settings.layer = this;

		this.status = Layer.Status.Success;
		this.setProcessingEndTime();
	}

	return LayerNebula;
});
