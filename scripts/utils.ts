export const errorHandler = (value: unknown, message: string): void => {
  if (typeof value === 'undefined' || value === null)
    throw TypeError(`${message} ${value === null ? null : typeof value}.`);
};

export const freeUpMemory = (re2: RegExp2, ...ptrs: Pointer[]): void =>
  ptrs.forEach(re2._free);

export const stringOnWasmHeap = (re2: RegExp2) => (string: string): Pointer => {
  const size = string.length + 1;
  const ptr = re2._malloc(size);
  re2.stringToUTF8(string, ptr, size);
  return ptr;
};

export const getPointers = (re2: RegExp2, ...values: string[]): Pointer[] =>
  values.map(stringOnWasmHeap(re2));

export const getStringArray = (
  re2: RegExp2,
  arrayPointer: Pointer,
  getCountOfGroups: number,
  captureGroups: number
): string[][] => {
  const arr = [];
  for (let i = 0; i < getCountOfGroups; i += 1) {
    const arr2 = [];
    for (let j = 0; j < captureGroups; j += 1) {
      const stringPtr = re2._getStringPtrFromMatrix(arrayPointer, i, j);
      const string = re2.UTF8ToString(stringPtr);
      arr2.push(string);
    }
    arr.push(arr2);
  }
  return arr;
};

export const validate = (re2: RegExp2, regex: string): void => {
  errorHandler(regex, 'Regular expression can not be');

  const [regexPointer] = getPointers(re2, regex);
  const statusPointer = re2._validate(regexPointer);
  const error = re2.UTF8ToString(statusPointer);
  freeUpMemory(re2, regexPointer, statusPointer);
  if (!!error) throw error;
};

const ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const HEX = '0123456789ABCDEF';

export const isHexadecimal = (char: string): boolean => {
  return HEX.indexOf(char.toUpperCase()) !== -1;
};

/**
 * Translate a string from Node RegExp syntax RE2 syntax. The algorithm is
 * translated from
 * https://github.com/uhop/node-re2/blob/master/lib/new.cc#L21-L142
 * @param pattern
 * @param multiline
 */
export const translateRegExp = (
  pattern: string,
  multiline: boolean
): string => {
  const result: string[] = [];
  if (pattern === '') {
    return '(?:)';
  } else if (multiline) {
    result.push('(?m)');
  }
  for (let i = 0; i < pattern.length; ) {
    if (pattern[i] === '\\') {
      if (i + 1 < pattern.length) {
        switch (pattern[i + 1]) {
          case '\\':
            // Consume "\\", output "\\"
            result.push('\\\\');
            i += 2;
            break;
          case 'c':
            if (i + 2 < pattern.length) {
              const alphaIndex = ALPHA_UPPER.indexOf(pattern[i + 2]) + 1;
              if (alphaIndex >= 0) {
                // Consume "\c[upper case character]", output "\x[hex digit][hex digit]"
                result.push(
                  '\\x',
                  HEX[Math.floor(alphaIndex / 16)],
                  HEX[alphaIndex % 16]
                );
                i += 3;
                break;
              }
            }
            // Consume "\c", output "\c"
            result.push('\\c');
            i += 2;
            break;
          case 'u':
            if (i + 2 < pattern.length) {
              const ch2 = pattern[i + 2];
              if (isHexadecimal(ch2)) {
                // Consume "\u[hex digit]", output "\x{[hex digit]"
                result.push('\\x{');
                result.push(ch2);
                i += 3;
                // Consume and output up to 3 more hex digits
                for (
                  let j = 0;
                  j < 3 && i < pattern.length && isHexadecimal(pattern[i]);
                  i++, j++
                ) {
                  result.push(pattern[i]);
                }
                // Output "}"
                result.push('}');
                break;
              } else if (ch2 === '{') {
                // Consume "\u" followed by "{", output "\x"
                // The default case handles the subsequent characters
                result.push('\\x');
                i += 2;
                break;
              }
            }
            // Consume and output "\u"
            result.push('\\u');
            i += 2;
            break;
          default:
            // Consume and output "\[char]"
            result.push('\\', pattern[i + 1]);
            i += 2;
        }
        continue;
      }
    } else if (pattern[i] === '/') {
      // Consume "/"" and output "\/"
      // An existing "\/" would have been handled by the above default case
      result.push('\\/');
      i += 1;
      continue;
    } else if (pattern.substring(i, i + 3) === '(?<') {
      if (pattern[i + 3] !== '=' && pattern[i + 3] !== '!') {
        // Consume "(?<" and output "(?P<"
        result.push('(?P<');
        i += 3;
        continue;
      }
    }
    // Consume and output the next character
    result.push(pattern[i]);
    i += 1;
  }
  return result.join('');
};

/**
 * Escape a RegExp pattern by ensuring that any instance of "/" in the string
 * is preceded by an odd number of backslashes.
 * @param pattern
 */
export const escapeRegExp = (pattern: string): string => {
  return pattern.replace(/(^|[^\\])((?:\\\\)*)\//g, '$1$2\\/');
};
