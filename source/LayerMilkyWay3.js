define(
	'LayerMilkyWay3',
	['Layer', 'Colour', 'Noise', 'Vector3', 'Random',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Noise/Blender/TwoD/FastVoroni', 'Random/SeedRandom', 'Random/Gaussian'],
	function (Layer, Colour, Noise, Vector3, Random) {
	"use strict";

	function LayerMilkyWay(canvas, canvasDensity, canvasDark, settings, brightStars) {
		Layer.call(this, canvas);

		this.canvasDensity = canvasDensity;
		this.canvasDark = canvasDark;

		this.settings = settings;
		this.status = Layer.Status.ReadyForProcessing;

		this.densityArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.dHueArray = new Float32Array(this.canvas.width * this.canvas.height);
		this.darkArray = new Array(this.canvas.width * this.canvas.height);

		var seedRandom = new Random.SeedRandom(settings.seed);
		this.seedRandom = seedRandom;
		this.gaussian = new Random.Gaussian(0, this.settings.gaussianVariance, this.settings.gaussianRange, function () {
				return seedRandom.random();
			});

		this.pwHL = Math.pow(this.settings.lacunarity, -(this.settings.roughness*2));
		this.darkPwHL = Math.pow(this.settings.lacunarity, -this.settings.roughness);
		//this.settings.nScale = 100;
	}

	LayerMilkyWay.prototype = Object.create(Layer.prototype);
	LayerMilkyWay.prototype.constructor = LayerMilkyWay;

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

	var tempReturn = [0.0, 0.0, 0.0];
	var tempDistortioneData = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];

	LayerMilkyWay.prototype.getDataAt = function (originalX, originalY, offsetX, offsetY, scale, nScale) {
		var centeredX = originalX * 2 - 1;
		var centeredY = originalY * 2 - 1;

		var pdf = this.gaussian.pdfBase(centeredX);
		var g = pdf * this.settings.gaussianRange;

		var x = (originalX * this.canvas.width) / (scale * 2) + offsetX;
		var y = (originalY * this.canvas.height) / scale + offsetY;

		var nx = (originalX * this.canvas.width) / (nScale * 2) + offsetX;
		var ny = (originalY * this.canvas.height) / nScale + offsetY;

		var r = tempReturn; // = [0, 0, 0];
		var dist = tempDistortioneData; //[0, 0, 0, 0, 0, 0];

		var dHue = 0;
		var abs_y = Math.abs(centeredY);
		var dist_g_edge = 1 - g;
		var dist_g_y = abs_y - g;
		var oDensity;
		var crossPoint = 0.5;

		if (abs_y > g) {
			oDensity = (1 - (dist_g_y / dist_g_edge)) * crossPoint;
		} else {
			oDensity = ((1 - Math.pow(abs_y / g, 3)) * (1 - crossPoint) * pdf) + crossPoint;
		}
		oDensity = this.clamp(0, oDensity, 1);
		var density =0;
		//var darkDensity = Noise.Blender.TwoD.FastVoronoi_F1(nx, ny);// * Noise.Blender.TwoD.FastVoronoi_F1(nx * 0.6, ny * 0.6);
		//var darkDensity = (Noise.perlin2(nx, ny)+1)/2;// * Noise.Blender.TwoD.FastVoronoi_F1(nx * 0.6, ny * 0.6);
		var darkDensity = this.clamp(0, Noise.perlin2(nx, ny),1);
		//darkDensity = this.clamp(0, 1 - Math.pow(darkDensity * 10, 2), 1);
		//darkDensity = this.clamp(0, Math.pow(darkDensity*10, 2), 1);

		var pwHL = this.pwHL;
		var darkPwHL = this.darkPwHL;
		var pwr = pwHL;
		var darkPwr = darkPwHL;
		var dHuePwr = this.settings.dHuePwr;
		var maxPosDensity = 1;

		for (var i = 1; i < this.settings.octaves; i++) {
			getDistortion2d(nx, ny, this.settings.distortionFactor, this.settings.distortionScale, Noise.perlin2, dist);
			//darkDensity += Noise.perlin2(dist[4], dist[5]) * darkPwr;// * darkDensity;
			darkPwr*= darkPwHL;
			nx *= this.settings.lacunarity;
			ny *= this.settings.lacunarity;
			
			getDistortion2d(x, y, this.settings.distortionFactor, this.settings.distortionScale, Noise.perlin2, dist);
			density += this.clamp(0, Noise.Blender.TwoD.FastVoronoi_F1(dist[4], dist[5]), 1) * pwr * (1-oDensity);
			pwr *= pwHL;
						
			dHue += (dist[0] * dist[1] * dHuePwr);
			dHuePwr *= pwHL;
			maxPosDensity += pwr * maxPosDensity;

			x *= this.settings.lacunarity;
			y *= this.settings.lacunarity;
		}
		//console.log('maxPosDensity',maxPosDensity);
		//r[0] = 1 - this.clamp(0, density, 1);
		r[0] = (1-density)*oDensity;// / maxPosDensity;
		r[1] = dHue;
		//r[2] = Math.pow(this.clamp(0, (Math.abs(darkDensity * 1.5)) - 0.25, 1), 5);
		//r[2] = Math.abs(darkDensity);
		r[2] = this.clamp(0, darkDensity, 1);
		return r;
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.normalizeData = function (minDensity, maxDensity, maxDark, minDark) {
		var ratioDensity = 1.0 / (maxDensity - minDensity);
		var ratioDark = 1.0 / (maxDark - minDark);
		var l = this.canvas.width * this.canvas.height;

		for (var i = 0; i < l; i++) {
			this.densityArray[i] = ((this.densityArray[i] - minDensity) * ratioDensity);
			this.darkArray[i] = ((this.darkArray[i] - minDark) * ratioDark);
		}
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.generateNebulaData = function () {
		var w = this.canvas.width;
		var h = this.canvas.height;
		var s = this.settings;
		var minDensity = 999999.0;
		var maxDensity = -99999.0;
		var minDark = 999999.0;
		var maxDark = -99999.0;

		for (var y = 0, j = 0; y < h; y++) {
			for (var x = 0; x < w; x++, j++) {
				var d = this.getDataAt(x / w, y / h, s.offsetX, s.offsetY, s.scale, s.nScale);
				this.densityArray[j] = d[0];
				this.dHueArray[j] = d[1];
				this.darkArray[j] = d[2];

				if (this.densityArray[j] < minDensity)
					minDensity = this.densityArray[j];
				if (this.densityArray[j] > maxDensity)
					maxDensity = this.densityArray[j];
				if (this.darkArray[j] < minDark)
					minDark = this.darkArray[j];
				if (this.darkArray[j] > maxDark)
					maxDark = this.darkArray[j];
			}
		}

		console.log('maxDensity: ', maxDensity, 'minDensity', minDensity, 'maxDark', maxDark, 'minDark', minDark);
		this.normalizeData(minDensity, maxDensity, maxDark, minDark);
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

	LayerMilkyWay.prototype.nebulaToCanvas = function () {
		var id = imageDataUint8;
		for (var i = 0, j = 0, l = id.length; i < l; i += 4, j++) {
			var cBrightness = this.clamp(0, (1 - this.darkArray[j]), 1) * this.settings.brightness;
			var colour = Colour.hslaToRgba(
					(this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor * (1 - this.darkArray[j]))) % 1,
					this.settings.colour.s,
					this.densityArray[j],
					this.densityArray[j]);

			id[i] = colour.r * cBrightness * 255;
			id[i + 1] = colour.g * cBrightness * 255;
			id[i + 2] = colour.b * cBrightness * 255;
			id[i + 3] = 255;//this.densityArray[j] * 255;
		}
		var ctx = this.canvas.getContext("2d");
		ctx.putImageData(new ImageData(id, this.canvas.width, this.canvas.height), 0, 0);
	};

	// --------------------------------------------

	var fillColourArray = [];

	//cache the colour string in an array
	function getColour(hue, saturation, lightness, alpha) {
		var hueIndex = Math.round(hue * 100);
		var saturationIndex = Math.round(saturation * 100);
		var lightnessIndex = Math.round(lightness * 100);
		var alphaIndex = Math.round(alpha * 100);

		var c;
		var hueArray = fillColourArray;
		var saturationArray;
		var lightnessArray;
		var alphaArray;

		if (typeof hueArray[hueIndex] !== 'undefined') {
			saturationArray = hueArray[hueIndex];
		} else {
			saturationArray = hueArray[hueIndex] = [];
		}

		if (typeof saturationArray[saturationIndex] !== 'undefined') {
			lightnessArray = saturationArray[saturationIndex];
		} else {
			lightnessArray = saturationArray[saturationIndex] = [];
		}

		if (typeof lightnessArray[lightnessIndex] !== 'undefined') {
			alphaArray = lightnessArray[lightnessIndex];
		} else {
			alphaArray = lightnessArray[lightnessIndex] = [];
		}

		if (typeof alphaArray[alphaIndex] !== 'undefined') {
			c = alphaArray[alphaIndex];
		} else {
			c = alphaArray[alphaIndex] = Colour.hslaText(hue, saturation, lightness, alpha);
		}

		return c;
	}

	var radialGradientArray = [];

	//cache the gradient object in an array
	function getRadialGradient(hue, saturation, lightness, alpha, ctx, radius) {

		var hueIndex = Math.round(hue * 100);
		var saturationIndex = Math.round(saturation * 100);
		var lightnessIndex = Math.round(lightness * 100);
		var alphaIndex = Math.round(alpha * 100);

		var grd;
		var hueArray = radialGradientArray;
		var saturationArray;
		var lightnessArray;
		var alphaArray;

		if (typeof hueArray[hueIndex] !== 'undefined') {
			saturationArray = hueArray[hueIndex];
		} else {
			saturationArray = hueArray[hueIndex] = [];
		}

		if (typeof saturationArray[saturationIndex] !== 'undefined') {
			lightnessArray = saturationArray[saturationIndex];
		} else {
			lightnessArray = saturationArray[saturationIndex] = [];
		}

		if (typeof lightnessArray[lightnessIndex] !== 'undefined') {
			alphaArray = lightnessArray[lightnessIndex];
		} else {
			alphaArray = lightnessArray[lightnessIndex] = [];
		}

		if (typeof alphaArray[alphaIndex] !== 'undefined') {
			grd = alphaArray[alphaIndex];
		} else {
			grd = alphaArray[alphaIndex] = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
			grd.addColorStop(0, getColour(hue, saturation, lightness, alpha));
			grd.addColorStop(1, getColour(hue, saturation, lightness, 0));
		}

		return grd;
	}

	LayerMilkyWay.prototype.splatStars = function () {
		//canvas to hold the stars...
		var starCanvas = document.createElement('canvas');
		starCanvas.width = this.canvas.width;
		starCanvas.height = this.canvas.height;

		//var ctx = this.canvas.getContext("2d");
		var ctx = starCanvas.getContext("2d");

		ctx.save();

		//ctx.globalCompositeOperation = 'lighten';
		var count = Math.round(this.canvas.width * this.canvas.height * this.settings.brightness * 0.05);
		var dotCount = 0;
		var roundCount = 0;

		for (var i = 0; i < count; i++) {
			var x = this.gaussian.random()*2;

			if (x < -1 || x > 1) {
				i--;
				continue;
			}

			var g = this.gaussian.pdf(x);
			var y = this.gaussian.random() * 2 * (g+0.5);

			if (y < -1 || y > 1) {
				i--;
				continue;
			}

			var realX = Math.floor((x + 1) * 0.5 * this.canvas.width);
			var realY = Math.floor((y + 1) * 0.5 * this.canvas.height);

			var j = realX + realY * this.canvas.width;

			if (this.darkArray[j] > 0.99 || this.densityArray[j] <= 0) {
				//i--;
				continue;
			}

			var density = this.clamp(0,this.densityArray[j],1);
			
			var alpha = density;//this.clamp(0, this.densityArray[j], 1) * (1 - this.darkArray[j]);
			//alpha += this.seedRandom.between(alpha*-0.5, alpha*0.5);
			//alpha = Math.round(alpha * 100) / 100;

			if (alpha <= 0) {
				continue;
			}

			var hue = (this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor * (1 - this.darkArray[j]))) % 1;
			//((this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor))) % 1;
			//hue = Math.round(hue * 100) / 100;
			var saturation = this.settings.colour.s;// + this.seedRandom.between(this.settings.colour.s*-0.1,this.settings.colour.s*0.1);
			//saturation = Math.round(saturation * 100) / 100;
			var lightness = density;// + this.seedRandom.between(this.densityArray[j]*-0.1, this.densityArray[j]*0.1);
			//lightness = Math.round(lightness * 100) / 100;
			var radius = this.seedRandom.betweenPow(0.4, 2, 4.5);

			ctx.setTransform(1, 0, 0, 1, realX, realY);

			if (radius <= 0.5) {
				//ctx.fillStyle = getColour(hue, saturation, lightness, alpha);
				//ctx.fillRect(0, 0, 1, 1);
				dotCount++;
			} else {
				ctx.fillStyle = getRadialGradient(hue, saturation, lightness, alpha, ctx, radius);
				ctx.fillRect(0, 0, radius * 2, radius * 2);
				roundCount++;
			}
		}
		ctx.restore();

		//NOW SPLAT!!!!
		ctx = this.canvas.getContext("2d");
		ctx.save();
		//ctx.globalCompositeOperation = 'lighten';
		ctx.drawImage(starCanvas, 0, 0);
		ctx.restore();

		console.log('count', count, 'dotCount', dotCount, 'roundCount', roundCount);
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.startProcessing = function () {
		this.setProcessingStartTime();
		this.status = Layer.Status.Processing;

		imageDataUint8 = new Uint8ClampedArray(this.canvas.width * this.canvas.height * 4);

		this.generateNebulaData();

		this.densityArrayToCanvas();
		this.darkArrayToCanvas();
		this.nebulaToCanvas();
		this.splatStars();

		this.settings.layer = this;

		this.status = Layer.Status.Success;

		imageDataUint8 = undefined;
		this.setProcessingEndTime();
		//console.log(fillArray);
	}

	return LayerMilkyWay;
});
