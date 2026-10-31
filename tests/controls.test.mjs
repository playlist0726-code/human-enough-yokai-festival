import test from 'node:test';
import assert from 'node:assert/strict';
import {keyIntent} from '../public/controls.mjs';
test('physical action keys work with English, Korean and IME composition',()=>{
  for(const [code,english,korean,action]of [['KeyE','e','ㄷ','interact'],['KeyQ','q','ㅂ','drink'],['KeyF','f','ㄹ','charm'],['KeyC','c','ㅊ','cover']]){
    for(const key of [english,english.toUpperCase(),korean,'Process'])assert.equal(keyIntent({code,key,isComposing:true}),action);
  }
});
test('navigation retains arrow and WASD controls; browser shortcuts are ignored',()=>{
  assert.equal(keyIntent({code:'KeyW',key:'ㅈ'}),'up');assert.equal(keyIntent({code:'ArrowLeft',key:'ArrowLeft'}),'left');
  assert.equal(keyIntent({code:'KeyQ',key:'q',metaKey:true}),null);assert.equal(keyIntent({code:'KeyE',key:'e',ctrlKey:true}),null);
  assert.equal(keyIntent({code:'KeyF',key:'f',altKey:true}),null);assert.equal(keyIntent({key:'ㅊ'}),'cover');assert.equal(keyIntent({code:'Space',key:' '}),'jump');
});
