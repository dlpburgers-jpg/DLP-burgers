import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryPoints,earnedItemPoints,eligibleRewardProducts,pointRewards} from '../src/lib/points.js';
const data={categories:[{id:'b',name:'Burgers',active:true},{id:'s',name:'STARTERS',active:true},{id:'d',name:'BEBIDAS',active:true}],products:[]};
test('sellos por hamburguesas, sin starters ni envío',()=>{
 assert.equal(categoryPoints('Burgers'),1);assert.equal(categoryPoints('STARTERS'),0);assert.equal(categoryPoints('BEBIDAS'),0);
 const lines=[{product:{id:'b1',category_id:'b'},variant:{id:'simple'},quantity:2},{product:{id:'s1',category_id:'s'},quantity:3},{product:{category_id:'d'},quantity:9}];
 assert.equal(earnedItemPoints(lines,data),2);
 assert.equal(earnedItemPoints(lines,data,'burger_simple','b1','simple'),1);
 assert.equal(earnedItemPoints([...lines,lines[0]],data,'burger_simple','b1','simple'),3);
});
test('premios exactos; bebidas retiradas del nuevo programa',()=>{
 assert.deepEqual(pointRewards.map(r=>r.cost),[5,10,20]);
 const products=['Coca Cola 2 Litros','Sprite 2 L','Coca Cola 2.5 litros','Agua 500cc','Sprite 500 ml','Limonada 0,5 L','Botella 1500cc'].map((name,i)=>({id:String(i),name,active:true,category_id:'d',v51_variants:[]}));
 assert.deepEqual(eligibleRewardProducts({...data,products},'drink_2l').map(p=>p.productId),[]);
 assert.deepEqual(eligibleRewardProducts({...data,products},'drink_500').map(p=>p.productId),[]);
 products[0].active=false;products[1].v51_channels={delivery:false};
 assert.equal(eligibleRewardProducts({...data,products},'drink_2l','delivery').length,0);
});
test('hamburguesa simple disponible y variantes, no dobles fijas',()=>{
 const products=[{id:'b1',name:'Cheese',active:true,category_id:'b',v51_variants:[{id:'simple',name:'SIMPLE',active:true},{id:'double',name:'DOBLE',active:true}]},{id:'b2',name:'Big Mac',description:'Doble medallón',active:true,category_id:'b',v51_variants:[]}];
 assert.deepEqual(eligibleRewardProducts({...data,products},'burger_simple').map(p=>p.variantId),['simple']);
 products[0].v51_variants[0].active=false;assert.equal(eligibleRewardProducts({...data,products},'burger_simple').length,0);
});
