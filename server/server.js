'use strict';
const WebSocket = require('ws');
const PORT = Number(process.env.PORT || 10000);
const rooms = new Map();
const clients = new Map();
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeRoom(){
  for(let tries=0;tries<100;tries++){
    let code='';for(let i=0;i<4;i++)code+=alphabet[Math.floor(Math.random()*alphabet.length)];
    if(!rooms.has(code))return code;
  }
  throw new Error('Não foi possível gerar código de sala.');
}
function send(ws,msg){if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg))}
function peerOf(room,ws){if(!room)return null;return room.host===ws?room.guest:room.guest===ws?room.host:null}
function cleanup(ws){
  const info=clients.get(ws); if(!info)return;
  const room=rooms.get(info.room);
  if(room){
    const peer=peerOf(room,ws); if(peer)send(peer,{type:'peer-left'});
    if(room.host===ws||!room.host){rooms.delete(info.room)}else if(room.guest===ws){room.guest=null;room.guestName='Jogador 2'}
  }
  clients.delete(ws);
}

const wss=new WebSocket.Server({port:PORT});
wss.on('connection',ws=>{
  ws.on('message',raw=>{
    let msg;try{msg=JSON.parse(raw.toString())}catch{return send(ws,{type:'error',message:'Mensagem inválida.'})}
    const type=msg?.type;
    if(type==='create'){
      if(clients.has(ws))return send(ws,{type:'error',message:'Você já está conectado a uma sala.'});
      const roomCode=makeRoom();
      const room={host:ws,guest:null,password:String(msg.password||''),hostName:String(msg.name||'Jogador').slice(0,18),guestName:'Jogador 2'};
      rooms.set(roomCode,room);clients.set(ws,{room:roomCode,role:'host'});
      return send(ws,{type:'created',room:roomCode,hostName:room.hostName,peerName:room.guestName});
    }
    if(type==='join'){
      const code=String(msg.room||'').trim().toUpperCase();const room=rooms.get(code);
      if(!room)return send(ws,{type:'error',message:'Sala não encontrada.'});
      if(room.guest)return send(ws,{type:'error',message:'A sala já está cheia.'});
      if(room.password!==String(msg.password||''))return send(ws,{type:'error',message:'Senha incorreta.'});
      if(clients.has(ws))return send(ws,{type:'error',message:'Você já está conectado a uma sala.'});
      room.guest=ws;room.guestName=String(msg.name||'Jogador 2').slice(0,18);clients.set(ws,{room:code,role:'guest'});
      send(ws,{type:'joined',room:code,hostName:room.hostName,guestName:room.guestName});
      send(room.host,{type:'peer-joined',peerName:room.guestName});
      return;
    }
    const info=clients.get(ws);if(!info)return send(ws,{type:'error',message:'Entre em uma sala primeiro.'});
    const room=rooms.get(info.room);if(!room)return send(ws,{type:'error',message:'Sala encerrada.'});
    const peer=peerOf(room,ws);
    if(type==='player-name'){
      const name=String(msg.name||'Jogador').replace(/[<>"']/g,'').slice(0,18)||'Jogador';
      if(info.role==='host')room.hostName=name;else room.guestName=name;
      if(peer)send(peer,{type:'player-name',name});
      return;
    }
    if(type==='state'){
      if(info.role==='host'&&peer)send(peer,{type:'state',seq:Number(msg.seq||0),state:msg.state});
      return;
    }
    if(type==='action'){
      if(info.role==='guest'&&peer)send(peer,{type:'action',action:msg.action});
      return;
    }
    if(type==='revenge'){
      if(peer)send(peer,{type:'revenge',accepted:!!msg.accepted});
      return;
    }
  });
  ws.on('close',()=>cleanup(ws));
  ws.on('error',()=>{});
});

wss.on('listening',()=>console.log(`Inseto Cards multiplayer server ouvindo na porta ${PORT}`));
process.on('SIGTERM',()=>wss.close(()=>process.exit(0)));
process.on('SIGINT',()=>wss.close(()=>process.exit(0)));
