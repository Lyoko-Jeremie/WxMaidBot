import _ from 'lodash';
import XRegExp from 'xregexp';
// https://thekevinscott.com/emojis-in-javascript/


console.log("XRegExp isInstalled astral? :", XRegExp.isInstalled('astral'));
if (!XRegExp.isInstalled('astral')) {
    console.log("XRegExp install astral !");
    XRegExp.install({
        // Enables support for astral code points in Unicode addons (implicitly sets flag A)
        astral: true,
    });
}
console.log("XRegExp isInstalled astral? :", XRegExp.isInstalled('astral'));


const Dingbats = '[\\u2700-\\u27bf]';

// const MiscellaneousSymbolsAndPictographs = '[\\ud800-\\udbff][\\udc00-\\udfff]';
// const SupplementalSymbolsAndPictographs = '[\\ud800-\\udbff][\\udc00-\\udfff]';
// const Emoticons = '[\\ud800-\\udbff][\\udc00-\\udfff]';
// const TransportAndMapSymbols = '[\\ud800-\\udbff][\\udc00-\\udfff]';
// const MiscellaneousSymbols = '[\u2600-\u26FF]';
// const ContryFlag = '(?:\\ud83c[\\udde6-\\uddff]){2}';

const EmojiFlag = '[\\u2700-\\u27bf]|(?:\\ud83c[\\udde6-\\uddff]){2}|[\\ud800-\\udbff][\\udc00-\\udfff]';

const EmojiTestReg = XRegExp.cache('(?:' + EmojiFlag + ')', 'gmuA');
const EmojiCatchReg = XRegExp.cache('(' + EmojiFlag + ')', 'gmuA');


// http://www.2ality.com/2013/09/javascript-unicode.html
export function toUTF16(codePoint: number) {
    const TEN_BITS = parseInt('1111111111', 2);

    function u(codeUnit: number) {
        return '\\u' + codeUnit.toString(16).toUpperCase();
    }

    if (codePoint <= 0xFFFF) {
        return u(codePoint);
    }
    codePoint -= 0x10000;

    // Shift right to get to most significant 10 bits
    const leadSurrogate = 0xD800 + (codePoint >> 10);

    // Mask to get least significant 10 bits
    const tailSurrogate = 0xDC00 + (codePoint & TEN_BITS);

    return u(leadSurrogate) + u(tailSurrogate);
}


export function testEmojiCatchReg(s: string) {
    XRegExp.forEach(s, EmojiCatchReg, (m, i) => {
        console.log('index:' + i);
        console.log(m[0]);
        console.log(m[1]);
        console.log(m[1].codePointAt(0));
        console.log(toUTF16(m[1].codePointAt(0) as number));
    });
}



