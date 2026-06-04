import { DISTRICT_NAMES } from '../data/gameData.js';

export function getLevelNames(locIdx, lang){
  const k=locIdx===0?'kyiv':'lviv';
  return DISTRICT_NAMES[k][lang]||DISTRICT_NAMES[k].en;
}

// Генератор рівнів: 20 штук з прогресивною складністю
function makeLevels(locIdx){
  // палітри: Київ — сині/фіолетові, Львів — коричневі/жовті тони
  const palettes=locIdx===0?[
    ['#0d1b2a','#22304a','#1e3a5f','#162840','#1a3050'],
    ['#0e1c2c','#243550','#203e66','#1a2e46','#1e3458'],
    ['#100e2a','#201a44','#2e1a5f','#1e1040','#261450'],
    ['#0a1a1a','#1a3228','#1a4a35','#123020','#163828'],
    ['#120e00','#301a08','#4a2808','#301405','#3e2006'],
    ['#100010','#28082a','#380a52','#200038','#2e0646'],
    ['#0a1a10','#183024','#1e4830','#103818','#162e20'],
    ['#1a0a00','#3a1a0a','#5a2808','#3a1405','#4a2010'],
    ['#08101a','#142230','#1a3048','#10202e','#162840'],
    ['#160020','#280840','#3a0a58','#200040','#300650'],
    ['#001818','#0a2e2e','#104040','#0a2c2c','#0e3434'],
    ['#1a1000','#302005','#4a3008','#302000','#3e2808'],
    ['#060a20','#101838','#182448','#0e1830','#14203c'],
    ['#1a0808','#341010','#501818','#340c0c','#421010'],
    ['#001a08','#0a3018','#104824','#0a2e18','#0e3c1e'],
    ['#100818','#201030','#300e48','#200c30','#2a0e3e'],
    ['#181800','#2e2e00','#484800','#2e2c00','#3c3c00'],
    ['#001010','#0a2828','#103a3a','#0a2626','#0e3232'],
    ['#180008','#300010','#4a0018','#30000e','#3e0014'],
    ['#060618','#10102e','#181846','#0e0e2c','#14143a'],
  ]:[
    ['#1a1208','#2e2010','#4a3418','#362812','#421e0a'],
    ['#1e1408','#342212','#52381c','#3e2c14','#4a220c'],
    ['#1a1600','#2e2a00','#483e08','#362e00','#422c04'],
    ['#181210','#2c201e','#46342e','#342420','#40281a'],
    ['#1e1800','#342c00','#504200','#3c3000','#483800'],
    ['#181400','#2c2600','#463a08','#342c00','#403200'],
    ['#1a0e08','#301c10','#4e2e18','#382014','#442010'],
    ['#141210','#28241e','#40382e','#302a22','#3a2c1c'],
    ['#1e1600','#342a00','#503e08','#3c2e00','#483604'],
    ['#160e06','#2a1c0e','#422e18','#301e10','#3c1e0a'],
    ['#1a1200','#2e2200','#483408','#362600','#422800'],
    ['#181008','#2c1e10','#46301a','#342212','#401e0c'],
    ['#1c1400','#322400','#4e3800','#3a2c00','#463200'],
    ['#181212','#2e2020','#483232','#362626','#402424'],
    ['#1a1400','#302400','#4c3808','#382c00','#443000'],
    ['#160e00','#2a1c06','#422e10','#301e08','#3c1e06'],
    ['#1c1600','#322a00','#4e3e08','#3a2e00','#463800'],
    ['#181008','#2c1e0e','#462e18','#341e10','#401a08'],
    ['#1a1200','#302000','#4c3408','#382800','#443000'],
    ['#141208','#282010','#3e3018','#2e2412','#381e0c'],
  ];
  const kyivObs=[
    ['kiosk','bollard'],
    ['kiosk','bollard','cop'],
    ['kiosk','bollard','cop'],
    ['bollard','cop','kiosk'],
    ['cop','bollard','kiosk'],
    ['cop','cop','bollard'],
    ['cop','kiosk','bollard','cop'],
    ['cop','cop','bollard','kiosk'],
    ['cop','cop','cop','bollard'],
    ['cop','cop','kiosk','bollard','cop'],
    ['cop','cop','cop','bollard','kiosk'],
    ['cop','cop','cop','cop','bollard'],
    ['cop','cop','cop','kiosk','cop'],
    ['cop','cop','cop','cop','kiosk'],
    ['cop','cop','cop','cop','cop','bollard'],
    ['cop','cop','cop','cop','cop'],
    ['cop','cop','cop','cop','cop','kiosk'],
    ['cop','cop','cop','cop','cop','cop'],
    ['cop','cop','cop','cop','cop','cop','bollard'],
    ['cop','cop','cop','cop','cop','cop','cop'],
  ];
  const lvivObs=[
    ['kiosk','bollard'],
    ['kiosk','bollard','tck'],
    ['kiosk','bollard','tck'],
    ['bollard','tck','kiosk'],
    ['tck','bollard','kiosk'],
    ['tck','tck','bollard'],
    ['tck','kiosk','bollard','tck'],
    ['tck','tck','bollard','kiosk'],
    ['tck','tck','tck','bollard'],
    ['tck','tck','kiosk','bollard','tck'],
    ['tck','tck','tck','bollard','kiosk'],
    ['tck','tck','tck','tck','bollard'],
    ['tck','tck','tck','kiosk','tck'],
    ['tck','tck','tck','tck','kiosk'],
    ['tck','tck','tck','tck','tck','bollard'],
    ['tck','tck','tck','tck','tck'],
    ['tck','tck','tck','tck','tck','kiosk'],
    ['tck','tck','tck','tck','tck','tck'],
    ['tck','tck','tck','tck','tck','tck','bollard'],
    ['tck','tck','tck','tck','tck','tck','tck'],
  ];
  const obs=locIdx===0?kyivObs:lvivObs;
  return Array.from({length:20},(_,i)=>({
    n:i+1,
    loc:locIdx,
    dist:400+i*120,
    baseSpd:2.0+i*0.18,
    maxSpd:3.2+i*0.26,
    sky:palettes[i][0],road:palettes[i][1],
    bldA:palettes[i][2],bldB:palettes[i][3],bldC:palettes[i][4],
    bonusCoins:20+i*15,
    obsTypes:obs[i],
  }));
}

export const LEVELS_KYIV=makeLevels(0);
export const LEVELS_LVIV=makeLevels(1);
// ─────────────────────────────────────────────────────────────────────────────
