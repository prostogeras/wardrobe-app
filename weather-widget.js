(() => {
  const style = document.createElement('style');
  style.textContent = `
    .today-look{margin:0 0 28px;background:#fff;border:1px solid var(--line);border-radius:30px;padding:20px;box-shadow:var(--shadow);overflow:hidden;position:relative}
    .today-look:before{content:"";position:absolute;width:220px;height:220px;border-radius:50%;background:var(--lime);opacity:.22;right:-70px;top:-100px}
    .today-look-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;position:relative}
    .today-look-kicker{font-size:12px;font-weight:1000;letter-spacing:.12em;text-transform:uppercase;color:#7d8d00}
    .today-look h2{font-size:clamp(27px,5vw,44px);line-height:.98;letter-spacing:-.055em;margin:7px 0 8px;max-width:720px}
    .today-weather{display:flex;align-items:center;gap:10px;background:#f3efe9;border-radius:999px;padding:10px 14px;font-weight:900;white-space:nowrap}
    .today-weather-icon{font-size:25px}.today-weather-meta{color:var(--muted);font-size:12px;margin-top:4px}
    .today-look-items{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:17px;position:relative}
    .today-item{background:#f3efe9;border-radius:18px;padding:8px;text-align:center;overflow:hidden}
    .today-item .pic{aspect-ratio:1;border-radius:13px}.today-item b{display:block;font-size:11px;margin-top:6px}.today-item small{display:block;color:var(--muted);font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .today-look-actions{display:flex;gap:10px;align-items:center;margin-top:15px;position:relative}
    .today-look-actions button{border:0;border-radius:999px;padding:13px 18px;font-weight:950}.today-wear{background:#111;color:#fff}.today-refresh{background:var(--lime);color:#111}.today-status{font-size:12px;color:var(--muted);margin-left:auto}
    @media(max-width:760px){.today-look{padding:15px;border-radius:24px}.today-look-top{display:block}.today-weather{display:inline-flex;margin-top:10px}.today-look-items{grid-template-columns:repeat(2,minmax(0,1fr))}.today-status{display:none}.today-look-actions button{flex:1;padding:12px 10px}}
  `;
  document.head.appendChild(style);

  const weatherCodes = {
    0:['☀️','ясно'],1:['🌤️','преимущественно ясно'],2:['⛅️','переменная облачность'],3:['☁️','облачно'],
    45:['🌫️','туман'],48:['🌫️','туман'],51:['🌦️','лёгкая морось'],53:['🌦️','морось'],55:['🌧️','сильная морось'],
    61:['🌦️','небольшой дождь'],63:['🌧️','дождь'],65:['🌧️','сильный дождь'],71:['🌨️','небольшой снег'],73:['🌨️','снег'],
    75:['❄️','сильный снег'],80:['🌦️','ливень'],81:['🌧️','ливень'],82:['🌧️','сильный ливень'],95:['⛈️','гроза']
  };

  function getLocation(){
    return new Promise(resolve => {
      if(!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        p => resolve({lat:p.coords.latitude, lon:p.coords.longitude}),
        () => resolve(null),
        {timeout:7000, maximumAge:1800000}
      );
    });
  }

  async function approximateLocation(){
    try{
      const r = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=ru');
      const d = await r.json();
      if(Number.isFinite(+d.latitude) && Number.isFinite(+d.longitude)){
        return {lat:+d.latitude, lon:+d.longitude, city:d.city||d.locality||d.principalSubdivision};
      }
    }catch(e){}
    return {lat:55.7963, lon:49.1088, city:'Казань'};
  }

  async function cityName(loc){
    if(loc.city) return loc.city;
    try{
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.lat}&longitude=${loc.lon}&localityLanguage=ru`);
      const d = await r.json();
      return d.city||d.locality||d.principalSubdivision||'Ваш город';
    }catch(e){return 'Ваш город'}
  }

  function partOfDay(hour){return hour<6?'ночь':hour<12?'утро':hour<18?'день':hour<23?'вечер':'ночь'}

  function chooseOutfit(t, code, precip, wind, hour, variant=0){
    const rainy = precip>.1 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(code);
    const snowy = [71,73,75,77,85,86].includes(code);
    const night = hour<7 || hour>=21;
    let ids;
    if(t<=2 || snowy) ids=['J-04','H-01','B-04'];
    else if(t<9) ids=rainy?['J-03','H-01','B-02']:['J-04','LS-01','B-04'];
    else if(t<=15) ids=rainy?['J-03','SH-01','T-04','B-02']:['SH-03','T-02','B-04'];
    else if(t<=21) ids=rainy?['J-03','T-04','B-01']:['SH-04','T-02','S-01'];
    else ids=wind>24?['SH-04','T-04','S-02']:['T-04','S-01'];
    if(night && ids.includes('T-02')) ids[ids.indexOf('T-02')]='T-05';
    const alternatives = [
      ids,
      t<=15?['J-02','T-04','B-02']:['T-02','S-04'],
      t<=10?['J-04','SH-01','LS-02','B-04']:['SH-02','T-05','S-02']
    ];
    return alternatives[variant % alternatives.length].map(id=>byId(id)).filter(Boolean);
  }

  function ensureCard(){
    const home=document.querySelector('#home');
    const hero=home?.querySelector('.hero');
    if(!home||!hero||typeof items==='undefined'||typeof byId==='undefined'||typeof pic==='undefined') return null;
    if(document.querySelector('#todayLook')) return document.querySelector('#todayLook');
    const card=document.createElement('section');
    card.className='today-look';card.id='todayLook';
    card.innerHTML=`<div class="today-look-top"><div><div class="today-look-kicker">Рекомендуемый лук на сегодня</div><h2>В такую погоду будет классно надеть</h2><div class="today-weather-meta" id="todayMeta">Определяем город, время и погоду…</div></div><div class="today-weather"><span class="today-weather-icon" id="todayIcon">◌</span><span id="todayTemp">—°</span></div></div><div class="today-look-items" id="todayItems"></div><div class="today-look-actions"><button class="today-wear" id="todayWear">Собрать этот лук</button><button class="today-refresh" id="todayRefresh">Другой вариант</button><span class="today-status" id="todayStatus"></span></div>`;
    hero.insertAdjacentElement('afterend',card);
    return card;
  }

  let latest=null, variant=0;
  function render(data){
    latest=data;
    const info=weatherCodes[data.code]||['🌤️','погода без сюрпризов'];
    const chosen=chooseOutfit(data.apparent,data.code,data.precip,data.wind,data.hour,variant);
    document.querySelector('#todayIcon').textContent=info[0];
    document.querySelector('#todayTemp').textContent=`${Math.round(data.temp)}°`;
    document.querySelector('#todayMeta').textContent=`${data.city} · ${partOfDay(data.hour)} · ощущается как ${Math.round(data.apparent)}° · ${info[1]}${data.wind>22?' · ветрено':''}`;
    document.querySelector('#todayItems').innerHTML=chosen.map(x=>`<div class="today-item">${pic(x.flatKey)}<b>${x.id}</b><small>${x.name}</small></div>`).join('');
    document.querySelector('#todayStatus').textContent=`Подобрано по погоде и времени в ${data.city}`;
    document.querySelector('#todayWear').onclick=()=>{
      selected={outer:null,layer:null,top:null,bottom:null};
      chosen.forEach(x=>selected[x.slot]=x.id);
      renderBuilder();go('builder');sound('success');vibrate([18,30,18]);
    };
  }

  async function load(){
    ensureCard();
    try{
      const loc=(await getLocation()) || await approximateLocation();
      const city=await cityName(loc);
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`);
      const d=await r.json(), c=d.current;
      render({city,temp:c.temperature_2m,apparent:c.apparent_temperature,precip:c.precipitation||0,code:c.weather_code,wind:c.wind_speed_10m||0,hour:+(c.time||'12:00').slice(11,13)});
    }catch(e){
      const meta=document.querySelector('#todayMeta');
      if(meta) meta.textContent='Не удалось получить погоду. Нажми «Другой вариант», чтобы попробовать снова.';
    }
  }

  function init(){
    if(!ensureCard()) return setTimeout(init,100);
    document.querySelector('#todayRefresh').onclick=()=>{variant++;latest?render(latest):load();sound()};
    load();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
