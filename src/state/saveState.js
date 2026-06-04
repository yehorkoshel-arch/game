const SAVE_KEY='kyivRunnerSave';

export function loadGameSave(){
  try{
    return JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
  }catch(e){
    return {};
  }
}

export function saveGameSave(save){
  localStorage.setItem(SAVE_KEY,JSON.stringify(save));
}
