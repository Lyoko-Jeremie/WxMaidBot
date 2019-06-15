import './runnerIpc';
import {app, session, ipcMain, BrowserWindow, Session} from "electron";
import {tmpdir} from "os";
import {join} from "path";
import fs from "fs";
import {URL} from 'url';
import * as url from "url";
import * as path from "path";
import {delay} from "./util";
let mime = require('mime');

let downloadDir = join(__dirname, '../download');
try {
    fs.mkdirSync(downloadDir);
} catch (err) {
    // ignore
}

let win: BrowserWindow;

// 将renderer的输出 转发到terminal
ipcMain.on('renderer', (e: any, k: string, args: any) => {
    // @ts-ignore
    console[k]('renderer', k, args)
});

ipcMain.on('ipcSendBackInfo', (e: any, obj: any) => {
    // @ts-ignore
    console[k]('ipcSendBackInfo', JSON.stringify(obj));

    // TODO

});

app.on('web-contents-created', (event, contents) => {
    contents.on('will-attach-webview', (event, webPreferences, params) => {
        console.log('will-attach-webview', webPreferences, JSON.stringify(webPreferences));

        // Strip away preload scripts if unused or verify their location is legitimate
        delete webPreferences.preload;
        delete webPreferences.preloadURL;

        // Disable Node.js integration
        webPreferences.nodeIntegration = false;

        // // Verify URL being loaded
        // if (!params.src.startsWith('https://example.com/')) {
        //     event.preventDefault()
        // }
    })
});

app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        console.log('will-navigate', navigationUrl, parsedUrl);

        // if (parsedUrl.origin !== 'https://example.com') {
        //     event.preventDefault()
        // }
    })
});

app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', async (event, navigationUrl) => {
        console.log('new-window', navigationUrl);
        // In this example, we'll ask the operating system
        // to open this event's url in the default browser.
        event.preventDefault();

        // await shell.openExternal(navigationUrl)
    })
});

app.on('activate', () => {
    if (win) win.show()
});

app.on('ready', async () => {
    // await delay(10000);

    // console.log(join(__dirname, '../../wxbot-ext/AngularJS_v0.10.9'));
    // BrowserWindow.addDevToolsExtension(join(__dirname, '../../wxbot-ext/AngularJS_v0.10.9'));
    // BrowserWindow.addDevToolsExtension(join(__dirname, '../../wxbot-ext/jQuery-Debugger_v0.1.3.2'));
    // BrowserWindow.addDevToolsExtension(join(__dirname, '../../wxbot-ext/Vue.js-devtools_v5.1.0'));

    let show = true; // 是否显示浏览器窗口
    let preload = join(__dirname, 'preload.js');

    win = new BrowserWindow({
        // transparent: true,
        // frame: false,
        webPreferences: {
            preload,
            nodeIntegration: false
        },
        width: 900,
        height: 610,
        show
    });

    // Ctrl+C只会发送win.close 并且如果已登录  窗口还关不掉
    // 所以干脆改为窗口关闭 直接退出
    // https://github.com/electron/electron/issues/5273
    win.on('close', (e: any) => {
        e.preventDefault();
        win.destroy();
    });

    win.once('ready-to-show', () => {
        win.show();
    });
    win.loadURL('https://wx.qq.com');
    // win.loadURL(url.format({
    //     pathname: path.join(__dirname, '../src/index.html'),
    //     protocol: 'file:',
    //     slashes: true,
    // }));

    let sess: Session = (<Session>session.defaultSession);
    sess.on('will-download', async (e, item) => {
        let url = item.getURL();

        if (/\/qrcode\/.+==/.test(url)) { // 登录二维码
            let dest = join(tmpdir(), `qrcode_${Date.now()}.jpg`);
            let state = await saveItem(item, dest, '二维码保存');

            // todo: 如果是运行在无界面环境 则需要将二维码通过url展示出来
            // 如果不显示浏览器窗口 则调用程序单独打开二维码
            // if (!show && state === 'completed') {
            //   open(dest, err => {
            //     if (err) {
            //       console.error('二维码打开 err:', err)
            //     }
            //   })
            // }
        } else { // 下载消息中的多媒体文件 图片/语音
            let mimeType = item.getMimeType();
            let filename = item.getFilename();
            let ext = mime.extension(mimeType);

            // 修复mime缺少映射关系: `audio/mp3` => `mp3`
            if (mimeType === 'audio/mp3') ext = 'mp3';
            if (ext === 'bin') ext = '';
            if (ext) filename += '.' + ext;

            let date = new Date().toJSON();
            filename = date + '_' + filename;

            // 跨平台文件名容错
            // http://blog.fritx.me/?weekly/160227
            filename = filename.replace(/[\\\/:\*\,"\?<>|]/g, '_');

            let dest = join(downloadDir, filename);
            await saveItem(item, dest, `文件保存 ${filename}`);
        }
    })
});

async function saveItem(item: any, dest: string, log: string) {
    item.setSavePath(dest);
    return await new Promise(rs => {
        item.on('done', (e: any, state: any) => {
            console.log(`${log} state:${state}`);
            rs(state);
        });
    });
}
