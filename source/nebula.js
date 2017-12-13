/*
Look at this shit!
http://wwwtyro.net/2016/10/22/2D-space-scene-procgen.html
http://wwwtyro.github.io/procedural.js/space/main.js
 */

require.config({
	baseUrl: 'source'
});

requirejs(['Colour', 'Random', 'Layer', 'LayerPointStars', 'LayerBigStars', 'LayerBrightStar', 'LayerNebula', 'LayerNebula2', 'LayerVignette', 'LayerMilkyWay',
		'Random/SeedRandom'],
	function (Colour, Random, Layer, LayerPointStars, LayerBigStars, LayerBrightStar, LayerNebula, LayerNebula2, LayerVignette, LayerMilkyWay) {

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
		if (settings.seed === undefined || settings.seed === '') {
			settings.seed = getRandomString();
		}

		settings.pixleScale = 1;

		if (typeof(queryVars['pixleScale']) !== 'undefined') {
			settings.pixleScale = parseInt(queryVars['pixleScale']);
		}
		if (settings.pixleScale === undefined || settings.pixleScale === '') {
			settings.pixleScale = 1;
		}

		if (typeof(queryVars['width']) !== 'undefined') {
			settings.width = parseInt(queryVars['width']);
		}
		if (settings.width === undefined || settings.width === '') {
			settings.width = window.innerWidth;
		}

		if (typeof(queryVars['height']) !== 'undefined') {
			settings.height = parseInt(queryVars['height']);
		}
		if (settings.height === undefined || settings.height === '') {
			settings.height = window.innerHeight;
		}

		if (typeof(queryVars['nebulaMode']) !== 'undefined') {
			settings.nebulaMode = parseInt(queryVars['nebulaMode']);
		}
		if (settings.nebulaMode === undefined || settings.nebulaMode === '') {
			settings.nebulaMode = 2;
		}

		if (typeof(queryVars['vignette']) !== 'undefined') {
			settings.vignette = !(queryVars['vignette'] === 'false');
		}
		if (settings.vignette === undefined || settings.vignette === '') {
			settings.vignette = true;
		}

		if (typeof(queryVars['debug']) !== 'undefined') {
			settings.debug = (queryVars['debug'] === 'true');
		}
		if (settings.debug === undefined || settings.debug === '') {
			settings.debug = false;
		}

		if (typeof(queryVars['showLayers']) !== 'undefined') {
			settings.showLayers = (queryVars['showLayers'] === 'true');
		}
		if (settings.showLayers === undefined || settings.showLayers === '') {
			settings.showLayers = false;
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
		brightStar.maxTotalBrightness = seedRandom.between(0, 2);
		//brightStar.maxTotalBrightness = seedRandom.between(10, 10);
		var brightStars = [];
		var lastGlowRadius = 0;

		for (var i = 0, tb = 0; tb <= brightStar.maxTotalBrightness && i < 25; i++) {
			var tBrightStar = {};
			tBrightStar.name = 'brightStar-' + i,
			tBrightStar.seed = settings.seed + '-' + tBrightStar.name;
			seedRandom.setSeed(tBrightStar.seed);

			tBrightStar.h = seedRandom.between(0, 1);
			tBrightStar.brightness = seedRandom.between(0.1, 1);

			tBrightStar.starRadius = seedRandom.between(1 / 256, 5 / 256);
			var t = Math.pow(seedRandom.between(0, 1), 3);
			tBrightStar.glowRadius = 0.05 + (t * (brightStar.maxTotalBrightness - tb));
			tBrightStar.glowRadius = Math.max(0.05, Math.min(tBrightStar.glowRadius, 1));

			tBrightStar.x = seedRandom.between(0, 1);
			tBrightStar.y = seedRandom.between(0, 1);
			tBrightStar.z = seedRandom.between(0, 1);
			tBrightStar.z = tBrightStar.z * tBrightStar.z * 2;

			tb += tBrightStar.glowRadius * tBrightStar.glowRadius;
			brightStars.push(tBrightStar);
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

		var milkyWay = {};
		milkyWay.name = 'milkyWay';
		milkyWay.seed = settings.seed + '-' + milkyWay.name;

		seedRandom.setSeed(milkyWay.seed);

		milkyWay.scale = seedRandom.between(settings.realWidth, settings.realWidth);
		milkyWay.nScale = seedRandom.between(100, 200);
		milkyWay.widthDevisor = seedRandom.between(1, 8);
		milkyWay.gaussianMultiplier = seedRandom.between(0.05, 0.5);
		milkyWay.gaussianMin = seedRandom.between(0, 0.6 - milkyWay.gaussianMultiplier);
		milkyWay.roughness = seedRandom.between(0.4, 1);
		milkyWay.lacunarity = seedRandom.between(1.5, 3);

		milkyWay.octaves = seedRandom.between(5, 8);
		milkyWay.offsetX = seedRandom.between(0, 50000);
		milkyWay.offsetY = seedRandom.between(0, 50000);
		milkyWay.alphaExponent = seedRandom.between(1, 5);
		milkyWay.distortionFactor = seedRandom.between(0.5, 2);
		milkyWay.distortionScale = seedRandom.between(0.5, 5);
		milkyWay.hueFactor = seedRandom.between(-1, 1);
		milkyWay.dHuePwr = seedRandom.between(0, 1);

		milkyWay.normalize = false;
		milkyWay.colour = new Colour.hsla(seedRandom.between(0, 1), seedRandom.between(0, 1), seedRandom.between(0.25, 1), seedRandom.between(0.5, 1));
		milkyWay.rotation = seedRandom.between(0, Math.PI);
		milkyWay.brightness = seedRandom.between(0.05, 0.7);

		settings.milkyWay = milkyWay;

		seedOutput = document.getElementById("seed");
		seedOutput.innerText = '?width=' + settings.width + '&height=' + settings.height + '&pixleScale=' + settings.pixleScale + '&nebulaMode=' + settings.nebulaMode + '&vignette=' + settings.vignette + '&debug=' + settings.debug + '&showLayers=' + settings.showLayers + '&seed=' + settings.seed;
		console.log(settings);

		settings.ratioWidthHeight = settings.width / settings.height;

		console.log(settings.ratioWidthHeight);
	}

	// --------------------------------------------

	var settings = {};
	var queryVars = getQueryVars();

	if (typeof(queryVars['s']) !== 'undefined' && queryVars['s'] != '') {
		settings = JSON.parse(queryVars['s']);
	} else {
		generateConfiguration(settings);
	}

	if (settings.nebulaMode == 2) {
		LayerNebula = LayerNebula2;
	} else {
		// do nothing!
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

	if (!settings.showLayers) {
		container.style.visibility = "hidden";
		container.style.display = "none";
	}

	// --------------------------------------------

	var tCanvas,
	tSettings,
	tLayer,
	tCanvasDensity,
	tCanvasDepth,
	tCanvasDark,
	tCanvasNormal,
	tCanvasDirectLight;

	// Milky Way
	tSettings = settings.milkyWay;
	var tw = Math.floor(Math.sqrt(Math.pow(settings.realWidth, 2) + Math.pow(settings.realHeight, 2)));
	var th = Math.floor(tw / tSettings.widthDevisor);

	tCanvasDensity = settings.debug ? addCanvas(tSettings.name + '-density', container, tw, th) : undefined;
	tCanvasDepth = settings.debug ? addCanvas(tSettings.name + '-depth', container, tw, th) : undefined;
	tCanvasDark = settings.debug ? addCanvas(tSettings.name + '-dark', container, tw, th) : undefined;
	tCanvasDirectLight = settings.debug ? addCanvas(tSettings.name + '-directLight', container, tw, th) : undefined;

	tCanvas = addCanvas(tSettings.name, container, tw, th);
	tLayer = new LayerMilkyWay(tCanvas, tCanvasDensity, tCanvasDirectLight, tCanvasDepth, tCanvasDark, tSettings);
	tLayer.setTransform(1, 1, settings.realWidth / 2, settings.realHeight / 2, Math.floor(tw / 2), Math.floor(th / 2), tSettings.rotation);
	layers.push(tLayer);

	tSettings = settings.pointStars;
	tCanvas = addCanvas(tSettings.name, container, settings.realWidth, settings.realHeight);
	tLayer = new LayerPointStars(tCanvas, tSettings.seed, tSettings.density, tSettings.brightness);
	tLayer.compositeOperation = 'lighter';
	layers.push(tLayer);

	tSettings = settings.bigStars;
	tCanvas = addCanvas(tSettings.name, container, settings.realWidth, settings.realHeight);
	tLayer = new LayerBigStars(tCanvas, tSettings.seed, tSettings.density);
	tLayer.compositeOperation = 'lighter';
	layers.push(tLayer);

	for (var i = 0; i < settings.nebulas.length; i++) {
		//break;
		tSettings = settings.nebulas[i];
		tCanvasDensity = settings.debug ? addCanvas(tSettings.name + '-density', container, settings.realWidth, settings.realHeight) : undefined;
		tCanvasDepth = settings.debug ? addCanvas(tSettings.name + '-depth', container, settings.realWidth, settings.realHeight) : undefined;
		tCanvasNormal = settings.debug ? addCanvas(tSettings.name + '-normal', container, settings.realWidth, settings.realHeight) : undefined;
		tCanvasDirectLight = settings.debug ? addCanvas(tSettings.name + '-directLight', container, settings.realWidth, settings.realHeight) : undefined;

		tCanvas = addCanvas(tSettings.name, container, settings.realWidth, settings.realHeight);
		tLayer = new LayerNebula(tCanvas, tCanvasNormal, tCanvasDensity, tCanvasDirectLight, tCanvasDepth, tSettings, settings.brightStars);
		layers.push(tLayer);
	}

	if (settings.vignette) {
		tCanvas = addCanvas("Vignette-0", container, settings.realWidth, settings.realHeight);
		tLayer = new LayerVignette(tCanvas, 0.25, Math.max(settings.realWidth / 2, settings.realHeight / 2), Math.min(settings.realWidth / 2, settings.realHeight / 2) * 0.5);
		tLayer.compositeOperation = 'multiply';
		layers.push(tLayer);
	}

	var supersampling = 1;
	var maxGlowRadius = (((settings.width / 7.5) * supersampling) / settings.pixleScale) * 2;

	for (var i = 0; i < settings.brightStars.length; i++) {
		tSettings = settings.brightStars[i];

		tSettings.realX = Math.floor(tSettings.x * settings.width);
		tSettings.realY = Math.floor(tSettings.y * settings.height);
		tSettings.realZ = Math.floor(tSettings.z * (settings.width / 2));
		tSettings.realWidth = tSettings.realHeight = (Math.floor((tSettings.glowRadius * maxGlowRadius) / 2) * 2) + 1; //ensure we have an odd number of pixles

		tCanvas = addCanvas(tSettings.name, container, tSettings.realWidth, tSettings.realWidth);
		tLayer = new LayerBrightStar(tCanvas, tSettings.seed, tSettings.h, tSettings.brightness, tSettings.starRadius, tSettings.glowRadius);
		tLayer.compositeOperation = 'lighter';
		tLayer.setTransform(1 / supersampling, 1 / supersampling, tSettings.realX, tSettings.realY, Math.floor(tSettings.realWidth / 2), Math.floor(tSettings.realWidth / 2));
		layers.push(tLayer);
	}

	if (settings.vignette) {
		tCanvas = addCanvas("Vignette-1", container, settings.realWidth, settings.realHeight);
		tLayer = new LayerVignette(tCanvas, 1, Math.max(settings.realWidth / 2, settings.realHeight / 2) * 0.9, Math.min(settings.realWidth / 2, settings.realHeight / 2));
		tLayer.compositeOperation = 'soft-light';
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
		var loading = document.getElementById("loading");
		loading.classList.remove("visible");
		loading.classList.add("hidden");
		
		//loading.style.display = 'none';
		var t1 = performance.now();
		console.log("Render took " + Math.floor(t1 - t0) + " milliseconds.");
	}
	var t0 = performance.now();

	setTimeout(processLayers, 1);

});
