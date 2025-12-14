const fs = require('fs');
const lines = fs.readFileSync('server.js','utf8').split(/\r?\n/);
let braces=0, paren=0, bracket=0, backticks=0;
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  for(let c of line){
    if(c=='{') braces++; if(c=='}') braces--; if(c=='(') paren++; if(c==')') paren--; if(c=='[') bracket++; if(c==']') bracket--; if(c=='`') backticks++;
  }
  if((braces!==0)||(paren!==0)||(bracket!==0)){
    console.log('line',i+1,'counts', {braces, paren, bracket});
  }
}
console.log('final', {braces, paren, bracket, backticks});
