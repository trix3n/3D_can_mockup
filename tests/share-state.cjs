const test=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),fs=require('node:fs');
const mod={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync('app/share-state.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod.exports,mod);
const {encodeShare,decodeShare,validateScene}=mod.exports;
const scene={version:1,image:'data:image/png;base64,aGVsbG8=',background:'#ffffff',lightIntensity:135,lightHardness:40,labelHeight:120,labelBottom:4,auto:false,view:{position:[1,1,4],target:[.1,.2,0],rotation:2}};
test('self-contained link preserves original artwork, lighting, dimensions and camera',async()=>{const encoded=await encodeShare(scene);assert.match(encoded,/^[A-Za-z0-9_-]+$/);assert.deepEqual(await decodeShare(encoded),scene);});
test('shared state cannot request external image URLs or invalid geometry',()=>{assert.throws(()=>validateScene({...scene,image:'https://example.com/image.png'}));assert.throws(()=>validateScene({...scene,labelBottom:10}));assert.throws(()=>validateScene({...scene,view:{...scene.view,position:[Infinity,0,1]}}));});
test('truncated, corrupt and oversized links fail instead of silently showing another design',async()=>{await assert.rejects(()=>decodeShare(''));await assert.rejects(()=>decodeShare('broken'));await assert.rejects(()=>decodeShare('a'.repeat(1800001)));});
