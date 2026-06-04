export function focusApp(){
  const app=document.getElementById('app');
  if(app)app.focus({preventScroll:true});
}

export function setActiveScreen(id){
  document.querySelectorAll('.screen').forEach(screen=>screen.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

export function setText(id,value){
  const element=document.getElementById(id);
  if(element)element.textContent=String(value);
}
