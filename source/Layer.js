define(
	'Layer',
	['Colour'],
	function (Colour) {
	"use strict";

	function Layer(canvas) {
		this.canvas = canvas;
		this.compositeOperation = 'source-over';
		this.scaleX = 1;
		this.scaleY = 1;
		this.offsetX = 0;
		this.offsetY = 0;
		this.regX = 0;
		this.regY = 0;
		this.rotation = 0;
		this.type = undefined;
		this.status = Layer.Status.Unknown;
	}

	Layer.Status = {
		Unknown: "Unknown",
		ReadyForProcessing: "ReadyForProcessing",
		Processing: "Processing",
		Success: "Success",
		Failed: "Failed"
	};

	Layer.prototype.setTransform = function (scaleX, scaleY, offsetX, offsetY, regX, regY, rotation) {
		this.scaleX = scaleX;
		this.scaleY = scaleY;
		this.offsetX = offsetX || 0;
		this.offsetY = offsetY || 0;
		this.regX = regX || 0;
		this.regY = regY || 0;
		this.rotation = rotation || 0;
		return this;
	}

	Layer.prototype.startProcessing = function () {
		this.status = Layer.Status.Processing;
		this.status = Layer.Status.Success;
	}

	function clamp(min, v, max) {
		return Math.max(min, Math.min(v, max));
	}
	Layer.prototype.clamp = clamp;

	Layer.prototype.floatArrayToImageDataUint8 = function (floatArray, imageDataUint8) {
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var t = floatArray[j] || 0;
			t = clamp(0, t, 1);
			imageDataUint8[i] = Math.floor(t * 255);
			imageDataUint8[i + 1] = Math.floor(t * 255);
			imageDataUint8[i + 2] = Math.floor(t * 255);
			imageDataUint8[i + 3] = 255;
		}
	}

	Layer.prototype.floatArrayToCanvas = function (floatArray, canvas) {
		var imageDataUint8 = new Uint8ClampedArray(canvas.width * canvas.height * 4);
		this.floatArrayToImageDataUint8(floatArray, imageDataUint8);
		var ctx = canvas.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, canvas.width, canvas.height), 0, 0);
	}

	Layer.prototype.colourArrayToImageDataUint8 = function (colourArray, imageDataUint8) {
		for (var i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			var t = colourArray[j] || new Colour.rgba(0, 0, 0, 0); //handle sparse colours!
			if (t instanceof Colour.hsla) {
				t = Colour.hslaToRgba(t);
			}
			imageDataUint8[i] = Math.floor(t.r * 255);
			imageDataUint8[i + 1] = Math.floor(t.g * 255);
			imageDataUint8[i + 2] = Math.floor(t.b * 255);
			imageDataUint8[i + 3] = Math.floor(t.a * 255);
		}
	}

	Layer.prototype.colourArrayToCanvas = function (colourArray, canvas) {
		if (typeof canvas === "undefined")
			return;
		
		var imageDataUint8 = new Uint8ClampedArray(canvas.width * canvas.height * 4);
		this.colourArrayToImageDataUint8(colourArray, imageDataUint8);
		var ctx = canvas.getContext("2d");
		ctx.putImageData(new ImageData(imageDataUint8, canvas.width, canvas.height), 0, 0);
	}

	Layer.prototype.normalizeFloatArray = function (floatArray, toMin, toMax) {
		var min = floatArray[0];
		var max = floatArray[0];
		var i,
		l = floatArray.length;
		for (i = 0; i < l; i++) {
			if (floatArray[i] < min) {
				min = floatArray[i];
			} else if (floatArray[i] > max) {
				max = floatArray[i];
			}
		}
		var range = toMax - toMin;
		var ratio = range / (max - min);

		for (i = 0; i < l; i++) {
			floatArray[i] = ((floatArray[i] - min) * ratio) + toMin;
		}
	}

	return Layer;
});
