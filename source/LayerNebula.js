define(
	'LayerNebula',
	['Layer', 'Colour', 'Noise',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Noise/Blender/TwoD/FastVoroni'],
	function (Layer, Colour, Noise) {
	"use strict";

	function LayerNebula(canvas, dCanvas, dmCanvas, dmDCanvas, settings) {
		Layer.call(this, canvas);
		this.dCanvas = dCanvas;
		this.dmCanvas = dmCanvas;
		this.dmDCanvas = dmDCanvas;
		this.settings = settings;
		this.status = Layer.Status.ReadyForProcessing;
	}

	LayerNebula.prototype = Object.create(Layer.prototype);
	LayerNebula.prototype.constructor = LayerNebula;

	// --------------------------------------------
	// -- 2d Noise, Runs far faster!
	// --------------------------------------------

	function getDistortion2d(x, y, distortion, distortionScale, noisefunc) {
		return {
			x: x + noisefunc((x + 13.5) * distortionScale, (y + 13.5) * distortionScale) * distortion,
			y: y + noisefunc((x) * distortionScale, (y) * distortionScale) * distortion,
		};
	}

	function getDensity2d(x, y, H, lacunarity, octaves, offset, noisefunc, distortion, distortionScale, distortfunk) {
		var value,
		increment,
		rmd;
		var i;

		var d = getDistortion2d(x, y, distortion, distortionScale, distortfunk);

		value = offset + noisefunc(d.x, d.y);

		if (value < 0.0001) {
			return 0;
		}

		var pwHL = Math.pow(lacunarity, -H);
		var pwr = pwHL;

		x *= lacunarity;
		y *= lacunarity;

		for (i = 1; i < Math.floor(octaves); i++) {
			var d = getDistortion2d(x, y, distortion, distortionScale, distortfunk);
			increment = (noisefunc(d.x, d.y) + offset) * pwr * value;
			value += increment;
			pwr *= pwHL;
			x *= lacunarity;
			y *= lacunarity;
		}

		rmd = octaves - Math.floor(octaves);
		if (rmd != 0.0) {
			increment = (noisefunc(x, y) + offset) * pwr * value;
			value += rmd * increment;
		}
		return value;
	}

	LayerNebula.prototype.generateDensityFloatArray = function (s) {
		var m = new Float32Array(this.dCanvas.width * this.dCanvas.height);

		for (var x = 0, j = 0; x < this.dCanvas.height; x++) {
			for (var y = 0; y < this.dCanvas.width; y++, j++) {
				m[j] = Math.pow(getDensity2d(s.dx + x / s.scale, s.dy + y / s.scale, s.h, s.lacunarity, s.octaves, s.offset, Noise.Blender.TwoD.FastVoronoi_F1, s.distortion, s.distortionScale, Noise.perlin2), s.exponent);
			}
		}
		return m;
	}

	LayerNebula.prototype.generateNebulaColourArray = function (density, s) {
		var m = new Array(this.canvas.width * this.canvas.height);

		for (var x = 0, j = 0; x < this.canvas.height; x++) {
			for (var y = 0; y < this.canvas.width; y++, j++) {
				m[j] = new Colour.hsla(s.colour.h, s.colour.s, (density[j] * 0.5 + 0.5) * s.colour.l, density[j] * s.colour.a);
			}
		}
		return m;
	};

	// --------------------------------------------

	LayerNebula.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");
		console.log(this.settings);

		var density = this.generateDensityFloatArray(this.settings.density);
		this.normalizeFloatArray(density, 0, 1);
		this.floatArrayToCanvas(density, this.dCanvas);

		var nebulaColourArray = this.generateNebulaColourArray(density, this.settings);
		this.colourArrayToCanvas(nebulaColourArray, this.canvas);

		if (this.settings.darkMatter != undefined) {
			var dmDensity = this.generateDensityFloatArray(this.settings.darkMatter.density);
			this.normalizeFloatArray(dmDensity, 0, 1);
			this.floatArrayToCanvas(dmDensity, this.dmDCanvas);

			var nebulaColourArray = this.generateNebulaColourArray(dmDensity, this.settings.darkMatter);
			this.colourArrayToCanvas(nebulaColourArray, this.dmCanvas);

			var ctx = this.canvas.getContext("2d");
			ctx.save();
			ctx.globalCompositeOperation = 'multiply';
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.drawImage(this.dmCanvas, 0, 0);
			ctx.restore();
		}

		this.status = Layer.Status.Success;
	}

	return LayerNebula;
});
