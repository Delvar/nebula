define(
	'LayerNebula2',
	['Layer', 'Colour', 'Noise', 'Vector3',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Noise/Blender/TwoD/FastVoroni'],
	function (Layer, Colour, Noise, Vector3) {
	"use strict";

	function LayerNebula(canvas, canvasNormal, canvasDensity, canvasDirectLight, settings, brightStars, canvasBacklight, canvasDepth) {
		Layer.call(this, canvas);
		this.canvasNormal = canvasNormal;
		this.canvasDensity = canvasDensity;
		this.canvasDirectLight = canvasDirectLight;
		this.canvasBacklight = canvasBacklight;
		this.canvasDepth = canvasDepth;

		this.settings = settings;
		this.brightStars = brightStars || [];
		this.status = Layer.Status.ReadyForProcessing;

		this.densityArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.dHueArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.depthArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.directLightArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.smoothDirectLightArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.backlightArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.normalArray = new Array(this.canvas.width * this.canvas.height);
		
		
		this.maxDepth = this.canvas.width/4;
		this.scale = 1920/this.canvas.width;
		
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

		var r = [0, 0, 0];

		var dist = getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2);
		var dHue = dist.nx * dist.ny;
		var value = Noise.Blender.TwoD.FastVoronoi_F1(dist.x, dist.y) * tweakFactor;

		var roughDepth = (Noise.perlin2(originalX / 750 + offsetX, originalY / 750 + offsetY) + 1) * 0.5;

		//var value = fakeVoronoi(dist.x, dist.y);
		var pwHL = this.settings.powLacunarityRoughness;
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
		//r[1] = (r[1] + (r[0] * 0.005));
		//r[1] = ((roughDepth * 0.9) + (value * 0.1));
		//r[1] = Math.abs(Math.sin((originalX / this.canvas.width) * Math.PI * 10) * Math.sin((originalY / this.canvas.height) * Math.PI * 10));
		//r[1] =  Math.sin(((originalY+originalX ) / this.canvas.width) * Math.PI * 8);//, Math.cos((originalY / this.canvas.width) * Math.PI) * 8);
		//r[1] = this.clamp(0,r[1],1);
		var numberOfDomes = 3;
		var p = this.canvas.width/numberOfDomes/2
		var ox = (originalX-p) * numberOfDomes / (this.canvas.width/2);
		var oy = (originalY-p) * numberOfDomes / (this.canvas.width/2);
		var tx = 1 - Math.abs(ox % 2 - 1);
		var ty = 1 - Math.abs(oy % 2 - 1);
		var over = 1.25;
		var d = Math.sqrt(tx * tx + ty * ty)*over;
		var d = this.clamp(0, d, 1)*Math.PI/2;
		r[1] = Math.cos(d)/ (numberOfDomes*over);

		r[2] = dHue;

		/*

		x = (x - this.settings.offsetX) * this.settings.scale;
		y = (y - this.settings.offsetY) * this.settings.scale;

		var r = {
		alpha: Math.sin((x / this.canvas.width) * Math.PI * 10) * Math.sin((y / this.canvas.height) * Math.PI * 10),
		l: 0,
		dHue: 0
		};

		r.alpha = Math.pow(r.alpha, 10);
		return r;
		 */
		return r;
	}

	// --------------------------------------------

	LayerNebula.prototype.normalizeData = function (minAlpha, maxAlpha, minDepth, maxDepth) {
		var ratioAlpha = 1 / (maxAlpha - minAlpha);
		var ratioDepth = 1 / (maxDepth - minDepth);
		var l = this.canvas.width * this.canvas.height;

		for (var i = 0; i < l; i++) {
			this.densityArray[i] = ((this.densityArray[i] - minAlpha) * ratioAlpha);
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

		this.settings.octaves = Math.floor(this.settings.octaves);

		for (var y = 0, j = 0; y < h; y++) {
			for (var x = 0; x < w; x++, j++) {
				var d = this.getDataAt(x, y, s.offsetX, s.offsetY, s.scale);
				this.densityArray[j] = d[0];
				this.depthArray[j] = d[1];
				this.dHueArray[j] = d[2];

				minAlpha = Math.min(minAlpha, this.densityArray[j]);
				maxAlpha = Math.max(maxAlpha, this.densityArray[j]);
				minDepth = Math.min(minDepth, this.depthArray[j]);
				maxDepth = Math.max(maxDepth, this.depthArray[j]);
			}
		}

		console.log('normalize: ' + ((maxAlpha - minAlpha) < 0.5) + ' || ' + (minAlpha > 0.5) + ' || ' + (maxAlpha > 1) + ' || ' + (minDepth < 0) + ' || ' + (maxDepth > this.maxDepth));
		console.log('maxAlpha: ', maxAlpha, 'minAlpha', minAlpha, 'maxDepth', maxDepth, 'minDepth', minDepth);

		if (((maxAlpha - minAlpha) < 0.5) || (minAlpha > 0.5) || (maxAlpha > 1) || (minDepth < 0) || (maxDepth > this.maxDepth)) {
			//s.normalize = true;
			//this.normalizeData(minAlpha, maxAlpha, minDepth, maxDepth);
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.densityArrayToCanvas = function () {
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

				//var dx = (topRight + 2.0 * right + bottomRight) - (topLeft + 2.0 * left + bottomLeft);
				//var dy = (bottomLeft + 2.0 * bottom + bottomRight) - (topLeft + 2.0 * top + topRight);

				var dx = left - right;
				var dy = top - bottom;
				dx = dx;
				dy = dy;
				//==============
				// from https://squircleart.github.io/shading/normal-map-generation.html

				var nx = Math.pow(Math.pow(dx, -2) + 1, -0.5) * Math.sign(dx);
				var ny = Math.pow(Math.pow(dy, -2) + 1, -0.5) * Math.sign(dy);
				var nz = (1/this.maxDepth) * Math.pow(1 - (nx * nx) + (ny * ny), 0.5);

				this.normalArray[j] = (new Vector3(nx, ny, nz)).normalizeOverwrite();
				//==============
			}
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.normalArrayToCanvas = function () {
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
			//l.tz = l.z;
			//l.z = l.tz = this.maxDepth * 1.1;
			//continue;
			//var z = this.depthArray[l.x + (l.y * w)] * this.maxDepth;
			//l.tz = Math.max(z + 10, l.z);
			//l.tz = z + (this.maxDepth/10);
			l.tz = l.z/this.scale;
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.getDirectLightAt = function (x, y, j) {
		var directLight = 0;

		var depth = this.depthArray[j];
		var normal = this.normalArray[j];
		var density = this.densityArray[j];

		for (var i = 0; i < this.brightStars.length; i++) {
			var l = this.brightStars[i];

			var tDist = Math.sqrt((x - l.x) * (x - l.x) + (y - l.y) * (y - l.y)) * this.scale;
			if (tDist < l.starRadius * 5 && tDist > ((l.starRadius * 5) - 1)) {
				directLight = 2;
				continue;
			} else if (tDist <= (l.starRadius * 5 - 2)) {
				directLight = (x + y) % 2;
				continue;
			}

			//var v = new Vector3(x - l.x, y - l.y, (depth * this.maxDepth) - l.tz);
			var v = new Vector3(l.x - x, l.y - y, l.tz - (depth * this.maxDepth));
			var sqMag = v.squareMagnitude();
			var mag = v.magnitude();

			var mBright = 25/this.scale;
			v.normalizeOverwrite();
			var dotProduct = this.clamp(0, normal.dotProduct(v), 100);
			//var dotProduct = normal.dotProduct(v);
			//directLight += (mBright / mag) * dotProduct * (density/2 + 0.5) * depth;
			directLight += (mBright / mag) * dotProduct;

		}
		return directLight; // * (density / 2 + 0.5) * depth; // + this.settings.ambiant;
	}

	// --------------------------------------------

	LayerNebula.prototype.generateDirectLight = function (dataArray) {
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				this.directLightArray[j] = this.getDirectLightAt(x, y, j);
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
				/*
				this.smoothDirectLightArray[j] = (this.directLightArray[j - 1 - w] +
				this.directLightArray[j - w] +
				this.directLightArray[j + 1 - w] +
				this.directLightArray[j - 1] +
				this.directLightArray[j] +
				this.directLightArray[j + 1] +
				this.directLightArray[j - 1 + w] +
				this.directLightArray[j + w] +
				this.directLightArray[j + 1 + w]) / 9;*/

				this.smoothDirectLightArray[j] = this.directLightArray[j];
			}
		}
	}

	// --------------------------------------------

	LayerNebula.prototype.smoothDirectLightArrayToCanvas = function () {
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

	LayerNebula.prototype.getBacklightAt = function (x, y, j) {

		return 0;

		var backlight = 0;

		var depth = this.depthArray[j];
		var normal = this.normalArray[j];
		var density = this.densityArray[j];

		for (var i = 0; i < this.brightStars.length; i++) {
			var l = this.brightStars[i];
			var mBright = 25 * l.glowRadius * l.brightness;
			var v = new Vector3(l.x - x, l.y - y, l.tz - depth);
			var sqMag = v.squareMagnitude();
			v.normalizeOverwrite();
			var dotProduct = normal.dotProduct(v);
			backlight += (mBright / sqMag) * dotProduct;
		}
		return backlight; // + this.settings.ambiant;
	}

	// --------------------------------------------

	LayerNebula.prototype.generateBacklight = function (dataArray) {
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				this.backlightArray[j] = this.getBacklightAt(x, y, j);
			}
		}
	};

	// --------------------------------------------

	LayerNebula.prototype.backlightArrayToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvasBacklight.width * this.canvasBacklight.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var light = Math.floor(this.clamp(0, this.backlightArray[j], 1) * 255);
			imageDataUint8[i] = light;
			imageDataUint8[i + 1] = light;
			imageDataUint8[i + 2] = light;
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasBacklight.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasBacklight.width, this.canvasBacklight.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------

	LayerNebula.prototype.nebulaToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4);

		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var cBrightness = this.clamp(0, this.smoothDirectLightArray[j], 1);
			var colour = Colour.hslaToRgba((this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor)) % 1, this.settings.colour.s, this.densityArray[j] + (this.densityArray[j] * Math.sqrt(Math.max(0, this.smoothDirectLightArray[j] - 1)) / 5), this.densityArray[j]);

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

		this.generateBacklight();
		this.backlightArrayToCanvas();

		this.nebulaToCanvas();

		this.settings.layer = this;

		this.status = Layer.Status.Success;
	}

	return LayerNebula;
});
