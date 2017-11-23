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

	var selectGradient = function (radialGradient, linearGradient, aScale, minScale, ctx) {
		if (aScale < minScale) {
			ctx.fillStyle = linearGradient;
		} else {
			ctx.fillStyle = radialGradient;
		}
	}
	
	LayerBrightStar.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		var radius = this.canvas.width/2;
		var starRealRadius = radius*this.starRadius;
		var glowRealRadius = radius;//Glow radius is already taken into account when sizeing the canvas;
		
		var radialGradient, linearGradient;
		var minScale = 3/this.canvas.width;
		var aScale = Math.max(this.starRadius/2, 1/this.canvas.width);
		var bScale = 1;
		var center = Math.floor(radius);

		ctx.save();
		
		//setup the basic Gradients to be used below fillRects
		ctx.globalCompositeOperation = this.compositeOperation;
		radialGradient = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, glowRealRadius);
		radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 1, 0.5));
		radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.9, 0));
		
		linearGradient = ctx.createLinearGradient(-center, -center, -center, glowRealRadius);
		linearGradient.addColorStop(0, Colour.hslaText(this.h, 1, 0.9, 0));
		linearGradient.addColorStop(0.5, Colour.hslaText(this.h, 1, 1, 0.8));
		linearGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.9, 0));

		//Draw vertical line
		ctx.setTransform(1, 0, 0, 1, center, center);
		selectGradient(radialGradient, linearGradient, aScale, minScale, ctx);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		//Draw horizontal line
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.rotate(Math.PI / 2);
		selectGradient(radialGradient, linearGradient, aScale, minScale, ctx);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		//Draw random lines
		var radiusRatio = this.starRadius/this.glowRadius;
		
		for (var i = 0; i < Math.PI; i = i + this.seedRandom.between(0.01/this.glowRadius, 0.2/this.glowRadius)) {
			var sX = this.seedRandom.between(radiusRatio*2, 0.8);
			sX = Math.pow(sX, 3);
			var sY = Math.pow(1 - sX, 3);
			ctx.setTransform(1, 0, 0, 1, center, center);
			ctx.rotate(i);
			var tScale = Math.max(aScale * (sY * 2), 1/this.canvas.width);
			selectGradient(radialGradient, linearGradient, tScale, minScale, ctx);
			ctx.scale(tScale, Math.max(bScale * sX,this.starRadius*4));
			ctx.globalAlpha = 0.7 - sX;
			ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);
		}

		ctx.globalAlpha = 1;

		ctx.setTransform(1, 0, 0, 1, center, center);
		radialGradient = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, glowRealRadius);
		radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 0.9, 0.1 * this.brightness));
		radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.fillStyle = radialGradient;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		radialGradient = ctx.createRadialGradient(0, 0, starRealRadius * 0.5, 0, 0, starRealRadius);
		radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 1, 1));
		radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.fillStyle = radialGradient;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.height);

		ctx.restore();

		this.status = Layer.Status.Success;
	}

	return LayerBrightStar;
});

