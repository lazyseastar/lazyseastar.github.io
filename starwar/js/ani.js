"use strict";
function Ani() {
    this.id = null;
}
Ani.prototype = {
    constructor: Ani,
    start: function () {
        this.onStart();
        this.update();
    },
    update: function () {
        this.id = requestAnimationFrame(this.update.bind(this));
        this.onUpdate();
    },
    done: function () {
        cancelAnimationFrame(this.id);
        this.onDone();
    },
    onStart: function () { },
    onUpdate: function () { },
    onDone: function () { }
};