const fs = require('fs');

const fileToPatch = './bin/re2Lib.js';

const wasm = fs.readFileSync('./bin/re2Lib.wasm');
const wasmBase64 = wasm.toString('base64');

const codeToPaste = `
var wasmBinaryFile = "re2Lib.wasm";

if (typeof window === "object") {
  var buf = Buffer.from("${wasmBase64}", "base64");
  var blob = new Blob([buf], { type: "application/wasm" });
  wasmBinaryFile = URL.createObjectURL(blob);
  scriptDirectory = '';
}
`;

const originalSourceCode = fs.readFileSync(fileToPatch, 'utf-8');
const modifiedSourceCode = originalSourceCode
  .replace(`var wasmBinaryFile;wasmBinaryFile="re2Lib.wasm";`, codeToPaste)
  .replace('process["on"]("unhandledRejection",abort);', '')
  .replace(
    'var out=Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.warn.bind(console);',
    'var out=function out(){};var err=function err(){};'
  );

fs.writeFileSync(fileToPatch, modifiedSourceCode, 'utf-8');
