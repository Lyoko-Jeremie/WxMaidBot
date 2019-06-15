import {HundredFamilyNameDist} from './HundredFamilyNameDist';
import XRegexp from 'xregexp';
import {split as _split, reduce, isNil, concat, isEqual, slice, find} from 'lodash';

const HundredFamilyNameList = _split(HundredFamilyNameDist, '|');
const HundredFamilyNameSingles = HundredFamilyNameList.filter(T => T.length == 1);
const HundredFamilyNameDoubles = HundredFamilyNameList.filter(T => T.length == 2);
const HundredFamilyNameOthers = HundredFamilyNameList.filter(T => T.length > 2);
const HundredFamilyNameErrors = HundredFamilyNameList.filter(T => T.length == 0);

const HundredFamilyNameMap = (() => {
    let map = new Map<string, string[][]>();
    HundredFamilyNameList.forEach(T => {
        let s = Array.from(T);
        let it: string[][] | undefined = map.get(s[0]);
        if (it) {
            it.push(s);
            map.set(s[0], it);
            // have double '郁'
            // console.error(s[0], s);
            // throw new Error("HundredFamilyNameMap failed...");
        } else {
            map.set(s[0], [s]);
        }
    });
    return map;
})();

// for debug
// console.log('HundredFamilyNameSingles');
// console.log(HundredFamilyNameSingles);
// console.log('HundredFamilyNameDoubles');
// console.log(HundredFamilyNameDoubles);
// console.log('HundredFamilyNameOthers');
// console.log(HundredFamilyNameOthers);
// console.log('HundredFamilyNameErrors');
// console.log(HundredFamilyNameErrors);


export function testHaveSingleNameChar(s: string): number {
    const sA = Array.from(s);
    return reduce(sA, (Acc, T, I) => {
        return !isNil(HundredFamilyNameSingles.find(it => T === it)) ? Acc + 1 : Acc;
    }, 0);
}

export function findIndexOfSingleNameChar(s: string): number[] {
    const sA = Array.from(s);
    return reduce(sA, (Acc: number[], T, I) => {
        return !isNil(HundredFamilyNameSingles.find(it => T === it)) ? concat(Acc, [I]) : Acc;
    }, []);
}


export function testHaveSingleNameCharAll(s: string): number {
    const sA = Array.from(s);
    return reduce(sA, (Acc, T, I) => {
        return HundredFamilyNameMap.has(T) ? Acc + 1 : Acc;
    }, 0);
}

export function findIndexOfSingleNameCharAll(s: string): { i: number, n: number }[] {
    const sA = Array.from(s);
    return reduce(sA, (Acc: { i: number, n: number }[], T, I) => {
        let N: string[][] | undefined = HundredFamilyNameMap.get(T);
        if (!isNil(N)) {
            let f = find(N, nt => isEqual(nt, slice(sA, I, I + nt.length)));
            if (!isNil(f)) {
                return concat(Acc, [{i: I, n: f.length}]);
            } else {
                return Acc;
            }
        }
        return Acc;
    }, []);
}




