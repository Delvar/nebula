/*
 * blender-2.78c\source\blender\blenlib\intern\noise.c
 * Converted to Javascript by Morgan Gilroy, @morgangilroy
 *
 * ***** BEGIN GPL LICENSE BLOCK *****
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 *
 * The Original Code is Copyright (C) 2001-2002 by NaN Holding BV.
 * All rights reserved.
 *
 * The Original Code is: all of this file.
 *
 * Contributor(s): none yet.
 *
 * ***** END GPL LICENSE BLOCK *****
 *
 */

define(
	'Noise/Blender/TwoD/FastVoroni',
	['Noise', 'Noise/Blender'],
	function (Noise, Blender) {
	"use strict";
	Blender.TwoD = {};
	var module = Blender.TwoD;

	/****************************/
	/* Fast 2D VORONOI/WORLEY */
	/***************************/

	/* distance squared */
	function dist_Squared(x, y) {
		return (x * x + y * y);
	}
	module.dist_Squared = dist_Squared;

	/* real distance */
	function dist_Real(x, y) {
		return Math.sqrt(x * x + y * y);
	}
	module.dist_Real = dist_Real;

	/* Not 'pure' Worley, but the results are virtually the same.
	 * Returns distances in da and point coords in pa */
	function FastVoronoi(x, y, distfunc) {
		var xx,
		yy,
		xi,
		yi,
		xd,
		yd,
		da,
		d,
		p;
		var pa = [0, 0];

		xi = Math.floor(x);
		yi = Math.floor(y);

		da = 3.40282347e+38;

		for (xx = xi - 1; xx <= xi + 1; xx++) {
			for (yy = yi - 1; yy <= yi + 1; yy++) {
				p = Blender.HASHPNT(xx, yy, 0);
				xd = x - (p[0] + xx);
				yd = y - (p[1] + yy);
				d = distfunc(xd, yd);

				if (d < da) {
					da = d;
					pa = [p[0] + xx, p[1] + yy];
				}
			}
		}
		return {
			"da": da,
			"pa": pa
		};
	}
	module.FastVoronoi = FastVoronoi;

	function FastVoronoi_F1(x, y) {
		var d = FastVoronoi(x, y, dist_Real);
		return d.da;
	}

	module.FastVoronoi_F1 = FastVoronoi_F1;

	function FastVoronoi_Squared_F1(x, y) {
		var d = FastVoronoi(x, y, dist_Squared);
		return d.da;
	}

	module.FastVoronoi_Squared_F1 = FastVoronoi_Squared_F1;
});
