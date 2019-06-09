import './preloadIpc';
import {clipboard, nativeImage, remote} from 'electron';
import {s, sa, delay, download} from './util';
import {parseMsg} from './parseMsg';
import {replyMsg} from './replyMsg';
import {Clipboard} from 'electron';
import {isNil} from 'lodash';
import {ipcSendBackInfo} from "./preloadIpc";
import {angularScope, angularSelector} from "./angularJsHelper";
import {carTeachStringAnalysis} from "./messageAnalyzer";

// console.log(remote);

const Key_Room_title = remote.process.env.Key_Room_title;

let messageHistoryStorage: Map<string, Array<any>> = new Map<string, Array<any>>();


// 禁用微信网页绑定的beforeunload
// 导致页面无法正常刷新和关闭
(<any>window).__defineSetter__('onbeforeunload', () => {
    // noop
});

document.addEventListener('DOMContentLoaded', () => {
    // 禁止外层网页滚动 影响使用
    document.body.style.overflow = 'hidden';

    detectPage();
});

function detectPage() {
    console.log("detectPage..........");
    let ps = [
        detectCache(), // 协助跳转
        detectLogin(),
        detectChat()
    ];

    // 同时判断login和chat 判断完成则同时释放
    Promise.race(ps)
        .then((data: any) => {
            ps.forEach((p) => (<any>p).cancel());

            let {page, qrcode} = data;
            console.log(`目前处于${page}页面`);

            if (page === 'login') {
                download(qrcode);
            } else if (page === 'chat') {
                // autoReply();
                onChat();
            }
        });
}


class WaitingSendInfo {
    constructor(
        public analysisInfo: carTeachStringAnalysis.AnalysisInfoType,
        public segmentInfo: carTeachStringAnalysis.SegmentInfoType,
        public s: string
    ) {
    }
}

async function onChat_do() {

    let title = detectCurrentChatTitle();
    if (!title) {
        await delay(500);
        return;
    }

    await delay(100);
    // console.log(title);
    let mh = messageHistoryStorage.get(title);
    if (!mh) {
        mh = [];
        messageHistoryStorage.set(title, mh);
    }

    let msg = await detectMsgOnCurrentChat();
    msg = msg.filter(T => T.type === 'text');
    msg = msg.filter(T => T.room === title);
    // console.log(msg);

    // find the new message list on all visible message
    let lastMH = {text: null, from: null};
    if (mh.length > 0) {
        lastMH = mh[mh.length - 1];
    }
    let indexLast = msg.findIndex(T => T.text === lastMH.text && T.from === lastMH.from);
    if (indexLast !== undefined) {
        msg = msg.slice(indexLast + 1);
    }
    mh = mh.concat(msg);
    messageHistoryStorage.set(title, mh);

    if (msg.length === 0) {
        return;
    }

    console.log(msg);

    let waitingSendList: WaitingSendInfo[] = [];
    msg.forEach(IT => {
        let T = IT.text;
        console.log('msg.forEach');
        if (!carTeachStringAnalysis.checkMessage(T)) {
            console.log('checkMessage failed.');
            return;
        }

        console.log('checkMessage ok');
        if (carTeachStringAnalysis.isFinally(T)) {
            console.log('isFinaly!.');
            return;
        }

        console.log('isFinaly ok');
        let analysisData: carTeachStringAnalysis.AnalysisInfoType
            = carTeachStringAnalysis.analysisInfo(T);
        let [lines, infoTypes] = analysisData;
        // console.log('analysisData lines', lines);
        // console.log('analysisData infoTypes', infoTypes);
        // infoTypes.forEach((L: any) => {
        //     console.log(JSON.stringify(L, null, 0));
        // });

        let ndCheck = carTeachStringAnalysis.checkIsNextDay(analysisData);
        console.log('ndCheck', ndCheck);
        if (ndCheck === -1) {
            console.log('ndCheck === -1');
            return;
        }

        if (!ndCheck) {
            console.log('!ndCheck');
            return;
        }

        let segmentData: carTeachStringAnalysis.SegmentInfoType
            = carTeachStringAnalysis.getSegmentInfo(analysisData);

        segmentData = carTeachStringAnalysis.detectUserName(analysisData, segmentData);
        // console.log('theDate', theDate);
        // console.log('segmentData', JSON.stringify(segmentData, undefined, 2));
        // console.log('segmentData', segmentData);

        let [theDate, segmentInfoList] = segmentData;
        if (isNil(theDate)) {
            console.log('isNil(theDate)');
            return;
        }

        let line = -1;
        let targetHours = [
            {begin: 14, end: 16,},
            {begin: 16, end: 18,},
            {begin: 12, end: 14,},
        ];
        let targetListMode: boolean = true;
        if (targetListMode) {
            console.log("segmentInfoList", "TargetList Mode");
            if (segmentInfoList.every(T => !!T.limit && !!T.nameInfo)) {
                // good case
                console.log("segmentInfoList", "good case");
                line = carTeachStringAnalysis.checkAndFindTargetNotFullSegmentByList(
                    segmentInfoList,
                    targetHours,
                );
            } else if (segmentInfoList.every(T => !!T.nameInfo)) {
                // half down level case fullFlag
                console.log("segmentInfoList", "half down level case fullFlag");
                line = carTeachStringAnalysis.checkAndFindTargetNotFullSegmentByList(
                    segmentInfoList,
                    targetHours,
                    {limit: false, fullFlag: true},
                );
            } else {
                // down level case all
                console.log("segmentInfoList", "down level case all");
                line = carTeachStringAnalysis.checkAndFindTargetSegmentByList(
                    segmentInfoList,
                    targetHours,
                );
            }
        } else {
            console.log("segmentInfoList", "TargetOrLast Mode");
            if (segmentInfoList.every(T => !!T.limit && !!T.nameInfo)) {
                // good case
                console.log("segmentInfoList", "good case");
                line = carTeachStringAnalysis.checkAndFindTargetOrLastNotFullSegment(
                    segmentInfoList,
                    targetHours[0].begin, targetHours[0].end
                );
            } else {
                // down level case
                console.log("segmentInfoList", "down level case");
                line = carTeachStringAnalysis.checkAndFindTargetOrLastSegment(
                    segmentInfoList,
                    targetHours[0].begin, targetHours[0].end
                );
            }
        }
        if (-1 == line) {
            // cannot find , all are full
            console.error("!!!cannot find , all are full!!!");
        } else {
            analysisData = carTeachStringAnalysis.addKeyString(analysisData, line);
            analysisData = carTeachStringAnalysis.fixAngerFlagOnTimeLine(analysisData);
            let s = carTeachStringAnalysis.re_construct(analysisData);

            waitingSendList.push(new WaitingSendInfo(analysisData, segmentData, s));
            // let opt = {text: s};
            // pasteMsg(opt);
            // await clickSend(opt);
        }

    });

    for (let i = 0; i != waitingSendList.length; ++i) {
        let w = waitingSendList[i];
        let opt = {text: w.s};
        pasteMsg(opt);
        await clickSend(opt);
    }

}

async function onChat() {
    while (true) {
        try {
            await onChat_do();
        } catch (err) {
            console.error('onChat err', err);
        }
    }
}

function detectCurrentChatTitle(): string | undefined {
    let scope: any = angularScope('#chatArea > div.box_hd > div.title_wrap > div > a');
    if (scope.currentContact) {
        return scope.currentContact.getDisplayName();
    }
    return undefined;
}

async function detectMsgOnCurrentChat() {

    let $msg: JQLite = $([
        '.message:not(.me) .bubble_cont > div',
        '.message:not(.me) .bubble_cont > a.app',
        '.message:not(.me) .emoticon',
        '.message_system'
    ].join(', '));

    let msgList: any[] = [];
    $msg.map((i, T) => {
        let msg = parseMsg($(T));
        msgList.push(msg);
    });
    return msgList;

    // let $msg = $([
    //     '.message:not(.me) .bubble_cont > div',
    //     '.message:not(.me) .bubble_cont > a.app',
    //     '.message:not(.me) .emoticon',
    //     '.message_system'
    // ].join(', ')).last();
    // let msg = parseMsg($msg);
    // return msg;
}

async function autoReply() {
    while (true) { // 保持回复消息
        try {
            let msg = await detectMsg();
            console.log('解析得到msg', JSON.stringify(msg));

            let reply = await replyMsg(msg);
            console.log('reply', JSON.stringify(reply));

            if (reply) {
                // continue // test: 不作回复
                pasteMsg(reply);
                await clickSend(reply);
            }
        } catch (err) {
            console.error('自动回复出现err', err);
        }
    }
}

async function detectMsg() {
    // 重置回"文件传输助手" 以能接收未读红点
    // @ts-ignore
    s('img[src*=filehelper]').closest('.chat_item').click();

    let reddot;
    while (true) {
        await delay(100);
        reddot = s('.web_wechat_reddot, .web_wechat_reddot_middle');
        if (reddot) break;
    }

    // TODO filter the chat by name,  only get the special chat

    let item = reddot.closest('.chat_item');
    // @ts-ignore
    item.click();

    await delay(100);
    let $msg = $([
        '.message:not(.me) .bubble_cont > div',
        '.message:not(.me) .bubble_cont > a.app',
        '.message:not(.me) .emoticon',
        '.message_system'
    ].join(', ')).last();

    let msg = parseMsg($msg);
    return msg;
}

// 借用clipboard 实现输入文字 更新ng-model=EditAreaCtn
function pasteMsg(opt: any) {
    let oldImage = clipboard.readImage();
    let oldHtml = (<any>clipboard).readHtml();
    let oldText = clipboard.readText();

    clipboard.clear(); // 必须清空
    if (opt.image) {
        // 不知为啥 linux上 clipboard+nativeimage无效
        try {
            clipboard.writeImage(nativeImage.createFromPath(opt.image));
        } catch (err) {
            opt.image = null;
            opt.text = '妈蛋 发不出图片';
        }
    }
    if (opt.html) (<any>clipboard).writeHtml(opt.html);
    if (opt.text) clipboard.writeText(opt.text);
    // @ts-ignore
    s('#editArea').focus();
    document.execCommand('paste');

    clipboard.writeImage(oldImage);
    (<any>clipboard).writeHtml(oldHtml);
    clipboard.writeText(oldText);
}

async function clickSend(opt: any) {
    if (opt.text) {
        // @ts-ignore
        s('.btn_send').click();
    } else if (opt.image) {
        // fixme: 超时处理
        while (true) {
            await delay(300);
            let btn = s('.dialog_ft .btn_primary');
            if (btn) {
                // @ts-ignore
                btn.click(); // 持续点击
            } else {
                return;
            }
        }
    }
}

// 需要定制promise 提供cancel方法
function detectChat() {
    let toCancel = false;

    let p = (async () => {
        while (true) {
            if (toCancel) return;
            await delay(300);

            let item = s('.chat_item');
            if (item) {
                return {page: 'chat'};
            }
        }
    })();

    (<any>p).cancel = () => {
        toCancel = true
    };
    return p;
}

// 需要定制promise 提供cancel方法
function detectLogin() {
    let toCancel = false;

    let p = (async () => {
        while (true) {
            if (toCancel) return;
            await delay(300);

            // 共有两次load事件 仅处理后一次
            // 第1次src https://res.wx.qq.com/a/wx_fed/webwx/res/static/img/2z6meE1.gif
            // 第2次src https://login.weixin.qq.com/qrcode/IbAG40QD6A==
            let img = s('.qrcode img');
            // @ts-ignore
            if (img && img.src.endsWith('==')) {
                return {
                    page: 'login',
                    // @ts-ignore
                    qrcode: img.src
                };
            }
        }
    })();

    (<any>p).cancel = () => {
        toCancel = true
    };
    return p;
}

// 需要定制promise 提供cancel方法
// 可能跳到缓存了退出登陆用户头像的界面，手动点一下切换用户，以触发二维码下载
function detectCache() {
    let toCancel = false;

    let p = (async () => {
        while (true) {
            if (toCancel) return;
            await delay(300);

            let btn = s('.association .button_default');
            if (btn) {
                // @ts-ignore
                btn.click();
            } // 持续点击
        }
    })();

    (<any>p).cancel = () => {
        toCancel = true
    };
    return p;
}
