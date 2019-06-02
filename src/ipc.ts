/* eslint-disable */
// https://github.com/segmentio/nightmare/blob/master/lib%2Fipc.js

/**
 * Module dependencies
 */
import {EventEmitter as Emitter} from 'events';
// var Emitter = require('events').EventEmitter;
// var sliced = require('sliced');

/**
 * Export `ipc`
 */

// module.exports = ipc;
/**
 * Initialize `ipc`
 */
export function ipc(process: any) {
    var emitter: any = new Emitter();
    var emit = emitter.emit;

    // no parent
    if (!process.send) {
        return emitter;
    }

    process.on('message', function (data: any) {
        // emit.apply(emitter, sliced(data));
        emit.apply(emitter, [...data]);
    });

    emitter.emit = function () {
        if (process.connected) {
            // process.send(sliced(arguments));
            process.send(Array.from(arguments));
        }
    };

    return emitter;
}
