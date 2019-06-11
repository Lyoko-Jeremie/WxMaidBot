import {HundredFamilyNameDist} from './HundredFamilyNameDist';
import XRegexp from 'xregexp';
import {split as _split, reduce, isNil, concat} from 'lodash';

const HundredFamilyNameList = _split(HundredFamilyNameDist, '|');
const HundredFamilyNameSingles = HundredFamilyNameList.filter(T => T.length == 1);
const HundredFamilyNameDoubles = HundredFamilyNameList.filter(T => T.length == 2);
const HundredFamilyNameOthers = HundredFamilyNameList.filter(T => T.length > 2);
const HundredFamilyNameErrors = HundredFamilyNameList.filter(T => T.length == 0);

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




