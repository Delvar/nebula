define(
	'LayerMilkyWay',
	['Layer', 'Colour', 'Noise', 'Vector3', 'Random',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Noise/Blender/TwoD/FastVoroni'],
	function (Layer, Colour, Noise, Vector3, Random) {
	"use strict";

	function LayerMilkyWay(canvas, canvasDensity, canvasDirectLight, canvasDepth, canvasDark, settings, brightStars) {
		Layer.call(this, canvas);

		this.canvasDensity = canvasDensity;
		this.canvasDirectLight = canvasDirectLight;
		this.canvasDepth = canvasDepth;
		this.canvasDark = canvasDark;

		this.settings = settings;
		this.status = Layer.Status.ReadyForProcessing;

		this.densityArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.dHueArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.depthArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.directLightArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.smoothDirectLightArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.darkArray = new Array(this.canvas.width * this.canvas.height);

		this.seedRandom = new Random.SeedRandom(settings.seed);
	}

	LayerMilkyWay.prototype = Object.create(Layer.prototype);
	LayerMilkyWay.prototype.constructor = LayerMilkyWay;

	// --------------------------------------------


	/*
	Std of 0.39894199999735275 outputs 1.0000007028692892 when i =0 ;
	Std of 0.3989429999973527 outputs 0.9999981962437741  when i =0 ;
	and i need the max output to be as close to 1 as i can get ...
	 */

	function gaussian(x, std) {
		var c = Math.pow(x / std, 2);
		var p = -0.5 * c;
		return ((1 / Math.sqrt(2 * Math.PI)) / std) * Math.pow(Math.E, p);

		//c = ((x - m)/s)^2
		//p = -0.5 * c
		//((1/Math.sqrt(2*PI)) / std) * Math.pow(Math.E, p);
		//PLOT ((1/squareroot(2*PI))/s)*(E^(-0.5 * (((x - m)/s)^2))) WHERE s = 0.5 AND m = 0
	}

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

	LayerMilkyWay.prototype.getDataAt = function (originalX, originalY, offsetX, offsetY, scale, nScale) {

		var centeredX = originalX * 4 - 2;
		var centeredY = originalY * 2 - 1;

		//get a gaussian for the position between left @ -2 to right +2
		var g = this.settings.gaussianMultiplier * gaussian(centeredX, 0.3989429999973527) + this.settings.gaussianMin;

		var x = (originalX * this.canvas.width) / scale + offsetX;
		var y = (originalY * this.canvas.height) / scale + offsetY;
		var nx = (originalX * this.canvas.width) / nScale + offsetX;
		var ny = (originalY * this.canvas.height) / nScale + offsetY;

		var tweakFactor = (1 / 2.783090005787192) * 1.5; //tweak to get the output in a nice range.

		var lacunarity = this.settings.lacunarity;
		var roughness = this.settings.roughness;
		var distortionFactor = this.settings.distortionFactor;
		var distortionScale = this.settings.distortionScale;
		var alphaExponent = this.settings.alphaExponent;

		var r = [0, 0, 0];

		var dist = getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2);
		var dHue = dist.nx * dist.ny;

		//value = 2 * Math.sqrt(Math.pow(g, 2) - Math.pow(centeredY, 2));
		//value = value + (g* Math.abs(Math.pow(centeredX,2)));
		var value = g + (1 - (Math.abs(centeredY) / g));

		if (isNaN(value)) {
			value = 0;
		}

		var darkValue = Noise.Blender.TwoD.FastVoronoi_F1(nx, ny) * tweakFactor;

		/*var tValue = Noise.Blender.TwoD.FastVoronoi_F1(nx, ny);
		tValue = tValue + ((Noise.Blender.TwoD.FastVoronoi_F1(nx*2, ny*2)* tweakFactor)/2);
		tValue = tValue + ((Noise.Blender.TwoD.FastVoronoi_F1(nx*3, ny*3)* tweakFactor)/3);
		tValue = tValue + ((Noise.Blender.TwoD.FastVoronoi_F1(nx*4, ny*4)* tweakFactor)/4);
		tValue = tValue + ((Noise.Blender.TwoD.FastVoronoi_F1(nx*5, ny*5)* tweakFactor)/5);
		value =  value + tValue*g;*/

		var pwHL = Math.pow(this.settings.lacunarity, -this.settings.roughness);
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
			darkValue += increment;

			dHuePwr *= pwHL;
			pwr *= pwHL;
			x *= lacunarity;
			y *= lacunarity;
		}

		r[0] = value;
		r[1] = Math.pow(value, alphaExponent);
		r[2] = dHue;
		r[3] = Math.pow(darkValue * 1.2, alphaExponent * 4);

		return r;
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.normalizeData = function (minDensity, maxDensity, minDepth, maxDepth, maxDark, minDark) {
		var ratioDensity = 1.5 / (maxDensity - minDensity);
		var ratioDepth = 1 / (maxDepth - minDepth);
		var ratioDark = 1 / (maxDark - minDark);
		var l = this.canvas.width * this.canvas.height;

		for (var i = 0; i < l; i++) {
			this.densityArray[i] = ((this.densityArray[i] - minDensity) * ratioDensity);
			this.depthArray[i] = ((this.depthArray[i] - minDepth) * ratioDepth);
			this.darkArray[i] = ((this.darkArray[i] - minDark) * ratioDark);
		}
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.generateNebulaData = function () {
		var w = this.canvas.width;
		var h = this.canvas.height;
		var s = this.settings;
		var minDensity = 999999;
		var maxDensity = -99999;
		var minDepth = 999999;
		var maxDepth = -99999;
		var minDark = 999999;
		var maxDark = -99999;

		for (var y = 0, j = 0; y < h; y++) {
			for (var x = 0; x < w; x++, j++) {
				var d = this.getDataAt(x / w, y / h, s.offsetX, s.offsetY, s.scale, s.nScale);
				this.densityArray[j] = d[0];
				this.depthArray[j] = d[1];
				this.dHueArray[j] = d[2];
				this.darkArray[j] = d[3];

				minDensity = Math.min(minDensity, this.densityArray[j]);
				maxDensity = Math.max(maxDensity, this.densityArray[j]);
				minDepth = Math.min(minDepth, this.depthArray[j]);
				maxDepth = Math.max(maxDepth, this.depthArray[j]);
				minDark = Math.min(minDark, this.depthArray[j]);
				maxDark = Math.max(maxDark, this.depthArray[j]);
			}
		}

		//console.log('normalize: ' + ((maxDensity - minDensity) < 0.5) + ' || ' + (minDensity > 0.5) + ' || ' + (maxDensity > 1) + ' || ' + (minDepth < 0) + ' || ' + (maxDepth > this.maxDepth));
		console.log('maxDensity: ', maxDensity, 'minDensity', minDensity, 'maxDepth', maxDepth, 'minDepth', minDepth, 'maxDark', maxDark, 'minDark', minDark);

		s.normalize = true;
		this.normalizeData(minDensity, maxDensity, minDepth, maxDepth, maxDark, minDark);
	}
	// --------------------------------------------

	LayerMilkyWay.prototype.densityArrayToCanvas = function () {
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

	LayerMilkyWay.prototype.depthArrayToCanvas = function () {
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

	LayerMilkyWay.prototype.darkArrayToCanvas = function () {
		if (typeof this.canvasDark === "undefined")
			return;
		
		var imageDataUint8 = new Uint8ClampedArray(this.canvasDark.width * this.canvasDark.height * 4);
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var dark = Math.floor(this.clamp(0, this.darkArray[j], 1) * 255);
			imageDataUint8[i] = dark;
			imageDataUint8[i + 1] = dark;
			imageDataUint8[i + 2] = dark;
			imageDataUint8[i + 3] = 255;
		}
		var ctx = this.canvasDark.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvasDark.width, this.canvasDark.height), 0, 0);
		imageDataUint8 = undefined;
	};
	// --------------------------------------------

	LayerMilkyWay.prototype.getDirectLightAt = function (x, y, j) {
		var depth = this.depthArray[j];
		var density = this.densityArray[j];

		var centeredX = x * 4 - 2;
		var centeredY = y * 2 - 1;
		return (Math.pow(depth, 2 + (10 * density)));
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.generateDirectLight = function () {
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				this.directLightArray[j] = this.getDirectLightAt(x / this.canvas.width, y / this.canvas.height, j);
			}
		}
	};

	// --------------------------------------------

	LayerMilkyWay.prototype.smoothDirectLight = function () {
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
			}
		}
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.smoothDirectLightArrayToCanvas = function () {
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

	LayerMilkyWay.prototype.nebulaToCanvas = function () {
		var imageDataUint8 = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4);

		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var cBrightness = (1 - this.darkArray[j]) * this.settings.brightness;

			var colour = Colour.hslaToRgba((this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor)) % 1, this.settings.colour.s, this.densityArray[j] + (this.densityArray[j] * Math.sqrt(Math.max(0, this.smoothDirectLightArray[j])) / 2.5), this.densityArray[j]);

			imageDataUint8[i] = Math.floor(this.clamp(0, colour.r * cBrightness, 1) * 255);
			imageDataUint8[i + 1] = Math.floor(this.clamp(0, colour.g * cBrightness, 1) * 255); ;
			imageDataUint8[i + 2] = Math.floor(this.clamp(0, colour.b * cBrightness, 1) * 255); ;
			imageDataUint8[i + 3] = Math.floor(this.clamp(0, this.densityArray[j], 1) * 255);
		}
		var ctx = this.canvas.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, this.canvas.width, this.canvas.height), 0, 0);
		imageDataUint8 = undefined;
	};

	// --------------------------------------------

	LayerMilkyWay.prototype.splatStars = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");
		var count = Math.round(this.canvas.width * this.canvas.height * this.settings.brightness * 0.01);

		for (var i = 0; i < count; i++) {
			var x = this.seedRandom.random();
			var centeredX = x * 4 - 2;
			//get a gaussian for the position between left @ -2 to right +2
			var g = this.settings.gaussianMultiplier * gaussian(centeredX, 0.3989429999973527) + this.settings.gaussianMin;
			var y = ((g * 2 * Math.pow(this.seedRandom.between(0.2, 1), 2) * this.seedRandom.between(-1, 1)) / 2) + 0.5;

			if (this.darkArray[Math.floor(x * this.canvas.width) + (Math.floor((y * this.canvas.height)) * this.canvas.width)] > 0.5) {
				continue;
			}

			var hue = this.seedRandom.random();
			var saturation = this.seedRandom.between(0.9, 1);
			var lightness = this.seedRandom.between(0.8, 1);
			var radius = this.seedRandom.betweenPow(0.5, 2, 2);
			var grd = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
			grd.addColorStop(0, Colour.hslaText(hue, saturation, lightness, 1));
			grd.addColorStop(1, Colour.hslaText(hue, saturation, lightness, 0));
			ctx.fillStyle = grd;
			ctx.setTransform(1, 0, 0, 1, x * this.canvas.width, y * this.canvas.height);
			ctx.fillRect(0, 0, radius * 2, radius * 2);
		}
		ctx.restore();
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		this.generateNebulaData();
		this.densityArrayToCanvas();

		this.depthArrayToCanvas();
		this.darkArrayToCanvas();

		this.generateDirectLight();
		this.smoothDirectLight();
		this.smoothDirectLightArrayToCanvas();

		this.nebulaToCanvas();
		this.splatStars();

		this.settings.layer = this;

		this.status = Layer.Status.Success;
	}

	return LayerMilkyWay;
});
