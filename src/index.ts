import {spawn} from 'child_process';
import {join} from 'path';
import {ipc} from './ipc';
import electron from 'electron';

let runner = join(__dirname, 'runner.js');
// @ts-ignore
let proc = spawn(electron, ['--js-flags="--harmony"', runner], {
    stdio: [null, null, null, 'ipc']
});

let child = ipc(proc);
child.on('runner', (k: string | number, args: any) => {
    // @ts-ignore
    console[k](`runner:${k}`, ...args)
});

process.on('exit', end);
process.on('SIGINT', end);
process.on('SIGTERM', end);
process.on('SIGQUIT', end);
process.on('SIGHUP', end);
process.on('SIGBREAK', end);

function end() {
    if (proc.connected) proc.disconnect();
    proc.kill()
}
