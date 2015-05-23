"use strict";
function EventManager() {
    this.handlers = {};
}
EventManager.prototype = {
    constructor: EventManager,
    on: function (eventType, handler) {
        if (!(eventType in this.handlers)) {
            this.handlers[eventType] = [];
        }
        this.handlers[eventType].push(handler);
    },
    emit: function (eventType, thisArg) {
        var handlerArgs = Array.prototype.slice.call(arguments, 2);
        this.handlers[eventType].forEach(function (handler) {
            handler.apply(thisArg, handlerArgs);
        });
    },
    off: function (eventType, handle) {
        var array = this.handlers[eventType];
        if (handle) {
            var index = array.indexOf(handle);
            if (index !== -1) {
                array.splice(index, 1);
                if (!array.length) {
                    delete this.handlers[eventType];
                }
            }
        }
        else {
            delete this.handlers[eventType];
        }
    }
};