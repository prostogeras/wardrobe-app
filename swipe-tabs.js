(() => {
  const MIN_DISTANCE=64;
  const MAX_VERTICAL_DRIFT=70;
  const MAX_DURATION=650;
  let startX=0,startY=0,startTime=0,tracking=false;

  const style=document.createElement('style');
  style.textContent=`
    .view.swipe-enter-left{animation:swipeEnterLeft .28s cubic-bezier(.2,.8,.2,1) both!important}
    .view.swipe-enter-right{animation:swipeEnterRight .28s cubic-bezier(.2,.8,.2,1) both!important}
    @keyframes swipeEnterLeft{from{opacity:.2;transform:translateX(34px)}to{opacity:1;transform:none}}
    @keyframes swipeEnterRight{from{opacity:.2;transform:translateX(-34px)}to{opacity:1;transform:none}}
  `;
  document.head.appendChild(style);

  function tabs(){return [...document.querySelectorAll('.nav button[data-view]')].filter(button=>document.querySelector('#'+button.dataset.view))}
  function activeIndex(list){const active=document.querySelector('.view.active');return Math.max(0,list.findIndex(button=>button.dataset.view===active?.id))}
  function blockedTarget(target){return !!target.closest('input,textarea,select,button,a,label,.choices,.row,.filters,.nav,.modal,.panel,[data-no-swipe]')}
  function openAt(index,direction){
    const list=tabs();if(index<0||index>=list.length)return;
    const button=list[index],view=document.querySelector('#'+button.dataset.view);
    if(typeof go==='function')go(button.dataset.view);else button.click();
    requestAnimationFrame(()=>{
      view.classList.remove('swipe-enter-left','swipe-enter-right');
      void view.offsetWidth;
      view.classList.add(direction>0?'swipe-enter-left':'swipe-enter-right');
      button.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
      if(navigator.vibrate)navigator.vibrate(8);
    });
  }

  document.addEventListener('touchstart',event=>{
    if(event.touches.length!==1||blockedTarget(event.target)){tracking=false;return}
    const touch=event.touches[0];startX=touch.clientX;startY=touch.clientY;startTime=Date.now();tracking=true;
  },{passive:true});

  document.addEventListener('touchend',event=>{
    if(!tracking||event.changedTouches.length!==1)return;tracking=false;
    const touch=event.changedTouches[0],dx=touch.clientX-startX,dy=touch.clientY-startY,duration=Date.now()-startTime;
    if(duration>MAX_DURATION||Math.abs(dx)<MIN_DISTANCE||Math.abs(dy)>MAX_VERTICAL_DRIFT||Math.abs(dx)<Math.abs(dy)*1.25)return;
    const list=tabs(),index=activeIndex(list);
    if(dx<0)openAt(index+1,1);else openAt(index-1,-1);
  },{passive:true});
})();
