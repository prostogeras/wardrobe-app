(() => {
  const DB_NAME='lukWardrobeDB', DB_VERSION=1;
  const STORE_CLOTHES='customClothes', STORE_PROFILE='profilePhotos';
  const style=document.createElement('style');
  style.textContent=`
  .add-view{padding-top:28px}.add-hero{background:linear-gradient(135deg,#111 0 56%,#cfff25 56%);color:#fff;border-radius:32px;padding:28px;min-height:220px;display:flex;align-items:flex-end;position:relative;overflow:hidden;box-shadow:var(--shadow)}.add-hero:after{content:"+";position:absolute;right:7%;top:5%;font-size:160px;line-height:1;color:#111;font-weight:1000;transform:rotate(8deg)}.add-hero h2{font-size:clamp(34px,7vw,72px);letter-spacing:-.065em;line-height:.9;margin:0 0 10px;max-width:620px}.add-hero p{margin:0;color:#c9c9c9;max-width:540px;line-height:1.45}.add-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.upload-panel{background:#fff;border:1px solid var(--line);border-radius:28px;padding:20px;box-shadow:var(--shadow)}.upload-panel h3{font-size:25px;letter-spacing:-.04em;margin:0 0 6px}.upload-panel>p{color:var(--muted);font-size:13px;line-height:1.45;margin:0 0 16px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{display:grid;gap:6px}.field.full{grid-column:1/-1}.field label{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#68635d}.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);background:#faf8f4;border-radius:14px;padding:12px;outline:none}.field textarea{min-height:80px;resize:vertical}.drop{border:2px dashed #cfc8bd;border-radius:20px;background:#f8f5ef;padding:16px;min-height:154px;display:grid;place-items:center;text-align:center;position:relative;overflow:hidden}.drop input{position:absolute;inset:0;opacity:0;cursor:pointer}.drop b{display:block}.drop small{display:block;color:var(--muted);margin-top:5px}.drop-preview{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.upload-actions{display:flex;gap:10px;margin-top:14px}.upload-actions button{flex:1;border:0;border-radius:16px;padding:13px;font-weight:950}.save-clothing,.save-profile{background:#111;color:#fff}.secondary-action{background:var(--lime);color:#111}.photo-instruction{display:grid;gap:9px;margin:12px 0}.instruction-row{display:grid;grid-template-columns:38px 1fr;gap:10px;align-items:start;background:#f6f2ec;border-radius:15px;padding:10px}.instruction-row span{width:38px;height:38px;border-radius:12px;background:var(--lime);display:grid;place-items:center;font-weight:1000}.instruction-row b{font-size:12px}.instruction-row small{display:block;color:var(--muted);font-size:10px;line-height:1.35;margin-top:2px}.profile-slots{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.profile-slot{min-height:170px}.saved-uploads{margin-top:18px;background:#fff;border:1px solid var(--line);border-radius:28px;padding:20px}.saved-uploads h3{margin:0 0 12px;font-size:24px}.custom-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.custom-card{background:#f4f0e9;border-radius:18px;overflow:hidden}.custom-card img{width:100%;aspect-ratio:1;object-fit:cover}.custom-card-body{padding:10px}.custom-card b{display:block;font-size:12px}.custom-card small{display:block;color:var(--muted);font-size:9px;margin-top:3px}.custom-card button{width:100%;border:0;border-top:1px solid #ddd4c8;background:#fff;padding:9px;font-weight:850}.privacy-note{margin-top:12px;font-size:11px;color:var(--muted);line-height:1.4}.upload-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translate(-50%,20px);background:#111;color:#fff;border:2px solid var(--lime);border-radius:999px;padding:13px 17px;font-weight:900;opacity:0;pointer-events:none;transition:.25s;z-index:900;white-space:nowrap}.upload-toast.show{opacity:1;transform:translate(-50%,0)}
  @media(max-width:760px){.add-view{padding-top:16px}.add-hero{border-radius:24px;padding:20px;min-height:190px;background:linear-gradient(145deg,#111 0 68%,#cfff25 68%)}.add-hero:after{font-size:110px;right:1%;top:20%}.add-grid{grid-template-columns:1fr}.upload-panel{border-radius:22px;padding:15px}.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.custom-list{grid-template-columns:repeat(2,minmax(0,1fr))}.profile-slots{grid-template-columns:1fr 1fr}.nav{max-width:calc(100vw - 94px)}.nav button{white-space:nowrap}}
  `;
  document.head.appendChild(style);

  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE_CLOTHES))db.createObjectStore(STORE_CLOTHES,{keyPath:'id'});if(!db.objectStoreNames.contains(STORE_PROFILE))db.createObjectStore(STORE_PROFILE,{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function put(store,value){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  async function getAll(store){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(store).objectStore(store).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function del(store,key){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  const fileToData=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const typeMap={outer:['Верхняя одежда','outer'],layer:['Рубашки','layer'],top:['Футболки / худи','top'],bottom:['Брюки / шорты','bottom']};
  let customRecords=[];

  function toast(text){let t=document.querySelector('#uploadToast');if(!t){t=document.createElement('div');t.id='uploadToast';t.className='upload-toast';document.body.appendChild(t)}t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
  function bindPreview(input,box){input.addEventListener('change',()=>{const f=input.files?.[0];box.querySelector('.drop-preview')?.remove();if(!f)return;const img=document.createElement('img');img.className='drop-preview';img.src=URL.createObjectURL(f);box.appendChild(img)})}

  function inject(){
    if(typeof items==='undefined'||typeof renderCatalog!=='function'||typeof go!=='function') return setTimeout(inject,120);
    if(document.querySelector('#add')) return;
    const nav=document.querySelector('.nav');
    const btn=document.createElement('button');btn.dataset.view='add';btn.textContent='Добавить';btn.onclick=()=>go('add');nav.appendChild(btn);
    const main=document.querySelector('main');
    const section=document.createElement('section');section.id='add';section.className='view add-view';
    section.innerHTML=`
      <div class="add-hero"><div><h2>Добавь новое.</h2><p>Загружай вещи и свои референсные фотографии. Они будут храниться только на этом устройстве и использоваться для каталога и точных запросов на примерку.</p></div></div>
      <div class="add-grid">
        <article class="upload-panel"><h3>Новый предмет одежды</h3><p>Для каталога лучше всего подходит отдельное фото вещи сверху или на вешалке, без других предметов в кадре.</p>
          <div class="form-grid">
            <div class="field"><label>Название</label><input id="newName" placeholder="Например, зелёная куртка"></div>
            <div class="field"><label>Категория</label><select id="newSlot"><option value="outer">Верхняя одежда</option><option value="layer">Рубашка / дополнительный слой</option><option value="top">Футболка, худи или лонгслив</option><option value="bottom">Брюки или шорты</option></select></div>
            <div class="field"><label>Цвет</label><input id="newColor" placeholder="Оливковый"></div>
            <div class="field"><label>Стиль</label><input id="newStyle" placeholder="Casual / streetwear"></div>
            <div class="field full"><label>Фото вещи отдельно — обязательно</label><div class="drop" id="flatDrop"><input id="newFlat" type="file" accept="image/*"><div><b>Нажми, чтобы выбрать фото</b><small>Вся вещь целиком, ровный свет, нейтральный фон</small></div></div></div>
            <div class="field full"><label>Фото вещи на тебе — желательно</label><div class="drop" id="wornDrop"><input id="newWorn" type="file" accept="image/*"><div><b>Добавить фото посадки</b><small>Полный рост или кадр, где хорошо виден крой</small></div></div></div>
            <div class="field full"><label>Заметка</label><textarea id="newNote" placeholder="Бренд, материал, сезон, особенности посадки"></textarea></div>
          </div><div class="upload-actions"><button class="save-clothing" id="saveClothing">Добавить в гардероб</button><button class="secondary-action" id="resetClothing">Очистить</button></div>
        </article>
        <article class="upload-panel"><h3>Мои фотографии</h3><p>Эти фотографии нужны как строгие референсы внешности, фигуры, пропорций и татуировок для виртуальной примерки.</p>
          <div class="photo-instruction">
            <div class="instruction-row"><span>1</span><div><b>Полный рост спереди</b><small>Камера на уровне груди, ровная стойка, облегающая одежда или бельё, всё тело в кадре.</small></div></div>
            <div class="instruction-row"><span>2</span><div><b>Полный рост сбоку</b><small>Нейтральная поза без втягивания живота. Это помогает сохранить реальные пропорции.</small></div></div>
            <div class="instruction-row"><span>3</span><div><b>Лицо крупным планом</b><small>Без фильтров, очков и сильных теней, прямо в камеру, естественное выражение.</small></div></div>
            <div class="instruction-row"><span>4</span><div><b>Татуировки и детали</b><small>Отдельные чёткие кадры крупных татуировок, если они плохо видны на фото полного роста.</small></div></div>
          </div>
          <div class="profile-slots">
            <div class="field"><label>Спереди</label><div class="drop profile-slot" id="frontDrop"><input id="profileFront" type="file" accept="image/*"><div><b>Полный рост</b><small>вид спереди</small></div></div></div>
            <div class="field"><label>Сбоку</label><div class="drop profile-slot" id="sideDrop"><input id="profileSide" type="file" accept="image/*"><div><b>Полный рост</b><small>вид сбоку</small></div></div></div>
            <div class="field"><label>Лицо</label><div class="drop profile-slot" id="faceDrop"><input id="profileFace" type="file" accept="image/*"><div><b>Портрет</b><small>без фильтров</small></div></div></div>
            <div class="field"><label>Детали</label><div class="drop profile-slot" id="detailDrop"><input id="profileDetail" type="file" accept="image/*"><div><b>Татуировки</b><small>или другие детали</small></div></div></div>
          </div><div class="upload-actions"><button class="save-profile" id="saveProfile">Сохранить мои фото</button></div>
          <div class="privacy-note">Фото сохраняются локально в браузере через IndexedDB. Они не загружаются в GitHub и не публикуются на сайте. При очистке данных Safari они будут удалены.</div>
        </article>
      </div>
      <section class="saved-uploads"><h3>Добавленные вещи</h3><div class="custom-list" id="customList"></div></section>`;
    main.appendChild(section);
    [['#newFlat','#flatDrop'],['#newWorn','#wornDrop'],['#profileFront','#frontDrop'],['#profileSide','#sideDrop'],['#profileFace','#faceDrop'],['#profileDetail','#detailDrop']].forEach(([i,b])=>bindPreview(document.querySelector(i),document.querySelector(b)));
    document.querySelector('#saveClothing').onclick=saveClothing;
    document.querySelector('#resetClothing').onclick=resetClothing;
    document.querySelector('#saveProfile').onclick=saveProfile;
    hydrate();
  }

  async function saveClothing(){
    const name=document.querySelector('#newName').value.trim(),slot=document.querySelector('#newSlot').value,color=document.querySelector('#newColor').value.trim()||'Не указан',style=document.querySelector('#newStyle').value.trim()||'Custom',flat=document.querySelector('#newFlat').files[0],worn=document.querySelector('#newWorn').files[0],note=document.querySelector('#newNote').value.trim();
    if(!name)return alert('Укажи название вещи');if(!flat)return alert('Добавь фотографию вещи отдельно');
    const id='C-'+Date.now().toString(36).toUpperCase();
    const rec={id,name,slot,cat:typeMap[slot][0],color,style,note,flatData:await fileToData(flat),wornData:worn?await fileToData(worn):null,createdAt:Date.now()};
    await put(STORE_CLOTHES,rec);customRecords.push(rec);addToRuntime(rec);resetClothing();renderCustomList();renderCatalog();if(typeof renderBuilder==='function')renderBuilder();toast('✓ Вещь добавлена в гардероб')
  }
  function resetClothing(){['#newName','#newColor','#newStyle','#newNote'].forEach(s=>document.querySelector(s).value='');['#newFlat','#newWorn'].forEach(s=>document.querySelector(s).value='');['#flatDrop','#wornDrop'].forEach(s=>document.querySelector(s).querySelector('.drop-preview')?.remove())}
  async function saveProfile(){
    const slots=[['front','#profileFront'],['side','#profileSide'],['face','#profileFace'],['detail','#profileDetail']];let n=0;
    for(const [key,sel] of slots){const f=document.querySelector(sel).files[0];if(f){await put(STORE_PROFILE,{key,data:await fileToData(f),updatedAt:Date.now()});n++}}
    if(!n)return alert('Выбери хотя бы одну фотографию');toast('✓ Референсные фотографии сохранены')
  }
  function addToRuntime(rec){
    if(items.some(x=>x.id===rec.id))return;
    items.push({id:rec.id,name:rec.name,cat:rec.cat,color:rec.color,style:rec.style,slot:rec.slot,flatKey:rec.id+'_custom_flat',wornKey:rec.wornData?rec.id+'_custom_worn':null,custom:true});
  }
  function wrapPic(){
    if(window.__addPicWrapped)return;window.__addPicWrapped=true;const prev=pic;
    pic=function(key){const id=key?.replace('_custom_flat','').replace('_custom_worn','');const rec=customRecords.find(r=>r.id===id);if(rec){const src=key.includes('_custom_worn')&&rec.wornData?rec.wornData:rec.flatData;return `<div class="pic" style="background-image:url('${src}');background-size:cover;background-position:center"></div>`}return prev(key)};
  }
  async function hydrate(){customRecords=await getAll(STORE_CLOTHES);customRecords.forEach(addToRuntime);wrapPic();renderCustomList();renderCatalog();if(typeof renderBuilder==='function')renderBuilder()}
  function renderCustomList(){const el=document.querySelector('#customList');if(!el)return;el.innerHTML=customRecords.length?customRecords.sort((a,b)=>b.createdAt-a.createdAt).map(r=>`<article class="custom-card"><img src="${r.flatData}" alt="${r.name}"><div class="custom-card-body"><b>${r.name}</b><small>${r.cat} · ${r.color}</small></div><button data-delete-custom="${r.id}">Удалить</button></article>`).join(''):'<div class="empty">Ты пока не добавил новые вещи.</div>';el.querySelectorAll('[data-delete-custom]').forEach(b=>b.onclick=async()=>{if(!confirm('Удалить эту вещь с устройства?'))return;await del(STORE_CLOTHES,b.dataset.deleteCustom);customRecords=customRecords.filter(r=>r.id!==b.dataset.deleteCustom);const i=items.findIndex(x=>x.id===b.dataset.deleteCustom);if(i>=0)items.splice(i,1);renderCustomList();renderCatalog();if(typeof renderBuilder==='function')renderBuilder();toast('Вещь удалена')})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
