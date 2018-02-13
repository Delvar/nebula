define(
	'LayerMilkyWay',
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
		this.gaussian = new Random.Gaussian(0, this.settings.gaussianVariance, this.settings.gaussianRange, function(){return seedRandom.random()} );
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

		var g = this.gaussian.pdf(centeredX)*0.9;

		var x = (originalX * this.canvas.width) / scale + offsetX;
		var y = (originalY * this.canvas.height) / scale + offsetY;

		var nx = (originalX * this.canvas.width) / nScale + offsetX;
		var ny = (originalY * this.canvas.height) / nScale + offsetY;
		
		var r = tempReturn; // = [0, 0, 0];
		var dist = tempDistortioneData; //[0, 0, 0, 0, 0, 0];

		var dHue = 0;
		var abs_y = Math.abs(centeredY);
		var dist_g_edge = 1 - g;
		var dist_g_y = abs_y - g;
		var glow = 1-(dist_g_y / dist_g_edge);

		//var density = Math.pow(Math.abs(glow),4);
		var density = glow;
				
		var darkDensity = Noise.Blender.TwoD.FastVoronoi_F1(nx*0.5,ny*0.5) + Noise.Blender.TwoD.FastVoronoi_F1(nx,ny);
		darkDensity = this.clamp(0,1-Math.pow(darkDensity,2),1);

		var pwHL = Math.pow(this.settings.lacunarity, -this.settings.roughness);
		var pwr = pwHL;
		var dHuePwr = this.settings.dHuePwr;

		for (var i = 1; i < this.settings.octaves; i++) {
			getDistortion2d(x, y, this.settings.distortionFactor, this.settings.distortionScale, Noise.perlin2, dist);
			dHue += (dist[0] * dist[1] * dHuePwr);
			//density += (Noise.Blender.TwoD.FastVoronoi_F1(dist[4], dist[5]) * pwr * density);
			darkDensity += Noise.perlin2(dist[4], dist[5]) * pwr;
			dHuePwr *= pwHL;
			pwr *= pwHL;
			x *= this.settings.lacunarity;
			y *= this.settings.lacunarity;
		}
		//r[0] = this.clamp(0, Math.pow(density,4),1);
		//r[0] = Math.pow(density,4);
		r[0] = density;
		r[1] = dHue;
		r[2] = Math.pow(this.clamp(0, (Math.abs(darkDensity) * 1.5) - 0.25, 1), 5);
		//r[2] = Math.abs(darkDensity);

		return r;
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.normalizeData = function (minDensity, maxDensity, maxDark, minDark) {
		var ratioDensity = 4.0 / (maxDensity - minDensity);
		//var ratioDark = 1.0 / (maxDark - minDark);
		var l = this.canvas.width * this.canvas.height;

		for (var i = 0; i < l; i++) {
			this.densityArray[i] = ((this.densityArray[i] - minDensity) * ratioDensity);
			//this.darkArray[i] = ((this.darkArray[i] - minDark) * ratioDark);
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
					(this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor * (1-this.darkArray[j]))) % 1,
					this.settings.colour.s,
					this.densityArray[j],
					this.densityArray[j]);

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
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);

		ctx.globalCompositeOperation = 'lighten';
		var count = Math.round(this.canvas.width * this.canvas.height * this.settings.brightness * 0.05);
		var dotCount = 0;
		var roundCount = 0;

		for (var i = 0; i < count; i++) {
			var x = this.gaussian.random();

			if (x < -1 || x > 1) {
				i--;
				continue;
			}

			var g = this.gaussian.pdf(x);
			var y = this.gaussian.random() * (g*2+0.25);

			if (y < -1 || y > 1) {
				i--;
				continue;
			}

			var realX = Math.floor((x + 1) * 0.5 * this.canvas.width);
			var realY = Math.floor((y + 1) * 0.5 * this.canvas.height);
			
			var j = realX + realY * this.canvas.width;

			if (this.darkArray[j] > 0.99) {
				//i--;
				continue;
			}

			var hue = ((this.settings.colour.h + (this.dHueArray[j] * this.settings.hueFactor))) % 1;
			var saturation = this.settings.colour.s;
			var lightness = this.densityArray[j] * this.seedRandom.between(0.1, 1);
			var radius = this.seedRandom.betweenPow(0.4, 2, 4);
			//var alpha =  this.clamp(0,this.densityArray[j],1) * this.clamp(0,Math.pow(1-this.darkArray[j],2),1);
			var alpha =  this.clamp(0,this.densityArray[j],1) * (1-this.darkArray[j]);
			ctx.setTransform(1, 0, 0, 1, realX, realY);

			if (radius <= 0.5) {
				ctx.fillStyle = Colour.hslaText(hue, saturation, lightness, alpha);
				ctx.fillRect(0, 0, 1, 1);
				dotCount++;
			} else {
				var grd = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
				grd.addColorStop(0, Colour.hslaText(hue, saturation, lightness, alpha));
				grd.addColorStop(1, Colour.hslaText(hue, saturation, lightness, 0));
				ctx.fillStyle = grd;
				ctx.fillRect(0, 0, radius * 2, radius * 2);
				roundCount++;
			}
		}
		ctx.restore();
		console.log('count', count, 'dotCount', dotCount, 'roundCount', roundCount);
	}

	// --------------------------------------------

	LayerMilkyWay.prototype.startProcessing = function () {
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
	}

	return LayerMilkyWay;
});
