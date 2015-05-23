/// <reference path="ani.js" />
"use strict";
function Transit(target) {
    Ani.call(this);
    this.target = target;
    this.stateArray = [];
    this.duration = 0;
    this.callbacks = [];
    this.first = true;
    this.tween = {};
    this.startTime = 0;
}
Transit.prototype = Object.create(Ani.prototype);
Transit.prototype.constructor = Transit;
Transit.prototype.to = function (state, duration, callback) {
    this.stateArray.push(state);
    this.duration = duration;
    callback = callback || function () { };
    this.callbacks.push(callback);
};
Transit.prototype.onUpdate = function () {
    if (this.stateArray.length) {
        if (this.first) {
            for (var p in this.stateArray[0]) {
                this.tween[p] = {
                    start: this.target[p],
                    diff: this.stateArray[0][p] - this.target[p]
                };
            }
            this.first = false;
            this.startTime = Date.now();
        }
        var diff = Date.now() - this.startTime;
        if (diff < this.duration) {
            for (var p in this.tween) {
                var i = this.tween[p];
                this.target[p] = diff * i.diff / this.duration + i.start;
            }
        }
        if (diff >= this.duration) {
            for (var p in this.tween) {
                this.target[p] = this.stateArray[0][p];
            }
            this.stateArray.shift();
            this.callbacks[0]();
            this.callbacks.shift();
            this.first = true;
        }
    }
};
Transit.prototype.each = function () { };