/*
Look at this shit!
http://wwwtyro.net/2016/10/22/2D-space-scene-procgen.html
http://wwwtyro.github.io/procedural.js/space/main.js
 */

require.config({
	baseUrl: 'source'
});

requirejs(['Noise', 'Random',
		'Noise/Perlin', 'Noise/Simplex', 'Noise/Blender', 'Random/SeedRandom'],
	function (Noise, Random) {

	seedRandom = new Random.SeedRandom();

	var prng = function () {
		return seedRandom.random();
	};

	var rgba = function (r, g, b, a) {
		r = Math.floor(r * 255);
		g = Math.floor(g * 255);
		b = Math.floor(b * 255);
		return "rgba(" + r + "," + g + "," + b + "," + a + ")";
	}

	var hsla = function (h, s, l, a) {
		h = Math.floor(h * 360);
		s = Math.floor(s * 100);
		l = Math.floor(l * 100);
		return "hsla(" + h + "," + s + "%," + l + "%," + a + ")";
	}

	var Colour = function (r, g, b, a) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;

		return this;
	};

	function hslToColour(h, s, l, a) {
		var r,
		g,
		b;
		a = a == undefined ? 1 : a;

		if (s == 0) {
			r = g = b = l; // achromatic
		} else {
			var hue2rgb = function hue2rgb(p, q, t) {
				if (t < 0)
					t += 1;
				if (t > 1)
					t -= 1;
				if (t < 1 / 6)
					return p + (q - p) * 6 * t;
				if (t < 1 / 2)
					return q;
				if (t < 2 / 3)
					return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			}

			var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			var p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return new Colour(r, g, b, a);
	}

	function clamp(min, v, max) {
		return Math.max(min, Math.min(v, max));
	}

	function normalizeFloatArray(floatArray, toMin, toMax) {
		var min = 0;
		var max = 0;
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

	function floatArrayToImageDataUint8(floatArray, imageDataUint8) {
		var i,
		j,
		l,
		t;
		for (i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			t = floatArray[j] || 0;
			t = clamp(0, t, 1);
			imageDataUint8[i] = Math.floor(t * 256);
			imageDataUint8[i + 1] = Math.floor(t * 256);
			imageDataUint8[i + 2] = Math.floor(t * 256);
			imageDataUint8[i + 3] = 256;
		}
	}

	function floatArrayToCanvas(floatArray, canvas) {
		imageDataUint8 = new Uint8ClampedArray(canvas.width * canvas.height * 4);
		floatArrayToImageDataUint8(floatArray, imageDataUint8);
		var context = canvas.getContext("2d");
		context.putImageData(new ImageData(imageDataUint8, canvas.width, canvas.height), 0, 0);
	}

	function colourArrayToImageDataUint8(colourArray, imageDataUint8) {
		var i,
		j,
		l,
		t;
		for (i = 0, j = 0, l = imageDataUint8.length; i < l; i += 4, j++) {
			t = colourArray[j] || new Colour(0, 0, 0, 1);
			imageDataUint8[i] = Math.floor(t.r * 256);
			imageDataUint8[i + 1] = Math.floor(t.g * 256);
			imageDataUint8[i + 2] = Math.floor(t.b * 256);
			imageDataUint8[i + 3] = Math.floor(t.a * 256);
		}
	}

	function colourArrayToCanvas(colourArray, canvas) {
		imageDataUint8 = new Uint8ClampedArray(canvas.width * canvas.height * 4);
		colourArrayToImageDataUint8(colourArray, imageDataUint8);
		var context = canvas.getContext("2d");
		context.putImageData(new ImageData(imageDataUint8, canvas.width, canvas.height), 0, 0);
	}

	function mixToCanvasToCanvas(sourceCanvas, destinationCanvas, x, y) {
		x = x || 0;
		y = y || 0;
		var context = destinationCanvas.getContext("2d");
		context.drawImage(sourceCanvas, x, y);
	}

	function getDistortion(x, y, z, distortion, distortionScale, noisefunc) {
		var rv1,
		rv2,
		rv3 = 0;
		/* get a random vector and scale the randomization */
		rv0 = noisefunc((x + 13.5) * distortionScale, (y + 13.5) * distortionScale, (z + 13.5) * distortionScale) * distortion;
		rv1 = noisefunc((x) * distortionScale, (y) * distortionScale, (z) * distortionScale) * distortion;
		rv2 = noisefunc((x - 13.5) * distortionScale, (y - 13.5) * distortionScale, (z - 13.5) * distortionScale) * distortion;
		return {
			x: x + rv0,
			y: y + rv1,
			z: z + rv2
		};
	}

	function nebulaDensityNoise(x, y, z, H, lacunarity, octaves, offset, noisefunc, distortion, distortionScale, distortfunk) {
		var value,
		increment,
		rmd;
		var i;
		var pwHL = Math.pow(lacunarity, -H);
		var pwr = pwHL; /* starts with i=1 instead of 0 */

		var d = getDistortion(x, y, z, distortion, distortionScale, distortfunk);
		/* first unscaled octave of function; later octaves are scaled */
		value = offset + noisefunc(d.x, d.y, d.z);
		x *= lacunarity;
		y *= lacunarity;
		z *= lacunarity;

		for (i = 1; i < Math.floor(octaves); i++) {
			var d = getDistortion(x, y, z, distortion, distortionScale, distortfunk);
			increment = (noisefunc(d.x, d.y, d.z) + offset) * pwr * value;
			value += increment;
			pwr *= pwHL;
			x *= lacunarity;
			y *= lacunarity;
			z *= lacunarity;
		}

		rmd = octaves - Math.floor(octaves);
		if (rmd != 0.0) {
			increment = (noisefunc(x, y, z) + offset) * pwr * value;
			value += rmd * increment;
		}
		return value; ///(octaves*octaves);
	}

	function randomBetween(min, max) {
		if (min > max) {
			var t = max;
			max = min;
			min = t;
		}
		var range = max - min;
		return min + prng() * range;
	}

	function generateStars(canvas, s) {
		var wxh = canvas.width * canvas.height;
		var count = Math.round(wxh * s.density);
		var m = new Array(wxh);
		for (var i = 0; i < count; i++) {
			var p = Math.floor(prng() * wxh);
			var hue = Math.round(prng() * 360) / 360;
			var saturation = (prng() * 0.3);
			var lightness = Math.log(1 - prng()) * -s.brightness;
			m[p] = hslToColour(hue, saturation, lightness);
		}

		return m;
	}

	function scatterSarsOnCanvas(canvas, settings) {
		var dctx = canvas.getContext("2d");
		var tc = document.createElement('canvas');
		//var container = document.getElementById('list');
		//container.appendChild(tc);
		tc.width = 32;
		tc.height = 32;
		var radius = tc.width / 2;
		var count = Math.round(canvas.width * canvas.height * settings.density * 0.005);
		var ctx = tc.getContext("2d");
		ctx.save();
		dctx.save();
		var grd;
		var scaleFrom = 2 / tc.width;
		var scaleTo = 4 / tc.width;

		for (var i = 0; i < count; i++) {
			var hue = prng();
			var saturation = randomBetween(0.8, 1);
			var lightness = randomBetween(0.8, 1);

			ctx.clearRect(0, 0, tc.width, tc.height);
			grd = ctx.createRadialGradient(radius, radius, radius * 0.1, radius, radius, radius);
			grd.addColorStop(0, hsla(hue, saturation, lightness, 1));
			grd.addColorStop(1, hsla(hue, saturation, lightness, 0));
			ctx.fillStyle = grd;

			var scale = randomBetween(scaleFrom, scaleTo);
			ctx.setTransform(scale, 0, 0, scale, 0, 0);

			ctx.fillRect(0, 0, tc.width, tc.height);
			dctx.drawImage(tc, prng() * canvas.width, prng() * canvas.height);
		}
		ctx.restore();
		dctx.restore();
	}

	function generateNebulaDensity(canvas, s) {
		var m = new Float32Array(canvas.width * canvas.height);
		for (var x = 0, j = 0; x < canvas.height; x++) {
			for (var y = 0; y < canvas.width; y++, j++) {
				m[j] = Math.pow(nebulaDensityNoise(s.dx + x / s.scale, s.dy + y / s.scale, 0, s.h, s.lacunarity, s.octaves, s.offset, Noise.Blender.voronoi_F1, s.distortion, s.distortionScale, Noise.perlin2), s.exponent);
			}
		}
		return m;
	}

	function generateNebula(canvas, nebulaDensity, s) {
		var m = new Array(canvas.width * canvas.height);

		for (var x = 0, j = 0; x < canvas.height; x++) {
			for (var y = 0; y < canvas.width; y++, j++) {
				m[j] = hslToColour(s.h, s.s, (nebulaDensity[j] * 0.5 + 0.5) * s.l, nebulaDensity[j] * s.a);
			}
		}
		return m;
	};

	// --------------------------------------------

	function generateBrightStar(name, c, settings) {
		var container = document.getElementById('list');

		var flareWidth = settings.starRealRadius; //Math.max(1, Math.pow(Math.log(settings.starRealRadius), 4));
		var ctx = c.getContext("2d");
		var grd;

		var aScale = flareWidth / settings.realWidth;
		var bScale = settings.brightness;

		var flareCount = Math.floor(100);

		var xCenter = Math.floor(settings.realWidth / 2);
		var yCenter = Math.floor(settings.realHeight / 2);

		ctx.save();

		grd = ctx.createRadialGradient(0, 0, settings.starRealRadius, 0, 0, settings.glowRealRadius);
		grd.addColorStop(0, hsla(settings.h, 1, 1, 0.5 * settings.brightness));
		grd.addColorStop(1, hsla(settings.h, 1, 0.9, 0));
		ctx.fillStyle = grd;

		ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-xCenter, -yCenter, settings.realWidth, settings.realHeight);

		ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
		ctx.rotate(Math.PI / 2);
		ctx.scale(aScale, bScale);
		ctx.fillRect(-xCenter, -yCenter, settings.realWidth, settings.realHeight);

		//for (var i = 0; i < flareCount; i++) {
		for (var i = 0; i < Math.PI; i = i + randomBetween(0.01, 0.2)) {
			var sX = randomBetween(settings.radiusRatio, 0.8);
			sX = Math.pow(sX, 3);
			var sY = Math.pow(1 - sX, 3);

			ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
			//ctx.rotate(Math.PI * randomBetween(0, 2));
			ctx.rotate(i);
			ctx.scale(aScale * (sY * 2), bScale * sX);
			ctx.globalAlpha = 0.7 - sX;
			ctx.fillRect(-xCenter, -yCenter, settings.realWidth, settings.realHeight);
		}

		ctx.globalAlpha = 1;
		ctx.restore();

		ctx.setTransform(1, 0, 0, 1, xCenter, yCenter);
		grd = ctx.createRadialGradient(0, 0, settings.starRealRadius, 0, 0, settings.glowRealRadius);
		grd.addColorStop(0, hsla(settings.h, 1, 0.9, 0.1 * settings.brightness));
		grd.addColorStop(1, hsla(settings.h, 1, 0.8, 0));
		ctx.fillStyle = grd;
		ctx.fillRect(-xCenter, -yCenter, settings.realWidth, settings.realHeight);

		grd = ctx.createRadialGradient(0, 0, settings.starRealRadius * 0.5, 0, 0, settings.starRealRadius);
		grd.addColorStop(0, hsla(settings.h, 1, 1, 1));
		grd.addColorStop(1, hsla(settings.h, 1, 0.8, 0));
		ctx.fillStyle = grd;
		ctx.fillRect(-xCenter, -yCenter, settings.realWidth, settings.realHeight);

		ctx.restore();

		return c;
	}

	// --------------------------------------------

	function getQueryVars() {
		var r = {};
		var search = window.location.search.substring(1);
		var keyVars = search.split("&");
		for (var i = 0; i < keyVars.length; i++) {
			var pair = keyVars[i].split("=");
			r[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
		}
		return r;
	}

	function getRandomString(length, base) {
		length = length ? length : 8;
		base = base ? base : 16;
		var pow = Math.pow(base, length) - 1;
		var i = pow + Math.round(Math.random() * pow);
		var r = i.toString(base);
		r = r.substring(r.length - length);
		return r;
	}

	function addLittleCanvas(name, container, settings) {
		var c = document.createElement('canvas');
		c.width = settings.realWidth;
		c.height = settings.realHeight;
		c.id = name;
		container.appendChild(c);
		return c;
	}

	function generateConfiguration(settings) {
		settings.seed = undefined;

		if (typeof(queryVars['seed']) !== 'undefined') {
			settings.seed = queryVars['seed'];
		}
		if (settings.seed == undefined || settings.seed == '') {
			settings.seed = getRandomString();
		}

		settings.pixleScale = 1;

		if (typeof(queryVars['pixleScale']) !== 'undefined') {
			settings.pixleScale = parseInt(queryVars['pixleScale']);
		}
		if (settings.pixleScale == undefined || settings.pixleScale == '') {
			settings.pixleScale = 1;
		}

		if (typeof(queryVars['width']) !== 'undefined') {
			settings.width = parseInt(queryVars['width']);
		}
		if (settings.width == undefined || settings.width == '') {
			settings.width = window.innerWidth;
		}

		if (typeof(queryVars['height']) !== 'undefined') {
			settings.height = parseInt(queryVars['height']);
		}
		if (settings.height == undefined || settings.height == '') {
			settings.height = window.innerHeight;
		}

		settings.realWidth = Math.floor(settings.width / settings.pixleScale);
		settings.realHeight = Math.floor(settings.height / settings.pixleScale);

		seedRandom.setSeed(settings.seed + 'stars');
		prng();
		prng();
		prng();
		prng();
		prng();
		prng();
		prng();

		settings.stars = {
			density: randomBetween(0.005, 0.05),
			brightness: randomBetween(0.1, 0.2)
		};

		seedRandom.setSeed(settings.seed + 'nebula');
		prng();
		prng();
		prng();
		prng();
		prng();
		prng();
		prng();

		var tNebulaCount = Math.round(randomBetween(1, 1));

		if (typeof(queryVars['nebulaCount']) !== 'undefined') {
			settings.nebulaCount = parseInt(queryVars['nebulaCount']);
		}
		if (settings.nebulaCount == undefined) {
			settings.nebulaCount = tNebulaCount;
		}

		//for (var i = 1; i <= settings.nebulaCount; i++) {
		var originalNebulaCount = settings.nebulaCount;
		for (var i = 1, j = 1; j <= originalNebulaCount; i += 2, j += 1) {

			var nd = {
				scale: randomBetween(100, 2000) / settings.pixleScale,
				h: randomBetween(0.1, 0.5),
				lacunarity: randomBetween(1.2, 2),
				octaves: Math.floor(randomBetween(3, 8)),
				dx: randomBetween(0, 500),
				dy: randomBetween(0, 500),
				exponent: 1 + prng() * 2,
				offset: randomBetween(-0.2, 0.2),
				distortion: randomBetween(1, 2),
				distortionScale: randomBetween(1, 2),
			};
			settings['nebulaDensity' + i] = nd;

			var n = {
				h: randomBetween(0, 1),
				s: randomBetween(0.5, 1),
				l: randomBetween(0, 1),
				a: randomBetween(0.5, 1),
			};
			settings['nebula' + i] = n;
			//drop in dark matter on brighter lower detail nebula for more awesome details!
			if ((n.l * n.a > 0.3) && nd.scale > 550) {
				settings.nebulaCount++;
				settings['nebulaDensity' + (i + 1)] = {
					scale: nd.scale,
					h: 0.1,
					lacunarity: 2,
					octaves: 5,
					dx: nd.dx,
					dy: nd.dy,
					exponent: nd.exponent*2,
					offset: nd.offset,
					distortion: nd.distortion,
					distortionScale: nd.distortionScale,
				};
				settings['nebula' + (i + 1)] = {
					h: n.h,
					s: 0.5,
					l: 0.05,
					a: 1,
				};
			}
		}

		seedRandom.setSeed(settings.seed + 'brightStar');
		prng();
		prng();
		prng();
		prng();
		prng();
		prng();
		prng();

		settings.brightStarSupersampling = 2;
		var tBrightStarMaxTotalBrightness = randomBetween(0, 2); ;

		if (typeof(queryVars['brightStarMaxTotalBrightness']) !== 'undefined') {
			settings.brightStarMaxTotalBrightness = parseInt(queryVars['brightStarMaxTotalBrightness']);
		}
		if (settings.brightStarMaxTotalBrightness == undefined) {
			settings.brightStarMaxTotalBrightness = tBrightStarMaxTotalBrightness;
		}

		settings.brightStarCount = 0;
		var maxGlowRadius = 256;
		for (var i = 1, tb = 0; tb <= settings.brightStarMaxTotalBrightness; i++) {
			var s = {
				h: randomBetween(0, 1),
				x: Math.floor(randomBetween(0, settings.realWidth)),
				y: Math.floor(randomBetween(0, settings.realHeight)),
				brightness: randomBetween(0.1, 1),
			};

			s.starRadius = randomBetween(1, 5);
			s.glowRadius = randomBetween(16, maxGlowRadius);
			s.radiusRatio = s.starRadius / s.glowRadius;

			s.starRealRadius = Math.floor((s.starRadius * settings.brightStarSupersampling) / settings.pixleScale);
			s.glowRealRadius = Math.floor((s.glowRadius * settings.brightStarSupersampling) / settings.pixleScale);
			s.realWidth = s.realHeight = s.glowRealRadius * 2;

			var glowRadiusRatio = s.glowRadius / maxGlowRadius;
			glowRadiusRatio = glowRadiusRatio * glowRadiusRatio * s.brightness;
			tb += glowRadiusRatio;
			//console.log(s.brightness, s.glowRadius, tb);

			if (tb <= settings.brightStarMaxTotalBrightness) {
				settings['brightStar' + i] = s;
				settings.brightStarCount = i;
			}
		}

		seedOutput = document.getElementById("seed");
		seedOutput.innerText = '?width=' + settings.width + '&height=' + settings.height + '&pixleScale=' + settings.pixleScale + '&nebulaCount=' + settings.nebulaCount + '&brightStarMaxTotalBrightness=' + settings.brightStarMaxTotalBrightness + '&seed=' + settings.seed;
		console.log(settings);
	}

	// --------------------------------------------

	var settings = {};
	var c = {};
	var l = {};

	// --------------------------------------------

	var queryVars = getQueryVars();

	// --------------------------------------------

	generateConfiguration(settings);

	for (var i = 0; i < document.styleSheets.length; i++) {
		var styleSheet = document.styleSheets[i];
		for (var j = 0; j < styleSheet.rules.length; j++) {
			var cssStyleRule = styleSheet.rules[j];
			if (cssStyleRule.selectorText == '#list canvas') {
				cssStyleRule.style['max-width'] = Math.floor(window.innerWidth / ((settings.nebulaCount * 2) + settings.brightStarCount + 1)) + 'px';
				break;
			}
		}
	}
	// --------------------------------------------

	var output = document.getElementById("output");
	c.output = output;

	output.width = settings.realWidth;
	output.height = settings.realHeight;

	output.style.width = settings.width + 'px';
	output.style.height = settings.height + 'px';

	var container = document.getElementById('list');

	// --------------------------------------------

	c.stars = addLittleCanvas('stars', container, settings);

	for (var i = 1; i <= settings.nebulaCount; i++) {
		c['nebulaDensity' + i] = addLittleCanvas('nebulaDensity' + i, container, settings);
		c['nebula' + i] = addLittleCanvas('nebula' + i, container, settings);
	}

	for (var i = 1; i <= settings.brightStarCount; i++) {
		c['brightStar' + i] = addLittleCanvas('brightStar' + i, container, settings['brightStar' + i]);
	}

	// --------------------------------------------

	var callbacks = [];

	callbacks.push(function () {
		l.stars = generateStars(c.stars, settings.stars);
		colourArrayToCanvas(l.stars, c.stars);
		scatterSarsOnCanvas(c.stars, settings.stars);
		mixToCanvasToCanvas(c.stars, c.output);
	});

	for (var i = 1; i <= settings.nebulaCount; i++) {
		(function (x) {
			callbacks.push(function () {
				l['nebulaDensity' + x] = generateNebulaDensity(c['nebulaDensity' + x], settings['nebulaDensity' + x]);
				normalizeFloatArray(l['nebulaDensity' + x], 0, 1);
				floatArrayToCanvas(l['nebulaDensity' + x], c['nebulaDensity' + x]);
			});
			callbacks.push(function () {
				l['nebula' + x] = generateNebula(c['nebula' + x], l['nebulaDensity' + x], settings['nebula' + x]);
				colourArrayToCanvas(l['nebula' + x], c['nebula' + x]);
				mixToCanvasToCanvas(c['nebula' + x], c.output);
			});
		})(i);
	}

	for (var i = 1; i <= settings.brightStarCount; i++) {
		(function (x) {
			callbacks.push(function () {
				var name = 'brightStar' + x;
				var s = settings[name];
				generateBrightStar(name, c[name], s);
				var ctx = c.output.getContext("2d");
				ctx.save();
				ctx.globalCompositeOperation = 'lighter';
				var scale = 1 / settings.brightStarSupersampling;
				ctx.scale(scale, scale);
				ctx.drawImage(c[name], (s.x * settings.brightStarSupersampling) - s.realWidth / 2, (s.y * settings.brightStarSupersampling) - s.realHeight / 2);
				ctx.restore();
			});
		})(i);
	}

	function execCallbacks() {
		var funk = callbacks.shift();
		if (funk) {
			funk();
			setTimeout(execCallbacks, 100);
		} else {
			var spinner = document.getElementById("spinner");
			spinner.style.display = 'none';
		}
	}
	setTimeout(execCallbacks, 100);

});
