import './runnerIpc';
import {app, session, ipcMain, BrowserWindow, Session} from "electron";
import {tmpdir} from "os";
import {join} from "path";
import fs from "fs";
// let open = require('open')
let mime = require('mime');

let downloadDir = join(__dirname, '../download');
try {
    fs.mkdirSync(downloadDir);
} catch (err) {
    // ignore
}

let win: any;

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

app.on('activate', () => {
    if (win) win.show()
});

app.on('ready', () => {
    let show = true; // 是否显示浏览器窗口
    let preload = join(__dirname, 'preload.js');

    win = new BrowserWindow({
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
