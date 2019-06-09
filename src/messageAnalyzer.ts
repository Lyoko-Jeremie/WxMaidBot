import _ from 'lodash';
import XRegExp from 'xregexp';
import moment from 'moment';
import {remote} from 'electron';

const key_string = remote.process.env.KEY_String;


console.log("XRegExp isInstalled astral? :", XRegExp.isInstalled('astral'));
if (!XRegExp.isInstalled('astral')) {
    console.log("XRegExp install astral !");
    XRegExp.install({
        // Enables support for astral code points in Unicode addons (implicitly sets flag A)
        astral: true,
    });
}
console.log("XRegExp isInstalled astral? :", XRegExp.isInstalled('astral'));

export namespace carTeachStringAnalysis {

    export function checkMessage(s: string) {
        return XRegExp.split(s, '\n').length > 5;
    }

    export function isFinally(s: string) {
        return XRegExp.test(s, XRegExp.cache(key_string, 'g'));
    }

    export enum InfoType {
        unknow, emptyLine,
        welcome, date,
        userNumberLimit, timeLine, userName, teacherLine,
        needMoreInfo, serviceCall,
    }

    export class Info {
        constructor(
            public type: InfoType,
            public beginLine: number,
            public other?: any,
            public s?: string) {
        }
    }

    export class NameListInfo {
        constructor(
            public lineB: number,
            public lineE: number,
            public oString: string,
            public nameNum: number = 0,
            public nameList: string[] = [],
            public fullFlag: boolean = false,
        ) {
        }
    }

    export class SegmentInfo {
        public bTH: number;
        public bTM: number;
        public eTH: number;
        public eTM: number;
        public nameInfo?: NameListInfo;

        constructor(
            public beginTimeS: string,
            public endTimeS: string,
            public limit: number | undefined,
            public line: number) {
            let parser = XRegExp.cache('(\\d+)(?:\\.|:|：)(00)');
            let bt = XRegExp.exec(beginTimeS, parser, 0);
            this.bTH = _.parseInt(bt[1]);
            this.bTM = _.parseInt(bt[2]);
            let et = XRegExp.exec(endTimeS, parser, 0);
            this.eTH = _.parseInt(et[1]);
            this.eTM = _.parseInt(et[2]);
        }
    }

    export  type AnalysisInfoType = [string[], Info[]];
    export  type SegmentInfoType = [{ month: number, day: number } | undefined, SegmentInfo[]];

    export function analysisInfo(s: string): AnalysisInfoType {
        let lines: string[] = XRegExp.split(s, '\n');
        let infoTypes: Info[] = lines.map((T, I) => {

            let r1 = XRegExp.cache('欢迎各位学员参加练车培训');
            if (r1.test(T)) {
                return new Info(InfoType.welcome, I);
            }
            let r2 = XRegExp.cache('^\\s*以下(?:时段|时间段)(?:可最多|最多可)约(\\d)+人.*$', 'uA');
            if (r2.test(T)) {
                return new Info(InfoType.userNumberLimit, I, {
                    userNumber: _.parseInt(XRegExp.exec(T, r2, 0)[1]),
                }, T);
            }
            let r3 = XRegExp.cache('(\\d+)月(\\d+)日练车安排时间表');
            if (r3.test(T)) {
                let m = XRegExp.exec(T, r3, 0);
                return new Info(InfoType.date, I, {
                    month: _.parseInt(m[1]),
                    day: _.parseInt(m[2]),
                }, T);
            }
            let r4 = XRegExp.cache('^\\s*(.(?:教练))\\s*(\\d{11})\\s*$', 'uA');
            if (r4.test(T)) {
                let m = XRegExp.exec(T, r4, 0);
                return new Info(InfoType.teacherLine, I, {
                    name: m[1],
                    phone: m[2],
                }, T);
            }
            let r5 = XRegExp.cache('监督投诉热线[^\\d]*(\\d{11})', 'uA');
            if (r5.test(T)) {
                let m = XRegExp.exec(T, r5, 0);
                return new Info(InfoType.serviceCall, I, {
                    phone: m[1],
                }, T);
            }
            let r6 = XRegExp.cache('^\\s*((\\d+(?:\\.|:|：)00)\\s*(?:—|--|-)\\s*(\\d+(?:\\.|:|：)00))(.*)$', 'uA');
            if (r6.test(T)) {
                let m = XRegExp.exec(T, r6, 0);
                return new Info(InfoType.timeLine, I, {
                    ta: m[1],
                    tb: m[2],
                    te: m[3],
                    other: m[4],
                    oe: XRegExp.cache('^\\s*$', 'uA').test(m[4])
                }, T);
            }
            let r7 = XRegExp.cache('^\\s*$', 'uA');
            if (r7.test(T)) {
                let m = XRegExp.exec(T, r7, 0);
                return new Info(InfoType.emptyLine, I, {}, T);
            }


            return new Info(InfoType.unknow, I, {}, T);
        });

        return [lines, infoTypes];
    }

    export function removeKeyString(data: AnalysisInfoType) {
        let checker = XRegExp.cache('^(.*)' + key_string + '(.*)$', 'uA');
        let [lines, infoTypes] = data;
        lines = lines.map(T => {
            return XRegExp.replace(T, checker, '$1$2');
        });
        return [lines, infoTypes];
    }

    // NOTE: this implemented the simplest version
    export function addKeyString(data: AnalysisInfoType, segmentBeginLine: number): AnalysisInfoType {
        let [lines, infoTypes] = data;

        lines[segmentBeginLine + 1] = key_string + " " + lines[segmentBeginLine + 1];

        return [lines, infoTypes];
    }

    export function checkAndFindTargetOrLastSegment(
        segmentInfoList: SegmentInfo[],
        targetBeginHours: number,
        targetEndHours: number,
    ) {
        let n = segmentInfoList.find(T => targetBeginHours === T.bTH && targetEndHours === T.eTH);
        if (_.isNil(n)) {
            return segmentInfoList[segmentInfoList.length - 1].line;
        } else {
            return n.line;
        }
    }

    export function checkAndFindTargetSegmentByList(
        segmentInfoList: SegmentInfo[],
        targetHours: { begin: number, end: number }[],
    ): number | -1 {
        for (let i = 0; i != targetHours.length; ++i) {
            let n = segmentInfoList.find(T => targetHours[i].begin === T.bTH && targetHours[i].end === T.eTH);
            if (!_.isNil(n)) {
                return n.line;
            }
        }
        return -1;
    }

    export function checkAndFindTargetNotFullSegmentByList(
        segmentInfoList: SegmentInfo[],
        targetHours: { begin: number, end: number }[],
        checkTag: { limit: boolean, fullFlag: boolean } = {limit: true, fullFlag: true},
    ): number | -1 {
        for (let i = 0; i != targetHours.length; ++i) {
            let it = segmentInfoList.find(T => targetHours[i].begin === T.bTH && targetHours[i].end === T.eTH);
            if (!_.isNil(it)) {
                if ((checkTag.fullFlag ? (it.nameInfo && !it.nameInfo.fullFlag) : true)
                    &&
                    (checkTag.limit ? (it.limit && it.nameInfo && it.limit > it.nameInfo.nameNum) : true)) {
                    return it.line;
                }
            }
        }
        return -1;
    }

    export function checkAndFindTargetOrLastNotFullSegment(
        segmentInfoList: SegmentInfo[],
        targetBeginHours: number,
        targetEndHours: number,
    ): number | -1 {
        let n = segmentInfoList.findIndex(T => targetBeginHours === T.bTH && targetEndHours === T.eTH);
        let maybeN = -1;
        if (n >= 0) {
            // console.log('cAFTOLNFS', "if (n >= 0) {");
            let si = segmentInfoList[n];
            if (si.nameInfo && si.limit &&
                (si.nameInfo.fullFlag || si.limit <= si.nameInfo.nameNum)) {
                // console.log('cAFTOLNFS', "si");
                maybeN = n;
                // n to last
                for (let i = maybeN; i != segmentInfoList.length; ++i) {
                    let it = segmentInfoList[i];
                    if ((it.nameInfo && !it.nameInfo.fullFlag)
                        &&
                        (it.limit && it.limit > it.nameInfo.nameNum)) {
                        maybeN = i;
                        break;
                    }
                }
                if (maybeN > n) {
                    // console.log('cAFTOLNFS', "maybeN");
                    return segmentInfoList[maybeN].line;
                }
                //  else {do last to 0}
                //  do ed on the function end
                // console.log('cAFTOLNFS', "{do last to 0}");
            } else {
                // console.log('cAFTOLNFS', "finded and");
                // finded and
                maybeN = n;
                return segmentInfoList[maybeN].line;
            }
        }
        // console.log('cAFTOLNFS', "if (n < 0)");
        // if (n < 0) or the above {n to last} cannot find
        {
            maybeN = segmentInfoList.length - 1;
            // last to 0

            let flag = false;
            for (let i = segmentInfoList.length - 1; i >= 0; --i) {
                let it = segmentInfoList[i];
                // console.log(i, it.limit, it.nameInfo);
                if ((it.nameInfo && !it.nameInfo.fullFlag)
                    &&
                    (it.limit && it.limit > it.nameInfo.nameNum)) {
                    maybeN = i;
                    flag = true;
                    break;
                }
            }
            if (flag) {
                return segmentInfoList[maybeN].line;
            } else {
                return -1;
            }
        }
    }

    export function re_construct(data: AnalysisInfoType) {
        let [lines, infoTypes] = data;
        console.log("re_construct 1", lines);
        let s = "";
        lines.forEach((T, I, A) => {
            s += T + (I === A.length - 1 ? '' : '\n');
        });
        console.log("re_construct 2", [s]);
        return s;
    }

    export function getSegmentInfo(data: AnalysisInfoType): SegmentInfoType {
        let [lines, infoTypes] = data;

        let siList: SegmentInfo[] = [];
        let nowLimit: number | undefined = undefined;
        let date: { month: number, day: number } | undefined = undefined;
        infoTypes.forEach(T => {
            switch (T.type) {
                case InfoType.date:
                    if (!_.isNil(date)) {
                        throw new Error("getSegmentInfo InfoType.date double error.");
                    }
                    date = T.other;
                    return;
                case InfoType.userNumberLimit:
                    nowLimit = T.other.userNumber;
                    return;
                case InfoType.timeLine:
                    siList.push(new SegmentInfo(T.other.tb, T.other.te, nowLimit, T.beginLine));
                    return;
                default:
                    break;
            }
        });
        return [date, siList];
    }

    export function checkIsNextDay(data: AnalysisInfoType): -1 | boolean {
        let [lines, infoTypes] = data;

        let n = infoTypes.find(T => T.type === InfoType.date);
        if (_.isNil(n)) {
            return -1;
        }

        let nextDay = moment().add('1d');
        let targetMonth = nextDay.month() + 1;
        let targetDay = nextDay.date() + 1;
        console.log("checkIsNextDay", [n.other, targetMonth, targetDay]);

        return n.other.day === targetDay && n.other.month === targetMonth;
    }

    export function fixAngerFlagOnTimeLine(data: AnalysisInfoType): AnalysisInfoType {
        let [lines, infoTypes] = data;

        let clear = XRegExp.cache('(.*)' + String.fromCodePoint(0x1F4A2) + '(.*)', 'uA');

        infoTypes.forEach((T, I) => {
            if (T.type === InfoType.timeLine) {
                // console.log("1F4A2 test");
                // console.log(Array.from(T.other.other));
                // console.log(String.fromCodePoint(0x1F4A2));
                // console.log(XRegExp.exec(T.other.other, clear, 0));
                // console.log(XRegExp.replace(T.other.other, clear, '$1$2'));
                // console.log(T.other.ta + String.fromCodePoint(0x1F4A2));
                // console.log(T.other.ta + String.fromCodePoint(0x1F4A2) + XRegExp.replace(T.other.other, clear, '$1$2'));
                lines[I] = T.other.ta + String.fromCodePoint(0x1F4A2)
                    + XRegExp.replace(T.other.other, clear, '$1$2');

            }
        });

        return [lines, infoTypes];
    }

    export function detectUserName(d1: AnalysisInfoType, d2: SegmentInfoType): SegmentInfoType {
        let [lines, infoTypes] = d1;
        let [date, segmentInfos] = d2;

        let nilChecker = XRegExp.cache('^\\s*$', 'uA');
        let numChecker = XRegExp.cache('\\d', 'uA');
        let nilSplitter = XRegExp.cache('\\s+', 'uA');
        let nameListLoop = XRegExp.cache('([^\\s]+)', 'guA');

        segmentInfos = segmentInfos.map((T) => {
            try {
                // if (!_.isNil(T.limit))
                {
                    let lineB: number = -1;
                    let lineE: number = -1;
                    let oString: string = "";
                    if (!XRegExp.test(infoTypes[T.line].other, nilChecker, 0) &&
                        !XRegExp.test(infoTypes[T.line].other, numChecker, 0)) {
                        lineB = T.line;
                        oString = infoTypes[T.line].other.other + '  ';
                    } else {
                        lineB = T.line + 1;
                    }
                    // console.log('lines', lines);
                    for (let i = T.line + 1; i != lines.length; ++i) {
                        if (infoTypes[i].type !== InfoType.unknow &&
                            infoTypes[i].type !== InfoType.emptyLine) {
                            lineE = i;
                            break;
                        }
                        // console.log('lines[i]', lines[i]);
                        // console.log(XRegExp.test(lines[i], nilChecker, 0));
                        // console.log(XRegExp.test(lines[i], numChecker, 0));
                        if (infoTypes[i].type === InfoType.unknow &&
                            !XRegExp.test(lines[i], nilChecker, 0) &&
                            !XRegExp.test(lines[i], numChecker, 0)) {
                            oString = oString + lines[i] + '  ';
                        }
                        // lines[i];
                        // infoTypes[i];
                    }
                    T.nameInfo = new NameListInfo(
                        lineB,
                        lineE,
                        oString,
                    );
                    // analysis oString
                    // let nList = XRegExp.split(oString, nilSplitter);
                    // console.log('oString', oString);
                    let nList: string[] = [];
                    XRegExp.forEach(oString, nameListLoop, (m, i) => {
                        if (!_.isNil(m[1])) {
                            nList.push(m[1]);
                        }
                    });
                    // console.log('nList', nList);
                    nList = nList.filter(E => E.length > 0);
                    T.nameInfo.nameList = nList;
                    nList.forEach(N => {
                        if (_.isNil(T.nameInfo)) {
                            // some wrong
                            return;
                        }
                        // js use USC-2 as string code
                        // but it not support UTF-8/UTF-16/UTF-32
                        //
                        // so, in the new world,
                        // ```Array.from``` is the only one way to split string by UTF code pair
                        // and this is the only one correct way to calc UTF string length
                        let unicodeChar = Array.from(N);
                        let n = unicodeChar.length;
                        if (n === 0) {
                            return;
                        }
                        if (n === 1) {
                            // check it flag
                            if (unicodeChar[0] === '满') {
                                T.nameInfo.fullFlag = true;
                            }
                            return;
                        }
                        if (2 <= n && n <= 3) {
                            T.nameInfo.nameNum += 1;
                            return;
                        }
                        // two name stick
                        if (4 <= n && n <= 6) {
                            T.nameInfo.nameNum += 2;
                            return;
                        }
                        // 3 name stick , or , some wrong
                        if (6 < n) {
                            // some wrong
                            return;
                        }
                    });
                }
            } catch (e) {
                /* empty */
                console.error('detectUserName error : ', e);
            }
            return T;
        });

        return [date, segmentInfos];
    }


}
