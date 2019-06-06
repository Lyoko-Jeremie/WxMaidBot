import {ipcRenderer} from 'electron';


;['log', 'info', 'warn', 'error'].forEach(k => {
    let fn = (console as any)[k].bind(console);
    // @ts-ignore
    console[k] = (...args) => {
        fn(...args);
        ipcRenderer.send('renderer', k, args);
    }
});

export function ipcSendBackInfo(o: any) {
    ipcRenderer.send('ipcSendBackInfo', o);
}



