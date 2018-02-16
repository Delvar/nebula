define(
	'Colour',
	[],
	function () {
	"use strict";
	var Colour = {};

	function rgba(r, g, b, a) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	Colour.rgba = rgba;

	function hsla(h, s, l, a) {
		this.h = h;
		this.s = s;
		this.l = l;
		this.a = a;
	}

	Colour.hsla = hsla;

	Colour.hslaToRgba = function (h, s, l, a) {
		if (h instanceof Colour.hsla) {
			s = h.s;
			l = h.l;
			a = h.a
				h = h.h
		} else {
			a = a == undefined ? 1 : a;
		}

		var c = new Colour.rgba(0, 0, 0, a);

		if (s == 0) {
			c.r = c.g = c.b = l; // achromatic
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
			c.r = hue2rgb(p, q, h + 1 / 3);
			c.g = hue2rgb(p, q, h);
			c.b = hue2rgb(p, q, h - 1 / 3);
		}

		return c;
	}

	Colour.hslaText = function (h, s, l, a) {
		h = Math.floor(h * 360);
		s = Math.floor(s * 100);
		l = Math.floor(l * 100);
		return "hsla(" + h + "," + s + "%," + l + "%," + a + ")";
	}
	return Colour;
});
