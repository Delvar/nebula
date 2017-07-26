/*
Look at this shit!
http://wwwtyro.net/2016/10/22/2D-space-scene-procgen.html
http://wwwtyro.github.io/procedural.js/space/main.js
 */

require.config({
	baseUrl: 'source'
});

requirejs(['Colour', 'Random', 'Layer', 'LayerPointStars', 'LayerBigStars', 'LayerBrightStar', 'LayerNebula',
		'Random/SeedRandom'],
	function (Colour, Random, Layer, LayerPointStars, LayerBigStars, LayerBrightStar, LayerNebula) {

	seedRandom = new Random.SeedRandom();
	
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

	function addCanvas(name, container, width, height) {
		var c = document.createElement('canvas');
		c.width = width;
		c.height = height;
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

		if (typeof(queryVars['fast']) !== 'undefined') {
			settings.fast = clamp(0, parseInt(queryVars['fast']), 3);
		} else {
			settings.fast = 1;
		}

		settings.realWidth = Math.floor(settings.width / settings.pixleScale);
		settings.realHeight = Math.floor(settings.height / settings.pixleScale);

		var pointStars = {};
		pointStars.name = 'pointStars',
		pointStars.seed = settings.seed + '-' + pointStars.name;
		seedRandom.setSeed(pointStars.seed);
		pointStars.density = seedRandom.between(0.005, 0.05);
		pointStars.brightness = seedRandom.between(0.1, 0.2);
		settings.pointStars = pointStars;

		var bigStars = {};
		bigStars.name = 'bigStars',
		bigStars.seed = settings.seed + '-' + bigStars.name;
		seedRandom.setSeed(bigStars.seed);
		bigStars.density = pointStars.density; //copy density from point stars
		settings.bigStars = bigStars;

		var brightStar = {
			seed: settings.seed + '-brightStar'
		};

		seedRandom.setSeed(brightStar.seed);
		brightStar.supersampling = 2;
		brightStar.maxTotalBrightness = seedRandom.between(0, 2); ;
		var brightStars = [];
		var maxGlowRadius = 256;

		for (var i = 0, tb = 0; tb <= brightStar.maxTotalBrightness; i++) {
			var tBrightStar = {};

			var tBrightStar = {};
			tBrightStar.name = 'brightStar-' + i,
			tBrightStar.seed = settings.seed + '-' + tBrightStar.name;

			seedRandom.setSeed(tBrightStar.seed);

			tBrightStar.h = seedRandom.between(0, 1);

			tBrightStar.brightness = seedRandom.between(0.1, 1);
			tBrightStar.starRadius = Math.floor(seedRandom.between(1, 5));
			tBrightStar.glowRadius = Math.floor(seedRandom.between(16, maxGlowRadius));

			tBrightStar.radiusRatio = tBrightStar.starRadius / tBrightStar.glowRadius;
			tBrightStar.starRealRadius = Math.floor((tBrightStar.starRadius * brightStar.supersampling) / settings.pixleScale);
			tBrightStar.glowRealRadius = Math.floor((tBrightStar.glowRadius * brightStar.supersampling) / settings.pixleScale);

			tBrightStar.x = Math.floor(seedRandom.between(0, settings.realWidth) - tBrightStar.glowRealRadius);
			tBrightStar.y = Math.floor(seedRandom.between(0, settings.realHeight) - tBrightStar.glowRealRadius);

			tBrightStar.realWidth = tBrightStar.realHeight = tBrightStar.glowRealRadius * 2;

			var glowRadiusRatio = tBrightStar.glowRadius / maxGlowRadius;
			glowRadiusRatio = glowRadiusRatio * glowRadiusRatio * tBrightStar.brightness;
			tb += glowRadiusRatio;

			if (tb <= brightStar.maxTotalBrightness) {
				brightStars.push(tBrightStar);
			}
		}
		settings.brightStar = brightStar;
		settings.brightStars = brightStars;

		var nebula = {
			seed: settings.seed + '-nebula'
		};
		seedRandom.setSeed(nebula.seed);
		nebula.count = Math.round(seedRandom.between(1, 4));
		var nebulas = [];

		for (var i = 0; i < nebula.count; i++) {
			var tNebula = {};
			tNebula.name = 'nebula-' + i;
			tNebula.seed = settings.seed + '-' + tNebula.name;

			seedRandom.setSeed(tNebula.seed);

			var density = {
				scale: seedRandom.between(400, 2000) / settings.pixleScale,
				h: seedRandom.between(0.2, 2),
				lacunarity: seedRandom.between(1.2, 3),
				octaves: seedRandom.between(6, 8),
				dx: seedRandom.between(0, 500),
				dy: seedRandom.between(0, 500),
				exponent: seedRandom.between(2, 6),
				offset: seedRandom.between(-1, 1),
				distortion: seedRandom.between(1, 2),
				distortionScale: seedRandom.between(1, 2),
			};

			tNebula.density = density;
			tNebula.colour = new Colour.hsla(seedRandom.between(0, 1), seedRandom.between(0.25, 1), seedRandom.between(0.25, 1), seedRandom.between(0.5, 1));

			if ((tNebula.colour.l * tNebula.colour.a > 0.3) && density.scale > 550) {
				var tDarkMatter = {};
				tDarkMatter.name = tNebula.name + '-dm';
				tDarkMatter.seed = settings.seed + '-' + tDarkMatter.name;

				var dmDensity = {
					scale: density.scale,
					h: density.h / 2,
					lacunarity: 2,
					octaves: density.octaves + 1,
					dx: density.dx,
					dy: density.dy,
					exponent: density.exponent * 2,
					offset: density.offset,
					distortion: density.distortion,
					distortionScale: density.distortionScale,
				};

				tDarkMatter.density = dmDensity;
				tDarkMatter.colour = new Colour.hsla((tNebula.colour.h + seedRandom.between(-0.25, 0.25)) % 1, 0.5, seedRandom.between(0, 0.25), seedRandom.between(0.75, 1));
				tNebula.darkMatter = tDarkMatter;
			}

			nebulas.push(tNebula);
		}

		settings.nebula = nebula;
		settings.nebulas = nebulas;

		seedOutput = document.getElementById("seed");
		//seedOutput.innerText = '?width=' + settings.width + '&height=' + settings.height + '&fast=' + (settings.fast) + '&pixleScale=' + settings.pixleScale + '&nebulaCount=' + settings.nebulaCount + '&brightStarMaxTotalBrightness=' + settings.brightStarMaxTotalBrightness + '&seed=' + settings.seed;
		seedOutput.innerText = '?width=' + settings.width + '&height=' + settings.height + '&pixleScale=' + settings.pixleScale +'&seed=' + settings.seed;
		console.log(settings);
	}

	// --------------------------------------------

	var settings = {};
	var queryVars = getQueryVars();
	generateConfiguration(settings);
	var layers = new Array();

	// --------------------------------------------

	var output = document.getElementById("output");
	c.output = output;

	output.width = settings.realWidth;
	output.height = settings.realHeight;

	output.style.width = settings.width + 'px';
	output.style.height = settings.height + 'px';

	var container = document.getElementById('list');

	// --------------------------------------------

	var tName,
	tCanvas,
	tSettings,
	tSeed,
	tLayer;

	tSettings = settings.pointStars;
	tCanvas = addCanvas(tSettings.name, container, settings.realWidth, settings.realHeight);

	tLayer = new LayerPointStars(tCanvas, tSettings.seed, tSettings.density, tSettings.brightness);
	layers.push(tLayer);

	tSettings = settings.bigStars;
	tCanvas = addCanvas(tSettings.name, container, settings.realWidth, settings.realHeight);
	tLayer = new LayerBigStars(tCanvas, tSettings.seed, tSettings.density);
	layers.push(tLayer);

	for (var i = 0; i < settings.nebulas.length; i++) {
		tSettings = settings.nebulas[i];
		tCanvas = addCanvas(tSettings.name, container, settings.realWidth, settings.realHeight);
		var tDCanvas = addCanvas(tSettings.name + '-density', container, settings.realWidth, settings.realHeight);
		var tDmCanvas = undefined;
		var tDmDCanvas = undefined;
		if (tSettings.darkMatter != undefined) {
			tDmCanvas = addCanvas(tSettings.darkMatter.name, container, settings.realWidth, settings.realHeight);
			tDmDCanvas = addCanvas(tSettings.darkMatter.name + '-density', container, settings.realWidth, settings.realHeight);
		}
		tLayer = new LayerNebula(tCanvas, tDCanvas, tDmCanvas, tDmDCanvas, tSettings);
		layers.push(tLayer);
	}

	for (var i = 0; i < settings.brightStars.length; i++) {
		tSettings = settings.brightStars[i];
		tCanvas = addCanvas(tSettings.name, container, tSettings.realWidth, tSettings.realHeight);
		tLayer = new LayerBrightStar(tCanvas, tSettings.seed, tSettings.h, tSettings.brightness, tSettings.starRadius, tSettings.glowRadius, tSettings.radiusRatio, tSettings.starRealRadius, tSettings.glowRealRadius, tSettings.realWidth, tSettings.realHeight);
		tLayer.compositeOperation = 'lighter';
		tLayer.setTransform(1 / settings.brightStar.supersampling, 1 / settings.brightStar.supersampling, tSettings.x, tSettings.y);
		layers.push(tLayer);
	}
	
	// --------------------------------------------

	for (var i = 0; i < document.styleSheets.length; i++) {
		var styleSheet = document.styleSheets[i];
		for (var j = 0; j < styleSheet.rules.length; j++) {
			var cssStyleRule = styleSheet.rules[j];
			if (cssStyleRule.selectorText == '#list canvas') {
				cssStyleRule.style['max-width'] = Math.floor(window.innerWidth / container.childElementCount) + 'px';//Math.floor(window.innerWidth / ((settings.nebulaCount * 2) + settings.brightStarCount + 1)) + 'px';
				break;
			}
		}
	}

	// --------------------------------------------

	function compositLayersToOutput() {
		var ctx = output.getContext("2d");
		ctx.save();
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, output.width, output.height);
		for (var i = 0; i < layers.length; i++) {
			ctx.globalCompositeOperation = layers[i].compositeOperation;
			ctx.setTransform(layers[i].scaleX, 0, 0, layers[i].scaleY, layers[i].offsetX, layers[i].offsetY);
			ctx.drawImage(layers[i].canvas, 0, 0);
		}
		ctx.restore();
	}

	// --------------------------------------------

	function processLayers() {
		for (var i = 0; i < layers.length; i++) {
			if (layers[i].status == Layer.Status.ReadyForProcessing) {
				layers[i].startProcessing();
				compositLayersToOutput();
				setTimeout(processLayers, 1);
				return;
			}
		}
		var spinner = document.getElementById("spinner");
		spinner.style.display = 'none';
	}
	setTimeout(processLayers, 1);

});
