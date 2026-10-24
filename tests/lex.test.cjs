const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/lex.js'),'utf8'), context);
const lex = context.IICLex;
let cases = 0;
function check(source, expected, output) {
  const parsed = lex.scan(source);
  assert.equal(parsed.issues.length, 0, JSON.stringify(parsed.issues));
  assert.equal(JSON.stringify(parsed.refs.map(r=>[r.kind,r.name])), JSON.stringify(expected));
  const rewritten = lex.rewrite(source, parsed.refs, r => '副本__' + r.name);
  if(output !== undefined) assert.equal(rewritten,output);
  cases++;
}
check('comp("主合成").layer("控制器").transform.position', [['comp','主合成']], 'comp("副本__主合成").layer("控制器").transform.position');
check('comp /* keep */ (\'a\\\'b\').width + footage("data.json").sourceData.x', [['comp',"a'b"],['footage','data.json']]);
check('comp("\\u573a\\u666f4").width', [['comp','场景4']]);
check('comp("a\\\\b").width', [['comp','a\\b']]);
check('// comp("ignore")\n/* footage("x") */ thisComp.layer("comp(\\"x\\")").index', []);
check('var r=/comp\("Old"\)/g; var s="comp(\\"Old\\")"; comp("Old").width', [['comp','Old']]);
check('var x=10/2; x + comp("Root").width/2', [['comp','Root']]);
check('comp("A").width + comp("B").width + comp("A").height', [['comp','A'],['comp','B'],['comp','A']]);
check('thisComp.layer("name"); thisLayer.parent.index; value', []);
check('if (ready) /comp("Old")/.test(text); comp("Real").width', [['comp','Real']]);
check('if (ready) {} /comp("Old")/.test(text); comp("Real").width', [['comp','Real']]);
check('(comp("Real").width+1)/2', [['comp','Real']]);
for(const source of ['comp(prefix+"1")','comp(name)','var resolve=comp; resolve("Root")','footage(getName())','eval("comp(\\"Root\\")")','new Function("return 1")','`comp("Root")`','comp("bad\\123")']) {
  assert.ok(lex.scan(source).issues.length,source); cases++;
}
const used = {'$Root':true,'$Root_2':true};
assert.equal(lex.unique('Root',used),'Root_3');
assert.equal(lex.unique('Root',used),'Root_4');
assert.equal(lex.scan('comp('+lex.quote('引号"和\\反斜线')+').width').refs[0].name,'引号"和\\反斜线');
assert.equal(lex.rewrite('comp("shared").width',lex.scan('comp("shared").width').refs,()=>null),'comp("shared").width');
console.log(`PASS: ${cases + 4} expression scanner / rewrite / naming cases`);
