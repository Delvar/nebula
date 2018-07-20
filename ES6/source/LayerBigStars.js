import {default as Layer} from './Layer.js';
import * as Random from './Random.js';

export default class LayerBigStars extends Layer {
	constructor(canvas, seed, density) {
		super(canvas);
		this.seed = seed;
		this.density = density;
		this.seedRandom = new Random.SeedRandom(seed);
		this.status = Layer.Status.ReadyForProcessing;
	}
}

/*
define(
	'LayerBigStars',
	['Layer', 'Colour', 'Random',
		'Random/SeedRandom'],
	function (Layer, Colour, Random) {
	"use strict";

	function LayerBigStars(canvas, seed, density) {
		Layer.call(this, canvas);
		this.seed = seed;
		this.density = density;
		this.seedRandom = new Random.SeedRandom(seed);
		this.status = Layer.Status.ReadyForProcessing;
	}

	LayerBigStars.prototype = Object.create(Layer.prototype);
	LayerBigStars.prototype.constructor = LayerBigStars;

	LayerBigStars.prototype.startProcessing = function () {
		this.setProcessingStartTime();
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");
		var count = Math.round(this.canvas.width * this.canvas.height * this.density * 0.005);
		ctx.save();
		for (var i = 0; i < count; i++) {
			var hue = this.seedRandom.random();
			var saturation = this.seedRandom.between(0.9, 1);
			var lightness = this.seedRandom.between(0.8, 1);
			var radius = this.seedRandom.between(0.5, 2);
			var grd = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
			grd.addColorStop(0, Colour.hslaText(hue, saturation, lightness, 1));
			grd.addColorStop(1, Colour.hslaText(hue, saturation, lightness, 0));
			ctx.fillStyle = grd;
			ctx.setTransform(1, 0, 0, 1, Math.floor(this.seedRandom.random() * this.canvas.width), Math.floor(this.seedRandom.random() * this.canvas.height));
			ctx.fillRect(0, 0, radius * 2, radius * 2);
		}
		ctx.restore();
		this.status = Layer.Status.Success;
		this.setProcessingEndTime();
	}

	return LayerBigStars;
});*/
