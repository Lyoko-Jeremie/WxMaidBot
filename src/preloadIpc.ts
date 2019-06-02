import {ipcRenderer} from 'electron';

;['log', 'info', 'warn', 'error'].forEach(k => {
    // @ts-ignore
    let fn = console[k].bind(console);
    // @ts-ignore
    console[k] = (...args) => {
        fn(...args);
        ipcRenderer.send('renderer', k, args);
    }
});

export function ipcSendBackInfo(o: any) {
    ipcRenderer.send('ipcSendBackInfo', o);
}



