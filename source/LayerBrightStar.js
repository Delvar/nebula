define(
	'LayerBrightStar',
	['Layer', 'Colour', 'Random',
		'Random/SeedRandom'],
	function (Layer, Colour, Random) {
	"use strict";

	function LayerBrightStar(canvas, seed, h, brightness, starRadius, glowRadius, radiusRatio, starRealRadius, glowRealRadius, realWidth, realHeight) {
		Layer.call(this, canvas);
		this.seed = seed;
		this.h = h;
		this.brightness = brightness;
		this.starRadius = starRadius;
		this.glowRadius = glowRadius;
		this.radiusRatio = radiusRatio;
		this.starRealRadius = starRealRadius;
		this.glowRealRadius = glowRealRadius;
		this.realWidth = realWidth;
		this.realHeight = realHeight;
		this.seedRandom = new Random.SeedRandom(seed);
		this.status = Layer.Status.ReadyForProcessing;
	}

	LayerBrightStar.prototype = Object.create(Layer.prototype);
	LayerBrightStar.prototype.constructor = LayerBrightStar;

	LayerBrightStar.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		var flareWidth = this.starRealRadius;
		var grd;

		var aScale = flareWidth / this.realWidth;
		var bScale = this.brightness;

		var flareCount = Math.floor(100);

		var xCenter = Math.floor(this.realWidth / 2);
		var yCenter = Math.floor(this.realHeight / 2);

		ctx.save();
		ctx.globalCompositeOperation = this.compositeOperation;
		grd = ctx.createRadialGradient(0, 0, this.starRealRadius, 0, 0, this.glowRealRadius);
		grd.addColorStop(0, Colour.hslaText(this.h, 1, 1, 0.5 * this.brightness));
		grd.addColorStop(1, Colour.hslaText(this.h, 1, 0.9, 0));
		ctx.fillStyle = grd;

		ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-xCenter, -yCenter, this.realWidth, this.realHeight);

		ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
		ctx.rotate(Math.PI / 2);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-xCenter, -yCenter, this.realWidth, this.realHeight);

		for (var i = 0; i < Math.PI; i = i + this.seedRandom.between(0.01, 0.2)) {
			var sX = this.seedRandom.between(this.radiusRatio, 0.8);
			sX = Math.pow(sX, 3);
			var sY = Math.pow(1 - sX, 3);

			ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
			ctx.rotate(i);
			ctx.scale(aScale * (sY * 2), bScale * sX);
			ctx.globalAlpha = 0.7 - sX;
			ctx.fillRect(-xCenter, -yCenter, this.realWidth, this.realHeight);
		}

		ctx.globalAlpha = 1;

		ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
		grd = ctx.createRadialGradient(0, 0, this.starRealRadius, 0, 0, this.glowRealRadius);
		grd.addColorStop(0, Colour.hslaText(this.h, 1, 0.9, 0.1 * this.brightness));
		grd.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.fillStyle = grd;
		ctx.fillRect(-xCenter, -yCenter, this.realWidth, this.realHeight);

		grd = ctx.createRadialGradient(0, 0, this.starRealRadius * 0.5, 0, 0, this.starRealRadius);
		grd.addColorStop(0, Colour.hslaText(this.h, 1, 1, 1));
		grd.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.fillStyle = grd;
		ctx.fillRect(-xCenter, -yCenter, this.realWidth, this.realHeight);

		ctx.restore();

		this.status = Layer.Status.Success;
	}

	return LayerBrightStar;
});
