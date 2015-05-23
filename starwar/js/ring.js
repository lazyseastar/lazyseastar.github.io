/// <reference path="ani.js" />
"use strict";
function Ring(parent, innerRadius, outerRadius, circleColor, sectorColor) {
    Ani.call(this);
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.circleColor = circleColor;
    this.sectorColor = sectorColor;
    this.o = this.outerRadius + 1;
    this.size = this.o * 2;
    this.startAngle = Math.PI / 2 * 3;
    this.percent = 0;
    this.id = null;
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    parent.appendChild(this.canvas);
}
Ring.prototype = Object.create(Ani.prototype);
Ring.prototype.constructor = Ring;
Ring.prototype.drawCircle = function () {
    this.context.beginPath();
    this.context.arc(this.o, this.o, this.outerRadius - 2, 0, Math.PI * 2);
    this.context.fillStyle = this.circleColor;
    this.context.fill();
};
Ring.prototype.drawSector = function () {
    this.context.beginPath();
    this.context.moveTo(this.o, this.o);
    var endAngle = this.startAngle + this.percent * Math.PI * 2;
    this.context.arc(this.o, this.o, this.outerRadius, this.startAngle, endAngle);
    this.context.fillStyle = this.sectorColor;
    this.context.fill();
};
Ring.prototype.clearCircle = function () {
    this.context.globalCompositeOperation = "destination-out";
    this.context.beginPath();
    this.context.arc(this.o, this.o, this.innerRadius, 0, Math.PI * 2);
    this.context.fill();
    this.context.globalCompositeOperation = "source-over";
};
Ring.prototype.onUpdate = function () {
    this.context.clearRect(0, 0, this.size, this.size);
    this.drawCircle();
    this.drawSector();
    this.clearCircle();
};