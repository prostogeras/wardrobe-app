(() => {
  const style=document.createElement('style');
  style.textContent=`
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Playfair+Display:ital,wght@1,700&display=swap');
  :root{--display:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;--accent:'Playfair Display',Georgia,serif}
  html,body{font-family:var(--display)}
  .brand,.splash-logo,.hero h1,.section-head h2,.today-look h2,.look-head h2,.add-hero h2{font-family:var(--display);font-weight:800}
  .hero h1 span,.scribble{font-family:var(--accent);font-weight:700;font-style:italic;letter-spacing:-.035em}
  .appbar-inner{overflow:hidden}.brand{flex:0 0 auto;white-space:nowrap}.nav{min-width:0;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch}.nav::-webkit-scrollbar{display:none}.nav button{flex:0 0 auto;white-space:nowrap}
  .home-collage-block{margin:0 0 28px}.home-collage-block .hero-collage{min-height:420px}
  .hero>.today-look{margin:0;align-self:stretch;min-height:440px;display:flex;flex-direction:column;justify-content:center}
  .hero>.today-look .today-look-items{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hero>.today-look .today-look-actions{flex-wrap:wrap}.hero>.today-look .today-status{width:100%;margin-left:0}
  @media(max-width:760px){
    .appbar-inner{gap:10px;padding:10px 12px}.brand{font-size:17px}.nav{display:flex;gap:3px;padding-right:4px}.nav button{font-size:13px;padding:9px 10px}.sound-toggle{display:none}
    .hero{display:flex;flex-direction:column;padding:32px 0 22px;gap:22px}.hero>div:first-child{width:100%}.hero h1{font-size:clamp(48px,15vw,72px);line-height:.9}.hero p{font-size:17px}
    .hero>.today-look{order:2;width:100%;min-height:0}.home-collage-block{order:3;margin-top:0}.home-collage-block .hero-collage{min-height:330px}
    .today-look-top{display:block}.today-look h2{font-size:31px;line-height:1}.today-look-items{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  }
  `;
  document.head.appendChild(style);

  function rearrange(){
    const home=document.querySelector('#home'),hero=home?.querySelector('.hero'),collage=hero?.querySelector('.hero-collage'),today=document.querySelector('#todayLook');
    if(!home||!hero||!collage||!today)return false;
    if(!today.classList.contains('today-in-hero')){
      today.classList.add('today-in-hero');
      hero.appendChild(today);
    }
    if(!document.querySelector('.home-collage-block')){
      const wrap=document.createElement('section');wrap.className='home-collage-block';
      hero.insertAdjacentElement('afterend',wrap);wrap.appendChild(collage);
    }
    return true;
  }
  function init(){if(!rearrange())setTimeout(init,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
