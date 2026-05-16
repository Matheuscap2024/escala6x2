const CACHE='escala6x2-v1';
const ASSETS=['/','/index.html','/manifest.json'];

const CORES={
  azul:    {cor:'#3b82f6',label:'Azul',   offset:0},
  verde:   {cor:'#22c55e',label:'Verde',  offset:2},
  amarelo: {cor:'#eab308',label:'Amarelo',offset:4},
  vermelho:{cor:'#ef4444',label:'Vermelho',offset:6}
};
const ORDEM=['azul','verde','amarelo','vermelho'];
const REF_YEAR=2026,REF_MONTH=4,REF_DAY=15;

function diffDias(d){
  const ref=Date.UTC(REF_YEAR,REF_MONTH,REF_DAY);
  const tgt=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  return Math.round((tgt-ref)/86400000);
}
function proximaFolga(cor){
  const hoje=new Date();
  for(let i=0;i<=30;i++){
    const d=new Date(hoje);d.setDate(hoje.getDate()+i);
    const ciclo=((diffDias(d)%8)+8)%8;
    const o=CORES[cor].offset;
    if(ciclo===o||ciclo===o+1)return i;
  }
  return-1;
}

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('/index.html'))));
});

self.addEventListener('message',e=>{
  if(e.data&&e.data.type==='AGENDAR'){
    const{minhaCor,togHoje,togAmanha,tog2dias}=e.data;
    agendarVerificacao(minhaCor,togHoje,togAmanha,tog2dias);
  }
});

function agendarVerificacao(minhaCor,togHoje,togAmanha,tog2dias){
  const dias=proximaFolga(minhaCor);
  const c=CORES[minhaCor];
  if(dias===0&&togHoje){
    self.registration.showNotification('🎉 Dia de folga!',{body:`Hoje é sua folga, ${c.label}! Aproveite bem.`,tag:'escala-hoje',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',vibrate:[200,100,200]});
  }else if(dias===1&&togAmanha){
    self.registration.showNotification('🔜 Folga amanhã!',{body:`Sua folga ${c.label} começa amanhã. Prepare-se!`,tag:'escala-amanha',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',vibrate:[200,100,200]});
  }else if(dias===2&&tog2dias){
    self.registration.showNotification('📅 Folga em 2 dias!',{body:`Sua folga ${c.label} começa em 2 dias!`,tag:'escala-2dias',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',vibrate:[100,50,100]});
  }
}

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(cs=>{
    if(cs.length)return cs[0].focus();
    return clients.openWindow('/');
  }));
});

// Verificação diária automática às 8h
self.addEventListener('periodicsync',e=>{
  if(e.tag==='verificar-folga'){
    e.waitUntil(verificarENotificar());
  }
});

async function verificarENotificar(){
  const prefs=await self.registration.storage?.get('prefs').catch(()=>null);
  if(!prefs)return;
  const{minhaCor,togHoje,togAmanha,tog2dias}=prefs;
  agendarVerificacao(minhaCor,togHoje||true,togAmanha||true,tog2dias||true);
}
