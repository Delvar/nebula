define(
	'LayerPointStars',
	['Layer', 'Colour', 'Random',
		'Random/SeedRandom'],
	function (Layer, Colour, Random) {
	"use strict";

	function LayerPointStars(canvas, seed, density, brightness) {
		Layer.call(this, canvas);
		this.seed = seed;
		this.density = density;
		this.brightness = brightness;
		this.status = Layer.Status.ReadyForProcessing;

		this.seedRandom = new Random.SeedRandom(seed);
	}

	LayerPointStars.prototype = Object.create(Layer.prototype);
	LayerPointStars.prototype.constructor = LayerPointStars;

	LayerPointStars.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;

		var wxh = this.canvas.width * this.canvas.height;
		var count = Math.round(wxh * this.density);
		var m = new Array(wxh);
		for (var i = 0; i < count; i++) {
			var p = Math.floor(this.seedRandom.random() * wxh);
			var hue = this.seedRandom.random();
			var saturation = this.seedRandom.random() * 0.3;
			var lightness = Math.log(1 - this.seedRandom.random()) * -this.brightness;
			m[p] = new Colour.hsla(hue, saturation, lightness, 1);
		}

		this.colourArrayToCanvas(m, this.canvas);
		this.status = Layer.Status.Success;
	}

	return LayerPointStars;
});
