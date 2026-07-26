(() => {
  const DB_NAME='lukWardrobeDB', DB_VERSION=1, STORE_PROFILE='profilePhotos';
  const slotLabels={front:'полный рост спереди',side:'полный рост сбоку',face:'портрет лица',detail:'татуировки и детали'};

  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_PROFILE))db.createObjectStore(STORE_PROFILE,{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function replaceAll(records){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE_PROFILE,'readwrite'),store=tx.objectStore(STORE_PROFILE);store.clear();records.forEach(r=>store.put(r));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  async function getAll(){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(STORE_PROFILE).objectStore(STORE_PROFILE).getAll();req.onsuccess=()=>resolve(req.result.sort((a,b)=>(a.order||0)-(b.order||0)));req.onerror=()=>reject(req.error)})}
  const fileToData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  function dataToFile(data,key){const [head,body]=data.split(','),mime=(head.match(/data:(.*?);/)||[])[1]||'image/jpeg',bytes=atob(body),arr=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);const ext=mime.includes('png')?'png':mime.includes('webp')?'webp':'jpg';return new File([arr],`person_${key}.${ext}`,{type:mime})}
  function toast(text){let t=document.querySelector('#profileCurrentToast');if(!t){t=document.createElement('div');t.id='profileCurrentToast';t.style.cssText='position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translate(-50%,20px);background:#111;color:#fff;border:2px solid #cfff25;border-radius:999px;padding:13px 17px;font-weight:900;opacity:0;pointer-events:none;transition:.25s;z-index:999;white-space:nowrap';document.body.appendChild(t)}t.textContent=text;t.style.opacity='1';t.style.transform='translate(-50%,0)';setTimeout(()=>{t.style.opacity='0';t.style.transform='translate(-50%,20px)'},2300)}

  window.LUKProfileRefs={
    getAll,
    async getFiles(){return (await getAll()).map(r=>dataToFile(r.data,r.key))},
    async count(){return (await getAll()).length}
  };

  async function saveLatestSet(){
    const slots=[['front','#profileFront'],['side','#profileSide'],['face','#profileFace'],['detail','#profileDetail']];
    const picked=[];
    for(let i=0;i<slots.length;i++){
      const [key,sel]=slots[i],input=document.querySelector(sel),file=input?.files?.[0];
      if(file)picked.push({key,data:await fileToData(file),name:file.name,type:file.type,order:i,updatedAt:Date.now()});
    }
    if(!picked.length)return alert('Выбери хотя бы одну новую фотографию');
    const existing=await getAll();
    const message=existing.length?'Новые фотографии полностью заменят предыдущие. Продолжить?':'Сохранить эти фотографии как актуальные?';
    if(!confirm(message))return;
    await replaceAll(picked);
    document.querySelectorAll('#profileFront,#profileSide,#profileFace,#profileDetail').forEach(input=>input.value='');
    document.querySelectorAll('#frontDrop .drop-preview,#sideDrop .drop-preview,#faceDrop .drop-preview,#detailDrop .drop-preview').forEach(img=>img.remove());
    updateStatus();
    window.dispatchEvent(new CustomEvent('luk-profile-updated',{detail:{count:picked.length,keys:picked.map(x=>x.key)}}));
    toast(`✓ Актуальные фото заменены: ${picked.length}`);
  }

  async function updateStatus(){
    const panel=document.querySelector('#saveProfile')?.closest('.upload-panel');if(!panel)return;
    let box=document.querySelector('#activeProfileStatus');if(!box){box=document.createElement('div');box.id='activeProfileStatus';box.style.cssText='margin-top:12px;padding:12px 14px;border-radius:16px;background:#eef7d4;border:1px solid #c5df65;font-size:12px;line-height:1.45';panel.querySelector('.privacy-note')?.before(box)}
    const refs=await getAll();
    box.innerHTML=refs.length?`<b>Актуальный набор: ${refs.length} фото</b><br>${refs.map(r=>slotLabels[r.key]||r.key).join(' · ')}<br><small>При следующем сохранении этот набор будет полностью удалён и заменён новым.</small>`:'<b>Актуальных фотографий пока нет.</b><br><small>Загрузи новый набор — он станет единственным активным набором для примерки.</small>';
  }

  function patchSave(){const btn=document.querySelector('#saveProfile');if(!btn)return false;btn.onclick=saveLatestSet;btn.textContent='Заменить актуальные фото';updateStatus();return true}

  function buildPrompt(){
    if(typeof selected==='undefined'||typeof byId!=='function')return '';
    const slots=['outer','layer','top','bottom'],chosen=slots.map(s=>byId(selected[s])).filter(Boolean),code=chosen.map(x=>x.id).join(' + ');
    return `Создай максимально фотореалистичную фотографию меня в комплекте ${code} из моего цифрового гардероба. Вещи: ${chosen.map(x=>x.name).join(', ')}. Используй приложенные актуальные фотографии человека как строгий и единственный референс личности, лица, фигуры, пропорций и татуировок. Игнорируй любые более ранние изображения человека. Не изменяй лицо, возраст, причёску, вес, объём живота, плеч, рук и ног. Одежду воспроизведи максимально близко к оригиналам: цвет, материал, принты, логотипы, длина, объём, крой и естественная посадка. Полный рост, фронтальный ракурс, мягкое нейтральное освещение, без ретуши.`;
  }

  async function shareTryOn(){
    const text=buildPrompt();if(!text)return alert('Сначала выбери вещи');
    const refs=await getAll();
    const request=document.querySelector('#requestV2');if(request){request.style.display='block';request.textContent=text}
    if(!refs.length){try{await navigator.clipboard.writeText(text)}catch(e){}alert('Актуальные фотографии человека не загружены. Сначала добавь их во вкладке «Добавить».');return}
    const files=refs.map(r=>dataToFile(r.data,r.key));
    try{
      if(navigator.canShare?.({files})&&navigator.share){await navigator.share({title:'Реалистичная примерка',text,files});toast(`Передано ${files.length} актуальных фото`) }
      else {await navigator.clipboard.writeText(text);toast('Запрос скопирован. Прикрепи актуальные фото вручную')}
    }catch(e){if(e?.name!=='AbortError'){try{await navigator.clipboard.writeText(text)}catch(_){}toast('Запрос скопирован — прикрепи актуальные фото')}}
  }

  function patchTryOn(){const btn=document.querySelector('#tryonV2');if(!btn)return false;btn.onclick=shareTryOn;btn.innerHTML='<span>✦</span>Примерить с<br>актуальными фото';return true}
  function init(){const a=patchSave(),b=patchTryOn();if(!a||!b)setTimeout(init,150)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
