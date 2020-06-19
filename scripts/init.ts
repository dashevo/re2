import { execRegex, globalExec, replaceString, testRegex } from './reFunctions';
import { getPointers, validate } from './utils';
const Module = require('../../re2Lib');

export const init = (regex: string, flag = ''): RE2 => {
  Module.onRuntimeInitialized = (): RE2 => {
    validate(Module, regex);
    return {
      numberOfCaptureGroups: (): number => {
        const [regexPointer] = getPointers(Module, regex);
        return Module._getNumberOfCapturingGroups(regexPointer);
      },

      test: (text: string): boolean => testRegex(Module, text, regex),

      exec: (text: string): string[] | string[][] | null =>
        flag === 'g'
          ? globalExec(Module, text, regex)
          : execRegex(Module, text, regex),

      replace: (baseText: string, rewrite: string): string =>
        replaceString({
          module: Module,
          baseText,
          regex,
          rewrite,
          flag: flag || '',
        }),
    };
  };
  return Module.onRuntimeInitialized();
};
