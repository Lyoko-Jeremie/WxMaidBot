function debug(...args: string[]) {
    const json = JSON.stringify(args);
    console.log(json);
}

// msg = {
//   from, room, style,
//   type:
//     not supported|not recognized
//     text|picture|app|card|location|attach
//     sticker|emoticon|transfer
//     voice|video|microvideo|video/voice call
//     real-time location|real-time voice
//     ----
//     red packet|recall
//     new member|member is stranger
//     real-time location ended|real-time voice ended
//   text|title|desc|src|poster...
// }
export
function parseMsg($msg: any) {
    let msg = {};
    let $message = $msg.closest('.message');
    let $nickname = $message.find('.nickname');
    let $titlename = $('.title_name');

    let from: any;
    let room: any;
    if ($nickname.length) { // 群聊
        from = $nickname.text();
        room = $titlename.text();
    } else { // 单聊
        from = $titlename.text();
        room = null;
    }
    Object.assign(msg, {
        from, room
    });
    // debug('来自', from, room);  // 这里的nickname会被remark覆盖

    if ($msg.is('.message_system')) {
        let ctn = $msg.find('.content').text();
        // debug('接收', '系统标记', ctn);
        Object.assign(msg, {
            style: 'system',
            text: ctn
        });

        let mat;
        if (ctn === '收到红包，请在手机上查看' ||
            ctn === 'Red packet received. View on phone.') {
            Object.assign(msg, {
                type: 'red packet'
            });
        } else if (ctn === '位置共享已经结束' ||
            ctn === 'Real-time Location session ended.') {
            Object.assign(msg, {
                type: 'real-time location ended'
            });
        } else if (ctn === '实时对讲已经结束') {
            Object.assign(msg, {
                type: 'real-time voice ended'
            });
        } else if (mat = ctn.match(/"(.+)"邀请"(.+)"加入了群聊/)) {
            Object.assign(msg, {
                type: 'new member',
                by: mat[1],
                who: mat[2]
            });
        } else if (mat = ctn.match(/"(.+)"与群里其他人都不是微信朋友关系，请注意隐私安全/)) {
            Object.assign(msg, {
                type: 'member is stranger',
                who: mat[1]
            });
        } else if (mat = ctn.match(/You were removed from the group chat by "(.+)"/)) {
            Object.assign(msg, {
                type: 'removed',
                by: mat[1]
            });
        } else if (mat = ctn.match(/(.+)(撤回了一条消息| withdrew a message)/)) {
            Object.assign(msg, {
                type: 'recall',
                by: mat[1]
            });
        } else {
            // 无视
            Object.assign(msg, {
                type: 'not recognized',
                text: ctn
            });
        }
    } else if ($msg.is('.emoticon')) { // 用户自定义表情
        let src = $msg.find('.msg-img').prop('src');
        // debug('接收', 'emoticon', src);
        Object.assign(msg, {
            type: 'emoticon',
            src
        });
    } else if ($msg.is('.picture')) {
        let src = $msg.find('.msg-img').prop('src');
        // debug('接收', 'picture', src);
        Object.assign(msg, {
            type: 'picture',
            src
        });
    } else if ($msg.is('.location')) {
        let src = $msg.find('.img').prop('src');
        let desc = $msg.find('.desc').text();
        // debug('接收', 'location', desc);
        Object.assign(msg, {
            type: 'location',
            src, desc
        });
    } else if ($msg.is('.attach')) {
        let title = $msg.find('.title').text();
        let size = $msg.find('span:first').text();
        let $download = $msg.find('a[download]'); // 可触发下载
        let src = $download.prop('href');
        // debug('接收', 'attach', title, size);
        Object.assign(msg, {
            type: 'attach',
            title, size, src
        });
    } else if ($msg.is('.microvideo')) {
        let poster = $msg.find('img').prop('src'); // 限制
        let src = $msg.find('video').prop('src'); // 限制
        // debug('接收', 'microvideo', poster);
        Object.assign(msg, {
            type: 'microvideo',
            poster, src
        });
    } else if ($msg.is('.video')) {
        let poster = $msg.find('.msg-img').prop('src'); // 限制
        // debug('接收', 'video', poster);
        Object.assign(msg, {
            type: 'video',
            poster
        });
    } else if ($msg.is('.voice')) {
        $msg[0].click();
        let duration = parseInt($msg.find('.duration').text());
        let src = $('#jp_audio_1').prop('src'); // 认证限制
        // debug('接收', 'voice', `${duration}s`, src);
        Object.assign(msg, {
            type: 'voice',
            duration, src
        });
    } else if ($msg.is('.card')) {
        let name = $msg.find('.display_name').text();
        let wxid = $msg.find('.signature').text(); // 微信注释掉了
        let img = $msg.find('.img').prop('src'); // 认证限制
        // debug('接收', 'card', name, wxid);
        Object.assign(msg, {
            type: 'card',
            name, img
        });
    } else if ($msg.is('a.app')) {
        let url = $msg.attr('href');
        url = decodeURIComponent(url.match(/requrl=(.+?)&/)[1]);
        let title = $msg.find('.title').text();
        let desc = $msg.find('.desc').text();
        let img = $msg.find('.cover').prop('src'); // 认证限制
        // debug('接收', 'link', title, desc, url);
        Object.assign(msg, {
            type: 'app',
            url, title, desc, img
        });
    } else if ($msg.is('.plain')) {
        // let text = '';
        let ctn = '';
        // let normal = false;
        let $text = $msg.find('.js_message_plain');
        $text.contents().each(function (i: number, node: Element) {
            if (node.nodeType === Node.TEXT_NODE) {
                ctn += node.nodeValue;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                let $el = $(node);
                if ($el.is('br')) ctn += '\n';
                else if ($el.is('.qqemoji, .emoji')) {
                    ctn += $el.attr('text').replace(/_web$/, '');
                }
            }
        });
        if (ctn === '[收到了一个表情，请在手机上查看]' ||
            ctn === '[Send an emoji, view it on mobile]' ||
            ctn === '[Received a sticker. View on phone]') { // 微信表情包
            Object.assign(msg, {
                type: 'sticker' // 微信内部表情
            });
        } else if (ctn === '[收到一条微信转账消息，请在手机上查看]' ||
            ctn === '[Received a micro-message transfer message, please view on the phone]' ||
            ctn === '[Received transfer. View on phone.]') {
            Object.assign(msg, {
                type: 'transfer'
            });
        } else if (ctn === '[收到一条视频/语音聊天消息，请在手机上查看]' ||
            ctn === '[Receive a video / voice chat message, view it on your phone]' ||
            ctn === '[Received video/voice chat message. View on phone.]') {
            Object.assign(msg, {
                type: 'video/voice call'
            });
        } else if (ctn === '我发起了实时对讲') {
            Object.assign(msg, {
                type: 'real-time voice'
            });
        } else if (ctn === '该类型暂不支持，请在手机上查看' ||
            ctn === '[收到一条网页版微信暂不支持的消息类型，请在手机上查看]') {
            Object.assign(msg, {
                type: 'not supported'
            });
        } else if (ctn.match(/(.+)发起了位置共享，请在手机上查看/) ||
            ctn.match(/(.+)Initiated location sharing, please check on the phone/) ||
            ctn.match(/(.+)started a real-time location session\. View on phone/)) {
            Object.assign(msg, {
                type: 'real-time location'
            });
        } else {
            // normal = true;
            // text = ctn
            Object.assign(msg, {
                type: 'text',
                text: ctn
            });
        }
        // debug('接收', 'text', ctn);
    } else {
        console.log('未成功解析消息', $msg.html());
        Object.assign(msg, {
            type: 'not recognized'
        });
    }

    return msg;
}
