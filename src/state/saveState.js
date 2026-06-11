const SAVE_KEY='kyivRunnerSave';

export function loadGameSave(){
  try{
    return JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
  }catch(e){
    return {};
  }
}

export function saveGameSave(save){
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify(save));
  }catch(e){
    console.warn('Game progress could not be saved',e);
  }
}
