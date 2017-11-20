define(
	'LayerBrightStar',
	['Layer', 'Colour', 'Random',
		'Random/SeedRandom'],
	function (Layer, Colour, Random) {
	"use strict";

	function LayerBrightStar(canvas, seed, h, brightness, starRadius, glowRadius) {
		Layer.call(this, canvas);
		this.seed = seed;
		this.h = h;
		this.brightness = brightness;
		this.starRadius = starRadius;
		this.glowRadius = glowRadius;
		this.seedRandom = new Random.SeedRandom(seed);
		this.status = Layer.Status.ReadyForProcessing;
	}

	LayerBrightStar.prototype = Object.create(Layer.prototype);
	LayerBrightStar.prototype.constructor = LayerBrightStar;

	LayerBrightStar.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		var radius = this.canvas.width/2;
		var starRealRadius = radius*this.starRadius;
		var glowRealRadius = radius;//Glow radius is already taken into account when sizeing the canvas;
		
		var grd;

		var aScale = this.starRadius;
		var bScale = this.brightness;
		var center = Math.floor(radius);

		ctx.save();
		
		//setup the basic Radial Gradient to be used below fillRects
		ctx.globalCompositeOperation = this.compositeOperation;
		grd = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, glowRealRadius);
		grd.addColorStop(0, Colour.hslaText(this.h, 1, 1, 0.5 * this.brightness));
		grd.addColorStop(1, Colour.hslaText(this.h, 1, 0.9, 0));
		ctx.fillStyle = grd;

		//Draw vertical line
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		//Draw horizontal line
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.rotate(Math.PI / 2);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		//Draw random lines
		var radiusRatio = this.starRadius/this.glowRadius;
		
		for (var i = 0; i < Math.PI; i = i + this.seedRandom.between(0.01, 0.2)) {
			var sX = this.seedRandom.between(radiusRatio, 0.8);
			sX = Math.pow(sX, 3);
			var sY = Math.pow(1 - sX, 3);
			ctx.setTransform(1, 0, 0, 1, center, center);
			ctx.rotate(i);
			ctx.scale(aScale * (sY * 2), bScale * sX);
			ctx.globalAlpha = 0.7 - sX;
			ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);
		}

		ctx.globalAlpha = 1;

		ctx.setTransform(1, 0, 0, 1, center, center);
		grd = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, glowRealRadius);
		grd.addColorStop(0, Colour.hslaText(this.h, 1, 0.9, 0.1 * this.brightness));
		grd.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.fillStyle = grd;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		grd = ctx.createRadialGradient(0, 0, starRealRadius * 0.5, 0, 0, starRealRadius);
		grd.addColorStop(0, Colour.hslaText(this.h, 1, 1, 1));
		grd.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.fillStyle = grd;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		ctx.restore();

		this.status = Layer.Status.Success;
	}

	return LayerBrightStar;
});

