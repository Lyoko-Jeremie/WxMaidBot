import _ from 'lodash';
import XRegExp from 'xregexp';
import moment from 'moment';
import {remote} from 'electron';

const key_string = remote.process.env.KEY_String;

export namespace carTeachStringAnalysis {

    export function checkMessage(s: string) {
        return XRegExp.split(s, '\n').length > 5;
    }

    export function isFinaly(s: string) {
        return XRegExp.test(s, XRegExp.cache(key_string, 'g'));
    }

    export enum InfoType {
        unknow, emptyLine,
        welcome, date,
        userNumberLimit, timeLine, userName, teacherLine,
        needMoreInfo, serviceCall,
    }

    export class Info {
        constructor(public type: InfoType, public beginLine: number, public other?: any, public s?: string) {
        }
    }

    export class SegmentInfo {
        public bTH: number;
        public bTM: number;
        public eTH: number;
        public eTM: number;

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
            let r2 = XRegExp.cache('^\\s*以下(?:时段|时间段)(?:可最多|最多可)约(\\d)+人.*$', 'u');
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
            let r4 = XRegExp.cache('^\\s*(.(?:教练))\\s*(\\d{11})\\s*$', 'u');
            if (r4.test(T)) {
                let m = XRegExp.exec(T, r4, 0);
                return new Info(InfoType.teacherLine, I, {
                    name: m[1],
                    phone: m[2],
                }, T);
            }
            let r5 = XRegExp.cache('监督投诉热线[^\\d]*(\\d{11})', 'u');
            if (r5.test(T)) {
                let m = XRegExp.exec(T, r5, 0);
                return new Info(InfoType.serviceCall, I, {
                    phone: m[1],
                }, T);
            }
            let r6 = XRegExp.cache('^\\s*((\\d+(?:\\.|:|：)00)\\s*(?:—|--|-)\\s*(\\d+(?:\\.|:|：)00))(.*)$', 'u');
            if (r6.test(T)) {
                let m = XRegExp.exec(T, r6, 0);
                return new Info(InfoType.timeLine, I, {
                    ta: m[1],
                    tb: m[2],
                    te: m[3],
                    other: m[4],
                    oe: XRegExp.cache('^\\s*$', 'u').test(m[4])
                }, T);
            }
            let r7 = XRegExp.cache('^\\s*$', 'u');
            if (r7.test(T)) {
                let m = XRegExp.exec(T, r7, 0);
                return new Info(InfoType.emptyLine, I, {}, T);
            }


            return new Info(InfoType.unknow, I, {}, T);
        });

        // TODO analysis user name


        return [lines, infoTypes];
    }

    export function removeKeyString(data: AnalysisInfoType) {
        let checker = XRegExp.cache('^(.*)' + key_string + '(.*)$', 'u');
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

    export function re_construct(data: AnalysisInfoType) {
        let [lines, infoTypes] = data;
        let s = "";
        lines.forEach(T => {
            s += T + '\n';
        });
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

        let clear = XRegExp.cache('(.*)' + String.fromCodePoint(0x1F4A2) + '(.*)', 'u');

        infoTypes.forEach((T, I) => {
            if (T.type === InfoType.timeLine) {
                console.log("1F4A2 test");
                console.log(Array.from(T.other.other));
                console.log(String.fromCodePoint(0x1F4A2));
                console.log(XRegExp.exec(T.other.other, clear, 0));
                console.log(XRegExp.replace(T.other.other, clear, '$1$2'));
                console.log(T.other.ta + String.fromCodePoint(0x1F4A2));
                console.log(T.other.ta + String.fromCodePoint(0x1F4A2)+ XRegExp.replace(T.other.other, clear, '$1$2'));
                lines[I] = T.other.ta + String.fromCodePoint(0x1F4A2)
                    + XRegExp.replace(T.other.other, clear, '$1$2');

            }
        });

        return [lines, infoTypes];
    }


}
