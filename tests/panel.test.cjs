const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function Element(type,text){this.type=type;this.text=text||'';this.children=[];this.enabled=true;this.preferredSize={};this.graphics={font:{name:'Arial'}};this.layout={layout(){},resize(){}};this.add=function(type,unused,text){const e=new Element(type,text);this.children.push(e);return e;};}
function Panel(){Element.call(this,'panel');}
function Window(){Element.call(this,'palette');this.update=function(){};this.center=function(){};this.show=function(){};}
function CompItem(){this.id=10;this.name='源合成';}
const root=new CompItem();
let executions=[];
const ctx=vm.createContext({Panel,Window,CompItem,ScriptUI:{newFont(){return {}}},thisObj:new Panel(),app:{project:{selection:[root],activeItem:root,numItems:1,item(){return root;}}},IICEngine:{
 analyze(p,c,o){return {root:c,issues:[],comps:[{}],media:[],options:o};},
 summary(){return 'analysis';},
 execute(plan,config,progress){executions.push(config);progress('copying');return {roots:[{name:config.name}],mediaCopied:0,rewrites:1,checkedExpressions:1,warnings:[]};}
}});
const source=fs.readFileSync(path.join(__dirname,'../src/panel.jsxinc'),'utf8');
vm.runInContext(source,ctx);
function all(e){return [e,...e.children.flatMap(all)];}
const elements=all(ctx.thisObj);
const edits=elements.filter(e=>e.type==='edittext');
const button=text=>elements.find(e=>e.type==='button'&&e.text===text);
// Entering a custom name before pressing Read is valid and must not be discarded.
edits[1].text='我的独立版';
button('创建独立副本').onClick();
assert.equal(executions.length,1);
assert.equal(executions[0].name,'我的独立版');
assert.ok(edits[3].text.includes('复制完成'));
assert.equal(button('创建独立副本').enabled,true);
assert.equal(ctx.thisObj.update,undefined); // A docked Panel intentionally has no Window.update().
edits[2].text='1.5';button('创建独立副本').onClick();assert.equal(executions.length,1);
edits[2].text='2';button('读取选中合成').onClick();assert.equal(edits[1].text,'源合成_独立版');
button('分析依赖').onClick();assert.equal(edits[3].text,'analysis');
console.log('PASS: docked panel callbacks, custom name, input validation and read/analyze controls');
