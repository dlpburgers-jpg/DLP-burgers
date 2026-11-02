import {createElement as el,useEffect,useState} from 'react';

export function availableMoveTables(tables,session){
 return (tables||[]).filter(t=>t.active&&!t.session&&t.id!==session.table_id);
}

export default function MoveTable({session,tables,busy,run,onMoved}){
 const [open,setOpen]=useState(false),[target,setTarget]=useState(''),[confirmed,setConfirmed]=useState(false);
 const choices=availableMoveTables(tables,session),destination=choices.find(t=>t.id===target);
 useEffect(()=>{setOpen(false);setTarget('');setConfirmed(false);},[session.id,session.table_id]);
 useEffect(()=>{setConfirmed(false);},[session.version]);
 if(!open)return el('button',{type:'button',className:'button quiet',disabled:busy,onClick:()=>setOpen(true)},'Mover a otra mesa');
 return el('form',{className:'salon-payment',onSubmit:async e=>{
  e.preventDefault();if(busy||!destination||!confirmed)return;
  const result=await run('dlp_move_salon_table',{p_session:session.id,p_version:session.version,p_target_table:destination.id},`Cuenta trasladada de ${session.table_name} a ${destination.name}. Avisá a cocina del cambio de mesa.`);
  if(result){setOpen(false);setTarget('');setConfirmed(false);onMoved?.(destination.id);}
 }},
 el('h3',null,'Mover cuenta a otra mesa'),
 el('p',null,'Se conservan los productos, comensales, importes y estado de cocina. La mesa de origen queda libre. Los tickets ya impresos conservan el nombre anterior: avisá a cocina.'),
 el('label',{className:'field'},el('span',null,'Mesa de destino'),el('select',{required:true,value:target,disabled:busy,onChange:e=>{setTarget(e.target.value);setConfirmed(false);}},el('option',{value:''},'Elegí una mesa libre'),...choices.map(t=>el('option',{key:t.id,value:t.id},t.name)))),
 !choices.length&&el('p',{className:'notice',role:'status'},'No hay otras mesas libres disponibles.'),
 destination&&el('label',{className:'check'},el('input',{type:'checkbox',checked:confirmed,disabled:busy,onChange:e=>setConfirmed(e.target.checked)}),`Confirmo mover la cuenta de ${session.table_name} a ${destination.name}.`),
 el('div',{className:'actions'},el('button',{className:'button',disabled:busy||!destination||!confirmed},busy?'Moviendo…':'Confirmar traslado'),el('button',{type:'button',className:'button quiet',disabled:busy,onClick:()=>{setOpen(false);setTarget('');setConfirmed(false);}},'Cancelar')));
}
