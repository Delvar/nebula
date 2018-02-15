define(
	'LayerVignette',
	['Layer'],
	function (Layer) {
	"use strict";

	function LayerVignette(canvas, alpha, outerRadius, innerRadius) {
		Layer.call(this, canvas);
		this.alpha = alpha;
		this.outerRadius = outerRadius;
		this.innerRadius = innerRadius; 
		this.status = Layer.Status.ReadyForProcessing;
	}

	LayerVignette.prototype = Object.create(Layer.prototype);
	LayerVignette.prototype.constructor = LayerVignette;

	// --------------------------------------------

	LayerVignette.prototype.startProcessing = function () {
		this.setProcessingStartTime();
		this.status = Layer.Status.Processing;
		var ctx = this.canvas.getContext("2d");
		
		ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.rect(0, 0, this.canvas.width, this.canvas.height);
		
		var radialGradient = ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, this.innerRadius, this.canvas.width/2, this.canvas.height/2, this.outerRadius);
		radialGradient.addColorStop(0, "rgba(0,0,0,0)");
		radialGradient.addColorStop(1, "rgba(0,0,0,"+this.alpha+")");
		ctx.fillStyle = radialGradient;
		ctx.fill();
		
		this.status = Layer.Status.Success;
		this.setProcessingEndTime();
	}

	return LayerVignette;
});
