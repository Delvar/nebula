define(
	'ObjectPool',
	[],
	function () {
	"use strict";
	function ObjectPool(size, sizeSteps, objType) {

		if (typeof objType.prototype.getObjectPoolIndex !== 'function') {
			throw ('require getObjectPoolIndex function on pooled class');
		}
		if (typeof objType.prototype.setObjectPool !== 'function') {
			throw ('require setObjectPool function on pooled class');
		}

		if (size <= 0 || !isFinite(size)) {
			throw ('size <= 0');
		}
		if (sizeSteps <= 0 || !isFinite(sizeSteps)) {
			throw ('sizeSteps <= 0');
		}

		this.size = 0;
		this.sizeSteps = sizeSteps || 1;
		this.maxSize = size + (this.sizeSteps * 5);
		this.objType = objType;
		this.position = 0;
		this.pool = [];
		//this.pools = [[]];
		this.expandPool(size);

		this.createCount = 0;
		this.createFullCount = 0;
		this.createNewCount = 0;
		this.createPoolCount = 0;

		this.getPoolIndexIndexOfCount = 0;

		this.expandPoolCount = 0;

		this.destroyCount = 0;
		this.destroyNoIndexCount = 0;

		this.positionTide = 0;
	}

	ObjectPool.prototype.create = function () {
		var obj;
		this.createCount++;

		if (this.position >= this.size) {
			this.createFullCount++;
			if (this.size < this.maxSize) {
				this.expandPool(this.size + this.sizeSteps);
			} else {
				this.createNewCount++;
				obj = new this.objType();
			}
		}
		if (!obj) {
			obj = this.pool[this.position++];
			this.createPoolCount++;
		}

		//re-initialise the object.
		obj.constructor.apply(obj, arguments);

		if (this.position > this.positionTide) {
			this.positionTide = this.position;
		}

		return obj;
	}

	//function setObjectPoolIndex(obj, pool, index) {
	//if (typeof obj.setObjectPool === 'function') {
	//	obj.setObjectPool(pool, index);
	//}
	//}

	//function getObjectPoolIndex(obj) {
	//	var objIndex;
	//if (typeof obj.getObjectPoolIndex === 'function') {
	//	objIndex = obj.getObjectPoolIndex();
	//} else {
	////slow but at least we get the Object
	//this.getPoolIndexIndexOfCount++;
	//objIndex = this.pool.indexOf(obj);
	//}
	//	return objIndex;
	//}

	ObjectPool.prototype.expandPool = function (newSize) {
		this.expandPoolCount++;
		//create a new pool of the new size
		var newPool = new Array(newSize);

		//copy across all the old pointers
		for (var i = 0; i < this.size; i++) {
			newPool[i] = this.pool[i];
		}

		//re-point the pool
		this.pool = newPool;

		//create a new batch to fill in the rest of the array
		for (var i = this.size; i < newSize; i++) {
			var obj = new this.objType();
			//setObjectPoolIndex(obj, this, i);
			obj.setObjectPool(this, i);

			this.pool[i] = obj;
		}

		this.size = newSize;
	}

	ObjectPool.prototype.destroy = function (obj) {
		this.destroyCount++;
		if (!(obj instanceof this.objType)) {
			console.debug("Object not the right type: ", obj, this.objType);
			return;
		}

		//var objIndex = getObjectPoolIndex(obj);
		var objIndex = obj.getObjectPoolIndex();

		if (objIndex < 0) {
			if (destroyNoIndexCount < 100) {
				console.debug("Object not found in pool: ", obj);
			}
			this.destroyNoIndexCount++;
			return;
		}

		//we take the now freed object and move it up the top of the pool,
		this.position--;

		//the one at the top is moved down to where the old obj was, the indexes are swapped.
		var topObj = this.pool[this.position];
		//var topObjIndex = getObjectPoolIndex(topObj); //could use this.position;
		var topObjIndex = this.position;

		this.pool[topObjIndex] = obj;
		//setObjectPoolIndex(obj, this, topObjIndex);
		obj.setObjectPool(this, topObjIndex);
		this.pool[objIndex] = topObj;
		//setObjectPoolIndex(topObj, this, objIndex);
		topObj.setObjectPool(this, objIndex);
	}

	ObjectPool.prototype.getStats = function () {
		return "Size: " + this.size + "\n" +
		"sizeSteps: " + this.sizeSteps + "\n" +
		"maxSize: " + this.maxSize + "\n" +
		"objType: " + this.objType.name + "\n" +
		"position: " + this.position + "\n" +
		"positionTide: " + this.positionTide + "\n" +
		"usage: " + Math.floor((this.position / this.size) * 100) + "%\n" +
		"createCount: " + this.createCount + "\n" +
		"createFullCount: " + this.createFullCount + "\n" +
		"createNewCount: " + this.createNewCount + "\n" +
		"createPoolCount: " + this.createPoolCount + "\n" +
		"getPoolIndexIndexOfCount: " + this.getPoolIndexIndexOfCount + "\n" +
		"expandPoolCount: " + this.expandPoolCount + "\n" +
		"destroyCount: " + this.destroyCount + "\n" +
		"destroyNoIndexCount: " + this.destroyNoIndexCount;
	}

	return ObjectPool;
});
