const fs = require('fs');
const p = 'server.js';
const s = fs.readFileSync(p,'utf8');
let braces=0, paren=0, bracket=0, backticks=0;
for(let i=0;i<s.length;i++){const c=s[i]; if(c=='{') braces++; if(c=='}') braces--; if(c=='(') paren++; if(c==')') paren--; if(c=='[') bracket++; if(c==']') bracket--; if(c=='`') backticks++;}
console.log('braces',braces,'paren',paren,'bracket',bracket,'backticks',backticks);
// print last 40 lines
const lines = s.split(/\r?\n/);
console.log('total lines',lines.length);
console.log('last 40 lines:\n', lines.slice(-40).join('\n'));
