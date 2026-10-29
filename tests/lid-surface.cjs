const test=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),fs=require('node:fs');
const source=ts.transpileModule(fs.readFileSync('app/lid-surface.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('require','exports','module',source)(require,mod.exports,mod);
const {createLidSurface,stampedHeight}=mod.exports;
test('lid is one connected indexed surface, with no detached rings or cracks',()=>{
 const g=createLidSurface(96,120),index=g.index.array,positions=g.attributes.position;
 const edges=new Map(),adj=Array.from({length:positions.count},()=>[]);
 for(let i=0;i<index.length;i+=3)for(const [a,b] of [[index[i],index[i+1]],[index[i+1],index[i+2]],[index[i+2],index[i]]]){const key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)||0)+1);adj[a].push(b);adj[b].push(a);}
 const seen=new Set([0]),pending=[0];while(pending.length){const v=pending.pop();for(const n of adj[v])if(!seen.has(n)){seen.add(n);pending.push(n)}}
 assert.equal(seen.size,positions.count);assert.ok([...edges.values()].every(n=>n===1||n===2));assert.equal([...edges.values()].filter(n=>n===1).length,96);assert.equal(positions.count-edges.size+index.length/3,1);
 for(const value of g.attributes.normal.array)assert.ok(Number.isFinite(value));
 assert.ok(Math.abs(g.boundingBox.max.y-1.34)<1e-6);assert.ok(Math.abs(g.boundingBox.max.x-.254)<1e-6);assert.ok(g.attributes.normal.getY(0)>.99);g.dispose();
});
test('pressed panel is actual surface relief rather than a coloured outline',()=>{const h=[];for(let x=0;x<=.14;x+=.0005)h.push(stampedHeight(x,-.12));assert.ok(Math.max(...h)-Math.min(...h)>.001);assert.ok(h.every(Number.isFinite));});
