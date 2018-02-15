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

		var c0 = Colour.hslaText(this.h, 1, 1, 0.5 * brightness);
		var c1 = Colour.hslaText((this.h + 0.3) % 1, 1, this.seedRandom.between(0.7, 1), 0.25 * brightness);
		var c2 = Colour.hslaText(this.h, 1, this.seedRandom.between(0.6, 0.9), 0);

		if (lineWidth <= 2) { //Stroke with radialGradient
			//console.log("lineWidth <= 1", lineWidth, this.seed);
			var lineLength = (bScale * width) / 2;

			var startX = center + (lineLength * Math.cos(rotation));
			var startY = center + (lineLength * Math.sin(rotation));
			var endX = center + (lineLength * Math.cos(rotation + Math.PI));
			var endY = center + (lineLength * Math.sin(rotation + Math.PI));

			var radialGradient = ctx.createRadialGradient(center, center, starRealRadius, center, center, lineLength);
			radialGradient.addColorStop(0, c0);
			radialGradient.addColorStop(0.5, c1);
			radialGradient.addColorStop(1, c2);

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
		linearGradient.addColorStop(0, c2);
		linearGradient.addColorStop(0.25, c1);
		linearGradient.addColorStop(0.5, c0);
		linearGradient.addColorStop(0.75, c1);
		linearGradient.addColorStop(1, c2);
		ctx.fillStyle = linearGradient;
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.rotate(rotation);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-center, -center, width, width);
		} */
		else { //Fill radial
			//console.log("lineWidth > 3", lineWidth, this.seed);
			var radialGradient = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, center);

			radialGradient.addColorStop(0, c0);
			radialGradient.addColorStop(0.5, c1);
			radialGradient.addColorStop(1, c2);

			ctx.fillStyle = radialGradient;
			ctx.setTransform(1, 0, 0, 1, center, center);
			ctx.rotate(rotation);
			ctx.scale(aScale, bScale);
			ctx.fillRect(-center, -center, width, width);
		}

	}

	LayerBrightStar.prototype.startProcessing = function () {
		//this.setProcessingStartTime();
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");

		var radius = this.canvas.width / 2;
		var starRealRadius = this.starRadius * this.canvas.width;
		var center = radius;

		ctx.save();

		ctx.globalCompositeOperation = this.compositeOperation;

		//Draw vertical line
		this.drawLine(this.starRadius * 2, 1, ctx, 0, this.brightness);

		//Draw horizontal line
		this.drawLine(this.starRadius * 2, 1, ctx, Math.PI / 2, this.brightness);

		//Draw random lines
		var rounds = 1 + Math.floor(this.brightness * 3);
		for (var i = 0; i < Math.PI * rounds; i = i + this.seedRandom.between(Math.PI / (4 + (40 * this.brightness)), Math.PI / (2 + (20 * this.brightness)))) {
			var sT = this.seedRandom.random();
			sT = Math.pow(sT, 3);
			var length = (sT * 0.5) + (this.starRadius * 8);
			var width = (1 - sT) * (this.starRadius * this.seedRandom.between(1, 4));
			this.drawLine(width, length, ctx, i, this.brightness * this.seedRandom.between(0.1, 1));
		}

		//faint glow
		var radialGradient = ctx.createRadialGradient(0, 0, starRealRadius, 0, 0, radius);
		radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 0.75, 0.4 * this.brightness));
		radialGradient.addColorStop(this.starRadius * 4, Colour.hslaText(this.h, 1, 0.9, 0.2 * this.brightness));
		radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.85, 0));
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.fillStyle = radialGradient;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.width);

		//the star itself
		radialGradient = ctx.createRadialGradient(0, 0, starRealRadius * 0.5, 0, 0, starRealRadius);
		radialGradient.addColorStop(0, Colour.hslaText(this.h, 1, 1, this.brightness));
		radialGradient.addColorStop(1, Colour.hslaText(this.h, 1, 0.85, 0));
		ctx.setTransform(1, 0, 0, 1, center, center);
		ctx.fillStyle = radialGradient;
		ctx.fillRect(-center, -center, this.canvas.width, this.canvas.width);

		ctx.restore();

		this.status = Layer.Status.Success;
		//this.setProcessingEndTime();
	}

	return LayerBrightStar;
});
