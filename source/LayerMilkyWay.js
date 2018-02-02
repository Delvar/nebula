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
		return ((1 / Math.sqrt(2 * Math.PI)) / std) * Math.pow(Math.E, (-0.5 * Math.pow(x / std, 2)));
	}

	// --------------------------------------------
	// -- 2d Noise, Runs far faster!
	// --------------------------------------------

	function getDistortion2d(x, y, distortionFactor, distortionScale, noisefunc, r) {
		r[0] = noisefunc((x + 13.5) * distortionScale, (y + 13.5) * distortionScale);
		r[1] = noisefunc(x * distortionScale, y * distortionScale);
		r[2] = r[0] * distortionFactor,
		r[3] = r[1] * distortionFactor,
		r[4] = x + r[2];
		r[5] = y + r[3];
	}

	// --------------------------------------------

	var rt = [0, 0, 0, 0];
	var distt = [0, 0, 0, 0, 0, 0];
	
	LayerMilkyWay.prototype.getDataAt = function (originalX, originalY, offsetX, offsetY, scale, nScale) {

		var centeredX = originalX * 4 - 2;
		var centeredY = originalY * 2 - 1;

		//get a gaussian for the position between left @ -2 to right +2
		var g = this.settings.gaussianMultiplier * gaussian(centeredX, 0.3989429999973527) + this.settings.gaussianMin;

		var x = (originalX * this.canvas.width) / scale + offsetX;
		var y = (originalY * this.canvas.height) / scale + offsetY;
		var nx = (originalX * this.canvas.width) / nScale + offsetX;
		var ny = (originalY * this.canvas.height) / nScale + offsetY;

		var tweakFactor = 0.5389692740374481; //(1 / 2.783090005787192) * 1.5; //tweak to get the output in a nice range.

		var lacunarity = this.settings.lacunarity;
		var roughness = this.settings.roughness;
		var distortionFactor = this.settings.distortionFactor;
		var distortionScale = this.settings.distortionScale;
		var alphaExponent = this.settings.alphaExponent;

		var r = rt; // = [0, 0, 0];
		var dist = distt; //[0, 0, 0, 0, 0, 0];

		getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2, dist);
		var dHue = dist[0] * dist[1];
		var value = g + (1 - (Math.abs(centeredY) / g));

		if (isNaN(value)) {
			value = 0;
		}

		var darkValue = Noise.Blender.TwoD.FastVoronoi_F1(nx, ny) * tweakFactor;

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
			getDistortion2d(x, y, distortionFactor, distortionScale, Noise.perlin2, dist);
			increment = (Noise.Blender.TwoD.FastVoronoi_F1(dist[4], dist[5]) * pwr * value);

			dHue += (dist[0] * dist[1] * dHuePwr);
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

				if (this.densityArray[j] < minDensity)
					minDensity = this.densityArray[j];
				if (this.densityArray[j] > maxDensity)
					maxDensity = this.densityArray[j];
				if (this.depthArray[j] < minDepth)
					minDepth = this.depthArray[j];
				if (this.depthArray[j] > maxDepth)
					maxDepth = this.depthArray[j];
				if (this.darkArray[j] < minDark)
					minDark = this.darkArray[j];
				if (this.darkArray[j] > maxDark)
					maxDark = this.darkArray[j];
			}
		}

		//console.log('normalize: ' + ((maxDensity - minDensity) < 0.5) + ' || ' + (minDensity > 0.5) + ' || ' + (maxDensity > 1) + ' || ' + (minDepth < 0) + ' || ' + (maxDepth > this.maxDepth));
		//console.log('maxDensity: ', maxDensity, 'minDensity', minDensity, 'maxDepth', maxDepth, 'minDepth', minDepth, 'maxDark', maxDark, 'minDark', minDark);

		s.normalize = true;
		this.normalizeData(minDensity, maxDensity, minDepth, maxDepth, maxDark, minDark);
	}
	// --------------------------------------------

	var imageDataUint8;
	
	LayerMilkyWay.prototype.densityArrayToCanvas = function () {
		if (typeof this.canvasDensity === "undefined")
			return;
		
		var id = imageDataUint8;
		for (var i = 0, j = 0, l = id.length; i < l; i += 4, j++) {
			var density = this.densityArray[j] * 255;
			id[i] = density;
			id[i + 1] = density;
			id[i + 2] = density;
			id[i + 3] = 255;
		}
		var ctx = this.canvasDensity.getContext("2d");
		ctx.putImageData(new ImageData(id, this.canvasDensity.width, this.canvasDensity.height), 0, 0);
	};

	// --------------------------------------------

	LayerMilkyWay.prototype.depthArrayToCanvas = function () {
		if (typeof this.canvasDepth === "undefined")
			return;
		
		var id = imageDataUint8;
		for (var i = 0, j = 0, l = id.length; i < l; i += 4, j++) {
			var depth = this.depthArray[j] * 255;
			id[i] = depth;
			id[i + 1] = depth;
			id[i + 2] = depth;
			id[i + 3] = 255;
		}
		var ctx = this.canvasDepth.getContext("2d");
		ctx.putImageData(new ImageData(id, this.canvasDepth.width, this.canvasDepth.height), 0, 0);
	};
	// --------------------------------------------

	LayerMilkyWay.prototype.darkArrayToCanvas = function () {
		if (typeof this.canvasDark === "undefined")
			return;
		var id = imageDataUint8;
		for (var i = 0, j = 0, l = id.length; i < l; i += 4, j++) {
			var dark = this.darkArray[j] * 255;
			id[i] = dark;
			id[i + 1] = dark;
			id[i + 2] = dark;
			id[i + 3] = 255;
		}
		var ctx = this.canvasDark.getContext("2d");
		ctx.putImageData(new ImageData(id, this.canvasDark.width, this.canvasDark.height), 0, 0);
	};
	// --------------------------------------------

	LayerMilkyWay.prototype.getDirectLightAt = function (x, y, j) {
		return (Math.pow(this.depthArray[j], 2 + (10 * this.densityArray[j])));
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.generateDirectLight = function () {
		for (var y = 0, j = 0; y < this.canvas.height; y++) {
			for (var x = 0; x < this.canvas.width; x++, j++) {
				this.directLightArray[j] = (Math.pow(this.depthArray[j], 2 + (10 * this.densityArray[j])));//this.getDirectLightAt(x / this.canvas.width, y / this.canvas.height, j);
			}
		}
	};

	// --------------------------------------------

	LayerMilkyWay.prototype.nebulaToCanvas = function () {
		var id = imageDataUint8;
		for (var i = 0, j = 0, l = id.length; i < l; i += 4, j++) {
			var cBrightness = (1 - this.darkArray[j]) * this.settings.brightness;

			var colour = Colour.hslaToRgba((this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor)) % 1, this.settings.colour.s, this.densityArray[j] + (this.densityArray[j] * Math.sqrt(Math.max(0, this.directLightArray[j])) / 2.5), this.densityArray[j]);

			id[i] = colour.r * cBrightness * 255;
			id[i + 1] = colour.g * cBrightness * 255;
			id[i + 2] = colour.b * cBrightness * 255;
			id[i + 3] = this.densityArray[j] * 255;
		}
		var ctx = this.canvas.getContext("2d");
		ctx.putImageData(new ImageData(id, this.canvas.width, this.canvas.height), 0, 0);
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
			var y = ((g * 2 * this.seedRandom.betweenPow(0.04, 1) * this.seedRandom.between(-1, 1)) / 2) + 0.5;

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

		imageDataUint8 = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4);
		
		this.generateNebulaData();
		this.densityArrayToCanvas();

		this.depthArrayToCanvas();
		this.darkArrayToCanvas();

		this.generateDirectLight();

		this.nebulaToCanvas();
		this.splatStars();

		this.settings.layer = this;

		this.status = Layer.Status.Success;
		
		imageDataUint8 = undefined;
	}

	return LayerMilkyWay;
});
