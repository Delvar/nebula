define(
	'Noise/Simplex',
	['Noise', 'Noise/josephg_noisejs'],
	function (Noise, Module) {
	"use strict";

	Noise.simplex2 = Module.simplex2;
	Noise.simplex3 = Module.simplex3;
	return Noise;
});
