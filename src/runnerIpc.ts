import {ipc} from './ipc';

let parentProcess = ipc(process);

;['log', 'info', 'warn', 'error'].forEach(k => {
    // @ts-ignore
    let fn = console[k].bind(console);
    // @ts-ignore
    console[k] = (...args) => {
        fn(...args);
        parentProcess.emit('runner', k, args);
    }
});
