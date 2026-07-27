(() => {
  const DB_NAME='lukWardrobeDB',DB_VERSION=1,STORE='customClothes';
  const TYPES={outer:['Верхняя одежда','outer'],layer:['Рубашки','layer'],top:['Футболки / худи','top'],bottom:['Брюки / шорты','bottom']};

  const css=document.createElement('style');
  css.textContent=`
    #newName,#newSlot,#newColor,#newStyle,#newNote{display:none!important}
    #newName+*,#newSlot+*,#newColor+*,#newStyle+*,#newNote+*{display:none!important}
    .simple-hidden{display:none!important}
    .cloth-kind-modal{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:1200;display:none;align-items:flex-end;justify-content:center;padding:16px}.cloth-kind-modal.open{display:flex}.cloth-kind-panel{width:min(560px,100%);background:#fff;border-radius:28px;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.35)}.cloth-kind-panel h3{font-size:28px;margin:0 0 6px}.cloth-kind-panel p{margin:0 0 14px;color:#77716a}.cloth-kind-panel input{width:100%;border:1px solid #ded7cd;border-radius:15px;padding:13px;font:inherit;margin-bottom:10px}.cloth-kind-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cloth-kind-grid button{border:1px solid #ded7cd;background:#f6f2ec;border-radius:15px;padding:13px;font-weight:850}.cloth-kind-grid button.active{background:#171717;color:#fff}.cloth-kind-confirm{width:100%;margin-top:12px;border:0;border-radius:16px;padding:14px;background:#cfff25;font-weight:950}.cloth-kind-cancel{width:100%;margin-top:8px;border:0;background:transparent;padding:10px}
  `;
  document.head.appendChild(css);

  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function put(value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  const fileToData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const loadImage=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});

  async function makeIcon(src){
    const img=await loadImage(src),s=640,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#faf8f3';x.fillRect(0,0,s,s);const k=Math.min((s-90)/img.width,(s-90)/img.height),w=img.width*k,h=img.height*k,dx=(s-w)/2,dy=(s-h)/2;x.drawImage(img,dx,dy,w,h);const im=x.getImageData(0,0,s,s),d=im.data;for(let i=0;i<d.length;i+=4){d[i]=Math.round(d[i]/30)*30;d[i+1]=Math.round(d[i+1]/30)*30;d[i+2]=Math.round(d[i+2]/30)*30}x.putImageData(im,0,0);return c.toDataURL('image/webp',.9)
  }

  function modal(){
    let m=document.querySelector('#clothKindModal');if(m)return m;
    m=document.createElement('div');m.id='clothKindModal';m.className='cloth-kind-modal';m.innerHTML=`<div class="cloth-kind-panel"><h3>Что это за вещь?</h3><p>Укажи название и тип — они появятся в каталоге.</p><input id="clothKindName" placeholder="Например, оливковые брюки"><div class="cloth-kind-grid">${Object.entries(TYPES).map(([k,v])=>`<button data-kind="${k}">${v[0]}</button>`).join('')}</div><button class="cloth-kind-confirm" id="clothKindConfirm">Добавить в гардероб</button><button class="cloth-kind-cancel" id="clothKindCancel">Отмена</button></div>`;document.body.appendChild(m);return m;
  }
  function askKind(){return new Promise(resolve=>{const m=modal(),name=m.querySelector('#clothKindName'),buttons=[...m.querySelectorAll('[data-kind]')];let kind='';name.value='';buttons.forEach(b=>{b.classList.remove('active');b.onclick=()=>{buttons.forEach(x=>x.classList.remove('active'));b.classList.add('active');kind=b.dataset.kind}});m.classList.add('open');m.querySelector('#clothKindCancel').onclick=()=>{m.classList.remove('open');resolve(null)};m.querySelector('#clothKindConfirm').onclick=()=>{const n=name.value.trim();if(!n)return alert('Напиши название вещи');if(!kind)return alert('Выбери тип вещи');m.classList.remove('open');resolve({name:n,kind})}})}

  function simplify(){
    const panel=document.querySelector('#saveClothing')?.closest('.upload-panel');if(!panel)return false;
    ['#newName','#newSlot','#newColor','#newStyle','#newNote'].forEach(sel=>{const el=document.querySelector(sel);el?.closest('.field')?.classList.add('simple-hidden')});
    panel.querySelector('h3').textContent='Добавить одежду';
    const intro=panel.querySelector('p');if(intro)intro.textContent='Добавь оригинальное фото вещи и при желании фото посадки. После создания иконки приложение спросит, что это за предмет.';
    const btn=document.querySelector('#saveClothing');btn.textContent='Создать иконку';
    btn.onclick=async()=>{
      const flat=document.querySelector('#newFlat')?.files?.[0],worn=document.querySelector('#newWorn')?.files?.[0];if(!flat)return alert('Добавь фотографию вещи отдельно');
      btn.disabled=true;btn.textContent='Создаём иконку…';
      try{const flatData=await fileToData(flat),iconData=await makeIcon(flatData),info=await askKind();if(!info)return;const id='C-'+Date.now().toString(36).toUpperCase(),meta=TYPES[info.kind];await put({id,name:info.name,slot:meta[1],cat:meta[0],color:'Не указан',style:'Custom',flatData,iconData,wornData:worn?await fileToData(worn):null,createdAt:Date.now()});location.reload()}catch(e){console.error(e);alert('Не удалось добавить вещь. Попробуй другое фото.')}finally{btn.disabled=false;btn.textContent='Создать иконку'}
    };
    return true;
  }
  function init(){if(!simplify())setTimeout(init,150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
