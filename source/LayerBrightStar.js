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

	LayerBrightStar.prototype.drawLine = function (aScale, bScale, ctx, rotation, brightness) {
		var width = this.canvas.width;
		var starRealRadius = this.starRadius * width;
		var center = width / 2; //realRadius
		var lineWidth = (aScale * width);

		if (lineWidth <= 2) { //Stroke with radialGradient
			//console.log("lineWidth <= 1", lineWidth, this.seed);
			var lineLength = (bScale * width) / 2;

			var startX = center + (lineLength * Math.cos(rotation));
			var startY = center + (lineLength * Math.sin(rotation));
			var endX = center + (lineLength * Math.cos(rotation + Math.PI));
			var endY = center + (lineLength * Math.sin(rotation + Math.PI));

			var radialGradient = ctx.createRadialGradient(center, center, starRealRadius, center, center, lineLength);
			radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 1, 0.5 * brightness));
			radialGradient.addColorStop(0.5, Colour.hslaText((this.h + 0.3) % 1, 1, 0.7, 0.25 * brightness));
			radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.6, 0));

			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(1, 1);
			ctx.lineWidth = Math.max(lineWidth, 1);
			ctx.strokeStyle = radialGradient;
			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.stroke();
		}
		/*else if (lineWidth <= 3) { //Fill linear
		//console.log("lineWidth <= 3", lineWidth, this.seed);
		var linearGradient = ctx.createLinearGradient(-center, -center, -center, center);
		linearGradient.addColorStop(0, Colour.hslaText(this.h, 1, 0.7, 0));
		linearGradient.addColorStop(0.25, Colour.hslaText((this.h + 0.5) % 1, 1, 0.8, 0.25 * brightness));
		linearGradient.addColorStop(0.5, Colour.hslaText(this.h, 1, 1, 0.5 * brightness));
		linearGradient.addColorStop(0.75, Colour.hslaText((this.h + 0.5) % 1, 1, 0.8, 0.25 * brightness));
		linearGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.7, 0));
		ctx.fillStyle = linearGradient;
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.rotate(rotation);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-center, -center, width, width);
		} */
		else { //Fill radial
			//console.log("lineWidth > 3", lineWidth, this.seed);
			var radialGradient = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, center);
			radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 1, 0.5 * brightness));
			radialGradient.addColorStop(0.5, Colour.hslaText((this.h + 0.3) % 1, 1, 0.7, 0.25 * brightness));
			radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.6, 0));
			ctx.fillStyle = radialGradient;
			ctx.setTransform(1, 0, 0, 1, center, center);
			ctx.rotate(rotation);
			ctx.scale(aScale, bScale);
			ctx.fillRect(-center, -center, width, width);
		}
	}

	LayerBrightStar.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		var radius = this.canvas.width / 2;
		var starRealRadius = this.starRadius * this.canvas.width;
		var center = radius;

		ctx.save();
		ctx.globalCompositeOperation = this.compositeOperation;

		//Draw vertical line
		this.drawLine(this.starRadius, 1, ctx, 0, this.brightness);

		//Draw horizontal line
		this.drawLine(this.starRadius, 1, ctx, Math.PI / 2, this.brightness);

		//Draw random lines
		for (var i = 0; i < Math.PI * 2; i = i + this.seedRandom.between(Math.PI / (4 + (40 * this.brightness)), Math.PI / (2 + (20 * this.brightness)))) {
			var sT = this.seedRandom.between(0, 1);
			var length = (Math.pow(sT, 3) * 0.8) + (this.starRadius/2);
			var width = (1 - Math.pow(sT, 2)) * (this.starRadius * 2);
			this.drawLine(width, length, ctx, i, this.brightness * this.seedRandom.between(0.1, 1));
		}

		//faint glow
		var radialGradient = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, radius);
		radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 0.7, 0.5));
		radialGradient.addColorStop(this.starRadius*1.25, Colour.hslaText(this.h, 1, 0.9, 0.1));
		radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.fillStyle = radialGradient;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.width);

		//the star itself
		radialGradient = ctx.createRadialGradient(0, 0, starRealRadius * 0.5, 0, 0, starRealRadius);
		radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 1, 1));
		radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.8, 0));
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.fillStyle = radialGradient;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.width);

		ctx.restore();

		this.status = Layer.Status.Success;
	}

	return LayerBrightStar;
});
