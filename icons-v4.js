(() => {
  const ORDER=['B-01','B-02','B-03','B-04','T-01','T-02','T-03','T-04','T-05','H-01','H-02','S-01','S-02','S-03','S-04','LS-01','LS-02','SH-01','SH-02','SH-03','SH-04','J-01','J-02','J-03','J-04'];
  const INDEX=Object.fromEntries(ORDER.map((id,index)=>[id,index]));
  const style=document.createElement('style');
  style.textContent=`
    .generated-clothing-icon{width:100%;aspect-ratio:300/380;background:#f8f5ee url('./wardrobe_icons.webp?v=1') no-repeat;background-size:500% 500%;position:relative;overflow:hidden}
    .generated-clothing-icon:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(29,22,15,.05)}
    .thumb .generated-clothing-icon,.today-item .generated-clothing-icon,.selected-mini .generated-clothing-icon,.look-choice .generated-clothing-icon{aspect-ratio:1;background-size:500% 500%}
  `;
  document.head.appendChild(style);

  function iconPosition(id){
    const i=INDEX[id];if(i===undefined)return '';
    const col=i%5,row=Math.floor(i/5);
    return `${col*25}% ${row*25}%`;
  }
  function icon(id,extra='generated-clothing-icon'){
    return `<div class="${extra}" data-icon-id="${id}" style="background-position:${iconPosition(id)}"></div>`;
  }

  function originalSequence(){
    const result=[];
    if(typeof items==='undefined')return result;
    items.filter(x=>!x.custom).forEach(x=>{result.push(x.flatKey);if(x.wornKey)result.push(x.wornKey)});
    result.push('body_front');
    return result;
  }
  function originalPosition(key){
    if(typeof pos!=='undefined'&&pos[key])return pos[key];
    const i=originalSequence().indexOf(key);
    return i<0?null:{col:i%8,row:Math.floor(i/8)};
  }

  window.LUKOriginalClothingImages={
    async getDataURL(itemId,mode='flat'){
      const item=typeof byId==='function'?byId(itemId):null;
      if(!item)throw new Error('Вещь не найдена');
      if(item.custom){
        if(typeof window.LUKCustomClothes==='object'&&window.LUKCustomClothes.getDataURL)return window.LUKCustomClothes.getDataURL(itemId,mode);
        throw new Error('Оригинал добавленной вещи пока недоступен');
      }
      const key=mode==='worn'&&item.wornKey?item.wornKey:item.flatKey;
      const p=originalPosition(key);if(!p)throw new Error('Фото вещи не найдено');
      const image=new Image();image.crossOrigin='anonymous';image.src='./wardrobe_sprite.webp?v=7';
      await image.decode();
      const canvas=document.createElement('canvas');canvas.width=300;canvas.height=380;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,p.col*300,p.row*380,300,380,0,0,300,380);
      return canvas.toDataURL('image/jpeg',.94);
    },
    async getFiles(ids){
      const files=[];
      for(const id of ids){
        const data=await this.getDataURL(id,'flat');
        const blob=await (await fetch(data)).blob();files.push(new File([blob],`${id}_original.jpg`,{type:'image/jpeg'}));
      }
      return files;
    }
  };

  function patch(){
    if(typeof items==='undefined'||typeof pic!=='function'||typeof renderCatalog!=='function')return setTimeout(patch,100);
    if(window.__lukIconsV4)return;window.__lukIconsV4=true;
    const previousPic=pic;
    pic=function(key){
      const item=items.find(x=>x.flatKey===key);
      if(item&&!item.custom&&INDEX[item.id]!==undefined)return icon(item.id);
      return previousPic(key);
    };
    window.LUKClothingIcon={html:icon,position:iconPosition};
    renderCatalog();
    if(typeof renderBuilder==='function')renderBuilder();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);else patch();
})();
