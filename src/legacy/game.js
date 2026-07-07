import { LANGS, LOCATION_NAMES, SKINS_BASE } from "../data/gameData.js";
import {
  getLevelNames,
  LEVELS_KYIV,
  LEVELS_LVIV,
} from "../levels/levelFactory.js";
import { loadGameSave, saveGameSave } from "../state/saveState.js";
import { focusApp, setActiveScreen, setText } from "../ui/dom.js";
import {
  cancelSpeech,
  normalizeSpeechText,
  playRecordedVoice,
  playSystemVoice,
} from "../audio/tts.js";

function getLevels() {
  return currentLocation === 0 ? LEVELS_KYIV : LEVELS_LVIV;
}

function getPlayableLevel(level) {
  return Math.min(Math.max(Number(level) || 0, 0), getLevels().length - 1);
}

const FINISH_DIST = 800;
const save = loadGameSave();
const VALID_LANGUAGES = new Set(Object.keys(LANGS));
const VALID_SKIN_IDS = new Set(SKINS_BASE.map((skin) => skin.id));
const savedOwned = Array.isArray(save.owned)
  ? save.owned.filter((id) => VALID_SKIN_IDS.has(id))
  : [];
let lang = VALID_LANGUAGES.has(save.lang) ? save.lang : "uk",
  totalCoins = Math.max(0, Number(save.totalCoins) || 0),
  owned = [...new Set(["default", ...savedOwned])],
  selectedSkin =
    VALID_SKIN_IDS.has(save.selectedSkin) && owned.includes(save.selectedSkin)
      ? save.selectedSkin
      : "default";
let currentLocation = Number(save.currentLocation) === 1 ? 1 : 0;
let currentLevel = Math.min(
  Math.max(Number(save.currentLevel) || 0, 0),
  (currentLocation === 0 ? LEVELS_KYIV : LEVELS_LVIV).length - 1,
);
let progressKyiv = Math.min(
    Math.max(Number(save.progressKyiv) || 0, 0),
    LEVELS_KYIV.length,
  ),
  progressLviv = Math.min(
    Math.max(Number(save.progressLviv) || 0, 0),
    LEVELS_LVIV.length,
  );
let marichkaProjectSceneSeen = Boolean(save.marichkaProjectSceneSeen);
let tckSceneSeenLevels =
  save.tckSceneSeenLevels && typeof save.tckSceneSeenLevels === "object"
    ? save.tckSceneSeenLevels
    : {};
const QUEST_REWARD = 100;
const QUESTS = [
  { id: "distance", title: "Пробіжи 2 000 метрів", target: 2000, unit: "м" },
  { id: "coins", title: "Збери 100 монет", target: 100, unit: "₴" },
  { id: "jumps", title: "Зроби 50 стрибків", target: 50, unit: "" },
  { id: "slides", title: "Зроби 30 слайдів", target: 30, unit: "" },
  { id: "shots", title: "Зроби 75 пострілів", target: 75, unit: "" },
  { id: "enemies", title: "Переможи 25 ворогів", target: 25, unit: "" },
  { id: "levels", title: "Пройди 5 рівнів", target: 5, unit: "" },
  { id: "routes", title: "Пройди 3 секретні тунелі", target: 3, unit: "" },
  { id: "bosses", title: "Переможи боса", target: 1, unit: "" },
  { id: "finishes", title: "Дістанься фінішу 10 разів", target: 10, unit: "" },
];
const savedQuestStats = save.questStats || {};
let questStats = Object.fromEntries(
  QUESTS.map((quest) => [quest.id, Number(savedQuestStats[quest.id]) || 0]),
);
let questClaimed =
  save.questClaimed && typeof save.questClaimed === "object"
    ? save.questClaimed
    : {};
const ACHIEVEMENTS = [
  {
    id: "metro",
    title: "\u041f\u0430\u0441\u0430\u0436\u0438\u0440 \u043c\u0435\u0442\u0440\u043e",
    desc: "\u041f\u0440\u043e\u0439\u0434\u0438 \u0441\u0435\u043a\u0440\u0435\u0442\u043d\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043c\u0435\u0442\u0440\u043e",
    target: 1,
    icon: "M",
  },
  {
    id: "trick3",
    title: "\u041c\u0430\u0439\u0441\u0442\u0435\u0440 \u0442\u0440\u044e\u043a\u0456\u0432",
    desc: "\u0417\u0440\u043e\u0431\u0438 TRICK x3",
    target: 1,
    icon: "x3",
  },
  {
    id: "boss",
    title: "\u0411\u043e\u0441 \u043f\u0435\u0440\u0435\u043c\u043e\u0436\u0435\u043d\u0438\u0439",
    desc: "\u041f\u0435\u0440\u0435\u043c\u043e\u0436\u0438 \u043a\u0438\u0457\u0432\u0441\u044c\u043a\u043e\u0433\u043e \u0431\u043e\u0441\u0430",
    target: 1,
    icon: "B",
  },
  {
    id: "coins1000",
    title: "\u0421\u043a\u0430\u0440\u0431 \u0410\u043d\u0434\u0440\u0456\u044f",
    desc: "\u0417\u0431\u0435\u0440\u0438 1000 \u043c\u043e\u043d\u0435\u0442 \u0437\u0430 \u0432\u0441\u044e \u0433\u0440\u0443",
    target: 1000,
    icon: "\u20b4",
  },
];
const savedAchievementStats = save.achievementStats || {};
let achievementStats = Object.fromEntries(
  ACHIEVEMENTS.map((item) => [
    item.id,
    Math.max(0, Number(savedAchievementStats[item.id]) || 0),
  ]),
);
let achievementSeen =
  save.achievementSeen && typeof save.achievementSeen === "object"
    ? save.achievementSeen
    : {};
let settingDiff = ["easy", "normal", "hard"].includes(save.settingDiff)
    ? save.settingDiff
    : "normal",
  settingLives = [2, 3, 5].includes(Number(save.settingLives))
    ? Number(save.settingLives)
    : 3,
  settingDist = [400, 800, 1400].includes(Number(save.settingDist))
    ? Number(save.settingDist)
    : 800,
  settingSound =
    typeof save.settingSound === "boolean" ? save.settingSound : false,
  settingMusicTrack = ["kyiv", "march"].includes(save.settingMusicTrack)
    ? save.settingMusicTrack
    : "kyiv",
  settingTimeOfDay = ["auto", "morning", "day", "night"].includes(
    save.settingTimeOfDay,
  )
    ? save.settingTimeOfDay
    : "auto",
  settingRobotVoiceLang = VALID_LANGUAGES.has(save.settingRobotVoiceLang)
    ? save.settingRobotVoiceLang
    : "uk",
  settingVib = typeof save.settingVib === "boolean" ? save.settingVib : false;
let backpackSlots = Math.min(3, Math.max(2, Number(save.backpackSlots) || 2));
const savedBonusInventory =
  save.bonusInventory && typeof save.bonusInventory === "object"
    ? save.bonusInventory
    : {};
let bonusInventory = {
  magnet: Math.max(0, Number(savedBonusInventory.magnet) || 0),
  shield: Math.max(0, Number(savedBonusInventory.shield) || 0),
  jump: Math.max(0, Number(savedBonusInventory.jump) || 0),
};
const BACKPACK_BONUS_STORE = [
  { type: "magnet", price: 120, color: "#62d6ff" },
  { type: "shield", price: 150, color: "#58beff" },
  { type: "jump", price: 140, color: "#fff36a" },
];
const savedWeaponUpgrades =
  save.weaponUpgrades && typeof save.weaponUpgrades === "object"
    ? save.weaponUpgrades
    : {};
let weaponUpgrades = {
  fireRate: Boolean(savedWeaponUpgrades.fireRate),
  damage: Boolean(savedWeaponUpgrades.damage),
  laser: Boolean(savedWeaponUpgrades.laser),
};
const savedPlayerUpgrades =
  save.playerUpgrades && typeof save.playerUpgrades === "object"
    ? save.playerUpgrades
    : {};
let playerUpgrades = {
  speed: Math.min(3, Math.max(0, Number(savedPlayerUpgrades.speed) || 0)),
  jump: Math.min(3, Math.max(0, Number(savedPlayerUpgrades.jump) || 0)),
  weapon: Math.min(3, Math.max(0, Number(savedPlayerUpgrades.weapon) || 0)),
  defense: Math.min(3, Math.max(0, Number(savedPlayerUpgrades.defense) || 0)),
};
const PLAYER_UPGRADES = [
  {
    id: "speed",
    icon: ">>",
    name: "\u0428\u0432\u0438\u0434\u043a\u0456 \u043d\u043e\u0433\u0438",
    desc: "\u0410\u043d\u0434\u0440\u0456\u0439 \u0431\u0456\u0436\u0438\u0442\u044c \u0442\u0440\u043e\u0445\u0438 \u0448\u0432\u0438\u0434\u0448\u0435 \u043d\u0430 \u043a\u043e\u0436\u043d\u043e\u043c\u0443 \u0440\u0456\u0432\u043d\u0456",
    prices: [180, 360, 620],
  },
  {
    id: "jump",
    icon: "^",
    name: "\u0412\u0438\u0449\u0438\u0439 \u0441\u0442\u0440\u0438\u0431\u043e\u043a",
    desc: "\u041b\u0435\u0433\u0448\u0435 \u043f\u0435\u0440\u0435\u0441\u0442\u0440\u0438\u0431\u0443\u0432\u0430\u0442\u0438 \u044f\u043c\u0438, \u0441\u043a\u0443\u0442\u0435\u0440\u0438 \u0456 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438",
    prices: [160, 340, 580],
  },
  {
    id: "weapon",
    icon: "x2",
    name: "\u041c\u0430\u0439\u0441\u0442\u0435\u0440 \u0437\u0431\u0440\u043e\u0457",
    desc: "\u041a\u0443\u043b\u0456 \u043b\u0435\u0442\u044f\u0442\u044c \u0448\u0432\u0438\u0434\u0448\u0435, \u0430 \u0431\u043e\u0441\u0438 \u043e\u0442\u0440\u0438\u043c\u0443\u044e\u0442\u044c \u0431\u0456\u043b\u044c\u0448\u0435 \u0443\u0440\u043e\u043d\u0443",
    prices: [220, 460, 760],
  },
  {
    id: "defense",
    icon: "[]",
    name: "\u0417\u0430\u0445\u0438\u0441\u0442",
    desc: "\u041d\u0430 \u0441\u0442\u0430\u0440\u0442\u0456 \u0440\u0456\u0432\u043d\u044f \u0410\u043d\u0434\u0440\u0456\u0439 \u043c\u0430\u0454 \u0437\u0430\u0440\u044f\u0434\u0438 \u0449\u0438\u0442\u0430",
    prices: [200, 430, 720],
  },
];
const WEAPON_UPGRADES = [
  {
    id: "fireRate",
    name: "\u0428\u0432\u0438\u0434\u043a\u0438\u0439 \u043c\u0456\u043d\u0456\u0433\u0430\u043d",
    desc: "\u041c\u0435\u043d\u0448\u0430 \u0437\u0430\u0442\u0440\u0438\u043c\u043a\u0430 \u043c\u0456\u0436 \u0447\u0435\u0440\u0433\u0430\u043c\u0438",
    price: 450,
  },
  {
    id: "damage",
    name: "\u041f\u043e\u0442\u0443\u0436\u043d\u0456 \u043a\u0443\u043b\u0456",
    desc: "\u0411\u0456\u043b\u044c\u0448\u0435 \u0443\u0440\u043e\u043d\u0443 \u043f\u043e \u0431\u043e\u0441\u0430\u0445",
    price: 650,
  },
  {
    id: "laser",
    name: "\u041b\u0430\u0437\u0435\u0440\u043d\u0438\u0439 \u0431\u043b\u0430\u0441\u0442\u0435\u0440",
    desc: "\u0414\u043e\u0434\u0430\u0454 \u043b\u0430\u0437\u0435\u0440\u043d\u0438\u0439 \u043f\u043e\u0441\u0442\u0440\u0456\u043b",
    price: 900,
  },
];
function getPlayerUpgradeLevel(id) {
  return Math.min(3, Math.max(0, Number(playerUpgrades[id]) || 0));
}
function getSpeedUpgradeMult() {
  return 1 + getPlayerUpgradeLevel("speed") * 0.04;
}
function getJumpPower() {
  if (superJumpTimer > 0) return -22 - getPlayerUpgradeLevel("jump") * 0.5;
  return -16 - getPlayerUpgradeLevel("jump") * 1.1;
}
function getWeaponMasteryLevel() {
  return getPlayerUpgradeLevel("weapon");
}
function getWeaponCooldown(base, fastBase) {
  const upgradedBase = weaponUpgrades.fireRate ? fastBase : base;
  return Math.max(5, upgradedBase - getWeaponMasteryLevel());
}
function getBulletSpeedBonus() {
  return getWeaponMasteryLevel() * 0.8;
}
function getBulletDamage(type) {
  const mastery = getWeaponMasteryLevel();
  if (type === "bossblaster") return (weaponUpgrades.damage ? 3 : 2) + mastery;
  if (type === "laser") return 2 + mastery;
  return (weaponUpgrades.damage ? 2 : 1) + mastery;
}
function getStartingShieldCharges() {
  const defense = getPlayerUpgradeLevel("defense");
  if (defense >= 3) return 2;
  if (defense >= 2) return 1;
  return 0;
}
function getMaxShieldCharges() {
  return getPlayerUpgradeLevel("defense") >= 3 ? 2 : 1;
}
function getDamageInvulnerabilityTime() {
  return 75 + getPlayerUpgradeLevel("defense") * 12;
}
function saveGame() {
  saveGameSave({
    lang,
    totalCoins,
    owned,
    selectedSkin,
    settingDiff,
    settingLives,
    settingDist,
    settingSound,
    settingMusicTrack,
    settingTimeOfDay,
    settingRobotVoiceLang,
    settingVib,
    currentLevel,
    currentLocation,
    progressKyiv,
    progressLviv,
    marichkaProjectSceneSeen,
    tckSceneSeenLevels,
    questStats,
    questClaimed,
    achievementStats,
    achievementSeen,
    weaponUpgrades,
    playerUpgrades,
    backpackSlots,
    bonusInventory,
  });
}

// ── MUSIC ENGINE ─────────────────────────────────────────────────────────────
// Melody: "Як тебе не любити, Києве мій" (Як тебе не любити)
// Notes encoded as [semitones from C4, duration in beats]
const MELODY_NOTES = [
  // Phrase 1: Як тебе не лю-би-ти
  [0, 1],
  [2, 1],
  [4, 1],
  [5, 1],
  [7, 2],
  [5, 1],
  [4, 1],
  // Phrase 2: Ки-є-ве мій
  [2, 1],
  [0, 1],
  [2, 1],
  [4, 2],
  [0, 2],
  // Phrase 3: Як тебе не лю-би-ти
  [0, 1],
  [2, 1],
  [4, 1],
  [5, 1],
  [7, 2],
  [9, 1],
  [7, 1],
  // Phrase 4: Віч-ний мій
  [5, 1],
  [4, 1],
  [2, 1],
  [0, 3],
  [0, 1],
  // Phrase 5: Мі-сто кві-ту й ка-ли-ни
  [4, 1],
  [4, 1],
  [5, 1],
  [7, 1],
  [9, 1],
  [7, 1],
  [5, 1],
  [4, 1],
  // Phrase 6: Бать-ків-ський по-ріг
  [2, 1],
  [2, 1],
  [4, 1],
  [5, 1],
  [7, 2],
  [5, 1],
  // Phrase 7: Ук-ра-ї-но-ро-ди-но
  [7, 1],
  [9, 1],
  [7, 1],
  [5, 1],
  [4, 1],
  [2, 1],
  [0, 1],
  [2, 1],
  // Phrase 8: Ки-їв — мій при-віт
  [4, 1],
  [5, 1],
  [7, 1],
  [9, 1],
  [7, 4],
];
const MARCH_NOTES = [
  [0, 1], [0, 1], [3, 1], [5, 1],
  [7, 2], [5, 1], [3, 1],
  [0, 1], [3, 1], [5, 1], [7, 1],
  [10, 2], [7, 2],
  [8, 1], [8, 1], [7, 1], [5, 1],
  [3, 2], [5, 1], [7, 1],
  [5, 1], [3, 1], [0, 1], [-2, 1],
  [0, 4],
];
const MUSIC_TRACKS = [MELODY_NOTES, MARCH_NOTES];
const MARCH_LYRICS_BY_LANG = {
  uk: [
    "Шалійте, шалійте, скажені кати!",
    "Годуйте шпіонів, будуйте тюрми!",
    "До бою сто тисяч поборників стане,",
    "Пірвем, пірвем, пірвем ті кайдани!",
    "За правду, за волю ми станемо враз,",
    "Ланці, ні багнети не пострах для нас!",
    "Бо вольного духа не скути в кайдани.",
    "Біда, біда, біда вам, тирани!",
    "Робітники духа! Робітникам всім",
    "Ми руки подаймо, на бій їх ведім!",
    "Бо спільна усіх нас злучила недоля:",
    "І труд, і піт, і кров, — кнут, неволя!",
    "Від краю до краю не громи гудуть —",
    "Українські полки на ворога йдуть,",
    "І поклик рокоче: «Вставайте, народи!",
    "Прийшла пора, пора — день свободи!»",
    "Підвалини світу валяться старі,",
    "Поблідли деспоти, дрожать опирі,",
    "Бо зоря свободи вже сходить яскрава!",
    "Для всіх, для всіх, для всіх рівні права!",
    "І вольні народи, як добрі брати,",
    "Полинуть до сонця, до щастя мети,",
    "Розкуєсь, двигнеться і наша родина:",
    "Одна, сильна, вільна Україна!",
  ],
  en: [
    "Rage on, rage on, you frenzied executioners!",
    "Feed your spies and build your prisons!",
    "A hundred thousand defenders will rise for battle,",
    "We shall break, break, break those chains!",
    "For truth and freedom we shall rise as one,",
    "Neither chains nor bayonets can frighten us!",
    "For a free spirit cannot be bound in chains.",
    "Woe, woe, woe to you, tyrants!",
    "Workers of the spirit! To all working people",
    "Let us give our hands and lead them into battle!",
    "For one shared hardship has united us all:",
    "Labor, sweat and blood — the whip and bondage!",
    "From end to end, it is not thunder that roars —",
    "Ukrainian regiments are marching on the foe,",
    "And the call resounds: “Rise up, nations!",
    "The time has come — the day of freedom!”",
    "The old foundations of the world are falling,",
    "The despots pale and the oppressors tremble,",
    "For freedom's dawn is already shining bright!",
    "Equal rights for all, for all, for all!",
    "And free nations, like faithful brothers,",
    "Will soar toward the sun and the goal of happiness,",
    "Our own family will break free and rise:",
    "One strong and free Ukraine!",
  ],
  de: [
    "Rast nur, rast nur, ihr rasenden Henker!",
    "Füttert die Spione und baut eure Kerker!",
    "Hunderttausend Streiter erheben sich zum Kampf,",
    "Wir brechen, brechen, brechen diese Ketten!",
    "Für Wahrheit und Freiheit stehen wir vereint,",
    "Weder Ketten noch Bajonette schrecken uns!",
    "Denn einen freien Geist kann man nicht fesseln.",
    "Wehe, wehe, wehe euch, Tyrannen!",
    "Arbeiter des Geistes! Allen Werktätigen",
    "Reichen wir die Hände und führen sie zum Kampf!",
    "Denn gemeinsames Leid hat uns alle vereint:",
    "Arbeit, Schweiß und Blut — Peitsche und Knechtschaft!",
    "Von Land zu Land ist es kein Donner, der dröhnt —",
    "Ukrainische Regimenter ziehen gegen den Feind,",
    "Und der Ruf erschallt: „Erhebt euch, Völker!",
    "Die Zeit ist gekommen — der Tag der Freiheit!“",
    "Die alten Fundamente der Welt stürzen ein,",
    "Despoten erbleichen, Unterdrücker erbeben,",
    "Denn hell steigt schon der Morgen der Freiheit auf!",
    "Gleiche Rechte für alle, für alle, für alle!",
    "Und freie Völker, wie gute Brüder,",
    "Streben zur Sonne, zum Ziel des Glücks,",
    "Auch unsere Familie befreit sich und erhebt sich:",
    "Eine starke und freie Ukraine!",
  ],
  fr: [
    "Déchaînez-vous, bourreaux enragés !",
    "Nourrissez vos espions, bâtissez vos prisons !",
    "Cent mille défenseurs se lèveront pour combattre,",
    "Nous briserons, briserons, briserons ces chaînes !",
    "Pour la vérité, pour la liberté, levons-nous unis,",
    "Ni les chaînes ni les baïonnettes ne nous font peur !",
    "Car nul ne peut enchaîner un esprit libre.",
    "Malheur, malheur, malheur à vous, tyrans !",
    "Travailleurs de l'esprit ! À tous les travailleurs",
    "Tendons les mains et menons-les au combat !",
    "Car un malheur commun nous a tous unis :",
    "Travail, sueur et sang — fouet et servitude !",
    "D'un bout à l'autre, ce n'est pas le tonnerre qui gronde —",
    "Les régiments ukrainiens marchent contre l'ennemi,",
    "Et l'appel retentit : « Levez-vous, peuples !",
    "L'heure est venue — voici le jour de la liberté ! »",
    "Les vieux fondements du monde s'effondrent,",
    "Les despotes pâlissent, les oppresseurs tremblent,",
    "Car l'aube de la liberté brille déjà !",
    "Les mêmes droits pour tous, pour tous, pour tous !",
    "Et les peuples libres, tels de bons frères,",
    "S'élanceront vers le soleil, vers le bonheur,",
    "Notre famille aussi brisera ses chaînes et se lèvera :",
    "Une Ukraine unie, forte et libre !",
  ],
  es: [
    "¡Enloquezcan, enloquezcan, verdugos furiosos!",
    "¡Alimenten a sus espías, construyan sus prisiones!",
    "Cien mil defensores se alzarán para luchar,",
    "¡Romperemos, romperemos, romperemos esas cadenas!",
    "Por la verdad y la libertad nos alzaremos unidos,",
    "¡Ni cadenas ni bayonetas nos dan miedo!",
    "Porque un espíritu libre no puede ser encadenado.",
    "¡Ay, ay, ay de ustedes, tiranos!",
    "¡Trabajadores del espíritu! A todos los trabajadores",
    "Tendamos las manos y llevémoslos a la lucha.",
    "Porque una desgracia común nos ha unido:",
    "Trabajo, sudor y sangre — látigo y esclavitud.",
    "De un extremo al otro no es el trueno el que retumba —",
    "Los regimientos ucranianos marchan contra el enemigo,",
    "Y el llamado resuena: «¡Levántense, pueblos!",
    "Ha llegado la hora — el día de la libertad!»",
    "Los viejos cimientos del mundo se derrumban,",
    "Los déspotas palidecen, los opresores tiemblan,",
    "¡Porque el alba de la libertad ya brilla!",
    "¡Iguales derechos para todos, para todos, para todos!",
    "Y los pueblos libres, como buenos hermanos,",
    "Volarán hacia el sol y la meta de la felicidad,",
    "Nuestra familia romperá sus cadenas y se alzará:",
    "¡Una Ucrania unida, fuerte y libre!",
  ],
};
function getMarchLyrics() {
  return MARCH_LYRICS_BY_LANG[lang] || MARCH_LYRICS_BY_LANG.uk;
}
// Bass/chord root notes (one per bar roughly): simple alternating I-V
const BASS_PATTERN = [0, 7, 0, 5, 0, 7, 0, 5, 0, 4, 0, 5, 0, 7, 0, 5];

let audioCtx = null,
  musicPlaying = false;
let musicNodes = []; // keep refs to stop them
let melodyIdx = 0,
  bassIdx = 0,
  musicTrackIdx = 0;
let nextNoteTime = 0,
  scheduleAhead = 0.08,
  schedulerTimer = null;
const CHORD_PATTERN = [0, 5, 7, 4, 0, 9, 5, 7];
let drumStep = 0,
  chordIdx = 0;
const BPM = 126;
const BEAT = 60 / BPM;

// Lyric display
let lyricIdx = 0,
  lyricTimer = null;
let marchVocalAudio = null;
const LYRIC_DIV = (() => {
  const d = document.createElement("div");
  d.id = "lyricBanner";
  d.style.cssText =
    "position:absolute;bottom:50px;left:0;right:0;text-align:center;pointer-events:none;font-size:15px;color:#ffd700;text-shadow:0 1px 6px #000,0 0 20px rgba(255,215,0,0.4);opacity:0;transition:opacity 0.5s;font-style:italic;letter-spacing:0.5px;padding:0 20px";
  document.getElementById("app").appendChild(d);
  return d;
})();

function noteToHz(semitone) {
  // C4 = 261.63 Hz, semitone offset from C4
  return 261.63 * Math.pow(2, semitone / 12);
}

function playNote(
  freq,
  startTime,
  duration,
  type = "sine",
  gain = 0.18,
  detune = 0,
) {
  if (!audioCtx) return null;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (detune) osc.detune.setValueAtTime(detune, startTime);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
  gainNode.gain.setValueAtTime(gain, startTime + duration * 0.75);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.01);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
  musicNodes.push(osc);
  return osc;
}
function playNoise(
  startTime,
  duration,
  gain = 0.08,
  filterFreq = 900,
  type = "bandpass",
) {
  if (!audioCtx) return;
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = audioCtx.createBufferSource(),
    g = audioCtx.createGain(),
    f = audioCtx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = 1.2;
  g.gain.setValueAtTime(gain, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.connect(f);
  f.connect(g);
  g.connect(audioCtx.destination);
  src.start(startTime);
  src.stop(startTime + duration);
  musicNodes.push(src);
}
function scheduleDrums(barStart, beatDuration = BEAT, intense = false) {
  const stepDur = beatDuration / 2;
  for (let s = 0; s < 4; s++) {
    const t = barStart + s * stepDur;
    if ((drumStep + s) % 4 === 0) {
      playNote(intense ? 62 : 55, t, 0.12, "sine", intense ? 0.22 : 0.16);
      playNoise(t, 0.08, intense ? 0.075 : 0.05, 150, "lowpass");
    }
    if ((drumStep + s) % 4 === 2)
      playNoise(t, 0.1, intense ? 0.11 : 0.07, 420, "bandpass");
    playNoise(t, 0.035, intense ? 0.055 : s % 2 ? 0.025 : 0.04, 5200, "highpass");
    if (intense && s % 2 === 1) {
      playNoise(t + stepDur * 0.5, 0.025, 0.035, 6800, "highpass");
    }
  }
  drumStep = (drumStep + 4) % 16;
}
function scheduleChord(root, startTime, dur) {
  const third = musicTrackIdx === 1 ? 3 : 4;
  const notes = [root, root + third, root + 7, root + 12];
  notes.forEach((semi, i) => {
    const t = startTime + i * (dur / 5);
    playNote(noteToHz(semi), t, dur * 0.55, "sawtooth", 0.035, -8 + i * 5);
  });
  playNote(noteToHz(root + 7), startTime, dur, "triangle", 0.035, 6);
}

function scheduleMusic() {
  if (!musicPlaying || !audioCtx) return;
  while (nextNoteTime < audioCtx.currentTime + scheduleAhead) {
    const melody = MUSIC_TRACKS[musicTrackIdx];
    const isMarch = musicTrackIdx === 1;
    const [semi, beats] = melody[melodyIdx % melody.length];
    const trackBeat = BEAT * (isMarch ? 0.76 : 1);
    const dur = beats * trackBeat;
    const freq = noteToHz(semi);
    const accent = melodyIdx % 4 === 0 ? (isMarch ? 1.35 : 1.15) : 1;
    playNote(
      freq,
      nextNoteTime,
      dur * (isMarch ? 0.78 : 0.94),
      isMarch ? "sawtooth" : "triangle",
      (isMarch ? 0.16 : 0.18) * accent,
    );
    playNote(
      noteToHz(semi + 12),
      nextNoteTime + dur * 0.04,
      dur * (isMarch ? 0.28 : 0.45),
      isMarch ? "square" : "sine",
      isMarch ? 0.055 : 0.035,
    );
    playNote(
      noteToHz(semi + (isMarch ? 3 : 4)),
      nextNoteTime,
      dur * (isMarch ? 0.58 : 0.8),
      "sine",
      isMarch ? 0.07 : 0.055,
    );

    if (melodyIdx % 2 === 0) {
      const bassSemi = BASS_PATTERN[bassIdx % BASS_PATTERN.length] - 12;
      playNote(
        noteToHz(bassSemi),
        nextNoteTime,
        dur * (isMarch ? 1.1 : 1.65),
        isMarch ? "square" : "triangle",
        isMarch ? 0.18 : 0.13,
      );
      playNote(
        noteToHz(bassSemi + 12),
        nextNoteTime + dur * 0.48,
        dur * 0.35,
        "square",
        isMarch ? 0.06 : 0.035,
      );
      bassIdx++;
    }
    if (melodyIdx % 4 === 0) {
      const root = CHORD_PATTERN[chordIdx % CHORD_PATTERN.length];
      scheduleChord(root, nextNoteTime, dur * (isMarch ? 1.55 : 2.2));
      scheduleDrums(nextNoteTime, trackBeat, isMarch);
      chordIdx++;
    }

    nextNoteTime += dur;
    melodyIdx++;
    // Loop
    if (melodyIdx >= melody.length) {
      melodyIdx = 0;
      musicTrackIdx = settingMusicTrack === "march" ? 1 : 0;
      lyricIdx = 0;
    }
  }
  schedulerTimer = setTimeout(scheduleMusic, 25);
}

// Запуск музичного супроводу
function startMusic() {
  if (musicPlaying) return;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  musicPlaying = true;
  melodyIdx = 0;
  bassIdx = 0;
  musicTrackIdx = settingMusicTrack === "march" ? 1 : 0;
  drumStep = 0;
  chordIdx = 0;
  nextNoteTime = audioCtx.currentTime + 0.1;
  scheduleMusic();
  startLyrics();
}

function stopMusic() {
  musicPlaying = false;
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  musicNodes.forEach((n) => {
    try {
      n.stop();
    } catch (e) {}
  });
  musicNodes = [];
  stopLyrics();
}

function startLyrics() {
  lyricIdx = 0;
  showLyric();
}
function stopLyrics() {
  if (lyricTimer) {
    clearTimeout(lyricTimer);
    lyricTimer = null;
  }
  if (marchVocalAudio) {
    marchVocalAudio.pause();
    marchVocalAudio.currentTime = 0;
    marchVocalAudio = null;
  }
  LYRIC_DIV.style.opacity = "0";
}
function playMarchVocal(index) {
  if (!musicPlaying || musicTrackIdx !== 1) return;
  if (marchVocalAudio) {
    marchVocalAudio.pause();
    marchVocalAudio = null;
  }
  const vocalId = String((index % MARCH_LYRICS_BY_LANG.uk.length) + 1).padStart(2, "0");
  marchVocalAudio = new Audio(`/game/audio/voice/march_vocal_${vocalId}.mp3`);
  marchVocalAudio.volume = 0.82;
  marchVocalAudio.playbackRate = 1.06;
  marchVocalAudio.onerror = () => {
    marchVocalAudio = null;
  };
  marchVocalAudio.onended = () => {
    marchVocalAudio = null;
  };
  marchVocalAudio.play().catch(() => {
    marchVocalAudio = null;
  });

  if (audioCtx) {
    const now = audioCtx.currentTime;
    const root = index % 2 === 0 ? 0 : -2;
    playNote(noteToHz(root), now, 1.8, "triangle", 0.045);
    playNote(noteToHz(root + 7), now, 1.8, "sine", 0.03);
  }
}
function showLyric() {
  if (!musicPlaying) return;
  const lines = musicTrackIdx === 1 ? getMarchLyrics() : t().lyrics || [];
  if (!lines.length) return;
  const line = lines[lyricIdx % lines.length];
  LYRIC_DIV.textContent = line;
  LYRIC_DIV.style.opacity = "1";
  if (musicTrackIdx === 1) playMarchVocal(lyricIdx);
  const displayDuration = musicTrackIdx === 1 ? 4200 : 2600;
  lyricTimer = setTimeout(() => {
    LYRIC_DIV.style.opacity = "0";
    lyricIdx++;
    lyricTimer = setTimeout(showLyric, 600);
  }, displayDuration);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── SOUND EFFECTS ────────────────────────────────────────────────────────────
function getSfxCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function sfxJump() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator(),
    g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.13);
  g.gain.setValueAtTime(0.22, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}
function sfxLand() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.07), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * 0.6;
  const src = c.createBufferSource(),
    g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 380;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.38, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  src.start(now);
}
function sfxStep(dir) {
  // dir: -1=ліво, 1=право
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator(),
    g = c.createGain();
  osc.type = "sine";
  // ліво — низхідний, право — висхідний
  const f1 = dir < 0 ? 320 : 220,
    f2 = dir < 0 ? 180 : 380;
  osc.frequency.setValueAtTime(f1, now);
  osc.frequency.exponentialRampToValueAtTime(f2, now + 0.08);
  g.gain.setValueAtTime(0.14, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.1);
  // короткий шелест (слайд по доріжці)
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2) * 0.3;
  const src = c.createBufferSource(),
    g2 = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 600;
  filt.Q.value = 1;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g2);
  g2.connect(c.destination);
  g2.gain.setValueAtTime(0.12, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  src.start(now);
}
function sfxShot() {
  // звук пострілу ТЦК
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  // хлопок
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 0.8) * 0.9;
  const src = c.createBufferSource(),
    g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 900;
  filt.Q.value = 0.5;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.6, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  src.start(now);
  // свист кулі
  const osc = c.createOscillator(),
    g2 = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1800, now + 0.03);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);
  g2.gain.setValueAtTime(0.08, now + 0.03);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(g2);
  g2.connect(c.destination);
  osc.start(now + 0.03);
  osc.stop(now + 0.18);
}
function sfxMachineGunBurst() {
  [0, 0.055, 0.11].forEach((delay) => setTimeout(sfxShot, delay * 1000));
}
function sfxBossDanceSummon() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const hijaz = [0, 1, 4, 5, 7, 8, 11, 8, 7, 5];
  hijaz.forEach((step, index) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = index % 2 === 0 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(220 * Math.pow(2, step / 12), now + index * 0.11);
    gain.gain.setValueAtTime(0.07, now + index * 0.11);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.11 + 0.18);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + index * 0.11);
    osc.stop(now + index * 0.11 + 0.2);
  });
}
function sfxCoin() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  [0, 0.08].forEach((delay, i) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(i === 0 ? 900 : 1350, now + delay);
    g.gain.setValueAtTime(0.16, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.14);
  });
}
function sfxHit() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.2), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.4) * 0.8;
  const src = c.createBufferSource(),
    g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 200;
  filt.Q.value = 0.8;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.55, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  src.start(now);
}
function sfxRainLayer() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const duration = 0.55;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const fade = Math.sin((i / d.length) * Math.PI);
    d[i] = (Math.random() * 2 - 1) * fade * 0.16;
  }
  const src = c.createBufferSource();
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = 2400;
  filt.Q.value = 0.7;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.08, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  src.start(now);
}
function sfxThunder() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  const duration = 1.4;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length;
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4) * 0.75;
  }
  const src = c.createBufferSource();
  const g = c.createGain();
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 180;
  src.buffer = buf;
  src.connect(filt);
  filt.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0.42, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + duration);
  src.start(now);
}
function sfxWin() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  // Урочистий фанфар: C-E-G-C-E (висхідний)
  const fanfare = [
    [523, 0],
    [659, 0.15],
    [784, 0.3],
    [1047, 0.48],
    [1319, 0.68],
  ];
  fanfare.forEach(([freq, delay]) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + delay);
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(0.22, now + delay + 0.04);
    g.gain.setValueAtTime(0.22, now + delay + 0.18);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.38);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.4);
  });
  // Тремтячий акорд в кінці
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + 1.0);
    g.gain.setValueAtTime(0.12, now + 1.0);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(now + 1.0);
    osc.stop(now + 1.8);
  });
}

function sfxGameOver() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  // Низхідний сумний акорд: G-Eb-C (мінор вниз)
  const sad = [
    [392, 0],
    [311, 0.22],
    [261, 0.46],
  ];
  sad.forEach(([freq, delay]) => {
    const osc = c.createOscillator(),
      g = c.createGain();
    osc.type = "sawtooth";
    const filt = c.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 800;
    osc.frequency.setValueAtTime(freq, now + delay);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + delay + 0.35);
    g.gain.setValueAtTime(0.18, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.55);
    osc.connect(filt);
    filt.connect(g);
    g.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.6);
  });
  // Фінальний низький гул
  const osc2 = c.createOscillator(),
    g2 = c.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(130, now + 0.9);
  osc2.frequency.exponentialRampToValueAtTime(80, now + 1.4);
  g2.gain.setValueAtTime(0.2, now + 0.9);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  osc2.connect(g2);
  g2.connect(c.destination);
  osc2.start(now + 0.9);
  osc2.stop(now + 1.4);
}
// ─────────────────────────────────────────────────────────────────────────────

let gameState = "idle",
  score = 0,
  runCoins = 0,
  lives = 3,
  spd = 2.8,
  fr = 0,
  totalDist = 0,
  coinCombo = 0,
  coinComboTimer = 0,
  coinComboMult = 1,
  trickJumpTimer = 0,
  trickSlideTimer = 0,
  trickComboTimer = 0,
  trickComboMult = 1,
  trickComboStreak = 0;
let pLane = 1,
  pY = 270,
  pVY = 0,
  pSlide = false,
  slideT = 0,
  puddleSlow = 0,
  magnetTimer = 0,
  chestnutTimer = 0,
  superJumpTimer = 0,
  shieldCharges = 0,
  bonusBackpack = [],
  inv = 0,
  flash = 0;
let obs = [],
  coins = [],
  magnets = [],
  chestnuts = [],
  shields = [],
  superJumps = [],
  cityGifts = [],
  parts = [],
  confetti = [],
  bullets = [],
  playerBullets = [];
let bgOff = 0,
  chaserX = -100,
  raf = null;
let loopActive = false;
let fireCooldown = 0;
let lightningFlash = 0,
  nextLightning = 240;
let startVoiceTimer = null;
let bossActive = false,
  bossDefeated = false,
  bossTransform = 0,
  bossHp = 0,
  bossX = 760,
  bossShotCooldown = 0,
  bossSummonCooldown = 0,
  bossSpecialCooldown = 0,
  bossFlash = 0;
let secretRoute = null;
const BOSS_MAX_HP = 18;
const SECRET_ROUTE_DURATION = 520;
const SECRET_ROUTE_REWARD = 30;
const LEVEL_CLEAR_INPUT_DELAY = 150;
const LEVEL_CLEAR_AUTO_DELAY = 360;
const LEVEL_START_SPEED_CAP = 2.54;
const FINISH_APPROACH_DISTANCE = 10;
let finishX = 9999,
  finishActive = false,
  schoolEnterTimer = 0,
  schoolDialogueStep = 0,
  schoolDialogueDone = false,
  schoolExitTimer = 0,
  winTimer = 0,
  levelClearTimer = 0;
let tckScene = null;
const W = 680,
  H = 420,
  GND = 270,
  ROAD_RUN_Y = GND + 18,
  LANES = [150, 340, 530];

function getAndriiWeapon(level = currentLevel, location = currentLocation) {
  const levelIndex = Number(level);
  const locationIndex = Number(location);
  if (
    locationIndex === 0 &&
    levelIndex === LEVELS_KYIV.length - 1 &&
    !bossDefeated
  )
    return "bossblaster";
  if (locationIndex !== 1) return null;
  if (levelIndex >= 2) return "minigun";
  return "machinegun";
}

function getFinishDistance() {
  return Number(settingDist) || FINISH_DIST;
}

const SECRET_ROUTE_TYPES = [
  {
    id: "metro",
    name: "\u041c\u0435\u0442\u0440\u043e",
    hint: "\u0421\u0435\u043a\u0440\u0435\u0442\u043d\u0438\u0439 \u0432\u0445\u0456\u0434 \u0443 \u043c\u0435\u0442\u0440\u043e",
    lane: 0,
    color: "#2f9b68",
    shortcut: 180,
  },
  {
    id: "roofs",
    name: "\u0414\u0430\u0445\u0438",
    hint: "\u041f\u043e\u0436\u0435\u0436\u043d\u0430 \u0434\u0440\u0430\u0431\u0438\u043d\u0430 \u043d\u0430 \u0434\u0430\u0445\u0438",
    lane: 2,
    color: "#e68a3a",
  },
  {
    id: "underpass",
    name: "\u041f\u0456\u0434\u0437\u0435\u043c\u043d\u0438\u0439 \u043f\u0435\u0440\u0435\u0445\u0456\u0434",
    hint: "\u0422\u0430\u0454\u043c\u043d\u0438\u0439 \u043f\u0456\u0434\u0437\u0435\u043c\u043d\u0438\u0439 \u043f\u0435\u0440\u0435\u0445\u0456\u0434",
    lane: 1,
    color: "#8d72d9",
  },
];

function createSecretRoute() {
  const availableTypes =
    currentLocation === 0
      ? SECRET_ROUTE_TYPES.filter((route) => route.id === "metro")
      : SECRET_ROUTE_TYPES.filter((route) => route.id !== "metro");
  const type = availableTypes[currentLevel % availableTypes.length];
  return {
    ...type,
    offered: false,
    active: false,
    entering: false,
    completed: false,
    missed: false,
    entranceX: W + 100,
    timer: 0,
    transitionTimer: 0,
    resumeSpeed: 0,
    attempts: 0,
    nextOfferPct: 0.18,
  };
}

function tryEnterSecretRoute() {
  if (
    !secretRoute ||
    !secretRoute.offered ||
    secretRoute.active ||
    secretRoute.completed ||
    secretRoute.missed ||
    pLane !== secretRoute.lane ||
    Math.abs(secretRoute.entranceX - LANES[pLane]) > 72
  )
    return false;

  secretRoute.active = true;
  secretRoute.entering = true;
  secretRoute.timer = 0;
  secretRoute.transitionTimer = 0;
  secretRoute.resumeSpeed = Math.max(spd, 0.1);
  secretRoute.entranceX = LANES[pLane];
  obs = [];
  bullets = [];
  coins = [];
  chaserX = -220;
  return true;
}

function completeSecretRoute() {
  if (!secretRoute || !secretRoute.active) return;
  secretRoute.active = false;
  secretRoute.completed = true;
  spd = Math.max(secretRoute.resumeSpeed || 0, 0.1);
  if (secretRoute.shortcut) {
    totalDist = Math.min(
      totalDist + secretRoute.shortcut,
      Math.max(0, getFinishDistance() - FINISH_APPROACH_DISTANCE - 60),
    );
  }
  addQuestProgress("routes");
  if (secretRoute.id === "metro") addAchievementProgress("metro");
  runCoins += SECRET_ROUTE_REWARD;
  addParts(LANES[pLane], pY - 35, secretRoute.color);
  sfxCoin();
  showAndriiBubble(
    `\u041c\u0430\u0440\u0448\u0440\u0443\u0442 \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043e! +${SECRET_ROUTE_REWARD} \u043c\u043e\u043d\u0435\u0442`,
  );
  syncCoins();
  saveGame();
  hudUp();
}

function t() {
  return LANGS[lang];
}
function updateFireControl() {
  const weapon = getAndriiWeapon(currentLevel, currentLocation);
  const fireButton = document.getElementById("cFire");
  fireButton.textContent =
    weapon === "minigun"
      ? "Мініган"
      : weapon === "bossblaster"
        ? "Бластер"
        : weapon
          ? "Вогонь"
          : t().menu;
  fireButton.style.display = weapon ? "" : "none";
}
const ROBOT_VOICE_UI = {
  uk: ["Голос Роботрона", "Оберіть мову озвучення"],
  en: ["Robotron voice", "Choose the spoken language"],
  de: ["Robotron-Stimme", "Sprache der Sprachausgabe wählen"],
  fr: ["Voix de Robotron", "Choisissez la langue parlée"],
  es: ["Voz de Robotron", "Elige el idioma de la voz"],
};
function addQuestProgress(id, amount = 1) {
  const quest = QUESTS.find((item) => item.id === id);
  if (!quest || questClaimed[id]) return;
  questStats[id] = Math.min(quest.target, (Number(questStats[id]) || 0) + amount);
  refreshQuestUI();
}
function getReadyQuestCount() {
  return QUESTS.filter(
    (quest) =>
      !questClaimed[quest.id] &&
      (Number(questStats[quest.id]) || 0) >= quest.target,
  ).length;
}
function updateQuestReadyBadge() {
  const badge = document.getElementById("questReadyBadge");
  if (!badge) return;
  const count = getReadyQuestCount();
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "" : "none";
}
function getMenuTimeOfDay(date = new Date()) {
  if (settingTimeOfDay === "morning")
    return { className: "time-morning", label: "\u0420\u0430\u043d\u043e\u043a" };
  if (settingTimeOfDay === "day")
    return { className: "time-day", label: "\u0414\u0435\u043d\u044c" };
  if (settingTimeOfDay === "night")
    return { className: "time-night", label: "\u041d\u0456\u0447" };
  const hour = date.getHours();
  if (hour >= 5 && hour < 11)
    return { className: "time-morning", label: "\u0420\u0430\u043d\u043e\u043a" };
  if (hour >= 11 && hour < 19)
    return { className: "time-day", label: "\u0414\u0435\u043d\u044c" };
  return { className: "time-night", label: "\u041d\u0456\u0447" };
}
function updateMenuTimeOfDay() {
  const menu = document.getElementById("sMenu");
  const badge = document.getElementById("menuTimeBadge");
  if (!menu) return;
  const period = getMenuTimeOfDay();
  menu.classList.remove("time-night", "time-morning", "time-day");
  menu.classList.add(period.className);
  if (badge) badge.textContent = period.label;
}
function drawTimeOfDaySky(lv) {
  const period = getMenuTimeOfDay().className;
  const sky = ctx.createLinearGradient(0, 0, 0, GND);
  if (period === "time-night") {
    sky.addColorStop(0, "#07122f");
    sky.addColorStop(0.58, "#111834");
    sky.addColorStop(1, lv.sky);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f8f1c6";
    ctx.beginPath();
    ctx.arc(82, 42, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#07122f";
    ctx.beginPath();
    ctx.arc(89, 37, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 18; i++) {
      const sx = (i * 73 + 41) % W;
      const sy = 18 + ((i * 29) % 86);
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
    }
  } else if (period === "time-morning") {
    sky.addColorStop(0, "#f3a35f");
    sky.addColorStop(0.5, "#6da7d4");
    sky.addColorStop(1, lv.sky);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,218,105,0.9)";
    ctx.beginPath();
    ctx.arc(96, 82, 34, 0, Math.PI * 2);
    ctx.fill();
  } else {
    sky.addColorStop(0, "#54a9e8");
    sky.addColorStop(0.58, "#2e78b0");
    sky.addColorStop(1, lv.sky);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff6a6";
    ctx.beginPath();
    ctx.arc(W - 86, 58, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.beginPath();
    ctx.ellipse(145, 58, 46, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(188, 54, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return period;
}
function isStormWeather() {
  return currentLocation === 0 && (gameState === "run" || gameState === "schoolEnter");
}
function drawStormSkyOverlay() {
  if (!isStormWeather()) return;
  const storm = ctx.createLinearGradient(0, 0, 0, GND);
  storm.addColorStop(0, "rgba(9, 16, 30, 0.5)");
  storm.addColorStop(0.65, "rgba(17, 27, 42, 0.32)");
  storm.addColorStop(1, "rgba(35, 45, 58, 0.12)");
  ctx.fillStyle = storm;
  ctx.fillRect(0, 0, W, GND);

  ctx.fillStyle = "rgba(22, 30, 44, 0.86)";
  const off = (bgOff * 0.08) % 240;
  for (let x = -260 - off; x < W + 260; x += 240) {
    ctx.beginPath();
    ctx.ellipse(x + 50, 44, 72, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 118, 38, 88, 24, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 196, 51, 76, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (lightningFlash > 0) {
    const alpha = Math.min(0.82, lightningFlash / 12);
    ctx.fillStyle = `rgba(210,235,255,${alpha * 0.34})`;
    ctx.fillRect(0, 0, W, H);
    const lx = W * 0.62 + Math.sin(fr * 0.33) * 110;
    ctx.strokeStyle = `rgba(230,247,255,${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lx, 18);
    ctx.lineTo(lx - 22, 74);
    ctx.lineTo(lx + 6, 74);
    ctx.lineTo(lx - 28, 142);
    ctx.lineTo(lx + 12, 94);
    ctx.lineTo(lx - 8, 96);
    ctx.stroke();
  }
}
function drawRain() {
  if (!isStormWeather()) return;
  ctx.save();
  ctx.strokeStyle = "rgba(175, 218, 255, 0.58)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 90; i++) {
    const x = (i * 53 + bgOff * 5.2) % (W + 120) - 60;
    const y = (i * 71 + fr * 16) % (H + 80) - 50;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 12, y + 28);
    ctx.stroke();
  }
  ctx.restore();
}
function refreshQuestUI() {
  const questScreen = document.getElementById("sQuests");
  if (questScreen?.classList.contains("active")) {
    buildQuests();
    return;
  }
  updateQuestReadyBadge();
}
function getAchievementProgress(item) {
  if (item.id === "coins1000")
    return Math.min(item.target, Math.max(achievementStats[item.id] || 0, totalCoins));
  return Math.min(item.target, Number(achievementStats[item.id]) || 0);
}
function addAchievementProgress(id, amount = 1) {
  const item = ACHIEVEMENTS.find((achievement) => achievement.id === id);
  if (!item) return;
  achievementStats[id] = Math.min(
    item.target,
    Math.max(0, Number(achievementStats[id]) || 0) + amount,
  );
  updateAchievementReadyBadge();
  const screen = document.getElementById("sAchievements");
  if (screen?.classList.contains("active")) buildAchievements();
}
function getReadyAchievementCount() {
  return ACHIEVEMENTS.filter((item) => {
    const done = getAchievementProgress(item) >= item.target;
    return done && !achievementSeen[item.id];
  }).length;
}
function updateAchievementReadyBadge() {
  const badge = document.getElementById("achievementReadyBadge");
  if (!badge) return;
  const count = getReadyAchievementCount();
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "" : "none";
}
function buildAchievements() {
  const list = document.getElementById("achievementList");
  if (!list) return;
  list.innerHTML = "";
  ACHIEVEMENTS.forEach((item) => {
    const progress = getAchievementProgress(item);
    const done = progress >= item.target;
    if (done) achievementSeen[item.id] = true;
    const card = document.createElement("article");
    card.className = "achievement-item" + (done ? " complete" : "");
    card.innerHTML = `
      <div class="achievement-icon">${item.icon}</div>
      <div class="achievement-copy">
        <div class="achievement-title">${item.title}</div>
        <div class="achievement-desc">${item.desc}</div>
        <div class="achievement-progress">
          <div class="achievement-progress-fill" style="width:${(progress / item.target) * 100}%"></div>
        </div>
        <div class="achievement-count">${progress} / ${item.target}</div>
      </div>
      <div class="achievement-status">${done ? "\u041e\u0442\u0440\u0438\u043c\u0430\u043d\u043e" : "\u0412 \u043f\u0440\u043e\u0446\u0435\u0441\u0456"}</div>
    `;
    list.appendChild(card);
  });
  saveGame();
  updateAchievementReadyBadge();
}
function refreshCoinAchievements() {
  achievementStats.coins1000 = Math.max(
    Number(achievementStats.coins1000) || 0,
    totalCoins,
  );
  updateAchievementReadyBadge();
}
function buildQuests() {
  const list = document.getElementById("questList");
  if (!list) return;
  list.innerHTML = "";
  QUESTS.forEach((quest, index) => {
    const progress = Math.min(
      quest.target,
      Math.floor(Number(questStats[quest.id]) || 0),
    );
    const complete = progress >= quest.target;
    const claimed = Boolean(questClaimed[quest.id]);
    const item = document.createElement("article");
    item.className =
      "quest-item" + (claimed ? " claimed" : complete ? " complete" : "");
    const unit = quest.unit ? ` ${quest.unit}` : "";
    item.innerHTML = `
      <div class="quest-item-head">
        <div class="quest-item-title">${index + 1}. ${quest.title}</div>
        <div class="quest-item-count">${progress} / ${quest.target}${unit}</div>
      </div>
      <div class="quest-progress">
        <div class="quest-progress-fill" style="width:${(progress / quest.target) * 100}%"></div>
      </div>
      <div class="quest-item-footer">
        <span class="quest-reward">+${QUEST_REWARD} ₴</span>
        <button class="quest-claim" data-quest-id="${quest.id}" type="button" ${!complete || claimed ? "disabled" : ""}>
          ${claimed ? "Отримано" : "Забрати"}
        </button>
      </div>
    `;
    list.appendChild(item);
  });
  updateQuestReadyBadge();
}
window.addEventListener("load", () => setTimeout(focusApp, 100));
window.addEventListener("load", updateMenuTimeOfDay);
setInterval(updateMenuTimeOfDay, 60000);
function unlockGameAudio() {
  const c = getSfxCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}
document.getElementById("app").addEventListener("pointerdown", () => {
  focusApp();
  unlockGameAudio();
  beginIntroAfterGesture();
});
function buildLevelBar() {
  const bar = document.getElementById("lvlBar");
  bar.innerHTML = "";
  const lvNames = getLevelNames(currentLocation, lang);
  const progress = currentLocation === 0 ? progressKyiv : progressLviv;
  const levels = getLevels();
  levels.forEach((lv, i) => {
    const btn = document.createElement("button");
    const done = i < progress;
    const isCur = i === progress;
    const locked = i > progress;
    btn.className = "lvl-btn" + (done ? " done" : isCur ? " current" : "");
    if (!locked) btn.classList.add("unlocked");
    btn.innerHTML = `<span>${done ? "✓" : locked ? "🔒" : i + 1}</span><span class="lvl-btn-name">${(lvNames[i] || "").slice(0, 5)}</span>`;
    if (!locked) {
      btn.onclick = () => {
        currentLevel = i;
        saveGame();
        showScreen("sGame");
        startLevel();
      };
    }
    bar.appendChild(btn);
  });
  // update tab active state
  document
    .querySelectorAll(".loc-tab")
    .forEach((b) =>
      b.classList.toggle("active", Number(b.dataset.loc) === currentLocation),
    );
  // update loc tab labels with language
  const locNames = LOCATION_NAMES[lang] || LOCATION_NAMES.uk;
  document
    .querySelectorAll(".loc-tab")
    .forEach((b, i) => (b.textContent = locNames[i]));
}

function applyLang() {
  const L = t();
  document.getElementById("menuSub").textContent = L.sub;
  document.getElementById("btnPlay").textContent = L.play;
  document.getElementById("btnShopOpen").textContent = L.shop;
  document.getElementById("menuCoinsLabel").textContent = L.coins;
  document.getElementById("shopTitle").textContent = L.shopTitle;
  document.getElementById("btnBackShop").textContent = L.back;
  document.getElementById("btnBackSettings").textContent = L.back;
  document.getElementById("hudPts").textContent = L.pts;
  document.getElementById("cLeft").textContent = L.left;
  document.getElementById("cJump").textContent = L.jump;
  document.getElementById("cSlide").textContent = L.slide;
  document.getElementById("cRight").textContent = L.right;
  document.getElementById("cMenu").textContent = L.menu;
  updateFireControl();
  document
    .querySelectorAll(".lbtn")
    .forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  buildLevelBar();
  buildShop();
  buildSettings();
}

function buildSettings() {
  const L = t();
  document.getElementById("settingsTitle").textContent = L.settingsTitle;
  document.getElementById("sLblDiff").textContent = L.lblDiff;
  document.getElementById("sDescDiff").textContent = L.descDiff;
  document.getElementById("sLblLives").textContent = L.lblLives;
  document.getElementById("sDescLives").textContent = L.descLives;
  document.getElementById("sLblDist").textContent = L.lblDist;
  document.getElementById("sDescDist").textContent = L.descDist;
  const timeLabel = document.getElementById("sLblTime");
  const timeDesc = document.getElementById("sDescTime");
  if (timeLabel) timeLabel.textContent = "\u0427\u0430\u0441 \u0434\u043e\u0431\u0438";
  if (timeDesc)
    timeDesc.textContent =
      "\u041e\u0431\u0435\u0440\u0438 \u0444\u043e\u043d \u043c\u0435\u043d\u044e \u0442\u0430 \u0433\u0440\u0438";
  document.getElementById("sLblSound").textContent = L.lblSound;
  document.getElementById("sDescSound").textContent =
    settingMusicTrack === "march" ? getMarchLyrics()[0] : L.descSound;
  document.getElementById("sLblVib").textContent = L.lblVib;
  document.getElementById("sDescVib").textContent = L.descVib;
  const robotVoiceUi = ROBOT_VOICE_UI[lang] || ROBOT_VOICE_UI.uk;
  document.getElementById("sLblRobotVoice").textContent = robotVoiceUi[0];
  document.getElementById("sDescRobotVoice").textContent = robotVoiceUi[1];

  // Difficulty labels
  const diffLabels = [L.diffEasy, L.diffNorm, L.diffHard];
  document.querySelectorAll("#segDiff .seg-btn").forEach((b, i) => {
    b.textContent = diffLabels[i];
    b.classList.toggle("active", b.dataset.val === settingDiff);
  });
  document.querySelectorAll("#segLives .seg-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.val) === settingLives);
  });
  document.querySelectorAll("#segDist .seg-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.val) === settingDist);
  });
  document.querySelectorAll("#segTime .seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === settingTimeOfDay);
  });
  document.querySelectorAll("#segMusic .seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === settingMusicTrack);
  });
  document.querySelectorAll("#segRobotVoice .seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === settingRobotVoiceLang);
  });

  const ts = document.getElementById("togSound");
  ts.className = "tog " + (settingSound ? "on" : "off");
  const tv = document.getElementById("togVib");
  tv.className = "tog " + (settingVib ? "on" : "off");
}
document.querySelectorAll(".lbtn").forEach((b) => {
  b.onclick = () => {
    lang = b.dataset.lang;
    applyLang();
    saveGame();
    if (musicPlaying) {
      stopLyrics();
      startLyrics();
    }
  };
});

function showScreen(id) {
  setActiveScreen(id);
  if (id === "sMenu") updateQuestReadyBadge();
  if (id === "sMenu") updateAchievementReadyBadge();
  if (id === "sQuests") buildQuests();
  if (id === "sAchievements") buildAchievements();
  if (id === "sBackpack") buildBackpack();
  if (settingSound) {
    if (id === "sMenu" || id === "sGame") {
      startMusic();
    } else {
      stopMusic();
    }
  }
}
function syncCoins() {
  refreshCoinAchievements();
  setText("menuCoins", totalCoins);
  setText("shopCoins", totalCoins);
}
function buildBackpack() {
  const preview = document.getElementById("backpackSlotsPreview");
  const info = document.getElementById("backpackInfo");
  const button = document.getElementById("btnBackpackUpgrade");
  const store = document.getElementById("backpackStore");
  if (!preview || !info || !button || !store) return;
  preview.innerHTML = "";
  for (let i = 0; i < backpackSlots; i++) {
    const slot = document.createElement("div");
    slot.className = "backpack-slot";
    slot.textContent = i === 0 ? "M" : i === 1 ? "S" : "J";
    preview.appendChild(slot);
  }
  const price = 700;
  info.textContent =
    "\u0421\u043b\u043e\u0442\u0456\u0432: " +
    backpackSlots +
    " / 3   \u041c\u043e\u043d\u0435\u0442: " +
    totalCoins +
    "\u20b4";
  button.textContent =
    backpackSlots >= 3
      ? "\u0420\u044e\u043a\u0437\u0430\u043a \u043c\u0430\u043a\u0441\u0438\u043c\u0430\u043b\u044c\u043d\u0438\u0439"
      : "\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 3-\u0439 \u0441\u043b\u043e\u0442 - " + price + "\u20b4";
  button.disabled = backpackSlots >= 3 || totalCoins < price;
  store.innerHTML = "";
  BACKPACK_BONUS_STORE.forEach((item) => {
    const card = document.createElement("button");
    card.className = "backpack-buy";
    card.type = "button";
    card.dataset.bonus = item.type;
    card.style.borderColor = item.color;
    card.innerHTML =
      '<span class="backpack-buy-icon">' +
      getBonusIcon(item.type) +
      '</span><span class="backpack-buy-name">' +
      getBonusLabel(item.type) +
      '</span><span class="backpack-buy-count">x' +
      (bonusInventory[item.type] || 0) +
      '</span><span class="backpack-buy-price">' +
      item.price +
      "\u20b4</span>";
    card.disabled = totalCoins < item.price;
    store.appendChild(card);
  });
}

function drawSkinPreview(canvas, sk) {
  const c = canvas.getContext("2d");
  const w = 52,
    h = 62;
  c.clearRect(0, 0, w, h);
  const cx = w / 2,
    by = h - 4; // base y (feet)
  if (sk.id === "robotron_neon") {
    drawRobotronPreview(c, cx, by);
    return;
  }

  // legs
  c.fillStyle = sk.shoes || "#111";
  c.fillRect(cx - 10, by - 14, 8, 14);
  c.fillRect(cx + 2, by - 14, 8, 14);

  if (sk.id === "hetman_gold") {
    c.fillStyle = sk.cape;
    c.beginPath();
    c.moveTo(cx - 17, by - 45);
    c.lineTo(cx + 17, by - 45);
    c.lineTo(cx + 21, by - 8);
    c.lineTo(cx - 21, by - 8);
    c.closePath();
    c.fill();
    c.strokeStyle = sk.trim;
    c.lineWidth = 2;
    c.stroke();
  }
  if (sk.id === "cossack") {
    c.fillStyle = sk.cape;
    c.beginPath();
    c.moveTo(cx - 15, by - 45);
    c.lineTo(cx + 15, by - 45);
    c.lineTo(cx + 20, by - 9);
    c.lineTo(cx - 20, by - 9);
    c.closePath();
    c.fill();
  }

  // shorts
  c.fillStyle = sk.shorts || "#222";
  c.fillRect(cx - 12, by - 24, 24, 12);

  // shirt / body
  c.fillStyle = sk.shirt;
  c.beginPath();
  if (c.roundRect) {
    c.roundRect(cx - 13, by - 46, 26, 24, 4);
  } else {
    c.rect(cx - 13, by - 46, 26, 24);
  }
  c.fill();

  if (sk.id === "cossack") {
    c.fillStyle = sk.trim;
    for (let row = 0; row < 4; row++) {
      c.fillRect(cx - 8, by - 42 + row * 5, 16, 1.5);
    }
    c.fillStyle = "#667264";
    c.fillRect(cx - 13, by - 46, 3, 24);
    c.fillRect(cx + 10, by - 46, 3, 24);
    c.strokeStyle = "#c8d3df";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 16, by - 31);
    c.lineTo(cx - 26, by - 12);
    c.stroke();
  }

  if (sk.id === "hetman_gold") {
    c.fillStyle = sk.armor;
    c.fillRect(cx - 10, by - 43, 20, 17);
    c.strokeStyle = sk.trim;
    c.lineWidth = 1.5;
    c.strokeRect(cx - 10, by - 43, 20, 17);
    c.fillStyle = sk.trim;
    c.fillRect(cx - 2, by - 40, 4, 10);
    c.fillRect(cx - 7, by - 36, 14, 2);
    c.strokeStyle = "#c79b45";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx + 13, by - 28);
    c.lineTo(cx + 20, by - 7);
    c.stroke();
    c.strokeStyle = sk.trim;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx + 20, by - 7);
    c.lineTo(cx + 22, by - 2);
    c.stroke();
  }

  // scarf / belt accent
  if (sk.scarf) {
    c.fillStyle = sk.scarf;
    c.fillRect(cx - 13, by - 24, 26, 5);
  }

  // arms
  c.strokeStyle = sk.skin;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(cx - 10, by - 40);
  c.lineTo(cx - 16, by - 28);
  c.moveTo(cx + 10, by - 40);
  c.lineTo(cx + 16, by - 28);
  c.stroke();

  // head
  c.fillStyle = sk.mask || sk.skin;
  c.beginPath();
  c.arc(cx, by - 57, 12, 0, Math.PI * 2);
  c.fill();

  // hair / hat
  if (sk.id === "ninja") {
    // head wrap
    c.fillStyle = "#111";
    c.beginPath();
    c.arc(cx, by - 60, 12, Math.PI, 0);
    c.fill();
    // eyes slit
    c.fillStyle = "#ff3300";
    c.fillRect(cx - 7, by - 60, 14, 3);
  } else if (sk.id === "cossack") {
    c.fillStyle = sk.hair || "#8b4513";
    c.beginPath();
    c.arc(cx - 3, by - 68, 5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(cx - 2, by - 72);
    c.quadraticCurveTo(cx + 9, by - 78, cx + 14, by - 70);
    c.strokeStyle = sk.hair;
    c.lineWidth = 4;
    c.stroke();
    c.fillStyle = sk.hair;
    c.fillRect(cx - 10, by - 55, 9, 3);
    c.fillRect(cx + 1, by - 55, 9, 3);
    c.strokeStyle = "#704528";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx + 8, by - 54);
    c.lineTo(cx + 17, by - 57);
    c.lineTo(cx + 20, by - 55);
    c.stroke();
  } else if (sk.id === "courier") {
    c.fillStyle = sk.hat;
    c.fillRect(cx - 12, by - 68, 24, 7);
    c.fillRect(cx + 5, by - 63, 12, 3);
  } else if (sk.id === "football") {
    c.fillStyle = sk.hair;
    c.beginPath();
    c.arc(cx, by - 61, 12, Math.PI, 0);
    c.fill();
    c.fillStyle = "#1565c0";
    c.fillRect(cx - 3, by - 43, 6, 13);
  } else if (sk.id === "cyber" || sk.id === "robotron_neon") {
    c.fillStyle = sk.hat;
    c.fillRect(cx - 11, by - 62, 22, 5);
    c.fillStyle = sk.id === "robotron_neon" ? "#ff3df2" : "#00e5ff";
    c.fillRect(cx - 8, by - 58, 16, 3);
  } else if (sk.id === "hetman_gold") {
    c.fillStyle = "#4b3018";
    c.beginPath();
    c.ellipse(cx, by - 67, 13, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = sk.trim;
    c.fillRect(cx - 12, by - 67, 24, 3);
    c.strokeStyle = sk.trim;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx + 3, by - 72);
    c.quadraticCurveTo(cx + 9, by - 83, cx + 13, by - 75);
    c.moveTo(cx + 6, by - 72);
    c.quadraticCurveTo(cx + 14, by - 80, cx + 16, by - 72);
    c.stroke();
    c.fillStyle = "#5b351d";
    c.beginPath();
    c.moveTo(cx - 6, by - 54);
    c.lineTo(cx, by - 47);
    c.lineTo(cx + 6, by - 54);
    c.closePath();
    c.fill();
  } else if (sk.id === "shadow_agent") {
    c.fillStyle = sk.hair;
    c.beginPath();
    c.arc(cx, by - 61, 12, Math.PI, 0);
    c.fill();
    c.fillStyle = "#050505";
    c.fillRect(cx - 9, by - 59, 8, 4);
    c.fillRect(cx + 1, by - 59, 8, 4);
  } else if (sk.id === "parkour") {
    c.fillStyle = sk.hat;
    c.beginPath();
    c.arc(cx, by - 62, 13, Math.PI, 0);
    c.fill();
    c.fillStyle = "#f2d14f";
    c.fillRect(cx - 13, by - 63, 26, 4);
    c.fillRect(cx + 7, by - 59, 10, 3);
  } else if (sk.id === "pilot") {
    c.fillStyle = sk.hat;
    c.beginPath();
    c.arc(cx, by - 61, 13, Math.PI, 0);
    c.fill();
    c.fillRect(cx - 13, by - 62, 26, 7);
    c.fillStyle = "#79b9d1";
    c.fillRect(cx - 9, by - 60, 7, 4);
    c.fillRect(cx + 2, by - 60, 7, 4);
  } else if (sk.id === "firefighter") {
    c.fillStyle = sk.hat;
    c.beginPath();
    c.arc(cx, by - 62, 14, Math.PI, 0);
    c.fill();
    c.fillRect(cx - 15, by - 63, 30, 5);
    c.fillStyle = "#f3d34a";
    c.fillRect(cx - 3, by - 70, 6, 10);
  } else if (sk.id === "space_courier") {
    c.fillStyle = sk.hat;
    c.beginPath();
    c.arc(cx, by - 59, 15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#21475d";
    c.beginPath();
    c.arc(cx, by - 58, 11, Math.PI, 0);
    c.fill();
    c.fillStyle = "#28c8d8";
    c.fillRect(cx - 9, by - 59, 18, 2);
  } else {
    // blond hair
    c.fillStyle = sk.hair || "#e8c45c";
    c.beginPath();
    c.arc(cx, by - 61, 12, Math.PI, 0);
    c.fill();
  }

  // backpack strap for default
  if (sk.id === "default") {
    c.strokeStyle = "rgba(0,0,0,0.5)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx - 8, by - 44);
    c.lineTo(cx + 10, by - 26);
    c.stroke();
  }
}
function buildShop() {
  const L = t(),
    grid = document.getElementById("shopGrid");
  grid.innerHTML = "";
  SKINS_BASE.forEach((sk, i) => {
    const div = document.createElement("div");
    div.className =
      "sitem" +
      (sk.exclusive ? " exclusive" : "") +
      (owned.includes(sk.id) ? " owned" : "") +
      (selectedSkin === sk.id ? " selected" : "");
    const cv2 = document.createElement("canvas");
    cv2.width = 52;
    cv2.height = 62;
    drawSkinPreview(cv2, sk);
    const nm = document.createElement("div");
    nm.className = "sitem-name";
    nm.textContent = L.skins[i] ? L.skins[i].name : sk.name || sk.id;
    if (sk.exclusive) {
      const badge = document.createElement("div");
      badge.className = "sitem-exclusive";
      badge.textContent = "ЕКСКЛЮЗИВ";
      div.appendChild(badge);
    }
    const pr = document.createElement("div");
    if (selectedSkin === sk.id) {
      pr.className = "sitem-owned";
      pr.textContent = L.owned;
    } else if (owned.includes(sk.id)) {
      pr.className = "sitem-owned";
      pr.textContent = L.equip;
    } else {
      pr.className = "sitem-price";
      pr.textContent = sk.price + "₴";
    }
    div.appendChild(cv2);
    div.appendChild(nm);
    div.appendChild(pr);
    div.onclick = () => {
      if (owned.includes(sk.id)) {
        selectedSkin = sk.id;
        saveGame();
        buildShop();
      } else if (totalCoins >= sk.price) {
        totalCoins -= sk.price;
        owned.push(sk.id);
        selectedSkin = sk.id;
        syncCoins();
        saveGame();
        buildShop();
      }
    };
    grid.appendChild(div);
  });
  const playerUpgradesTitle = document.createElement("div");
  playerUpgradesTitle.className = "shop-section-title";
  playerUpgradesTitle.textContent = "\u041f\u0440\u043e\u043a\u0430\u0447\u043a\u0430 \u0410\u043d\u0434\u0440\u0456\u044f";
  grid.appendChild(playerUpgradesTitle);
  PLAYER_UPGRADES.forEach((upgrade) => {
    const level = getPlayerUpgradeLevel(upgrade.id);
    const maxed = level >= upgrade.prices.length;
    const price = maxed ? 0 : upgrade.prices[level];
    const div = document.createElement("div");
    div.className = "sitem upgrade" + (maxed ? " owned" : "");
    const icon = document.createElement("div");
    icon.className = "sitem-upgrade-icon";
    icon.textContent = upgrade.icon;
    const nm = document.createElement("div");
    nm.className = "sitem-name";
    nm.textContent = upgrade.name;
    const desc = document.createElement("div");
    desc.className = "sitem-desc";
    desc.textContent = upgrade.desc;
    const lvl = document.createElement("div");
    lvl.className = "sitem-desc";
    lvl.textContent = "\u0420\u0456\u0432\u0435\u043d\u044c " + level + " / " + upgrade.prices.length;
    const pr = document.createElement("div");
    pr.className = maxed ? "sitem-owned" : "sitem-price";
    pr.textContent = maxed ? "\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c" : price + "\u20b4";
    div.appendChild(icon);
    div.appendChild(nm);
    div.appendChild(desc);
    div.appendChild(lvl);
    div.appendChild(pr);
    div.onclick = () => {
      const current = getPlayerUpgradeLevel(upgrade.id);
      if (current >= upgrade.prices.length) return;
      const nextPrice = upgrade.prices[current];
      if (totalCoins < nextPrice) return;
      totalCoins -= nextPrice;
      playerUpgrades[upgrade.id] = current + 1;
      syncCoins();
      saveGame();
      buildShop();
      sfxCoin();
    };
    grid.appendChild(div);
  });
  const upgradesTitle = document.createElement("div");
  upgradesTitle.className = "shop-section-title";
  upgradesTitle.textContent = "\u041f\u043e\u043a\u0440\u0430\u0449\u0435\u043d\u043d\u044f \u0437\u0431\u0440\u043e\u0457";
  grid.appendChild(upgradesTitle);
  WEAPON_UPGRADES.forEach((upgrade) => {
    const div = document.createElement("div");
    const bought = Boolean(weaponUpgrades[upgrade.id]);
    div.className = "sitem upgrade" + (bought ? " owned" : "");
    const icon = document.createElement("div");
    icon.className = "sitem-upgrade-icon";
    icon.textContent =
      upgrade.id === "fireRate" ? "\u2699" : upgrade.id === "damage" ? "x2" : "\u26a1";
    const nm = document.createElement("div");
    nm.className = "sitem-name";
    nm.textContent = upgrade.name;
    const desc = document.createElement("div");
    desc.className = "sitem-desc";
    desc.textContent = upgrade.desc;
    const pr = document.createElement("div");
    pr.className = bought ? "sitem-owned" : "sitem-price";
    pr.textContent = bought ? "\u041a\u0443\u043f\u043b\u0435\u043d\u043e" : upgrade.price + "\u20b4";
    div.appendChild(icon);
    div.appendChild(nm);
    div.appendChild(desc);
    div.appendChild(pr);
    div.onclick = () => {
      if (bought || totalCoins < upgrade.price) return;
      totalCoins -= upgrade.price;
      weaponUpgrades[upgrade.id] = true;
      syncCoins();
      saveGame();
      buildShop();
      sfxCoin();
    };
    grid.appendChild(div);
  });
}

document.getElementById("btnPlay").onclick = () => {
  focusApp();
  // Продовжити з останнього збереженого рівня
  currentLevel = getPlayableLevel(
    currentLocation === 0 ? progressKyiv : progressLviv,
  );
  showScreen("sGame");
  startLevel();
};
document.querySelectorAll(".loc-tab").forEach((b) => {
  b.onclick = () => {
    currentLocation = Number(b.dataset.loc);
    currentLevel = getPlayableLevel(
      currentLocation === 0 ? progressKyiv : progressLviv,
    );
    if (musicPlaying) {
      stopMusic();
      startMusic();
    }
    saveGame();
    applyLang();
  };
});
document.getElementById("btnShopOpen").onclick = () => {
  buildShop();
  syncCoins();
  showScreen("sShop");
};
document.getElementById("btnBackpackOpen").onclick = () => {
  syncCoins();
  showScreen("sBackpack");
};
document.getElementById("btnBackpackUpgrade").onclick = () => {
  const price = 700;
  if (backpackSlots >= 3 || totalCoins < price) return;
  totalCoins -= price;
  backpackSlots = 3;
  syncCoins();
  saveGame();
  buildBackpack();
  sfxCoin();
};
document.getElementById("backpackStore").onclick = (event) => {
  const button = event.target.closest(".backpack-buy");
  if (!button) return;
  const item = BACKPACK_BONUS_STORE.find(
    (bonus) => bonus.type === button.dataset.bonus,
  );
  if (!item || totalCoins < item.price) return;
  totalCoins -= item.price;
  bonusInventory[item.type] = (bonusInventory[item.type] || 0) + 1;
  syncCoins();
  saveGame();
  buildBackpack();
  sfxCoin();
};
document.getElementById("btnBackBackpack").onclick = () => {
  saveGame();
  syncCoins();
  showScreen("sMenu");
};
document.getElementById("btnQuestsOpen").onclick = () => {
  buildQuests();
  showScreen("sQuests");
};
document.getElementById("btnAchievementsOpen").onclick = () => {
  buildAchievements();
  showScreen("sAchievements");
};
document.getElementById("btnBackAchievements").onclick = () => {
  saveGame();
  syncCoins();
  showScreen("sMenu");
};
document.getElementById("btnBackQuests").onclick = () => {
  saveGame();
  syncCoins();
  showScreen("sMenu");
};
document.getElementById("questList").onclick = (event) => {
  const button = event.target.closest(".quest-claim");
  if (!button) return;
  const quest = QUESTS.find((item) => item.id === button.dataset.questId);
  if (
    !quest ||
    questClaimed[quest.id] ||
    (Number(questStats[quest.id]) || 0) < quest.target
  )
    return;
  questClaimed[quest.id] = true;
  totalCoins += QUEST_REWARD;
  syncCoins();
  saveGame();
  buildQuests();
  sfxCoin();
};
document.getElementById("btnBackShop").onclick = () => {
  showScreen("sMenu");
  syncCoins();
  saveGame();
};
document.getElementById("btnSettingsOpen").onclick = () => {
  buildSettings();
  showScreen("sSettings");
};
document.getElementById("btnBackSettings").onclick = () => {
  saveGame();
  showScreen("sMenu");
};
document.getElementById("cMenu").onclick = () => {
  stopGame();
  showScreen("sMenu");
  syncCoins();
  saveGame();
  buildLevelBar();
};

// Settings controls
document.querySelectorAll("#segDiff .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingDiff = b.dataset.val;
    buildSettings();
  };
});
document.querySelectorAll("#segLives .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingLives = Number(b.dataset.val);
    buildSettings();
  };
});
document.querySelectorAll("#segDist .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingDist = Number(b.dataset.val);
    buildSettings();
  };
});
document.querySelectorAll("#segTime .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingTimeOfDay = b.dataset.val;
    updateMenuTimeOfDay();
    saveGame();
    buildSettings();
  };
});
document.querySelectorAll("#segMusic .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingMusicTrack = b.dataset.val;
    if (musicPlaying) {
      stopMusic();
      startMusic();
    }
    saveGame();
    buildSettings();
  };
});
document.querySelectorAll("#segRobotVoice .seg-btn").forEach((b) => {
  b.onclick = () => {
    settingRobotVoiceLang = b.dataset.val;
    saveGame();
    buildSettings();
    const preview = getRobotStory()[0];
    speakAndWait(preview, settingRobotVoiceLang);
  };
});
document.getElementById("togSound").onclick = () => {
  settingSound = !settingSound;
  if (settingSound) startMusic();
  else stopMusic();
  buildSettings();
};
document.getElementById("togVib").onclick = () => {
  settingVib = !settingVib;
  buildSettings();
};
document.getElementById("cLeft").onclick = () => {
  focusApp();
  act("ArrowLeft");
};
document.getElementById("cRight").onclick = () => {
  focusApp();
  act("ArrowRight");
};
document.getElementById("cJump").onclick = () => {
  focusApp();
  act("ArrowUp");
};
document.getElementById("cSlide").onclick = () => {
  focusApp();
  act("ArrowDown");
};
document.getElementById("cFire").onclick = () => {
  focusApp();
  if (!skipStoryScene()) fireAndriiWeapon();
};
document.getElementById("cBonus").onclick = () => {
  focusApp();
  if (!skipStoryScene()) activateBackpackBonus();
};

const keys = {};
document.addEventListener("keydown", (e) => {
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyF",
      "KeyE",
    ].includes(e.code)
  )
    e.preventDefault();
  const oneShotAction = e.code === "KeyF" || e.code === "KeyE";
  if (!keys[e.code] || (oneShotAction && !e.repeat)) {
    keys[e.code] = true;
    act(e.code);
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
function skipStoryScene() {
  if (gameState !== "story" || !tckScene || tckScene.frame <= 30) return false;
  cancelSpeech();
  finishTckScene();
  return true;
}
function act(c) {
  if (gameState === "story") {
    skipStoryScene();
    return;
  }
  if (gameState === "over") {
    restartLevel();
    return;
  }
  if (gameState === "win") {
    stopGame();
    showScreen("sMenu");
    syncCoins();
    buildLevelBar();
    return;
  }
  if (gameState === "levelClear") {
    if (levelClearTimer > LEVEL_CLEAR_INPUT_DELAY) {
      nextLevel();
      return;
    }
    return;
  }
  if (gameState !== "run") return;
  if (secretRoute && secretRoute.entering) return;
  if ((c === "ArrowUp" || c === "Space") && pY >= GND - 2) {
    pVY = getJumpPower();
    noteTrick("jump");
    addQuestProgress("jumps");
    sfxJump();
  }
  if (c === "ArrowDown") {
    if (tryEnterSecretRoute()) return;
    pSlide = true;
    slideT = 44;
    noteTrick("slide");
    addQuestProgress("slides");
  }
  if (c === "ArrowLeft" && pLane > 0) {
    pLane--;
    sfxStep(-1);
  }
  if (c === "ArrowRight" && pLane < 2) {
    pLane++;
    sfxStep(1);
  }
  if (c === "KeyF") fireAndriiWeapon();
  if (c === "KeyE") activateBackpackBonus();
}

function fireAndriiWeapon() {
  const weapon = getAndriiWeapon(currentLevel, currentLocation);
  if (gameState !== "run" || !weapon || fireCooldown > 0) return;
  addQuestProgress("shots");
  pSlide = true;
  slideT = Math.max(slideT, 18);
  const x = LANES[pLane] + 24;
  const y = pSlide ? pY - 12 : pY - 34;
  if (weapon === "minigun") {
    fireCooldown = getWeaponCooldown(12, 8);
    const speedBonus = getBulletSpeedBonus();
    for (let i = 0; i < 9; i++) {
      playerBullets.push({
        x: x + i * 8,
        y: y - 4 + (i % 3) * 3,
        lane: i % 3,
        vx: 13.5 + speedBonus + i * 0.7,
        life: 50,
        type: "minigun",
      });
    }
    if (weaponUpgrades.laser) {
      playerBullets.push({
        x,
        y: y - 9,
        lane: pLane,
        vx: 19 + speedBonus,
        life: 34,
        type: "laser",
      });
    }
    sfxMachineGunBurst();
    setTimeout(sfxShot, 170);
    return;
  }

  if (weapon === "bossblaster") {
    fireCooldown = getWeaponCooldown(10, 7);
    const speedBonus = getBulletSpeedBonus();
    playerBullets.push({
      x,
      y: pY - 34,
      lane: pLane,
      vx: 15 + speedBonus,
      life: 50,
      type: "bossblaster",
    });
    if (weaponUpgrades.laser) {
      playerBullets.push({
        x,
        y: pY - 44,
        lane: pLane,
        vx: 20 + speedBonus,
        life: 38,
        type: "laser",
      });
    }
    sfxShot();
    return;
  }

  fireCooldown = getWeaponCooldown(16, 11);
  const speedBonus = getBulletSpeedBonus();
  for (let i = 0; i < 3; i++) {
    playerBullets.push({
      x: x + i * 12,
      y: y - i * 2,
      lane: pLane,
      vx: 11 + speedBonus + i * 0.9,
      life: 46,
      type: "machinegun",
    });
  }
  if (weaponUpgrades.laser) {
    playerBullets.push({
      x,
      y: y - 8,
      lane: pLane,
      vx: 18 + speedBonus,
      life: 34,
      type: "laser",
    });
  }
  sfxMachineGunBurst();
}

function nextLevel() {
  currentLevel++;
  // зберігаємо прогрес для поточної локації
  if (currentLocation === 0)
    progressKyiv = Math.max(progressKyiv, currentLevel);
  else progressLviv = Math.max(progressLviv, currentLevel);
  saveGame();
  if (currentLevel >= getLevels().length) {
    gameState = "win";
    sfxWin();
    speakAndriiForce(ANDRII_WIN);
    const bonus = 300;
    runCoins += bonus;
    totalCoins += runCoins;
    syncCoins();
    saveGame();
    hudUp();
    winTimer = 0;
    return;
  }
  buildLevelBar();
  startLevel();
}

function getLvl() {
  return getLevels()[Math.min(currentLevel, getLevels().length - 1)];
}

function startLevel() {
  focusApp();
  cancelSpeech();
  if (startVoiceTimer) {
    clearTimeout(startVoiceTimer);
    startVoiceTimer = null;
  }
  currentLevel = getPlayableLevel(currentLevel);
  const tckSceneKey = currentLocation + ":" + currentLevel;
  if (currentLocation === 0 && currentLevel === 0 && !marichkaProjectSceneSeen) {
    beginStoryScene("marichka_project");
    return;
  }
  if (currentLocation === 1 && currentLevel === 1 && !tckSceneSeenLevels[tckSceneKey]) {
    beginStoryScene("tck", tckSceneKey);
    return;
  }
  const lv = getLvl();
  score = 0;
  runCoins = 0;
  lives = settingLives;
  spd = Math.min(lv.baseSpd, LEVEL_START_SPEED_CAP) * getSpeedUpgradeMult();
  fr = 0;
  totalDist = 0;
  coinCombo = 0;
  coinComboTimer = 0;
  coinComboMult = 1;
  trickJumpTimer = 0;
  trickSlideTimer = 0;
  trickComboTimer = 0;
  trickComboMult = 1;
  trickComboStreak = 0;
  pLane = 1;
  pY = GND;
  pVY = 0;
  pSlide = false;
  slideT = 0;
  puddleSlow = 0;
  magnetTimer = 0;
  chestnutTimer = 0;
  superJumpTimer = 0;
  shieldCharges = getStartingShieldCharges();
  fillBackpackFromInventory();
  obs = [];
  coins = [];
  magnets = [];
  chestnuts = [];
  shields = [];
  superJumps = [];
  cityGifts = [];
  parts = [];
  confetti = [];
  bullets = [];
  playerBullets = [];
  fireCooldown = 0;
  bgOff = 0;
  lightningFlash = 0;
  nextLightning = 160 + ((Math.random() * 180) | 0);
  chaserX = -100;
  inv = 0;
  flash = 0;
  finishX = 9999;
  finishActive = false;
  schoolEnterTimer = 0;
  schoolDialogueStep = 0;
  schoolDialogueDone = false;
  schoolExitTimer = 0;
  bossActive = false;
  bossDefeated = false;
  bossTransform = 0;
  bossHp = BOSS_MAX_HP;
  bossX = W + 90;
  bossShotCooldown = 0;
  bossSummonCooldown = 0;
  bossSpecialCooldown = 0;
  bossFlash = 0;
  secretRoute = createSecretRoute();
  winTimer = 0;
  levelClearTimer = 0;
  andriiFirstObs = false;
  andriiCooldown = 0;
  bubbleText = "";
  bubbleTimer = 0;
  gameState = "run";
  saveGame();
  updateFireControl();
  hudUp();
  if (!loopActive) {
    if (raf) cancelAnimationFrame(raf);
    loop();
  }
  // Андрій кричить на старті з затримкою
  startVoiceTimer = setTimeout(() => {
    startVoiceTimer = null;
    if (gameState === "run") speakAndrii(ANDRII_START);
  }, 800);
}

function restartLevel() {
  startLevel();
}

function startGame() {
  // використовується тільки якщо треба явно почати з рівня 1
  currentLevel = getPlayableLevel(
    currentLocation === 0 ? progressKyiv : progressLviv,
  );
  startLevel();
}
function stopGame() {
  gameState = "stopped";
  tckScene = null;
  cancelSpeech();
  if (startVoiceTimer) {
    clearTimeout(startVoiceTimer);
    startVoiceTimer = null;
  }
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
}
function hudUp() {
  document.getElementById("hLives").textContent = lives;
  document.getElementById("hScore").textContent = score;
  document.getElementById("hCoins").textContent = runCoins;
  document.getElementById("hudPts").textContent = t().pts;
  const rem = Math.max(0, Math.round(getFinishDistance() - totalDist));
  document.getElementById("hDist").textContent =
    rem > 0 ? rem + " " + t().dist : "";
  const lvNames = getLevelNames(currentLocation, lang);
  const locNames = LOCATION_NAMES[lang] || LOCATION_NAMES.uk;
  document.getElementById("hudLevel").textContent =
    (t().levelLabel || "Level") +
    " " +
    (currentLevel + 1) +
    " · " +
    (locNames[currentLocation] || "") +
    " · " +
    (lvNames[currentLevel] || "");
}

const cv = document.getElementById("gc"),
  ctx = cv.getContext("2d");

function spawnObs() {
  const lv = getLvl();
  const types = lv.obsTypes;
  const hazardChance = Math.min(
    (isStormWeather() ? 0.28 : 0.14) + currentLevel * 0.012,
    isStormWeather() ? 0.42 : 0.28,
  );
  const type =
    Math.random() < hazardChance
      ? Math.random() < (isStormWeather() ? 0.72 : 0.52)
        ? "puddle"
        : "hole"
      : types[Math.floor(Math.random() * types.length)];
  obs.push({
    x: W + 30,
    lane: Math.floor(Math.random() * 3),
    type,
    vx: type === "scooter" ? 1.8 : 0,
    wheelPhase: Math.random() * Math.PI * 2,
  });
}
function spawnCoin() {
  const l = Math.floor(Math.random() * 3),
    hi = Math.random() < 0.35;
  coins.push({ x: W + 20, lane: l, y: hi ? GND - 70 : GND, done: false });
}
function spawnMagnet() {
  const lane = Math.floor(Math.random() * 3);
  magnets.push({ x: W + 30, lane, y: GND - 36, phase: Math.random() * Math.PI * 2 });
}
function spawnChestnut() {
  if (currentLocation !== 0) return;
  const lane = Math.floor(Math.random() * 3);
  chestnuts.push({ x: W + 35, lane, y: GND - 38, phase: Math.random() * Math.PI * 2 });
}
function spawnShield() {
  const lane = Math.floor(Math.random() * 3);
  shields.push({ x: W + 30, lane, y: GND - 38, phase: Math.random() * Math.PI * 2 });
}
function spawnSuperJump() {
  const lane = Math.floor(Math.random() * 3);
  superJumps.push({ x: W + 30, lane, y: GND - 40, phase: Math.random() * Math.PI * 2 });
}
function spawnCityGift(secret = false) {
  if (secretRoute?.active || bossActive || gameState !== "run") return;
  const lane = Math.floor(Math.random() * 3);
  const sourceX = LANES[lane] + (Math.random() - 0.5) * 80;
  const sourceY = secret ? 88 : 120 + Math.random() * 74;
  cityGifts.push({
    x: sourceX,
    y: sourceY,
    giverX: sourceX - 24,
    giverY: sourceY + 58,
    lane,
    vx: (LANES[lane] - sourceX) / 70,
    vy: secret ? 1.25 : 1.65,
    value: secret ? 12 : 4,
    life: 170,
    secret,
  });
  showAndriiBubble(
    secret
      ? "\u0414\u0456\u0434 \u0437 \u0431\u0430\u043b\u043a\u043e\u043d\u0430 \u0434\u0430\u0454 \u0431\u043e\u043d\u0443\u0441!"
      : "\u0411\u0456\u0436\u0438, \u0410\u043d\u0434\u0440\u0456\u044e!",
  );
}
function addParts(x, y, col) {
  for (let i = 0; i < 7; i++)
    parts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 6 - 2,
      life: 36,
      col,
    });
}
function drawBullets() {
  bullets.forEach((b) => {
    const alpha = Math.min(1, b.life / 15);
    if (b.type === "dance_hologram") {
      const spin = fr * 0.18 + (b.phase || 0);
      const wave = Math.sin(spin) * 8;
      ctx.save();
      ctx.translate(b.x, b.y + wave);
      ctx.rotate(Math.sin(spin * 0.7) * 0.18);
      ctx.globalAlpha = Math.min(0.9, alpha);
      ctx.shadowColor = "#ff4fc8";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "rgba(255,79,200,0.22)";
      ctx.beginPath();
      ctx.arc(0, -18, 29, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#d58b58";
      ctx.beginPath();
      ctx.arc(0, -30, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff9f1c";
      ctx.beginPath();
      ctx.moveTo(-14, -23);
      ctx.lineTo(14, -23);
      ctx.lineTo(20, 8);
      ctx.lineTo(-20, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#27c7d9";
      ctx.fillRect(-16, -16, 32, 6);
      ctx.strokeStyle = "#ffd45c";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-12, -19);
      ctx.lineTo(-25 - Math.sin(spin) * 8, -34);
      ctx.moveTo(12, -19);
      ctx.lineTo(25 + Math.sin(spin) * 8, -34);
      ctx.stroke();
      ctx.fillStyle = "#b62467";
      ctx.beginPath();
      ctx.moveTo(-9, -37);
      ctx.quadraticCurveTo(0, -48, 9, -37);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6b287d";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-7, 6);
      ctx.lineTo(-12 - Math.cos(spin) * 5, 22);
      ctx.moveTo(7, 6);
      ctx.lineTo(12 + Math.cos(spin) * 5, 22);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HOLO", 0, -10);
      ctx.textAlign = "left";
      ctx.restore();
      ctx.globalAlpha = 1;
      return;
    }
    // траса (слід)
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#ff8800";
    ctx.fillRect(b.x + 5, b.y - 2, 18, 4);
    // куля
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 5);
    g.addColorStop(0, "#ffee88");
    g.addColorStop(1, "rgba(255,140,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  playerBullets.forEach((b) => {
    const alpha = Math.min(1, b.life / 12);
    if (b.type === "laser") {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "#63f7ff";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "#bffcff";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - 42, b.y);
      ctx.lineTo(b.x + 30, b.y);
      ctx.stroke();
      ctx.strokeStyle = "#1fd1ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x - 46, b.y);
      ctx.lineTo(b.x + 34, b.y);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = "#3aa7ff";
    ctx.fillRect(b.x - 20, b.y - 2, 22, 4);
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 6);
    g.addColorStop(0, "#fff6a0");
    g.addColorStop(0.55, "#ffd700");
    g.addColorStop(1, "rgba(0,120,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function addConfetti() {
  const cols = [
    "#ffd700",
    "#ff6b6b",
    "#6bcb77",
    "#00e5ff",
    "#ff69b4",
    "#ffffff",
  ];
  for (let i = 0; i < 60; i++)
    confetti.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 3,
      col: cols[Math.floor(Math.random() * cols.length)],
      size: 4 + Math.random() * 6,
      life: 140,
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.2,
    });
}

function drawWindowPerson(cx, cy, scale, wavePhase, shirt = "#2f80ed") {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#f0c090";
  ctx.beginPath();
  ctx.arc(0, -12, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(-10, 14);
  ctx.quadraticCurveTo(0, -3, 10, 14);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f0c090";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const wave = Math.sin(fr * 0.12 + wavePhase) * 5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.quadraticCurveTo(18, -14 - wave, 26, -7 + wave);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-8, 1);
  ctx.quadraticCurveTo(-16, -7, -21, -2);
  ctx.stroke();

  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(-3, -14, 1.2, 0, Math.PI * 2);
  ctx.arc(4, -14, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7a3c2b";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(1, -9, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawBalconyGrandpa(x, y, wavePhase) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(-28, 14, 56, 5);
  ctx.strokeStyle = "#d8c27a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-24, 14);
  ctx.lineTo(24, 14);
  ctx.moveTo(-18, 14);
  ctx.lineTo(-18, 30);
  ctx.moveTo(0, 14);
  ctx.lineTo(0, 30);
  ctx.moveTo(18, 14);
  ctx.lineTo(18, 30);
  ctx.stroke();

  ctx.fillStyle = "#f0c090";
  ctx.beginPath();
  ctx.arc(0, -5, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#eeeeee";
  ctx.beginPath();
  ctx.arc(0, -10, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-5, 0, 10, 7);
  ctx.fillStyle = "#3a6ea5";
  ctx.fillRect(-10, 5, 20, 15);

  const wave = Math.sin(fr * 0.13 + wavePhase) * 5;
  ctx.strokeStyle = "#f0c090";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.quadraticCurveTo(22, -6 - wave, 31, -1 + wave);
  ctx.stroke();
  ctx.strokeStyle = "#6b4b28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(30, -26);
  ctx.stroke();
  ctx.fillStyle = "#0057b7";
  ctx.fillRect(31, -25, 26, 8);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(31, -17, 26, 8);
  ctx.restore();
}

function drawGreetingWindow(x, y, w, h, personIdx) {
  ctx.fillStyle = personIdx % 2 === 0 ? "#ffe8a8" : "#f4d7a1";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

  if (personIdx >= 0) {
    const shirts = ["#2f80ed", "#ff6b6b", "#27c7d9", "#ffd45c"];
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, w - 4, h - 4);
    ctx.clip();
    drawWindowPerson(
      x + w * 0.5,
      y + h * 0.78,
      0.72,
      personIdx * 1.7,
      shirts[personIdx % shirts.length],
    );
    ctx.restore();
  }
}

function drawGreetingBuildings(x, location) {
  const secretGrandpaVisible = Math.floor(fr / 480) % 3 === 1;
  const people = [
    [18, 102, 0],
    [138, 135, 1],
    [226, 82, 2],
    [18, 205, 3],
    [226, 188, 4],
  ];
  const windows = [
    [18, 102, 38, 42],
    [18, 155, 38, 42],
    [18, 205, 38, 42],
    [138, 135, 36, 40],
    [138, 188, 36, 40],
    [226, 82, 30, 38],
    [226, 135, 30, 38],
    [226, 188, 30, 38],
  ];

  for (const [wx, wy, ww, wh] of windows) {
    const person = people.find(
      ([px, py]) => Math.abs(px - wx) < 2 && Math.abs(py - wy) < 2,
    );
    drawGreetingWindow(x + wx, wy, ww, wh, person ? person[2] : -1);
  }
  if (secretGrandpaVisible) drawBalconyGrandpa(x + 138, 102, x * 0.01);

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x + 54, 58, 148, 30, 8);
    ctx.fill();
  } else {
    ctx.fillRect(x + 54, 58, 148, 30);
  }
  ctx.fillStyle = location === 1 ? "#6a2d1f" : "#1f4b8f";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    location === 1
      ? "\u0412\u043f\u0435\u0440\u0435\u0434, \u0410\u043d\u0434\u0440\u0456\u044e!"
      : "\u041f\u0440\u0438\u0432\u0456\u0442, \u0410\u043d\u0434\u0440\u0456\u044e!",
    x + 128,
    78,
  );
  ctx.textAlign = "left";
  ctx.restore();
}

function drawRealRoad(timePeriod) {
  const horizonY = GND - 22;
  const bottomY = H + 8;
  const cx = W / 2;
  const topHalf = 145;
  const bottomHalf = Math.max(W * 0.62, 390);
  const isNight = timePeriod === "time-night";
  const isLvivRoad = currentLocation === 1;

  const road = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  if (isLvivRoad) {
    road.addColorStop(0, isNight ? "#4b4036" : "#8b7a67");
    road.addColorStop(0.56, isNight ? "#372f2a" : "#6d5f50");
    road.addColorStop(1, isNight ? "#28221f" : "#4c4238");
  } else {
    road.addColorStop(0, isNight ? "#242a38" : "#3c4656");
    road.addColorStop(0.55, isNight ? "#171d2a" : "#2b3340");
    road.addColorStop(1, isNight ? "#0f1420" : "#1d2430");
  }
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(cx - topHalf, horizonY);
  ctx.lineTo(cx + topHalf, horizonY);
  ctx.lineTo(cx + bottomHalf, bottomY);
  ctx.lineTo(cx - bottomHalf, bottomY);
  ctx.closePath();
  ctx.fill();

  const shoulder = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  shoulder.addColorStop(0, isNight ? "#384055" : "#687487");
  shoulder.addColorStop(1, isNight ? "#242b3a" : "#3e4856");
  ctx.strokeStyle = shoulder;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - topHalf, horizonY);
  ctx.lineTo(cx - bottomHalf, bottomY);
  ctx.moveTo(cx + topHalf, horizonY);
  ctx.lineTo(cx + bottomHalf, bottomY);
  ctx.stroke();

  if (isLvivRoad) {
    const rowOffset = (bgOff * 1.45) % 34;
    for (let y = horizonY - 34 + rowOffset; y < bottomY + 34; y += 22) {
      const y2 = Math.min(bottomY, y + 18);
      if (y2 <= horizonY) continue;
      const t1 = Math.max(0, Math.min(1, (y - horizonY) / (bottomY - horizonY)));
      const t2 = Math.max(0, Math.min(1, (y2 - horizonY) / (bottomY - horizonY)));
      const half1 = topHalf + (bottomHalf - topHalf) * t1;
      const half2 = topHalf + (bottomHalf - topHalf) * t2;
      const stones = Math.max(8, Math.floor(10 + t1 * 15));
      for (let s = 0; s < stones; s++) {
        const fracA = -1 + (s / stones) * 2;
        const fracB = -1 + ((s + 1) / stones) * 2;
        const stagger = (Math.floor(y / 22) % 2) * (1 / stones);
        const a = Math.max(-1, Math.min(1, fracA + stagger));
        const b = Math.max(-1, Math.min(1, fracB + stagger));
        const tone = (s + Math.floor(y / 22)) % 3;
        ctx.fillStyle = tone === 0 ? "rgba(154,139,119,0.58)" : tone === 1 ? "rgba(105,93,80,0.52)" : "rgba(190,176,150,0.42)";
        ctx.strokeStyle = isNight ? "rgba(27,23,21,0.45)" : "rgba(59,50,43,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + half1 * a, y);
        ctx.lineTo(cx + half1 * b, y);
        ctx.lineTo(cx + half2 * b, y2);
        ctx.lineTo(cx + half2 * a, y2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.strokeStyle = isNight ? "rgba(44, 37, 32, 0.7)" : "rgba(80, 68, 58, 0.72)";
    ctx.lineWidth = 3;
    for (const laneGroove of [-1 / 3, 1 / 3]) {
      ctx.beginPath();
      ctx.moveTo(cx + topHalf * laneGroove, horizonY);
      ctx.lineTo(cx + bottomHalf * laneGroove, bottomY);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = isNight ? "rgba(255, 241, 168, 0.72)" : "rgba(255, 239, 154, 0.94)";
    ctx.lineCap = "round";
    const dashOffset = (bgOff * 2.4) % 72;
    for (let y = horizonY - 72 + dashOffset; y < bottomY + 72; y += 72) {
      const y2 = Math.min(bottomY, y + 32);
      if (y2 <= horizonY) continue;
      const t1 = Math.max(0, Math.min(1, (y - horizonY) / (bottomY - horizonY)));
      const t2 = Math.max(0, Math.min(1, (y2 - horizonY) / (bottomY - horizonY)));
      const half1 = topHalf + (bottomHalf - topHalf) * t1;
      const half2 = topHalf + (bottomHalf - topHalf) * t2;
      ctx.lineWidth = 3 + t1 * 3;
      for (const laneMark of [-1 / 3, 1 / 3]) {
        ctx.beginPath();
        ctx.moveTo(cx + half1 * laneMark, y);
        ctx.lineTo(cx + half2 * laneMark, y2);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt";
  }

  ctx.fillStyle = isLvivRoad
    ? isNight ? "rgba(255, 232, 188, 0.04)" : "rgba(255, 238, 199, 0.06)"
    : isNight ? "rgba(255, 255, 255, 0.035)" : "rgba(255, 255, 255, 0.055)";
  for (let i = 0; i < 85; i++) {
    const y = horizonY + ((i * 47 + bgOff * 2.1) % (bottomY - horizonY));
    const t = (y - horizonY) / (bottomY - horizonY);
    const half = topHalf + (bottomHalf - topHalf) * t;
    const x = cx - half + ((i * 83) % Math.max(1, half * 2));
    ctx.fillRect(x, y, 1 + t * 2, 1 + t * 1.4);
  }

  ctx.fillStyle = isNight ? "rgba(9, 12, 20, 0.35)" : "rgba(17, 22, 31, 0.18)";
  ctx.fillRect(0, GND - 3, W, 6);

  if (isStormWeather()) {
    const wet = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    wet.addColorStop(0, "rgba(118, 180, 210, 0.12)");
    wet.addColorStop(0.6, "rgba(125, 205, 255, 0.2)");
    wet.addColorStop(1, "rgba(190, 236, 255, 0.1)");
    ctx.fillStyle = wet;
    ctx.beginPath();
    ctx.moveTo(cx - topHalf, horizonY);
    ctx.lineTo(cx + topHalf, horizonY);
    ctx.lineTo(cx + bottomHalf, bottomY);
    ctx.lineTo(cx - bottomHalf, bottomY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(213, 244, 255, 0.28)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const y = horizonY + 24 + ((i * 53 + bgOff * 1.8) % (bottomY - horizonY));
      const t = (y - horizonY) / (bottomY - horizonY);
      const half = topHalf + (bottomHalf - topHalf) * t;
      const x = cx - half * 0.7 + ((i * 91) % Math.max(1, half * 1.4));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 28 + t * 36, y + 2);
      ctx.stroke();
    }
  }
}

function drawRoadRunTrack() {
  const roadY = ROAD_RUN_Y;
  const isLvivRoad = currentLocation === 1;
  ctx.save();
  ctx.fillStyle = isLvivRoad
    ? "rgba(255, 236, 190, 0.1)"
    : "rgba(160, 210, 255, 0.08)";
  ctx.beginPath();
  ctx.moveTo(56, roadY - 22);
  ctx.lineTo(W - 56, roadY - 22);
  ctx.lineTo(W - 18, roadY + 38);
  ctx.lineTo(18, roadY + 38);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = isLvivRoad
    ? "rgba(255, 220, 160, 0.2)"
    : "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 16]);
  for (const lane of LANES) {
    ctx.beginPath();
    ctx.moveTo(lane, roadY - 28);
    ctx.lineTo(lane, roadY + 42);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const activeX = LANES[pLane];
  const pulse = 0.45 + Math.sin(fr * 0.12) * 0.12;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = isLvivRoad ? "rgba(255, 211, 120, 0.18)" : "rgba(98, 214, 255, 0.18)";
  ctx.beginPath();
  ctx.ellipse(activeX, roadY + 10, 70, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRoadSign(x, y, label, kind = "direction") {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7b8794";
  ctx.fillRect(x - 2, y - 2, 4, 46);
  ctx.fillStyle = "#56616e";
  ctx.fillRect(x - 4, y + 38, 8, 8);

  if (kind === "repair") {
    ctx.fillStyle = "#f2c94c";
    ctx.beginPath();
    ctx.moveTo(x, y - 44);
    ctx.lineTo(x + 28, y - 16);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x - 28, y - 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1f2933";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#1f2933";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", x, y - 12);
    ctx.font = "bold 6px sans-serif";
    ctx.fillText(label, x, y + 1);
  } else if (kind === "school") {
    ctx.fillStyle = "#ffe8a3";
    ctx.beginPath();
    ctx.arc(x, y - 18, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f2933";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#1f2933";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - 15);
    ctx.fillStyle = "#2f80ed";
    ctx.fillRect(x - 8, y - 10, 6, 8);
    ctx.fillStyle = "#eb5757";
    ctx.fillRect(x + 2, y - 10, 6, 8);
  } else if (kind === "metro") {
    ctx.fillStyle = "#1f5fbf";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - 25, y - 42, 50, 32, 6) : ctx.rect(x - 25, y - 42, 50, 32);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("M", x, y - 19);
    ctx.font = "bold 7px sans-serif";
    ctx.fillText(label, x, y - 34);
  } else {
    ctx.fillStyle = "#e8f4ff";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - 34, y - 41, 68, 27, 5) : ctx.rect(x - 34, y - 41, 68, 27);
    ctx.fill();
    ctx.strokeStyle = "#2f80ed";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#1f2933";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - 23);
  }

  ctx.restore();
}

function drawTrafficLight(x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 18, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b6673";
  ctx.fillRect(x - 3, y - 54, 6, 58);
  ctx.fillStyle = "#1c2430";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x - 12, y - 83, 24, 42, 5) : ctx.rect(x - 12, y - 83, 24, 42);
  ctx.fill();
  const active = Math.floor(fr / 95) % 3;
  const lights = [
    ["#eb5757", y - 74],
    ["#f2c94c", y - 62],
    ["#27ae60", y - 50],
  ];
  lights.forEach(([color, cy], idx) => {
    ctx.fillStyle = idx === active ? color : "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(x, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawRoadsideSigns() {
  const locLabel = currentLocation === 1 ? "\u041b\u044c\u0432\u0456\u0432" : "\u041a\u0438\u0457\u0432";
  const signs = [
    { label: locLabel, kind: "direction", y: GND - 2, side: -1, gap: 0 },
    { label: "\u0428\u043a\u043e\u043b\u0430", kind: "school", y: GND - 4, side: 1, gap: 210 },
    { label: "\u0420\u0435\u043c\u043e\u043d\u0442", kind: "repair", y: GND - 1, side: -1, gap: 420 },
    { label: "\u041c\u0435\u0442\u0440\u043e", kind: "metro", y: GND - 5, side: 1, gap: 620 },
  ];
  const off = (bgOff * 0.62) % 820;
  for (const sign of signs) {
    const x = W + 120 + sign.gap - off;
    if (x < -90 || x > W + 100) continue;
    drawRoadSign(x + sign.side * 18, sign.y, sign.label, sign.kind);
  }

  const lightX = W + 360 - ((bgOff * 0.54) % 920);
  if (lightX > -70 && lightX < W + 80) drawTrafficLight(lightX, GND - 1);
}

function drawLvivTram() {
  if (currentLocation !== 1) return;
  const railY1 = GND + 18;
  const railY2 = GND + 38;
  ctx.save();
  ctx.strokeStyle = "rgba(60,50,42,0.68)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, railY1);
  ctx.lineTo(W, railY1);
  ctx.moveTo(0, railY2);
  ctx.lineTo(W, railY2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(220,205,176,0.4)";
  ctx.lineWidth = 1.5;
  for (let x = -40 + ((bgOff * 1.2) % 56); x < W + 60; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, railY1 - 5);
    ctx.lineTo(x + 18, railY2 + 6);
    ctx.stroke();
  }

  const tramX = W + 190 - ((bgOff * 0.36) % (W + 430));
  const tramY = GND - 118;
  if (tramX < -260 || tramX > W + 120) {
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(tramX + 85, GND + 5, 104, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#34302b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tramX + 86, tramY - 18);
  ctx.lineTo(tramX + 130, tramY - 58);
  ctx.lineTo(tramX + 158, tramY - 58);
  ctx.stroke();

  ctx.fillStyle = "#8e2f24";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(tramX, tramY, 184, 104, 12);
  else ctx.fillRect(tramX, tramY, 184, 104);
  ctx.fill();
  ctx.fillStyle = "#f0d6a4";
  ctx.fillRect(tramX + 8, tramY + 10, 168, 30);
  ctx.fillStyle = "#b94a32";
  ctx.fillRect(tramX + 7, tramY + 68, 170, 14);
  ctx.strokeStyle = "#5c201a";
  ctx.lineWidth = 3;
  ctx.strokeRect(tramX + 2, tramY + 2, 180, 100);

  ctx.fillStyle = "#182b35";
  for (let i = 0; i < 5; i++) {
    const wx = tramX + 14 + i * 31;
    ctx.fillRect(wx, tramY + 17, 24, 28);
    ctx.fillStyle = "rgba(141,214,236,0.78)";
    ctx.fillRect(wx + 3, tramY + 20, 18, 20);
    ctx.fillStyle = "#182b35";
  }

  ctx.fillStyle = "#41231f";
  ctx.fillRect(tramX + 78, tramY + 47, 28, 50);
  ctx.strokeStyle = "#f0d6a4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tramX + 92, tramY + 48);
  ctx.lineTo(tramX + 92, tramY + 96);
  ctx.stroke();

  ctx.fillStyle = "#fff3a6";
  ctx.beginPath();
  ctx.arc(tramX + 16, tramY + 84, 6, 0, Math.PI * 2);
  ctx.arc(tramX + 168, tramY + 84, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0d6a4";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u2116 7", tramX + 152, tramY + 62);
  ctx.fillStyle = "#ffd95c";
  ctx.fillRect(tramX + 54, tramY - 6, 72, 12);
  ctx.fillStyle = "#5c201a";
  ctx.font = "bold 8px sans-serif";
  ctx.fillText("\u041b\u042c\u0412\u0406\u0412", tramX + 90, tramY + 3);
  ctx.textAlign = "left";

  ctx.fillStyle = "#2b2520";
  ctx.beginPath();
  ctx.arc(tramX + 44, tramY + 102, 12, 0, Math.PI * 2);
  ctx.arc(tramX + 138, tramY + 102, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#73675a";
  ctx.beginPath();
  ctx.arc(tramX + 44, tramY + 102, 5, 0, Math.PI * 2);
  ctx.arc(tramX + 138, tramY + 102, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLvivCoffeeScene() {
  if (currentLocation !== 1) return;
  const off = (bgOff * 0.2) % 520;
  for (let base = -520; base < W + 520; base += 520) {
    const x = base - off;
    const y = GND - 92;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(x + 96, GND + 4, 120, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#6d3f2b";
    ctx.fillRect(x + 18, y - 18, 162, 92);
    ctx.fillStyle = "#9c5f3f";
    ctx.fillRect(x + 24, y - 12, 150, 18);
    ctx.fillStyle = "#f4d19c";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 49, y - 30, 100, 24, 6);
    else ctx.fillRect(x + 49, y - 30, 100, 24);
    ctx.fill();
    ctx.fillStyle = "#5c2f1f";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u041a\u0410\u0412\u0410", x + 99, y - 13);
    ctx.textAlign = "left";

    ctx.fillStyle = "#263840";
    for (let w = 0; w < 3; w++) {
      const wx = x + 36 + w * 42;
      ctx.fillRect(wx, y + 16, 28, 34);
      ctx.fillStyle = "rgba(250,220,140,0.78)";
      ctx.fillRect(wx + 3, y + 19, 22, 26);
      ctx.fillStyle = "#263840";
    }

    ctx.fillStyle = "#4a2b1e";
    ctx.fillRect(x + 82, y + 36, 34, 38);
    ctx.fillStyle = "#7d4a2f";
    ctx.fillRect(x + 86, y + 41, 26, 33);
    ctx.fillStyle = "#f4d19c";
    ctx.beginPath();
    ctx.arc(x + 108, y + 58, 2, 0, Math.PI * 2);
    ctx.fill();

    const tableY = GND - 16;
    ctx.strokeStyle = "#3f2a1f";
    ctx.lineWidth = 3;
    for (const tx of [x + 36, x + 160]) {
      ctx.beginPath();
      ctx.moveTo(tx, tableY - 18);
      ctx.lineTo(tx, tableY + 2);
      ctx.moveTo(tx - 15, tableY + 2);
      ctx.lineTo(tx + 15, tableY + 2);
      ctx.stroke();
      ctx.fillStyle = "#8f5a38";
      ctx.fillRect(tx - 19, tableY - 23, 38, 6);
      ctx.fillStyle = "#f4f0df";
      ctx.fillRect(tx - 5, tableY - 35, 10, 10);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      const steam = Math.sin(fr * 0.08 + tx * 0.02) * 2;
      ctx.beginPath();
      ctx.moveTo(tx - 4, tableY - 39);
      ctx.quadraticCurveTo(tx - 9 + steam, tableY - 49, tx - 2, tableY - 58);
      ctx.moveTo(tx + 4, tableY - 39);
      ctx.quadraticCurveTo(tx + 10 - steam, tableY - 48, tx + 2, tableY - 56);
      ctx.stroke();
      ctx.strokeStyle = "#3f2a1f";
      ctx.lineWidth = 3;
    }

    for (const lx of [x - 32, x + 220]) {
      ctx.strokeStyle = "#15171c";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lx, GND);
      ctx.lineTo(lx, GND - 92);
      ctx.stroke();
      ctx.fillStyle = "#15171c";
      ctx.beginPath();
      ctx.arc(lx, GND - 95, 11, Math.PI, 0);
      ctx.fill();
      const lampGlow = ctx.createRadialGradient(lx, GND - 82, 0, lx, GND - 82, 24);
      lampGlow.addColorStop(0, "rgba(255,218,120,0.72)");
      lampGlow.addColorStop(1, "rgba(255,218,120,0)");
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(lx, GND - 82, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd66d";
      ctx.beginPath();
      ctx.arc(lx, GND - 82, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBG() {
  if (secretRoute && secretRoute.active && !secretRoute.entering) {
    drawSecretRouteBackground();
    return;
  }
  const lv = getLvl();
  const timePeriod = drawTimeOfDaySky(lv);
  drawStormSkyOverlay();

  const off = (bgOff * 0.25) % 400;
  for (let bx = -400; bx < W + 400; bx += 400) {
    const x = bx - off;
    ctx.fillStyle = lv.bldA;
    ctx.fillRect(x, 80, 100, H - 130);
    ctx.fillStyle = lv.bldB;
    ctx.fillRect(x + 120, 110, 70, H - 160);
    ctx.fillStyle = lv.bldC;
    ctx.fillRect(x + 210, 60, 50, H - 110);
    drawGreetingBuildings(x, lv.loc);
  }

  drawLvivCoffeeScene();
  drawRealRoad(timePeriod);
  drawRoadRunTrack();
  drawLvivTram();
  drawRoadsideSigns();
}

function drawSecretRouteBackground() {
  const route = secretRoute;
  if (!route) return;
  const off = (bgOff * 0.7) % 160;

  if (route.id === "metro") {
    const tunnel = ctx.createLinearGradient(0, 0, 0, H);
    tunnel.addColorStop(0, "#0b1018");
    tunnel.addColorStop(0.42, "#17232c");
    tunnel.addColorStop(1, "#080b10");
    ctx.fillStyle = tunnel;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#24323b";
    ctx.fillRect(0, 58, W, 207);
    ctx.fillStyle = "#19242d";
    ctx.fillRect(0, 58, W, 24);
    ctx.fillStyle = "#2f9b68";
    ctx.fillRect(0, 82, W, 5);
    for (let x = -160 - off; x < W + 160; x += 160) {
      ctx.fillStyle = "#d8d0b8";
      ctx.fillRect(x, 86, 104, 108);
      ctx.fillStyle = "#1d5672";
      ctx.fillRect(x + 12, 99, 80, 51);
      ctx.fillStyle = "#9ed8ef";
      ctx.fillRect(x + 18, 106, 68, 14);
      ctx.fillStyle = "#0c2030";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u041a\u0418\u0407\u0412", x + 52, 117);
      ctx.textAlign = "left";
      ctx.fillStyle = "#f2c94c";
      ctx.fillRect(x + 18, 207, 70, 7);
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.fillRect(x + 12, 158, 80, 4);
      ctx.fillRect(x + 12, 169, 80, 4);
    }
    for (let x = -90 - ((bgOff * 1.4) % 260); x < W + 260; x += 260) {
      ctx.fillStyle = "#26353f";
      ctx.fillRect(x, GND - 66, 210, 46);
      ctx.fillStyle = "#111820";
      ctx.fillRect(x + 16, GND - 58, 54, 26);
      ctx.fillRect(x + 82, GND - 58, 54, 26);
      ctx.fillRect(x + 148, GND - 58, 42, 26);
      ctx.fillStyle = "#2f9b68";
      ctx.fillRect(x + 8, GND - 23, 194, 5);
      ctx.fillStyle = "#ffd95c";
      ctx.fillRect(x + 182, GND - 49, 10, 10);
    }
    ctx.fillStyle = "#101419";
    ctx.fillRect(0, GND - 8, W, H - GND + 8);
    ctx.fillStyle = "#1b2229";
    for (let s = 0; s < 9; s++) {
      const sx = -80 + ((bgOff * 1.2 + s * 90) % (W + 160));
      ctx.fillRect(sx, GND + 40, 55, 5);
    }
    ctx.strokeStyle = "#8b969d";
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(LANES[i] - 35, GND + 18);
      ctx.lineTo(LANES[i] - 35, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(LANES[i] + 35, GND + 18);
      ctx.lineTo(LANES[i] + 35, H);
      ctx.stroke();
    }
  } else if (route.id === "roofs") {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#254b70");
    sky.addColorStop(1, "#f09b61");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (let x = -180 - off; x < W + 180; x += 180) {
      const h = 80 + ((x / 180) & 1) * 35;
      ctx.fillStyle = "#27313d";
      ctx.fillRect(x, GND - h, 145, h);
      ctx.fillStyle = "#ffd66b";
      for (let wy = GND - h + 18; wy < GND - 18; wy += 25)
        for (let wx = x + 15; wx < x + 130; wx += 28)
          ctx.fillRect(wx, wy, 10, 9);
      ctx.fillStyle = "#354555";
      ctx.fillRect(x + 48, GND - h - 28, 38, 28);
    }
    ctx.fillStyle = "#18222d";
    ctx.fillRect(0, GND - 8, W, H - GND + 8);
    ctx.fillStyle = "#526170";
    for (let i = 0; i < 3; i++)
      ctx.fillRect(LANES[i] - 42, GND - 4, 84, H - GND + 4);
  } else {
    ctx.fillStyle = "#171425";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#30294a";
    ctx.fillRect(0, 45, W, 220);
    for (let x = -120 - off; x < W + 120; x += 120) {
      ctx.fillStyle = "#51486b";
      ctx.fillRect(x, 68, 16, 190);
      ctx.fillStyle = "#e8d36c";
      ctx.beginPath();
      ctx.arc(x + 8, 78, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#12101c";
    ctx.fillRect(0, GND - 8, W, H - GND + 8);
    ctx.fillStyle = "#29243a";
    for (let i = 0; i < 3; i++)
      ctx.fillRect(LANES[i] - 42, GND - 4, 84, H - GND + 4);
  }

  ctx.fillStyle = route.color;
  ctx.fillRect(0, GND - 7, W, 7);
}

function drawSecretRouteEntrance() {
  if (
    !secretRoute ||
    !secretRoute.offered ||
    (secretRoute.active && !secretRoute.entering) ||
    secretRoute.completed ||
    secretRoute.missed
  )
    return;

  const x = secretRoute.entering
    ? LANES[secretRoute.lane]
    : secretRoute.entranceX;
  const y = GND;
  const near =
    pLane === secretRoute.lane && Math.abs(x - LANES[pLane]) <= 72;
  ctx.save();
  ctx.globalAlpha = Math.max(0.25, Math.min(1, (x + 80) / 150));
  ctx.shadowColor = secretRoute.color;
  ctx.shadowBlur = near ? 22 : 10;
  ctx.fillStyle = "#343a40";
  ctx.beginPath();
  ctx.moveTo(x - 52, y);
  ctx.lineTo(x - 52, y - 72);
  ctx.arc(x, y - 72, 52, Math.PI, 0);
  ctx.lineTo(x + 52, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = near ? "#ffffff" : secretRoute.color;
  ctx.lineWidth = near ? 6 : 4;
  ctx.stroke();
  const tunnelGlow = ctx.createRadialGradient(
    x,
    y - 58,
    4,
    x,
    y - 58,
    45,
  );
  tunnelGlow.addColorStop(0, "rgba(20,26,35,1)");
  tunnelGlow.addColorStop(0.65, "rgba(5,8,13,0.98)");
  tunnelGlow.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = tunnelGlow;
  ctx.beginPath();
  ctx.moveTo(x - 42, y);
  ctx.lineTo(x - 42, y - 69);
  ctx.arc(x, y - 69, 42, Math.PI, 0);
  ctx.lineTo(x + 42, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 3; ring++) {
    const inset = 9 + ring * 10;
    ctx.beginPath();
    ctx.arc(x, y - 65, 45 - inset, Math.PI, 0);
    ctx.stroke();
  }
  ctx.fillStyle = "#1e252c";
  for (let step = 0; step < 5; step++)
    ctx.fillRect(x - 34 + step * 4, y - 12 + step * 3, 68 - step * 8, 3);
  if (secretRoute.id === "metro") {
    ctx.fillStyle = "#10241e";
    ctx.fillRect(x - 62, y - 108, 124, 26);
    ctx.strokeStyle = near ? "#ffffff" : "#2f9b68";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 62, y - 108, 124, 26);
    ctx.fillStyle = "#2f9b68";
    ctx.beginPath();
    ctx.arc(x - 44, y - 95, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("M", x - 44, y - 90);
    ctx.fillStyle = "#e8fff4";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("\u041c\u0415\u0422\u0420\u041e", x + 15, y - 91);
    ctx.fillStyle = "#2b3338";
    ctx.fillRect(x - 48, y - 5, 96, 5);
    ctx.fillStyle = "rgba(47,155,104,0.35)";
    ctx.fillRect(x - 38, y - 33, 76, 4);
    ctx.fillRect(x - 30, y - 47, 60, 4);
  }
  ctx.fillStyle = secretRoute.color;
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 70);
  ctx.lineTo(x + 18, y - 70);
  ctx.lineTo(x, y - 48);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    secretRoute.entering
      ? "\u0422\u0423\u041d\u0415\u041b\u042c"
      : near
      ? "\u25bc \u0423\u0412\u0406\u0419\u0422\u0418"
      : secretRoute.name.toUpperCase(),
    x,
    y - 88,
  );
  ctx.textAlign = "left";
  ctx.restore();
}

function drawSecretTunnelForeground() {
  if (!secretRoute || !secretRoute.entering) return;
  const x = LANES[secretRoute.lane];
  const progress = Math.min(secretRoute.transitionTimer / 48, 1);
  ctx.save();
  const opening = 150 * (1 - progress * 0.82);
  const vignette = ctx.createRadialGradient(
    x,
    GND - 62,
    Math.max(8, opening * 0.22),
    x,
    GND - 62,
    Math.max(34, opening),
  );
  vignette.addColorStop(0, `rgba(0,0,0,${progress * 0.12})`);
  vignette.addColorStop(0.62, `rgba(0,0,0,${0.32 + progress * 0.38})`);
  vignette.addColorStop(1, `rgba(0,0,0,${0.82 + progress * 0.18})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.fillStyle = `rgba(0,0,0,${Math.max(0, (progress - 0.72) / 0.28)})`;
  ctx.fillRect(0, 0, W, H);
}

function drawSecretRouteHUD() {
  if (!secretRoute || !secretRoute.active || secretRoute.entering) return;
  const progress = Math.min(secretRoute.timer / SECRET_ROUTE_DURATION, 1);
  ctx.fillStyle = "rgba(5,8,15,0.76)";
  ctx.fillRect(W / 2 - 132, 30, 264, 36);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `\u0421\u0415\u041a\u0420\u0415\u0422\u041d\u0418\u0419 \u041c\u0410\u0420\u0428\u0420\u0423\u0422: ${secretRoute.name.toUpperCase()}`,
    W / 2,
    45,
  );
  ctx.fillStyle = "#27313c";
  ctx.fillRect(W / 2 - 112, 52, 224, 7);
  ctx.fillStyle = secretRoute.color;
  ctx.fillRect(W / 2 - 112, 52, 224 * progress, 7);
  ctx.textAlign = "left";
}

function drawFinishLine() {
  if (!finishActive) return;
  const fx = finishX;
  drawFinishSchool(fx + 142);
  ctx.fillStyle = "#fff";
  ctx.fillRect(fx - 3, GND - 120, 6, 120);
  ctx.fillStyle = "#fff";
  ctx.fillRect(fx + 97, GND - 120, 6, 120);
  const sq = 12;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#fff" : "#000";
      ctx.fillRect(fx - 3 + col * sq, GND - 120 + row * sq, sq, sq);
    }
  }
  const ribbonY = GND - 122;
  ctx.fillStyle = "#ff0044";
  ctx.fillRect(fx - 3, ribbonY, 106, 8);
  const wave = Math.sin(fr * 0.08) * 4;
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FINISH", fx + 48, GND - 128 + wave);
  ctx.textAlign = "left";
  const flagColors = ["#ffd700", "#0057b7"];
  for (let fi = 0; fi < 2; fi++) {
    const px = fx + (fi === 0 ? -3 : 97),
      py = GND - 120;
    ctx.fillStyle = "#888";
    ctx.fillRect(px - 2, py - 30, 4, 30);
    ctx.fillStyle = flagColors[0];
    ctx.fillRect(px + 2, py - 28, 18, 8);
    ctx.fillStyle = flagColors[1];
    ctx.fillRect(px + 2, py - 20, 18, 8);
  }
}

function drawRobotronPreview(c, cx, by) {
  c.save();
  c.translate(cx, by);
  c.scale(0.82, 0.82);
  c.translate(-cx, -by);
  c.shadowColor = "#20f0d0";
  c.shadowBlur = 5;
  c.strokeStyle = "#20f0d0";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx - 7, by - 15);
  c.lineTo(cx - 9, by - 2);
  c.moveTo(cx + 7, by - 15);
  c.lineTo(cx + 9, by - 2);
  c.stroke();
  c.fillStyle = "#101b27";
  c.fillRect(cx - 13, by - 43, 26, 29);
  c.fillStyle = "#1c4050";
  c.fillRect(cx - 10, by - 39, 20, 20);
  c.fillStyle = "#ff3df2";
  c.fillRect(cx - 7, by - 34, 5, 5);
  c.fillStyle = "#20f0d0";
  c.fillRect(cx + 2, by - 34, 5, 5);
  c.fillStyle = "#ffd45c";
  c.fillRect(cx - 5, by - 24, 10, 3);
  c.strokeStyle = "#20f0d0";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(cx - 12, by - 37);
  c.lineTo(cx - 18, by - 21);
  c.moveTo(cx + 12, by - 37);
  c.lineTo(cx + 18, by - 21);
  c.stroke();
  c.fillStyle = "#132c3a";
  c.fillRect(cx - 12, by - 59, 24, 16);
  c.fillStyle = "#07141d";
  c.fillRect(cx - 8, by - 55, 16, 7);
  c.fillStyle = "#20f0d0";
  c.fillRect(cx - 6, by - 53, 4, 3);
  c.fillStyle = "#ff3df2";
  c.fillRect(cx + 2, by - 53, 4, 3);
  c.strokeStyle = "#20f0d0";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx, by - 59);
  c.lineTo(cx, by - 67);
  c.stroke();
  c.fillStyle = "#ff3df2";
  c.beginPath();
  c.arc(cx, by - 69, 3, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  c.fillStyle = "#20f0d0";
  c.fillRect(cx - 13, by - 2, 9, 3);
  c.fillRect(cx + 4, by - 2, 9, 3);
  c.restore();
}

function drawFinishSchool(x) {
  const isLviv = currentLocation === 1;
  const schoolY = GND - 154;
  const schoolW = 214;
  const schoolH = 154;

  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(-1, 1);
  ctx.translate(-x, 0);
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(x + schoolW / 2, GND + 5, 122, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isLviv ? "#8f4b36" : "#e4d8b8";
  ctx.fillRect(x, schoolY, schoolW, schoolH);
  ctx.fillStyle = isLviv ? "#713727" : "#c7b68c";
  ctx.fillRect(x - 14, schoolY + 38, 34, schoolH - 38);
  ctx.fillRect(x + schoolW - 20, schoolY + 38, 34, schoolH - 38);

  ctx.fillStyle = isLviv ? "#4b2923" : "#6f785e";
  ctx.beginPath();
  ctx.moveTo(x - 10, schoolY + 3);
  ctx.lineTo(x + schoolW / 2, schoolY - 42);
  ctx.lineTo(x + schoolW + 10, schoolY + 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isLviv ? "#d7b36a" : "#ffffff";
  ctx.fillRect(x + 24, schoolY + 18, schoolW - 48, 29);
  ctx.fillStyle = isLviv ? "#532d24" : "#234f78";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    isLviv
      ? "\u041b\u042c\u0412\u0406\u0412\u0421\u042c\u041a\u0410 \u0428\u041a\u041e\u041b\u0410"
      : "\u041a\u0418\u0407\u0412\u0421\u042c\u041a\u0410 \u0428\u041a\u041e\u041b\u0410",
    x + schoolW / 2,
    schoolY + 38,
  );

  const windowColor = isLviv ? "#83b8c9" : "#78acd0";
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const wx = x + 22 + col * 38;
      const wy = schoolY + 58 + row * 37;
      ctx.fillStyle = "#f1d36a";
      ctx.fillRect(wx - 2, wy - 2, 25, 25);
      ctx.fillStyle = windowColor;
      ctx.fillRect(wx, wy, 21, 21);
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + 10, wy);
      ctx.lineTo(wx + 10, wy + 21);
      ctx.moveTo(wx, wy + 10);
      ctx.lineTo(wx + 21, wy + 10);
      ctx.stroke();
    }
  }

  const doorX = x + schoolW / 2;
  const doorOpen =
    gameState === "schoolEnter"
      ? Math.min(schoolExitTimer / 30, 1)
      : 0;
  ctx.fillStyle = "#101419";
  ctx.fillRect(doorX - 20, GND - 45, 40, 45);
  ctx.fillStyle = isLviv ? "#40251f" : "#315778";
  ctx.fillRect(doorX - 20 - doorOpen * 16, GND - 45, 19, 45);
  ctx.fillRect(doorX + 1 + doorOpen * 16, GND - 45, 19, 45);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(doorX - 20 - doorOpen * 16, GND - 45, 19, 45);
  ctx.strokeRect(doorX + 1 + doorOpen * 16, GND - 45, 19, 45);
  ctx.fillStyle = "#f3c84d";
  ctx.beginPath();
  ctx.arc(doorX + 11 + doorOpen * 16, GND - 22, 2, 0, Math.PI * 2);
  ctx.fill();

  const flagX = x + schoolW - 32;
  ctx.fillStyle = "#777";
  ctx.fillRect(flagX, schoolY - 38, 3, 39);
  ctx.fillStyle = "#0057b7";
  ctx.fillRect(flagX + 3, schoolY - 36, 30, 10);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(flagX + 3, schoolY - 26, 30, 10);

  ctx.fillStyle = "#3d7a39";
  ctx.beginPath();
  ctx.arc(x + 7, GND - 14, 21, 0, Math.PI * 2);
  ctx.arc(x + schoolW - 5, GND - 14, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.restore();
}

function drawKyivBoss() {
  if (!bossActive && !bossDefeated) return;
  const transform = Math.min(bossTransform / 120, 1);
  const x = bossX;
  const bodyY = -50 - Math.max(0, transform - 0.58) * 88;

  ctx.save();
  ctx.translate(x, GND);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 7, 72, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (transform < 0.58) {
    const unfold = transform / 0.58;
    ctx.translate(0, -24 - unfold * 16);
    ctx.scale(1, 1 - unfold * 0.22);
    ctx.fillStyle = "#4b5140";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-70, -54, 140, 58, 10);
    else ctx.fillRect(-70, -54, 140, 58);
    ctx.fill();
    ctx.fillStyle = "#252d29";
    ctx.fillRect(-48, -47, 58, 27);
    ctx.fillStyle = "#61706d";
    ctx.fillRect(17, -48, 36, 25);
    ctx.fillStyle = "#202721";
    ctx.fillRect(52, -18, 18, 17);
    ctx.fillStyle = bossFlash > 0 ? "#fff7b2" : "#e8ddbd";
    ctx.fillRect(54, -14, 12, 8);
    ctx.fillStyle = "#1a1d19";
    ctx.beginPath();
    ctx.arc(-43, 4, 15, 0, Math.PI * 2);
    ctx.arc(43, 4, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#536052";
    ctx.beginPath();
    ctx.arc(-43, 4, 7, 0, Math.PI * 2);
    ctx.arc(43, 4, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const rise = Math.min((transform - 0.58) / 0.42, 1);
    const spread = rise * 24;
    ctx.strokeStyle = "#2a3028";
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-22, bodyY + 40);
    ctx.lineTo(-31 - spread * 0.3, -8);
    ctx.moveTo(22, bodyY + 40);
    ctx.lineTo(31 + spread * 0.3, -8);
    ctx.stroke();
    ctx.fillStyle = "#141814";
    ctx.fillRect(-53, -18, 35, 18);
    ctx.fillRect(18, -18, 35, 18);
    ctx.strokeStyle = "#48513f";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(-45, bodyY + 5);
    ctx.lineTo(-72 - spread, bodyY + 42);
    ctx.moveTo(45, bodyY + 5);
    ctx.lineTo(72 + spread, bodyY + 42);
    ctx.stroke();
    ctx.fillStyle = "#1d221c";
    ctx.fillRect(-101 - spread, bodyY + 34, 35, 19);
    ctx.fillRect(66 + spread, bodyY + 34, 35, 19);
    ctx.fillStyle = "#4b5140";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-48, bodyY - 20, 96, 72, 9);
    else ctx.fillRect(-48, bodyY - 20, 96, 72);
    ctx.fill();
    ctx.fillStyle = "#252d29";
    ctx.fillRect(-36, bodyY - 12, 72, 28);
    ctx.strokeStyle = "#66715d";
    ctx.lineWidth = 3;
    for (let grille = -28; grille <= 28; grille += 8) {
      ctx.beginPath();
      ctx.moveTo(grille, bodyY + 22);
      ctx.lineTo(grille, bodyY + 43);
      ctx.stroke();
    }
    ctx.fillStyle = "#384239";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-28, bodyY - 61, 56, 43, 8);
    else ctx.fillRect(-28, bodyY - 61, 56, 43);
    ctx.fill();
    ctx.fillStyle = "#111713";
    ctx.fillRect(-20, bodyY - 50, 40, 16);
    ctx.fillStyle = bossFlash > 0 ? "#fff" : "#ff5a25";
    ctx.shadowColor = "#ff5a25";
    ctx.shadowBlur = 10;
    ctx.fillRect(-15, bodyY - 46, 10, 7);
    ctx.fillRect(5, bodyY - 46, 10, 7);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#171b17";
    ctx.fillRect(-16, bodyY - 29, 32, 6);
    ctx.fillStyle = "#77806d";
    ctx.fillRect(-10, bodyY - 27, 20, 2);
  }

  if (bossActive) {
    const hpWidth = 180;
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(-hpWidth / 2, -190, hpWidth, 13);
    ctx.fillStyle = bossHp > 5 ? "#e14b32" : "#ffcf33";
    ctx.fillRect(-hpWidth / 2 + 2, -188, (hpWidth - 4) * (bossHp / BOSS_MAX_HP), 9);
    ctx.strokeStyle = "#d7d9d0";
    ctx.lineWidth = 1;
    ctx.strokeRect(-hpWidth / 2, -190, hpWidth, 13);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ТРАНСФОРМЕР-ФУРГОН", 0, -198);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

function drawConfetti() {
  confetti = confetti.filter((c) => {
    c.x += c.vx;
    c.y += c.vy;
    c.rot += c.rv;
    c.life--;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = Math.min(1, c.life / 20);
    ctx.fillStyle = c.col;
    ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
    ctx.restore();
    ctx.globalAlpha = 1;
    return c.life > 0;
  });
}

function getSkin() {
  return SKINS_BASE.find((s) => s.id === selectedSkin) || SKINS_BASE[0];
}

function drawAndriiWeapon(x, y, slide = false) {
  const weapon = getAndriiWeapon(currentLevel, currentLocation);
  if (!weapon) return;
  const recoil = fireCooldown > 10 ? Math.sin(fr * 0.9) * 3 : 0;
  const baseX = slide ? x - 2 : x + 9;
  const baseY = slide ? y - 19 : y - 31;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(slide ? -0.08 : -0.12);

  if (weapon === "bossblaster") {
    ctx.fillStyle = "#153866";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-8, -8, 35, 16, 5);
    else ctx.fillRect(-8, -8, 35, 16);
    ctx.fill();
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(20 + recoil, -3, 30, 6);
    ctx.fillStyle = "#ff3c64";
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    if (fireCooldown > 5) {
      ctx.fillStyle = "rgba(0,229,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(51 + recoil, -7);
      ctx.lineTo(80 + recoil, 0);
      ctx.lineTo(51 + recoil, 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (weapon === "minigun") {
    const spin = fr * 0.45;
    ctx.fillStyle = "#15181d";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-10, -11, 36, 22, 5);
    else ctx.fillRect(-10, -11, 36, 22);
    ctx.fill();

    ctx.fillStyle = "#303842";
    ctx.fillRect(-5, -7, 24, 14);
    ctx.fillStyle = "#6b5a2e";
    ctx.fillRect(4, 8, 18, 16);
    ctx.fillStyle = "#d7b94a";
    for (let i = 0; i < 6; i++) ctx.fillRect(6 + i * 3, 10, 2, 12);

    for (let i = 0; i < 5; i++) {
      const off = Math.sin(spin + i * 1.26) * 5;
      ctx.strokeStyle = i % 2 === 0 ? "#08090b" : "#424b55";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18 + recoil, off);
      ctx.lineTo(70 + recoil, off - 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#222832";
    ctx.beginPath();
    ctx.arc(18, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#59636f";
    ctx.beginPath();
    ctx.arc(18, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    if (fireCooldown > 7) {
      ctx.fillStyle = "rgba(255,210,70,0.95)";
      ctx.beginPath();
      ctx.moveTo(74 + recoil, -2);
      ctx.lineTo(112 + recoil, -17);
      ctx.lineTo(101 + recoil, -2);
      ctx.lineTo(118 + recoil, 9);
      ctx.lineTo(75 + recoil, 7);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  ctx.fillStyle = "#1b1f25";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-8, -8, 30, 16, 4);
  else ctx.fillRect(-8, -8, 30, 16);
  ctx.fill();

  ctx.fillStyle = "#39424c";
  ctx.fillRect(-4, -5, 22, 4);
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(-18, -5, 14, 10);

  ctx.strokeStyle = "#08090b";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(18 + recoil, -1);
  ctx.lineTo(62 + recoil, -4);
  ctx.stroke();

  ctx.strokeStyle = "#4f5964";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20 + recoil, 3);
  ctx.lineTo(58 + recoil, 0);
  ctx.stroke();

  ctx.fillStyle = "#6b5a2e";
  ctx.fillRect(6, 7, 16, 15);
  ctx.fillStyle = "#d7b94a";
  for (let i = 0; i < 5; i++) ctx.fillRect(8 + i * 3, 9, 2, 11);

  ctx.strokeStyle = "#d7b94a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const bx = -8 - i * 4;
    const by = 12 + Math.sin(i + fr * 0.2) * 2;
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();

  if (fireCooldown > 10) {
    ctx.fillStyle = "rgba(255,210,70,0.95)";
    ctx.beginPath();
    ctx.moveTo(65 + recoil, -4);
    ctx.lineTo(92 + recoil, -17);
    ctx.lineTo(84 + recoil, -3);
    ctx.lineTo(98 + recoil, 8);
    ctx.lineTo(66 + recoil, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,180,0.65)";
    ctx.beginPath();
    ctx.arc(68 + recoil, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer() {
  const sk = getSkin();
  let x = LANES[pLane],
    y = pY;
  if (gameState !== "schoolEnter" && !pSlide) {
    y += ROAD_RUN_Y - GND;
  }
  ctx.save();
  if (secretRoute && secretRoute.entering) {
    const progress = Math.min(secretRoute.transitionTimer / 48, 1);
    const scale = 1 - progress * 0.72;
    ctx.translate(x, y - progress * 70);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
  }
  if (gameState === "schoolEnter") {
    const progress = Math.min(schoolExitTimer / 94, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const doorX = finishX + 249;
    const startX = LANES[pLane];
    x = startX + (doorX - startX) * ease;
    y = GND - Math.sin(Math.min(progress, 0.8) * Math.PI * 5) * 3;
    const scale = 1 - Math.max(0, progress - 0.48) * 0.68;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    ctx.globalAlpha = progress > 0.78 ? Math.max(0, (1 - progress) / 0.22) : 1;
  }
  const al = inv > 0 ? (Math.sin(fr * 0.5) > 0 ? 0.3 : 1) : 1;
  ctx.globalAlpha *= al;
  if (sk.id === "robotron_neon") {
    drawNeonRobotron(x, y);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  const onRoad = y >= GND - 1 && !pSlide;
  const speedLevel = getPlayerUpgradeLevel("speed");
  const footY = y;
  const walkPhase = fr * (0.22 + Math.min(spd, 5) * 0.045 + speedLevel * 0.035);
  const runAmp = 9 + speedLevel * 1.8;
  const run = onRoad ? Math.sin(walkPhase) * runAmp : Math.sin(fr * 0.18) * 5;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, footY + 6, onRoad ? 22 : 14, onRoad ? 6 : 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (pSlide) {
    // ── SLIDE pose ──────────────────────────────────────────
    if (sk.id === "hetman_gold") {
      ctx.fillStyle = sk.cape;
      ctx.beginPath();
      ctx.moveTo(x - 34, y - 18);
      ctx.lineTo(x + 12, y - 18);
      ctx.lineTo(x + 31, y + 1);
      ctx.lineTo(x - 26, y + 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = sk.trim;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (sk.id === "cossack") {
      ctx.fillStyle = sk.cape;
      ctx.beginPath();
      ctx.moveTo(x - 32, y - 18);
      ctx.lineTo(x + 13, y - 18);
      ctx.lineTo(x + 28, y + 3);
      ctx.lineTo(x - 27, y + 4);
      ctx.closePath();
      ctx.fill();
    }
    // body horizontal
    ctx.fillStyle = sk.shirt;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - 22, y - 14, 44, 16, 5);
    } else {
      ctx.fillRect(x - 22, y - 14, 44, 16);
    }
    ctx.fill();
    if (sk.id === "hetman_gold") {
      ctx.fillStyle = sk.armor;
      ctx.fillRect(x - 17, y - 12, 30, 11);
      ctx.strokeStyle = sk.trim;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 17, y - 12, 30, 11);
      ctx.fillStyle = sk.trim;
      ctx.fillRect(x - 3, y - 11, 4, 9);
      ctx.strokeStyle = "#d1a33f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 10, y - 2);
      ctx.lineTo(x + 38, y - 13);
      ctx.stroke();
    }
    if (sk.id === "cossack") {
      ctx.fillStyle = sk.trim;
      for (let row = 0; row < 3; row++) {
        ctx.fillRect(x - 13 + row * 2, y - 11 + row * 4, 22, 2);
      }
      ctx.strokeStyle = "#d9e4eb";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 3);
      ctx.lineTo(x + 38, y - 16);
      ctx.stroke();
      ctx.strokeStyle = "#c79a36";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 4);
      ctx.lineTo(x + 12, y - 1);
      ctx.stroke();
    }
    // legs
    ctx.fillStyle = sk.shorts || "#222";
    ctx.fillRect(x + 4, y - 8, 26, 12);
    ctx.fillStyle = sk.shoes || "#111";
    ctx.fillRect(x + 20, y - 6, 14, 8);
    // head
    ctx.fillStyle = sk.mask || sk.skin;
    ctx.beginPath();
    ctx.arc(x - 18, y - 14, 12, 0, Math.PI * 2);
    ctx.fill();
    if (sk.id === "ninja") {
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(x - 18, y - 17, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ff3300";
      ctx.fillRect(x - 25, y - 17, 14, 3);
    } else if (sk.id === "cossack") {
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x - 21, y - 25, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = sk.hair;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 29);
      ctx.quadraticCurveTo(x - 8, y - 35, x - 3, y - 27);
      ctx.stroke();
      ctx.fillStyle = sk.hair;
      ctx.fillRect(x - 28, y - 16, 9, 3);
      ctx.fillRect(x - 18, y - 16, 9, 3);
      ctx.strokeStyle = "#704528";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 15);
      ctx.lineTo(x, y - 18);
      ctx.stroke();
    } else if (sk.id === "courier") {
      ctx.fillStyle = sk.hat;
      ctx.fillRect(x - 29, y - 27, 24, 7);
      ctx.fillRect(x - 8, y - 22, 11, 3);
    } else if (sk.id === "cyber" || sk.id === "robotron_neon") {
      ctx.fillStyle = sk.hat;
      ctx.fillRect(x - 29, y - 22, 22, 5);
      ctx.fillStyle = sk.id === "robotron_neon" ? "#ff3df2" : "#00e5ff";
      ctx.fillRect(x - 26, y - 18, 16, 3);
    } else if (sk.id === "hetman_gold") {
      ctx.fillStyle = "#4b3018";
      ctx.beginPath();
      ctx.ellipse(x - 18, y - 23, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sk.trim;
      ctx.fillRect(x - 30, y - 24, 24, 3);
      ctx.strokeStyle = sk.trim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 16, y - 29);
      ctx.quadraticCurveTo(x - 10, y - 39, x - 5, y - 31);
      ctx.moveTo(x - 13, y - 29);
      ctx.quadraticCurveTo(x - 5, y - 36, x - 2, y - 28);
      ctx.stroke();
      ctx.fillStyle = "#5b351d";
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 12);
      ctx.lineTo(x - 18, y - 5);
      ctx.lineTo(x - 12, y - 12);
      ctx.closePath();
      ctx.fill();
    } else if (sk.id === "shadow_agent") {
      ctx.fillStyle = "#050505";
      ctx.fillRect(x - 27, y - 17, 8, 4);
      ctx.fillRect(x - 17, y - 17, 8, 4);
    } else if (sk.id === "parkour") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x - 18, y - 18, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#f2d14f";
      ctx.fillRect(x - 31, y - 19, 26, 4);
      ctx.fillRect(x - 8, y - 15, 10, 3);
    } else if (sk.id === "pilot") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x - 18, y - 18, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 31, y - 20, 26, 7);
      ctx.fillStyle = "#79b9d1";
      ctx.fillRect(x - 27, y - 18, 7, 4);
      ctx.fillRect(x - 17, y - 18, 7, 4);
    } else if (sk.id === "firefighter") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x - 18, y - 19, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 33, y - 20, 30, 5);
      ctx.fillStyle = "#f3d34a";
      ctx.fillRect(x - 21, y - 28, 6, 10);
    } else if (sk.id === "space_courier") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x - 18, y - 17, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#21475d";
      ctx.beginPath();
      ctx.arc(x - 18, y - 16, 11, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#28c8d8";
      ctx.fillRect(x - 27, y - 17, 18, 2);
    } else {
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x - 18, y - 18, 12, Math.PI, 0);
      ctx.fill();
    }
    drawAndriiWeapon(x, y, true);
  } else {
    // ── NORMAL / JUMP pose ───────────────────────────────────
    // walking legs planted on the road
    const leftFootX = x - 9 - run * 0.45;
    const rightFootX = x + 8 + run * 0.45;
    const leftKneeX = x - 8 + run * 0.2;
    const rightKneeX = x + 8 - run * 0.2;
    if (onRoad && speedLevel > 0) {
      ctx.save();
      ctx.globalAlpha = 0.18 + speedLevel * 0.08;
      ctx.strokeStyle = speedLevel >= 3 ? "#fff36a" : "#8ee6ff";
      ctx.lineWidth = 2 + speedLevel;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < speedLevel + 1; i++) {
        const trail = 14 + i * 8;
        ctx.moveTo(leftFootX - trail, footY - 4 - i);
        ctx.lineTo(leftFootX - trail - 14, footY - 4 - i);
        ctx.moveTo(rightFootX - trail, footY - 2 + i * 0.4);
        ctx.lineTo(rightFootX - trail - 13, footY - 2 + i * 0.4);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = sk.shorts || "#222";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 17);
    ctx.lineTo(leftKneeX, y - 8 - Math.max(0, run) * 0.15);
    ctx.lineTo(leftFootX, footY - 4);
    ctx.moveTo(x + 7, y - 17);
    ctx.lineTo(rightKneeX, y - 8 + Math.min(0, run) * 0.15);
    ctx.lineTo(rightFootX, footY - 4);
    ctx.stroke();
    ctx.fillStyle = sk.shoes || "#111";
    ctx.fillRect(leftFootX - 8, footY - 6, 15, 7);
    ctx.fillRect(rightFootX - 7, footY - 6, 15, 7);

    // shorts
    ctx.fillStyle = sk.shorts || "#222";
    ctx.fillRect(x - 13, y - 18, 26, 16);

    if (sk.id === "hetman_gold") {
      const capeSwing = Math.sin(fr * 0.18) * 4;
      ctx.fillStyle = sk.cape;
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 44);
      ctx.lineTo(x + 18, y - 44);
      ctx.lineTo(x + 23 + capeSwing, y - 5);
      ctx.lineTo(x - 23 + capeSwing, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = sk.trim;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (sk.id === "cossack") {
      const capeSwing = Math.sin(fr * 0.18) * 5;
      ctx.fillStyle = sk.cape;
      ctx.beginPath();
      ctx.moveTo(x - 19, y - 45);
      ctx.lineTo(x + 19, y - 45);
      ctx.lineTo(x + 25 + capeSwing, y - 4);
      ctx.lineTo(x - 22 + capeSwing, y - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#65706b";
      ctx.fillRect(x - 17, y - 44, 4, 36);
      ctx.fillRect(x + 13, y - 44, 4, 36);
    }

    // shirt
    ctx.fillStyle = sk.shirt;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x - 15, y - 42, 30, 26, 6);
    } else {
      ctx.fillRect(x - 15, y - 42, 30, 26);
    }
    ctx.fill();
    if (sk.id === "hetman_gold") {
      ctx.fillStyle = sk.armor;
      ctx.fillRect(x - 12, y - 40, 24, 20);
      ctx.strokeStyle = sk.trim;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 12, y - 40, 24, 20);
      ctx.fillStyle = sk.trim;
      ctx.fillRect(x - 2, y - 37, 4, 13);
      ctx.fillRect(x - 8, y - 33, 16, 3);
      ctx.beginPath();
      ctx.moveTo(x, y - 38);
      ctx.lineTo(x - 5, y - 30);
      ctx.lineTo(x, y - 27);
      ctx.lineTo(x + 5, y - 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#d1a33f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 18);
      ctx.lineTo(x + 27, y + 3);
      ctx.stroke();
      ctx.strokeStyle = sk.trim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 27, y + 3);
      ctx.lineTo(x + 30, y + 8);
      ctx.stroke();
    }
    if (sk.id === "firefighter") {
      ctx.fillStyle = "#f3d34a";
      ctx.fillRect(x - 15, y - 35, 30, 5);
      ctx.fillRect(x - 15, y - 23, 30, 4);
    }
    if (sk.id === "space_courier") {
      ctx.fillStyle = "#28c8d8";
      ctx.fillRect(x - 12, y - 38, 24, 4);
      ctx.fillStyle = "#ff5c5c";
      ctx.beginPath();
      ctx.arc(x, y - 27, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (sk.id === "cossack") {
      ctx.fillStyle = sk.trim;
      for (let row = 0; row < 5; row++) {
        ctx.fillRect(x - 9, y - 39 + row * 5, 18, 2);
      }
      ctx.fillStyle = "#b9c2c5";
      ctx.beginPath();
      ctx.arc(x, y - 25, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#dce8ef";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 26);
      ctx.lineTo(x - 30, y - 55);
      ctx.lineTo(x - 42, y - 49);
      ctx.stroke();
      ctx.strokeStyle = "#c99b38";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 28, y - 53);
      ctx.lineTo(x - 35, y - 58);
      ctx.stroke();
    }

    // scarf / belt
    if (sk.scarf) {
      ctx.fillStyle = sk.scarf;
      ctx.fillRect(x - 15, y - 18, 30, 6);
    }

    // bag strap (only default)
    if (sk.id === "default") {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 40);
      ctx.lineTo(x + 12, y - 15);
      ctx.stroke();
    }

    // arms
    ctx.strokeStyle = sk.skin;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 34);
    ctx.lineTo(x - 18, y - 20 + run * 0.2);
    ctx.moveTo(x + 12, y - 34);
    ctx.lineTo(x + 18, y - 20 - run * 0.2);
    ctx.stroke();

    // head
    ctx.fillStyle = sk.mask || sk.skin;
    ctx.beginPath();
    ctx.arc(x, y - 54, 13, 0, Math.PI * 2);
    ctx.fill();

    if (sk.id === "ninja") {
      // head wrap
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(x, y - 57, 13, Math.PI, 0);
      ctx.fill();
      // eye slit
      ctx.fillStyle = "#ff3300";
      ctx.fillRect(x - 9, y - 57, 18, 4);
      // belt
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(x - 15, y - 22, 30, 5);
      // arm wraps
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 34);
      ctx.lineTo(x - 18, y - 20 + run * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 12, y - 34);
      ctx.lineTo(x + 18, y - 20 - run * 0.2);
      ctx.stroke();
    } else if (sk.id === "cossack") {
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x - 3, y - 65, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = sk.hair;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 69);
      ctx.quadraticCurveTo(x + 12, y - 78, x + 19, y - 67);
      ctx.stroke();
      ctx.fillStyle = sk.hair;
      ctx.fillRect(x - 11, y - 53, 10, 3);
      ctx.fillRect(x + 1, y - 53, 10, 3);
      ctx.strokeStyle = "#704528";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 9, y - 52);
      ctx.lineTo(x + 20, y - 56);
      ctx.lineTo(x + 24, y - 53);
      ctx.stroke();
      ctx.fillStyle = "#81502e";
      ctx.beginPath();
      ctx.ellipse(x + 25, y - 54, 5, 3, -0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (sk.id === "courier") {
      ctx.fillStyle = sk.hat;
      ctx.fillRect(x - 13, y - 68, 26, 7);
      ctx.fillRect(x + 7, y - 63, 13, 3);
      ctx.strokeStyle = "#263238";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 40);
      ctx.lineTo(x + 12, y - 16);
      ctx.stroke();
    } else if (sk.id === "football") {
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x, y - 58, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#1565c0";
      ctx.fillRect(x - 4, y - 40, 8, 16);
    } else if (sk.id === "cyber" || sk.id === "robotron_neon") {
      const glow = sk.id === "robotron_neon" ? "#ff3df2" : "#00e5ff";
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = sk.hat;
      ctx.fillRect(x - 12, y - 62, 24, 6);
      ctx.fillStyle = glow;
      ctx.fillRect(x - 9, y - 58, 18, 4);
      ctx.fillRect(x - 12, y - 31, 24, 3);
      ctx.shadowBlur = 0;
    } else if (sk.id === "hetman_gold") {
      ctx.fillStyle = "#4b3018";
      ctx.beginPath();
      ctx.ellipse(x, y - 65, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sk.trim;
      ctx.fillRect(x - 13, y - 66, 26, 3);
      ctx.strokeStyle = sk.trim;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 3, y - 72);
      ctx.quadraticCurveTo(x + 10, y - 85, x + 15, y - 76);
      ctx.moveTo(x + 6, y - 72);
      ctx.quadraticCurveTo(x + 16, y - 82, x + 19, y - 72);
      ctx.stroke();
      ctx.fillStyle = "#5b351d";
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 52);
      ctx.lineTo(x, y - 43);
      ctx.lineTo(x + 7, y - 52);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - 8, y - 55, 6, 2);
      ctx.fillRect(x + 2, y - 55, 6, 2);
    } else if (sk.id === "shadow_agent") {
      ctx.fillStyle = sk.hair;
      ctx.beginPath();
      ctx.arc(x, y - 58, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#050505";
      ctx.fillRect(x - 10, y - 58, 9, 4);
      ctx.fillRect(x + 1, y - 58, 9, 4);
      ctx.fillRect(x - 1, y - 57, 2, 2);
    } else if (sk.id === "parkour") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x, y - 58, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#f2d14f";
      ctx.fillRect(x - 13, y - 59, 26, 4);
      ctx.fillRect(x + 8, y - 55, 11, 3);
    } else if (sk.id === "pilot") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x, y - 58, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 13, y - 60, 26, 7);
      ctx.fillStyle = "#79b9d1";
      ctx.fillRect(x - 9, y - 58, 7, 4);
      ctx.fillRect(x + 2, y - 58, 7, 4);
      ctx.strokeStyle = "#d7b56d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 55);
      ctx.lineTo(x + 2, y - 55);
      ctx.stroke();
    } else if (sk.id === "firefighter") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x, y - 59, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x - 15, y - 60, 30, 5);
      ctx.fillStyle = "#f3d34a";
      ctx.fillRect(x - 3, y - 68, 6, 10);
    } else if (sk.id === "space_courier") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x, y - 55, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#21475d";
      ctx.beginPath();
      ctx.arc(x, y - 55, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#28c8d8";
      ctx.fillRect(x - 10, y - 56, 20, 3);
    } else {
      // blond hair
      ctx.fillStyle = sk.hair || "#e8c45c";
      ctx.beginPath();
      ctx.arc(x, y - 58, 12, Math.PI, 0);
      ctx.fill();
    }
    drawAndriiWeapon(x, y, false);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawNeonRobotron(x, y) {
  const run = Math.sin(fr * 0.3) * 7;
  const pulse = 0.55 + Math.sin(fr * 0.16) * 0.25;
  const slide = pSlide;

  ctx.save();
  ctx.shadowColor = "#20f0d0";
  ctx.shadowBlur = 8 + pulse * 8;
  ctx.fillStyle = "rgba(32,240,208,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 7, slide ? 27 : 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (slide) {
    ctx.translate(x, y - 9);
    ctx.rotate(-0.16);
    ctx.translate(-x, -y + 9);
    ctx.strokeStyle = "#20f0d0";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 2);
    ctx.lineTo(x + 22, y + 1);
    ctx.moveTo(x - 8, y - 8);
    ctx.lineTo(x + 17, y - 14);
    ctx.stroke();
    ctx.fillStyle = "#07141d";
    ctx.fillRect(x + 17, y - 4, 17, 8);
    ctx.fillStyle = "#20f0d0";
    ctx.fillRect(x + 24, y + 2, 12, 3);
    drawRobotronTorso(x - 4, y - 28, pulse, true);
    drawRobotronHead(x - 29, y - 32, pulse, true);
  } else {
    ctx.strokeStyle = "#20f0d0";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 15);
    ctx.lineTo(x - 10, y + 4 + run);
    ctx.moveTo(x + 7, y - 15);
    ctx.lineTo(x + 10, y + 4 - run);
    ctx.stroke();
    ctx.fillStyle = "#07141d";
    ctx.fillRect(x - 16, y + 1 + run, 13, 7);
    ctx.fillRect(x + 3, y + 1 - run, 13, 7);
    ctx.fillStyle = "#ff3df2";
    ctx.fillRect(x - 15, y + 6 + run, 11, 3);
    ctx.fillStyle = "#20f0d0";
    ctx.fillRect(x + 4, y + 6 - run, 11, 3);

    drawRobotronTorso(x, y - 37, pulse, false);
    ctx.strokeStyle = "#88dcea";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 34);
    ctx.lineTo(x - 24, y - 19 + run * 0.25);
    ctx.moveTo(x + 15, y - 34);
    ctx.lineTo(x + 24, y - 19 - run * 0.25);
    ctx.stroke();
    ctx.fillStyle = "#20f0d0";
    ctx.beginPath();
    ctx.arc(x - 24, y - 18 + run * 0.25, 5, 0, Math.PI * 2);
    ctx.arc(x + 24, y - 18 - run * 0.25, 5, 0, Math.PI * 2);
    ctx.fill();
    drawRobotronHead(x, y - 65, pulse, false);
  }

  ctx.shadowBlur = 0;
  drawAndriiWeapon(x, y, slide);
  ctx.restore();
}

function drawRobotronTorso(x, y, pulse, horizontal) {
  ctx.save();
  if (horizontal) {
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-x, -y);
  }
  ctx.fillStyle = "#07141d";
  ctx.fillRect(x - 18, y - 13, 36, 29);
  ctx.strokeStyle = "#20f0d0";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 18, y - 13, 36, 29);
  ctx.fillStyle = "#163745";
  ctx.fillRect(x - 12, y - 8, 24, 17);
  ctx.fillStyle = "#ff3df2";
  ctx.beginPath();
  ctx.arc(x - 7, y, 3 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#20f0d0";
  ctx.beginPath();
  ctx.arc(x + 1, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd45c";
  ctx.beginPath();
  ctx.arc(x + 8, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8d62ff";
  ctx.fillRect(x - 4, y + 6, 8, 3);
  ctx.restore();
}

function drawRobotronHead(x, y, pulse, sideways) {
  ctx.save();
  if (sideways) {
    ctx.translate(x, y);
    ctx.rotate(-0.08);
    ctx.translate(-x, -y);
  }
  ctx.fillStyle = "#102a3a";
  ctx.fillRect(x - 15, y - 13, 30, 24);
  ctx.strokeStyle = "#20f0d0";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 15, y - 13, 30, 24);
  ctx.fillStyle = "#050b12";
  ctx.fillRect(x - 10, y - 7, 20, 9);
  ctx.fillStyle = "#20f0d0";
  ctx.fillRect(x - 7, y - 5, 5, 4);
  ctx.fillStyle = "#ff3df2";
  ctx.fillRect(x + 2, y - 5, 5, 4);
  ctx.fillStyle = "#668699";
  ctx.fillRect(x - 6, y + 6, 12, 2);
  ctx.strokeStyle = "#20f0d0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 13);
  ctx.lineTo(x, y - 24);
  ctx.stroke();
  ctx.fillStyle = "#ff3df2";
  ctx.beginPath();
  ctx.arc(x, y - 26, 3 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMarichkaRemodel(x, y, options = {}) {
  const step = options.step ?? Math.sin(fr * 0.32) * 10;
  const holdingProject = Boolean(options.holdingProject);
  const showName = Boolean(options.showName);
  const dangerPct = options.dangerPct ?? 0;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.23)";
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0d0a8";
  ctx.fillRect(x - 10, y - 1, 7, 16 + step);
  ctx.fillRect(x + 3, y - 1, 7, 16 - step);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x - 12, y + 13 + step, 11, 5);
  ctx.fillRect(x + 1, y + 13 - step, 11, 5);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 12, y + 18 + step, 12, 3);
  ctx.fillRect(x, y + 18 - step, 12, 3);

  ctx.fillStyle = "#ffe45c";
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 1);
  ctx.lineTo(x - 13, y - 31);
  ctx.quadraticCurveTo(x, y - 40, x + 13, y - 31);
  ctx.lineTo(x + 18, y - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f5b8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 37);
  ctx.lineTo(x, y - 4);
  ctx.moveTo(x - 12, y - 29);
  ctx.lineTo(x + 12, y - 29);
  ctx.stroke();
  ctx.fillStyle = "#101820";
  for (let i = 0; i < 4; i++) {
    const by = y - 31 + i * 7;
    ctx.fillRect(x - 10, by, 3, 3);
    ctx.fillRect(x + 7, by, 3, 3);
  }

  ctx.fillStyle = "#1f5b8f";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - 12, y - 48, 24, 20, 5);
  else ctx.fillRect(x - 12, y - 48, 24, 20);
  ctx.fill();
  ctx.fillStyle = "#ffe45c";
  ctx.fillRect(x - 10, y - 43, 20, 4);

  ctx.strokeStyle = "#f0d0a8";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 42);
  ctx.lineTo(x - 23, y - 24 + step * 0.25);
  ctx.moveTo(x + 11, y - 42);
  ctx.lineTo(x + 23, y - 24 - step * 0.25);
  ctx.stroke();
  ctx.strokeStyle = "#0d5fb8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 45);
  ctx.quadraticCurveTo(x - 24, y - 31, x - 30, y - 9);
  ctx.moveTo(x + 11, y - 45);
  ctx.quadraticCurveTo(x + 24, y - 31, x + 30, y - 9);
  ctx.stroke();

  ctx.fillStyle = "#f0d0a8";
  ctx.fillRect(x - 4, y - 53, 8, 7);
  ctx.beginPath();
  ctx.arc(x, y - 62, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e6b989";
  ctx.beginPath();
  ctx.arc(x - 13, y - 61, 3, 0, Math.PI * 2);
  ctx.arc(x + 13, y - 61, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3a1a0a";
  ctx.beginPath();
  ctx.arc(x, y - 70, 14, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = "#3a1a0a";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 66);
  ctx.quadraticCurveTo(x - 23, y - 52 + step * 0.1, x - 18, y - 33);
  ctx.moveTo(x + 12, y - 66);
  ctx.quadraticCurveTo(x + 23, y - 52 - step * 0.1, x + 18, y - 33);
  ctx.stroke();

  const flowers = [
    [-15, -77, "#0057b7"],
    [-8, -81, "#ffd700"],
    [0, -79, "#0057b7"],
    [8, -81, "#ffd700"],
    [15, -77, "#0057b7"],
  ];
  flowers.forEach(([fx, fy, col], i) => {
    ctx.fillStyle = col;
    for (let p = 0; p < 5; p++) {
      const a = (Math.PI * 2 * p) / 5 + i * 0.2;
      ctx.beginPath();
      ctx.arc(x + fx + Math.cos(a) * 3, y + fy + Math.sin(a) * 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a2a05";
    ctx.beginPath();
    ctx.arc(x + fx, y + fy, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(x - 4, y - 63, 2, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 63, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,150,150,0.42)";
  ctx.beginPath();
  ctx.ellipse(x - 8, y - 58, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 8, y - 58, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9a4b36";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 57, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x - 13, y - 55, 2, 0, Math.PI * 2);
  ctx.arc(x + 13, y - 55, 2, 0, Math.PI * 2);
  ctx.fill();

  if (holdingProject) {
    ctx.save();
    ctx.translate(x + 26, y - 27);
    ctx.rotate(-0.12);
    ctx.fillStyle = "#f5ecd4";
    ctx.fillRect(-14, -18, 28, 36);
    ctx.fillStyle = "#2878bd";
    ctx.fillRect(-14, -18, 28, 7);
    ctx.fillStyle = "#333";
    ctx.font = "bold 6px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ПРОЄКТ", 0, -6);
    ctx.fillStyle = "#7396a8";
    ctx.fillRect(-9, 0, 18, 2);
    ctx.fillRect(-9, 5, 14, 2);
    ctx.restore();
  }

  if (showName) {
    ctx.globalAlpha = Math.min(1, Math.max(0.45, dangerPct + 0.2));
    ctx.fillStyle = "rgba(15,18,30,0.84)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 31, y - 99, 62, 18, 5);
    else ctx.fillRect(x - 31, y - 99, 62, 18);
    ctx.fill();
    ctx.fillStyle = "#ff8fc8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Марічка", x, y - 86);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
    if (dangerPct > 0.45) {
      const pulse = 0.7 + Math.sin(fr * 0.15) * 0.3;
      ctx.globalAlpha = (pulse * (dangerPct - 0.45)) / 0.55;
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("x2 ₴", x, y - 85);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function drawChaser() {
  if (gameState === "win" || gameState === "schoolEnter") return;
  const cx = chaserX,
    cy = GND;
  const lp = Math.sin(fr * 0.32) * 10;

  // небезпечна зона — аура рожева коли близько
  const dangerPct = Math.min(Math.max((chaserX + 100) / (LANES[0] - 80), 0), 1);
  if (dangerPct > 0.5) {
    const auraAlpha = (dangerPct - 0.5) * 0.35;
    ctx.fillStyle = `rgba(255,100,180,${auraAlpha})`;
    ctx.fillRect(cx - 20, cy - 80, 40, H - cy + 80);
  }
  drawMarichkaRemodel(cx, cy, { step: lp, showName: true, dangerPct });
  return;

  // тінь
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ноги
  ctx.fillStyle = "#f0d0a8";
  ctx.fillRect(cx - 10, cy, 7, 14 + lp);
  ctx.fillRect(cx + 3, cy, 7, 14 - lp);
  // кросівки
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(cx - 11, cy + 12 + lp, 10, 6);
  ctx.fillRect(cx + 2, cy + 12 - lp, 10, 6);
  // підошва
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx - 12, cy + 17 + lp, 11, 3);
  ctx.fillRect(cx + 1, cy + 17 - lp, 11, 3);

  // спідниця / плаття
  ctx.fillStyle = "#ffe45c";
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx - 14, cy - 28);
  ctx.lineTo(cx + 14, cy - 28);
  ctx.lineTo(cx + 16, cy);
  ctx.closePath();
  ctx.fill();
  // візерунок на спідниці (серця)
  ctx.strokeStyle = "#1f5b8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 28);
  ctx.lineTo(cx, cy - 2);
  ctx.stroke();
  ctx.fillStyle = "#101820";
  for (let i = 0; i < 3; i++) {
    const by = cy - 23 + i * 7;
    ctx.fillRect(cx - 10, by, 3, 3);
    ctx.fillRect(cx + 7, by, 3, 3);
  }

  // тіло (топ)
  ctx.fillStyle = "#ffe45c";
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cx - 12, cy - 46, 24, 20, 4);
  } else {
    ctx.fillRect(cx - 12, cy - 46, 24, 20);
  }
  ctx.fill();

  // руки
  ctx.strokeStyle = "#f0d0a8";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 40);
  ctx.lineTo(cx - 18, cy - 26 + lp * 0.3);
  ctx.moveTo(cx + 10, cy - 40);
  ctx.lineTo(cx + 18, cy - 26 - lp * 0.3);
  ctx.stroke();
  ctx.strokeStyle = "#0d5fb8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 43);
  ctx.quadraticCurveTo(cx - 22, cy - 28, cx - 29, cy - 5);
  ctx.moveTo(cx + 10, cy - 43);
  ctx.quadraticCurveTo(cx + 22, cy - 28, cx + 29, cy - 5);
  ctx.stroke();

  // шия
  ctx.fillStyle = "#f0d0a8";
  ctx.fillRect(cx - 4, cy - 52, 8, 7);

  // голова
  ctx.fillStyle = "#f0d0a8";
  ctx.beginPath();
  ctx.arc(cx, cy - 60, 12, 0, Math.PI * 2);
  ctx.fill();
  // вуха
  ctx.fillStyle = "#e8c090";
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 60, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 60, 3, 0, Math.PI * 2);
  ctx.fill();
  // сережки
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 55, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 12, cy - 55, 2, 0, Math.PI * 2);
  ctx.fill();

  // очі
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 62, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 4, cy - 62, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // вії
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 65);
  ctx.lineTo(cx - 4, cy - 67);
  ctx.moveTo(cx - 3, cy - 65);
  ctx.lineTo(cx - 2, cy - 67);
  ctx.moveTo(cx + 3, cy - 65);
  ctx.lineTo(cx + 2, cy - 67);
  ctx.moveTo(cx + 6, cy - 65);
  ctx.lineTo(cx + 4, cy - 67);
  ctx.stroke();
  // рум'янець
  ctx.fillStyle = "rgba(255,150,150,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx - 7, cy - 57, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 7, cy - 57, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // рот (усмішка)
  ctx.strokeStyle = "#c07060";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy - 56, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // волосся (довге, темне)
  ctx.fillStyle = "#3a1a0a";
  // верхівка
  ctx.beginPath();
  ctx.arc(cx, cy - 68, 12, Math.PI, 0);
  ctx.fill();
  // хвіст ліворуч
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 62);
  ctx.quadraticCurveTo(
    cx - 20,
    cy - 48 + lp * 0.2,
    cx - 16,
    cy - 34 + lp * 0.3,
  );
  ctx.lineWidth = 7;
  ctx.strokeStyle = "#3a1a0a";
  ctx.stroke();
  // хвіст праворуч
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy - 62);
  ctx.quadraticCurveTo(
    cx + 20,
    cy - 48 - lp * 0.2,
    cx + 16,
    cy - 34 - lp * 0.3,
  );
  ctx.stroke();
  ctx.lineWidth = 1;

  // іконка x2 над головою коли близько
  const chaserFlowers = [
    [-13, -75, "#0057b7"],
    [-6, -79, "#ffd700"],
    [1, -77, "#0057b7"],
    [8, -79, "#ffd700"],
    [15, -75, "#0057b7"],
  ];
  chaserFlowers.forEach(([fx, fy, col], i) => {
    ctx.fillStyle = col;
    for (let p = 0; p < 5; p++) {
      const a = (Math.PI * 2 * p) / 5 + i * 0.18;
      ctx.beginPath();
      ctx.arc(
        cx + fx + Math.cos(a) * 3,
        cy + fy + Math.sin(a) * 3,
        3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#3a2a05";
    ctx.beginPath();
    ctx.arc(cx + fx, cy + fy, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = Math.min(1, Math.max(0.45, dangerPct + 0.2));
  ctx.fillStyle = "rgba(15,18,30,0.84)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx - 31, cy - 98, 62, 18, 5);
  else ctx.fillRect(cx - 31, cy - 98, 62, 18);
  ctx.fill();
  ctx.fillStyle = "#ff8fc8";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u041c\u0430\u0440\u0456\u0447\u043a\u0430", cx, cy - 85);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;

  if (dangerPct > 0.45) {
    const pulse = 0.7 + Math.sin(fr * 0.15) * 0.3;
    ctx.globalAlpha = (pulse * (dangerPct - 0.45)) / 0.55;
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("x2 💰", cx, cy - 84);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
}

function drawObs(o) {
  const x = o.x;
  if (o.type === "scooter") {
    drawScooterRider(o);
  } else if (o.type === "hole") {
    const y = GND + 3;
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    const pit = ctx.createRadialGradient(x - 5, y - 2, 4, x, y, 34);
    pit.addColorStop(0, "#080a0f");
    pit.addColorStop(0.72, "#171b22");
    pit.addColorStop(1, "#56515a");
    ctx.fillStyle = pit;
    ctx.beginPath();
    ctx.ellipse(x, y, 31, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7c6d62";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 32, 9, 0, 0.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = "rgba(190,180,164,0.5)";
    ctx.fillRect(x - 27, y - 8, 8, 2);
    ctx.fillRect(x + 14, y - 6, 11, 2);
  } else if (o.type === "puddle") {
    const y = GND + 4;
    const shine = Math.sin(fr * 0.08 + x * 0.01) * 3;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 38, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const water = ctx.createLinearGradient(x - 36, y - 9, x + 36, y + 8);
    water.addColorStop(0, "rgba(76, 190, 255, 0.38)");
    water.addColorStop(0.5, "rgba(130, 225, 255, 0.64)");
    water.addColorStop(1, "rgba(32, 100, 180, 0.42)");
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.ellipse(x, y, 36, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(205, 244, 255, 0.78)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x - 7 + shine, y - 2, 18, 3.5, -0.05, 0, Math.PI * 2);
    ctx.stroke();
  } else if (o.type === "boss_dancer") {
    const gx = x;
    const gy = GND;
    const phase = fr * 0.18 + (o.dancePhase || 0);
    const bounce = Math.abs(Math.sin(phase * 1.5)) * 8;
    const arm = Math.sin(phase) * 15;
    const foot = Math.sin(phase * 2) * 7;

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 5, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#4b3525";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy - 10 - bounce);
    ctx.lineTo(gx - 8 - foot, gy + 6);
    ctx.moveTo(gx + 6, gy - 10 - bounce);
    ctx.lineTo(gx + 8 + foot, gy + 6);
    ctx.stroke();

    ctx.fillStyle = "#f0e3c4";
    ctx.beginPath();
    ctx.moveTo(gx - 16, gy - 51 - bounce);
    ctx.lineTo(gx + 16, gy - 51 - bounce);
    ctx.lineTo(gx + 20, gy - 8 - bounce);
    ctx.lineTo(gx - 20, gy - 8 - bounce);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d3bd8e";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#d6a52d";
    ctx.fillRect(gx - 18, gy - 24 - bounce, 36, 6);

    ctx.strokeStyle = "#bd8b60";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(gx - 14, gy - 44 - bounce);
    ctx.lineTo(gx - 27 - arm, gy - 56 - bounce - Math.abs(arm) * 0.45);
    ctx.moveTo(gx + 14, gy - 44 - bounce);
    ctx.lineTo(gx + 27 + arm, gy - 56 - bounce - Math.abs(arm) * 0.45);
    ctx.stroke();

    ctx.fillStyle = "#bd8b60";
    ctx.beginPath();
    ctx.arc(gx, gy - 65 - bounce, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f1eee3";
    ctx.beginPath();
    ctx.arc(gx, gy - 71 - bounce, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#a72b2b";
    ctx.fillRect(gx - 14, gy - 72 - bounce, 28, 5);
    ctx.fillRect(gx - 12, gy - 79 - bounce, 5, 8);
    ctx.fillRect(gx - 2, gy - 79 - bounce, 5, 8);
    ctx.fillRect(gx + 8, gy - 79 - bounce, 5, 8);

    ctx.fillStyle = "#202020";
    ctx.beginPath();
    ctx.arc(gx - 4, gy - 66 - bounce, 2, 0, Math.PI * 2);
    ctx.arc(gx + 4, gy - 66 - bounce, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6f3d26";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gx, gy - 61 - bounce, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = "#734d28";
    ctx.font = "bold 6px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ТЦК", gx, gy - 34 - bounce);
    ctx.textAlign = "left";
  } else if (o.type === "kiosk") {
    ctx.fillStyle = "#c8860a";
    ctx.fillRect(x - 24, GND - 46, 48, 46);
    ctx.fillStyle = "#e8a020";
    ctx.fillRect(x - 24, GND - 54, 48, 10);
    ctx.fillStyle = "#5588aa";
    ctx.fillRect(x - 16, GND - 42, 32, 22);
    ctx.fillStyle = "#ff4444";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("КІОСК", x, GND - 57);
    ctx.textAlign = "left";
  } else if (o.type === "cop") {
    const lp = Math.sin(fr * 0.32) * 10;
    const gx = x,
      gy = GND;

    // --- тінь ---
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 4, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- ноги (анімація бігу) ---
    ctx.fillStyle = "#1a237e";
    ctx.fillRect(gx - 10, gy, 8, 16 + lp);
    ctx.fillRect(gx + 2, gy, 8, 16 - lp);
    // чоботи
    ctx.fillStyle = "#111";
    ctx.fillRect(gx - 11, gy + 14 + lp, 10, 7);
    ctx.fillRect(gx + 1, gy + 14 - lp, 10, 7);

    // --- тіло (бронежилет) ---
    // основа кителя
    ctx.fillStyle = "#1565c0";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 14, gy - 46, 28, 46, 3);
    } else {
      ctx.fillRect(gx - 14, gy - 46, 28, 46);
    }
    ctx.fill();
    // бронежилет поверх
    ctx.fillStyle = "#263238";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 11, gy - 44, 22, 36, 2);
    } else {
      ctx.fillRect(gx - 11, gy - 44, 22, 36);
    }
    ctx.fill();
    // жовті лямки бронежилету
    ctx.fillStyle = "#ffd600";
    ctx.fillRect(gx - 11, gy - 44, 4, 36);
    ctx.fillRect(gx + 7, gy - 44, 4, 36);
    // напис ОХОРОНА
    ctx.fillStyle = "#ffd600";
    ctx.font = "bold 5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ОХОРОНА", gx, gy - 20);
    ctx.textAlign = "left";
    // значок (нагрудний)
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(gx + 4, gy - 34, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a237e";
    ctx.beginPath();
    ctx.arc(gx + 4, gy - 34, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // --- руки ---
    // ліва рука (вільна, розмахує)
    ctx.strokeStyle = "#f0c880";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx - 12, gy - 38);
    ctx.lineTo(gx - 20, gy - 22 + lp * 0.3);
    ctx.stroke();
    // права рука (з кийком)
    ctx.strokeStyle = "#f0c880";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx + 12, gy - 38);
    ctx.lineTo(gx + 20, gy - 24 - lp * 0.3);
    ctx.stroke();
    // кийок
    ctx.strokeStyle = "#5d4037";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx + 20, gy - 24 - lp * 0.3);
    ctx.lineTo(gx + 28, gy - 44 - lp * 0.3);
    ctx.stroke();
    // ручка кийка
    ctx.fillStyle = "#3e2723";
    ctx.beginPath();
    ctx.arc(gx + 28, gy - 45 - lp * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();

    // --- шия ---
    ctx.fillStyle = "#f0c880";
    ctx.fillRect(gx - 5, gy - 52, 10, 8);

    // --- голова ---
    ctx.fillStyle = "#f0c880";
    ctx.beginPath();
    ctx.arc(gx, gy - 62, 13, 0, Math.PI * 2);
    ctx.fill();
    // вуха
    ctx.fillStyle = "#e8b870";
    ctx.beginPath();
    ctx.arc(gx - 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    // очі (сердиті — насуплені брови)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(gx - 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // брови (насуплені)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx - 9, gy - 69);
    ctx.lineTo(gx - 2, gy - 67);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 9, gy - 69);
    ctx.lineTo(gx + 2, gy - 67);
    ctx.stroke();
    // рот (стиснутий)
    ctx.strokeStyle = "#c07850";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy - 57);
    ctx.lineTo(gx + 4, gy - 57);
    ctx.stroke();

    // --- берет ---
    ctx.fillStyle = "#1a237e";
    ctx.beginPath();
    ctx.ellipse(gx, gy - 73, 14, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx, gy - 73, 13, Math.PI, 0);
    ctx.fill();
    // кокарда на береті
    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 74, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a237e";
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 74, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // обідок берету
    ctx.fillStyle = "#0d47a1";
    ctx.fillRect(gx - 14, gy - 75, 28, 4);
  } else if (o.type === "tck") {
    // ТЦК — камуфляжна форма, каска, папка/повістка в руці
    const gx = x,
      gy = GND;
    const lp = Math.sin(fr * 0.32) * 10;

    // тінь
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(gx, gy + 4, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ноги
    ctx.fillStyle = "#4a5a2a";
    ctx.fillRect(gx - 10, gy, 8, 16 + lp);
    ctx.fillRect(gx + 2, gy, 8, 16 - lp);
    // берці (тактичні)
    ctx.fillStyle = "#2a1e0e";
    ctx.fillRect(gx - 11, gy + 14 + lp, 11, 7);
    ctx.fillRect(gx + 0, gy + 14 - lp, 11, 7);

    // тіло — камуфляж
    ctx.fillStyle = "#4a5a2a";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 14, gy - 46, 28, 46, 3);
    } else {
      ctx.fillRect(gx - 14, gy - 46, 28, 46);
    }
    ctx.fill();
    // камуфляжні плями
    ctx.fillStyle = "#2e3a14";
    ctx.fillRect(gx - 12, gy - 42, 8, 8);
    ctx.fillRect(gx + 2, gy - 30, 7, 7);
    ctx.fillRect(gx - 8, gy - 18, 6, 6);
    ctx.fillRect(gx + 4, gy - 44, 5, 5);
    ctx.fillStyle = "#6a7a3a";
    ctx.fillRect(gx - 5, gy - 38, 6, 5);
    ctx.fillRect(gx + 5, gy - 22, 5, 6);
    // бронежилет (беж)
    ctx.fillStyle = "#8a7a5a";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(gx - 10, gy - 44, 20, 34, 2);
    } else {
      ctx.fillRect(gx - 10, gy - 44, 20, 34);
    }
    ctx.fill();
    // напис ТЦК
    ctx.fillStyle = "#2e1e08";
    ctx.font = "bold 5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ТЦК", gx, gy - 24);
    ctx.textAlign = "left";
    // нашивка прапор
    ctx.fillStyle = "#1565c0";
    ctx.fillRect(gx + 2, gy - 40, 12, 4);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(gx + 2, gy - 36, 12, 4);

    // ліва рука (вільна)
    ctx.strokeStyle = "#c8a870";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx - 12, gy - 38);
    ctx.lineTo(gx - 20, gy - 22 + lp * 0.3);
    ctx.stroke();

    // права рука (з папкою/повісткою або рушницею)
    ctx.strokeStyle = "#c8a870";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(gx + 12, gy - 38);
    ctx.lineTo(gx + 20, gy - 26 - lp * 0.3);
    ctx.stroke();
    if (currentLocation === 1 && currentLevel >= 2) {
      // рушниця/автомат
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(gx + 18, gy - 30 - lp * 0.3);
      ctx.lineTo(gx + 38, gy - 38 - lp * 0.3);
      ctx.stroke();
      // ствол
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx + 34, gy - 38 - lp * 0.3);
      ctx.lineTo(gx + 46, gy - 40 - lp * 0.3);
      ctx.stroke();
      // магазин
      ctx.fillStyle = "#333";
      ctx.fillRect(gx + 24, gy - 32 - lp * 0.3, 5, 10);
      // дульний спалах (якщо є куля з цього ТЦК щойно створена)
      if (o.muzzleFlash > 0) {
        o.muzzleFlash--;
        ctx.fillStyle = "rgba(255,200,50,0.9)";
        ctx.beginPath();
        ctx.arc(gx + 46, gy - 40 - lp * 0.3, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,150,0.6)";
        ctx.beginPath();
        ctx.arc(gx + 46, gy - 40 - lp * 0.3, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // папка (повістка)
      ctx.fillStyle = "#f5e6c8";
      ctx.fillRect(gx + 18, gy - 34 - lp * 0.3, 14, 18);
      ctx.fillStyle = "#d4c4a0";
      ctx.fillRect(gx + 19, gy - 33 - lp * 0.3, 12, 2);
      ctx.fillRect(gx + 19, gy - 29 - lp * 0.3, 12, 2);
      ctx.fillRect(gx + 19, gy - 25 - lp * 0.3, 8, 2);
      ctx.fillStyle = "#c0392b";
      ctx.font = "bold 4px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ПОВІСТ", gx + 25, gy - 20 - lp * 0.3);
      ctx.textAlign = "left";
    }

    // шия
    ctx.fillStyle = "#c8a870";
    ctx.fillRect(gx - 5, gy - 52, 10, 8);

    // голова
    ctx.fillStyle = "#c8a870";
    ctx.beginPath();
    ctx.arc(gx, gy - 62, 13, 0, Math.PI * 2);
    ctx.fill();
    // вуха
    ctx.fillStyle = "#b89060";
    ctx.beginPath();
    ctx.arc(gx - 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 13, gy - 62, 4, 0, Math.PI * 2);
    ctx.fill();
    // очі (підозрілі)
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(gx - 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx + 5, gy - 64, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // брови (насуплені)
    ctx.strokeStyle = "#2e1e08";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx - 9, gy - 69);
    ctx.lineTo(gx - 2, gy - 67);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 9, gy - 69);
    ctx.lineTo(gx + 2, gy - 67);
    ctx.stroke();
    // рот
    ctx.strokeStyle = "#a07050";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy - 57);
    ctx.lineTo(gx + 4, gy - 57);
    ctx.stroke();
    // вуса
    ctx.strokeStyle = "#5a3a18";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 5, gy - 59);
    ctx.lineTo(gx - 1, gy - 58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 5, gy - 59);
    ctx.lineTo(gx + 1, gy - 58);
    ctx.stroke();

    // каска (тактична, пісочна)
    ctx.fillStyle = "#5a6a2e";
    ctx.beginPath();
    ctx.ellipse(gx, gy - 74, 15, 9, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(gx, gy - 73, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#4a5820";
    ctx.fillRect(gx - 15, gy - 75, 30, 4);
    // підбородний ремінь каски
    ctx.strokeStyle = "#3a4818";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gx - 13, gy - 68);
    ctx.lineTo(gx - 6, gy - 62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gx + 13, gy - 68);
    ctx.lineTo(gx + 6, gy - 62);
    ctx.stroke();
  } else {
    // bollard
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = "#f0c000";
      ctx.fillRect(x + i * 18 - 5, GND - 36, 10, 36);
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(x + i * 18 - 5, GND - 40, 10, 8);
    }
    ctx.fillStyle = "#ccc";
    ctx.fillRect(x - 24, GND - 28, 48, 5);
  }
}

function drawScooterRider(o) {
  const x = o.x;
  const y = GND;
  const phase = fr * 0.32 + (o.wheelPhase || 0);
  const bob = Math.sin(phase) * 2;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 33, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#111820";
  ctx.lineWidth = 5;
  for (const wheelX of [x - 21, x + 22]) {
    ctx.beginPath();
    ctx.arc(wheelX, y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#8fd7e8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(wheelX - Math.cos(phase) * 7, y - Math.sin(phase) * 7);
    ctx.lineTo(wheelX + Math.cos(phase) * 7, y + Math.sin(phase) * 7);
    ctx.moveTo(wheelX + Math.sin(phase) * 7, y - Math.cos(phase) * 7);
    ctx.lineTo(wheelX - Math.sin(phase) * 7, y + Math.cos(phase) * 7);
    ctx.stroke();
    ctx.strokeStyle = "#111820";
    ctx.lineWidth = 5;
  }

  ctx.strokeStyle = "#27c7d9";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 9);
  ctx.lineTo(x + 25, y - 9);
  ctx.moveTo(x + 18, y - 9);
  ctx.lineTo(x + 13, y - 48 + bob);
  ctx.lineTo(x + 27, y - 48 + bob);
  ctx.stroke();

  ctx.strokeStyle = "#263238";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 25 + bob);
  ctx.lineTo(x - 8, y - 8);
  ctx.moveTo(x + 5, y - 24 + bob);
  ctx.lineTo(x + 18, y - 8);
  ctx.stroke();

  ctx.fillStyle = "#f5b942";
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(x - 12, y - 59 + bob, 25, 34, 6)
    : ctx.fillRect(x - 12, y - 59 + bob, 25, 34);
  ctx.fill();
  ctx.fillStyle = "#1f5b8f";
  ctx.fillRect(x - 12, y - 37 + bob, 25, 7);

  ctx.strokeStyle = "#d7a478";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + 9, y - 52 + bob);
  ctx.lineTo(x + 23, y - 48 + bob);
  ctx.stroke();

  ctx.fillStyle = "#d7a478";
  ctx.beginPath();
  ctx.arc(x, y - 69 + bob, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#25364a";
  ctx.beginPath();
  ctx.arc(x, y - 73 + bob, 12, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 13, y - 75 + bob, 26, 4);
  ctx.fillStyle = "#68e0ff";
  ctx.fillRect(x - 8, y - 70 + bob, 16, 3);
  ctx.restore();
}

function drawCoin(c) {
  if (c.done) return;
  const x = c.x ?? LANES[c.lane],
    y = c.y - 14;
  if (magnetTimer > 0 && c.magneted) {
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "rgba(99, 214, 255, 0.62)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(LANES[pLane], pY - 34);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, 20);
  g.addColorStop(0, "rgba(255,255,180,1)");
  g.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b8860b";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("₴", x, y + 3);
  ctx.textAlign = "left";
}

function drawMagnet(m) {
  const x = m.x;
  const y = m.y + Math.sin(fr * 0.12 + (m.phase || 0)) * 4;
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 30);
  glow.addColorStop(0, "rgba(98, 214, 255, 0.78)");
  glow.addColorStop(1, "rgba(98, 214, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = "round";
  ctx.strokeStyle = "#e7f8ff";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y, 14, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
  ctx.strokeStyle = "#3dcfff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, 14, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
  ctx.fillStyle = "#ff4b5c";
  ctx.fillRect(x - 18, y - 1, 8, 10);
  ctx.fillRect(x + 10, y - 1, 8, 10);
  ctx.fillStyle = "#fff36a";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("M", x, y + 5);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawShieldItem(s) {
  const x = s.x;
  const y = s.y + Math.sin(fr * 0.12 + (s.phase || 0)) * 4;
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 30);
  glow.addColorStop(0, "rgba(88, 190, 255, 0.78)");
  glow.addColorStop(1, "rgba(88, 190, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#58beff";
  ctx.strokeStyle = "#e7f8ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.lineTo(x + 17, y - 12);
  ctx.lineTo(x + 13, y + 12);
  ctx.lineTo(x, y + 24);
  ctx.lineTo(x - 13, y + 12);
  ctx.lineTo(x - 17, y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.moveTo(x, y - 13);
  ctx.lineTo(x + 8, y - 8);
  ctx.lineTo(x + 4, y + 7);
  ctx.lineTo(x, y + 12);
  ctx.lineTo(x - 4, y + 7);
  ctx.lineTo(x - 8, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSuperJumpItem(j) {
  const x = j.x;
  const y = j.y + Math.sin(fr * 0.14 + (j.phase || 0)) * 5;
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 32);
  glow.addColorStop(0, "rgba(255, 232, 92, 0.82)");
  glow.addColorStop(1, "rgba(255, 232, 92, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8b5cf6";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 14);
  ctx.lineTo(x - 6, y + 4);
  ctx.lineTo(x + 4, y + 14);
  ctx.lineTo(x + 16, y + 2);
  ctx.stroke();

  ctx.fillStyle = "#fff36a";
  ctx.beginPath();
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x + 16, y - 2);
  ctx.lineTo(x + 6, y - 2);
  ctx.lineTo(x + 6, y + 14);
  ctx.lineTo(x - 6, y + 14);
  ctx.lineTo(x - 6, y - 2);
  ctx.lineTo(x - 16, y - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5b2bd8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPlayerShieldAura() {
  if (shieldCharges <= 0 || gameState !== "run") return;
  const x = LANES[pLane];
  const pulse = 0.5 + Math.sin(fr * 0.14) * 0.12;
  ctx.save();
  ctx.globalAlpha = 0.45 + pulse * 0.25;
  ctx.strokeStyle = "#58beff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, pY - 28, 30 + pulse * 8, 48 + pulse * 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#58beff";
  ctx.beginPath();
  ctx.ellipse(x, pY - 28, 27 + pulse * 7, 45 + pulse * 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSuperJumpAura() {
  if (superJumpTimer <= 0 || gameState !== "run") return;
  const x = LANES[pLane];
  const pulse = 0.5 + Math.sin(fr * 0.18) * 0.18;
  ctx.save();
  ctx.globalAlpha = 0.32 + pulse * 0.25;
  ctx.strokeStyle = "#fff36a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, pY - 52, 18 + pulse * 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#8b5cf6";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("↑", x, pY - 78 - pulse * 8);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawCityGift(gift) {
  const bob = Math.sin(fr * 0.16 + gift.x * 0.04) * 3;
  const x = gift.x;
  const y = gift.y + bob;
  drawPeasantGiftGiver(gift);
  ctx.save();
  ctx.globalAlpha = Math.min(1, gift.life / 24);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, gift.secret ? 28 : 22);
  glow.addColorStop(0, gift.secret ? "rgba(255,247,178,0.95)" : "rgba(255,255,210,0.8)");
  glow.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, gift.secret ? 28 : 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gift.secret ? "#ffd45c" : "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y, gift.secret ? 12 : 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = gift.secret ? "#0057b7" : "#b8860b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, gift.secret ? 12 : 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#6b4b00";
  ctx.font = gift.secret ? "bold 12px sans-serif" : "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("+" + gift.value, x, y + 4);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawPeasantGiftGiver(gift) {
  if (gift.life < 70) return;
  const alpha = Math.min(1, (gift.life - 70) / 22);
  const x = gift.giverX ?? gift.x - 24;
  const y = gift.giverY ?? gift.y + 58;
  const wave = Math.sin(fr * 0.22 + x * 0.02) * 4;
  const scale = gift.secret ? 1.08 : 0.94;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5c3b22";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-8, -15);
  ctx.lineTo(-17, -1);
  ctx.moveTo(8, -15);
  ctx.lineTo(19, -23 + wave);
  ctx.stroke();

  ctx.fillStyle = "#f4ead7";
  ctx.beginPath();
  ctx.moveTo(-15, -32);
  ctx.lineTo(15, -32);
  ctx.lineTo(18, -4);
  ctx.lineTo(-18, -4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#c43b2f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-15, -8);
  ctx.lineTo(15, -8);
  ctx.moveTo(-15, -28);
  ctx.lineTo(15, -28);
  ctx.moveTo(-15, -19);
  ctx.lineTo(-6, -19);
  ctx.moveTo(6, -19);
  ctx.lineTo(15, -19);
  ctx.stroke();

  ctx.strokeStyle = "#3b2416";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -13);
  ctx.lineTo(16, -13);
  ctx.stroke();

  ctx.fillStyle = "#e4d7c6";
  ctx.fillRect(-12, -4, 9, 21);
  ctx.fillRect(3, -4, 9, 21);
  ctx.strokeStyle = "#7d715f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(-14, 18);
  ctx.moveTo(-5, 4);
  ctx.lineTo(-1, 18);
  ctx.moveTo(6, 2);
  ctx.lineTo(1, 18);
  ctx.moveTo(10, 4);
  ctx.lineTo(15, 18);
  ctx.stroke();

  ctx.fillStyle = "#9b7443";
  ctx.beginPath();
  ctx.ellipse(-9, 20, 9, 4, -0.2, 0, Math.PI * 2);
  ctx.ellipse(9, 20, 9, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d1a073";
  ctx.beginPath();
  ctx.arc(0, -43, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3b2416";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -44, 12, Math.PI * 1.05, Math.PI * 1.9);
  ctx.stroke();

  ctx.fillStyle = "#3b2416";
  ctx.beginPath();
  ctx.ellipse(0, -38, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#171717";
  ctx.beginPath();
  ctx.arc(-4, -45, 1.4, 0, Math.PI * 2);
  ctx.arc(4, -45, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7c4d2d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -40);
  ctx.lineTo(4, -40);
  ctx.stroke();

  ctx.fillStyle = "#9a5a2d";
  ctx.fillRect(16, -11, 11, 18);
  ctx.strokeStyle = "#4d2b16";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, -11);
  ctx.lineTo(11, -18);
  ctx.moveTo(27, -11);
  ctx.lineTo(23, -18);
  ctx.stroke();

  ctx.fillStyle = "#ffd45c";
  ctx.beginPath();
  ctx.arc(22, -25 + wave, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b8860b";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawDistBar() {
  const lv = getLvl();
  const pct = Math.min(totalDist / lv.dist, 1);
  const bw = 160,
    bh = 6,
    bx = W / 2 - bw / 2,
    by = 12;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(bx, by, bw * pct, bh);
  ctx.fillStyle = "#fff";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(Math.round(pct * 100) + "%", W / 2, by + bh + 10);
  ctx.textAlign = "left";
  if (pct >= 0.8) {
    ctx.fillStyle = "rgba(255,215,0,0.15)";
    ctx.fillRect(0, 0, W, H);
  }
}

function drawLevelClearOverlay() {
  const L = t();
  const a = Math.min(levelClearTimer / 25, 0.78);
  ctx.fillStyle = `rgba(5,30,5,${a})`;
  ctx.fillRect(0, 0, W, H);
  if (levelClearTimer < 18) return;
  const a2 = Math.min((levelClearTimer - 18) / 18, 1);
  ctx.globalAlpha = a2;
  ctx.textAlign = "center";
  // level cleared title
  ctx.fillStyle = "#6bcb77";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(L.levelClear || "Level cleared!", W / 2, H / 2 - 52);
  // level name
  const lvNames = getLevelNames(currentLocation, lang);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(
    (L.levelLabel || "Level") +
      " " +
      (currentLevel + 1) +
      ": " +
      (lvNames[currentLevel] || ""),
    W / 2,
    H / 2 - 18,
  );
  // next level preview
  if (currentLevel + 1 < getLevels().length) {
    ctx.fillStyle = "#aabbcc";
    ctx.font = "14px sans-serif";
    ctx.fillText(
      "→ " +
        (L.levelLabel || "Level") +
        " " +
        (currentLevel + 2) +
        ": " +
        (lvNames[currentLevel + 1] || ""),
      W / 2,
      H / 2 + 12,
    );
  }
  // coins earned
  ctx.fillStyle = "#ffd700";
  ctx.font = "13px sans-serif";
  ctx.fillText(
    "+" + getLvl().bonusCoins + "₴ " + (L.winBonus || "bonus"),
    W / 2,
    H / 2 + 40,
  );
  // press to continue
  if (levelClearTimer > LEVEL_CLEAR_INPUT_DELAY) {
    const remaining = Math.max(
      0,
      Math.ceil((LEVEL_CLEAR_AUTO_DELAY - levelClearTimer) / 60),
    );
    ctx.fillStyle = "#8899aa";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      (L.restart || "Press any key") + " · " + remaining + "s",
      W / 2,
      H / 2 + 68,
    );
  }
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function pRect() {
  const x = LANES[pLane];
  if (pSlide) return { x: x - 16, y: pY + 11, w: 32, h: 14 };
  return { x: x - 12, y: pY - 44, w: 24, h: 68 };
}
function isRoadHazard(type) {
  return type === "hole" || type === "puddle";
}
function oRect(o) {
  if (o.type === "hole") return { x: o.x - 32, y: GND - 8, w: 64, h: 18 };
  if (o.type === "puddle") return { x: o.x - 36, y: GND - 7, w: 72, h: 16 };
  if (o.type === "scooter")
    return { x: o.x - 30, y: GND - 48, w: 60, h: 55 };
  if (o.type === "kiosk") return { x: o.x - 24, y: GND - 46, w: 48, h: 46 };
  if (o.type === "cop") return { x: o.x - 14, y: GND - 75, w: 28, h: 75 };
  if (o.type === "tck") return { x: o.x - 14, y: GND - 75, w: 28, h: 75 };
  if (o.type === "boss_dancer")
    return { x: o.x - 18, y: GND - 82, w: 36, h: 82 };
  return { x: o.x - 26, y: GND - 40, w: 52, h: 40 };
}
function hit(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
function absorbShieldHit(x, y, color = "#58beff") {
  if (shieldCharges <= 0) return false;
  shieldCharges = Math.max(0, shieldCharges - 1);
  inv = Math.max(inv, 46);
  flash = Math.max(flash, 10);
  addParts(x, y, color);
  addParts(LANES[pLane], pY - 28, "#e7f8ff");
  sfxHit();
  showAndriiBubble("\u0429\u0438\u0442 \u0432\u0440\u044f\u0442\u0443\u0432\u0430\u0432!");
  hudUp();
  return true;
}
function getBonusLabel(type) {
  type = getBackpackBonusType(type);
  if (type === "magnet") return "\u041c\u0430\u0433\u043d\u0456\u0442";
  if (type === "shield") return "\u0429\u0438\u0442";
  if (type === "jump") return "\u0421\u0443\u043f\u0435\u0440-\u0441\u0442\u0440\u0438\u0431\u043e\u043a";
  return "\u0411\u043e\u043d\u0443\u0441";
}
function getBonusIcon(type) {
  type = getBackpackBonusType(type);
  if (type === "magnet") return "M";
  if (type === "shield") return "S";
  if (type === "jump") return "J";
  return "?";
}
function getBackpackBonusType(item) {
  return String(item || "").replace(/^stock:/, "");
}
function fillBackpackFromInventory() {
  bonusBackpack = [];
  const order = ["shield", "magnet", "jump"];
  for (const type of order) {
    const available = Math.max(0, Number(bonusInventory[type]) || 0);
    for (let count = 0; count < available && bonusBackpack.length < backpackSlots; count++) {
      bonusBackpack.push("stock:" + type);
    }
  }
}
function applyBackpackBonus(type) {
  type = getBackpackBonusType(type);
  if (type === "magnet") {
    magnetTimer = Math.max(magnetTimer, 520);
    showAndriiBubble("\u041c\u0430\u0433\u043d\u0456\u0442! \u041c\u043e\u043d\u0435\u0442\u0438 \u043b\u0435\u0442\u044f\u0442\u044c \u0434\u043e \u043c\u0435\u043d\u0435!");
  } else if (type === "shield") {
    if (shieldCharges >= getMaxShieldCharges()) {
      showAndriiBubble("\u0429\u0438\u0442 \u0432\u0436\u0435 \u0430\u043a\u0442\u0438\u0432\u043d\u0438\u0439!");
      return false;
    }
    shieldCharges = Math.min(getMaxShieldCharges(), shieldCharges + 1);
    showAndriiBubble("\u0429\u0438\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u0438\u0439!");
  } else if (type === "jump") {
    superJumpTimer = Math.max(superJumpTimer, 600);
    showAndriiBubble("\u0421\u0443\u043f\u0435\u0440-\u0441\u0442\u0440\u0438\u0431\u043e\u043a!");
  } else {
    return false;
  }
  sfxCoin();
  hudUp();
  return true;
}
function collectBackpackBonus(type, x, y, color) {
  if (bonusBackpack.length < backpackSlots) {
    bonusBackpack.push(type);
    sfxCoin();
    addParts(x, y, color);
    showAndriiBubble(
      "\u0423 \u0440\u044e\u043a\u0437\u0430\u043a\u0443: " + getBonusLabel(type) + ". \u041d\u0430\u0442\u0438\u0441\u043d\u0438 E!",
    );
    hudUp();
    return;
  }
  addParts(x, y, color);
  applyBackpackBonus(type);
}
function activateBackpackBonus() {
  if (gameState !== "run" || bonusBackpack.length === 0) {
    showAndriiBubble("\u0420\u044e\u043a\u0437\u0430\u043a \u043f\u043e\u0440\u043e\u0436\u043d\u0456\u0439");
    return;
  }
  for (let i = 0; i < bonusBackpack.length; i++) {
    const item = bonusBackpack[i];
    if (applyBackpackBonus(item)) {
      const type = getBackpackBonusType(item);
      if (String(item).startsWith("stock:")) {
        bonusInventory[type] = Math.max(0, (bonusInventory[type] || 0) - 1);
        saveGame();
      }
      bonusBackpack.splice(i, 1);
      hudUp();
      return;
    }
  }
  showAndriiBubble("\u0411\u043e\u043d\u0443\u0441 \u0437\u0430\u0440\u0430\u0437 \u043d\u0435 \u043f\u043e\u0442\u0440\u0456\u0431\u0435\u043d");
}
function getCoinComboMult() {
  if (coinCombo >= 16) return 4;
  if (coinCombo >= 10) return 3;
  if (coinCombo >= 5) return 2;
  return 1;
}
function registerCoinCombo() {
  coinCombo = coinComboTimer > 0 ? coinCombo + 1 : 1;
  coinComboTimer = 150;
  coinComboMult = getCoinComboMult();
  return coinComboMult;
}
function resetCoinCombo() {
  coinCombo = 0;
  coinComboTimer = 0;
  coinComboMult = 1;
}
function noteTrick(kind) {
  if (kind === "jump") trickJumpTimer = 190;
  if (kind === "slide") trickSlideTimer = 190;
}
function registerTrickCoinCombo() {
  if (trickJumpTimer <= 0 || trickSlideTimer <= 0) return 1;
  trickComboStreak = trickComboTimer > 0 ? trickComboStreak + 1 : 1;
  trickComboTimer = 190;
  trickComboMult = trickComboStreak >= 2 ? 3 : 2;
  if (trickComboMult >= 3) addAchievementProgress("trick3");
  trickJumpTimer = 0;
  trickSlideTimer = 0;
  showAndriiBubble(
    trickComboMult === 3
      ? "\u0422\u0440\u044e\u043a-\u043a\u043e\u043c\u0431\u043e x3!"
      : "\u0422\u0440\u044e\u043a-\u043a\u043e\u043c\u0431\u043e x2!",
  );
  return trickComboMult;
}
function resetTrickCombo() {
  trickJumpTimer = 0;
  trickSlideTimer = 0;
  trickComboTimer = 0;
  trickComboMult = 1;
  trickComboStreak = 0;
}

function drawParts() {
  parts = parts.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.35;
    p.life--;
    ctx.globalAlpha = p.life / 36;
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    ctx.globalAlpha = 1;
    return p.life > 0;
  });
}

function drawHUDCanvas() {
  if (flash > 0) {
    ctx.globalAlpha = (flash / 22) * 0.4;
    ctx.fillStyle = "#ff2020";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flash--;
  }
  const bw = 90,
    pct = Math.min(Math.max((chaserX + 100) / (LANES[0] - 80), 0), 1);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(W - bw - 10, 8, bw, 7);
  // рожевий колір бару — небезпечна зона дає x2
  const barCol = pct > 0.45 ? "#ff69b4" : "#6bcb77";
  ctx.fillStyle = barCol;
  ctx.fillRect(W - bw - 10, 8, bw * (1 - pct), 7);
  // x2 label коли активний
  if (pct > 0.45) {
    const pulse = 0.6 + Math.sin(fr * 0.2) * 0.4;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("x2💰", W - 10, 7);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }
  if (magnetTimer > 0) {
    const mw = 86;
    const remain = Math.max(0, Math.min(1, magnetTimer / 520));
    ctx.fillStyle = "rgba(7,18,28,0.62)";
    ctx.fillRect(10, 22, mw, 9);
    ctx.fillStyle = "#62d6ff";
    ctx.fillRect(10, 22, mw * remain, 9);
    ctx.fillStyle = "#e7f8ff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("M", 101, 31);
  }
  if (shieldCharges > 0) {
    ctx.fillStyle = "rgba(7,18,28,0.62)";
    ctx.fillRect(10, 36, shieldCharges > 1 ? 66 : 54, 12);
    ctx.fillStyle = "#58beff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(shieldCharges > 1 ? "SHIELD x" + shieldCharges : "SHIELD", 14, 46);
  }
  if (superJumpTimer > 0) {
    const jw = 86;
    const remain = Math.max(0, Math.min(1, superJumpTimer / 600));
    ctx.fillStyle = "rgba(7,18,28,0.62)";
    ctx.fillRect(10, 52, jw, 9);
    ctx.fillStyle = "#fff36a";
    ctx.fillRect(10, 52, jw * remain, 9);
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("JUMP", 101, 61);
  }
  ctx.fillStyle = "rgba(7,18,28,0.7)";
  ctx.fillRect(W - 142, 22, 132, 34);
  ctx.fillStyle = "#cde7ff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BACKPACK  E", W - 136, 34);
  for (let i = 0; i < backpackSlots; i++) {
    const bx = W - 62 - Math.max(0, backpackSlots - 2) * 25 + i * 25;
    const by = 39;
    const type = bonusBackpack[i];
    ctx.fillStyle = type ? "rgba(255,215,0,0.22)" : "rgba(255,255,255,0.08)";
    ctx.fillRect(bx, by, 20, 14);
    ctx.strokeStyle = type ? "#ffd700" : "rgba(200,220,255,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, 20, 14);
    if (type) {
      const bonusType = getBackpackBonusType(type);
      ctx.fillStyle =
        bonusType === "magnet" ? "#62d6ff" : bonusType === "shield" ? "#58beff" : "#fff36a";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(getBonusIcon(type), bx + 10, by + 11);
    }
  }
  ctx.textAlign = "left";
  if (coinComboTimer > 0 && coinCombo > 1) {
    const pulse = 0.75 + Math.sin(fr * 0.22) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(20,18,6,0.72)";
    ctx.fillRect(10, 66, 106, 18);
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("COMBO x" + coinComboMult + "  " + coinCombo, 16, 80);
    ctx.globalAlpha = 1;
  }
  if (trickComboTimer > 0 && trickComboMult > 1) {
    const pulse = 0.74 + Math.sin(fr * 0.26) * 0.26;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(5,24,38,0.76)";
    ctx.fillRect(10, 88, 118, 18);
    ctx.fillStyle = "#62d6ff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("TRICK x" + trickComboMult, 16, 102);
    ctx.globalAlpha = 1;
  }
  drawLevelMiniMap();
}

function drawLevelMiniMap() {
  if (gameState !== "run" && gameState !== "schoolEnter") return;
  const FDIST = getFinishDistance();
  const x = 188;
  const y = 25;
  const w = 304;
  const h = 28;
  const progress = Math.max(0, Math.min(1, totalDist / FDIST));

  ctx.save();
  ctx.fillStyle = "rgba(7,18,28,0.72)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 7);
  else ctx.fillRect(x, y, w, h);
  ctx.fill();

  const barX = x + 18;
  const barY = y + 14;
  const barW = w - 36;
  ctx.strokeStyle = "rgba(200,220,255,0.28)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(barX, barY);
  ctx.lineTo(barX + barW, barY);
  ctx.stroke();

  ctx.strokeStyle = "#62d6ff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(barX, barY);
  ctx.lineTo(barX + barW * progress, barY);
  ctx.stroke();
  ctx.lineCap = "butt";

  function mark(pct, label, color, radius = 5) {
    const mx = barX + barW * Math.max(0, Math.min(1, pct));
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, barY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#eaf2ff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, mx, y + 9);
  }

  if (secretRoute && !secretRoute.missed) {
    const routePct = secretRoute.completed
      ? Math.min(1, (totalDist - 10) / FDIST)
      : secretRoute.active
        ? progress
        : secretRoute.nextOfferPct;
    mark(
      routePct,
      secretRoute.id === "metro" ? "M" : secretRoute.id === "roofs" ? "D" : "P",
      secretRoute.color,
      secretRoute.active ? 6 : 5,
    );
  }

  const isKyivFinalBoss =
    currentLocation === 0 && currentLevel === LEVELS_KYIV.length - 1;
  if (isKyivFinalBoss && !bossDefeated) {
    mark((FDIST - 240) / FDIST, "B", "#ff5c5c", bossActive ? 7 : 5);
  }

  mark(1, "F", "#ffd700", finishActive ? 7 : 5);
  mark(progress, "A", "#ffffff", 6);

  ctx.textAlign = "left";
  ctx.restore();
}

function drawWinOverlay() {
  const L = t();
  const alpha = Math.min(winTimer / 30, 0.75);
  ctx.fillStyle = `rgba(5,20,10,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  if (winTimer < 20) return;
  const a2 = Math.min((winTimer - 20) / 20, 1);
  ctx.globalAlpha = a2;
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(L.win, W / 2, H / 2 - 44);
  ctx.fillStyle = "#6bcb77";
  ctx.font = "16px sans-serif";
  ctx.fillText(L.score + ": " + score, W / 2, H / 2 - 6);
  ctx.fillStyle = "#ffd700";
  ctx.font = "14px sans-serif";
  ctx.fillText(
    `${L.earned}: ${runCoins}₴   ${L.winBonus}: +${getLvl().bonusCoins}₴`,
    W / 2,
    H / 2 + 22,
  );
  ctx.fillStyle = "#aabbcc";
  ctx.font = "13px sans-serif";
  ctx.fillText(L.total + ": " + totalCoins + "₴", W / 2, H / 2 + 48);
  ctx.fillStyle = "#8899aa";
  ctx.font = "12px sans-serif";
  ctx.fillText("↩ " + (t().back || "Back to menu"), W / 2, H / 2 + 76);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function drawOverlay() {
  const L = t();
  ctx.fillStyle = "rgba(5,10,20,0.72)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  if (gameState === "idle") {
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("KYIV RUNNER", W / 2, H / 2 - 30);
    ctx.fillStyle = "#8899aa";
    ctx.font = "14px sans-serif";
    ctx.fillText(L.pressAny, W / 2, H / 2 + 10);
  } else if (gameState === "over") {
    const lvNames = getLevelNames(currentLocation, lang);
    ctx.fillStyle = "#ff4444";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(L.caught, W / 2, H / 2 - 50);
    ctx.fillStyle = "#aabbcc";
    ctx.font = "13px sans-serif";
    ctx.fillText(
      (L.levelLabel || "Level") +
        " " +
        (currentLevel + 1) +
        " — " +
        (lvNames[currentLevel] || ""),
      W / 2,
      H / 2 - 18,
    );
    ctx.fillStyle = "#ffd700";
    ctx.font = "15px sans-serif";
    ctx.fillText(
      L.score + ": " + score + "   " + L.earned + ": " + runCoins + "₴",
      W / 2,
      H / 2 + 8,
    );
    ctx.fillStyle = "#6bcb77";
    ctx.font = "13px sans-serif";
    ctx.fillText(L.total + ": " + totalCoins + "₴", W / 2, H / 2 + 32);
    ctx.fillStyle = "#8899aa";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      L.restart || "Press any key to retry level",
      W / 2,
      H / 2 + 56,
    );
  }
  ctx.textAlign = "left";
}

const TCK_SCENE_LINES = [
  {
    at: 50,
    who: "Андрій",
    text: "От лишенько, чорна машина... Вони вже близько. Що робити?",
    rate: 0.92,
    pitch: 1.55,
  },
  {
    at: 320,
    who: "ТЦК",
    text: "Підпиши документи, хлопче.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 610,
    who: "Андрій",
    text: "Я не буду підписувати ваші документи.",
    rate: 0.95,
    pitch: 1.55,
  },
  {
    at: 900,
    who: "ТЦК",
    text: "А ну, ти, хлопче, зараз підеш до нас. Іди сюди.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 1190,
    who: "Андрій",
    text: "Ні. Я маю добігти до фінішу.",
    rate: 0.95,
    pitch: 1.55,
  },
  {
    at: 1460,
    who: "ТЦК",
    text: "Не сперечайся, хлопче. Ми все одно наздоженемо.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 1760,
    who: "Андрій",
    text: "Спробуйте наздогнати. Я не здаюся.",
    rate: 0.95,
    pitch: 1.55,
  },
  {
    at: 2040,
    who: "ТЦК",
    text: "Тримайте його.",
    rate: 0.82,
    pitch: 0.7,
  },
  {
    at: 2280,
    who: "Андрій",
    text: "Роботроне, допоможи. Я побіг.",
    rate: 0.95,
    pitch: 1.55,
  },
];
const TCK_SCENE_END_FRAME = 2700;
const MARICHKA_PROJECT_01 = "\u041e\u0439, \u0449\u043e \u0446\u0435 \u0432\u0438\u043f\u0430\u043b\u043e \u0437 \u0440\u044e\u043a\u0437\u0430\u043a\u0430 \u0410\u043d\u0434\u0440\u0456\u044f?";
const MARICHKA_PROJECT_02 =
  "\u0422\u0430 \u0446\u0435 \u0436 \u0439\u043e\u0433\u043e \u0448\u043a\u0456\u043b\u044c\u043d\u0438\u0439 \u043f\u0440\u043e\u0454\u043a\u0442! \u0411\u0435\u0437 \u043d\u044c\u043e\u0433\u043e \u0432\u0456\u043d \u043d\u0435 \u0437\u043c\u043e\u0436\u0435 \u0432\u0438\u0441\u0442\u0443\u043f\u0438\u0442\u0438.";
const MARICHKA_PROJECT_03 =
  "\u0410\u043d\u0434\u0440\u0456\u044e, \u0437\u0430\u0447\u0435\u043a\u0430\u0439! \u0422\u0438 \u0437\u0430\u0431\u0443\u0432 \u043f\u0440\u043e\u0454\u043a\u0442! \u042f \u0442\u0435\u0431\u0435 \u043d\u0430\u0437\u0434\u043e\u0436\u0435\u043d\u0443!";
const MARICHKA_SCHOOL_PROJECT =
  "\u0410\u043d\u0434\u0440\u0456\u044e, \u0437\u0430\u0447\u0435\u043a\u0430\u0439! \u0422\u0438 \u0437\u0430\u0431\u0443\u0432 \u0441\u0432\u0456\u0439 \u043f\u0440\u043e\u0454\u043a\u0442.";
const MARICHKA_PROJECT_LINES = [
  {
    who: "\u041c\u0430\u0440\u0456\u0447\u043a\u0430",
    text: MARICHKA_PROJECT_01,
  },
  {
    who: "\u041c\u0430\u0440\u0456\u0447\u043a\u0430",
    text: MARICHKA_PROJECT_02,
  },
  {
    who: "\u041c\u0430\u0440\u0456\u0447\u043a\u0430",
    text: MARICHKA_PROJECT_03,
  },
];

function beginStoryScene(kind, sceneKey = null) {
  cancelSpeech();
  if (startVoiceTimer) {
    clearTimeout(startVoiceTimer);
    startVoiceTimer = null;
  }
  gameState = "story";
  fr = 0;
  bgOff = 0;
  pLane = 0;
  pY = GND;
  pSlide = false;
  slideT = 0;
  obs = [];
  coins = [];
  cityGifts = [];
  parts = [];
  bullets = [];
  confetti = [];
  bubbleText = "";
  bubbleTimer = 0;
  tckScene = {
    kind,
    frame: 0,
    line: null,
    lineIndex: -1,
    sceneKey,
    spoken: false,
    waitUntil: kind === "marichka_project" ? 95 : 50,
  };
  if (!loopActive) {
    if (raf) cancelAnimationFrame(raf);
    loop();
  }
}

function finishTckScene() {
  if (tckScene?.kind === "marichka_project") {
    marichkaProjectSceneSeen = true;
  } else if (tckScene && tckScene.sceneKey) {
    tckSceneSeenLevels[tckScene.sceneKey] = true;
  }
  saveGame();
  tckScene = null;
  startLevel();
}

function updateTckScene() {
  if (!tckScene) return;
  const sceneLines =
    tckScene.kind === "marichka_project"
      ? MARICHKA_PROJECT_LINES
      : TCK_SCENE_LINES;
  tckScene.frame++;
  fr++;
  bgOff += 1.2;
  if (!tckScene.spoken && tckScene.frame >= tckScene.waitUntil) {
    tckScene.lineIndex++;
    tckScene.line = sceneLines[tckScene.lineIndex] || null;
    if (tckScene.line) {
      tckScene.spoken = true;
      speakSceneLine(tckScene.line);
    }
  }
  if (!tckScene.line && tckScene.lineIndex >= sceneLines.length)
    finishTckScene();
}

function drawSpeechBox(who, text, x, y, align = "left") {
  const maxW = 270,
    lineH = 16,
    pad = 9;
  ctx.font = "bold 13px sans-serif";
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  words.forEach((word) => {
    const test = cur ? cur + " " + word : word;
    if (ctx.measureText(test).width > maxW - pad * 2 && cur) {
      lines.push(cur);
      cur = word;
    } else cur = test;
  });
  if (cur) lines.push(cur);
  const h = pad * 2 + 18 + lines.length * lineH;
  const w = maxW;
  const bx = align === "right" ? x - w : x;
  const isAndrii = who === "Андрій";
  const isMarichka = who === "Марічка";
  ctx.fillStyle = "rgba(8,12,24,0.9)";
  ctx.strokeStyle = isAndrii ? "#ffd700" : isMarichka ? "#ff69b4" : "#ff5c5c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, y, w, h, 8);
  else ctx.rect(bx, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isAndrii ? "#ffd700" : isMarichka ? "#ff9ed2" : "#ff9a9a";
  ctx.fillText(who, bx + pad, y + 18);
  ctx.fillStyle = "#eef3ff";
  ctx.font = "13px sans-serif";
  lines.forEach((line, i) => ctx.fillText(line, bx + pad, y + 38 + i * lineH));
}

function drawStoryAndrii(x, y) {
  ctx.save();
  const oldLane = pLane,
    oldY = pY,
    oldSlide = pSlide,
    oldInv = inv,
    oldLaneX = LANES[0];
  pLane = 0;
  pY = y;
  pSlide = false;
  inv = 0;
  LANES[0] = x;
  drawPlayer();
  LANES[0] = oldLaneX;
  pLane = oldLane;
  pY = oldY;
  pSlide = oldSlide;
  inv = oldInv;
  ctx.restore();
}

function drawTckPerson(x, y, step = 0) {
  const sway = Math.sin((fr + step) * 0.12) * 3;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#273245";
  ctx.fillRect(x - 13, y - 48, 26, 34);
  ctx.fillStyle = "#1a2230";
  ctx.fillRect(x - 15, y - 22, 30, 12);
  ctx.fillStyle = "#1b2638";
  ctx.fillRect(x - 12, y - 14 + sway, 9, 20);
  ctx.fillRect(x + 3, y - 14 - sway, 9, 20);
  ctx.fillStyle = "#111";
  ctx.fillRect(x - 13, y + 3 + sway, 12, 6);
  ctx.fillRect(x + 1, y + 3 - sway, 12, 6);
  ctx.fillStyle = "#d8b38c";
  ctx.beginPath();
  ctx.arc(x, y - 60, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#172033";
  ctx.fillRect(x - 13, y - 72, 26, 8);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(x - 4, y - 46, 8, 4);
  ctx.strokeStyle = "#d8b38c";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 12, y - 40);
  ctx.lineTo(x - 24, y - 24);
  ctx.moveTo(x + 12, y - 40);
  ctx.lineTo(x + 24, y - 24);
  ctx.stroke();
}

function drawBlackCar(x, y) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x + 58, y + 48, 90, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#050608";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, 128, 48, 10);
  else ctx.rect(x, y, 128, 48);
  ctx.fill();
  ctx.fillStyle = "#121722";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x + 22, y - 22, 74, 34, 8);
  else ctx.rect(x + 22, y - 22, 74, 34);
  ctx.fill();
  ctx.fillStyle = "#1e3048";
  ctx.fillRect(x + 30, y - 16, 26, 20);
  ctx.fillRect(x + 62, y - 16, 28, 20);
  ctx.fillStyle = "#111";
  ctx.fillRect(x + 12, y + 30, 104, 14);
  ctx.fillStyle = "#ffdf66";
  ctx.fillRect(x + 110, y + 14, 10, 8);
  ctx.fillStyle = "#dd2233";
  ctx.fillRect(x + 3, y + 18, 8, 8);
  ctx.fillStyle = "#090909";
  [26, 100].forEach((wx) => {
    ctx.beginPath();
    ctx.arc(x + wx, y + 45, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#30343a";
    ctx.beginPath();
    ctx.arc(x + wx, y + 45, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#090909";
  });
  ctx.restore();
}

function drawStoryMarichka(x, y, holdingProject) {
  const step = Math.sin(fr * 0.22) * 7;
  drawMarichkaRemodel(x, y, { step, holdingProject });
  return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 19, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#24304a";
  ctx.fillRect(x - 10, y - 5, 7, 19 + step);
  ctx.fillRect(x + 3, y - 5, 7, 19 - step);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x - 11, y - 7, 8, 8);
  ctx.fillRect(x + 3, y - 7, 8, 8);

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#19a7ff";
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 42);
  ctx.quadraticCurveTo(x - 42, y - 32, x - 31, y - 7);
  ctx.lineTo(x - 12, y - 4);
  ctx.lineTo(x - 5, y - 39);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 9, y - 42);
  ctx.quadraticCurveTo(x + 42, y - 32, x + 31, y - 7);
  ctx.lineTo(x + 12, y - 4);
  ctx.lineTo(x + 5, y - 39);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#ffe45c";
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 3);
  ctx.lineTo(x - 14, y - 35);
  ctx.quadraticCurveTo(x, y - 43, x + 14, y - 35);
  ctx.lineTo(x + 18, y - 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#1f5b8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 39);
  ctx.lineTo(x, y - 7);
  ctx.stroke();
  ctx.fillStyle = "#101820";
  for (let i = 0; i < 4; i++) {
    const by = y - 32 + i * 6;
    ctx.fillRect(x - 11, by, 3, 3);
    ctx.fillRect(x + 8, by, 3, 3);
  }
  ctx.strokeStyle = "#1f5b8f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 23);
  ctx.lineTo(x - 24, y - 18);
  ctx.moveTo(x + 16, y - 23);
  ctx.lineTo(x + 24, y - 18);
  ctx.stroke();

  ctx.strokeStyle = "#f0d0a8";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 39);
  ctx.lineTo(x - 24, y - 20);
  ctx.moveTo(x + 11, y - 39);
  ctx.lineTo(x + 24, y - 20);
  ctx.stroke();

  ctx.strokeStyle = "#0d5fb8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 11, y - 43);
  ctx.quadraticCurveTo(x - 23, y - 27, x - 31, y - 10);
  ctx.moveTo(x + 11, y - 43);
  ctx.quadraticCurveTo(x + 23, y - 27, x + 31, y - 10);
  ctx.stroke();

  ctx.fillStyle = "#f0d0a8";
  ctx.beginPath();
  ctx.arc(x, y - 62, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a1a0a";
  ctx.beginPath();
  ctx.arc(x, y - 69, 12, Math.PI, 0);
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = "#3a1a0a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 64);
  ctx.quadraticCurveTo(x - 18, y - 52, x - 17, y - 34);
  ctx.moveTo(x + 10, y - 64);
  ctx.quadraticCurveTo(x + 18, y - 52, x + 17, y - 34);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 72);
  ctx.quadraticCurveTo(x, y - 75, x + 7, y - 72);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#0d5fb8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 13, y - 73);
  ctx.quadraticCurveTo(x - 31, y - 55, x - 27, y - 20);
  ctx.moveTo(x + 13, y - 73);
  ctx.quadraticCurveTo(x + 31, y - 55, x + 27, y - 20);
  ctx.stroke();
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 17, y - 72);
  ctx.quadraticCurveTo(x - 36, y - 54, x - 33, y - 23);
  ctx.moveTo(x + 17, y - 72);
  ctx.quadraticCurveTo(x + 36, y - 54, x + 33, y - 23);
  ctx.stroke();

  const flowers = [
    [-14, -76, "#0057b7"],
    [-7, -80, "#ffd700"],
    [0, -78, "#0057b7"],
    [8, -80, "#ffd700"],
    [15, -76, "#0057b7"],
  ];
  flowers.forEach(([fx, fy, col], i) => {
    ctx.fillStyle = col;
    for (let p = 0; p < 5; p++) {
      const a = (Math.PI * 2 * p) / 5 + i * 0.2;
      ctx.beginPath();
      ctx.arc(x + fx + Math.cos(a) * 3, y + fy + Math.sin(a) * 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a2a05";
    ctx.beginPath();
    ctx.arc(x + fx, y + fy, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(x - 4, y - 63, 2, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 63, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9a4b36";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y - 58, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  if (holdingProject) {
    ctx.save();
    ctx.translate(x + 24, y - 28);
    ctx.rotate(-0.12);
    ctx.fillStyle = "#f5ecd4";
    ctx.fillRect(-14, -18, 28, 36);
    ctx.fillStyle = "#2878bd";
    ctx.fillRect(-14, -18, 28, 7);
    ctx.fillStyle = "#333";
    ctx.font = "bold 6px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ПРОЄКТ", 0, -6);
    ctx.fillStyle = "#7396a8";
    ctx.fillRect(-9, 0, 18, 2);
    ctx.fillRect(-9, 5, 14, 2);
    ctx.restore();
  }
  ctx.restore();
}

function drawMarichkaProjectScene() {
  if (!tckScene) return;
  const f = tckScene.frame;
  const lv = getLvl();
  ctx.fillStyle = lv.sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#23334a";
  ctx.fillRect(0, 78, W, GND - 78);
  for (let x = 30; x < W; x += 115) {
    ctx.fillStyle = "#547090";
    ctx.fillRect(x, 105, 82, 112);
    ctx.fillStyle = "#f4cc62";
    ctx.fillRect(x + 14, 123, 18, 24);
    ctx.fillRect(x + 48, 123, 18, 24);
  }
  ctx.fillStyle = lv.road;
  ctx.fillRect(0, GND - 10, W, H - GND + 10);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(LANES[i] - 42, GND - 4, 84, H - GND + 4);
  }

  const andriiX = Math.min(W + 100, 120 + f * 3.8);
  if (andriiX < W + 50) drawStoryAndrii(andriiX, GND);

  if (f > 38 && tckScene.lineIndex < 1) {
    ctx.save();
    ctx.translate(345, GND - 8);
    ctx.rotate(-0.16);
    ctx.fillStyle = "#f5ecd4";
    ctx.fillRect(-18, -12, 36, 24);
    ctx.fillStyle = "#2878bd";
    ctx.fillRect(-18, -12, 36, 6);
    ctx.fillStyle = "#333";
    ctx.font = "bold 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ПРОЄКТ", 0, 3);
    ctx.restore();
  }

  const marichkaX = Math.min(410, -55 + Math.max(0, f - 30) * 3.2);
  drawStoryMarichka(marichkaX, GND, tckScene.lineIndex >= 1);

  if (tckScene.line)
    drawSpeechBox(tckScene.line.who, tckScene.line.text, 650, 46, "right");

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = "#aabbcc";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Марічка знайшла забутий проєкт Андрія",
    W / 2,
    H - 13,
  );
  ctx.textAlign = "left";
}

function drawSchoolMarichkaScene() {
  if (gameState !== "schoolEnter") return;
  const doorX = finishX + 249;
  const catchProgress = Math.min(schoolEnterTimer / 52, 1);
  const catchEase = 1 - Math.pow(1 - catchProgress, 3);
  const waitX = doorX - 58;
  let x = -50 + (waitX + 50) * catchEase;
  const holdingProject = schoolDialogueStep < 2;

  if (schoolDialogueDone) {
    const enterProgress = Math.min(schoolExitTimer / 94, 1);
    const enterEase = 1 - Math.pow(1 - enterProgress, 3);
    x = waitX + (doorX - waitX) * enterEase;
    const scale = 1 - Math.max(0, enterProgress - 0.46) * 0.7;
    ctx.save();
    ctx.translate(x, GND);
    ctx.scale(scale, scale);
    ctx.translate(-x, -GND);
    ctx.globalAlpha =
      enterProgress > 0.78
        ? Math.max(0, (1 - enterProgress) / 0.22)
        : 1;
    drawStoryMarichka(x, GND, false);
    ctx.restore();
  } else {
    drawStoryMarichka(x, GND, holdingProject);
  }

  if (schoolDialogueStep === 1) {
    drawSpeechBox(
      "\u041c\u0430\u0440\u0456\u0447\u043a\u0430",
      MARICHKA_SCHOOL_PROJECT,
      650,
      48,
      "right",
    );
    return;
  }
  if (schoolDialogueStep === 1) {
    drawSpeechBox(
      "Марічка",
      "Андрію, зачекай! Ти забув свій проєкт.",
      650,
      48,
      "right",
    );
  } else if (schoolDialogueStep === 2) {
    drawSpeechBox(
      "Андрій",
      "Дякую, Марічко! Ти мене врятувала.",
      28,
      48,
      "left",
    );
  }
}

function drawSchoolPursuersScene() {
  if (gameState !== "schoolEnter") return;
  const doorX = finishX + 249;
  const arrival = Math.min(Math.max((schoolEnterTimer - 12) / 54, 0), 1);
  const ease = 1 - Math.pow(1 - arrival, 3);
  const stopX = doorX - 145;
  const pursuerType = currentLocation === 1 ? "tck" : "cop";

  for (let i = 0; i < 2; i++) {
    const pursuerX = -105 - i * 52 + (stopX - i * 46 + 105 + i * 52) * ease;
    drawObs({ x: pursuerX, type: pursuerType, lane: i });
  }
}

function drawTckScene() {
  if (!tckScene) return;
  const f = tckScene.frame;
  const lv = getLvl();
  ctx.fillStyle = lv.sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#101927";
  ctx.fillRect(0, 0, W, 80);
  ctx.fillStyle = lv.road;
  ctx.fillRect(0, GND - 16, W, H - GND + 16);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(LANES[i] - 42, GND - 4, 84, H - GND + 4);
  }
  ctx.fillStyle = "#22304a";
  ctx.fillRect(0, GND - 5, W, 10);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let x = -80 + ((f * 2) % 120); x < W + 120; x += 120)
    ctx.fillRect(x, GND + 36, 54, 4);

  const carX = Math.min(430, -170 + f * 3.1);
  drawBlackCar(carX, GND - 68);
  drawStoryAndrii(160, GND);

  const tckAlpha = Math.min(1, Math.max(0, (f - 150) / 70));
  ctx.globalAlpha = tckAlpha;
  drawTckPerson(455, GND, 0);
  drawTckPerson(515, GND, 20);
  ctx.globalAlpha = 1;

  if (tckScene.line) {
    const fromAndrii = tckScene.line.who === "Андрій";
    drawSpeechBox(
      tckScene.line.who,
      tckScene.line.text,
      fromAndrii ? 28 : 650,
      54,
      fromAndrii ? "left" : "right",
    );
  }

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, H - 34, W, 34);
  ctx.fillStyle = "#aabbcc";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Натисни будь-яку кнопку, щоб пропустити сцену", W / 2, H - 13);
  ctx.textAlign = "left";
}

function completeLevelAfterSchool() {
  const lv = getLvl();
  const isFinalLevel = currentLevel >= getLevels().length - 1;
  addQuestProgress("levels");
  addQuestProgress("finishes");
  runCoins += lv.bonusCoins;
  totalCoins += runCoins;
  if (isFinalLevel) {
    if (currentLocation === 0) progressKyiv = getLevels().length;
    else progressLviv = getLevels().length;
  }
  syncCoins();
  saveGame();
  hudUp();
  sfxWin();
  speakAndriiForce(ANDRII_WIN);
  addConfetti();

  if (isFinalLevel) {
    gameState = "win";
    winTimer = 0;
  } else {
    gameState = "levelClear";
    levelClearTimer = 0;
  }
}

function update() {
  if (gameState === "story") {
    updateTckScene();
    return;
  }
  if (gameState === "win") {
    winTimer++;
    if (winTimer === 1) {
      addConfetti();
      addConfetti();
    }
    if (winTimer % 40 === 0 && winTimer < 120) addConfetti();
    return;
  }
  if (gameState === "levelClear") {
    levelClearTimer++;
    if (levelClearTimer === 1) {
      addConfetti();
    }
    if (levelClearTimer % 60 === 0 && levelClearTimer < LEVEL_CLEAR_AUTO_DELAY)
      addConfetti();
    if (levelClearTimer >= LEVEL_CLEAR_AUTO_DELAY) {
      nextLevel();
    }
    return;
  }
  if (gameState === "schoolEnter") {
    schoolEnterTimer++;
    if (schoolDialogueDone) schoolExitTimer++;
    fr++;
    pY = GND;
    pVY = 0;
    pSlide = false;
    if (schoolEnterTimer === 22 && schoolDialogueStep === 0) {
      schoolDialogueStep = 1;
      speakAndWait(MARICHKA_SCHOOL_PROJECT)
        .then(() => {
          if (gameState !== "schoolEnter") return null;
          schoolDialogueStep = 2;
          return speakAndWait("Дякую Марічко ти мене врятувала");
        })
        .then(() => {
          if (gameState !== "schoolEnter") return;
          schoolDialogueStep = 0;
          schoolDialogueDone = true;
        });
    }
    if ((schoolDialogueDone && schoolExitTimer >= 100) || schoolEnterTimer >= 600)
      completeLevelAfterSchool();
    return;
  }
  if (gameState !== "run") return;
  fr++;
  const lv = getLvl();
  const FDIST = getFinishDistance();
  const diffMult = { easy: 0.75, normal: 1.0, hard: 1.4 }[settingDiff] || 1.0;
  const speedUpgradeMult = getSpeedUpgradeMult();
  const base = Math.min(lv.baseSpd, LEVEL_START_SPEED_CAP) * diffMult * speedUpgradeMult;
  const maxS = lv.maxSpd * diffMult * speedUpgradeMult;
  const accel = 0.0012 * diffMult * (1 + currentLevel * 0.15);
  const pct = Math.min(totalDist / FDIST, 1);
  if (pct < 0.5) {
    spd = Math.min(base + fr * accel, maxS);
  } else {
    spd = Math.min(spd, maxS);
  }
  if (puddleSlow > 0) {
    spd *= 0.68;
    puddleSlow--;
  }
  score = Math.round((fr * spd) / 10);
  const distanceStep = spd / 60;
  totalDist += distanceStep;
  addQuestProgress("distance", distanceStep);
  if (fr % 120 === 0) saveGame();

  if (
    secretRoute &&
    !secretRoute.offered &&
    !secretRoute.completed &&
    !secretRoute.missed &&
    secretRoute.attempts < 2 &&
    totalDist >= FDIST * secretRoute.nextOfferPct
  ) {
    secretRoute.offered = true;
    secretRoute.entranceX = W + 90;
    showAndriiBubble(secretRoute.hint);
  }
  if (
    secretRoute &&
    secretRoute.offered &&
    !secretRoute.active &&
    !secretRoute.completed &&
    !secretRoute.missed
  ) {
    secretRoute.entranceX -= spd;
    if (secretRoute.entranceX < -70) {
      secretRoute.attempts++;
      if (secretRoute.attempts < 2) {
        secretRoute.offered = false;
        secretRoute.nextOfferPct = 0.62;
      } else {
        secretRoute.missed = true;
      }
    }
  }
  if (secretRoute && secretRoute.active) {
    if (secretRoute.entering) {
      secretRoute.transitionTimer++;
      spd = 0;
      pVY = 0;
      pY = GND;
      if (secretRoute.transitionTimer >= 48) {
        secretRoute.entering = false;
        bgOff = 0;
        showAndriiBubble(
          `\u0421\u0435\u043a\u0440\u0435\u0442\u043d\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442: ${secretRoute.name}!`,
        );
      }
    } else {
      secretRoute.timer++;
      spd = Math.min(
        Math.max(spd, secretRoute.resumeSpeed || 0.1),
        3.15,
      );
      if (secretRoute.timer % 56 === 8) {
        const lane = Math.floor(secretRoute.timer / 56) % 3;
        coins.push({
          x: W + 25,
          lane,
          y:
            secretRoute.id === "roofs" && lane === 1
              ? GND - 70
              : secretRoute.id === "metro" && lane !== 1
                ? GND - 44
                : GND,
          done: false,
        });
      }
      if (secretRoute.id === "metro" && secretRoute.timer % 84 === 24) {
        for (let lane = 0; lane < 3; lane++) {
          coins.push({
            x: W + 35 + lane * 28,
            lane,
            y: lane === 1 ? GND - 18 : GND - 52,
            done: false,
          });
        }
      }
      if (secretRoute.timer >= SECRET_ROUTE_DURATION) completeSecretRoute();
    }
  }

  const isKyivFinalBoss =
    currentLocation === 0 && currentLevel === LEVELS_KYIV.length - 1;
  const secretRouteResolved =
    !secretRoute || secretRoute.completed || secretRoute.missed;
  if (
    isKyivFinalBoss &&
    !bossActive &&
    !bossDefeated &&
    secretRouteResolved &&
    totalDist >= FDIST - 240
  ) {
    bossActive = true;
    bossHp = BOSS_MAX_HP;
    bossX = W + 90;
    bossTransform = 0;
    bossShotCooldown = 150;
    bossSummonCooldown = 260;
    bossSpecialCooldown = 430;
    chaserX = -220;
    obs = [];
    coins = [];
    magnets = [];
    shields = [];
    superJumps = [];
    cityGifts = [];
    speakAndrii(["Ого! Машина перетворюється на трансформера!"]);
  }
  if (bossActive) {
    bossX += (535 - bossX) * 0.04;
    bossTransform = Math.min(120, bossTransform + 1);
    spd = Math.min(spd, 2.15);
    if (bossFlash > 0) bossFlash--;
    if (bossTransform >= 90) {
      if (bossTransform === 90) updateFireControl();
      bossShotCooldown--;
      bossSummonCooldown--;
      bossSpecialCooldown--;
      if (bossShotCooldown <= 0) {
        const lane = Math.floor(Math.random() * 3);
        bullets.push({
          x: bossX - 8,
          y: GND - 38,
          lane,
          vx: -(spd + 6.2),
          life: 100,
        });
        bossShotCooldown = Math.max(48, 92 - currentLevel * 2);
        bossFlash = 6;
        sfxShot();
      }
      if (bossSummonCooldown <= 0) {
        for (let lane = 0; lane < 3; lane++) {
          obs.push({
            x: bossX - 25 + lane * 22,
            lane,
            type: "boss_dancer",
            dancePhase: lane * 2.1,
          });
        }
        bossSummonCooldown = 360;
        sfxBossDanceSummon();
      }
      if (bossSpecialCooldown <= 0) {
        for (let lane = 0; lane < 3; lane++) {
          bullets.push({
            x: bossX + lane * 34,
            y: GND - 38,
            lane,
            vx: -(spd + 3.8 + lane * 0.45),
            life: 145 + lane * 10,
            type: "dance_hologram",
            phase: lane * 2.2,
          });
        }
        bossSpecialCooldown = 520;
        bossFlash = 14;
        sfxBossDanceSummon();
      }
    }
  }

  if (
    !finishActive &&
    secretRouteResolved &&
    (!isKyivFinalBoss || bossDefeated) &&
    totalDist >= FDIST - FINISH_APPROACH_DISTANCE
  ) {
    finishActive = true;
    finishX = W + 100;
  }
  if (finishActive) {
    finishX -= spd;
    if (finishX < W / 2) {
      gameState = "schoolEnter";
      schoolEnterTimer = 0;
      schoolDialogueStep = 0;
      schoolDialogueDone = false;
      schoolExitTimer = 0;
      spd = 0;
      obs = [];
      bullets = [];
      playerBullets = [];
      shields = [];
      superJumps = [];
      chaserX = -220;
      showAndriiBubble("\u0423\u0440\u0430! \u042f \u0434\u0456\u0441\u0442\u0430\u0432\u0441\u044f \u0434\u043e \u0448\u043a\u043e\u043b\u0438!");
      return;
    }
  }

  pY += pVY;
  const wasAirborne = pY < GND;
  pVY += 0.75;
  if (pY >= GND) {
    if (wasAirborne && pVY > 3) sfxLand();
    pY = GND;
    pVY = 0;
  }
  if (pSlide) {
    slideT--;
    if (slideT <= 0) pSlide = false;
  }
  if (magnetTimer > 0) magnetTimer--;
  if (superJumpTimer > 0) superJumpTimer--;
  if (coinComboTimer > 0) {
    coinComboTimer--;
    if (coinComboTimer <= 0) resetCoinCombo();
  }
  if (trickJumpTimer > 0) trickJumpTimer--;
  if (trickSlideTimer > 0) trickSlideTimer--;
  if (trickComboTimer > 0) {
    trickComboTimer--;
    if (trickComboTimer <= 0) {
      trickComboMult = 1;
      trickComboStreak = 0;
    }
  }
  if (inv > 0) inv--;
  if (fireCooldown > 0) fireCooldown--;
  if (lightningFlash > 0) lightningFlash--;
  if (isStormWeather()) {
    if (fr % 22 === 0) sfxRainLayer();
    nextLightning--;
    if (nextLightning <= 0) {
      lightningFlash = 18;
      nextLightning = 250 + ((Math.random() * 320) | 0);
      sfxThunder();
    }
  }
  if (!bossActive && !secretRoute?.active && chaserX < LANES[0] - 100)
    chaserX += 0.5 + (spd - 2.8) * 0.1;
  if (andriiCooldown > 0) andriiCooldown--;

  // перший ворог на екрані — Андрій реагує
  if (!andriiFirstObs && obs.length > 0) {
    const firstEnemy = obs.find((o) => o.type === "cop" || o.type === "tck");
    if (firstEnemy && firstEnemy.x < W - 50) {
      andriiFirstObs = true;
      speakAndrii(firstEnemy.type === "tck" ? ANDRII_TCK : ANDRII_COP);
    }
  }
  bgOff += spd;

  const interval = Math.max(
    160 - Math.floor(spd * 6),
    settingDiff === "hard" ? 55 : 80,
  );
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    fr % interval === 0 &&
    totalDist < FDIST - 100
  )
    spawnObs();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    fr % 110 === 0 &&
    totalDist < FDIST - 50
  )
    spawnCoin();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    fr % 620 === 180 &&
    totalDist > 80 &&
    totalDist < FDIST - 160
  )
    spawnMagnet();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    shieldCharges <= 0 &&
    fr % 760 === 300 &&
    totalDist > 100 &&
    totalDist < FDIST - 180
  )
    spawnShield();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    superJumpTimer <= 0 &&
    fr % 840 === 420 &&
    totalDist > 120 &&
    totalDist < FDIST - 180
  )
    spawnSuperJump();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    fr % 260 === 80 &&
    totalDist < FDIST - 80
  )
    spawnCityGift(false);
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    fr % 780 === 220 &&
    totalDist < FDIST - 120
  )
    spawnCityGift(true);

  obs.forEach((o) => (o.x -= spd + (o.vx || 0)));
  coins.forEach((c) => {
    c.x -= spd;
    const tx = LANES[pLane];
    const ty = pY - 34;
    const cx = c.x ?? LANES[c.lane];
    const cy = c.y - 14;
    const dx = tx - cx;
    const dy = ty - cy;
    const dist = Math.hypot(dx, dy);
    if (magnetTimer > 0 && (dist < 190 || c.magneted)) {
      c.magneted = true;
      c.x = cx + dx * 0.16;
      c.y += dy * 0.12;
    } else {
      c.magneted = false;
    }
  });
  magnets.forEach((m) => (m.x -= spd));
  shields.forEach((s) => (s.x -= spd));
  superJumps.forEach((j) => (j.x -= spd));
  cityGifts.forEach((gift) => {
    gift.x += gift.vx - spd * 0.12;
    gift.giverX = (gift.giverX ?? gift.x) - spd * 0.12;
    gift.y += gift.vy;
    gift.life--;
    if (gift.y > GND - 15) {
      gift.y = GND - 15;
      gift.vy = 0;
      gift.vx *= 0.94;
    }
  });

  // ТЦК стріляють у Львові з третього рівня, коли їхня зброя вже видима.
  if (currentLocation === 1 && currentLevel >= 2) {
    obs.forEach((o) => {
      if (o.type !== "tck") return;
      if (!o.shotCooldown) o.shotCooldown = 0;
      o.shotCooldown--;
      // стріляє коли ТЦК на екрані та ближче 500px до гравця
      const playerX = LANES[pLane];
      const dist = o.x - playerX;
      if (dist > 30 && dist < 480 && o.shotCooldown <= 0) {
        const fireRate = Math.max(90 - currentLevel * 3, 30);
        o.shotCooldown = fireRate + ((Math.random() * 40) | 0);
        bullets.push({
          x: o.x - 16,
          y: GND - 38,
          lane: o.lane,
          vx: -(spd + 5),
          life: 80,
        });
        o.muzzleFlash = 5;
        sfxShot();
      }
    });
  }

  // рухаємо кулі
  bullets.forEach((b) => {
    b.prevX = b.x;
    b.x += b.vx;
    b.life--;
  });
  bullets = bullets.filter((b) => b.life > 0 && b.x > -20);
  playerBullets.forEach((b) => {
    b.x += b.vx;
    b.life--;
  });
  playerBullets = playerBullets.filter((b) => b.life > 0 && b.x < W + 40);

  playerBullets = playerBullets.filter((b) => {
    let hitTarget = false;
    bullets = bullets.filter((enemyShot) => {
      if (hitTarget || enemyShot.type !== "dance_hologram") return true;
      const shotRect = { x: b.x - 7, y: b.y - 6, w: 14, h: 12 };
      const hologramRect = {
        x: enemyShot.x - 24,
        y: enemyShot.y - 76,
        w: 48,
        h: 100,
      };
      if (!hit(shotRect, hologramRect)) return true;
      hitTarget = true;
      addParts(enemyShot.x, enemyShot.y - 30, "#ff4fc8");
      sfxHit();
      return false;
    });
    if (hitTarget) return false;
    if (
      bossActive &&
      bossTransform >= 90 &&
      b.x > bossX - 70 &&
      b.x < bossX + 60
    ) {
      hitTarget = true;
      bossHp -= getBulletDamage(b.type);
      bossFlash = 5;
      addParts(bossX - 25, GND - 95, "#8cffd8");
      sfxHit();
      if (bossHp <= 0) {
        bossHp = 0;
        bossActive = false;
        bossDefeated = true;
        bossTransform = 120;
        bossX = W + 180;
        updateFireControl();
        bullets = [];
        obs = obs.filter((o) => o.type !== "boss_dancer");
        addConfetti();
        addConfetti();
        addQuestProgress("bosses");
        addAchievementProgress("boss");
        runCoins += 250;
        hudUp();
        syncCoins();
        saveGame();
        speakAndrii(["Перемога! Трансформера знищено!"]);
      }
    }
    if (hitTarget) return false;
    obs = obs.filter((o) => {
      const isEnemy =
        o.type === "tck" || o.type === "cop" || o.type === "boss_dancer";
      const isMinigunTarget =
        b.type === "minigun" &&
        currentLocation === 1 &&
        o.type !== "boss_dancer" &&
        !isRoadHazard(o.type);
      const isLvivObject =
        currentLocation === 1 &&
        (b.type === "minigun"
          ? o.type !== "boss_dancer" && !isRoadHazard(o.type)
          : o.type === "kiosk" || o.type === "bollard");
      const laneMatches = isMinigunTarget || b.lane === o.lane;
      if (hitTarget || !laneMatches || (!isEnemy && !isLvivObject)) return true;
      const br =
        b.type === "minigun"
          ? {
              x: b.x - Math.max(22, b.vx),
              y: b.y - 10,
              w: Math.max(44, b.vx * 2),
              h: 20,
            }
          : b.type === "laser"
            ? { x: b.x - 48, y: b.y - 8, w: 86, h: 16 }
          : { x: b.x - 5, y: b.y - 4, w: 10, h: 8 };
      if (!hit(br, oRect(o))) return true;
      hitTarget = true;
      if (isEnemy) addQuestProgress("enemies");
      addParts(o.x, GND - 30, isEnemy ? "#ffd700" : "#c8860a");
      sfxHit();
      return false;
    });
    return !hitTarget;
  });

  obs = obs.filter((o) => o.x > -80);
  coins = coins.filter((c) => !c.done && c.x > -20);
  magnets = magnets.filter((m) => m.x > -50);
  shields = shields.filter((s) => s.x > -50);
  superJumps = superJumps.filter((j) => j.x > -50);
  cityGifts = cityGifts.filter((gift) => gift.life > 0 && gift.x > -30);

  const pr = pRect(),
    px = LANES[pLane];
  magnets = magnets.filter((m) => {
    if (m.lane !== pLane) return true;
    const mr = { x: m.x - 22, y: m.y - 24, w: 44, h: 48 };
    if (!hit(pr, mr)) return true;
    collectBackpackBonus("magnet", m.x, m.y, "#62d6ff");
    return false;
  });
  shields = shields.filter((s) => {
    if (s.lane !== pLane) return true;
    const sr = { x: s.x - 22, y: s.y - 24, w: 44, h: 48 };
    if (!hit(pr, sr)) return true;
    collectBackpackBonus("shield", s.x, s.y, "#58beff");
    return false;
  });
  superJumps = superJumps.filter((j) => {
    if (j.lane !== pLane) return true;
    const jr = { x: j.x - 22, y: j.y - 25, w: 44, h: 50 };
    if (!hit(pr, jr)) return true;
    collectBackpackBonus("jump", j.x, j.y, "#fff36a");
    return false;
  });
  cityGifts = cityGifts.filter((gift) => {
    const gr = { x: gift.x - 16, y: gift.y - 16, w: 32, h: 32 };
    if (!hit(pr, gr)) return true;
    runCoins += gift.value;
    addQuestProgress("coins", gift.value);
    sfxCoin();
    addParts(gift.x, gift.y, gift.secret ? "#ffd45c" : "#ffd700");
    hudUp();
    return false;
  });

  // перевірка куль
  bullets = bullets.filter((b) => {
    if (b.lane !== pLane) return true;
    const br =
      b.type === "dance_hologram"
        ? { x: b.x - 22, y: b.y - 74, w: 44, h: 98 }
        : {
            x: Math.min(b.prevX ?? b.x, b.x) - 5,
            y: b.y - 4,
            w: Math.abs(b.x - (b.prevX ?? b.x)) + 10,
            h: 8,
          };
    if (hit(pr, br) && inv === 0) {
      if (absorbShieldHit(b.x, b.y, "#58beff")) return false;
      resetCoinCombo();
      resetTrickCombo();
      lives--;
      inv = getDamageInvulnerabilityTime();
      flash = 22;
      sfxHit();
      addParts(px, pY - 30, "#ff6600");
      if (settingVib && navigator.vibrate) navigator.vibrate(80);
      if (lives <= 0) {
        gameState = "over";
        sfxGameOver();
        speakAndriiForce(ANDRII_LOSE);
        totalCoins += runCoins;
        syncCoins();
        saveGame();
      }
      hudUp();
      return false;
    }
    return true;
  });

  obs.forEach((o) => {
    if (o.lane !== pLane) return;
    if (o.type === "puddle") {
      if (!o.triggered && hit(pr, oRect(o))) {
        o.triggered = true;
        puddleSlow = Math.max(puddleSlow, 42);
        pSlide = true;
        slideT = Math.max(slideT, 20);
        addParts(px, GND - 5, "#77dfff");
        sfxLand();
      }
      return;
    }
    if (o.type === "hole" && pY < GND - 46) return;
    if (pSlide && o.type === "bollard") return;
    if (pY < GND - 50 && o.type === "kiosk") return;
    if (pY < GND - 48 && o.type === "scooter") return;
    if (hit(pr, oRect(o)) && inv === 0) {
      if (absorbShieldHit(o.x, GND - 28, "#58beff")) {
        o.x = -100;
        return;
      }
      resetCoinCombo();
      resetTrickCombo();
      lives--;
      inv = getDamageInvulnerabilityTime();
      flash = 22;
      sfxHit();
      addParts(px, pY - 20, "#ff4444");
      speakAndrii(ANDRII_HIT);
      if (settingVib && navigator.vibrate) navigator.vibrate(120);
      if (lives <= 0) {
        gameState = "over";
        sfxGameOver();
        speakAndriiForce(ANDRII_LOSE);
        totalCoins += runCoins;
        syncCoins();
        saveGame();
      }
      hudUp();
    }
  });
  coins = coins.filter((c) => {
    if (!c.magneted && c.lane !== pLane) return true;
    const coinX = c.x ?? LANES[c.lane];
    const coinY = c.y - 14;
    const cr = { x: coinX - 18, y: coinY - 26, w: 36, h: 52 };
    if (hit(pr, cr)) {
      const dangerPct = Math.min(
        Math.max((chaserX + 100) / (LANES[0] - 80), 0),
        1,
      );
      const dangerMult = dangerPct > 0.45 ? 2 : 1;
      const comboMult = registerCoinCombo();
      const trickMult = registerTrickCoinCombo();
      const mult = dangerMult * comboMult * trickMult;
      addQuestProgress("coins", mult);
      runCoins += mult;
      c.done = true;
      sfxCoin();
      addParts(coinX, coinY, "#ffd700");
      if (mult === 2) {
        addParts(coinX, coinY - 14, "#ff69b4");
      }
      if (comboMult > 1) {
        addParts(coinX, coinY - 24, "#fff36a");
      }
      if (trickMult > 1) {
        addParts(coinX, coinY - 34, "#62d6ff");
      }
      return false;
    }
    return true;
  });
  if (fr % 15 === 0) hudUp();
}

function loop() {
  if (gameState === "stopped") return;
  loopActive = true;
  ctx.clearRect(0, 0, W, H);
  if (gameState === "story") {
    if (tckScene?.kind === "marichka_project") drawMarichkaProjectScene();
    else drawTckScene();
    update();
    loopActive = false;
    if (gameState === "story") raf = requestAnimationFrame(loop);
    return;
  }
  drawBG();
  drawSecretRouteEntrance();
  drawFinishLine();
  superJumps.forEach(drawSuperJumpItem);
  shields.forEach(drawShieldItem);
  magnets.forEach(drawMagnet);
  coins.forEach(drawCoin);
  cityGifts.forEach(drawCityGift);
  obs.forEach(drawObs);
  drawKyivBoss();
  drawChaser();
  drawSchoolPursuersScene();
  drawSchoolMarichkaScene();
  drawPlayer();
  drawPlayerShieldAura();
  drawSuperJumpAura();
  drawRain();
  drawSecretTunnelForeground();
  drawParts();
  drawBullets();
  drawAndriiBubble();
  if (gameState === "run") {
    drawHUDCanvas();
    drawDistBar();
    drawSecretRouteHUD();
  }
  if (gameState === "win") {
    drawConfetti();
    drawWinOverlay();
  }
  if (gameState === "levelClear") {
    drawConfetti();
    drawLevelClearOverlay();
  }
  if (gameState === "idle" || gameState === "over") drawOverlay();
  update();
  loopActive = false;
  raf = requestAnimationFrame(loop);
}

// ── INTRO ──────────────────────────────────────────────────────────────────
const ANDRII_START = [
  "Ну що ж, побігли!",
  "Поїхали! Тримайтесь!",
  "Вперед, нікого не боюся!",
];
const ANDRII_COP = [
  "О, охоронець! Не дожене!",
  "Ану, спробуй мене зупини!",
  "Я швидший за тебе!",
  "Біжи-біжи, не доженеш!",
];
const ANDRII_TCK = [
  "ТЦК?! Та я вас не боюся!",
  "Повістку? Ні дякую, побіжу!",
  "Не сьогодні, хлопці!",
  "Я ще встигну на урок!",
];
const ANDRII_HIT = [
  "Ой! Але я не здаюсь!",
  "Все одно добіжу!",
  "Це ще не кінець!",
];
const ANDRII_LOSE = [
  "Ай, боляче! Але я повернусь!",
  "Ой боляче... Дайте відпочити!",
  "Ай! Цього разу не вийшло...",
];
const ANDRII_WIN = [
  "УРА! ПЕРЕМОГА! Я зробив це!",
  "Ура! Дійшов до фінішу! Слава Україні!",
  "ПЕРЕМОГА! Ніхто мене не зупинить!",
];

let andriiCooldown = 0; // щоб не кричав занадто часто
let andriiFirstObs = false; // флаг першого зіткнення з перешкодою на рівні

function speakAndrii(lines) {
  if (andriiCooldown > 0) return;
  andriiCooldown = 180;
  _doSpeakAndrii(lines);
}
function speakAndriiForce(lines) {
  andriiCooldown = 300;
  cancelSpeech();
  const text = lines[Math.floor(Math.random() * lines.length)];
  bubbleText = text;
  bubbleTimer = 260;
  speakAndWait(text);
}
function speakSceneLine(line) {
  cancelSpeech();
  bubbleText = line.text;
  bubbleTimer = 640;
  speakAndWait(line.text).then(() => {
    if (!tckScene || tckScene.line !== line) return;
    tckScene.spoken = false;
    tckScene.waitUntil = tckScene.frame + 90;
  });
}
function _doSpeakAndrii(lines) {
  const text = lines[Math.floor(Math.random() * lines.length)];
  showAndriiBubble(text);
  speakAndWait(text);
}

// Bubble над гравцем
let bubbleText = "",
  bubbleTimer = 0;
function showAndriiBubble(text) {
  bubbleText = text;
  bubbleTimer = 160;
}
function drawAndriiBubble() {
  if (bubbleTimer <= 0) return;
  bubbleTimer--;
  const x = LANES[pLane],
    y = pY - 80;
  const alpha = Math.min(1, bubbleTimer / 20);
  ctx.globalAlpha = alpha;
  // хмарка
  const pad = 8,
    tw = ctx.measureText(bubbleText).width + pad * 2;
  const bx = Math.max(10, Math.min(W - tw - 10, x - tw / 2));
  const by = Math.max(8, y - 30);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(bx, by, tw, 22, 5)
    : ctx.fillRect(bx, by, tw, 22);
  ctx.fill();
  // хвіст хмарки
  ctx.beginPath();
  ctx.moveTo(x - 6, by + 22);
  ctx.lineTo(x, by + 32);
  ctx.lineTo(x + 6, by + 22);
  ctx.fill();
  // текст
  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(bubbleText, bx + pad, by + 15);
  ctx.globalAlpha = 1;
}

const ROBOT_STORY_BY_LANG = {
  uk: [
    "Привіт! Я Роботрон-9000.",
    "Хочу розповісти тобі одну важливу історію...",
    "Жив собі хлопець на ім'я Андрій.",
    "Звичайний київський школяр — добрий і веселий.",
    "Кожного ранку він біг на уроки вулицями міста.",
    "Але сьогодні щось пішло не так...",
    "Охоронці вирішили його зупинити!",
    "Андрій не злякався.",
    "Він побіг — швидко, спритно, хоробро!",
    "Допоможи йому добігти до фінішу.",
    "Слава Україні! 🇺🇦",
  ],
  en: [
    "Hello! I am Robotron nine thousand.",
    "I want to tell you an important story.",
    "There once was a boy named Andrii.",
    "He was an ordinary Kyiv schoolboy, kind and cheerful.",
    "Every morning he ran through the city streets to his lessons.",
    "But today something went wrong.",
    "The guards decided to stop him!",
    "Andrii was not afraid.",
    "He ran fast, skillfully and bravely!",
    "Help him reach the finish line.",
    "Glory to Ukraine!",
  ],
  de: [
    "Hallo! Ich bin Robotron neuntausend.",
    "Ich möchte dir eine wichtige Geschichte erzählen.",
    "Es lebte einmal ein Junge namens Andrii.",
    "Er war ein gewöhnlicher Kyiver Schüler, freundlich und fröhlich.",
    "Jeden Morgen lief er durch die Straßen der Stadt zum Unterricht.",
    "Doch heute ging etwas schief.",
    "Die Wächter beschlossen, ihn aufzuhalten!",
    "Andrii hatte keine Angst.",
    "Er lief schnell, geschickt und mutig!",
    "Hilf ihm, die Ziellinie zu erreichen.",
    "Ruhm der Ukraine!",
  ],
  fr: [
    "Bonjour ! Je suis Robotron neuf mille.",
    "Je veux te raconter une histoire importante.",
    "Il était une fois un garçon nommé Andrii.",
    "C'était un écolier ordinaire de Kyiv, gentil et joyeux.",
    "Chaque matin, il courait dans les rues de la ville pour aller en classe.",
    "Mais aujourd'hui, quelque chose a mal tourné.",
    "Les gardes ont décidé de l'arrêter !",
    "Andrii n'a pas eu peur.",
    "Il s'est mis à courir, vite, habilement et courageusement !",
    "Aide-le à atteindre la ligne d'arrivée.",
    "Gloire à l'Ukraine !",
  ],
  es: [
    "¡Hola! Soy Robotron nueve mil.",
    "Quiero contarte una historia importante.",
    "Había una vez un chico llamado Andrii.",
    "Era un estudiante de Kyiv, amable y alegre.",
    "Cada mañana corría por las calles de la ciudad para ir a clase.",
    "Pero hoy algo salió mal.",
    "¡Los guardias decidieron detenerlo!",
    "Andrii no tuvo miedo.",
    "¡Corrió rápido, con habilidad y valentía!",
    "Ayúdalo a llegar a la meta.",
    "¡Gloria a Ucrania!",
  ],
};
function getRobotStory() {
  return ROBOT_STORY_BY_LANG[settingRobotVoiceLang] || ROBOT_STORY_BY_LANG.uk;
}

const ic = document.getElementById("introCanvas");
const ix = ic.getContext("2d");
const IW = 340,
  IH = 220;
let iFr = 0,
  iRaf = null,
  iPhase = 0,
  iCharIdx = 0,
  iTyping = false,
  introStarted = false;
let iTypedText = "",
  iPhaseTimer = 0;
const ISTATE = { TYPING: 0, PAUSE: 1, DONE: 2 };
let iState = ISTATE.TYPING;

// Малюємо робота
function drawBot(f, talking) {
  ix.clearRect(0, 0, IW, IH);
  // фон
  const grad = ix.createLinearGradient(0, 0, 0, IH);
  grad.addColorStop(0, "#06061a");
  grad.addColorStop(1, "#0a1228");
  ix.fillStyle = grad;
  ix.fillRect(0, 0, IW, IH);
  // сітка
  ix.strokeStyle = "rgba(0,180,255,0.06)";
  ix.lineWidth = 1;
  for (let i = 0; i < IW; i += 20) {
    ix.beginPath();
    ix.moveTo(i, 0);
    ix.lineTo(i, IH);
    ix.stroke();
  }
  for (let i = 0; i < IH; i += 20) {
    ix.beginPath();
    ix.moveTo(0, i);
    ix.lineTo(IW, i);
    ix.stroke();
  }

  const cx = 170,
    bob = Math.sin(f * 0.05) * 3;
  const step = Math.sin(f * 0.12) * 12;
  const arm = Math.sin(f * 0.09) * 0.3;

  // тінь
  ix.fillStyle = "rgba(0,150,255,0.08)";
  ix.beginPath();
  ix.ellipse(cx, IH - 18, 22, 5, 0, 0, Math.PI * 2);
  ix.fill();

  // ноги
  ix.fillStyle = "#1a3a6a";
  ix.fillRect(cx - 18, IH - 58 + bob, 12, 28 + step);
  ix.fillRect(cx + 6, IH - 58 + bob, 12, 28 - step);
  // ступні
  ix.fillStyle = "#0d2a52";
  ix.fillRect(cx - 20, IH - 32 + bob + step, 16, 7);
  ix.fillRect(cx + 4, IH - 32 + bob - step, 16, 7);
  // блиск ступень
  ix.fillStyle = "rgba(0,180,255,0.25)";
  ix.fillRect(cx - 19, IH - 32 + bob + step, 14, 2);
  ix.fillRect(cx + 5, IH - 32 + bob - step, 14, 2);

  // тіло
  const bodyY = IH - 115 + bob;
  ix.fillStyle = "#122a5a";
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 28, bodyY, 56, 58, 6)
    : ix.fillRect(cx - 28, bodyY, 56, 58);
  ix.fill();
  // ребра тіла
  ix.strokeStyle = "rgba(0,150,255,0.3)";
  ix.lineWidth = 1;
  for (let r = 0; r < 3; r++) {
    ix.beginPath();
    ix.moveTo(cx - 28, bodyY + 10 + r * 14);
    ix.lineTo(cx + 28, bodyY + 10 + r * 14);
    ix.stroke();
  }
  // панель
  ix.fillStyle = "#0a1e44";
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 18, bodyY + 8, 36, 28, 3)
    : ix.fillRect(cx - 18, bodyY + 8, 36, 28);
  ix.fill();
  // кнопки
  const btns = [
    ["#ff4455", cx - 10, bodyY + 16],
    ["#ffd700", cx, bodyY + 16],
    ["#44ff99", cx + 10, bodyY + 16],
    ["#00aaff", cx - 5, bodyY + 27],
    ["#ff66ff", cx + 5, bodyY + 27],
  ];
  btns.forEach(([c, bx, by], i) => {
    ix.fillStyle = c;
    ix.beginPath();
    ix.arc(bx, by, 2.5, 0, Math.PI * 2);
    ix.fill();
    if (f % 40 < 20 && Math.floor(f / 40) % 5 === i) {
      ix.fillStyle = c;
      ix.globalAlpha = 0.4;
      ix.beginPath();
      ix.arc(bx, by, 5, 0, Math.PI * 2);
      ix.fill();
      ix.globalAlpha = 1;
    }
  });
  // нашивка UA
  ix.fillStyle = "#1565c0";
  ix.fillRect(cx - 26, bodyY + 2, 14, 8);
  ix.fillStyle = "#ffd700";
  ix.fillRect(cx - 26, bodyY + 6, 14, 4);

  // руки
  ix.save();
  ix.translate(cx - 28, bodyY + 8);
  ix.rotate(-arm - 0.15);
  ix.fillStyle = "#1a3a6a";
  ix.fillRect(-5, -5, 10, 28);
  ix.fillStyle = "#0d2a52";
  ix.beginPath();
  ix.arc(0, 26, 6, 0, Math.PI * 2);
  ix.fill();
  ix.restore();
  ix.save();
  ix.translate(cx + 28, bodyY + 8);
  ix.rotate(arm + 0.15);
  ix.fillStyle = "#1a3a6a";
  ix.fillRect(-5, -5, 10, 28);
  ix.fillStyle = "#0d2a52";
  ix.beginPath();
  ix.arc(0, 26, 6, 0, Math.PI * 2);
  ix.fill();
  ix.restore();

  // шия
  ix.fillStyle = "#0f2248";
  ix.fillRect(cx - 6, bodyY - 10, 12, 12);

  // голова
  const hy = bodyY - 55;
  ix.fillStyle = "#122a5a";
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 24, hy, 48, 46, 8)
    : ix.fillRect(cx - 24, hy, 48, 46);
  ix.fill();
  // вуха-динаміки
  ix.fillStyle = "#0a1e44";
  ix.beginPath();
  ix.arc(cx - 24, hy + 20, 7, 0, Math.PI * 2);
  ctx.fill();
  ix.beginPath();
  ix.arc(cx + 24, hy + 20, 7, 0, Math.PI * 2);
  ctx.fill();
  // решітки вух
  ix.strokeStyle = "rgba(0,150,255,0.5)";
  ix.lineWidth = 1;
  for (let d = -4; d <= 4; d += 2) {
    ix.beginPath();
    ix.moveTo(cx - 24 + d, hy + 14);
    ix.lineTo(cx - 24 + d, hy + 26);
    ix.stroke();
    ix.beginPath();
    ix.moveTo(cx + 24 + d, hy + 14);
    ix.lineTo(cx + 24 + d, hy + 26);
    ix.stroke();
  }
  // антена
  ix.strokeStyle = "#4488cc";
  ix.lineWidth = 2;
  ix.beginPath();
  ix.moveTo(cx, hy);
  ix.lineTo(cx, hy - 18);
  ix.stroke();
  const aGlow = 0.5 + 0.5 * Math.sin(f * 0.15);
  ix.fillStyle = `rgba(255,60,100,${aGlow})`;
  ix.beginPath();
  ix.arc(cx, hy - 20, 4, 0, Math.PI * 2);
  ix.fill();
  if (aGlow > 0.8) {
    ix.fillStyle = "rgba(255,60,100,0.2)";
    ix.beginPath();
    ix.arc(cx, hy - 20, 9, 0, Math.PI * 2);
    ix.fill();
  }

  // очі — LED матриці
  const eyeGlow = 0.65 + 0.35 * Math.sin(f * 0.07);
  const eyeX = Math.sin(f * 0.03) * 2;
  [-1, 1].forEach((side, si) => {
    const ex = cx + side * 10;
    ix.fillStyle = "#040e1e";
    ix.fillRect(ex - 7, hy + 8, 14, 12);
    ix.fillStyle = `rgba(0,200,255,${eyeGlow})`;
    ix.fillRect(ex - 5, hy + 10, 10, 8);
    ix.fillStyle = "#fff";
    ix.fillRect(ex - 3 + eyeX, hy + 11, 4, 4);
    // scan line
    const scan = ((f * 0.8) % 12) | 0;
    ix.fillStyle = "rgba(0,255,255,0.2)";
    ix.fillRect(ex - 5, hy + 10 + (scan % 8), 10, 1);
  });

  // рот
  ix.fillStyle = "#040e1e";
  ix.fillRect(cx - 12, hy + 26, 24, 10);
  if (talking) {
    // рот говорить — LED сегменти
    const seg = Math.floor(f * 0.3) % 4;
    ix.fillStyle = "#ff4466";
    if (seg === 0) ix.fillRect(cx - 10, hy + 28, 20, 2);
    else if (seg === 1) {
      ix.fillRect(cx - 10, hy + 28, 20, 2);
      ix.fillRect(cx - 10, hy + 32, 20, 2);
    } else if (seg === 2) ix.fillRect(cx - 8, hy + 28, 16, 5);
    else {
      ix.fillRect(cx - 10, hy + 28, 8, 5);
      ix.fillRect(cx + 2, hy + 28, 8, 5);
    }
    // хвилі звуку
    ix.strokeStyle = "rgba(255,60,100,0.4)";
    ix.lineWidth = 1.5;
    [18, 26, 34].forEach((r, wi) => {
      ix.globalAlpha = 0.5 - wi * 0.15;
      ix.beginPath();
      ix.arc(cx, hy + 31, r, Math.PI, 0);
      ix.stroke();
    });
    ix.globalAlpha = 1;
  } else {
    ix.fillStyle = "#1a3a6a";
    ix.fillRect(cx - 8, hy + 30, 16, 3);
  }

  // голограмний обідок
  const halo = 0.3 + 0.2 * Math.sin(f * 0.04);
  ix.strokeStyle = `rgba(0,200,255,${halo})`;
  ix.lineWidth = 1.5;
  ix.beginPath();
  ix.roundRect
    ? ix.roundRect(cx - 25, hy - 1, 50, 48, 9)
    : ix.strokeRect(cx - 25, hy - 1, 50, 48);
  ix.stroke();
  // підпис
  ix.fillStyle = `rgba(0,200,255,${0.5 + 0.3 * Math.sin(f * 0.05)})`;
  ix.font = "bold 8px monospace";
  ix.textAlign = "center";
  ix.fillText("РОБОТРОН-9000", cx, IH - 6);
  ix.textAlign = "left";
}

// Друкарська машинка по символах
function typeNextChar() {
  if (iState !== ISTATE.TYPING) return;
  const story = getRobotStory();
  const full = story[iPhase];
  if (iCharIdx < full.length) {
    iCharIdx++;
    iTypedText = full.slice(0, iCharIdx);
    document.getElementById("introSubtitle").textContent =
      iTypedText + (iCharIdx < full.length ? "▋" : "");
    setTimeout(typeNextChar, full[iCharIdx - 1] === " " ? 60 : 38);
  } else {
    // Фраза повністю набрана на екрані, тепер чекаємо озвучку.
    const fullPhrase = story[iPhase];
    document.getElementById("introSubtitle").textContent = fullPhrase;
    iState = ISTATE.PAUSE;

    speakAndWait(fullPhrase, settingRobotVoiceLang).then(() => {
      // невеличка затримка після того, як голос закінчив говорити перед зміною слайду
      setTimeout(() => {
        if (iRaf) advancePhase();
      }, 500);
    });
  }
}

function advancePhase() {
  iPhase++;
  if (iPhase >= getRobotStory().length) {
    finishIntro();
    return;
  }
  iCharIdx = 0;
  iTypedText = "";
  iState = ISTATE.TYPING;
  document.getElementById("introSubtitle").textContent = "";
  setTimeout(typeNextChar, 200);
}

// Говоримо фразу голосом — повертає Promise, що резолвиться лише по закінченню мовлення
function speakAndWait(text, voiceLanguage = "uk") {
  if (typeof voiceLanguage !== "string") voiceLanguage = "uk";
  const cleanText = normalizeSpeechText(
    text
      .replace(/Роботрон-9000/g, "Роботрон девʼять тисяч")
      .replace(/Слава Україні/g, "Слава Україні!")
      .replace(/Андрій/g, "Андрій"),
  );

  return new Promise((resolve) => {
    if (voiceLanguage === "uk" && playRecordedVoice(cleanText, resolve)) return;
    if (voiceLanguage !== "uk" && playSystemVoice(text, voiceLanguage, resolve)) return;
    setTimeout(resolve, Math.min(2200, Math.max(900, cleanText.length * 35)));
  });
}

function iTick() {
  iFr++;
  drawBot(iFr, iState === ISTATE.PAUSE);
  iRaf = requestAnimationFrame(iTick);
}

function finishIntro() {
  if (iRaf) {
    cancelAnimationFrame(iRaf);
    iRaf = null;
  }
  if (iPhaseTimer) {
    clearTimeout(iPhaseTimer);
    iPhaseTimer = null;
  }
  cancelSpeech();
  showScreen("sMenu");
}

document.getElementById("introSkip").onclick = () => {
  focusApp();
  finishIntro();
};

function startIntro() {
  introStarted = true;
  iFr = 0;
  iPhase = 0;
  iCharIdx = 0;
  iTypedText = "";
  iState = ISTATE.TYPING;
  document.getElementById("introSubtitle").textContent = "";
  iRaf = requestAnimationFrame(iTick);
  setTimeout(typeNextChar, 800);
}
function beginIntroAfterGesture() {
  if (introStarted) return;
  startIntro();
}
drawBot(0, false);
document.getElementById("introSubtitle").textContent =
  "Натисни на екран, щоб почати.";
applyLang();

// CUSTOM STORY PATCH
const LEVEL1_INTRO_TEXT =
  "Ого, дивіться! Щось проїжджає дорогою... Цікаво, що це?";
const LEVEL2_DIALOG = [
  "ТЦК: Зупиніться, Андрію!",
  "Андрій: Ні, я побіжу далі!",
  "ТЦК: Тоді наздоженемо!",
  "Андрій: Спробуйте!",
];

export {};
