import { re2Functions } from './reFunctions';
import { freeUpMemory, getPointers, validate, translateRegExp, escapeRegExp } from './utils';
import { EventEmitter } from 'events';

const asyncWrappedRe2Module = require('../../bin/re2Lib');
const LOADED_EVENT = 'LOADED';
const events = new EventEmitter();
let re2Module: RegExp2;
let isLoading = false;

async function compileWasmModule() {
  isLoading = true;
  re2Module = await asyncWrappedRe2Module();
  isLoading = false;
  events.emit(LOADED_EVENT);
}

export class RE2 {
  private regex: string;
  private re2: RE2Functions;

  /**
   * @param regex can not be undefined or null
   * @param flag
   */
  constructor(regex: string, flag = '') {
    regex = escapeRegExp(regex);

    validate(re2Module, regex);
    this.regex = regex;
    this.re2 = re2Functions(
      re2Module,
      translateRegExp(regex, flag === 'm'),
      flag
    );
  }

  /** Returns number of capture groups. */
  numberOfCaptureGroups = (): number => {
    const [regexPointer] = getPointers(re2Module, this.regex);
    const number = re2Module._getQtyOfCapturingGroups(regexPointer);
    freeUpMemory(re2Module, regexPointer);
    return number;
  };

  /** Executes a search for a match between a regular expression and a specified string.
   * Returns true or false.
   * @param string Can be only a string
   */
  test = (string: string): boolean => this.re2.testRegex(string);

  /** Returns all matches of the regular expression against a string.
   * @param string Can be only a string
   */
  exec = (string: string): string[][] | null => this.re2.execRegex(string);

  /** Return new string with some or all matches of a pattern replaced by a replacement.
   * @param string Can be only a string
   * @param rewrite Can be only a string
   */
  replace = (string: string, rewrite: string): string =>
    this.re2.replaceString({ string, rewrite });
}

export async function getRE2Class(): Promise<typeof RE2> {
  if (!re2Module) {
    await new Promise<void>((resolve) => {
      if (isLoading) {
        events.once(LOADED_EVENT, () => {
          resolve();
        });
      } else {
        compileWasmModule().then(() => {
          resolve();
        });
      }
    });
  }

  return RE2;
}
