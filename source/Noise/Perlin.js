define(
	'Noise/Perlin',
	['Noise', 'Noise/josephg_noisejs'],
	function (Noise, Module) {
	"use strict";

	Noise.perlin2 = Module.perlin2;
	Noise.perlin3 = Module.perlin3;
	return Noise;
});
