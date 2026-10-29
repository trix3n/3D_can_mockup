const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),THREE=require('three');
const code=ts.transpileModule(fs.readFileSync('app/studio-lighting.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const mod={exports:{}};new Function('require','exports','module',code)(require,mod.exports,mod);const {KEY_POSITION,lightingSettings,updateStudioFrame}=mod.exports;
test('key light stays screen-left across a full orbit, pitch and pan',()=>{
 for(const yaw of [0,.5,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2])for(const pitch of [-.8,0,.8])for(const pan of [new THREE.Vector3(),new THREE.Vector3(.6,-.3,.4)]){
  const camera=new THREE.PerspectiveCamera();camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0));camera.position.copy(new THREE.Vector3(0,0,4).applyQuaternion(camera.quaternion)).add(pan);camera.updateMatrixWorld();
  const rig=new THREE.Group(),light=new THREE.DirectionalLight(),scene=new THREE.Scene();light.position.copy(KEY_POSITION);rig.add(light);scene.add(rig);updateStudioFrame(camera,rig,scene,1.5);scene.updateMatrixWorld(true);
  assert.equal(scene.environmentIntensity,1.5);const e=scene.environmentRotation;const sampling=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-e.x,-e.y,-e.z,e.order));const expected=new THREE.Vector3(-.6,.25,.75);const worldReflection=expected.clone().applyQuaternion(camera.quaternion);assert.ok(worldReflection.applyMatrix4(sampling).distanceTo(expected)<1e-10);
  const worldKey=light.getWorldPosition(new THREE.Vector3()),worldTarget=new THREE.Vector3();
  const viewDirection=worldKey.sub(worldTarget).applyQuaternion(camera.quaternion.clone().invert());
  assert.ok(viewDirection.distanceTo(KEY_POSITION)<1e-10);assert.ok(viewDirection.x<0);assert.ok(viewDirection.z>0);
 }
});
test('intensity scales all studio sources and remains bounded',()=>{assert.equal(lightingSettings(25,50).strength,.25);assert.equal(lightingSettings(100,50).strength,1);assert.equal(lightingSettings(200,50).strength,2);assert.equal(lightingSettings(-100,50).strength,.25);});
test('soft source is broader with a wider highlight and softer shadows',()=>{const soft=lightingSettings(100,0),hard=lightingSettings(100,100);assert.ok(soft.spread>hard.spread);assert.ok(soft.cardWidth>hard.cardWidth);assert.ok(soft.shadowRadius>hard.shadowRadius);assert.equal(soft.strength,hard.strength);});
