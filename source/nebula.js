/*
Look at this shit!
http://wwwtyro.net/2016/10/22/2D-space-scene-procgen.html
http://wwwtyro.github.io/procedural.js/space/main.js
 */

require.config({
	baseUrl: 'source'
});

requirejs(['Colour', 'Random', 'Layer', 'LayerPointStars', 'LayerBigStars', 'LayerBrightStar', 'LayerNebula', 'LayerNebula2',
		'Random/SeedRandom'],
	function (Colour, Random, Layer, LayerPointStars, LayerBigStars, LayerBrightStar, LayerNebula, LayerNebula2) {

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

		if (typeof(queryVars['nebulaMode']) !== 'undefined') {
			settings.nebulaMode = parseInt(queryVars['nebulaMode']);
		}
		if (settings.nebulaMode == undefined || settings.nebulaMode == '') {
			settings.nebulaMode = 1;
		}
		
		if (settings.nebulaMode == 2) {
			LayerNebula = LayerNebula2;
		} else {
			// do nothing!
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
			tBrightStar.name = 'brightStar-' + i,
			tBrightStar.seed = settings.seed + '-' + tBrightStar.name;

			seedRandom.setSeed(tBrightStar.seed);

			tBrightStar.h = seedRandom.between(0, 1);

			tBrightStar.brightness = seedRandom.between(0.5, 1);
			tBrightStar.starRadius = Math.floor(seedRandom.between(1, 5));
			tBrightStar.glowRadius = Math.floor(seedRandom.between(16, maxGlowRadius));

			tBrightStar.radiusRatio = tBrightStar.starRadius / tBrightStar.glowRadius;
			tBrightStar.starRealRadius = Math.floor((tBrightStar.starRadius * brightStar.supersampling) / settings.pixleScale);
			tBrightStar.glowRealRadius = Math.floor((tBrightStar.glowRadius * brightStar.supersampling) / settings.pixleScale);

			tBrightStar.x = Math.floor(seedRandom.between(0, settings.realWidth));
			tBrightStar.y = Math.floor(seedRandom.between(0, settings.realHeight));
			tBrightStar.z = Math.floor(seedRandom.between(10, 150));

			tBrightStar.realWidth = tBrightStar.realHeight = tBrightStar.glowRealRadius * 2;

			var glowRadiusRatio = tBrightStar.glowRadius / maxGlowRadius;
			glowRadiusRatio = glowRadiusRatio * glowRadiusRatio * tBrightStar.brightness;
			tb += glowRadiusRatio;

			//if (tb <= brightStar.maxTotalBrightness) {
				brightStars.push(tBrightStar);
			//}
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

			tNebula.scale = seedRandom.between(settings.realWidth / 2, settings.realWidth * 2);
			tNebula.roughness = seedRandom.between(0.4, 1);
			tNebula.lacunarity = seedRandom.between(2, 4);
			tNebula.powLacunarityRoughness = Math.pow(tNebula.lacunarity, -tNebula.roughness);
			tNebula.octaves = seedRandom.between(5, 8);
			tNebula.offsetX = seedRandom.between(0, 50000);
			tNebula.offsetY = seedRandom.between(0, 50000);
			tNebula.alphaExponent = seedRandom.between(1, 5);
			tNebula.distortionFactor = seedRandom.between(0.5, 2);
			tNebula.distortionScale = seedRandom.between(0.5, 5);
			tNebula.hueFactor = seedRandom.between(-1, 1);
			tNebula.dHuePwr = seedRandom.between(0, 1);
			tNebula.normalize = false;

			tNebula.colour = new Colour.hsla(seedRandom.between(0, 1), seedRandom.between(0, 1), seedRandom.between(0.25, 1), seedRandom.between(0.5, 1));
			tNebula.ambiant = brightStars.lenght == 0 ? 1 : seedRandom.between(0, 1);
			nebulas.push(tNebula);
		}

		settings.nebula = nebula;
		settings.nebulas = nebulas;

		seedOutput = document.getElementById("seed");
		seedOutput.innerText = '?width=' + settings.width + '&height=' + settings.height + '&pixleScale=' + settings.pixleScale + '&nebulaMode=' + settings.nebulaMode + '&seed=' + settings.seed;
		console.log(settings);
	}

	// --------------------------------------------

	var settings = {};
	var queryVars = getQueryVars();

	if (typeof(queryVars['s']) !== 'undefined' && queryVars['s'] != '') {
		settings = JSON.parse(queryVars['s']);
	} else {
		generateConfiguration(settings);
	}
	console.log(JSON.stringify(settings));
	var layers = new Array();

	// --------------------------------------------

	var output = document.getElementById("output");

	output.width = settings.realWidth;
	output.height = settings.realHeight;

	output.style.width = settings.width + 'px';
	output.style.height = settings.height + 'px';

	var container = document.getElementById('list');

	// --------------------------------------------

	var tCanvas,
	tSettings,
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
		var tHeightCanvas = addCanvas(tSettings.name + '-height', container, settings.realWidth, settings.realHeight);
		var tNormalCanvas = addCanvas(tSettings.name + '-normal', container, settings.realWidth, settings.realHeight);
		var tLightCanvas = addCanvas(tSettings.name + '-light', container, settings.realWidth, settings.realHeight);
		tCanvas = addCanvas(tSettings.name, container, settings.realWidth, settings.realHeight);
		tLayer = new LayerNebula(tCanvas, tNormalCanvas, tHeightCanvas, tLightCanvas, tSettings, settings.brightStars);
		layers.push(tLayer);
	}

	for (var i = 0; i < settings.brightStars.length; i++) {
		tSettings = settings.brightStars[i];
		tCanvas = addCanvas(tSettings.name, container, tSettings.realWidth, tSettings.realHeight);
		tLayer = new LayerBrightStar(tCanvas, tSettings.seed, tSettings.h, tSettings.brightness, tSettings.starRadius, tSettings.glowRadius, tSettings.radiusRatio, tSettings.starRealRadius, tSettings.glowRealRadius, tSettings.realWidth, tSettings.realHeight);
		tLayer.compositeOperation = 'lighter';

		tLayer.setTransform(1 / settings.brightStar.supersampling, 1 / settings.brightStar.supersampling, tSettings.x, tSettings.y, tSettings.glowRealRadius, tSettings.glowRealRadius);
		layers.push(tLayer);
	}

	// --------------------------------------------

	for (var i = 0; i < document.styleSheets.length; i++) {
		var styleSheet = document.styleSheets[i];
		for (var j = 0; j < styleSheet.rules.length; j++) {
			var cssStyleRule = styleSheet.rules[j];
			if (cssStyleRule.selectorText == '#list canvas') {
				cssStyleRule.style['max-width'] = Math.floor(window.innerWidth / container.childElementCount) + 'px';
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
		ctx.restore();
		for (var i = 0; i < layers.length; i++) {
			ctx.save();
			ctx.globalCompositeOperation = layers[i].compositeOperation;
			ctx.translate(layers[i].offsetX, layers[i].offsetY);
			ctx.scale(layers[i].scaleX, layers[i].scaleY);
			ctx.rotate(layers[i].rotation);
			ctx.translate(-layers[i].regX, -layers[i].regY);

			ctx.drawImage(layers[i].canvas, 0, 0);
			ctx.restore();
		}

	}

	// --------------------------------------------

	function processLayers() {
		for (var i = 0; i < layers.length; i++) {
			if (layers[i].status == Layer.Status.ReadyForProcessing) {
				//console.log(layers[i]);
				layers[i].startProcessing();
				compositLayersToOutput();
				setTimeout(processLayers, 1);
				return;
			}
		}
		var spinner = document.getElementById("spinner");
		spinner.style.display = 'none';
		var t1 = performance.now();
		console.log("Render took " + Math.floor(t1 - t0) + " milliseconds.");
	}
	var t0 = performance.now();
	
	setTimeout(processLayers, 1);

});
