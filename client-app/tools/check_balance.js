const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'server.js');
const s = fs.readFileSync(p, 'utf8');
let brace = 0, paren = 0, bracket = 0;
let line = 1;
let firstNeg = null;
let backtick = 0, sq = 0, dq = 0;
let maxBrace = { val: -Infinity, line: null };
let maxParen = { val: -Infinity, line: null };
let maxBracket = { val: -Infinity, line: null };
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === '\n') line++;
  if (c === '`') backtick++;
  if (c === "'") sq++;
  if (c === '"') dq++;
  if (c === '{') brace++;
  else if (c === '}') brace--;
  else if (c === '(') paren++;
  else if (c === ')') paren--;
  else if (c === '[') bracket++;
  else if (c === ']') bracket--;

  if ((brace < 0 || paren < 0 || bracket < 0) && !firstNeg) {
    firstNeg = { line, i, brace, paren, bracket };
  }

  if (brace > (maxBrace.val || -Infinity)) { maxBrace = { val: brace, line }; }
  if (paren > (maxParen.val || -Infinity)) { maxParen = { val: paren, line }; }
  if (bracket > (maxBracket.val || -Infinity)) { maxBracket = { val: bracket, line }; }
}
console.log('Final counts:', { brace, paren, bracket });
console.log('Quote/backtick counts:', { backtick, singleQuotes: sq, doubleQuotes: dq });
if (firstNeg) console.log('First negative at line', firstNeg.line, firstNeg);
else console.log('No negative counts seen.');
console.log('Max counts:', { maxBrace, maxParen, maxBracket });

// print context around the places where max counts occurred
const lines = s.split('\n');
function printAround(ln, label) {
  if (!ln) return;
  const start = Math.max(0, ln - 6);
  const end = Math.min(lines.length, ln + 6);
  console.log(`\\n---- ${label} around line ${ln} ----`);
  for (let i = start; i < end; i++) console.log(`${i+1}: ${lines[i]}`);
}
printAround(maxBrace.line, 'MAX BRACE');
printAround(maxParen.line, 'MAX PAREN');
printAround(maxBracket.line, 'MAX BRACKET');

// also print last 60 lines for context
const tailStart = Math.max(0, lines.length - 60);
console.log('\n---- last 60 lines ----\n' + lines.slice(tailStart).map((l,idx)=>`${tailStart+idx+1}: ${l}`).join('\n'));
