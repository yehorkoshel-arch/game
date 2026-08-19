import { LANGS, LOCATION_NAMES, SKINS_BASE, UI_TEXT } from "../data/gameData.js";
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
  owned = [...new Set(["default", "marichka", ...savedOwned])],
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
const MARICHKA_CHAIN_REWARD = 150;
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
const MARICHKA_CHAIN = [
  { id: "project", title: "Знайди проєкт Андрія", target: 1, unit: "" },
  { id: "coins", title: "Збери 30 монет для Марічки", target: 30, unit: "₴" },
  { id: "route", title: "Пройди секретний маршрут", target: 1, unit: "" },
  { id: "bell", title: "Встигни до школи до дзвоника", target: 1, unit: "" },
  { id: "finish", title: "Заведи Андрія до школи", target: 1, unit: "" },
];
const savedQuestStats = save.questStats || {};
let questStats = Object.fromEntries(
  QUESTS.map((quest) => [quest.id, Number(savedQuestStats[quest.id]) || 0]),
);
let questClaimed =
  save.questClaimed && typeof save.questClaimed === "object"
    ? save.questClaimed
    : {};
let marichkaChainStep = Math.min(
  MARICHKA_CHAIN.length,
  Math.max(0, Number(save.marichkaChainStep) || 0),
);
const savedMarichkaChainStats =
  save.marichkaChainStats && typeof save.marichkaChainStats === "object"
    ? save.marichkaChainStats
    : {};
let marichkaChainStats = Object.fromEntries(
  MARICHKA_CHAIN.map((step) => [
    step.id,
    Math.min(step.target, Math.max(0, Number(savedMarichkaChainStats[step.id]) || 0)),
  ]),
);
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
  {
    id: "chase_survivor",
    title: "\u0412\u0442\u0435\u0447\u0430 \u0432\u0434\u0430\u043b\u0430\u0441\u044f",
    desc: "\u041f\u0435\u0440\u0435\u0436\u0438\u0432\u0438 \u0440\u0435\u0436\u0438\u043c \u043f\u043e\u0433\u043e\u043d\u0456",
    target: 1,
    icon: "!",
  },
  {
    id: "clean_chase",
    title: "\u0427\u0438\u0441\u0442\u0430 \u0432\u0442\u0435\u0447\u0430",
    desc: "\u041f\u0435\u0440\u0435\u0436\u0438\u0432\u0438 \u043f\u043e\u0433\u043e\u043d\u044e \u0431\u0435\u0437 \u0443\u0434\u0430\u0440\u0443",
    target: 1,
    icon: "OK",
  },
  {
    id: "road_events3",
    title: "\u041c\u0430\u0439\u0441\u0442\u0435\u0440 \u043f\u043e\u0434\u0456\u0439",
    desc: "\u041f\u0435\u0440\u0435\u0436\u0438\u0432\u0438 3 \u0434\u043e\u0440\u043e\u0436\u043d\u0456 \u043f\u043e\u0434\u0456\u0457",
    target: 3,
    icon: "3",
  },
  {
    id: "kyiv_storm_survivor",
    title: "\u0413\u0435\u0440\u043e\u0439 \u0434\u043e\u0449\u0443",
    desc: "\u041f\u0435\u0440\u0435\u0436\u0438\u0432\u0438 \u0437\u043b\u0438\u0432\u0443 \u0432 \u041a\u0438\u0454\u0432\u0456",
    target: 1,
    icon: "R",
  },
  {
    id: "lviv_event_survivor",
    title: "\u041b\u044c\u0432\u0456\u0432\u0441\u044c\u043a\u0438\u0439 \u043c\u0430\u043d\u0435\u0432\u0440",
    desc: "\u041f\u0435\u0440\u0435\u0436\u0438\u0432\u0438 \u0442\u0440\u0430\u043c\u0432\u0430\u0439 \u0430\u0431\u043e \u0440\u0435\u043c\u043e\u043d\u0442 \u0443 \u041b\u044c\u0432\u043e\u0432\u0456",
    target: 1,
    icon: "L",
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
let achievementRewards =
  save.achievementRewards && typeof save.achievementRewards === "object"
    ? save.achievementRewards
    : {};
const CITY_POSTCARDS = [
  {
    id: "kyiv_maidan",
    loc: 0,
    icon: "M",
    title: "Майдан",
    desc: "Святкова площа з прапорами та вогнями.",
    color: "#4ea7ff",
  },
  {
    id: "kyiv_metro",
    loc: 0,
    icon: "M",
    title: "Київське метро",
    desc: "Секретний маршрут під містом.",
    color: "#62d6ff",
  },
  {
    id: "kyiv_rain",
    loc: 0,
    icon: "☔",
    title: "Дощовий Київ",
    desc: "Фари машин блищать на мокрій дорозі.",
    color: "#9ee8ff",
  },
  {
    id: "lviv_tram",
    loc: 1,
    icon: "T",
    title: "Львівський трамвай",
    desc: "Трамвай дзвенить поруч із бруківкою.",
    color: "#ffd45c",
  },
  {
    id: "lviv_cobble",
    loc: 1,
    icon: "L",
    title: "Львівська бруківка",
    desc: "Кам’яна дорога старого міста.",
    color: "#d7b58a",
  },
  {
    id: "school_finish",
    loc: 2,
    icon: "S",
    title: "Шкільний фініш",
    desc: "Андрій добігає до школи.",
    color: "#6bcb77",
  },
];
const savedPostcards =
  save.postcards && typeof save.postcards === "object" ? save.postcards : {};
let postcards = Object.fromEntries(
  CITY_POSTCARDS.map((card) => [card.id, Boolean(savedPostcards[card.id])]),
);
const COLLECTION_REWARDS = [
  {
    id: "kyiv",
    title: "Київський набір",
    desc: "Збери всі листівки Києва",
    ids: ["kyiv_maidan", "kyiv_metro", "kyiv_rain"],
    coins: 300,
  },
  {
    id: "lviv",
    title: "Львівський набір",
    desc: "Збери всі листівки Львова",
    ids: ["lviv_tram", "lviv_cobble"],
    coins: 300,
  },
  {
    id: "all",
    title: "Повний альбом",
    desc: "Збери всі листівки та відкрий космічного кур’єра",
    ids: CITY_POSTCARDS.map((card) => card.id),
    coins: 800,
    skinId: "space_courier",
  },
];
const savedCollectionRewards =
  save.collectionRewards && typeof save.collectionRewards === "object"
    ? save.collectionRewards
    : {};
let collectionRewards = Object.fromEntries(
  COLLECTION_REWARDS.map((reward) => [
    reward.id,
    Boolean(savedCollectionRewards[reward.id]),
  ]),
);

const COLLECTION_I18N = {
  uk: {
    headerTitle: "Колекція", headerSubtitle: "Листівки Києва та Львова", claim: "Забрати", claimed: "Отримано", inProgress: "В процесі", newBadge: "НОВЕ", skin: "скін", unknownPostcard: "Невідома листівка", lockedPostcard: "Знайди її під час забігу містом.", finish: "Фініш",
    rewards: { kyiv: { title: "Київський набір", desc: "Збери всі листівки Києва" }, lviv: { title: "Львівський набір", desc: "Збери всі листівки Львова" }, all: { title: "Повний альбом", desc: "Збери всі листівки та відкрий космічного кур’єра" } },
    postcards: { kyiv_maidan: { title: "Майдан", desc: "Святкова площа з прапорами та вогнями." }, kyiv_metro: { title: "Київське метро", desc: "Секретний маршрут під містом." }, kyiv_rain: { title: "Дощовий Київ", desc: "Фари машин блищать на мокрій дорозі." }, lviv_tram: { title: "Львівський трамвай", desc: "Трамвай дзвенить поруч із бруківкою." }, lviv_cobble: { title: "Львівська бруківка", desc: "Кам’яна дорога старого міста." }, school_finish: { title: "Шкільний фініш", desc: "Андрій добігає до школи." } },
    achievements: { metro_passenger: { title: "Пасажир метро", desc: "Пройди секретний маршрут метро" }, trick_master: { title: "Майстер трюків", desc: "Зроби TRICK x3" }, boss_defeated: { title: "Бос переможений", desc: "Переможи київського боса" }, coins1000: { title: "Скарб Андрія", desc: "Збери 1000 монет за всю гру" }, chase_survivor: { title: "Втеча вдалася", desc: "Переживи режим погоні" }, clean_chase: { title: "Чиста втеча", desc: "Переживи погоню без удару" }, road_event_master: { title: "Майстер подій", desc: "Переживи 3 дорожні події" }, rain_runner: { title: "Герой дощу", desc: "Переживи зливу в Києві" }, lviv_maneuver: { title: "Львівський маневр", desc: "Переживи трамвай або ремонт у Львові" } },
  },
  en: {
    headerTitle: "Collection", headerSubtitle: "Kyiv and Lviv postcard sets", claim: "Claim", claimed: "Claimed", inProgress: "In progress", newBadge: "NEW", skin: "skin", unknownPostcard: "Unknown postcard", lockedPostcard: "Find it during a city run.", finish: "Finish",
    rewards: { kyiv: { title: "Kyiv Set", desc: "Collect all Kyiv postcards" }, lviv: { title: "Lviv Set", desc: "Collect all Lviv postcards" }, all: { title: "Complete Album", desc: "Collect every postcard and unlock the space courier" } },
    postcards: { kyiv_maidan: { title: "Maidan", desc: "A festive square with flags and lights." }, kyiv_metro: { title: "Kyiv Metro", desc: "A secret route under the city." }, kyiv_rain: { title: "Rainy Kyiv", desc: "Car headlights shine on the wet road." }, lviv_tram: { title: "Lviv Tram", desc: "A tram rings beside the cobblestones." }, lviv_cobble: { title: "Lviv Cobblestones", desc: "The stone road of the old city." }, school_finish: { title: "School Finish", desc: "Andriy reaches the school." } },
    achievements: { metro_passenger: { title: "Metro Passenger", desc: "Complete the secret metro route" }, trick_master: { title: "Trick Master", desc: "Perform TRICK x3" }, boss_defeated: { title: "Boss Defeated", desc: "Defeat the Kyiv boss" }, coins1000: { title: "Andriy’s Treasure", desc: "Collect 1000 coins across the game" }, chase_survivor: { title: "Escape Complete", desc: "Survive chase mode" }, clean_chase: { title: "Clean Escape", desc: "Survive a chase without a hit" }, road_event_master: { title: "Event Master", desc: "Survive 3 road events" }, rain_runner: { title: "Rain Hero", desc: "Survive heavy rain in Kyiv" }, lviv_maneuver: { title: "Lviv Maneuver", desc: "Survive a tram or roadworks in Lviv" } },
  },
  de: {
    headerTitle: "Sammlung", headerSubtitle: "Postkarten aus Kiew und Lemberg", claim: "Abholen", claimed: "Erhalten", inProgress: "In Arbeit", newBadge: "NEU", skin: "Skin", unknownPostcard: "Unbekannte Postkarte", lockedPostcard: "Finde sie während eines Stadtlaufs.", finish: "Ziel",
    rewards: { kyiv: { title: "Kiew-Set", desc: "Sammle alle Kiew-Postkarten" }, lviv: { title: "Lemberg-Set", desc: "Sammle alle Lemberg-Postkarten" }, all: { title: "Vollständiges Album", desc: "Sammle alle Postkarten und schalte den Weltraumkurier frei" } },
    postcards: { kyiv_maidan: { title: "Maidan", desc: "Ein festlicher Platz mit Fahnen und Lichtern." }, kyiv_metro: { title: "Kiewer Metro", desc: "Eine geheime Route unter der Stadt." }, kyiv_rain: { title: "Regnerisches Kiew", desc: "Scheinwerfer glänzen auf nasser Straße." }, lviv_tram: { title: "Lemberger Tram", desc: "Eine Straßenbahn klingelt neben dem Kopfsteinpflaster." }, lviv_cobble: { title: "Lemberger Pflaster", desc: "Die Steinstraße der Altstadt." }, school_finish: { title: "Schulziel", desc: "Andriy erreicht die Schule." } },
    achievements: { metro_passenger: { title: "Metro-Fahrgast", desc: "Schließe die geheime Metro-Route ab" }, trick_master: { title: "Trickmeister", desc: "Schaffe TRICK x3" }, boss_defeated: { title: "Boss besiegt", desc: "Besiege den Kiewer Boss" }, coins1000: { title: "Andriys Schatz", desc: "Sammle 1000 Münzen im ganzen Spiel" }, chase_survivor: { title: "Flucht gelungen", desc: "Überlebe den Verfolgungsmodus" }, clean_chase: { title: "Saubere Flucht", desc: "Überlebe eine Verfolgung ohne Treffer" }, road_event_master: { title: "Ereignismeister", desc: "Überlebe 3 Straßenereignisse" }, rain_runner: { title: "Regenheld", desc: "Überlebe Starkregen in Kiew" }, lviv_maneuver: { title: "Lemberg-Manöver", desc: "Überlebe eine Tram oder Baustelle in Lemberg" } },
  },
  fr: {
    headerTitle: "Collection", headerSubtitle: "Cartes postales de Kiev et Lviv", claim: "Récupérer", claimed: "Obtenu", inProgress: "En cours", newBadge: "NOUVEAU", skin: "skin", unknownPostcard: "Carte inconnue", lockedPostcard: "Trouve-la pendant une course en ville.", finish: "Arrivée",
    rewards: { kyiv: { title: "Set de Kiev", desc: "Collectionne toutes les cartes de Kiev" }, lviv: { title: "Set de Lviv", desc: "Collectionne toutes les cartes de Lviv" }, all: { title: "Album complet", desc: "Collectionne toutes les cartes et débloque le coursier spatial" } },
    postcards: { kyiv_maidan: { title: "Maïdan", desc: "Une place festive avec des drapeaux et des lumières." }, kyiv_metro: { title: "Métro de Kiev", desc: "Un itinéraire secret sous la ville." }, kyiv_rain: { title: "Kiev pluvieux", desc: "Les phares brillent sur la route mouillée." }, lviv_tram: { title: "Tramway de Lviv", desc: "Un tram sonne près des pavés." }, lviv_cobble: { title: "Pavés de Lviv", desc: "La route de pierre de la vieille ville." }, school_finish: { title: "Arrivée à l’école", desc: "Andriy arrive à l’école." } },
    achievements: { metro_passenger: { title: "Passager du métro", desc: "Termine l’itinéraire secret du métro" }, trick_master: { title: "Maître des figures", desc: "Fais TRICK x3" }, boss_defeated: { title: "Boss vaincu", desc: "Bats le boss de Kiev" }, coins1000: { title: "Trésor d’Andriy", desc: "Collecte 1000 pièces dans toute la partie" }, chase_survivor: { title: "Fuite réussie", desc: "Survis au mode poursuite" }, clean_chase: { title: "Fuite parfaite", desc: "Survis à une poursuite sans impact" }, road_event_master: { title: "Maître des événements", desc: "Survis à 3 événements routiers" }, rain_runner: { title: "Héros de la pluie", desc: "Survis à une averse à Kiev" }, lviv_maneuver: { title: "Manœuvre de Lviv", desc: "Survis à un tram ou des travaux à Lviv" } },
  },
  es: {
    headerTitle: "Colección", headerSubtitle: "Postales de Kiev y Leópolis", claim: "Reclamar", claimed: "Obtenido", inProgress: "En progreso", newBadge: "NUEVO", skin: "skin", unknownPostcard: "Postal desconocida", lockedPostcard: "Encuéntrala durante una carrera por la ciudad.", finish: "Meta",
    rewards: { kyiv: { title: "Set de Kiev", desc: "Colecciona todas las postales de Kiev" }, lviv: { title: "Set de Leópolis", desc: "Colecciona todas las postales de Leópolis" }, all: { title: "Álbum completo", desc: "Colecciona todas las postales y desbloquea al mensajero espacial" } },
    postcards: { kyiv_maidan: { title: "Maidán", desc: "Una plaza festiva con banderas y luces." }, kyiv_metro: { title: "Metro de Kiev", desc: "Una ruta secreta bajo la ciudad." }, kyiv_rain: { title: "Kiev lluvioso", desc: "Los faros brillan sobre la carretera mojada." }, lviv_tram: { title: "Tranvía de Leópolis", desc: "Un tranvía suena junto a los adoquines." }, lviv_cobble: { title: "Adoquines de Leópolis", desc: "La calle de piedra de la ciudad vieja." }, school_finish: { title: "Meta escolar", desc: "Andriy llega a la escuela." } },
    achievements: { metro_passenger: { title: "Pasajero del metro", desc: "Completa la ruta secreta del metro" }, trick_master: { title: "Maestro de trucos", desc: "Haz TRICK x3" }, boss_defeated: { title: "Boss derrotado", desc: "Derrota al boss de Kiev" }, coins1000: { title: "Tesoro de Andriy", desc: "Reúne 1000 monedas en toda la partida" }, chase_survivor: { title: "Escape logrado", desc: "Sobrevive al modo persecución" }, clean_chase: { title: "Escape limpio", desc: "Sobrevive a una persecución sin golpes" }, road_event_master: { title: "Maestro de eventos", desc: "Sobrevive a 3 eventos de carretera" }, rain_runner: { title: "Héroe de la lluvia", desc: "Sobrevive a una tormenta en Kiev" }, lviv_maneuver: { title: "Maniobra de Leópolis", desc: "Sobrevive a un tranvía u obras en Leópolis" } },
  },
};
function collectionText() { return COLLECTION_I18N[lang] || COLLECTION_I18N.uk; }
function getCollectionRewardCopy(reward) { return collectionText().rewards[reward.id] || { title: reward.title, desc: reward.desc }; }
function getPostcardCopy(card) { return collectionText().postcards[card.id] || { title: card.title, desc: card.desc }; }
function getAchievementCopy(item) { return collectionText().achievements[item.id] || { title: item.title, desc: item.desc }; }
function refreshCollectionHeader() {
  const C = collectionText();
  const title = document.getElementById("collectionHeaderTitle");
  const subtitle = document.getElementById("collectionHeaderSubtitle");
  const back = document.getElementById("btnBackCollection");
  if (title) title.textContent = C.headerTitle;
  if (subtitle) subtitle.textContent = C.headerSubtitle;
  if (back) back.textContent = t().back;
}

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
  settingMusicTrack = ["kyiv", "march", "rain"].includes(save.settingMusicTrack)
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
  return settingDiff === "easy" || settingDiff === "normal" ? 1 : 0;
}
function getMaxShieldCharges() {
  return getPlayerUpgradeLevel("defense") >= 3 ? 2 : 1;
}
function getDamageInvulnerabilityTime() {
  const diffBonus = settingDiff === "easy" ? 45 : settingDiff === "normal" ? 25 : 10;
  return 105 + diffBonus + getPlayerUpgradeLevel("defense") * 16;
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
    marichkaChainStep,
    marichkaChainStats,
    achievementStats,
    achievementSeen,
    achievementRewards,
    weaponUpgrades,
    playerUpgrades,
    backpackSlots,
    bonusInventory,
    postcards,
    collectionRewards,
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
const RAIN_NOTES = [
  [0, 0.5], [7, 0.5], [10, 0.5], [7, 0.5],
  [3, 0.5], [10, 0.5], [12, 1],
  [10, 0.5], [7, 0.5], [5, 0.5], [3, 0.5],
  [0, 1], [-5, 1],
  [2, 0.5], [9, 0.5], [12, 0.5], [9, 0.5],
  [5, 0.5], [12, 0.5], [14, 1],
  [12, 0.5], [9, 0.5], [7, 0.5], [5, 0.5],
  [2, 1], [-3, 1],
];
const BOSS_NOTES = [
  [0, 0.5], [0, 0.5], [6, 0.5], [0, 0.5],
  [10, 0.5], [6, 0.5], [3, 0.5], [0, 0.5],
  [-2, 0.5], [-2, 0.5], [5, 0.5], [-2, 0.5],
  [8, 0.5], [5, 0.5], [2, 0.5], [-2, 0.5],
  [0, 0.25], [3, 0.25], [6, 0.25], [10, 0.25],
  [12, 0.5], [10, 0.5], [6, 1],
];
const LVIV_NOTES = [
  [0, 1], [4, 1], [7, 1], [9, 1],
  [7, 1], [4, 1], [2, 1], [0, 1],
  [5, 1], [9, 1], [12, 1], [11, 1],
  [9, 2], [7, 2],
  [4, 1], [7, 1], [9, 1], [12, 1],
  [14, 1], [12, 1], [9, 1], [7, 1],
  [5, 1], [4, 1], [2, 1], [0, 2],
];
const MUSIC_TRACKS = [MELODY_NOTES, MARCH_NOTES, RAIN_NOTES, BOSS_NOTES, LVIV_NOTES];
function getMusicTrackIndex(track = settingMusicTrack) {
  if (track === "march") return 1;
  if (track === "rain") return 2;
  return 0;
}
function getActiveMusicTrackIndex() {
  if (currentLocation === 1 && settingMusicTrack === "kyiv") return 4;
  const index = MUSIC_TRACKS.findIndex((track) => track.id === settingMusicTrack);
  return index >= 0 ? index : 0;
}
function resetMusicPattern() {
  melodyIdx = 0;
  bassIdx = 0;
  chordIdx = 0;
  drumStep = 0;
  lyricIdx = 0;
}
function forceMusicTrackRefresh() {
  if (!musicPlaying || !audioCtx) return;
  musicTrackIdx = getActiveMusicTrackIndex();
  resetMusicPattern();
  nextNoteTime = audioCtx.currentTime + 0.04;
  showLyric();
}
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
const RAIN_LYRICS_BY_LANG = {
  uk: ["Дощовий Київ", "Фари на мокрій дорозі", "Роботрон на зв'язку", "Біжи до фінішу"],
  en: ["Rainy Kyiv", "Headlights on wet roads", "Robotron online", "Run to the finish"],
  de: ["Regnerisches Kiew", "Lichter auf nasser Straße", "Robotron online", "Lauf bis ins Ziel"],
  fr: ["Kyiv sous la pluie", "Phares sur route mouillée", "Robotron en ligne", "Cours vers l'arrivée"],
  es: ["Kyiv lluvioso", "Faros en la carretera mojada", "Robotron en línea", "Corre a la meta"],
};
function getRainLyrics() {
  return RAIN_LYRICS_BY_LANG[lang] || RAIN_LYRICS_BY_LANG.uk;
}
const BOSS_LYRICS_BY_LANG = {
  uk: ["Бос-тема", "Трансформер близько", "Тримай бластер", "Фінальна битва"],
  en: ["Boss theme", "Transformer ahead", "Keep the blaster ready", "Final fight"],
  de: ["Boss-Thema", "Transformer voraus", "Blaster bereit", "Finaler Kampf"],
  fr: ["Thème du boss", "Transformeur devant", "Blaster prêt", "Combat final"],
  es: ["Tema del jefe", "Transformador adelante", "Bláster listo", "Batalla final"],
};
function getBossLyrics() {
  return BOSS_LYRICS_BY_LANG[lang] || BOSS_LYRICS_BY_LANG.uk;
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
  const isRain = musicTrackIdx === 2;
  const isBoss = musicTrackIdx === 3;
  const third = musicTrackIdx === 1 || isRain || isBoss ? 3 : 4;
  const notes = isBoss
    ? [root - 12, root, root + 6, root + 10]
    : isRain
    ? [root, root + third, root + 7, root + 10]
    : [root, root + third, root + 7, root + 12];
  notes.forEach((semi, i) => {
    const t = startTime + i * (dur / 5);
    playNote(
      noteToHz(semi),
      t,
      dur * (isBoss ? 0.9 : isRain ? 0.7 : 0.55),
      isBoss ? "sawtooth" : isRain ? "triangle" : "sawtooth",
      isBoss ? 0.065 : isRain ? 0.045 : 0.035,
      -8 + i * 5,
    );
  });
  playNote(
    noteToHz(root + (isBoss ? -12 : 7)),
    startTime,
    dur,
    isBoss ? "square" : "triangle",
    isBoss ? 0.08 : isRain ? 0.05 : 0.035,
    6,
  );
}

function scheduleMusic() {
  if (!musicPlaying || !audioCtx) return;
  const desiredTrack = getActiveMusicTrackIndex();
  if (musicTrackIdx !== desiredTrack) {
    musicTrackIdx = desiredTrack;
    resetMusicPattern();
    nextNoteTime = audioCtx.currentTime + 0.04;
    showLyric();
  }
  while (nextNoteTime < audioCtx.currentTime + scheduleAhead) {
    const melody = MUSIC_TRACKS[musicTrackIdx];
    const isMarch = musicTrackIdx === 1;
    const isRain = musicTrackIdx === 2;
    const isBoss = musicTrackIdx === 3;
    const [semi, beats] = melody[melodyIdx % melody.length];
    const trackBeat = BEAT * (isMarch ? 0.76 : isRain ? 0.62 : isBoss ? 0.52 : 1);
    const dur = beats * trackBeat;
    const freq = noteToHz(semi);
    const accent = melodyIdx % 4 === 0 ? (isMarch ? 1.35 : isRain ? 1.45 : isBoss ? 1.65 : 1.15) : 1;
    playNote(
      freq,
      nextNoteTime,
      dur * (isMarch ? 0.78 : isRain ? 0.7 : isBoss ? 0.62 : 0.94),
      isMarch || isBoss ? "sawtooth" : isRain ? "square" : "triangle",
      (isMarch ? 0.16 : isRain ? 0.11 : isBoss ? 0.14 : 0.18) * accent,
    );
    playNote(
      noteToHz(semi + 12),
      nextNoteTime + dur * 0.04,
      dur * (isMarch ? 0.28 : isRain ? 0.22 : isBoss ? 0.2 : 0.45),
      isMarch || isRain || isBoss ? "square" : "sine",
      isMarch ? 0.055 : isRain ? 0.04 : isBoss ? 0.05 : 0.035,
    );
    playNote(
      noteToHz(semi + (isMarch || isRain || isBoss ? 3 : 4)),
      nextNoteTime,
      dur * (isMarch ? 0.58 : isRain ? 0.42 : isBoss ? 0.34 : 0.8),
      "sine",
      isMarch ? 0.07 : isRain ? 0.04 : isBoss ? 0.035 : 0.055,
    );

    if (melodyIdx % 2 === 0) {
      const bassSemi = BASS_PATTERN[bassIdx % BASS_PATTERN.length] - (isBoss ? 31 : isRain ? 24 : 12);
      playNote(
        noteToHz(bassSemi),
        nextNoteTime,
        dur * (isMarch ? 1.1 : isRain ? 1.45 : isBoss ? 1.2 : 1.65),
        isMarch || isRain || isBoss ? "square" : "triangle",
        isMarch ? 0.18 : isRain ? 0.16 : isBoss ? 0.22 : 0.13,
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
      scheduleChord(root, nextNoteTime, dur * (isMarch ? 1.55 : isRain ? 1.35 : isBoss ? 1.1 : 2.2));
      scheduleDrums(nextNoteTime, trackBeat, isMarch || isRain || isBoss);
      chordIdx++;
    }

    nextNoteTime += dur;
    melodyIdx++;
    // Loop
    if (melodyIdx >= melody.length) {
      melodyIdx = 0;
      musicTrackIdx = getActiveMusicTrackIndex();
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
  musicTrackIdx = getActiveMusicTrackIndex();
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
  const copy = t();
  const lines =
    musicTrackIdx === 1
      ? getMarchLyrics()
      : musicTrackIdx === 2
        ? getRainLyrics()
        : musicTrackIdx === 3
          ? getBossLyrics()
        : currentLocation === 1 && copy.lvivLyrics
          ? copy.lvivLyrics
          : copy.lyrics || [];
  if (!lines.length) return;
  const line = lines[lyricIdx % lines.length];
  LYRIC_DIV.textContent = line;
  LYRIC_DIV.style.opacity = "1";
  if (musicTrackIdx === 1) playMarchVocal(lyricIdx);
  const displayDuration =
    musicTrackIdx === 1 ? 4200 : musicTrackIdx === 2 || musicTrackIdx === 3 ? 2200 : 2600;
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

function sfxSchoolBell() {
  const c = getSfxCtx();
  if (!c) return;
  const now = c.currentTime;
  [0, 0.22, 0.44].forEach((delay) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1320, now + delay);
    osc.frequency.exponentialRampToValueAtTime(880, now + delay + 0.18);
    gain.gain.setValueAtTime(0.001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.2, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.34);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 0.36);
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

let multiplayerMode = false;
const LVIV_ROADSIDE_VERSION = "ua-signs-v1";
const LVIV_BG_VERSION = "stable-bg-v2";
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
  coffeeTimer = 0,
  rescueBusTimer = 0,
  superJumpTimer = 0,
  shieldCharges = 0,
  bonusBackpack = [],
  inv = 0,
  flash = 0;
let obs = [],
  coins = [],
  magnets = [],
  chestnuts = [],
  coffees = [],
  rescueBuses = [],
  shields = [],
  superJumps = [],
  cityGifts = [],
  postcardItems = [],
  parts = [],
  confetti = [],
  bullets = [],
  playerBullets = [];
let bgOff = 0,
  chaserX = -100,
  raf = null;
let loopActive = false;
let fireCooldown = 0;
let lastRoadHazardSpawnFrame = -9999;
let lightningFlash = 0,
  nextLightning = 240;
let startVoiceTimer = null;
let levelIntroTimer = null;
let robotRadioCooldown = 0;
let marichkaVoiceCooldown = 0;
let roadEvent = null,
  roadEventCooldown = 0;
let chaseMode = null,
  chaseCooldown = 0;
let achievementToast = null;
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
const CHASE_REWARD = 45;
const CHASE_CLEAN_BONUS = 20;
const LEVEL_MISSION_REWARD = 50;
const LEVEL_CLEAR_INPUT_DELAY = 150;
const LEVEL_CLEAR_AUTO_DELAY = 360;
const LEVEL_START_SPEED_CAP = 2.54;
const GAME_SPEED_MULT = 0.84;
const OBSTACLE_SPAWN_GAP_MULT = 1.22;
const PLAYER_JUMP_GRAVITY = 0.7;
const PLAYER_SLIDE_FRAMES = 52;
const LVIV_AUTO_RUN_LEVEL_INDEX = 7;
const START_EMPTY_FRAMES = 210;
const START_EMPTY_DISTANCE = 18;
const START_SAFE_FRAMES = 360;
const START_SAFE_DISTANCE = 38;
const FINISH_APPROACH_DISTANCE = 10;
const SCHOOL_BELL_FRAMES = 30 * 60;
const SCHOOL_BELL_REWARD = 75;
let finishX = 9999,
  finishActive = false,
  schoolBellActive = false,
  schoolBellTimer = 0,
  schoolBellRewardEarned = false,
  schoolBellRewardClaimed = false,
  schoolBellWarningSpoken = false,
  schoolEnterTimer = 0,
  schoolDialogueStep = 0,
  schoolDialogueDone = false,
  schoolExitTimer = 0,
  schoolWalkTimer = 0,
  winTimer = 0,
  levelClearTimer = 0,
  levelCompleteLocked = false;
let levelMissions = [],
  levelMissionStats = {},
  levelMissionReward = 0,
  levelMissionRewardClaimed = false;
let tckScene = null;
const W = 680,
  H = 420,
  GND = 270,
  ROAD_RUN_Y = GND + 18,
  LANES = [230, 340, 450];
const ROAD_SPAWN_X = W + 150;
const BONUS_SPAWN_X = W + 130;
const ROAD_TOP_HALF = 80;
const ROAD_BOTTOM_HALF = 300;
const ROAD_LANE_RATIOS = [-0.62, 0, 0.62];
const ROAD_LANE_EDGE_RATIOS = [-0.31, 0.31];
const PUBLIC_BASE_URL = import.meta.env?.BASE_URL || "/";
const KYIV_SKYLINE_SRC = `${PUBLIC_BASE_URL.replace(/\/?$/, "/")}assets/kyiv-skyline-generated.png`;
const ROAD_IMAGE_SRC = `${PUBLIC_BASE_URL.replace(/\/?$/, "/")}assets/road-kyiv-night.png`;
const LVIV_PARALLAX_VERSION = "image-layers-v2";
const LVIV_PARALLAX_SRCS = [
  `${PUBLIC_BASE_URL.replace(/\/?$/, "/")}assets/lviv-parallax-skyline.png?v=${LVIV_PARALLAX_VERSION}`,
  `${PUBLIC_BASE_URL.replace(/\/?$/, "/")}assets/lviv-parallax-buildings.png?v=${LVIV_PARALLAX_VERSION}`,
  `${PUBLIC_BASE_URL.replace(/\/?$/, "/")}assets/lviv-parallax-foreground.png?v=${LVIV_PARALLAX_VERSION}`,
];
const kyivSkylineImage = typeof Image !== "undefined" ? new Image() : null;
const roadImage = typeof Image !== "undefined" ? new Image() : null;
const lvivParallaxImages = typeof Image !== "undefined" ? LVIV_PARALLAX_SRCS.map(() => new Image()) : [];
let kyivSkylineReady = false;
let roadImageReady = false;
let roadOffsetY = 0;
if (kyivSkylineImage) {
  kyivSkylineImage.onload = () => {
    kyivSkylineReady = true;
  };
  kyivSkylineImage.onerror = () => {
    kyivSkylineReady = false;
  };
  kyivSkylineImage.src = KYIV_SKYLINE_SRC;
}
if (roadImage) {
  roadImage.onload = () => {
    roadImageReady = true;
  };
  roadImage.onerror = () => {
    roadImageReady = false;
  };
  roadImage.src = ROAD_IMAGE_SRC;
}
lvivParallaxImages.forEach((image, index) => {
  image.src = LVIV_PARALLAX_SRCS[index];
});

function isMarichkaPlayerSelected() {
  return selectedSkin === "marichka";
}

function formatActiveCharacterText(text) {
  if (!isMarichkaPlayerSelected() || typeof text !== "string") return text;
  return text
    .replace(/\u0410\u043d\u0434\u0440\u0456\u044e/g, "\u041c\u0430\u0440\u0456\u0447\u043a\u043e")
    .replace(/\u0410\u043d\u0434\u0440\u0456\u0439/g, "\u041c\u0430\u0440\u0456\u0447\u043a\u0430")
    .replace(/\u0410\u043d\u0434\u0440\u0456\u044f/g, "\u041c\u0430\u0440\u0456\u0447\u043a\u0438")
    .replace(/Andrii's/g, "Marichka's")
    .replace(/Andriis/g, "Marichkas")
    .replace(/Andrii/g, "Marichka");
}

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
  addMarichkaChainProgress("route");
  addLevelMissionProgress("route");
  if (secretRoute.id === "metro") addLevelMissionProgress("metro");
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
  return { ...LANGS[lang], ...(UI_TEXT[lang] || UI_TEXT.uk) };
}
const GAME_COPY = {
  uk: {
    collectCoins: (count) => `Збери ${count} монет`,
    passMetro: "Пройди метро",
    passRoute: "Пройди секретний тунель",
    trick2: "Зроби TRICK x2",
    runMeters: "Пробіжи 250 метрів",
    levelMissions: "Місії рівня",
    missionReward: (count) => `+${count} монет`,
    startMissions: "Натисни будь-яку кнопку, щоб почати",
    trafficGreen: "Зелений! +10 монет",
    trafficJump: "Вчасний стрибок!",
    trafficCarJump: "Перестрибнув машину!",
    greenCrosswalks: "Пройди 2 переходи на зелене",
    jumpCars: "Перестрибни 2 машини",
    missionSummary: (reward, done, total) => `+${reward}₴ за місії (${done}/${total})`,
    robotronName: "Роботрон",
    radioStart: "Роботрон на зв'язку. Допоможи Андрію добігти до фінішу.",
    radioCar: "Увага! Машина попереду.",
    radioCrosswalkGreen: "Зелений сигнал. Можна бігти.",
    radioCrosswalkRed: "Червоний сигнал. Готуйся стрибати.",
    radioStorm: "Дощ посилюється. Дорога слизька.",
    radioPostcard: "Бачу листівку міста. Забери її в колекцію.",
    jumpShort: "СТРИБАЙ",
    skipScene: "Натисни будь-яку кнопку, щоб пропустити сцену",
    signs: { school: "Школа", repair: "Ремонт", metro: "Метро" },
  },
  en: {
    collectCoins: (count) => `Collect ${count} coins`,
    passMetro: "Take the metro",
    passRoute: "Take the secret tunnel",
    trick2: "Do TRICK x2",
    runMeters: "Run 250 meters",
    levelMissions: "Level missions",
    missionReward: (count) => `+${count} coins`,
    startMissions: "Press any button to start",
    trafficGreen: "Green light! +10 coins",
    trafficJump: "Perfect jump!",
    trafficCarJump: "Jumped over the car!",
    greenCrosswalks: "Take 2 green crossings",
    jumpCars: "Jump over 2 cars",
    missionSummary: (reward, done, total) => `+${reward} coins for missions (${done}/${total})`,
    robotronName: "Robotron",
    radioStart: "Robotron online. Help Andrii reach the finish.",
    radioCar: "Warning! Car ahead.",
    radioCrosswalkGreen: "Green signal. You can run.",
    radioCrosswalkRed: "Red signal. Get ready to jump.",
    radioStorm: "Rain is getting stronger. The road is slippery.",
    radioPostcard: "City postcard detected. Add it to the collection.",
    jumpShort: "JUMP",
    skipScene: "Press any button to skip the scene",
    signs: { school: "School", repair: "Roadwork", metro: "Metro" },
  },
  de: {
    collectCoins: (count) => `Sammle ${count} Münzen`,
    passMetro: "Nimm die Metro",
    passRoute: "Geheimer Tunnel",
    trick2: "Mach TRICK x2",
    runMeters: "Laufe 250 Meter",
    levelMissions: "Level-Missionen",
    missionReward: (count) => `+${count} Münzen`,
    startMissions: "Taste drücken zum Start",
    trafficGreen: "Grün! +10 Münzen",
    trafficJump: "Perfekter Sprung!",
    trafficCarJump: "Über das Auto!",
    greenCrosswalks: "2 grüne Übergänge",
    jumpCars: "Spring über 2 Autos",
    missionSummary: (reward, done, total) => `+${reward} Münzen für Missionen (${done}/${total})`,
    robotronName: "Robotron",
    radioStart: "Robotron online. Hilf Andrii bis ins Ziel.",
    radioCar: "Achtung! Auto voraus.",
    radioCrosswalkGreen: "Grünes Signal. Du kannst laufen.",
    radioCrosswalkRed: "Rotes Signal. Spring gleich.",
    radioStorm: "Der Regen wird stärker. Die Straße ist glatt.",
    radioPostcard: "Stadtpostkarte entdeckt. Sammle sie ein.",
    jumpShort: "SPRUNG",
    skipScene: "Taste drücken, um zu überspringen",
    signs: { school: "Schule", repair: "Baustelle", metro: "Metro" },
  },
  fr: {
    collectCoins: (count) => `Ramasse ${count} pièces`,
    passMetro: "Prends le métro",
    passRoute: "Tunnel secret",
    trick2: "Fais TRICK x2",
    runMeters: "Cours 250 mètres",
    levelMissions: "Missions du niveau",
    missionReward: (count) => `+${count} pièces`,
    startMissions: "Appuie pour commencer",
    trafficGreen: "Vert ! +10 pièces",
    trafficJump: "Saut parfait !",
    trafficCarJump: "Voiture franchie !",
    greenCrosswalks: "Passe 2 feux verts",
    jumpCars: "Saute 2 voitures",
    missionSummary: (reward, done, total) => `+${reward} pièces de missions (${done}/${total})`,
    robotronName: "Robotron",
    radioStart: "Robotron en ligne. Aide Andrii à atteindre l'arrivée.",
    radioCar: "Attention ! Voiture devant.",
    radioCrosswalkGreen: "Feu vert. Tu peux courir.",
    radioCrosswalkRed: "Feu rouge. Prépare-toi à sauter.",
    radioStorm: "La pluie augmente. La route glisse.",
    radioPostcard: "Carte postale détectée. Ajoute-la à la collection.",
    jumpShort: "SAUTE",
    skipScene: "Appuie pour passer la scène",
    signs: { school: "École", repair: "Travaux", metro: "Métro" },
  },
  es: {
    collectCoins: (count) => `Recoge ${count} monedas`,
    passMetro: "Toma el metro",
    passRoute: "Túnel secreto",
    trick2: "Haz TRICK x2",
    runMeters: "Corre 250 metros",
    levelMissions: "Misiones del nivel",
    missionReward: (count) => `+${count} monedas`,
    startMissions: "Pulsa para empezar",
    trafficGreen: "¡Verde! +10 monedas",
    trafficJump: "¡Salto perfecto!",
    trafficCarJump: "¡Saltaste el coche!",
    greenCrosswalks: "Cruza 2 pasos en verde",
    jumpCars: "Salta 2 coches",
    missionSummary: (reward, done, total) => `+${reward} monedas por misiones (${done}/${total})`,
    robotronName: "Robotron",
    radioStart: "Robotron en línea. Ayuda a Andrii a llegar a la meta.",
    radioCar: "¡Atención! Coche adelante.",
    radioCrosswalkGreen: "Semáforo verde. Puedes correr.",
    radioCrosswalkRed: "Semáforo rojo. Prepárate para saltar.",
    radioStorm: "La lluvia aumenta. La carretera resbala.",
    radioPostcard: "Postal de la ciudad detectada. Añádela a la colección.",
    jumpShort: "SALTA",
    skipScene: "Pulsa para saltar la escena",
    signs: { school: "Escuela", repair: "Obras", metro: "Metro" },
  },
};
function gt(key, ...args) {
  const pack = GAME_COPY[lang] || GAME_COPY.uk;
  const value = pack[key] ?? GAME_COPY.uk[key];
  return typeof value === "function" ? value(...args) : value;
}
function robotRadio(key, cooldown = 360) {
  if (gameState !== "run" || robotRadioCooldown > 0) return;
  const text = gt(key);
  if (!text) return;
  robotRadioCooldown = cooldown;
  showAndriiBubble(gt("robotronName") + ": " + text);
  speakAndWait(text, settingRobotVoiceLang);
}
function updateFireControl() {
  const weapon = getAndriiWeapon(currentLevel, currentLocation);
  const fireButton = document.getElementById("cFire");
  const L = t();
  fireButton.textContent = weapon ? L.fire : "";
  fireButton.title =
    weapon === "minigun" ? L.minigun : weapon === "bossblaster" ? L.blaster : weapon ? L.fire : "";
  fireButton.setAttribute("aria-label", fireButton.title || L.fire || "Fire");
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
function getActiveMarichkaChainStep() {
  return MARICHKA_CHAIN[marichkaChainStep] || null;
}
function addMarichkaChainProgress(id, amount = 1) {
  const step = getActiveMarichkaChainStep();
  if (!step || step.id !== id) return;
  marichkaChainStats[id] = Math.min(
    step.target,
    (Number(marichkaChainStats[id]) || 0) + amount,
  );
  refreshQuestUI();
}
function syncMarichkaChainProgress() {
  const step = getActiveMarichkaChainStep();
  if (!step) return;
  if (step.id === "project" && marichkaProjectSceneSeen)
    marichkaChainStats.project = 1;
}
function isMarichkaChainReady() {
  const step = getActiveMarichkaChainStep();
  return Boolean(step && (Number(marichkaChainStats[step.id]) || 0) >= step.target);
}
function getReadyQuestCount() {
  syncMarichkaChainProgress();
  const baseCount = QUESTS.filter(
    (quest) =>
      !questClaimed[quest.id] &&
      (Number(questStats[quest.id]) || 0) >= quest.target,
  ).length;
  return baseCount + (isMarichkaChainReady() ? 1 : 0);
}
function updateQuestReadyBadge() {
  const badge = document.getElementById("questReadyBadge");
  if (!badge) return;
  const count = getReadyQuestCount();
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "" : "none";
}
function makeLevelMissions() {
  const hasMetro = currentLocation === 0;
  const coinTarget = currentLevel >= 3 ? 28 : currentLevel >= 1 ? 22 : 18;
  const missions = [
    {
      id: "coins",
      title: gt("collectCoins", coinTarget),
      target: coinTarget,
      unit: "",
    },
    {
      id: hasMetro ? "metro" : "route",
      title: hasMetro ? gt("passMetro") : gt("passRoute"),
      target: 1,
      unit: "",
    },
  ];
  if (currentLevel === 0) {
    missions.push({
      id: "distance",
      title: gt("runMeters"),
      target: 250,
      unit: lang === "uk" ? "\u043c" : "m",
    });
  } else if (currentLevel % 3 === 1) {
    missions.push({
      id: "greenCrosswalks",
      title: gt("greenCrosswalks"),
      target: 2,
      unit: "",
    });
  } else if (currentLevel % 3 === 2) {
    missions.push({
      id: "trafficCars",
      title: gt("jumpCars"),
      target: 2,
      unit: "",
    });
  } else {
    missions.push({
      id: "trick2",
      title: gt("trick2"),
      target: 1,
      unit: "",
    });
  }
  return missions;
}
function resetLevelMissions() {
  levelMissions = makeLevelMissions();
  levelMissionStats = Object.fromEntries(levelMissions.map((mission) => [mission.id, 0]));
  levelMissionReward = 0;
  levelMissionRewardClaimed = false;
}
function addLevelMissionProgress(id, amount = 1) {
  const mission = levelMissions.find((item) => item.id === id);
  if (!mission || levelMissionRewardClaimed) return;
  levelMissionStats[id] = Math.min(
    mission.target,
    (Number(levelMissionStats[id]) || 0) + amount,
  );
}
function getLevelMissionProgress(mission) {
  return Math.min(mission.target, Number(levelMissionStats[mission.id]) || 0);
}
function getCompletedLevelMissions() {
  return levelMissions.filter((mission) => getLevelMissionProgress(mission) >= mission.target);
}
function claimLevelMissionReward() {
  if (levelMissionRewardClaimed) return 0;
  const reward = getCompletedLevelMissions().length * LEVEL_MISSION_REWARD;
  levelMissionReward = reward;
  levelMissionRewardClaimed = true;
  if (reward > 0) runCoins += reward;
  return reward;
}
function getMenuTimeOfDay(date = new Date()) {
  if (settingTimeOfDay === "morning")
    return { className: "time-morning", label: "\u0420\u0430\u043d\u043e\u043a" };
  if (settingTimeOfDay === "day")
    return { className: "time-day", label: "\u0414\u0435\u043d\u044c" };
  if (settingTimeOfDay === "night")
    return { className: "time-night", label: "\u041d\u0456\u0447" };
  const hour = date.getHours();
  if (hour >= 6 && hour < 12)
    return { className: "time-morning", label: "\u0420\u0430\u043d\u043e\u043a" };
  if (hour >= 12 && hour < 18)
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
    sky.addColorStop(0, "#ffad42");
    sky.addColorStop(0.24, "#ffd35d");
    sky.addColorStop(0.52, "#8fd6ff");
    sky.addColorStop(1, "#126fe6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const nightTone = ctx.createLinearGradient(0, 0, 0, GND);
    nightTone.addColorStop(0, "rgba(12,18,52,0.30)");
    nightTone.addColorStop(0.58, "rgba(10,28,82,0.22)");
    nightTone.addColorStop(1, "rgba(4,16,44,0.34)");
    ctx.fillStyle = nightTone;
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
    sky.addColorStop(0, "#ffb13d");
    sky.addColorStop(0.25, "#ffdc68");
    sky.addColorStop(0.52, "#91dcff");
    sky.addColorStop(1, "#1778f2");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,218,105,0.9)";
    ctx.beginPath();
    ctx.arc(96, 82, 34, 0, Math.PI * 2);
    ctx.fill();
  } else {
    sky.addColorStop(0, "#ffbf4d");
    sky.addColorStop(0.25, "#ffe070");
    sky.addColorStop(0.52, "#93ddff");
    sky.addColorStop(1, "#1478f4");
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
function kyivParallaxOffset(speed, span) {
  return (bgOff * speed) % span;
}
function drawKyivRainClouds() {
  const off = kyivParallaxOffset(0.05, 360);
  ctx.save();
  ctx.fillStyle = "rgba(18, 35, 54, 0.52)";
  for (let x = -360 - off; x < W + 360; x += 360) {
    ctx.beginPath();
    ctx.ellipse(x + 52, 52, 84, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 132, 43, 106, 27, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 226, 58, 92, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(198, 226, 238, 0.12)";
  for (let x = -280 - off * 0.7; x < W + 280; x += 280) {
    ctx.beginPath();
    ctx.ellipse(x + 86, 82, 58, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 146, 78, 44, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawKyivWindowGrid(x, y, w, h, cols, rows, lit = "#ffe28a") {
  const gapX = w / (cols + 1);
  const gapY = h / (rows + 1);
  ctx.fillStyle = "rgba(28, 54, 76, 0.82)";
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = x + gapX * (col + 0.5);
      const wy = y + gapY * (row + 0.72);
      ctx.fillRect(wx, wy, Math.max(6, gapX * 0.42), Math.max(8, gapY * 0.42));
      if ((row + col) % 3 === 0) {
        ctx.fillStyle = lit;
        ctx.fillRect(wx + 1, wy + 1, Math.max(4, gapX * 0.28), Math.max(5, gapY * 0.28));
        ctx.fillStyle = "rgba(28, 54, 76, 0.82)";
      }
    }
  }
}
function drawKyivOfficeTower(x, y, w, h, body = "#496b88", glass = "#7fc4e8") {
  ctx.save();
  ctx.fillStyle = "rgba(14, 22, 34, 0.22)";
  ctx.fillRect(x + 7, y + 8, w, h);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, body);
  grad.addColorStop(0.48, "#6d91aa");
  grad.addColorStop(1, "#31485e");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(220, 245, 255, 0.18)";
  ctx.fillRect(x + w * 0.1, y, w * 0.18, h);
  drawKyivWindowGrid(x + 6, y + 8, w - 12, h - 20, Math.max(2, Math.floor(w / 20)), Math.max(3, Math.floor(h / 22)), glass);
  ctx.strokeStyle = "rgba(225, 242, 255, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
function drawKyivHistoricBlock(x, y, w, h, body = "#d9a15f", roof = "#7f3f2e") {
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 36, 0.24)";
  ctx.fillRect(x + 6, y + 8, w, h);
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + w * 0.5, y - 34);
  ctx.lineTo(x + w + 6, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 236, 176, 0.72)";
  for (let col = 0; col < Math.floor(w / 30); col++) {
    const wx = x + 12 + col * 30;
    for (let row = 0; row < Math.floor(h / 34); row++) {
      ctx.fillRect(wx, y + 14 + row * 32, 15, 20);
      ctx.fillStyle = "#754a39";
      ctx.fillRect(wx - 2, y + 12 + row * 32, 19, 3);
      ctx.fillStyle = "rgba(255, 236, 176, 0.72)";
    }
  }
  ctx.strokeStyle = "rgba(92, 54, 38, 0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
function drawKyivSophia(x, baseY, scale = 1) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(14, 22, 34, 0.24)";
  ctx.fillRect(-72, -122, 150, 122);
  ctx.fillStyle = "#f4ead6";
  ctx.fillRect(-68, -104, 136, 104);
  ctx.fillStyle = "#d8c8a4";
  ctx.fillRect(-80, -112, 160, 16);
  ctx.fillStyle = "#e7dcc2";
  ctx.fillRect(-38, -136, 76, 136);
  ctx.fillStyle = "#47745e";
  ctx.fillRect(-76, -70, 152, 10);
  ctx.fillStyle = "#6e9a7c";
  ctx.beginPath();
  ctx.moveTo(-48, -136);
  ctx.lineTo(0, -174);
  ctx.lineTo(48, -136);
  ctx.closePath();
  ctx.fill();
  const domes = [
    [-54, -128, 18],
    [0, -166, 26],
    [54, -128, 18],
    [-24, -146, 17],
    [24, -146, 17],
  ];
  for (const [dx, dy, r] of domes) {
    const g = ctx.createRadialGradient(dx - r * 0.35, dy - r * 0.45, 3, dx, dy, r);
    g.addColorStop(0, "#fff4a3");
    g.addColorStop(0.55, "#ffd84e");
    g.addColorStop(1, "#b68618");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(dx, dy, r, Math.PI, 0);
    ctx.lineTo(dx + r * 0.7, dy + r * 0.55);
    ctx.lineTo(dx - r * 0.7, dy + r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffe27c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dx, dy - r - 10);
    ctx.lineTo(dx, dy - r + 6);
    ctx.moveTo(dx - 5, dy - r - 5);
    ctx.lineTo(dx + 5, dy - r - 5);
    ctx.stroke();
  }
  drawKyivWindowGrid(-58, -94, 116, 76, 4, 3, "#ffe8a8");
  ctx.restore();
}
function drawKyivAndrewChurch(x, baseY, scale = 1) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(14, 22, 34, 0.24)";
  ctx.fillRect(-58, -142, 122, 142);
  ctx.fillStyle = "#f6e8d2";
  ctx.fillRect(-52, -106, 104, 106);
  ctx.fillStyle = "#2c8ea4";
  ctx.beginPath();
  ctx.moveTo(-62, -106);
  ctx.lineTo(0, -150);
  ctx.lineTo(62, -106);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8c54a";
  ctx.beginPath();
  ctx.arc(0, -156, 25, Math.PI, 0);
  ctx.lineTo(15, -138);
  ctx.lineTo(-15, -138);
  ctx.closePath();
  ctx.fill();
  for (const dx of [-42, 42]) {
    ctx.fillStyle = "#e8c54a";
    ctx.beginPath();
    ctx.arc(dx, -128, 14, Math.PI, 0);
    ctx.lineTo(dx + 9, -118);
    ctx.lineTo(dx - 9, -118);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffe37d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dx, -150);
    ctx.lineTo(dx, -132);
    ctx.moveTo(dx - 5, -145);
    ctx.lineTo(dx + 5, -145);
    ctx.stroke();
  }
  ctx.strokeStyle = "#186f86";
  ctx.lineWidth = 5;
  ctx.strokeRect(-52, -106, 104, 106);
  drawKyivWindowGrid(-38, -86, 76, 66, 3, 3, "#fff0b8");
  ctx.restore();
}
function drawKyivBridge(x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = "rgba(126, 162, 190, 0.52)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.75, x + w, y + h);
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const px = x + (w / 8) * i;
    ctx.beginPath();
    ctx.moveTo(px, y + h);
    ctx.lineTo(px, y + 4);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(79, 111, 138, 0.54)";
  ctx.fillRect(x - 8, y + h, w + 16, 6);
  ctx.restore();
}
function drawKyivDistantLayer() {
  const off = kyivParallaxOffset(0.08, 520);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(68, 105, 142, 0.88)";
  for (let x = -520 - off; x < W + 520; x += 520) {
    drawKyivBridge(x + 28, GND - 146, 176, 30);
    drawKyivOfficeTower(x + 222, GND - 220, 46, 96, "#405a72", "#9ad9f2");
    drawKyivOfficeTower(x + 282, GND - 246, 58, 122, "#486982", "#9ad9f2");
    drawKyivOfficeTower(x + 356, GND - 196, 68, 72, "#3c5267", "#93d2ed");
    ctx.fillStyle = "rgba(62, 89, 112, 0.8)";
    ctx.fillRect(x + 26, GND - 124, 430, 18);
  }
  const fog = ctx.createLinearGradient(0, GND - 204, 0, GND - 92);
  fog.addColorStop(0, "rgba(170, 205, 220, 0)");
  fog.addColorStop(1, "rgba(188, 224, 240, 0.14)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, GND - 210, W, 124);
  ctx.restore();
}
function drawKyivLargeCityLayer() {
  const off = kyivParallaxOffset(0.18, 720);
  ctx.save();
  for (let x = -720 - off; x < W + 720; x += 720) {
    drawKyivHistoricBlock(x + 10, GND - 158, 112, 112, "#c9824d", "#793a31");
    drawKyivSophia(x + 185, GND - 72, 0.94);
    drawKyivOfficeTower(x + 312, GND - 228, 72, 156, "#536f86", "#a5e3ff");
    drawKyivHistoricBlock(x + 402, GND - 176, 124, 130, "#d8a069", "#884735");
    drawKyivAndrewChurch(x + 590, GND - 66, 0.98);
    drawKyivOfficeTower(x + 664, GND - 204, 58, 132, "#4b6278", "#9ed8ff");
  }
  ctx.restore();
}
function drawKyivTree(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#4c3325";
  ctx.fillRect(-4, -42, 8, 42);
  ctx.fillStyle = "#2f7f55";
  ctx.beginPath();
  ctx.arc(-12, -45, 18, 0, Math.PI * 2);
  ctx.arc(10, -49, 20, 0, Math.PI * 2);
  ctx.arc(0, -66, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(170, 220, 170, 0.16)";
  ctx.beginPath();
  ctx.arc(-8, -56, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawKyivStreetLamp(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#263340";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -82);
  ctx.quadraticCurveTo(0, -100, 24, -100);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 228, 118, 0.95)";
  ctx.beginPath();
  ctx.ellipse(30, -98, 10, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 225, 80, 0.16)";
  ctx.beginPath();
  ctx.ellipse(30, -72, 35, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawKyivBusStop(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(16, 28, 44, 0.28)";
  ctx.fillRect(-4, -66, 100, 66);
  ctx.strokeStyle = "#31516b";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, -62, 92, 62);
  ctx.fillStyle = "rgba(130, 210, 240, 0.36)";
  ctx.fillRect(6, -56, 80, 42);
  ctx.fillStyle = "#ffcf3d";
  ctx.fillRect(-4, -72, 100, 10);
  ctx.fillStyle = "#234053";
  ctx.fillRect(16, -14, 58, 8);
  ctx.restore();
}
function drawKyivTrafficLight(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#26313d";
  ctx.fillRect(-3, -72, 6, 72);
  ctx.fillStyle = "#1b2632";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-13, -105, 26, 48, 6) : ctx.rect(-13, -105, 26, 48);
  ctx.fill();
  const lights = ["#d94a43", "#f4c541", "#45d278"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = lights[i];
    ctx.beginPath();
    ctx.arc(0, -96 + i * 15, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawKyivRoadsideDetails() {
  const horizonY = GND - 128;
  const off = kyivParallaxOffset(0.52, 460);
  ctx.save();
  for (let x = -460 - off; x < W + 460; x += 460) {
    drawKyivStreetLamp(x + 34, horizonY + 86, 0.9);
    drawKyivTree(x + 96, horizonY + 118, 0.9);
    drawKyivBusStop(x + 150, horizonY + 96, 0.78);
    drawKyivTrafficLight(x + 286, horizonY + 104, 0.75);
    drawKyivTree(x + 356, horizonY + 126, 1.0);
    drawKyivStreetLamp(x + 420, horizonY + 88, 0.85);

    drawKyivTree(x + W - 96, horizonY + 118, 0.9);
    drawKyivTrafficLight(x + W - 154, horizonY + 100, 0.72);
    drawKyivBusStop(x + W - 270, horizonY + 96, 0.72);
    drawKyivStreetLamp(x + W - 42, horizonY + 86, 0.84);
  }

  ctx.strokeStyle = "rgba(45, 64, 76, 0.72)";
  ctx.lineWidth = 3;
  for (let x = -80 - off; x < W + 80; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, horizonY + 26);
    ctx.lineTo(x + 22, horizonY + 18);
    ctx.stroke();
    ctx.fillStyle = "#e3c93e";
    ctx.fillRect(x + 7, horizonY + 13, 10, 18);
  }
  ctx.restore();
}
function drawGeneratedKyivSkyline() {
  drawKyivRainClouds();
  drawKyivDistantLayer();
  if (kyivSkylineReady && kyivSkylineImage?.naturalWidth) {
    const img = kyivSkylineImage;
    const skylineBottomY = GND - 62;
    const destH = GND - 68;
    const scale = (destH / img.naturalHeight) * 1.36;
    const tileW = img.naturalWidth * scale;
    const srcCropY = 0;
    const srcCropH = Math.floor(img.naturalHeight * 0.7);
    const drawH = Math.round(destH * 0.96);
    const destY = skylineBottomY - drawH;
    const offset = (bgOff * 0.12) % tileW;
    ctx.save();
    ctx.globalAlpha = 0.58;
    for (let x = -offset - tileW; x < W + tileW; x += tileW) {
      ctx.drawImage(img, 0, srcCropY, img.naturalWidth, srcCropH, x, destY, tileW, drawH);
    }
    const period = getMenuTimeOfDay().className;
    if (period === "time-night" || isStormWeather()) {
      ctx.fillStyle = period === "time-night" ? "rgba(3,8,22,0.42)" : "rgba(7,16,30,0.34)";
      ctx.fillRect(0, destY, W, drawH);
    } else if (period === "time-morning") {
      ctx.fillStyle = "rgba(255,173,95,0.12)";
      ctx.fillRect(0, destY, W, drawH);
    }
    ctx.restore();
  }
  drawKyivLargeCityLayer();
  return true;
}
function drawLoopedParallaxImage(img, speed, destY, destH, alpha = 1, srcTop = 0, srcHeight = img?.naturalHeight || 0) {
  if (!img?.naturalWidth || !img?.naturalHeight) return;
  const safeSrcTop = Math.max(0, Math.min(img.naturalHeight - 1, srcTop));
  const safeSrcHeight = Math.max(1, Math.min(img.naturalHeight - safeSrcTop, srcHeight));
  const scale = destH / safeSrcHeight;
  const tileW = Math.ceil(img.naturalWidth * scale);
  const offset = Math.round(bgOff * speed) % tileW;
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let x = -offset - tileW; x < W + tileW; x += tileW) {
    ctx.drawImage(img, 0, safeSrcTop, img.naturalWidth, safeSrcHeight, x, destY, tileW, destH);
  }
  ctx.restore();
}
function isLvivParallaxReady() {
  return (
    currentLocation === 1 &&
    lvivParallaxImages.length === LVIV_PARALLAX_SRCS.length &&
    lvivParallaxImages.every((img) => img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0)
  );
}
function drawLvivImageParallaxBackground(timePeriod) {
  if (!isLvivParallaxReady()) return false;
  const isNight = timePeriod === "time-night";
  ctx.save();
  drawLoopedParallaxImage(lvivParallaxImages[0], 0.045, -6, GND - 112, 0.98);
  drawLoopedParallaxImage(lvivParallaxImages[1], 0.11, 42, GND - 46, 0.98);
  drawLoopedParallaxImage(lvivParallaxImages[2], 0.22, GND - 238, 188, 0.9, 0, Math.round(lvivParallaxImages[2].naturalHeight * 0.72));
  drawLvivParallaxCityFrame(timePeriod);
  drawLvivRunnerMarketDepth(timePeriod);
  drawLvivGeneratedSceneGroundBlend(timePeriod);

  const grade = ctx.createLinearGradient(0, 0, 0, H);
  grade.addColorStop(0, isNight ? "rgba(8,16,42,0.08)" : "rgba(255,196,116,0.06)");
  grade.addColorStop(0.55, "rgba(0,0,0,0)");
  grade.addColorStop(1, isNight ? "rgba(6,10,20,0.20)" : "rgba(36,28,18,0.10)");
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  return true;
}
function drawLvivParallaxCityFrame(timePeriod) {
  const isNight = timePeriod === "time-night";
  const baseY = GND - 118;
  const off = Math.round(bgOff * 0.12) % 448;
  const palettes = [
    ["#c58b72", "#743c32"],
    ["#d8aa63", "#805036"],
    ["#a384aa", "#523f61"],
    ["#d1bc7f", "#735936"],
    ["#87a47f", "#3f6048"],
    ["#bd7d8b", "#6b3645"],
  ];

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, baseY + 16);
  ctx.clip();

  drawLvivRynokHorizon(baseY, isNight);
  drawLvivExtraSkylineSilhouettes(baseY, isNight);

  for (let tile = -448 - off; tile < W + 448; tile += 448) {
    for (let i = 0; i < 6; i++) {
      const w = 74 + ((i * 19) % 30);
      const h = 116 + ((i * 37 + tile) % 54);
      const x = tile + 8 + i * 74;
      const y = baseY - h;
      const [body, roof] = palettes[Math.abs(i + tile) % palettes.length];
      drawLvivParallaxFacade(x, y, w, h, body, roof, isNight, i);
    }
  }
  const treeOff = Math.round(bgOff * 0.18) % 240;
  for (let x = -160 - treeOff; x < W + 220; x += 120) {
    drawLvivParallaxTree(x + 34, baseY + 15, isNight);
    drawLvivParallaxLamp(x + 88, baseY + 10, isNight);
  }
  drawLvivVisibleRatusha(baseY, isNight);

  const glow = ctx.createLinearGradient(0, baseY - 96, 0, baseY + 28);
  glow.addColorStop(0, "rgba(255,210,128,0)");
  glow.addColorStop(0.72, isNight ? "rgba(255,190,98,0.18)" : "rgba(255,205,130,0.12)");
  glow.addColorStop(1, "rgba(10,16,28,0.18)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, baseY - 100, W, 130);
  ctx.restore();
}

function drawLvivRunnerMarketDepth(timePeriod) {
  const isNight = timePeriod === "time-night";
  const horizonY = GND - 128;
  const cx = W / 2;
  const topHalf = ROAD_TOP_HALF;
  const bottomHalf = ROAD_BOTTOM_HALF;
  const roadT = (y) => Math.max(0, Math.min(1, (y - horizonY) / (H + 24 - horizonY)));
  const roadHalfAtY = (y) => {
    const t = roadT(y);
    return topHalf + (bottomHalf - topHalf) * t;
  };
  const sideX = (side, y, pad = 18) => cx + side * (roadHalfAtY(y) + pad);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, GND - 42);
  ctx.clip();

  const marketGlow = ctx.createLinearGradient(0, GND - 210, 0, GND - 70);
  marketGlow.addColorStop(0, "rgba(255, 205, 108, 0)");
  marketGlow.addColorStop(0.68, isNight ? "rgba(255, 185, 90, 0.18)" : "rgba(255, 220, 132, 0.14)");
  marketGlow.addColorStop(1, isNight ? "rgba(12, 16, 28, 0.18)" : "rgba(86, 92, 112, 0.10)");
  ctx.fillStyle = marketGlow;
  ctx.fillRect(0, GND - 224, W, 160);

  const facadePalette = [
    ["#d88f62", "#7f3d32"],
    ["#e2bd68", "#8b5635"],
    ["#8eb0bf", "#37586a"],
    ["#cc8e9a", "#743b4c"],
    ["#d7c37a", "#715a35"],
    ["#a6b87f", "#47654b"],
  ];

  for (const side of [-1, 1]) {
    const farY = GND - 146;
    const nearY = GND - 54;
    const innerFar = sideX(side, farY, 18);
    const innerNear = sideX(side, nearY, 34);
    const outerFar = side < 0 ? -8 : W + 8;
    const outerNear = side < 0 ? -20 : W + 20;

    const sidewalk = ctx.createLinearGradient(0, farY, 0, nearY);
    sidewalk.addColorStop(0, isNight ? "rgba(74, 70, 70, 0.56)" : "rgba(168, 153, 132, 0.56)");
    sidewalk.addColorStop(1, isNight ? "rgba(44, 45, 50, 0.86)" : "rgba(120, 108, 92, 0.76)");
    ctx.fillStyle = sidewalk;
    ctx.beginPath();
    ctx.moveTo(innerFar, farY);
    ctx.lineTo(outerFar, farY - 10);
    ctx.lineTo(outerNear, nearY + 34);
    ctx.lineTo(innerNear, nearY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isNight ? "rgba(255, 236, 190, 0.18)" : "rgba(78, 60, 42, 0.22)";
    ctx.lineWidth = 1;
    for (let row = 0; row < 8; row++) {
      const y = farY + row * 14;
      const left = side < 0 ? outerFar : innerFar;
      const right = side < 0 ? innerFar : outerFar;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y + 8);
      ctx.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const yBase = GND - 146 + t * 42;
      const h = 74 + t * 38 + ((i * 17) % 22);
      const w = 58 + t * 30;
      const inner = sideX(side, yBase, 30 + t * 16);
      const x = side < 0 ? inner - w - 10 : inner + 10;
      const [body, roof] = facadePalette[(i + (side > 0 ? 2 : 0)) % facadePalette.length];
      drawLvivRunnerFacade(x, yBase - h, w, h, body, roof, isNight, i + (side > 0 ? 10 : 0), side);
    }

    for (let i = 0; i < 4; i++) {
      const y = GND - 130 + i * 22;
      const x = sideX(side, y, 54 + i * 10);
      drawLvivRunnerLamp(x, y + 14, isNight, side);
    }
  }

  drawLvivRunnerDirectionSign(sideX(-1, GND - 106, 72), GND - 126, "Львів", -1);
  drawLvivRunnerDirectionSign(sideX(1, GND - 94, 80), GND - 114, "Ринок", 1);
  drawLvivRunnerMarketFlag(cx - 154, GND - 150, 0.72);
  drawLvivRunnerMarketFlag(cx + 172, GND - 144, 0.64);

  ctx.restore();
}

function drawLvivRunnerFacade(x, y, w, h, body, roof, isNight, variant, side) {
  ctx.save();
  ctx.fillStyle = "rgba(5, 8, 16, 0.28)";
  ctx.fillRect(x + side * 5, y + 7, w, h);
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + w * 0.5, y - 18 - (variant % 3) * 4);
  ctx.lineTo(x + w + 5, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 238, 188, 0.34)";
  ctx.fillRect(x + 4, y + 9, w - 8, 3);
  ctx.fillRect(x + 3, y + h - 34, w - 6, 4);

  const cols = Math.max(2, Math.floor(w / 23));
  const rows = Math.max(2, Math.floor(h / 31));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + 9 + c * ((w - 18) / cols);
      const wy = y + 17 + r * 28;
      const lit = isNight || (r + c + variant) % 2 === 0;
      ctx.fillStyle = lit ? "rgba(255, 222, 132, 0.92)" : "rgba(41, 61, 77, 0.78)";
      ctx.beginPath();
      if ((variant + r + c) % 3 === 0) {
        ctx.moveTo(wx, wy + 16);
        ctx.lineTo(wx, wy + 7);
        ctx.quadraticCurveTo(wx + 6, wy - 2, wx + 12, wy + 7);
        ctx.lineTo(wx + 12, wy + 16);
        ctx.closePath();
      } else if (ctx.roundRect) ctx.roundRect(wx, wy, 12, 16, 3);
      else ctx.rect(wx, wy, 12, 16);
      ctx.fill();
      if (r === 1 && (c + variant) % 2 === 0) {
        ctx.strokeStyle = "rgba(36, 25, 24, 0.58)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wx - 3, wy + 14, 18, 5);
        ctx.fillStyle = "#e8717c";
        ctx.fillRect(wx + 1, wy + 17, 10, 3);
      }
    }
  }

  ctx.fillStyle = "#3f2b25";
  ctx.fillRect(x + 8, y + h - 26, w - 16, 21);
  ctx.fillStyle = "rgba(255, 219, 122, 0.66)";
  ctx.fillRect(x + 15, y + h - 19, w - 30, 8);
  ctx.strokeStyle = "rgba(255, 240, 194, 0.24)";
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}

function drawLvivRunnerLamp(x, y, isNight, side = 1) {
  ctx.save();
  ctx.strokeStyle = "#262222";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 58);
  ctx.quadraticCurveTo(x, y - 70, x + side * 18, y - 70);
  ctx.stroke();
  ctx.fillStyle = "#ffd56f";
  ctx.beginPath();
  ctx.ellipse(x + side * 22, y - 69, 7, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isNight) {
    ctx.fillStyle = "rgba(255, 208, 94, 0.13)";
    ctx.beginPath();
    ctx.ellipse(x + side * 22, y - 48, 28, 33, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLvivRunnerDirectionSign(x, y, label, side = 1) {
  ctx.save();
  ctx.strokeStyle = "#20242c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + 28);
  ctx.lineTo(x, y + 78);
  ctx.stroke();
  ctx.fillStyle = "#0b57a3";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - 35, y, 70, 30, 5);
  else ctx.rect(x - 35, y, 70, 30);
  ctx.fill();
  ctx.strokeStyle = "#eaf6ff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 20);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + side * 12, y + 24);
  ctx.lineTo(x + side * 26, y + 24);
  ctx.lineTo(x + side * 19, y + 18);
  ctx.moveTo(x + side * 26, y + 24);
  ctx.lineTo(x + side * 19, y + 30);
  ctx.stroke();
  ctx.restore();
}

function drawLvivRunnerMarketFlag(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#2d2928";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 58);
  ctx.stroke();
  ctx.fillStyle = "#1e8ee8";
  ctx.fillRect(0, 2, 44, 14);
  ctx.fillStyle = "#ffd542";
  ctx.fillRect(0, 16, 44, 14);
  ctx.restore();
}

function drawLvivExtraSkylineSilhouettes(baseY, isNight) {
  ctx.save();
  const far = isNight ? "rgba(34,48,70,0.48)" : "rgba(92,111,119,0.38)";
  const warm = isNight ? "rgba(255,204,112,0.58)" : "rgba(255,226,166,0.42)";

  // High Castle hill silhouette on the left side of the horizon.
  ctx.fillStyle = isNight ? "rgba(24,58,52,0.42)" : "rgba(76,123,85,0.34)";
  ctx.beginPath();
  ctx.moveTo(8, baseY - 54);
  ctx.quadraticCurveTo(78, baseY - 130, 162, baseY - 72);
  ctx.quadraticCurveTo(224, baseY - 112, 292, baseY - 56);
  ctx.lineTo(292, baseY + 8);
  ctx.lineTo(8, baseY + 8);
  ctx.closePath();
  ctx.fill();

  // Small observation mound and cross, readable but kept behind gameplay.
  ctx.fillStyle = far;
  ctx.fillRect(128, baseY - 112, 20, 52);
  ctx.fillRect(119, baseY - 68, 38, 10);
  ctx.strokeStyle = warm;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(138, baseY - 124);
  ctx.lineTo(138, baseY - 142);
  ctx.moveTo(130, baseY - 134);
  ctx.lineTo(146, baseY - 134);
  ctx.stroke();

  // St. George-inspired dome and side towers on the right.
  const x = W - 156;
  const y = baseY - 92;
  ctx.fillStyle = far;
  ctx.fillRect(x - 38, y + 28, 76, 82);
  ctx.fillRect(x - 72, y + 44, 26, 66);
  ctx.fillRect(x + 46, y + 44, 26, 66);
  ctx.fillStyle = isNight ? "#c99a44" : "#d2a446";
  ctx.beginPath();
  ctx.arc(x, y + 30, 38, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - 59, y + 45, 16, Math.PI, 0);
  ctx.arc(x + 59, y + 45, 16, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = warm;
  ctx.lineWidth = 1.7;
  for (const cx of [x, x - 59, x + 59]) {
    ctx.beginPath();
    ctx.moveTo(cx, y - 14);
    ctx.lineTo(cx, y - 29);
    ctx.moveTo(cx - 6, y - 22);
    ctx.lineTo(cx + 6, y - 22);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLvivVisibleRatusha(baseY, isNight) {
  const glow = isNight ? "rgba(255,204,103,0.88)" : "rgba(255,226,154,0.76)";
  const towerX = W / 2 - 36;
  const towerY = baseY - 210;

  ctx.save();
  ctx.strokeStyle = "rgba(25,18,18,0.58)";
  ctx.lineWidth = 4;
  ctx.strokeRect(towerX - 8, towerY + 68, 78, 176);
  ctx.fillStyle = "rgba(12,10,16,0.32)";
  ctx.fillRect(towerX + 9, towerY + 12, 72, 236);
  ctx.fillStyle = "#c89d70";
  ctx.fillRect(towerX - 6, towerY + 70, 74, 172);
  ctx.fillStyle = "#8b6754";
  ctx.fillRect(towerX - 20, towerY + 58, 100, 14);
  ctx.fillRect(towerX + 8, towerY + 24, 48, 38);
  ctx.fillStyle = "#6f4e45";
  ctx.beginPath();
  ctx.moveTo(towerX - 12, towerY + 24);
  ctx.lineTo(towerX + 32, towerY - 6);
  ctx.lineTo(towerX + 76, towerY + 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e1bb73";
  ctx.fillRect(towerX + 27, towerY - 20, 10, 20);
  ctx.fillStyle = glow;
  for (let wy = towerY + 94; wy < towerY + 214; wy += 32) {
    ctx.fillRect(towerX + 10, wy, 10, 16);
    ctx.fillRect(towerX + 31, wy - 4, 10, 16);
    ctx.fillRect(towerX + 52, wy, 10, 16);
  }
  ctx.fillStyle = "#f4d891";
  ctx.beginPath();
  ctx.arc(towerX + 33, towerY + 113, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#422d28";
  ctx.lineWidth = 2.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(towerX + 33, towerY + 113);
  ctx.lineTo(towerX + 33, towerY + 99);
  ctx.moveTo(towerX + 33, towerY + 113);
  ctx.lineTo(towerX + 47, towerY + 118);
  ctx.stroke();
  ctx.fillStyle = glow;
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Ратуша", towerX + 33, towerY + 151);
  ctx.restore();
}
function drawLvivRynokHorizon(baseY, isNight) {
  const glow = isNight ? "rgba(255,190,96,0.84)" : "rgba(255,226,154,0.72)";
  const shadow = "rgba(18,16,22,0.34)";
  const towerX = W / 2 - 36;
  const towerY = baseY - 218;

  ctx.save();
  const hill = ctx.createLinearGradient(0, baseY - 124, 0, baseY - 24);
  hill.addColorStop(0, isNight ? "rgba(34,61,70,0.36)" : "rgba(94,132,92,0.34)");
  hill.addColorStop(1, isNight ? "rgba(30,52,48,0.08)" : "rgba(80,122,72,0.09)");
  ctx.fillStyle = hill;
  ctx.beginPath();
  ctx.moveTo(0, baseY - 44);
  ctx.quadraticCurveTo(W * 0.25, baseY - 136, W * 0.52, baseY - 64);
  ctx.quadraticCurveTo(W * 0.76, baseY - 116, W, baseY - 48);
  ctx.lineTo(W, baseY + 8);
  ctx.lineTo(0, baseY + 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isNight ? "rgba(72,82,90,0.70)" : "rgba(128,126,112,0.62)";
  for (let x = -30; x < W + 40; x += 38) {
    const h = 30 + ((x * 7) % 26);
    ctx.fillRect(x, baseY - h - 22, 34, h + 22);
    ctx.fillStyle = isNight ? "rgba(255,202,110,0.36)" : "rgba(255,226,168,0.42)";
    ctx.fillRect(x + 8, baseY - h - 8, 8, 10);
    ctx.fillRect(x + 21, baseY - h - 10, 8, 10);
    ctx.fillStyle = isNight ? "rgba(72,82,90,0.70)" : "rgba(128,126,112,0.62)";
  }

  ctx.fillStyle = shadow;
  ctx.fillRect(towerX + 8, towerY + 10, 70, 238);
  ctx.fillStyle = "#c89d70";
  ctx.fillRect(towerX - 6, towerY + 68, 72, 174);
  ctx.fillStyle = "#8b6754";
  ctx.fillRect(towerX - 18, towerY + 58, 96, 14);
  ctx.fillRect(towerX + 10, towerY + 24, 44, 38);
  ctx.fillStyle = "#6f4e45";
  ctx.beginPath();
  ctx.moveTo(towerX - 10, towerY + 24);
  ctx.lineTo(towerX + 32, towerY - 4);
  ctx.lineTo(towerX + 74, towerY + 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e1bb73";
  ctx.fillRect(towerX + 27, towerY - 18, 10, 18);
  ctx.fillStyle = glow;
  for (let wy = towerY + 92; wy < towerY + 214; wy += 32) {
    ctx.fillRect(towerX + 10, wy, 10, 16);
    ctx.fillRect(towerX + 30, wy - 4, 10, 16);
    ctx.fillRect(towerX + 50, wy, 10, 16);
  }
  ctx.fillStyle = "#f2d28b";
  ctx.beginPath();
  ctx.arc(towerX + 32, towerY + 112, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4a332d";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(towerX + 32, towerY + 112);
  ctx.lineTo(towerX + 32, towerY + 99);
  ctx.moveTo(towerX + 32, towerY + 112);
  ctx.lineTo(towerX + 45, towerY + 117);
  ctx.stroke();
  ctx.fillStyle = glow;
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Ратуша", towerX + 32, towerY + 150);

  const domes = [
    [towerX - 136, baseY - 96, 36, "#b7774f"],
    [towerX + 156, baseY - 100, 38, "#9b665a"],
    [towerX + 220, baseY - 82, 25, "#7d5568"],
  ];
  domes.forEach(([x, y, r, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - 15, y, 30, 66);
    ctx.fillStyle = "#d7a23d";
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r - 5);
    ctx.lineTo(x, y - r - 18);
    ctx.moveTo(x - 6, y - r - 12);
    ctx.lineTo(x + 6, y - r - 12);
    ctx.stroke();
  });

  ctx.strokeStyle = isNight ? "rgba(255,216,116,0.54)" : "rgba(255,232,164,0.44)";
  ctx.lineWidth = 2;
  for (let x = -40; x < W + 40; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, baseY - 12 + Math.sin((x + bgOff) * 0.01) * 2);
    ctx.quadraticCurveTo(x + 28, baseY + 3, x + 56, baseY - 12);
    ctx.stroke();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + 28, baseY - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = isNight ? "rgba(255,190,92,0.72)" : "rgba(236,170,70,0.56)";
  for (let x = 24; x < W; x += 78) {
    ctx.beginPath();
    ctx.arc(x, baseY - 29, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 25, baseY - 23, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 50, baseY - 29, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawLvivParallaxFacade(x, y, w, h, body, roof, isNight, variant) {
  ctx.save();
  ctx.fillStyle = "rgba(6,10,18,0.28)";
  ctx.fillRect(x + 5, y + 7, w, h);
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = roof;
  ctx.beginPath();
  if (variant % 4 === 1) {
    ctx.rect(x - 5, y - 18, w + 10, 18);
    ctx.fill();
    ctx.fillRect(x + w - 24, y - 34, 12, 16);
  } else {
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x + w * 0.5, y - 28 - (variant % 3) * 7);
    ctx.lineTo(x + w + 7, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,238,190,0.34)";
  ctx.fillRect(x + 4, y + 8, w - 8, 4);
  ctx.fillRect(x + 3, y + h - 44, w - 6, 5);

  ctx.fillStyle = "rgba(255,232,170,0.82)";
  const cols = Math.max(2, Math.floor(w / 24));
  const rows = Math.max(2, Math.floor(h / 35));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + 10 + c * ((w - 20) / cols);
      const wy = y + 18 + r * 31;
      const lit = isNight || (r + c + variant) % 3 === 0;
      ctx.fillStyle = lit ? "rgba(255,219,128,0.86)" : "rgba(42,64,82,0.72)";
      ctx.beginPath();
      if ((variant + r + c) % 3 === 0) {
        ctx.moveTo(wx, wy + 18);
        ctx.lineTo(wx, wy + 7);
        ctx.quadraticCurveTo(wx + 6, wy - 2, wx + 12, wy + 7);
        ctx.lineTo(wx + 12, wy + 18);
        ctx.closePath();
      } else if (ctx.roundRect) ctx.roundRect(wx, wy, 12, 18, 3);
      else ctx.rect(wx, wy, 12, 18);
      ctx.fill();
      if ((r + c + variant) % 2 === 0) {
        ctx.strokeStyle = "rgba(54,34,28,0.64)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx - 3, wy + 21);
        ctx.lineTo(wx + 15, wy + 21);
        ctx.stroke();
      }
      if (r === 1 && (c + variant) % 2 === 0) {
        ctx.strokeStyle = "rgba(36,28,28,0.58)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wx - 3, wy + 17, 18, 5);
        ctx.fillStyle = "#d76f7a";
        ctx.fillRect(wx + 2, wy + 20, 8, 3);
      }
    }
  }

  ctx.fillStyle = "#4c2f27";
  ctx.fillRect(x + 8, y + h - 28, w - 16, 22);
  ctx.fillStyle = "rgba(255,220,120,0.70)";
  ctx.fillRect(x + 16, y + h - 22, w - 32, 10);
  ctx.strokeStyle = "rgba(255,236,180,0.32)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();
}
function drawLvivParallaxTree(x, y, isNight) {
  ctx.save();
  ctx.fillStyle = "#4b3024";
  ctx.fillRect(x - 4, y - 44, 8, 46);
  ctx.fillStyle = isNight ? "#235037" : "#2f7a4d";
  for (const [dx, dy, r] of [[-16, -50, 22], [12, -54, 25], [0, -74, 21], [24, -35, 18]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawLvivParallaxLamp(x, y, isNight) {
  ctx.save();
  ctx.strokeStyle = "#302a28";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 78);
  ctx.quadraticCurveTo(x, y - 92, x + 22, y - 92);
  ctx.stroke();
  ctx.fillStyle = "#ffd56b";
  ctx.beginPath();
  ctx.ellipse(x + 27, y - 91, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (isNight) {
    ctx.fillStyle = "rgba(255,210,92,0.16)";
    ctx.beginPath();
    ctx.ellipse(x + 28, y - 58, 34, 42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawLvivGeneratedSceneGroundBlend(timePeriod) {
  const isNight = timePeriod === "time-night";
  const horizonY = GND - 132;
  const cx = W / 2;
  const topHalf = ROAD_TOP_HALF;
  const bottomHalf = ROAD_BOTTOM_HALF;
  const bottomY = H + 24;
  const roadT = (y) => Math.max(0, Math.min(1, (y - horizonY) / (bottomY - horizonY)));
  const roadHalfAt = (t) => topHalf + (bottomHalf - topHalf) * t;

  ctx.save();
  clipOutsideRoad();

  const wallCapY = GND - 132;
  const plaza = ctx.createLinearGradient(0, wallCapY, 0, GND + 18);
  plaza.addColorStop(0, isNight ? "rgba(44,42,45,0.72)" : "rgba(148,135,114,0.68)");
  plaza.addColorStop(0.54, isNight ? "rgba(39,39,42,0.86)" : "rgba(132,121,104,0.80)");
  plaza.addColorStop(1, isNight ? "rgba(29,31,36,0.96)" : "rgba(104,94,81,0.90)");
  ctx.fillStyle = plaza;
  ctx.fillRect(0, wallCapY, W, GND - wallCapY + 30);

  const seamOffset = Math.round(bgOff * 0.18) % 44;
  ctx.strokeStyle = isNight ? "rgba(240,232,212,0.10)" : "rgba(255,246,224,0.20)";
  ctx.lineWidth = 1;
  for (let y = wallCapY + 16 - seamOffset; y < GND + 24; y += 44) {
    const t = roadT(y);
    const half = roadHalfAt(t);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cx - half * 1.07, y);
    ctx.moveTo(cx + half * 1.07, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = isNight ? "rgba(245,226,194,0.08)" : "rgba(90,72,56,0.13)";
  for (let x = -20 - (seamOffset % 24); x < W + 30; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, wallCapY + 6);
    ctx.lineTo(x + 22, GND + 12);
    ctx.stroke();
  }

  for (const side of [-1, 1]) {
    const curb = ctx.createLinearGradient(0, horizonY, 0, H);
    curb.addColorStop(0, isNight ? "rgba(232,222,196,0.42)" : "rgba(255,246,220,0.72)");
    curb.addColorStop(1, isNight ? "rgba(164,150,122,0.55)" : "rgba(198,181,146,0.80)");
    ctx.strokeStyle = curb;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx + side * topHalf * 1.07, horizonY);
    ctx.lineTo(cx + side * bottomHalf * 1.07, bottomY);
    ctx.stroke();
  }
  drawLvivCobblestoneSidewalks(horizonY, bottomY, isNight);
  ctx.restore();
}
function drawLvivCobblestoneSidewalks(horizonY, bottomY, isNight) {
  const cx = W / 2;
  ctx.save();
  ctx.strokeStyle = isNight ? "rgba(245,236,214,0.11)" : "rgba(70,54,42,0.14)";
  ctx.lineWidth = 1;
  for (let y = horizonY + 24; y < H + 18; y += 18) {
    const t = Math.max(0, Math.min(1, (y - horizonY) / (bottomY - horizonY)));
    const half = ROAD_TOP_HALF + (ROAD_BOTTOM_HALF - ROAD_TOP_HALF) * t;
    const cellW = 20 + t * 18;
    const stagger = ((Math.floor(y / 18) % 2) * cellW) / 2;
    const leftEnd = cx - half * 1.12;
    for (let x = -stagger; x < leftEnd; x += cellW) {
      ctx.strokeRect(x, y, cellW, 12 + t * 4);
    }
    const rightStart = cx + half * 1.12;
    for (let x = rightStart + stagger; x < W + cellW; x += cellW) {
      ctx.strokeRect(x, y, cellW, 12 + t * 4);
    }
  }
  ctx.restore();
}
function drawLvivForegroundIdentity(isNight) {
  ctx.save();

  const drawTinyLion = (x, y, flip = 1, scale = 0.42) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip * scale, scale);
    const lionColor = isNight ? "#ffd36e" : "#d49334";
    const maneColor = isNight ? "#a4692d" : "#7a421e";
    ctx.fillStyle = isNight ? "rgba(255,211,110,0.18)" : "rgba(255,198,76,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath();
    ctx.ellipse(0, 12, 24, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lionColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = maneColor;
    ctx.beginPath();
    ctx.arc(26, -3, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lionColor;
    ctx.beginPath();
    ctx.arc(30, -4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lionColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-24, -2);
    ctx.quadraticCurveTo(-42, -22, -24, -30);
    ctx.stroke();
    ctx.fillStyle = maneColor;
    ctx.beginPath();
    ctx.ellipse(-24, -30, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f2116";
    ctx.beginPath();
    ctx.arc(33, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Background-only Lviv lion easter eggs, lifted away from road and sidewalks.
  drawTinyLion(W / 2 - 94, GND - 166, 1, 0.52);
  drawTinyLion(W / 2 + 94, GND - 166, -1, 0.52);
  drawTinyLion(96, GND - 178, 1, 0.40);
  drawTinyLion(W - 96, GND - 178, -1, 0.40);
  ctx.fillStyle = isNight ? "rgba(92,68,48,0.82)" : "rgba(126,92,62,0.70)";
  ctx.fillRect(W / 2 - 16, GND - 151, 32, 10);
  ctx.fillStyle = isNight ? "rgba(255,211,110,0.20)" : "rgba(255,198,76,0.12)";
  ctx.fillRect(W / 2 - 19, GND - 155, 38, 4);
  drawTinyLion(W / 2, GND - 160, 1, 0.36);

  const signX = W - 104;
  const signY = GND - 164;
  ctx.fillStyle = "#4a3028";
  ctx.fillRect(signX + 32, signY + 26, 4, 52);
  ctx.fillStyle = "rgba(192,138,73,0.94)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(signX, signY, 68, 24, 5);
  else ctx.rect(signX, signY, 68, 24);
  ctx.fill();
  ctx.strokeStyle = "#ffe0a0";
  ctx.stroke();
  ctx.fillStyle = "#271a16";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u0420\u0438\u043d\u043e\u043a", signX + 34, signY + 16);

  const lamps = [36, W - 36];
  lamps.forEach((x, i) => {
    const y = GND - 48 - (i % 2) * 8;
    ctx.strokeStyle = "#2c2524";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 76);
    ctx.stroke();
    ctx.fillStyle = "#ffd36e";
    ctx.beginPath();
    ctx.ellipse(x, y - 80, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (isNight) {
      ctx.fillStyle = "rgba(255,205,92,0.10)";
      ctx.beginPath();
      ctx.ellipse(x, y - 48, 24, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  ctx.strokeStyle = isNight ? "rgba(255,213,110,0.56)" : "rgba(255,192,76,0.36)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(76, GND - 146);
  ctx.quadraticCurveTo(W / 2, GND - 112, W - 76, GND - 146);
  ctx.stroke();
  for (let x = 104; x < W - 76; x += 48) {
    ctx.fillStyle = isNight ? "rgba(255,213,110,0.76)" : "rgba(255,196,80,0.46)";
    ctx.beginPath();
    ctx.arc(x, GND - 143 + Math.sin(x * 0.05) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function isRoadEvent(type) {
  return roadEvent?.type === type && roadEvent.timer > 0;
}
function getRoadEventTitle(type) {
  const titles = {
    kyiv_storm: "\u0417\u043b\u0438\u0432\u0430 \u0432 \u041a\u0438\u0454\u0432\u0456",
    kyiv_traffic: "\u0417\u0430\u0442\u043e\u0440 \u043d\u0430 \u0434\u043e\u0440\u043e\u0437\u0456",
    lviv_tram: "\u0422\u0440\u0430\u043c\u0432\u0430\u0439\u043d\u0430 \u0445\u0432\u0438\u043b\u044f",
    lviv_roadwork: "\u0420\u0435\u043c\u043e\u043d\u0442 \u0431\u0440\u0443\u043a\u0456\u0432\u043a\u0438",
  };
  return titles[type] || "\u041f\u043e\u0434\u0456\u044f \u043d\u0430 \u0434\u043e\u0440\u043e\u0437\u0456";
}
function getRoadEventHint(type) {
  const hints = {
    kyiv_storm: "\u041e\u0431\u0435\u0440\u0435\u0436\u043d\u043e \u043a\u0430\u043b\u044e\u0436\u0456 \u0442\u0430 \u0431\u043b\u0438\u0441\u043a\u0430\u0432\u043a\u0430",
    kyiv_traffic: "\u041c\u0430\u0448\u0438\u043d\u0438 \u0457\u0434\u0443\u0442\u044c \u0447\u0430\u0441\u0442\u0456\u0448\u0435",
    lviv_tram: "\u0422\u0440\u0438\u043c\u0430\u0439\u0441\u044f \u0441\u043c\u0443\u0433\u0438 \u0431\u0456\u043b\u044f \u0442\u0440\u0430\u043c\u0432\u0430\u044f",
    lviv_roadwork: "\u041a\u043e\u043d\u0443\u0441\u0438 \u0456 \u044f\u043c\u0438 \u043d\u0430 \u0431\u0440\u0443\u043a\u0456\u0432\u0446\u0456",
  };
  return hints[type] || "\u0411\u0443\u0434\u044c \u0443\u0432\u0430\u0436\u043d\u0438\u0439";
}
function getRainIntensity() {
  return isRoadEvent("kyiv_storm") ? 1.65 : 1;
}
function isStormWeather() {
  return currentLocation === 0 && (gameState === "run" || gameState === "schoolEnter");
}
function startRoadEvent(type) {
  if (!type || roadEvent?.timer > 0) return;
  roadEvent = { type, timer: 520, intro: 90 };
  roadEventCooldown = 820;
  const title = getRoadEventTitle(type);
  const hint = getRoadEventHint(type);
  showAndriiBubble(`\u0420\u043e\u0431\u043e\u0442\u0440\u043e\u043d: ${title}. ${hint}`, true);
  if (type === "kyiv_storm") {
    lightningFlash = 18;
    nextLightning = 120;
    sfxThunder();
  }
}
function maybeStartRoadEvent(startSafe) {
  if (gameState !== "run" || startSafe || bossActive || secretRoute?.active) return;
  if (totalDist < 115 || totalDist > getFinishDistance() - 180) return;
  if (roadEvent?.timer > 0 || roadEventCooldown > 0) return;
  if (fr % 360 !== 140 || Math.random() > 0.55) return;
  const type = currentLocation === 0
    ? (Math.random() < 0.52 ? "kyiv_storm" : "kyiv_traffic")
    : (Math.random() < 0.55 ? "lviv_roadwork" : "lviv_tram");
  startRoadEvent(type);
}
function completeRoadEvent() {
  if (!roadEvent || roadEvent.rewarded) return;
  roadEvent.rewarded = true;
  addAchievementProgress("road_events3");
  if (roadEvent.type === "kyiv_storm") addAchievementProgress("kyiv_storm_survivor");
  if (roadEvent.type === "lviv_tram" || roadEvent.type === "lviv_roadwork")
    addAchievementProgress("lviv_event_survivor");
}
function updateRoadEvent(startSafe) {
  if (roadEventCooldown > 0) roadEventCooldown--;
  if (roadEvent?.timer > 0) {
    roadEvent.timer--;
    if (roadEvent.intro > 0) roadEvent.intro--;
    if (roadEvent.timer <= 0) {
      completeRoadEvent();
      roadEvent = null;
    }
  }
  maybeStartRoadEvent(startSafe);
}
function startChaseMode() {
  if (chaseMode?.timer > 0 || chaseCooldown > 0) return;
  chaseMode = { timer: 720, intro: 90, clean: true, rewarded: false };
  chaseCooldown = 1050;
  chaserX = Math.max(chaserX, LANES[0] - 250);
  lightningFlash = Math.max(lightningFlash, 8);
  showAndriiBubble("\u0420\u043e\u0431\u043e\u0442\u0440\u043e\u043d: \u0420\u0435\u0436\u0438\u043c \u043f\u043e\u0433\u043e\u043d\u0456! \u0422\u0440\u0438\u043c\u0430\u0439\u0441\u044f!", true);
}
function maybeStartChaseMode(startSafe) {
  if (gameState !== "run" || startSafe || bossActive || secretRoute?.active) return;
  if (chaseMode?.timer > 0 || chaseCooldown > 0) return;
  if (totalDist < 170 || totalDist > getFinishDistance() - 190) return;
  if (fr % 520 !== 260 || Math.random() > 0.5) return;
  startChaseMode();
}
function completeChaseMode() {
  if (!chaseMode || chaseMode.rewarded) return;
  chaseMode.rewarded = true;
  const reward = CHASE_REWARD + (chaseMode.clean ? CHASE_CLEAN_BONUS : 0);
  runCoins += reward;
  addAchievementProgress("chase_survivor");
  if (chaseMode.clean) addAchievementProgress("clean_chase");
  addQuestProgress("coins", reward);
  addLevelMissionProgress("coins", reward);
  addParts(px, pY - 45, chaseMode.clean ? "#ffd700" : "#9fd8ff");
  showAndriiBubble(
    chaseMode.clean
      ? `\u041f\u043e\u0433\u043e\u043d\u044e \u0432\u0438\u0442\u0440\u0438\u043c\u0430\u043d\u043e \u0431\u0435\u0437 \u0443\u0434\u0430\u0440\u0443! +${reward}\u20b4`
      : `\u041f\u043e\u0433\u043e\u043d\u044e \u0432\u0438\u0442\u0440\u0438\u043c\u0430\u043d\u043e! +${reward}\u20b4`,
    true,
  );
  sfxCoin();
  hudUp();
}
function updateChaseMode(startSafe) {
  if (chaseCooldown > 0) chaseCooldown--;
  if (chaseMode?.timer > 0) {
    chaseMode.timer--;
    if (chaseMode.intro > 0) chaseMode.intro--;
    if (!bossActive && !secretRoute?.active) {
      const target = LANES[0] - 190 + Math.sin(fr * 0.08) * 12;
      chaserX += (target - chaserX) * 0.018;
    }
    if (chaseMode.timer % 180 === 40) {
      lightningFlash = Math.max(lightningFlash, 5);
    }
    if (chaseMode.timer <= 0) {
      completeChaseMode();
      chaseMode = null;
    }
  }
  maybeStartChaseMode(startSafe);
}
function markChaseHit() {
  if (chaseMode?.timer > 0) chaseMode.clean = false;
}
function showAchievementToast(item, reward = 0, unlockedSkins = []) {
  if (!item) return;
  const skinNames = unlockedSkins.map((skin) => skin.name).filter(Boolean).join(", ");
  achievementToast = {
    title: item.title,
    reward,
    skinNames,
    timer: 240,
    life: 240,
  };
  sfxCoin();
}
function drawAchievementToast() {
  if (!achievementToast?.timer) return;
  const t = achievementToast;
  const fade = Math.min(1, t.timer / 28, (t.life - t.timer) / 18);
  const y = 128 - Math.sin((1 - t.timer / t.life) * Math.PI) * 5;
  ctx.save();
  ctx.globalAlpha = Math.max(0, fade);
  ctx.fillStyle = "rgba(10, 14, 28, 0.9)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(W / 2 - 165, y - 30, 330, 64, 10);
  else ctx.rect(W / 2 - 165, y - 30, 330, 64);
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u0414\u043e\u0441\u044f\u0433\u043d\u0435\u043d\u043d\u044f \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u043e", W / 2, y - 12);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(t.title, W / 2, y + 5);
  ctx.fillStyle = "#cfe6ff";
  ctx.font = "10px sans-serif";
  const bottom = t.skinNames
    ? `\u041d\u043e\u0432\u0438\u0439 \u0441\u043a\u0456\u043d: ${t.skinNames}`
    : `\u0417\u0430\u0431\u0435\u0440\u0438 +${t.reward}\u20b4 \u0443 \u0434\u043e\u0441\u044f\u0433\u043d\u0435\u043d\u043d\u044f\u0445`;
  ctx.fillText(bottom, W / 2, y + 21);
  ctx.restore();
  t.timer--;
  if (t.timer <= 0) achievementToast = null;
}
function drawChaseBanner() {
  if (!chaseMode?.timer || gameState !== "run") return;
  const a = Math.min(1, chaseMode.intro / 24, chaseMode.timer / 34);
  const remain = Math.max(1, Math.ceil(chaseMode.timer / 60));
  ctx.save();
  ctx.globalAlpha = 0.94 * a;
  const pulse = 0.5 + Math.sin(fr * 0.26) * 0.5;
  ctx.fillStyle = `rgba(80, 8, 28, ${0.82 + pulse * 0.08})`;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(W / 2 - 130, 80, 260, 42, 8);
  else ctx.rect(W / 2 - 130, 80, 260, 42);
  ctx.fill();
  ctx.strokeStyle = "#ff69b4";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u0420\u0415\u0416\u0418\u041c \u041f\u041e\u0413\u041e\u041d\u0406", W / 2, 96);
  ctx.fillStyle = "#ffe6f2";
  ctx.font = "10px sans-serif";
  ctx.fillText(`\u0412\u0438\u0442\u0440\u0438\u043c\u0430\u0439 ${remain}\u0441 \u0456 \u043e\u0442\u0440\u0438\u043c\u0430\u0439 \u0431\u043e\u043d\u0443\u0441`, W / 2, 112);
  ctx.restore();
}
function drawRoadEventBanner() {
  if (!roadEvent?.timer || gameState !== "run") return;
  const a = Math.min(1, roadEvent.intro / 24, roadEvent.timer / 34);
  const title = getRoadEventTitle(roadEvent.type);
  const hint = getRoadEventHint(roadEvent.type);
  const x = W / 2;
  const y = currentLocation === 1 ? 132 : 44;
  ctx.save();
  ctx.globalAlpha = 0.92 * a;
  ctx.fillStyle = "rgba(10, 14, 28, 0.82)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - 154, y - 19, 308, 38, 8);
  else ctx.rect(x - 154, y - 19, 308, 38);
  ctx.fill();
  ctx.strokeStyle = isRoadEvent("kyiv_storm") ? "#8fd8ff" : "#ffd700";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, x, y - 3);
  ctx.fillStyle = "#cfe6ff";
  ctx.font = "10px sans-serif";
  ctx.fillText(hint, x, y + 12);
  ctx.restore();
}
function drawStormSkyOverlay() {
  if (!isStormWeather()) return;
  const storm = ctx.createLinearGradient(0, 0, 0, GND);
  storm.addColorStop(0, `rgba(9, 16, 30, ${0.5 + (getRainIntensity() - 1) * 0.16})`);
  storm.addColorStop(0.65, `rgba(17, 27, 42, ${0.32 + (getRainIntensity() - 1) * 0.12})`);
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
  for (let i = 0; i < 90 * getRainIntensity(); i++) {
    const x = (i * 53 + bgOff * 5.2) % (W + 120) - 60;
    const y = (i * 71 + fr * (16 + (getRainIntensity() - 1) * 6)) % (H + 80) - 50;
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
  const wasDone = getAchievementProgress(item) >= item.target;
  achievementStats[id] = Math.min(
    item.target,
    Math.max(0, Number(achievementStats[id]) || 0) + amount,
  );
  const isDone = getAchievementProgress(item) >= item.target;
  const unlockedSkins = syncAchievementSkins();
  if (!wasDone && isDone) {
    achievementSeen[id] = false;
    showAchievementToast(item, getAchievementReward(item), unlockedSkins);
  }
  if (unlockedSkins.length) saveGame();
  updateAchievementReadyBadge();
  const screen = document.getElementById("sAchievements");
  if (screen?.classList.contains("active")) buildAchievements();
}
function getReadyAchievementCount() {
  return ACHIEVEMENTS.filter((item) => {
    const done = getAchievementProgress(item) >= item.target;
    return done && !achievementRewards[item.id];
  }).length;
}
function getAchievementReward(item) {
  if (!item) return 0;
  if (item.id === "boss") return 200;
  if (item.id === "clean_chase" || item.id === "road_events3") return 150;
  return 100;
}
function isAchievementComplete(id) {
  const item = ACHIEVEMENTS.find((achievement) => achievement.id === id);
  return Boolean(item) && getAchievementProgress(item) >= item.target;
}
function syncAchievementSkins() {
  const unlocked = [];
  SKINS_BASE.forEach((skin) => {
    if (!skin.unlockAchievement || owned.includes(skin.id)) return;
    if (!isAchievementComplete(skin.unlockAchievement)) return;
    owned.push(skin.id);
    unlocked.push(skin);
  });
  return unlocked;
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
  const C = collectionText();
  list.innerHTML = "";
  let seenChanged = false;
  ACHIEVEMENTS.forEach((item) => {
    const progress = getAchievementProgress(item);
    const done = progress >= item.target;
    const claimed = Boolean(achievementRewards[item.id]);
    const reward = getAchievementReward(item);
    const isNew = done && !achievementSeen[item.id];
    const copy = getAchievementCopy(item);
    const newBadge = isNew ? '<span class="achievement-new">' + C.newBadge + '</span>' : "";
    const status = done
      ? claimed
        ? '<div class="achievement-status">' + C.claimed + '</div>'
        : '<button class="achievement-claim" data-achievement-id="' + item.id + '" type="button">' + C.claim + ' +' + reward + '\u20b4</button>'
      : '<div class="achievement-status">' + C.inProgress + '</div>';
    const card = document.createElement("article");
    card.className = "achievement-item" + (done ? " complete" : "") + (claimed ? " claimed" : "") + (isNew ? " new" : "");
    card.innerHTML =
      '<div class="achievement-icon">' + item.icon + '</div>' +
      '<div class="achievement-copy">' +
        '<div class="achievement-title">' + copy.title + newBadge + '</div>' +
        '<div class="achievement-desc">' + copy.desc + '</div>' +
        '<div class="achievement-progress">' +
          '<div class="achievement-progress-fill" style="width:' + ((progress / item.target) * 100) + '%"></div>' +
        '</div>' +
        '<div class="achievement-count">' + progress + ' / ' + item.target + '</div>' +
      '</div>' +
      status;
    list.appendChild(card);
    if (isNew) {
      achievementSeen[item.id] = true;
      seenChanged = true;
    }
  });
  if (seenChanged) saveGame();
  updateAchievementReadyBadge();
}

function buildCollection() {
  const list = document.getElementById("collectionList");
  const count = document.getElementById("collectionCount");
  if (!list) return;
  refreshCollectionHeader();
  const C = collectionText();
  list.innerHTML = "";
  const opened = CITY_POSTCARDS.filter((card) => postcards[card.id]).length;
  if (count) count.textContent = opened + "/" + CITY_POSTCARDS.length;
  const rewards = document.createElement("section");
  rewards.className = "collection-rewards";
  COLLECTION_REWARDS.forEach((reward) => {
    const progress = reward.ids.filter((id) => postcards[id]).length;
    const ready = progress >= reward.ids.length;
    const claimed = Boolean(collectionRewards[reward.id]);
    const copy = getCollectionRewardCopy(reward);
    const rewardItem = document.createElement("article");
    rewardItem.className =
      "collection-reward" +
      (ready ? " ready" : "") +
      (claimed ? " claimed" : "");
    rewardItem.innerHTML =
      '<div>' +
        '<div class="collection-reward-title">' + copy.title + '</div>' +
        '<div class="collection-reward-desc">' + copy.desc + '</div>' +
        '<div class="collection-reward-progress">' + progress + '/' + reward.ids.length + ' · +' + reward.coins + '₴' + (reward.skinId ? ' · ' + C.skin : '') + '</div>' +
      '</div>' +
      '<button class="collection-claim" data-reward-id="' + reward.id + '" type="button" ' + (!ready || claimed ? "disabled" : "") + '>' +
        (claimed ? C.claimed : C.claim) +
      '</button>';
    rewards.appendChild(rewardItem);
  });
  list.appendChild(rewards);
  CITY_POSTCARDS.forEach((card) => {
    const unlocked = Boolean(postcards[card.id]);
    const copy = getPostcardCopy(card);
    const item = document.createElement("article");
    item.className = "collection-card " + (unlocked ? "unlocked" : "locked");
    if (unlocked) {
      item.dataset.cardId = card.id;
      item.type = "button";
      item.tabIndex = 0;
    }
    item.innerHTML =
      '<div class="collection-art" style="color:' + card.color + '">' + (unlocked ? card.icon : "?") + '</div>' +
      '<div class="collection-info">' +
        '<div class="collection-title">' + (unlocked ? copy.title : C.unknownPostcard) + '</div>' +
        '<div class="collection-desc">' + (unlocked ? copy.desc : C.lockedPostcard) + '</div>' +
      '</div>';
    list.appendChild(item);
  });
}

function openPostcardViewer(cardId) {
  const card = CITY_POSTCARDS.find((entry) => entry.id === cardId);
  if (!card || !postcards[card.id]) return;
  const viewer = document.getElementById("postcardViewer");
  const art = document.getElementById("postcardViewerArt");
  const city = document.getElementById("postcardViewerCity");
  const title = document.getElementById("postcardViewerTitle");
  const desc = document.getElementById("postcardViewerDesc");
  if (!viewer || !art || !city || !title || !desc) return;
  const cityLabel =
    card.loc === 0
      ? (LOCATION_NAMES[lang]?.[0] || "Kyiv").replace(/^\S+\s*/, "")
      : card.loc === 1
        ? (LOCATION_NAMES[lang]?.[1] || "Lviv").replace(/^\S+\s*/, "")
        : collectionText().finish;
  const copy = getPostcardCopy(card);
  art.textContent = card.icon;
  art.style.setProperty("--postcard-color", card.color);
  city.textContent = cityLabel;
  title.textContent = copy.title;
  desc.textContent = copy.desc;
  viewer.classList.add("active");
  viewer.setAttribute("aria-hidden", "false");
}

function closePostcardViewer() {
  const viewer = document.getElementById("postcardViewer");
  if (!viewer) return;
  viewer.classList.remove("active");
  viewer.setAttribute("aria-hidden", "true");
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
  syncMarichkaChainProgress();
  list.innerHTML = "";
  const chainStep = getActiveMarichkaChainStep();
  const chainCard = document.createElement("article");
  const chainDone = marichkaChainStep >= MARICHKA_CHAIN.length;
  const chainProgress = chainStep
    ? Math.min(chainStep.target, Math.floor(Number(marichkaChainStats[chainStep.id]) || 0))
    : MARICHKA_CHAIN.length;
  const chainReady = Boolean(chainStep && chainProgress >= chainStep.target);
  const chainUnit = chainStep?.unit ? ` ${chainStep.unit}` : "";
  chainCard.className =
    "quest-chain" + (chainDone ? " claimed" : chainReady ? " complete" : "");
  chainCard.innerHTML = chainDone
    ? `
      <div class="quest-chain-kicker">Ланцюжок Марічки</div>
      <div class="quest-chain-title">Уся історія завершена</div>
      <div class="quest-chain-desc">Марічка допомогла Андрію дістатися до школи.</div>
      <div class="quest-chain-steps">${MARICHKA_CHAIN.map(() => `<span class="done"></span>`).join("")}</div>
    `
    : `
      <div class="quest-chain-kicker">Ланцюжок Марічки · крок ${marichkaChainStep + 1}/${MARICHKA_CHAIN.length}</div>
      <div class="quest-chain-title">${chainStep.title}</div>
      <div class="quest-chain-desc">Виконай крок, забери нагороду і відкрий наступну частину історії.</div>
      <div class="quest-progress">
        <div class="quest-progress-fill" style="width:${(chainProgress / chainStep.target) * 100}%"></div>
      </div>
      <div class="quest-item-footer">
        <span class="quest-reward">+${MARICHKA_CHAIN_REWARD} ₴</span>
        <span class="quest-item-count">${chainProgress} / ${chainStep.target}${chainUnit}</span>
        <button class="quest-claim quest-chain-claim" data-chain-step="${chainStep.id}" type="button" ${!chainReady ? "disabled" : ""}>
          ${chainReady ? "Забрати" : "В процесі"}
        </button>
      </div>
      <div class="quest-chain-steps">${MARICHKA_CHAIN.map((_, index) => `<span class="${index < marichkaChainStep ? "done" : index === marichkaChainStep ? "active" : ""}"></span>`).join("")}</div>
    `;
  list.appendChild(chainCard);
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
function handleAppGesture(event) {
  focusApp();
  unlockGameAudio();
  const uiPressed = event?.target?.closest?.(
    "button,a,input,select,textarea,.lvl-btn,.loc-tab,.seg-btn,.sitem,.backpack-buy,.quest-claim,.achievement-claim,.collection-claim,.collection-card,.postcard-viewer-close",
  );
  const introScreen = document.getElementById("sIntro");
  const introActive = introScreen?.classList.contains("active");
  const skipPressed = event?.target?.closest?.("#introSkip");
  if (introActive && !skipPressed) {
    beginIntroAfterGesture();
    return;
  }
  if (uiPressed) return;
  act("AppGesture");
}
const appRoot = document.getElementById("app");
appRoot.addEventListener("pointerdown", handleAppGesture, { passive: true });
appRoot.addEventListener("click", handleAppGesture, { passive: true });
appRoot.addEventListener("touchstart", handleAppGesture, { passive: true });
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
    const levelName = lvNames[i] || "";
    btn.title = levelName;
    btn.innerHTML = `<span>${done ? "✓" : locked ? "🔒" : i + 1}</span><span class="lvl-btn-name">${levelName}</span>`;
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


const ENABLE_DEBUG_MENU = false;

function buildDebugLevelBar() {
  const bar = document.getElementById("debugLevelBar");
  if (!bar) return;
  bar.innerHTML = "";
  const cityLabels = ["\u041a\u0438\u0457\u0432", "\u041b\u044c\u0432\u0456\u0432"];
  [LEVELS_KYIV, LEVELS_LVIV].forEach((levels, loc) => {
    const city = document.createElement("div");
    city.className = "debug-level-city";
    city.textContent = cityLabels[loc];
    bar.appendChild(city);
    levels.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "debug-level-btn";
      btn.textContent = String(i + 1);
      btn.title = cityLabels[loc] + " - \u0440\u0456\u0432\u0435\u043d\u044c " + (i + 1);
      btn.onclick = () => startDebugScenario(loc, i, "start");

      bar.appendChild(btn);
    });
  });
}

function setMultiplayerMode(enabled) {
  multiplayerMode = Boolean(enabled);
  document.getElementById("sGame")?.classList.toggle("multiplayer-active", multiplayerMode);
}

function startDebugScenario(loc, level, mode = "start") {
  focusApp();
  currentLocation = loc;
  currentLevel = Math.min(Math.max(Number(level) || 0, 0), getLevels().length - 1);
  marichkaProjectSceneSeen = true;
  tckSceneSeenLevels[currentLocation + ":" + currentLevel] = true;
  showScreen("sGame");
  startLevel();
  if (gameState === "missionIntro") beginLevelRun();
  if (mode !== "start") {
    secretRoute = null;
    obs = [];
    coins = [];
    bullets = [];
    playerBullets = [];
    chaserX = -140;
  }
  if (mode === "finish") {
    bossDefeated = true;
    totalDist = Math.max(0, getFinishDistance() - FINISH_APPROACH_DISTANCE - 4);
    showAndriiBubble("���� ������");
  } else if (mode === "boss") {
    totalDist = Math.max(0, getFinishDistance() - 245);
    bossActive = false;
    bossDefeated = false;
    showAndriiBubble("���� ����");
  } else if (mode === "tram") {
    totalDist = Math.min(160, Math.max(0, getFinishDistance() * 0.28));
    showAndriiBubble("���� �������");
  } else if (mode === "weapon") {
    totalDist = 130;
    showAndriiBubble("���� ����");
    updateFireControl();
  }
  hudUp();
  saveGame();
}

function buildDebugPresetBar() {
  const bar = document.getElementById("debugPresetBar");
  if (!bar) return;
  bar.innerHTML = "";
  const presets = [
    { label: "Գ���", loc: currentLocation, level: currentLevel, mode: "finish" },
    { label: "��� ���", loc: 0, level: LEVELS_KYIV.length - 1, mode: "boss" },
    { label: "�������", loc: 1, level: 2, mode: "tram" },
    { label: "�����", loc: 1, level: 2, mode: "weapon" },
  ];
  presets.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "debug-preset-btn";
    btn.textContent = preset.label;
    btn.onclick = () => startDebugScenario(preset.loc, preset.level, preset.mode);
    bar.appendChild(btn);
  });
}
function applyLang() {
  const L = t();
  document.getElementById("menuSub").textContent = L.sub;
  document.getElementById("btnPlay").textContent = L.play;
  document.getElementById("btnShopOpen").textContent = L.shop;
  document.getElementById("btnBackpackOpen").textContent = L.backpack;
  document.getElementById("btnMultiplayer")?.replaceChildren(document.createTextNode(L.multiplayer));
  document.getElementById("btnTutorialOpen")?.setAttribute("title", L.tutorial);
  document.getElementById("btnSettingsOpen")?.setAttribute("title", L.settingsShort);
  document.getElementById("btnQuestsOpen")?.setAttribute("title", L.quests);
  document.getElementById("btnAchievementsOpen")?.setAttribute("title", L.achievements);
  document.getElementById("btnCollectionOpen")?.setAttribute("title", L.collection);
  const timeBadge = document.getElementById("menuTimeBadge");
  if (timeBadge) timeBadge.textContent = settingTimeOfDay === "night" ? L.timeNight : L.timeDay;
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
  document.getElementById("cBonus").textContent = L.bonus;
  document.getElementById("btnPause")?.replaceChildren(document.createTextNode(L.pause));
  document.getElementById("btnPauseHud")?.replaceChildren(document.createTextNode(L.pause));
  document.getElementById("playerOneTitle")?.replaceChildren(document.createTextNode(L.player1));
  document.getElementById("playerTwoTitle")?.replaceChildren(document.createTextNode(L.player2));
  document.getElementById("playerOneHint")?.replaceChildren(document.createTextNode(L.player1Hint || "A/D · W/Space · S"));
  document.getElementById("playerTwoHint")?.replaceChildren(document.createTextNode(L.player2Hint || "↑ jump · ↓ slide"));
  document.getElementById("btnRetryRun")?.replaceChildren(document.createTextNode(L.retry));
  document.getElementById("btnNextRun")?.replaceChildren(document.createTextNode(L.next));
  document.getElementById("btnEndMenu")?.replaceChildren(document.createTextNode(L.toMenu));
  updateFireControl();
  document
    .querySelectorAll(".lbtn")
    .forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  buildLevelBar();
  if (ENABLE_DEBUG_MENU) {
    buildDebugLevelBar();
    buildDebugPresetBar();
  }
  buildShop();
  buildSettings();
  refreshCollectionHeader();
  if (document.getElementById("sCollection")?.classList.contains("active")) buildCollection();
  if (document.getElementById("sAchievements")?.classList.contains("active")) buildAchievements();
  window.dispatchEvent(new CustomEvent("kyiv-runner:language-changed", { detail: { lang } }));
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
    settingMusicTrack === "march"
      ? getMarchLyrics()[0]
      : settingMusicTrack === "rain"
        ? getRainLyrics()[0]
        : L.descSound;
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
  if (id !== "sGame") updateEndPanel();
  updatePausePanel();
  if (id === "sMenu") {
    document.getElementById("sMenu")?.classList.add("menu-appearing");
    updateQuestReadyBadge();
    updateAchievementReadyBadge();
  }
  if (id === "sQuests") buildQuests();
  if (id === "sAchievements") buildAchievements();
  if (id === "sCollection") buildCollection();
  if (id === "sBackpack") buildBackpack();
  if (settingSound) {
    if (id === "sMenu" || id === "sGame") {
      startMusic();
    } else {
      stopMusic();
    }
  }
}
function updateEndPanel() {
  const panel = document.getElementById("endPanel");
  if (!panel) return;
  const title = document.getElementById("endPanelTitle");
  const stats = document.getElementById("endPanelStats");
  const retry = document.getElementById("btnRetryRun");
  const next = document.getElementById("btnNextRun");
  const menu = document.getElementById("btnEndMenu");
  const isOver = gameState === "over";
  const isClear = gameState === "levelClear";
  const isWin = gameState === "win";
  const L = t();
  const active = isOver || isClear || isWin;
  panel.classList.toggle("active", active);
  if (!active) return;
  const levelName = getLevelNames(currentLocation, lang)[getPlayableLevel(currentLevel)] || "";
  const scoreLine = `${score} ${t().pts || "\u043e\u0447\u043e\u043a"} В· ${runCoins} \u043c\u043e\u043d\u0435\u0442`;
  if (title) {
    title.textContent = isOver
      ? "\u0421\u043f\u0440\u043e\u0431\u0443\u0439 \u0449\u0435 \u0440\u0430\u0437"
      : isWin
        ? "\u0424\u0456\u043d\u0456\u0448!"
        : "\u0420\u0456\u0432\u0435\u043d\u044c \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043e!";
  }
  if (stats) {
    stats.textContent = `${scoreLine} В· ${t().levelLabel || "\u0420\u0456\u0432\u0435\u043d\u044c"} ${getPlayableLevel(currentLevel) + 1} ${levelName}`;
  }
  if (retry) {
    retry.hidden = isClear;
    retry.textContent = isWin
      ? "\u041f\u043e\u0447\u0430\u0442\u0438 \u0437\u043d\u043e\u0432\u0443"
      : "\u0429\u0435 \u0440\u0430\u0437";
  }
  if (next) {
    next.hidden = !isClear;
    next.textContent = "\u0414\u0430\u043b\u0456";
  }
  if (menu) menu.textContent = L.toMenu;
  if (title) title.textContent = isOver ? L.restartRun : isWin ? L.win : L.levelClear;
  if (retry) retry.textContent = isWin ? L.restartRun : L.retry;
  if (next) next.textContent = L.next;
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

function drawMarichkaPreview(c, cx, by) {
  c.save();
  c.fillStyle = "rgba(0,0,0,0.22)";
  c.beginPath();
  c.ellipse(cx, by + 1, 14, 4, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f0d0a8";
  c.fillRect(cx - 8, by - 14, 6, 14);
  c.fillRect(cx + 2, by - 14, 6, 14);
  c.fillStyle = "#ffd23f";
  c.fillRect(cx - 9, by - 1, 9, 4);
  c.fillRect(cx, by - 1, 9, 4);
  c.fillStyle = "#ffe45c";
  c.beginPath();
  c.moveTo(cx - 16, by - 15);
  c.lineTo(cx - 11, by - 42);
  c.quadraticCurveTo(cx, by - 49, cx + 11, by - 42);
  c.lineTo(cx + 16, by - 15);
  c.closePath();
  c.fill();
  c.strokeStyle = "#1f5b8f";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx, by - 47);
  c.lineTo(cx, by - 18);
  c.moveTo(cx - 10, by - 39);
  c.lineTo(cx + 10, by - 39);
  c.stroke();
  c.fillStyle = "#1f5b8f";
  c.beginPath();
  if (c.roundRect) c.roundRect(cx - 11, by - 57, 22, 18, 4);
  else c.rect(cx - 11, by - 57, 22, 18);
  c.fill();
  c.strokeStyle = "#f0d0a8";
  c.lineWidth = 4;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(cx - 10, by - 52);
  c.lineTo(cx - 19, by - 35);
  c.moveTo(cx + 10, by - 52);
  c.lineTo(cx + 19, by - 35);
  c.stroke();
  c.fillStyle = "#f0d0a8";
  c.beginPath();
  c.arc(cx, by - 69, 12, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#3a1a0a";
  c.beginPath();
  c.arc(cx, by - 76, 13, Math.PI, 0);
  c.fill();
  c.strokeStyle = "#3a1a0a";
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(cx - 11, by - 73);
  c.quadraticCurveTo(cx - 20, by - 57, cx - 16, by - 40);
  c.moveTo(cx + 11, by - 73);
  c.quadraticCurveTo(cx + 20, by - 57, cx + 16, by - 40);
  c.stroke();
  [[-13,-82,"#0057b7"],[-6,-85,"#ffd700"],[2,-84,"#0057b7"],[10,-82,"#ffd700"]].forEach(([fx, fy, col]) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(cx + fx, by + fy, 4, 0, Math.PI * 2);
    c.fill();
  });
  c.fillStyle = "#263238";
  c.beginPath();
  c.arc(cx - 4, by - 70, 1.6, 0, Math.PI * 2);
  c.arc(cx + 4, by - 70, 1.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
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
  if (sk.id === "marichka") {
    drawMarichkaPreview(c, cx, by);
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

  if (sk.id === "chase_master") {
    c.strokeStyle = "#ffd14a";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 10, by - 42);
    c.lineTo(cx + 10, by - 28);
    c.moveTo(cx + 10, by - 42);
    c.lineTo(cx - 10, by - 28);
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
  } else if (sk.id === "chase_master") {
    c.fillStyle = sk.hat;
    c.beginPath();
    c.arc(cx, by - 62, 13, Math.PI, 0);
    c.fill();
    c.fillStyle = "#ff4fa3";
    c.fillRect(cx - 10, by - 60, 20, 3);
    c.fillStyle = "#ffd14a";
    c.fillRect(cx + 6, by - 66, 10, 3);
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
function getPlayerUpgradeEffectText(id, level) {
  const safeLevel = Math.max(0, Math.min(3, Number(level) || 0));
  if (id === "speed") return "+" + Math.round(safeLevel * 4) + "% \u0448\u0432\u0438\u0434\u043a\u0456\u0441\u0442\u044c";
  if (id === "jump") return "+" + safeLevel + " \u0441\u0438\u043b\u0430 \u0441\u0442\u0440\u0438\u0431\u043a\u0430";
  if (id === "weapon") return "+" + safeLevel + " \u0443\u0440\u043e\u043d \u0456 \u0448\u0432\u0438\u0434\u043a\u0456\u0441\u0442\u044c \u043a\u0443\u043b\u044c";
  if (id === "defense") return safeLevel >= 3 ? "2 \u0437\u0430\u0440\u044f\u0434\u0438 \u0449\u0438\u0442\u0430" : safeLevel >= 2 ? "1 \u0437\u0430\u0440\u044f\u0434 \u0449\u0438\u0442\u0430" : "\u0449\u0438\u0442 \u043d\u0430 \u0441\u0442\u0430\u0440\u0442\u0456";
  return "\u041f\u043e\u043a\u0440\u0430\u0449\u0435\u043d\u043d\u044f";
}

function getWeaponUpgradeEffectText(id) {
  if (id === "fireRate") return "\u041c\u0456\u043d\u0456\u0433\u0430\u043d \u0441\u0442\u0440\u0456\u043b\u044f\u0454 \u0447\u0430\u0441\u0442\u0456\u0448\u0435";
  if (id === "damage") return "\u0411\u0456\u043b\u044c\u0448\u0435 \u0443\u0440\u043e\u043d\u0443 \u0431\u043e\u0441\u0430\u043c";
  if (id === "laser") return "\u0414\u043e\u0434\u0430\u0454 \u043b\u0430\u0437\u0435\u0440\u043d\u0438\u0439 \u043f\u043e\u0441\u0442\u0440\u0456\u043b";
  return "\u041f\u043e\u043a\u0440\u0430\u0449\u0435\u043d\u043d\u044f \u0437\u0431\u0440\u043e\u0457";
}

function appendUpgradeMeter(parent, level, max) {
  const meter = document.createElement("div");
  meter.className = "upgrade-meter";
  for (let i = 0; i < max; i++) {
    const dot = document.createElement("span");
    if (i < level) dot.className = "filled";
    meter.appendChild(dot);
  }
  parent.appendChild(meter);
}

function appendUpgradeAction(parent, text, disabled = false) {
  const action = document.createElement("div");
  action.className = "upgrade-action" + (disabled ? " disabled" : "");
  action.textContent = text;
  parent.appendChild(action);
}

function buildShop() {
  const L = t(),
    grid = document.getElementById("shopGrid");
  if (syncAchievementSkins().length) saveGame();
  grid.innerHTML = "";
  SKINS_BASE.forEach((sk, i) => {
    const unlockedByAchievement = !sk.unlockAchievement || isAchievementComplete(sk.unlockAchievement);
    const lockedByAchievement = Boolean(sk.unlockAchievement) && !unlockedByAchievement;
    const div = document.createElement("div");
    div.className =
      "sitem" +
      (sk.exclusive ? " exclusive" : "") +
      (lockedByAchievement ? " locked" : "") +
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
      badge.textContent = lockedByAchievement ? "\u041d\u0410\u0413\u041e\u0420\u041e\u0414\u0410" : "\u0415\u041a\u0421\u041a\u041b\u042e\u0417\u0418\u0412";
      div.appendChild(badge);
    }
    const pr = document.createElement("div");
    if (lockedByAchievement) {
      pr.className = "sitem-price locked";
      pr.textContent = "\u0412\u0456\u0434\u043a\u0440\u0438\u0439: \u0427\u0438\u0441\u0442\u0430 \u0432\u0442\u0435\u0447\u0430";
    } else if (selectedSkin === sk.id) {
      pr.className = "sitem-owned";
      pr.textContent = L.owned;
    } else if (owned.includes(sk.id)) {
      pr.className = "sitem-owned";
      pr.textContent = L.equip;
    } else {
      pr.className = "sitem-price";
      pr.textContent = sk.price + "\u20b4";
    }
    div.appendChild(cv2);
    div.appendChild(nm);
    div.appendChild(pr);
    div.onclick = () => {
      if (lockedByAchievement) return;
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
    div.className =
      "sitem upgrade" +
      (maxed ? " owned" : totalCoins >= price ? " affordable" : " locked");
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
    lvl.className = "sitem-desc upgrade-effect";
    lvl.textContent = getPlayerUpgradeEffectText(upgrade.id, level);
    const pr = document.createElement("div");
    pr.className = maxed ? "sitem-owned" : totalCoins >= price ? "sitem-price" : "sitem-price locked";
    pr.textContent = maxed ? "\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c" : price + "\u20b4";
    div.appendChild(icon);
    div.appendChild(nm);
    div.appendChild(desc);
    div.appendChild(lvl);
    appendUpgradeMeter(div, level, upgrade.prices.length);
    div.appendChild(pr);
    appendUpgradeAction(
      div,
      maxed ? "\u0413\u043e\u0442\u043e\u0432\u043e" : totalCoins >= price ? "\u041a\u0443\u043f\u0438\u0442\u0438" : "\u041d\u0435 \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454",
      maxed || totalCoins < price,
    );
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
    div.className =
      "sitem upgrade" +
      (bought ? " owned" : totalCoins >= upgrade.price ? " affordable" : " locked");
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
    const effect = document.createElement("div");
    effect.className = "sitem-desc upgrade-effect";
    effect.textContent = getWeaponUpgradeEffectText(upgrade.id);
    const pr = document.createElement("div");
    pr.className = bought ? "sitem-owned" : totalCoins >= upgrade.price ? "sitem-price" : "sitem-price locked";
    pr.textContent = bought ? "\u041a\u0443\u043f\u043b\u0435\u043d\u043e" : upgrade.price + "\u20b4";
    div.appendChild(icon);
    div.appendChild(nm);
    div.appendChild(desc);
    div.appendChild(effect);
    appendUpgradeMeter(div, bought ? 1 : 0, 1);
    div.appendChild(pr);
    appendUpgradeAction(
      div,
      bought ? "\u0413\u043e\u0442\u043e\u0432\u043e" : totalCoins >= upgrade.price ? "\u041a\u0443\u043f\u0438\u0442\u0438" : "\u041d\u0435 \u0432\u0438\u0441\u0442\u0430\u0447\u0430\u0454",
      bought || totalCoins < upgrade.price,
    );
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
  setMultiplayerMode(false);
  // Продовжити з останнього збереженого рівня
  currentLevel = getPlayableLevel(
    currentLocation === 0 ? progressKyiv : progressLviv,
  );
  showScreen("sGame");
  startLevel();
};
document.getElementById("btnMultiplayer")?.addEventListener("click", () => {
  focusApp();
  setMultiplayerMode(true);
  currentLevel = getPlayableLevel(
    currentLocation === 0 ? progressKyiv : progressLviv,
  );
  showScreen("sGame");
  startLevel();
});
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
document.getElementById("btnCollectionOpen").onclick = () => {
  buildCollection();
  showScreen("sCollection");
};
document.getElementById("btnBackAchievements").onclick = () => {
  saveGame();
  syncCoins();
  showScreen("sMenu");
};
document.getElementById("achievementList").onclick = (event) => {
  const button = event.target.closest(".achievement-claim");
  if (!button) return;
  const item = ACHIEVEMENTS.find((achievement) => achievement.id === button.dataset.achievementId);
  if (!item || achievementRewards[item.id] || getAchievementProgress(item) < item.target) return;
  const reward = getAchievementReward(item);
  achievementRewards[item.id] = true;
  totalCoins += reward;
  syncCoins();
  saveGame();
  buildAchievements();
  sfxCoin();
};
document.getElementById("btnBackCollection").onclick = () => {
  saveGame();
  syncCoins();
  showScreen("sMenu");
};
document.getElementById("collectionList").onclick = (event) => {
  const button = event.target.closest(".collection-claim");
  if (button) {
    const reward = COLLECTION_REWARDS.find(
      (item) => item.id === button.dataset.rewardId,
    );
    if (!reward || collectionRewards[reward.id]) return;
    const ready = reward.ids.every((id) => postcards[id]);
    if (!ready) return;
    collectionRewards[reward.id] = true;
    totalCoins += reward.coins;
    if (reward.skinId && VALID_SKIN_IDS.has(reward.skinId) && !owned.includes(reward.skinId)) {
      owned.push(reward.skinId);
    }
    syncCoins();
    saveGame();
    sfxCoin();
    buildCollection();
    return;
  }
  const card = event.target.closest(".collection-card.unlocked");
  if (card?.dataset.cardId) openPostcardViewer(card.dataset.cardId);
};
document.getElementById("btnClosePostcard").onclick = closePostcardViewer;
document.getElementById("postcardViewer").onclick = (event) => {
  if (event.target.id === "postcardViewer") closePostcardViewer();
};
document.getElementById("btnBackQuests").onclick = () => {
  saveGame();
  syncCoins();
  showScreen("sMenu");
};
document.getElementById("questList").onclick = (event) => {
  const button = event.target.closest(".quest-claim");
  if (!button) return;
  if (button.dataset.chainStep) {
    const step = getActiveMarichkaChainStep();
    if (
      !step ||
      step.id !== button.dataset.chainStep ||
      (Number(marichkaChainStats[step.id]) || 0) < step.target
    )
      return;
    totalCoins += MARICHKA_CHAIN_REWARD;
    marichkaChainStep = Math.min(MARICHKA_CHAIN.length, marichkaChainStep + 1);
    syncCoins();
    saveGame();
    buildQuests();
    sfxCoin();
    return;
  }
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

const btnPause = document.getElementById("btnPause");
if (btnPause) {
  btnPause.onclick = (e) => {
    e.stopPropagation();
    togglePause();
  };
}
const btnPauseHud = document.getElementById("btnPauseHud");
if (btnPauseHud) {
  btnPauseHud.onclick = (e) => {
    e.stopPropagation();
    togglePause();
  };
}
const btnResume = document.getElementById("btnResume");
if (btnResume) {
  btnResume.onclick = (e) => {
    e.stopPropagation();
    unpauseGame();
  };
}
const btnRestart = document.getElementById("btnRestart");
if (btnRestart) {
  btnRestart.onclick = (e) => {
    e.stopPropagation();
    gameState = "run";
    restartLevel();
    updatePausePanel();
  };
}
const btnPauseMenu = document.getElementById("btnPauseMenu");
if (btnPauseMenu) {
  btnPauseMenu.onclick = (e) => {
    e.stopPropagation();
    stopGame();
    showScreen("sMenu");
    syncCoins();
    saveGame();
    buildLevelBar();
    updatePausePanel();
  };
}
document.getElementById("btnRetryRun").onclick = (event) => {
  event.stopPropagation();
  if (gameState === "win") restartCompletedRun();
  else restartLevel();
};
document.getElementById("btnNextRun").onclick = (event) => {
  event.stopPropagation();
  if (gameState === "levelClear") nextLevel();
};
document.getElementById("btnEndMenu").onclick = (event) => {
  event.stopPropagation();
  stopGame();
  showScreen("sMenu");
  syncCoins();
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
  const playerTwoKey =
    multiplayerMode &&
    Boolean(document.getElementById("gameCanvas2")) &&
    (e.code === "ArrowUp" || e.code === "ArrowDown");
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
      "KeyW",
      "KeyS",
      "KeyF",
      "KeyE",
      "Escape",
      "KeyP",
    ].includes(e.code)
  )
    e.preventDefault();
  if (playerTwoKey) return;
  const oneShotAction = e.code === "KeyF" || e.code === "KeyE" || e.code === "Escape" || e.code === "KeyP";
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
  if (c === "Escape" || c === "KeyP") {
    if (gameState === "run" || gameState === "paused") {
      togglePause();
      return;
    }
  }
  if (gameState === "story") {
    skipStoryScene();
    return;
  }
  if (gameState === "over") {
    restartLevel();
    return;
  }
  if (gameState === "win") {
    restartCompletedRun();
    return;
  }
  if (gameState === "levelClear") {
    if (levelClearTimer > LEVEL_CLEAR_INPUT_DELAY) {
      nextLevel();
      return;
    }
    return;
  }
  if (gameState === "missionIntro") {
    beginLevelRun();
    return;
  }
  if (gameState !== "run") return;
  if (secretRoute && secretRoute.entering) return;
  if ((c === "ArrowUp" || c === "Space" || c === "KeyW") && pY >= GND - 2) {
    pVY = getJumpPower();
    noteTrick("jump");
    addQuestProgress("jumps");
    sfxJump();
  }
  if (c === "ArrowDown" || c === "KeyS") {
    if (tryEnterSecretRoute()) return;
    pSlide = true;
    slideT = PLAYER_SLIDE_FRAMES;
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

function isMinigunDestroyable(o) {
  if (o.type === "tck" || o.type === "scooter") return true;
  return currentLocation === 1 && !isRoadHazard(o.type) && o.type !== "boss_dancer";
}

function hitMinigunTargets() {
  const maxRange = 430 + getBulletSpeedBonus() * 18;
  const muzzleX = LANES[pLane] + 24;
  let destroyed = 0;
  obs = obs.filter((o) => {
    if (destroyed >= 6) return true;
    if (!isMinigunDestroyable(o)) return true;
    if (Math.abs(o.lane - pLane) > 1) return true;
    const rect = oRect(o);
    const targetX = rect.x + rect.w / 2;
    if (targetX < muzzleX - 90 || targetX > muzzleX + maxRange) return true;
    destroyed++;
    if (o.type === "tck" || o.type === "scooter") addQuestProgress("enemies");
    addParts(targetX, rect.y + rect.h / 2, o.type === "tck" ? "#ffd700" : "#58d7ff");
    sfxHit();
    return false;
  });
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
    const spreadLanes = [
      pLane,
      Math.max(0, pLane - 1),
      Math.min(2, pLane + 1),
    ];
    for (let i = 0; i < 9; i++) {
      playerBullets.push({
        x: x + i * 8,
        y: y - 4 + (i % 3) * 3,
        prevX: x + i * 8,
        lane: spreadLanes[i % spreadLanes.length],
        vx: 13.5 + speedBonus + i * 0.7,
        life: 50,
        type: "minigun",
      });
    }
    hitMinigunTargets();
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

function prepareNextLevelTransition() {
  spd = 0;
  levelClearTimer = 0;
  schoolEnterTimer = 0;
  schoolExitTimer = 0;
  schoolWalkTimer = 0;
  schoolDialogueStep = 0;
  schoolDialogueDone = false;
  pSlide = false;
  slideT = 0;
}

function nextLevel() {
  prepareNextLevelTransition();
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
  }
  startVoiceTimer = null;
  if (levelIntroTimer) {
    clearTimeout(levelIntroTimer);
  }
  levelIntroTimer = null;
  robotRadioCooldown = 0;
  roadEvent = null;
  roadEventCooldown = 260;
  chaseMode = null;
  chaseCooldown = 360;
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
  spd = getLevelStartSpeed(lv);
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
  coffeeTimer = 0;
  rescueBusTimer = 0;
  superJumpTimer = 0;
  shieldCharges = getStartingShieldCharges();
  fillBackpackFromInventory();
  obs = [];
  coins = [];
  magnets = [];
  chestnuts = [];
  coffees = [];
  rescueBuses = [];
  shields = [];
  superJumps = [];
  cityGifts = [];
  postcardItems = [];
  parts = [];
  confetti = [];
  bullets = [];
  playerBullets = [];
  fireCooldown = 0;
  lastRoadHazardSpawnFrame = -9999;
  bgOff = 0;
  lightningFlash = 0;
  nextLightning = 160 + ((Math.random() * 180) | 0);
  chaserX = -100;
  inv = 0;
  flash = 0;
  finishX = 9999;
  finishActive = false;
  schoolBellActive = false;
  schoolBellTimer = 0;
  schoolBellRewardEarned = false;
  schoolBellRewardClaimed = false;
  schoolBellWarningSpoken = false;
  schoolEnterTimer = 0;
  schoolDialogueStep = 0;
  schoolDialogueDone = false;
  schoolExitTimer = 0;
  schoolWalkTimer = 0;
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
  resetLevelMissions();
  winTimer = 0;
  levelClearTimer = 0;
  levelCompleteLocked = false;
  andriiFirstObs = false;
  andriiCooldown = 0;
  bubbleText = "";
  bubbleTimer = 0;
  const autoRunLevelIntro = shouldAutoRunLevelIntro();
  gameState = autoRunLevelIntro ? "run" : "missionIntro";
  saveGame();
  updateFireControl();
  hudUp();
  if (!loopActive) {
    if (raf) cancelAnimationFrame(raf);
    loop();
  }
  if (autoRunLevelIntro) {
    spd = getLevelStartSpeed(lv);
    setTimeout(() => robotRadio("radioStart", 460), 600);
    return;
  }
  levelIntroTimer = setTimeout(() => {
    levelIntroTimer = null;
    if (gameState === "missionIntro") beginLevelRun();
  }, 1400);
  // Андрій кричить на старті з затримкою
}

function beginLevelRun() {
  if (gameState !== "missionIntro") return;
  if (levelIntroTimer) {
    clearTimeout(levelIntroTimer);
    levelIntroTimer = null;
  }
  focusApp();
  gameState = "run";
  startVoiceTimer = setTimeout(() => {
    startVoiceTimer = null;
    if (gameState === "run") speakAndrii(ANDRII_START);
  }, 800);
  setTimeout(() => robotRadio("radioStart", 460), 1700);
}

function restartLevel() {
  showScreen("sGame");
  startLevel();
}

function restartCompletedRun() {
  stopGame();
  currentLevel = 0;
  showScreen("sGame");
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
  loopActive = false;
  tckScene = null;
  cancelSpeech();
  if (startVoiceTimer) {
    clearTimeout(startVoiceTimer);
    startVoiceTimer = null;
  }
  if (levelIntroTimer) {
    clearTimeout(levelIntroTimer);
    levelIntroTimer = null;
  }
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
  updatePausePanel();
}

function togglePause() {
  if (gameState === "run") {
    gameState = "paused";
    if (settingSound) stopMusic();
  } else if (gameState === "paused") {
    gameState = "run";
    if (settingSound) startMusic();
  }
  updatePausePanel();
}

function pauseGame() {
  if (gameState === "run") {
    gameState = "paused";
    if (settingSound) stopMusic();
    updatePausePanel();
  }
}

function unpauseGame() {
  if (gameState === "paused") {
    gameState = "run";
    if (settingSound) startMusic();
    updatePausePanel();
  }
}

function updatePausePanel() {
  const panel = document.getElementById("pausePanel");
  if (!panel) return;
  const isPaused = gameState === "paused";
  panel.classList.toggle("active", isPaused);
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

function getLevelStartSpeed(lv, diffMult = 1, speedUpgradeMult = getSpeedUpgradeMult()) {
  return Math.max(
    0.1,
    Math.min(lv.baseSpd, LEVEL_START_SPEED_CAP) * diffMult * speedUpgradeMult * GAME_SPEED_MULT,
  );
}

function shouldAutoRunLevelIntro() {
  return multiplayerMode || (currentLocation === 1 && currentLevel >= LVIV_AUTO_RUN_LEVEL_INDEX);
}

function reserveRoadHazardSpawn(minFrames = 58) {
  const safeMinFrames = Math.ceil(minFrames * OBSTACLE_SPAWN_GAP_MULT);
  if (fr - lastRoadHazardSpawnFrame < safeMinFrames) return false;
  lastRoadHazardSpawnFrame = fr;
  return true;
}
let lastRoadPickupSpawnFrame = -9999;
function roadItemSpacingClear(lane, x = BONUS_SPAWN_X, minX = 112) {
  const groups = [obs, coins, magnets, chestnuts, coffees, shields, superJumps, rescueBuses, postcardItems];
  return groups.every((group) =>
    !group.some((item) => item && item.lane === lane && Math.abs((item.x || x) - x) < minX),
  );
}
function reserveRoadPickupSpawn(lane, x = BONUS_SPAWN_X, minFrames = 42, minX = 112) {
  if (fr - lastRoadPickupSpawnFrame < minFrames) return false;
  if (!roadItemSpacingClear(lane, x, minX)) return false;
  lastRoadPickupSpawnFrame = fr;
  return true;
}
function spawnObs() {
  if (!reserveRoadHazardSpawn()) return;
  const lv = getLvl();
  const types = lv.obsTypes;
  const eventRoadwork = isRoadEvent("lviv_roadwork");
  const eventStorm = isRoadEvent("kyiv_storm");
  const roadworkChance = Math.min(0.055 + currentLevel * 0.008 + (eventRoadwork ? 0.18 : 0), 0.32);
  const oilChance = isStormWeather()
    ? (eventStorm ? 0.09 : 0.055)
    : Math.min(0.03 + currentLevel * 0.004, 0.075);
  const hazardChance = Math.min(
    (isStormWeather() ? 0.2 : 0.1) + currentLevel * 0.009 + (eventStorm || eventRoadwork ? 0.08 : 0),
    isStormWeather() || eventRoadwork ? 0.38 : 0.22,
  );
  const type =
    Math.random() < roadworkChance
      ? "cone"
      : Math.random() < oilChance
      ? "oil"
      : Math.random() < hazardChance
      ? Math.random() < (isStormWeather() ? 0.72 : 0.52)
        ? "puddle"
        : "hole"
      : types[Math.floor(Math.random() * types.length)];
  obs.push({
    x: ROAD_SPAWN_X,
    lane: Math.floor(Math.random() * 3),
    type,
    vx: type === "scooter" ? 1.8 : 0,
    wheelPhase: Math.random() * Math.PI * 2,
  });
}
function spawnCrosswalk() {
  if (!reserveRoadHazardSpawn(72)) return;
  const green = Math.random() < 0.58;
  obs.push({
    x: ROAD_SPAWN_X,
    lane: 1,
    type: "crosswalk",
    green,
    rewarded: false,
    phase: Math.random() * Math.PI * 2,
  });
  robotRadio(green ? "radioCrosswalkGreen" : "radioCrosswalkRed", 360);
}
function spawnTrafficCar() {
  if (!reserveRoadHazardSpawn(82)) return;
  const lane = Math.floor(Math.random() * 3);
  const palette =
    currentLocation === 1
      ? [
          ["#7c2d3c", "#f7d9b5"],
          ["#255b76", "#d8efff"],
          ["#5f6d3a", "#fff1ba"],
        ]
      : [
          ["#1f3158", "#9fd8ff"],
          ["#202638", "#d7e7ff"],
          ["#3a2455", "#ffc6f1"],
        ];
  const colors = palette[(currentLevel + lane + fr) % palette.length];
  obs.push({
    x: ROAD_SPAWN_X,
    lane,
    type: "traffic_car",
    vx: 0.55 + Math.random() * 0.95,
    body: colors[0],
    glass: colors[1],
    phase: Math.random() * Math.PI * 2,
  });
  robotRadio("radioCar", 360);
}
function spawnCoin() {
  const l = Math.floor(Math.random() * 3),
    hi = Math.random() < 0.35;
  if (!reserveRoadPickupSpawn(l, BONUS_SPAWN_X, 34, 96)) return;
  coins.push({ x: BONUS_SPAWN_X, lane: l, y: GND, done: false });
}
function spawnMagnet() {
  const lane = Math.floor(Math.random() * 3);
  if (!reserveRoadPickupSpawn(lane, ROAD_SPAWN_X, 50, 128)) return;
  magnets.push({ x: ROAD_SPAWN_X, lane, y: GND, phase: Math.random() * Math.PI * 2 });
}
function spawnChestnut() {
  if (currentLocation !== 0) return;
  const lane = Math.floor(Math.random() * 3);
  if (!reserveRoadPickupSpawn(lane, BONUS_SPAWN_X, 46, 116)) return;
  chestnuts.push({ x: BONUS_SPAWN_X, lane, y: GND, phase: Math.random() * Math.PI * 2 });
}
function spawnCoffee() {
  if (currentLocation !== 1) return;
  const lane = Math.floor(Math.random() * 3);
  if (!reserveRoadPickupSpawn(lane, BONUS_SPAWN_X, 46, 116)) return;
  coffees.push({ x: BONUS_SPAWN_X, lane, y: GND, phase: Math.random() * Math.PI * 2 });
}
function spawnRescueBus() {
  if (secretRoute?.active || bossActive || gameState !== "run") return;
  if (!reserveRoadHazardSpawn(90)) return;
  const lane = Math.floor(Math.random() * 3);
  rescueBuses.push({
    x: ROAD_SPAWN_X,
    lane,
    y: GND - 46,
    phase: Math.random() * Math.PI * 2,
  });
  showAndriiBubble("\u0420\u044f\u0442\u0443\u0432\u0430\u043b\u044c\u043d\u0438\u0439 \u0430\u0432\u0442\u043e\u0431\u0443\u0441 \u0434\u043e \u0448\u043a\u043e\u043b\u0438!");
}
function spawnShield() {
  const lane = Math.floor(Math.random() * 3);
  if (!reserveRoadPickupSpawn(lane, ROAD_SPAWN_X, 54, 132)) return;
  shields.push({ x: ROAD_SPAWN_X, lane, y: GND, phase: Math.random() * Math.PI * 2 });
}
function spawnSuperJump() {
  const lane = Math.floor(Math.random() * 3);
  if (!reserveRoadPickupSpawn(lane, ROAD_SPAWN_X, 54, 132)) return;
  superJumps.push({ x: ROAD_SPAWN_X, lane, y: GND, phase: Math.random() * Math.PI * 2 });
}
function spawnCityGift(secret = false) {
  if (secretRoute?.active || bossActive || gameState !== "run") return;
  const lane = Math.floor(Math.random() * 3);
  if (!roadItemSpacingClear(lane, BONUS_SPAWN_X, 116)) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  const sourceX = side < 0 ? 42 : W - 42;
  const sourceY = GND - 30;
  const kind = secret && Math.random() < 0.35 ? "shield" : "coin";
  const value = kind === "shield" ? 0 : secret ? 12 : 4;
  cityGifts.push({
    x: BONUS_SPAWN_X,
    y: GND,
    sourceX,
    sourceY,
    giverX: sourceX,
    giverY: sourceY,
    side,
    lane,
    vx: 0,
    vy: 0,
    value,
    kind,
    life: 170,
    secret,
  });
  showAndriiBubble(
    kind === "shield"
      ? "\u0414\u0456\u0434 \u043a\u0438\u0434\u0430\u0454 \u0449\u0438\u0442!"
      : secret
      ? "\u0414\u0456\u0434 \u0434\u0430\u0454 \u0431\u043e\u043d\u0443\u0441!"
      : "\u0411\u0456\u0436\u0438, \u0410\u043d\u0434\u0440\u0456\u044e!",
  );
}
function getPostcardPool() {
  return CITY_POSTCARDS.filter(
    (card) => (card.loc === currentLocation || card.loc === 2) && !postcards[card.id],
  );
}
function spawnPostcard() {
  if (secretRoute?.active || bossActive || gameState !== "run") return;
  const pool = getPostcardPool();
  if (!pool.length) return;
  const card = pool[(Math.random() * pool.length) | 0];
  const lane = Math.floor(Math.random() * 3);
  postcardItems.push({
    x: BONUS_SPAWN_X,
    y: GND - 52,
    lane,
    cardId: card.id,
    phase: Math.random() * Math.PI * 2,
  });
  robotRadio("radioPostcard", 420);
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

function drawGreetingWindow(x, y, w, h, personIdx, personScale = 0.72, muted = false) {
  ctx.fillStyle = muted ? "rgba(255,226,166,0.72)" : personIdx % 2 === 0 ? "#ffe8a8" : "#f4d7a1";
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
      personScale,
      personIdx * 1.7,
      shirts[personIdx % shirts.length],
    );
    ctx.restore();
  }
}

function drawLvivModularFacadeDetails(x, y, w, height, baseY, variant, isNight, accent) {
  const facadeShadow = isNight ? "rgba(4,8,16,0.22)" : "rgba(93,54,36,0.13)";
  const line = isNight ? "rgba(255,224,156,0.22)" : "rgba(82,46,31,0.30)";
  const brass = isNight ? "#d7a84d" : "#9f6638";
  const glass = isNight ? "rgba(113,192,230,0.55)" : "rgba(156,211,226,0.68)";
  const awnings = ["#b43e32", "#2d6c73", "#684d91", "#bd7b32"];
  const shopNames = ["КАВА", "ПЕКАРНЯ", "КНИГИ", "КВІТИ", "РЕСТО"];

  ctx.save();
  ctx.fillStyle = facadeShadow;
  for (let floorY = y + 44; floorY < baseY - 72; floorY += 34) {
    ctx.fillRect(x + 7, floorY, w - 14, 2);
  }

  ctx.strokeStyle = line;
  ctx.lineWidth = 1.1;
  for (let c = x + 18; c < x + w - 18; c += 28) {
    const wy = y + 28 + ((variant + Math.floor(c)) % 2) * 8;
    ctx.beginPath();
    ctx.moveTo(c - 9, wy + 20);
    ctx.quadraticCurveTo(c, wy + 10, c + 9, wy + 20);
    ctx.lineTo(c + 9, wy + 35);
    ctx.lineTo(c - 9, wy + 35);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = glass;
    ctx.fillRect(c - 6, wy + 22, 12, 10);
  }

  for (let b = x + 24; b < x + w - 18; b += 44) {
    const by = y + 74 + ((variant + Math.floor(b)) % 3) * 22;
    if (by > baseY - 92) continue;
    ctx.strokeStyle = isNight ? "rgba(20,18,18,0.82)" : "rgba(53,35,28,0.74)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b - 12, by, 24, 4);
    ctx.beginPath();
    for (let r = -9; r <= 9; r += 6) {
      ctx.moveTo(b + r, by);
      ctx.lineTo(b + r, by + 10);
    }
    ctx.stroke();
    ctx.fillStyle = (variant + Math.floor(b)) % 2 ? "#d64b53" : "#e9b844";
    ctx.fillRect(b - 13, by + 4, 26, 3);
    ctx.fillStyle = "#3f7c4c";
    ctx.fillRect(b - 11, by + 1, 22, 5);
  }

  const shopY = baseY - 48;
  const awning = awnings[variant % awnings.length];
  ctx.fillStyle = "rgba(28,24,24,0.52)";
  ctx.fillRect(x + 10, shopY - 2, w - 20, 34);
  ctx.fillStyle = glass;
  ctx.fillRect(x + 16, shopY + 5, Math.max(22, w * 0.25), 20);
  ctx.fillRect(x + w - 16 - Math.max(22, w * 0.25), shopY + 5, Math.max(22, w * 0.25), 20);
  ctx.fillStyle = awning;
  ctx.beginPath();
  ctx.moveTo(x + 8, shopY - 12);
  ctx.lineTo(x + w - 8, shopY - 12);
  ctx.lineTo(x + w - 16, shopY + 2);
  ctx.lineTo(x + 16, shopY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,245,210,0.45)";
  ctx.lineWidth = 2;
  for (let s = x + 18; s < x + w - 18; s += 18) {
    ctx.beginPath();
    ctx.moveTo(s, shopY - 11);
    ctx.lineTo(s - 5, shopY + 1);
    ctx.stroke();
  }
  ctx.fillStyle = isNight ? "#ffe3a0" : "#56311f";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(shopNames[variant % shopNames.length], x + w / 2, shopY - 16);
  ctx.textAlign = "left";

  ctx.fillStyle = brass;
  ctx.fillRect(x + 5, y + 5, w - 10, 3);
  ctx.fillRect(x + 5, y + height - 8, w - 10, 3);
  ctx.restore();
}

function drawCityBuildingWindows(x, y, w, h, accent = "#ffd66b") {
  const top = Math.max(y + 18, 72);
  const bottom = Math.min(y + h - 18, GND - 18);
  if (bottom <= top) return;
  ctx.save();
  ctx.fillStyle = "rgba(20,34,48,0.7)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  const stepX = w > 90 ? 28 : 24;
  const stepY = 32;
  for (let wy = top; wy < bottom; wy += stepY) {
    for (let wx = x + 14; wx < x + w - 12; wx += stepX) {
      const lit = Math.sin(wx * 0.05 + wy * 0.03 + fr * 0.015) > 0.35;
      ctx.fillStyle = lit ? accent : "rgba(20,34,48,0.72)";
      ctx.fillRect(wx, wy, 13, 18);
      ctx.strokeRect(wx + 0.5, wy + 0.5, 12, 17);
    }
  }
  ctx.restore();
}
function drawStreetBuilding(x, y, w, h, body, accent, variant = 0, location = 0) {
  const skylineBaseY = GND - 140;
  const baseY = Math.min(skylineBaseY, y + h);
  const height = baseY - y;
  if (height <= 24) return;
  const period = getMenuTimeOfDay().className;
  const isNight = period === "time-night";
  const isLviv = location === 1;
  const roof = variant % 4;
  const trim = isNight ? "rgba(220,230,255,0.16)" : isLviv ? "rgba(255,235,205,0.34)" : "rgba(255,255,255,0.26)";
  const roofColor = isNight ? "#192334" : isLviv ? "#8a3d32" : "#d8c7a0";

  ctx.save();
  ctx.fillStyle = "rgba(10,14,26,0.24)";
  ctx.fillRect(x + 8, y + 10, w, height);
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, height);
  ctx.fillStyle = isNight ? "rgba(4,8,18,0.28)" : "rgba(20,32,46,0.15)";
  ctx.fillRect(x + w - 10, y + 8, 10, height - 8);
  ctx.fillStyle = trim;
  ctx.fillRect(x + 6, y + 10, 3, height - 18);
  ctx.fillRect(x + w - 14, y + 10, 3, height - 18);

  ctx.fillStyle = roofColor;
  if (isLviv) {
    ctx.fillRect(x - 5, y - 10, w + 10, 10);
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 10);
    ctx.lineTo(x + w / 2, y - 28 - (variant % 2) * 5);
    ctx.lineTo(x + w + 8, y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = isNight ? "#263448" : "#f2c77f";
    for (let c = x + 18; c < x + w - 12; c += 32) {
      ctx.fillRect(c - 6, y + 20, 12, 16);
      ctx.strokeStyle = isNight ? "rgba(255,226,142,0.22)" : "rgba(92,56,38,0.28)";
      ctx.lineWidth = 1;
      ctx.strokeRect(c - 6.5, y + 20.5, 13, 16);
    }
  } else if (roof === 0) {
    ctx.fillRect(x - 5, y - 9, w + 10, 10);
    ctx.fillRect(x + 9, y - 18, w - 18, 9);
  } else if (roof === 1) {
    ctx.beginPath();
    ctx.moveTo(x - 8, y);
    ctx.lineTo(x + w / 2, y - 28);
    ctx.lineTo(x + w + 8, y);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x - 4, y - 14, w + 8, 14);
    for (let c = x + 8; c < x + w - 8; c += 18) ctx.fillRect(c, y - 25, 8, 11);
  }

  if (!isLviv && variant % 3 === 2) {
    ctx.fillStyle = isNight ? "#ffd86b" : "#f0c84b";
    ctx.beginPath();
    ctx.arc(x + w / 2, y - 22, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + w / 2 - 4, y - 38, 8, 16);
  }

  ctx.fillStyle = isNight ? "rgba(9,15,28,0.72)" : "rgba(36,54,72,0.56)";
  ctx.fillRect(x + 8, baseY - 46, w - 16, 36);
  ctx.fillStyle = isNight ? "rgba(116,196,255,0.24)" : isLviv ? "rgba(255,236,190,0.62)" : "rgba(190,232,255,0.58)";
  ctx.fillRect(x + 15, baseY - 38, Math.max(22, w * 0.34), 20);
  ctx.fillRect(x + w - Math.max(37, w * 0.34), baseY - 38, Math.max(22, w * 0.34), 20);
  ctx.fillStyle = accent;
  ctx.fillRect(x + 9, baseY - 53, w - 18, 8);
  ctx.fillStyle = isNight ? "#f3d27a" : isLviv ? "#5a261c" : "#17335c";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  const signs = isLviv
    ? ["\u041a\u0410\u0412\u0410", "\u041f\u0415\u041a\u0410\u0420\u041d\u042f", "\u041a\u041d\u0418\u0413\u0418", "\u041a\u0412\u0406\u0422\u0418", "\u0420\u0415\u0421\u0422\u041e"]
    : ["\u0410\u041f\u0422\u0415\u041a\u0410", "\u041c\u0415\u0422\u0420\u041e", "\u041a\u041d\u0418\u0413\u0418"];
  ctx.fillText(signs[variant % signs.length], x + w / 2, baseY - 56);
  ctx.textAlign = "left";

  drawCityBuildingWindows(x, y, w, height, accent);
  if (isLviv) {
    ctx.strokeStyle = isNight ? "rgba(255,220,145,0.18)" : "rgba(94,50,34,0.28)";
    ctx.lineWidth = 1.2;
    for (let c = x + 22; c < x + w - 18; c += 34) {
      ctx.beginPath();
      ctx.moveTo(c, y + 16);
      ctx.lineTo(c, baseY - 62);
      ctx.stroke();
    }

    ctx.strokeStyle = isNight ? "rgba(255,220,145,0.28)" : "rgba(95,54,35,0.30)";
    ctx.lineWidth = 1;
    for (let c = x + 16; c < x + w - 12; c += 30) {
      const ay = y + 50 + ((variant + Math.floor(c)) % 2) * 12;
      ctx.beginPath();
      ctx.arc(c, ay, 7, Math.PI, 0);
      ctx.stroke();
      ctx.strokeRect(c - 7, ay, 14, 17);
      ctx.fillStyle = variant % 2 ? "#d94d55" : "#e8b43f";
      ctx.fillRect(c - 8, ay + 17, 16, 3);
      ctx.fillStyle = "#3f7a49";
      ctx.fillRect(c - 6, ay + 14, 12, 4);
    }
    ctx.fillStyle = isNight ? "rgba(11,18,32,0.42)" : "rgba(112,57,37,0.20)";
    ctx.fillRect(x + 5, y + 6, w - 10, 3);
    ctx.fillRect(x + 5, y + 36, w - 10, 2);
    ctx.fillRect(x + 5, baseY - 62, w - 10, 3);
    drawLvivModularFacadeDetails(x, y, w, height, baseY, variant, isNight, accent);
  }
  ctx.restore();
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

  const isLvivGreeting = location === 1;
  const lvivWindowShift = isLvivGreeting ? 14 : 0;
  const lvivPersonScale = isLvivGreeting ? 0.42 : 0.72;
  for (const [wx, wy, ww, wh] of windows) {
    const person = people.find(
      ([px, py]) => Math.abs(px - wx) < 2 && Math.abs(py - wy) < 2,
    );
    const drawW = isLvivGreeting ? Math.round(ww * 0.72) : ww;
    const drawH = isLvivGreeting ? Math.round(wh * 0.74) : wh;
    const drawX = x + wx + (ww - drawW) / 2;
    const drawY = wy + lvivWindowShift + (wh - drawH) / 2;
    drawGreetingWindow(drawX, drawY, drawW, drawH, person ? person[2] : -1, lvivPersonScale, isLvivGreeting);
  }
  if (secretGrandpaVisible) drawBalconyGrandpa(x + 138, location === 1 ? 116 : 102, x * 0.01);

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

function drawScrollingRoadImage() {
  if (!roadImageReady || !roadImage?.naturalWidth) return false;
  const horizonY = GND - 128;
  const bottomY = H + 24;
  const cx = W / 2;
  const segmentHeight = H;
  const gameSpeed = Math.max(1, spd * 6);
  roadOffsetY += gameSpeed;
  if (roadOffsetY >= segmentHeight) roadOffsetY = 0;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - ROAD_TOP_HALF, horizonY);
  ctx.lineTo(cx + ROAD_TOP_HALF, horizonY);
  ctx.lineTo(cx + ROAD_BOTTOM_HALF, bottomY);
  ctx.lineTo(cx - ROAD_BOTTOM_HALF, bottomY);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(roadImage, 0, roadOffsetY, W, segmentHeight);
  ctx.drawImage(roadImage, 0, roadOffsetY - segmentHeight, W, segmentHeight);
  const skyBlend = ctx.createLinearGradient(0, 0, 0, H * 0.4);
  skyBlend.addColorStop(0, "#0a0a2a");
  skyBlend.addColorStop(1, "rgba(10, 10, 42, 0)");
  ctx.fillStyle = skyBlend;
  ctx.fillRect(0, 0, W, H * 0.4);
  ctx.restore();
  return true;
}

function drawRealRoad(timePeriod) {
  const horizonY = GND - 128;
  const bottomY = H + 24;
  const cx = W / 2;
  const topHalf = ROAD_TOP_HALF;
  const bottomHalf = ROAD_BOTTOM_HALF;
  const laneEdgeRatios = ROAD_LANE_EDGE_RATIOS;
  const isNight = timePeriod === "time-night";
  const isLvivRoad = currentLocation === 1;

  // Keep the generated full-scene bitmap disabled for gameplay: it contains buildings
  // and sidewalks, so scrolling it inside the road polygon puts city objects on the asphalt.
  const roadT = (y) => Math.max(0, Math.min(1, (y - horizonY) / (bottomY - horizonY)));
  const roadHalfAt = (t) => topHalf + (bottomHalf - topHalf) * t;

  if (currentLocation === 0) {
    const sidewalk = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    sidewalk.addColorStop(0, isNight ? "#2a3641" : "#627280");
    sidewalk.addColorStop(0.62, isNight ? "#222d36" : "#556470");
    sidewalk.addColorStop(1, isNight ? "#18212a" : "#46545f");
    ctx.fillStyle = sidewalk;
    ctx.fillRect(0, horizonY, W, bottomY - horizonY);

    ctx.strokeStyle = isNight ? "rgba(192, 210, 226, 0.2)" : "rgba(238, 246, 248, 0.34)";
    ctx.lineWidth = 1;
    const paverOffset = (bgOff * 0.35) % 34;
    for (let y = horizonY - paverOffset; y < bottomY; y += 34) {
      const t = roadT(y);
      const half = roadHalfAt(t);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cx - half * 1.03, y);
      ctx.moveTo(cx + half * 1.03, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const verge = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    verge.addColorStop(0, "rgba(64, 128, 82, 0.26)");
    verge.addColorStop(1, "rgba(38, 88, 58, 0.16)");
    ctx.fillStyle = verge;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(cx - topHalf * 1.34, horizonY);
    ctx.lineTo(cx - bottomHalf * 1.06, bottomY);
    ctx.lineTo(0, bottomY);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, horizonY);
    ctx.lineTo(cx + topHalf * 1.34, horizonY);
    ctx.lineTo(cx + bottomHalf * 1.06, bottomY);
    ctx.lineTo(W, bottomY);
    ctx.closePath();
    ctx.fill();
  } else {
    const plaza = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    plaza.addColorStop(0, isNight ? "#34353d" : "#918574");
    plaza.addColorStop(0.52, isNight ? "#2c3037" : "#807565");
    plaza.addColorStop(1, isNight ? "#20262d" : "#675f52");
    ctx.fillStyle = plaza;
    ctx.fillRect(0, horizonY, W, bottomY - horizonY);

    const sidewalkFill = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    sidewalkFill.addColorStop(0, isNight ? "#444852" : "#b7ab98");
    sidewalkFill.addColorStop(1, isNight ? "#2b313b" : "#82786b");
    const seamOffset = Math.round(bgOff * 0.22) % 54;
    const drawLvivSidewalkBand = (side) => {
      ctx.fillStyle = sidewalkFill;
      ctx.beginPath();
      for (let step = 0; step <= 12; step++) {
        const t = step / 12;
        const y = horizonY + (bottomY - horizonY) * t;
        const half = roadHalfAt(t);
        const inner = cx + side * half * 1.06;
        const outer = cx + side * half * 1.38;
        if (step === 0) ctx.moveTo(inner, y);
        else ctx.lineTo(inner, y);
        if (step === 12) ctx.lineTo(outer, y);
      }
      for (let step = 12; step >= 0; step--) {
        const t = step / 12;
        const y = horizonY + (bottomY - horizonY) * t;
        const half = roadHalfAt(t);
        ctx.lineTo(cx + side * half * 1.38, y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isNight ? "rgba(232,238,244,0.18)" : "rgba(255,255,255,0.30)";
      ctx.lineWidth = 1;
      for (let y = horizonY + 20 - seamOffset; y < bottomY; y += 54) {
        const t = roadT(y);
        const half = roadHalfAt(t);
        ctx.beginPath();
        ctx.moveTo(cx + side * half * 1.08, y);
        ctx.lineTo(cx + side * half * 1.34, y);
        ctx.stroke();
      }
      const cobbleOffset = Math.round(bgOff * 0.28) % 26;
      ctx.strokeStyle = isNight ? "rgba(245,232,205,0.10)" : "rgba(58,47,39,0.16)";
      for (let y = horizonY + 12 - cobbleOffset; y < bottomY; y += 26) {
        const t = roadT(y);
        const half = roadHalfAt(t);
        const inner = cx + side * half * 1.08;
        const outer = cx + side * half * 1.34;
        const cell = 16 + t * 15;
        for (let x = Math.min(inner, outer); x < Math.max(inner, outer); x += cell) {
          ctx.strokeRect(x, y, cell * 0.86, 8 + t * 6);
        }
      }

      ctx.strokeStyle = isNight ? "rgba(245,250,255,0.30)" : "rgba(240,238,228,0.62)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + side * topHalf * 1.055, horizonY);
      ctx.lineTo(cx + side * bottomHalf * 1.055, bottomY);
      ctx.stroke();
    };
    drawLvivSidewalkBand(-1);
    drawLvivSidewalkBand(1);
  }

  const road = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  if (isLvivRoad) {
    road.addColorStop(0, isNight ? "#3f444c" : "#7b7770");
    road.addColorStop(0.55, isNight ? "#343238" : "#70685e");
    road.addColorStop(1, isNight ? "#26282f" : "#56504a");
  } else {
    road.addColorStop(0, "#2d2d44");
    road.addColorStop(0.55, "#232338");
    road.addColorStop(1, "#1a1a2e");
  }
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(cx - topHalf, horizonY);
  ctx.lineTo(cx + topHalf, horizonY);
  ctx.lineTo(cx + bottomHalf, bottomY);
  ctx.lineTo(cx - bottomHalf, bottomY);
  ctx.closePath();
  ctx.fill();

  if (isLvivRoad) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - topHalf, horizonY);
    ctx.lineTo(cx + topHalf, horizonY);
    ctx.lineTo(cx + bottomHalf, bottomY);
    ctx.lineTo(cx - bottomHalf, bottomY);
    ctx.closePath();
    ctx.clip();

    const stoneOffset = (bgOff * 0.48) % 34;
    ctx.strokeStyle = isNight ? "rgba(255,240,214,0.19)" : "rgba(44,39,35,0.30)";
    ctx.lineWidth = 1.05;
    for (let y = horizonY - stoneOffset; y < bottomY + 36; y += 17) {
      const t = roadT(y);
      const half = roadHalfAt(t);
      ctx.beginPath();
      ctx.moveTo(cx - half * 0.92, y);
      ctx.lineTo(cx + half * 0.92, y);
      ctx.stroke();
      const cell = 18 + 24 * t;
      const stagger = (Math.floor(y / 17) % 2) * cell * 0.5;
      for (let x = cx - half * 0.9 + stagger; x < cx + half * 0.9; x += cell) {
        ctx.beginPath();
        ctx.moveTo(x, y - 1);
        ctx.lineTo(x + 7 * t, y + 13 + 6 * t);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = isNight ? "rgba(18,17,18,0.28)" : "rgba(48,42,36,0.30)";
    ctx.lineWidth = 0.8;
    for (let y = horizonY + (bottomY - horizonY) * 0.54 - (stoneOffset % 24); y < bottomY + 34; y += 21) {
      const t = roadT(y);
      const half = roadHalfAt(t);
      const cell = 20 + 30 * t;
      const stagger = (Math.floor(y / 21) % 2) * cell * 0.45;
      for (let x = cx - half * 0.86 + stagger; x < cx + half * 0.86; x += cell) {
        const rw = 8 + 11 * t;
        const rh = 3 + 5 * t;
        const shade = Math.sin((Math.floor(x * 0.43) * 12.9898 + Math.floor(y * 0.61) * 78.233) * 0.017);
        const alpha = Math.max(0.08, Math.min(0.22, 0.14 + shade * 0.045 + t * 0.025));
        ctx.fillStyle = isNight
          ? `rgba(${shade > 0 ? 255 : 198},${shade > 0 ? 242 : 214},${shade > 0 ? 212 : 184},${alpha})`
          : `rgba(${shade > 0 ? 255 : 188},${shade > 0 ? 255 : 178},${shade > 0 ? 246 : 166},${alpha})`;
        ctx.beginPath();
        ctx.ellipse(x, y, rw, rh, 0.08 * Math.sin(x), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.strokeStyle = isNight ? "rgba(36,31,28,0.72)" : "rgba(58,50,43,0.62)";
    ctx.lineWidth = 2.1;
    for (const railRatio of [-0.42, 0.42]) {
      ctx.beginPath();
      ctx.moveTo(cx + topHalf * railRatio, horizonY);
      ctx.lineTo(cx + bottomHalf * railRatio, bottomY);
      ctx.stroke();
      ctx.strokeStyle = isNight ? "rgba(235,221,190,0.38)" : "rgba(255,242,207,0.46)";
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + topHalf * (railRatio + 0.018), horizonY);
      ctx.lineTo(cx + bottomHalf * (railRatio + 0.018), bottomY);
      ctx.stroke();
      ctx.strokeStyle = isNight ? "rgba(36,31,28,0.72)" : "rgba(58,50,43,0.62)";
      ctx.lineWidth = 2.1;
    }

    const crossingBase = ((bgOff * 0.82) % 260) / 260;
    for (let n = 0; n < 2; n++) {
      const t = (crossingBase + n * 0.5) % 1;
      if (t < 0.12 || t > 0.9) continue;
      const y = horizonY + (bottomY - horizonY) * (t * t);
      const half = roadHalfAt(roadT(y));
      ctx.fillStyle = isNight ? "rgba(245,238,220,0.34)" : "rgba(255,250,236,0.58)";
      for (let s = -3; s <= 3; s++) {
        ctx.fillRect(cx + s * half * 0.24 - half * 0.07, y, half * 0.14, 4 + 9 * t);
      }
    }

    for (let i = 0; i < 3; i++) {
      const t = ((i * 0.31 + bgOff * 0.0018) % 1) ** 1.45;
      if (t < 0.28) continue;
      const half = roadHalfAt(t);
      const y = horizonY + (bottomY - horizonY) * t;
      const x = cx + half * (i % 2 ? -0.24 : 0.24);
      ctx.fillStyle = "rgba(24,25,28,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + 13 * t, 3 + 5 * t, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(230,218,190,0.34)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - topHalf, horizonY);
    ctx.lineTo(cx + topHalf, horizonY);
    ctx.lineTo(cx + bottomHalf, bottomY);
    ctx.lineTo(cx - bottomHalf, bottomY);
    ctx.closePath();
    ctx.clip();

    const textureOffset = (bgOff * 0.45) % 42;
    for (let y = horizonY - textureOffset; y < bottomY + 42; y += 42) {
      const t = roadT(y);
      const half = roadHalfAt(t);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
      ctx.lineWidth = 0.7 + 0.9 * t;
      ctx.beginPath();
      ctx.moveTo(cx - half * 0.82, y);
      ctx.lineTo(cx + half * 0.82, y);
      ctx.stroke();
    }

    const wetGlow = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    wetGlow.addColorStop(0, "rgba(76, 139, 255, 0.06)");
    wetGlow.addColorStop(0.56, "rgba(76, 139, 255, 0.025)");
    wetGlow.addColorStop(1, "rgba(255, 193, 84, 0.045)");
    ctx.fillStyle = wetGlow;
    ctx.fillRect(cx - bottomHalf, horizonY, bottomHalf * 2, bottomY - horizonY);
    ctx.restore();
  }

  ctx.strokeStyle = isLvivRoad ? (isNight ? "rgba(255, 236, 190, 0.78)" : "rgba(255, 248, 220, 0.90)") : "#ffd700";
  ctx.lineWidth = isLvivRoad ? 5.2 : 4.5;
  ctx.beginPath();
  ctx.moveTo(cx - topHalf * 0.96, horizonY);
  ctx.lineTo(cx - bottomHalf * 0.96, bottomY);
  ctx.moveTo(cx + topHalf * 0.96, horizonY);
  ctx.lineTo(cx + bottomHalf * 0.96, bottomY);
  ctx.stroke();


  ctx.strokeStyle = isLvivRoad
    ? (isNight ? "rgba(246, 250, 255, 0.78)" : "rgba(255, 255, 255, 0.86)")
    : "#ffffff";
  ctx.lineCap = "round";
  const dashCount = isLvivRoad ? 13 : 11;
  const animProgress = (bgOff * 0.007) % 1;
  for (const laneEdgeRatio of laneEdgeRatios) {
    for (let i = 0; i < dashCount; i++) {
      const u = (i / dashCount + animProgress) % 1;
      if (u < 0.035) continue;
      const t1 = u * u;
      const y1 = horizonY + (bottomY - horizonY) * t1;
      const y2 = Math.min(bottomY, y1 + (isLvivRoad ? (5 + 30 * u) * u : 14 + 44 * u));
      const t2 = roadT(y2);
      const half1 = roadHalfAt(t1);
      const half2 = roadHalfAt(t2);
      ctx.lineWidth = isLvivRoad ? 1.1 + 3.6 * u : 1.4 + 4.2 * u;
      ctx.beginPath();
      ctx.moveTo(cx + half1 * laneEdgeRatio, y1);
      ctx.lineTo(cx + half2 * laneEdgeRatio, y2);
      ctx.stroke();
    }
  }
  ctx.lineCap = "butt";

  const horizonShade = ctx.createLinearGradient(0, horizonY - 12, 0, horizonY + 28);
  horizonShade.addColorStop(0, "rgba(10, 12, 24, 0.24)");
  horizonShade.addColorStop(0.42, isNight ? "rgba(16, 18, 34, 0.14)" : "rgba(45, 50, 75, 0.1)");
  horizonShade.addColorStop(1, "rgba(10, 12, 24, 0)");
  ctx.fillStyle = horizonShade;
  ctx.fillRect(0, horizonY - 12, W, 40);

  if (isStormWeather()) {
    const wet = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    wet.addColorStop(0, "rgba(118, 180, 210, 0.1)");
    wet.addColorStop(0.6, "rgba(125, 205, 255, 0.18)");
    wet.addColorStop(1, "rgba(190, 236, 255, 0.08)");
    ctx.fillStyle = wet;
    ctx.beginPath();
    ctx.moveTo(cx - topHalf, horizonY);
    ctx.lineTo(cx + topHalf, horizonY);
    ctx.lineTo(cx + bottomHalf, bottomY);
    ctx.lineTo(cx - bottomHalf, bottomY);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRoadRunTrack() {
  const isLvivRoad = currentLocation === 1;
  const horizonY = GND - 128;
  const bottomY = H + 24;
  const cx = W / 2;
  const topHalf = ROAD_TOP_HALF;
  const bottomHalf = ROAD_BOTTOM_HALF;
  const laneRatios = ROAD_LANE_RATIOS;
  const roadAt = (t, laneRatio) => {
    const half = topHalf + (bottomHalf - topHalf) * t;
    const y = horizonY + (bottomY - horizonY) * t;
    return { x: cx + half * laneRatio, y, half };
  };

  ctx.save();
  const activeRatio = laneRatios[pLane] || 0;
  const t = 0.72;
  const active = roadAt(t, activeRatio);
  const pulse = 0.35 + Math.sin(fr * 0.12) * 0.1;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = isLvivRoad ? "rgba(255, 211, 120, 0.16)" : "rgba(98, 214, 255, 0.16)";
  ctx.beginPath();
  ctx.ellipse(active.x, active.y + 6, 54, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function getPerspectiveLanePoint(lane = pLane, t = 0.78, laneInset = 1) {
  const horizonY = GND - 128;
  const bottomY = H + 24;
  const cx = W / 2;
  const topHalf = ROAD_TOP_HALF;
  const bottomHalf = ROAD_BOTTOM_HALF;
  const laneRatios = ROAD_LANE_RATIOS;
  const safeT = Math.max(0, Math.min(1, t));
  const half = topHalf + (bottomHalf - topHalf) * safeT;
  return {
    x: cx + half * (laneRatios[lane] || 0) * laneInset,
    y: horizonY + (bottomY - horizonY) * safeT,
  };
}

function getRoadObjectLanePoint(lane = pLane, t = 0.78) {
  return getPerspectiveLanePoint(lane, t, 0.82);
}

function getRoadObstacleDepth(o) {
  return Math.max(0, Math.min(1, (W + 40 - o.x) / (W + 120)));
}

function getRoadSpawnAlpha(o) {
  const depth = getRoadObstacleDepth(o);
  return Math.max(0, Math.min(1, (depth - 0.02) / 0.14));
}

function isRoadObjectReady(o) {
  return getRoadObstacleDepth(o) > 0.12;
}

function getScooterRoadPoint(o) {
  const depth = getRoadObstacleDepth(o);
  const point = getRoadObjectLanePoint(o.lane, 0.12 + depth * 0.5);
  return {
    x: point.x,
    y: Math.min(GND, point.y),
    scale: 0.46 + depth * 0.54,
  };
}

function getTrafficCarRoadPoint(o) {
  const depth = getRoadObstacleDepth(o);
  const point = getRoadObjectLanePoint(o.lane, 0.1 + depth * 0.55);
  return {
    x: point.x,
    y: Math.min(GND + 2, point.y + 6),
    scale: 0.44 + depth * 0.64,
  };
}

function getConeRoadPoint(o) {
  const depth = getRoadObstacleDepth(o);
  const point = getRoadObjectLanePoint(o.lane, 0.14 + depth * 0.5);
  return {
    x: point.x,
    y: Math.min(GND + 4, point.y + 4),
    scale: 0.48 + depth * 0.55,
  };
}

function getSmallRoadPoint(o, yLift = 0) {
  const depth = getRoadObstacleDepth(o);
  const point = getRoadObjectLanePoint(o.lane, 0.14 + depth * 0.52);
  const scale = 0.5 + depth * 0.5;
  const groundY = Math.min(GND + 4, point.y + 4);
  return {
    x: point.x,
    y: groundY - yLift * scale,
    groundY,
    scale,
  };
}
function drawRoadObjectShadow(point, rx = 18, ry = 5, alpha = 0.28) {
  const groundY = point.groundY ?? point.y;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(point.x, groundY + 2 * point.scale, rx * point.scale, ry * point.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawRoadSpriteAt(point, drawBody, shadowRx = 18, shadowRy = 5, shadowAlpha = 0.28) {
  drawRoadObjectShadow(point, shadowRx, shadowRy, shadowAlpha);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.scale(point.scale, point.scale);
  drawBody(point.x, point.y, point.scale);
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

  if (kind === "uaWarning") {
    ctx.fillStyle = "#fff8ef";
    ctx.beginPath();
    ctx.moveTo(x, y - 50);
    ctx.lineTo(x + 31, y + 5);
    ctx.lineTo(x - 31, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d6342f";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#1f2933";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", x, y - 11);
    ctx.font = "bold 6px sans-serif";
    ctx.fillText(label, x, y + 1);
  } else if (kind === "uaSchool") {
    ctx.fillStyle = "#e8f4ff";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - 32, y - 44, 64, 33, 5) : ctx.rect(x - 32, y - 44, 64, 33);
    ctx.fill();
    ctx.strokeStyle = "#1f5fbf";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#0057b7";
    ctx.fillRect(x - 25, y - 38, 16, 8);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x - 25, y - 30, 16, 8);
    ctx.fillStyle = "#1f2933";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + 9, y - 24);
  } else if (kind === "lvivEntry") {
    ctx.fillStyle = "#1559b7";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x - 38, y - 43, 76, 30, 4) : ctx.rect(x - 38, y - 43, 76, 30);
    ctx.fill();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - 23);
  } else if (kind === "repair") {
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
  const signText = gt("signs");
  const signs = currentLocation === 1
    ? [
      { label: locLabel, kind: "lvivEntry", y: GND - 2, side: 1, gap: 0, version: LVIV_ROADSIDE_VERSION },
      { label: signText.school, kind: "uaSchool", y: GND - 4, side: 1, gap: 230, version: LVIV_ROADSIDE_VERSION },
      { label: signText.repair, kind: "uaWarning", y: GND - 1, side: -1, gap: 450, version: LVIV_ROADSIDE_VERSION },
    ]
    : [
      { label: locLabel, kind: "direction", y: GND - 2, side: -1, gap: 0 },
      { label: signText.school, kind: "school", y: GND - 4, side: 1, gap: 210 },
      { label: signText.repair, kind: "repair", y: GND - 1, side: -1, gap: 420 },
      { label: signText.metro, kind: "metro", y: GND - 5, side: 1, gap: 620 },
    ];
  const off = (bgOff * 0.62) % 820;
  for (const sign of signs) {
    const x = W + 120 + sign.gap - off;
    if (x < -90 || x > W + 100) continue;
    drawRoadSign(x + sign.side * (currentLocation === 1 ? 72 : 18), sign.y, sign.label, sign.kind);
  }

  const lightX = W + 360 - ((bgOff * 0.54) % 920);
  if (lightX > -70 && lightX < W + 80) {
    const safeLightX = currentLocation === 1
      ? ((Math.floor(bgOff / 460) % 2 === 0) ? 20 : W - 20)
      : lightX;
    drawTrafficLight(safeLightX, currentLocation === 1 ? GND - 82 : GND - 1);
  }
}

function drawLvivTram() {
  if (currentLocation !== 1) return;
  const eventMode = isRoadEvent("lviv_tram");
  const eventProgress = eventMode ? 1 - Math.max(0, Math.min(1, roadEvent.timer / 520)) : 0;
  const tramX = eventMode
    ? W + 120 - eventProgress * (W + 360)
    : W + 190 - ((bgOff * 0.28) % (W + 490));
  const tramY = GND - 228;
  if (tramX < -310 || tramX > W + 140) return;

  ctx.save();
  if (eventMode) {
    ctx.save();
    ctx.fillStyle = "rgba(8,12,26,0.82)";
    ctx.strokeStyle = "rgba(255,211,110,0.72)";
    ctx.lineWidth = 1.5;
    if (ctx.roundRect) ctx.roundRect(tramX + 58, tramY - 42, 112, 23, 7);
    else ctx.rect(tramX + 58, tramY - 42, 112, 23);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffdf78";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("РґР·РµРЅСЊ-РґР·РµРЅСЊ!", tramX + 114, tramY - 27);
    ctx.restore();
  }

  // Overhead tram wire with gentle sway
  ctx.strokeStyle = "rgba(38,34,28,0.72)";
  ctx.lineWidth = 1.1;
  const wireY = tramY - 84 + Math.sin(fr * 0.014 + tramX * 0.004) * 2;
  ctx.beginPath();
  ctx.moveTo(Math.max(-30, tramX - 50), wireY);
  ctx.quadraticCurveTo(tramX + 122, wireY + 4, Math.min(W + 30, tramX + 300));
  ctx.stroke();

  // Steel tram rails — metallic with tie sleepers
  const railY1 = GND - 120;
  const railY2 = GND - 114;
  const railStart = Math.max(-30, tramX - 50);
  const railEnd = Math.min(W + 30, tramX + 300);
  ctx.strokeStyle = "rgba(152,142,126,0.82)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(railStart, railY1);
  ctx.lineTo(railEnd, railY1);
  ctx.moveTo(railStart, railY2);
  ctx.lineTo(railEnd, railY2);
  ctx.stroke();
  // Rail highlight shine
  ctx.strokeStyle = "rgba(220,208,186,0.50)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(railStart, railY1 - 1);
  ctx.lineTo(railEnd, railY1 - 1);
  ctx.moveTo(railStart, railY2 - 1);
  ctx.lineTo(railEnd, railY2 - 1);
  ctx.stroke();
  // Wooden tie sleepers
  ctx.strokeStyle = "rgba(86,68,50,0.54)";
  ctx.lineWidth = 1.2;
  for (let rx = railStart + ((bgOff * 0.88) % 38); rx < railEnd; rx += 38) {
    ctx.beginPath();
    ctx.moveTo(rx, railY1 - 3);
    ctx.lineTo(rx + 12, railY2 + 4);
    ctx.stroke();
  }

  // Tram ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(tramX + 122, tramY + 130, 136, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pantograph (folded diamond shape reaching up to wire)
  ctx.strokeStyle = "#483c30";
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(tramX + 112, tramY - 2);
  ctx.lineTo(tramX + 100, tramY - 52);
  ctx.lineTo(tramX + 156, tramY - 84);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tramX + 112, tramY - 2);
  ctx.lineTo(tramX + 134, tramY - 52);
  ctx.lineTo(tramX + 156, tramY - 84);
  ctx.stroke();
  // Pantograph shoe (contact bar on wire)
  ctx.strokeStyle = "rgba(198,184,158,0.62)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tramX + 142, tramY - 84);
  ctx.lineTo(tramX + 170, tramY - 84);
  ctx.stroke();

  // Tram body — proper Lviv burgundy red with gradient
  const bodyGrad = ctx.createLinearGradient(tramX, tramY, tramX, tramY + 124);
  bodyGrad.addColorStop(0, "#b02222");
  bodyGrad.addColorStop(0.18, "#c22828");
  bodyGrad.addColorStop(0.66, "#9c1c1c");
  bodyGrad.addColorStop(1, "#7a1414");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(tramX, tramY, 248, 124, [10, 10, 4, 4]);
  else ctx.fillRect(tramX, tramY, 248, 124);
  ctx.fill();

  // Cream header band
  ctx.fillStyle = "#f5e0a8";
  ctx.fillRect(tramX + 4, tramY + 5, 240, 32);
  ctx.fillStyle = "#e4c47c";
  ctx.fillRect(tramX + 4, tramY + 35, 240, 4);

  // Lower accent stripe
  ctx.fillStyle = "#c43c28";
  ctx.fillRect(tramX + 3, tramY + 86, 242, 16);

  // Body outline frame
  ctx.strokeStyle = "#641010";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(tramX + 1, tramY + 1, 246, 122, [9, 9, 3, 3]);
  else ctx.strokeRect(tramX + 1, tramY + 1, 246, 122);
  ctx.stroke();

  // Windows — 6 panoramic windows with glass and passengers
  for (let i = 0; i < 6; i++) {
    const wx = tramX + 11 + i * 37;
    ctx.fillStyle = "#192c3c";
    ctx.fillRect(wx, tramY + 11, 30, 28);
    const glassGrad = ctx.createLinearGradient(wx, tramY + 11, wx + 30, tramY + 39);
    glassGrad.addColorStop(0, "rgba(182,228,252,0.88)");
    glassGrad.addColorStop(0.38, "rgba(142,200,234,0.68)");
    glassGrad.addColorStop(1, "rgba(98,162,214,0.52)");
    ctx.fillStyle = glassGrad;
    ctx.fillRect(wx + 2, tramY + 13, 26, 24);
    // Window glare
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.fillRect(wx + 3, tramY + 14, 9, 6);
    // Passenger silhouette
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(42,30,24,0.58)";
      ctx.beginPath();
      ctx.arc(wx + 14, tramY + 21, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(wx + 10, tramY + 26, 8, 9);
    }
  }

  // Door panel
  ctx.fillStyle = "#8c1818";
  ctx.fillRect(tramX + 104, tramY + 46, 38, 76);
  ctx.strokeStyle = "#f5e0a8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tramX + 123, tramY + 47);
  ctx.lineTo(tramX + 123, tramY + 120);
  ctx.stroke();
  // Door handle
  ctx.fillStyle = "#c8a060";
  ctx.fillRect(tramX + 126, tramY + 80, 12, 3);

  // Destination board: №7 ПЛОЩА РИНОК
  ctx.fillStyle = "#ffd44c";
  ctx.fillRect(tramX + 52, tramY - 9, 136, 15);
  ctx.strokeStyle = "#b89020";
  ctx.lineWidth = 1;
  ctx.strokeRect(tramX + 52, tramY - 9, 136, 15);
  ctx.fillStyle = "#5c1c0a";
  ctx.font = "bold 7px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u21167  \u041f\u041b\u041e\u0429\u0410 \u0420\u0418\u041d\u041e\u041a", tramX + 120, tramY + 1);
  ctx.textAlign = "left";

  // Route badge
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(tramX + 206, tramY + 54, 32, 20, 3);
  else ctx.fillRect(tramX + 206, tramY + 54, 32, 20);
  ctx.fill();
  ctx.fillStyle = "#9c1c1c";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("7", tramX + 222, tramY + 69);
  ctx.textAlign = "left";

  // Headlights with glow
  const hlGlow = ctx.createRadialGradient(tramX + 14, tramY + 98, 0, tramX + 14, tramY + 98, 26);
  hlGlow.addColorStop(0, "rgba(255,236,142,0.72)");
  hlGlow.addColorStop(1, "rgba(255,236,142,0)");
  ctx.fillStyle = hlGlow;
  ctx.beginPath();
  ctx.arc(tramX + 14, tramY + 98, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffaca";
  ctx.beginPath();
  ctx.arc(tramX + 14, tramY + 98, 7, 0, Math.PI * 2);
  ctx.arc(tramX + 234, tramY + 98, 5, 0, Math.PI * 2);
  ctx.fill();

  // Bogies (two proper wheel assemblies)
  for (const bx of [tramX + 44, tramX + 186]) {
    ctx.fillStyle = "#242018";
    ctx.fillRect(bx - 28, tramY + 116, 56, 10);
    ctx.fillStyle = "#3c3428";
    ctx.beginPath();
    ctx.arc(bx - 14, tramY + 126, 10, 0, Math.PI * 2);
    ctx.arc(bx + 14, tramY + 126, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#685e50";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx - 14, tramY + 126, 6, 0, Math.PI * 2);
    ctx.arc(bx + 14, tramY + 126, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#8c7e6e";
    ctx.beginPath();
    ctx.arc(bx - 14, tramY + 126, 2, 0, Math.PI * 2);
    ctx.arc(bx + 14, tramY + 126, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawLvivCoffeeScene() {
  if (currentLocation !== 1) return;
  const off = (bgOff * 0.2) % 520;
  for (let base = -520; base < W + 520; base += 520) {
    const x = base - off;
    const y = GND - 158;
    ctx.save();

    // Building shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 99, GND + 4, 122, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone facade — two-tone masonry
    const facadeGrad = ctx.createLinearGradient(x + 18, y - 18, x + 18, y + 90);
    facadeGrad.addColorStop(0, "#c4a07a");
    facadeGrad.addColorStop(0.5, "#b4906a");
    facadeGrad.addColorStop(1, "#a07858");
    ctx.fillStyle = facadeGrad;
    ctx.fillRect(x + 14, y - 20, 170, 100);
    // Stone block lines
    ctx.strokeStyle = "rgba(80,54,34,0.22)";
    ctx.lineWidth = 0.8;
    for (let sy = y - 12; sy < y + 80; sy += 18) {
      ctx.beginPath();
      ctx.moveTo(x + 14, sy);
      ctx.lineTo(x + 184, sy);
      ctx.stroke();
    }
    for (let sx = x + 32; sx < x + 184; sx += 32) {
      ctx.beginPath();
      ctx.moveTo(sx, y - 20);
      ctx.lineTo(sx, y + 80);
      ctx.stroke();
    }

    // Arched entrance
    ctx.fillStyle = "rgba(36,26,18,0.68)";
    ctx.beginPath();
    ctx.moveTo(x + 80, y + 78);
    ctx.lineTo(x + 80, y + 20);
    ctx.quadraticCurveTo(x + 99, y + 2, x + 118, y + 20);
    ctx.lineTo(x + 118, y + 78);
    ctx.closePath();
    ctx.fill();
    // Door frame
    ctx.strokeStyle = "#c49060";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 80, y + 78);
    ctx.lineTo(x + 80, y + 20);
    ctx.quadraticCurveTo(x + 99, y + 2, x + 118, y + 20);
    ctx.lineTo(x + 118, y + 78);
    ctx.stroke();
    // Doorknob
    ctx.fillStyle = "#c8a860";
    ctx.beginPath();
    ctx.arc(x + 116, y + 50, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Shop windows — brass frames with interior visible
    for (let wi = 0; wi < 2; wi++) {
      const wx = x + 28 + wi * 100;
      ctx.fillStyle = "rgba(28,22,14,0.72)";
      ctx.fillRect(wx, y + 14, 44, 48);
      // Interior warm glow
      const intGrad = ctx.createLinearGradient(wx, y + 14, wx, y + 62);
      intGrad.addColorStop(0, "rgba(255,218,140,0.48)");
      intGrad.addColorStop(1, "rgba(220,165,80,0.28)");
      ctx.fillStyle = intGrad;
      ctx.fillRect(wx + 2, y + 16, 40, 44);
      // Brass window frame
      ctx.strokeStyle = "#b08040";
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, y + 14, 44, 48);
      // Window dividers
      ctx.strokeStyle = "rgba(176,128,64,0.62)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wx + 22, y + 14);
      ctx.lineTo(wx + 22, y + 62);
      ctx.moveTo(wx, y + 38);
      ctx.lineTo(wx + 44, y + 38);
      ctx.stroke();
      // Interior shelves / books
      ctx.fillStyle = "rgba(140,96,56,0.48)";
      for (let shelf = 0; shelf < 2; shelf++) {
        ctx.fillRect(wx + 4, y + 22 + shelf * 16, 36, 3);
      }
    }

    // Café sign — "КАВА ПО-ЛЬВІВСЬКИ"
    ctx.fillStyle = "#7a2c10";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 36, y - 40, 126, 28, 5);
    else ctx.fillRect(x + 36, y - 40, 126, 28);
    ctx.fill();
    ctx.strokeStyle = "#c8a040";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#f4dca0";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u041a\u0410\u0412\u0410", x + 99, y - 26);
    ctx.font = "bold 6px sans-serif";
    ctx.fillText("\u041f\u041e-\u041b\u042c\u0412\u0406\u0412\u0421\u042c\u041a\u0418", x + 99, y - 16);
    ctx.textAlign = "left";
    // Coffee cup icon next to sign
    ctx.fillStyle = "#f4dca0";
    ctx.beginPath();
    ctx.arc(x + 42, y - 27, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a2c10";
    ctx.beginPath();
    ctx.arc(x + 42, y - 27, 3, 0, Math.PI * 2);
    ctx.fill();

    // Awning — striped burgundy & cream
    ctx.fillStyle = "#8a2018";
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 12);
    ctx.lineTo(x + 188, y - 12);
    ctx.lineTo(x + 180, y + 8);
    ctx.lineTo(x + 18, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(244,228,188,0.44)";
    for (let s = x + 20; s < x + 188; s += 20) {
      ctx.fillRect(s, y - 12, 10, 20);
    }
    // Awning fringe
    ctx.strokeStyle = "#c89840";
    ctx.lineWidth = 1.2;
    for (let f = x + 18; f < x + 185; f += 14) {
      ctx.beginPath();
      ctx.moveTo(f, y + 8);
      ctx.lineTo(f + 4, y + 14);
      ctx.stroke();
    }

    // Outdoor café tables with steam
    const tableY = GND - 76;
    ctx.strokeStyle = "#3a2418";
    ctx.lineWidth = 2.5;
    for (const tx of [x + 28, x + 168]) {
      // Table leg
      ctx.beginPath();
      ctx.moveTo(tx, tableY - 18);
      ctx.lineTo(tx, tableY + 2);
      ctx.moveTo(tx - 16, tableY + 2);
      ctx.lineTo(tx + 16, tableY + 2);
      ctx.stroke();
      // Table top
      ctx.fillStyle = "#9c6a40";
      ctx.fillRect(tx - 20, tableY - 24, 40, 6);
      // Coffee cup
      ctx.fillStyle = "#f5f0e4";
      ctx.fillRect(tx - 6, tableY - 38, 12, 12);
      ctx.fillStyle = "#3a2418";
      ctx.beginPath();
      ctx.arc(tx, tableY - 32, 3, 0, Math.PI * 2);
      ctx.fill();
      // Steam wisps (animated)
      ctx.strokeStyle = "rgba(255,255,255,0.62)";
      ctx.lineWidth = 1.5;
      const steam = Math.sin(fr * 0.09 + tx * 0.022) * 2.5;
      ctx.beginPath();
      ctx.moveTo(tx - 3, tableY - 41);
      ctx.quadraticCurveTo(tx - 8 + steam, tableY - 52, tx - 1, tableY - 62);
      ctx.moveTo(tx + 3, tableY - 41);
      ctx.quadraticCurveTo(tx + 9 - steam, tableY - 51, tx + 2, tableY - 60);
      ctx.stroke();
      ctx.strokeStyle = "#3a2418";
      ctx.lineWidth = 2.5;
      // Chair silhouette
      ctx.fillStyle = "rgba(58,36,24,0.56)";
      ctx.fillRect(tx - 16, tableY - 22, 8, 18);
      ctx.fillRect(tx - 20, tableY - 28, 16, 6);
    }

    // Cast-iron street lamp posts
    for (const lx of [x - 28, x + 224]) {
      ctx.strokeStyle = "#1a1c22";
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(lx, GND - 58);
      ctx.lineTo(lx, GND - 158);
      ctx.stroke();
      // Lamp arm
      ctx.strokeStyle = "#1a1c22";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx, GND - 156);
      ctx.quadraticCurveTo(lx + 10, GND - 172, lx + 18, GND - 168);
      ctx.stroke();
      // Lamp globe
      ctx.fillStyle = "#1a1c22";
      ctx.beginPath();
      ctx.arc(lx + 18, GND - 170, 8, 0, Math.PI * 2);
      ctx.fill();
      const lampGlow = ctx.createRadialGradient(lx + 18, GND - 160, 0, lx + 18, GND - 160, 28);
      lampGlow.addColorStop(0, "rgba(255,214,118,0.78)");
      lampGlow.addColorStop(1, "rgba(255,214,118,0)");
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(lx + 18, GND - 160, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd870";
      ctx.beginPath();
      ctx.arc(lx + 18, GND - 160, 5, 0, Math.PI * 2);
      ctx.fill();
      // Lamp base decoration
      ctx.fillStyle = "#28262e";
      ctx.fillRect(lx - 5, GND - 70, 10, 12);
    }

    // Ukrainian flag on facade
    ctx.strokeStyle = "rgba(140,110,70,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 162, y - 52);
    ctx.lineTo(x + 162, y - 28);
    ctx.stroke();
    ctx.fillStyle = "#0057b7";
    ctx.fillRect(x + 162, y - 52, 20, 8);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x + 162, y - 44, 20, 8);

    ctx.restore();
  }
}

function drawRoadsideLvivCoffeeScene() {
  if (currentLocation !== 1) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, GND - 122, 120, 144);
  ctx.rect(W - 120, GND - 122, 120, 144);
  ctx.clip();
  drawLvivCoffeeScene();
  ctx.restore();
}

function drawLvivLandmarkSkyline(timePeriod) {
  if (currentLocation !== 1) return;
  const isNight = timePeriod === "time-night";
  const y = GND - 218;
  ctx.save();

  // Warm atmospheric glow
  const sunrise = ctx.createRadialGradient(W / 2, y + 88, 0, W / 2, y + 88, W * 0.68);
  sunrise.addColorStop(0, isNight ? "rgba(82,100,148,0.18)" : "rgba(255,196,108,0.48)");
  sunrise.addColorStop(0.52, isNight ? "rgba(46,60,94,0.10)" : "rgba(255,172,90,0.20)");
  sunrise.addColorStop(1, "rgba(255,172,90,0)");
  ctx.fillStyle = sunrise;
  ctx.fillRect(0, 0, W, GND - 108);

  // Gentle hill silhouettes (Lviv valley)
  ctx.globalAlpha = isNight ? 0.24 : 0.34;
  ctx.fillStyle = isNight ? "#1c2e22" : "#8aaa78";
  ctx.beginPath();
  ctx.moveTo(0, y + 96);
  for (let hx = 0; hx <= W; hx += 36) {
    const hh = 22 + Math.sin(hx * 0.016 + 1.2) * 16 + Math.sin(hx * 0.038 + 0.6) * 9;
    ctx.lineTo(hx, y + 96 - hh);
  }
  ctx.lineTo(W, y + 96);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = isNight ? 0.44 : 0.66;
  ctx.fillStyle = isNight ? "#1b2635" : "#ba8a65";

  // Background buildings
  for (let bx = -70 + ((bgOff * 0.08) % 140); bx < W + 110; bx += 88) {
    const h = 44 + ((Math.floor(bx) % 5) * 10);
    ctx.fillRect(bx, y + 118 - h, 72, h);
    ctx.beginPath();
    ctx.moveTo(bx - 4, y + 118 - h);
    ctx.lineTo(bx + 36, y + 96 - h);
    ctx.lineTo(bx + 76, y + 118 - h);
    ctx.closePath();
    ctx.fill();
  }

  // City Hall tower (Ratusha)
  const ratX = W * 0.14;
  ctx.fillRect(ratX + 5, y + 24, 30, 100);
  // Clock face
  ctx.fillStyle = isNight ? "#263548" : "#ecdec8";
  ctx.beginPath();
  ctx.arc(ratX + 20, y + 50, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isNight ? "#c0aa70" : "#7a5a30";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = isNight ? "#1b2635" : "#ba8a65";
  // Tower flag
  ctx.fillStyle = "#0057b7";
  ctx.fillRect(ratX + 20, y + 10, 18, 7);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(ratX + 20, y + 17, 18, 7);
  ctx.fillStyle = isNight ? "#1b2635" : "#ba8a65";

  // Lviv Opera House (center) — improved with proper dome and columns
  const operaX = W / 2 - 90;
  ctx.fillRect(operaX, y + 62, 180, 62);
  ctx.fillRect(operaX + 18, y + 38, 144, 26);
  // Triangular pediment
  ctx.beginPath();
  ctx.moveTo(operaX + 6, y + 38);
  ctx.lineTo(operaX + 90, y + 6);
  ctx.lineTo(operaX + 174, y + 38);
  ctx.closePath();
  ctx.fill();
  // Columns
  ctx.fillStyle = isNight ? "#222c3c" : "#d4a87a";
  for (let i = 0; i < 7; i++) ctx.fillRect(operaX + 22 + i * 22, y + 66, 8, 58);
  ctx.fillStyle = isNight ? "#1b2635" : "#ba8a65";
  // Main dome
  ctx.beginPath();
  ctx.arc(operaX + 90, y + 38, 24, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(operaX + 84, y + 12, 12, 26);
  ctx.beginPath();
  ctx.arc(operaX + 90, y + 10, 8, Math.PI, 0);
  ctx.fill();
  // Side domes
  for (const dx of [operaX + 40, operaX + 140]) {
    ctx.beginPath();
    ctx.arc(dx, y + 50, 11, Math.PI, 0);
    ctx.fill();
  }

  // Dominican Church dome (left)
  const domX = W * 0.28;
  ctx.fillRect(domX, y + 56, 56, 68);
  ctx.fillRect(domX + 8, y + 40, 40, 18);
  ctx.beginPath();
  ctx.arc(domX + 28, y + 40, 28, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(domX + 24, y + 12, 8, 28);
  ctx.beginPath();
  ctx.arc(domX + 28, y + 10, 6, Math.PI, 0);
  ctx.fill();

  // Latin Cathedral spires (right)
  const catX = W * 0.72;
  ctx.fillRect(catX, y + 70, 54, 54);
  ctx.fillRect(catX + 2, y + 24, 16, 48);
  ctx.beginPath();
  ctx.moveTo(catX - 2, y + 24);
  ctx.lineTo(catX + 10, y - 4);
  ctx.lineTo(catX + 22, y + 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(catX + 9, y - 14, 2, 12);
  ctx.fillRect(catX + 36, y + 34, 14, 38);
  ctx.beginPath();
  ctx.moveTo(catX + 32, y + 34);
  ctx.lineTo(catX + 43, y + 8);
  ctx.lineTo(catX + 54, y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(catX + 42, y + 1, 2, 9);

  // Bernardine bell tower (far right)
  const bernX = W * 0.87;
  ctx.fillRect(bernX, y + 46, 34, 78);
  ctx.beginPath();
  ctx.moveTo(bernX - 4, y + 46);
  ctx.lineTo(bernX + 17, y + 14);
  ctx.lineTo(bernX + 38, y + 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(bernX + 15, y + 8, 4, 8);

  ctx.globalAlpha = 1;
  const haze = ctx.createLinearGradient(0, y + 44, 0, GND - 122);
  haze.addColorStop(0, isNight ? "rgba(30,40,58,0)" : "rgba(255,214,158,0)");
  haze.addColorStop(1, isNight ? "rgba(34,44,62,0.40)" : "rgba(255,222,170,0.44)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, y, W, GND - y - 116);
  ctx.restore();
}

function drawLvivStreetFurniture() {
  if (currentLocation !== 1) return;
  const off = Math.round(bgOff * 0.34) % 360;
  ctx.save();
  clipOutsideRoad();
  for (let base = -360; base < W + 360; base += 360) {
    const x = base - off;
    for (const side of [-1, 1]) {
      const anchor = side < 0 ? x + 58 : W - x - 58;
      const curbX = side < 0
        ? Math.min(anchor, W / 2 - ROAD_BOTTOM_HALF - 22)
        : Math.max(anchor, W / 2 + ROAD_BOTTOM_HALF + 22);
      const groundY = GND - 8;

      // ─── Linden tree ───
      ctx.fillStyle = "#4a7c38";
      ctx.beginPath();
      ctx.ellipse(curbX, groundY - 80, 30, 24, 0, 0, Math.PI * 2);
      ctx.ellipse(curbX - 18, groundY - 66, 22, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(curbX + 18, groundY - 64, 22, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tree highlight (sunlit top)
      ctx.fillStyle = "rgba(108,168,72,0.56)";
      ctx.beginPath();
      ctx.ellipse(curbX - 6, groundY - 90, 16, 12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Tree trunk
      ctx.fillStyle = "#6a3c25";
      ctx.fillRect(curbX - 4, groundY - 60, 8, 60);
      ctx.fillStyle = "#7e4a30";
      ctx.fillRect(curbX - 2, groundY - 60, 4, 60);

      // ─── Flower bed ───
      ctx.fillStyle = "#3f7c4b";
      ctx.fillRect(curbX - side * 132 - 34, groundY - 14, 68, 12);
      // Flowers (red, yellow, purple)
      const flowerColors = ["#e64050", "#eabf40", "#c060d8", "#e07030"];
      for (let f = -28; f <= 28; f += 10) {
        ctx.fillStyle = flowerColors[((Math.floor(curbX) + f + base) % 4 + 4) % 4];
        ctx.beginPath();
        ctx.arc(curbX - side * 132 + f, groundY - 17, 4, 0, Math.PI * 2);
        ctx.fill();
        // Flower center
        ctx.fillStyle = "rgba(255,240,180,0.82)";
        ctx.beginPath();
        ctx.arc(curbX - side * 132 + f, groundY - 17, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ─── Cast-iron lamp post ───
      const lampX = curbX + side * 44;
      ctx.fillStyle = "#1e1f26";
      ctx.fillRect(lampX - 4, groundY - 1, 8, 3);   // base plate
      ctx.strokeStyle = "#1e1f26";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(lampX, groundY - 1);
      ctx.lineTo(lampX, groundY - 86);
      ctx.stroke();
      // Decorative arm curve
      ctx.strokeStyle = "#1e1f26";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lampX, groundY - 82);
      ctx.quadraticCurveTo(lampX + side * 12, groundY - 100, lampX + side * 20, groundY - 96);
      ctx.stroke();
      // Lamp globe housing
      ctx.fillStyle = "#1e1f26";
      ctx.beginPath();
      ctx.arc(lampX + side * 20, groundY - 98, 9, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      const glow = ctx.createRadialGradient(lampX + side * 20, groundY - 90, 0, lampX + side * 20, groundY - 90, 26);
      glow.addColorStop(0, "rgba(255,216,124,0.52)");
      glow.addColorStop(1, "rgba(255,216,124,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lampX + side * 20, groundY - 90, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd870";
      ctx.beginPath();
      ctx.arc(lampX + side * 20, groundY - 90, 5, 0, Math.PI * 2);
      ctx.fill();

      // ─── Wooden bench ───
      const benchX = curbX + side * 78;
      ctx.fillStyle = "#7a4e28";
      ctx.fillRect(benchX - 34, groundY - 26, 68, 8);    // seat
      ctx.fillRect(benchX - 30, groundY - 36, 60, 7);    // backrest
      // Bench legs
      ctx.fillStyle = "#2e2920";
      ctx.fillRect(benchX - 28, groundY - 18, 6, 18);
      ctx.fillRect(benchX + 22, groundY - 18, 6, 18);
      // Backrest supports
      ctx.fillRect(benchX - 24, groundY - 36, 4, 10);
      ctx.fillRect(benchX + 20, groundY - 36, 4, 10);
      // Armrests
      ctx.fillStyle = "#6a3e20";
      ctx.fillRect(benchX - 34, groundY - 28, 8, 5);
      ctx.fillRect(benchX + 26, groundY - 28, 8, 5);

      // ─── Tram stop shelter ───
      const stopX = curbX - side * 172;
      ctx.fillStyle = "rgba(44,64,80,0.72)";
      ctx.fillRect(stopX - 30, groundY - 72, 60, 62);
      // Glass side panels
      ctx.fillStyle = "rgba(160,218,234,0.28)";
      ctx.fillRect(stopX - 24, groundY - 64, 48, 40);
      // Roof
      ctx.fillStyle = "#1e2d3c";
      ctx.fillRect(stopX - 34, groundY - 76, 68, 8);
      // Timetable board inside
      ctx.fillStyle = "rgba(240,240,220,0.52)";
      ctx.fillRect(stopX - 16, groundY - 56, 32, 22);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(stopX - 24.5, groundY - 64.5, 48, 40);
      // Shelter support pole
      ctx.strokeStyle = "#1e2d3c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(stopX - 32, groundY - 8);
      ctx.lineTo(stopX - 32, groundY - 76);
      ctx.stroke();

      // ─── Bicycle rack ───
      const bikeX = curbX - side * 92;
      ctx.strokeStyle = "#3a4050";
      ctx.lineWidth = 2;
      // Bike wheels
      ctx.beginPath();
      ctx.arc(bikeX - 12, groundY - 8, 9, 0, Math.PI * 2);
      ctx.arc(bikeX + 12, groundY - 8, 9, 0, Math.PI * 2);
      ctx.stroke();
      // Frame
      ctx.beginPath();
      ctx.moveTo(bikeX - 12, groundY - 8);
      ctx.lineTo(bikeX, groundY - 24);
      ctx.lineTo(bikeX + 12, groundY - 8);
      ctx.moveTo(bikeX, groundY - 24);
      ctx.lineTo(bikeX + 18, groundY - 28);
      ctx.stroke();
      // Handlebar
      ctx.beginPath();
      ctx.moveTo(bikeX + 14, groundY - 28);
      ctx.lineTo(bikeX + 22, groundY - 28);
      ctx.stroke();

      // ─── Trash bin ───
      const binX = curbX + side * 16;
      ctx.fillStyle = "#2c4a3c";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(binX - 9, groundY - 28, 18, 26, 3);
      else ctx.fillRect(binX - 9, groundY - 28, 18, 26);
      ctx.fill();
      ctx.fillStyle = "#3a6050";
      ctx.fillRect(binX - 11, groundY - 32, 22, 5);
      // Bin opening
      ctx.fillStyle = "rgba(0,0,0,0.38)";
      ctx.fillRect(binX - 5, groundY - 29, 10, 4);

      // ─── Traffic / road sign ───
      const signX = curbX + side * 118;
      ctx.strokeStyle = "#3c4450";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(signX, groundY);
      ctx.lineTo(signX, groundY - 56);
      ctx.stroke();
      // Round white sign with red ring
      ctx.fillStyle = "#f5f0de";
      ctx.beginPath();
      ctx.arc(signX, groundY - 62, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#cc3a34";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Blue square info sign below
      ctx.fillStyle = "#1558b8";
      ctx.fillRect(signX - 12, groundY - 44, 24, 16);
      ctx.fillStyle = "#f0f8ff";
      ctx.font = "bold 7px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Т", signX, groundY - 33);
      ctx.textAlign = "left";

      // ─── Traffic light (animated) ───
      const lightX = curbX - side * 42;
      ctx.fillStyle = "#282c38";
      ctx.fillRect(lightX - 6, groundY - 68, 12, 32);
      ctx.fillStyle = "#1c2030";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(lightX - 12, groundY - 90, 24, 44, 5);
      else ctx.fillRect(lightX - 12, groundY - 90, 24, 44);
      ctx.fill();
      const lightPhase = (Math.floor(fr / 88) + (side > 0 ? 1 : 0)) % 3;
      for (let li = 0; li < 3; li++) {
        ctx.fillStyle = li === lightPhase ? ["#e84848", "#f0c83c", "#40cc6a"][li] : "rgba(255,255,255,0.10)";
        ctx.beginPath();
        ctx.arc(lightX, groundY - 80 + li * 10, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ─── Pedestrian silhouette ───
      const personX = curbX + side * 148;
      const walkCycle = Math.sin(fr * 0.08 + base * 0.012) * 4;
      ctx.fillStyle = "rgba(32,34,44,0.55)";
      ctx.beginPath();
      ctx.arc(personX, groundY - 48, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(personX - 4, groundY - 43, 8, 22);
      ctx.strokeStyle = "rgba(32,34,44,0.48)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(personX - 2, groundY - 22);
      ctx.lineTo(personX - 9 + walkCycle, groundY - 4);
      ctx.moveTo(personX + 2, groundY - 22);
      ctx.lineTo(personX + 9 - walkCycle, groundY - 4);
      // Arms swing
      ctx.moveTo(personX - 3, groundY - 36);
      ctx.lineTo(personX - 12 - walkCycle, groundY - 26);
      ctx.moveTo(personX + 3, groundY - 36);
      ctx.lineTo(personX + 12 + walkCycle, groundY - 26);
      ctx.stroke();
    }
  }
  ctx.restore();
}


function drawLvivLivingCityLayer() {
  if (currentLocation !== 1) return;
  const off = Math.round(bgOff * 0.26) % 520;
  ctx.save();
  clipOutsideRoad();

  // ─── Tram catenary poles (overhead wire supports) ───
  ctx.strokeStyle = "rgba(32,30,26,0.66)";
  ctx.lineWidth = 3.2;
  for (let poleX = -80 - (Math.round(bgOff * 0.18) % 210); poleX < W + 120; poleX += 210) {
    ctx.beginPath();
    ctx.moveTo(poleX, GND - 14);
    ctx.lineTo(poleX + 8, GND - 226);
    ctx.stroke();
    // Crossarm
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(poleX - 18, GND - 220);
    ctx.lineTo(poleX + 26, GND - 220);
    ctx.stroke();
    ctx.lineWidth = 3.2;
  }

  // ─── Overhead electrical wires (sagging catenary) ───
  ctx.strokeStyle = "rgba(44,40,36,0.56)";
  ctx.lineWidth = 1.4;
  for (let wireY = GND - 242; wireY <= GND - 208; wireY += 18) {
    ctx.beginPath();
    ctx.moveTo(-30, wireY);
    ctx.quadraticCurveTo(W / 2, wireY + 12, W + 30, wireY);
    ctx.stroke();
  }
  // Tram power wire (thicker, slightly lower)
  ctx.strokeStyle = "rgba(30,28,24,0.72)";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-30, GND - 248);
  ctx.quadraticCurveTo(W / 2, GND - 240, W + 30, GND - 248);
  ctx.stroke();

  for (let base = -520; base < W + 520; base += 520) {
    const x = base - off;
    for (const side of [-1, 1]) {
      const sidewalkX = side < 0 ? x + 82 : W - x - 82;
      const y = GND - 11;

      // ─── Walking pedestrians (3 variants, animated arms & legs) ───
      for (let i = 0; i < 3; i++) {
        const walk = Math.sin(fr * 0.07 + i * 1.7 + base * 0.01);
        const walkSpeed = 0.055 + i * 0.012;
        const px = sidewalkX + side * (i * 36 + Math.sin(fr * walkSpeed + i * 2.4) * 16);
        if (px < -24 || px > W + 24) continue;
        const py = y - i * 6;
        // Body color variants
        const coatColor = ["#4b5876", "#7a3d3a", "#3a5f48"][i % 3];
        ctx.fillStyle = coatColor;
        // Head
        ctx.beginPath();
        ctx.arc(px, py - 45, 5, 0, Math.PI * 2);
        ctx.fill();
        // Body (coat)
        ctx.fillRect(px - 5, py - 40, 10, 22);
        // Legs
        ctx.strokeStyle = "rgba(28,26,30,0.62)";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(px - 2, py - 19);
        ctx.lineTo(px - 7 + walk * 2.5, py - 2);
        ctx.moveTo(px + 2, py - 19);
        ctx.lineTo(px + 7 - walk * 2.5, py - 2);
        // Arms swing opposite to legs
        ctx.moveTo(px - 3, py - 34);
        ctx.lineTo(px - 11 - walk * 1.5, py - 24);
        ctx.moveTo(px + 3, py - 34);
        ctx.lineTo(px + 11 + walk * 1.5, py - 24);
        ctx.stroke();
      }

      // ─── Pigeons (animated pecking & walking) ───
      for (let p = 0; p < 4; p++) {
        const birdX = sidewalkX + side * (p * 20 + 14);
        if (birdX < -12 || birdX > W + 12) continue;
        const isPecking = ((p + Math.floor(fr / 38)) % 4) === 0;
        const birdY = GND - 5 - (isPecking ? 0 : ((p + Math.floor(fr / 44)) % 2) * 5);
        ctx.fillStyle = "rgba(92,88,96,0.78)";
        // Body
        ctx.beginPath();
        ctx.ellipse(birdX, birdY - 6, 6, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Head & neck
        ctx.fillStyle = "rgba(72,70,80,0.82)";
        ctx.beginPath();
        ctx.arc(birdX + side * 5, isPecking ? birdY - 4 : birdY - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = "rgba(180,160,100,0.72)";
        ctx.beginPath();
        ctx.moveTo(birdX + side * 7, isPecking ? birdY - 3 : birdY - 8);
        ctx.lineTo(birdX + side * 11, isPecking ? birdY : birdY - 8);
        ctx.lineTo(birdX + side * 7, isPecking ? birdY - 2 : birdY - 7);
        ctx.fill();
        // Wing detail
        ctx.strokeStyle = "rgba(64,62,72,0.58)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(birdX - 3, birdY - 4);
        ctx.lineTo(birdX - 7, birdY);
        ctx.moveTo(birdX + 2, birdY - 4);
        ctx.lineTo(birdX + 6, birdY);
        ctx.stroke();
      }

      // ─── Wind-sway on tree tops (subtle oscillation) ───
      const swayAmt = Math.sin(fr * 0.022 + sidewalkX * 0.006) * 3;
      ctx.fillStyle = "rgba(82,136,62,0.22)";
      ctx.beginPath();
      ctx.ellipse(sidewalkX + swayAmt, y - 86, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // ─── Flying Birds in Sky Backdrop ───
      const flyX = ((fr * 0.8 + base * 1.5) % (W + 200)) - 100;
      const flyY = 60 + Math.sin(fr * 0.03 + base) * 12;
      const wingFlap = Math.sin(fr * 0.25) * 4;
      ctx.strokeStyle = "rgba(60,65,75,0.68)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(flyX - 8, flyY + wingFlap);
      ctx.quadraticCurveTo(flyX - 4, flyY - 4, flyX, flyY);
      ctx.quadraticCurveTo(flyX + 4, flyY - 4, flyX + 8, flyY + wingFlap);
      ctx.stroke();

      // ─── Decorative Street Bunting / Banners ───
      if (side < 0) {
        ctx.strokeStyle = "rgba(100,80,50,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, GND - 165);
        ctx.quadraticCurveTo(W / 2, GND - 150, W, GND - 165);
        ctx.stroke();
        // Flag pennants
        const flagColors = ["#0057b7", "#ffd700", "#d64b53", "#3f7c4c", "#f0c84b"];
        for (let fx = 30; fx < W - 30; fx += 34) {
          const fy = GND - 162 + Math.sin(fx * 0.009) * 10;
          ctx.fillStyle = flagColors[(Math.floor(fx / 34) + base) % flagColors.length];
          ctx.beginPath();
          ctx.moveTo(fx - 5, fy);
          ctx.lineTo(fx + 5, fy);
          ctx.lineTo(fx, fy + 8);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

function drawLvivIndieShopSign(x, y, w, variant, isNight) {
  const labels = [
    "\u041a\u0410\u0412\u0410",
    "\u041f\u0415\u041a\u0410\u0420\u041d\u042f",
    "\u041a\u0412\u0406\u0422\u0418",
    "\u0410\u041f\u0422\u0415\u041a\u0410",
    "\u041a\u041d\u0418\u0413\u0418",
    "\u0420\u0415\u0421\u0422\u041e",
  ];
  ctx.save();

  // Sign glow at night
  if (isNight) {
    const glow = ctx.createRadialGradient(x + w / 2, y + 6, 0, x + w / 2, y + 6, w * 0.6);
    glow.addColorStop(0, "rgba(255,210,120,0.32)");
    glow.addColorStop(1, "rgba(255,210,120,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 5, y - 5, w + 10, 24);
  }

  // Signboard body
  ctx.fillStyle = ["#8b2e24", "#245f67", "#6b3f7a", "#2e6f45", "#7f5a24", "#4c3e7e"][variant % 6];
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, 15, 4);
  else ctx.rect(x, y, w, 15);
  ctx.fill();

  // Brass border
  ctx.strokeStyle = isNight ? "#ffd880" : "#d4a450";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Label text
  ctx.fillStyle = isNight ? "#ffe8a8" : "#fbf0d0";
  ctx.font = "bold 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(labels[variant % labels.length], x + w / 2, y + 11);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawLvivIndieBuilding(x, y, w, h, variant, depth = 1, timePeriod = "time-day") {
  const isNight = timePeriod === "time-night";
  const baseY = Math.min(GND - 140, y + h);
  const height = baseY - y;
  if (height < 42) return;

  // Lviv historic palette: ochre, terracotta, sage green, dusty rose, warm yellow, slate blue, cream
  const bodies = ["#d88a68", "#e2b474", "#c26e5a", "#9cb6a4", "#e4c070", "#84a2b6", "#dfc9a0", "#c67890"];
  const trims = ["#f8e4bc", "#faebd0", "#eed8b0", "#f2caa0"];
  const roofs = ["#843a2c", "#683636", "#784e36", "#42505e"];

  const body = isNight ? ["#5f3d3c", "#625044", "#4f5360", "#6a463d"][variant % 4] : bodies[variant % bodies.length];
  const trim = trims[variant % trims.length];
  const roof = roofs[variant % roofs.length];
  const shadow = isNight ? "rgba(2,6,14,0.28)" : "rgba(84,44,30,0.16)";
  const glass = isNight ? "rgba(118,190,230,0.52)" : "rgba(158,214,228,0.72)";

  ctx.save();
  ctx.globalAlpha = depth;

  // Building shadow & base block
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 8, y + 8, w, height);
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, height);

  // Side shade for 3D depth
  ctx.fillStyle = shadow;
  ctx.fillRect(x + w - 11, y + 6, 11, height - 6);

  // Pilasters (corner columns)
  ctx.fillStyle = trim;
  ctx.fillRect(x + 4, y + 6, 5, height - 12);
  ctx.fillRect(x + w - 9, y + 6, 5, height - 12);

  // Cornices between floors
  for (let fy = y + 36; fy < baseY - 54; fy += 34) {
    ctx.fillStyle = trim;
    ctx.fillRect(x + 3, fy, w - 6, 3);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x + 3, fy + 3, w - 6, 1.5);
  }

  // Roof shape variants
  ctx.fillStyle = roof;
  if (variant % 3 === 0) {
    // Triangular gabled roof
    ctx.beginPath();
    ctx.moveTo(x - 7, y);
    ctx.lineTo(x + w / 2, y - 28 - (variant % 2) * 7);
    ctx.lineTo(x + w + 7, y);
    ctx.closePath();
    ctx.fill();
    // Parapet trim
    ctx.fillStyle = trim;
    ctx.fillRect(x - 5, y - 3, w + 10, 3);
  } else if (variant % 3 === 1) {
    // Mansard roof with crenelations
    ctx.fillRect(x - 5, y - 16, w + 10, 16);
    ctx.fillStyle = trim;
    for (let c = x + 6; c < x + w - 4; c += 18) {
      ctx.fillRect(c, y - 24, 7, 10);
    }
  } else {
    // Domed / arched roof
    ctx.fillRect(x - 6, y - 10, w + 12, 10);
    ctx.beginPath();
    ctx.arc(x + w / 2, y - 10, Math.min(26, w * 0.34), Math.PI, 0);
    ctx.fill();
  }

  // Chimneys
  ctx.fillStyle = roof;
  for (let c = x + 16 + (variant % 2) * 10; c < x + w - 10; c += 38) {
    ctx.fillRect(c, y - 32, 7, 18);
    ctx.fillStyle = isNight ? "rgba(255,218,130,0.24)" : "rgba(255,245,220,0.56)";
    ctx.fillRect(c + 1, y - 36, 5, 4);
    ctx.fillStyle = roof;
  }

  // Arched & rectangular windows
  for (let wy = y + 22; wy < baseY - 74; wy += 34) {
    for (let wx = x + 16; wx < x + w - 16; wx += 28) {
      const arched = (variant + Math.floor(wx) + Math.floor(wy)) % 2 === 0;
      ctx.strokeStyle = isNight ? "rgba(255,231,170,0.28)" : "rgba(82,48,30,0.34)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (arched) {
        ctx.moveTo(wx - 7, wy + 15);
        ctx.quadraticCurveTo(wx, wy + 2, wx + 7, wy + 15);
        ctx.lineTo(wx + 7, wy + 25);
        ctx.lineTo(wx - 7, wy + 25);
        ctx.closePath();
      } else {
        ctx.rect(wx - 7, wy + 5, 14, 20);
      }
      ctx.stroke();
      ctx.fillStyle = glass;
      ctx.fillRect(wx - 5, wy + 12, 10, 11);

      // Window keystone / cap
      ctx.fillStyle = trim;
      ctx.fillRect(wx - 4, wy + 1, 8, 3);
    }
  }

  // Balconies with wrought iron railings & blooming flowers
  for (let bx = x + 22; bx < x + w - 18; bx += 42) {
    const by = y + 68 + ((variant + Math.floor(bx)) % 3) * 18;
    if (by > baseY - 90) continue;

    // Balcony slab
    ctx.fillStyle = trim;
    ctx.fillRect(bx - 15, by - 2, 30, 4);

    // Wrought iron railing
    ctx.strokeStyle = isNight ? "rgba(18,18,22,0.88)" : "rgba(40,28,24,0.82)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx - 14, by - 12, 28, 12);
    for (let r = -10; r <= 10; r += 5) {
      ctx.beginPath();
      ctx.moveTo(bx + r, by - 12);
      ctx.lineTo(bx + r, by);
      ctx.stroke();
    }

    // Flower box with blooms
    ctx.fillStyle = "#3a7044";
    ctx.fillRect(bx - 13, by - 4, 26, 5);
    ctx.fillStyle = ["#e64858", "#f0c040", "#e870a0"][variant % 3];
    ctx.beginPath();
    ctx.arc(bx - 7, by - 5, 2.5, 0, Math.PI * 2);
    ctx.arc(bx, by - 6, 2.5, 0, Math.PI * 2);
    ctx.arc(bx + 7, by - 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground floor shop facade
  const shopY = baseY - 48;
  ctx.fillStyle = isNight ? "rgba(19,20,25,0.70)" : "rgba(52,42,34,0.48)";
  ctx.fillRect(x + 9, shopY - 1, w - 18, 34);
  ctx.fillStyle = glass;
  ctx.fillRect(x + 16, shopY + 6, Math.max(20, w * 0.24), 20);
  ctx.fillRect(x + w - 16 - Math.max(20, w * 0.24), shopY + 6, Math.max(20, w * 0.24), 20);

  // Ukrainian flag or city banner on select buildings
  if (variant % 3 === 0) {
    ctx.strokeStyle = "rgba(100,70,40,0.6)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 12, shopY - 26);
    ctx.lineTo(x + 12, shopY - 6);
    ctx.stroke();
    ctx.fillStyle = "#0057b7";
    ctx.fillRect(x + 12, shopY - 26, 16, 6);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(x + 12, shopY - 20, 16, 6);
  }

  // Bay Window (Oriel / ERKER) on select buildings
  if (variant % 4 === 1 && w > 80) {
    const bayX = x + w / 2 - 16;
    const bayY = y + 30;
    ctx.fillStyle = trim;
    ctx.fillRect(bayX - 2, bayY - 2, 36, 44);
    ctx.fillStyle = body;
    ctx.fillRect(bayX, bayY, 32, 40);
    // Bay window glass
    ctx.fillStyle = glass;
    ctx.fillRect(bayX + 4, bayY + 6, 24, 26);
    ctx.strokeStyle = isNight ? "rgba(255,220,140,0.4)" : "rgba(60,35,20,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bayX + 4, bayY + 6, 24, 26);
    // Roof cap over bay window
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(bayX - 4, bayY);
    ctx.lineTo(bayX + 16, bayY - 12);
    ctx.lineTo(bayX + 36, bayY);
    ctx.closePath();
    ctx.fill();
  }

  // Wrought Iron Hanging Sign (Coffee pot / pretzel shape) on building side
  if (variant % 2 === 1) {
    const signSideX = x + w - 3;
    const signY = shopY - 22;
    ctx.strokeStyle = "#282018";
    ctx.lineWidth = 1.5;
    // Bracket
    ctx.beginPath();
    ctx.moveTo(signSideX, signY);
    ctx.lineTo(signSideX + 14, signY);
    ctx.lineTo(signSideX + 14, signY + 12);
    ctx.stroke();
    // Hanging icon plate
    ctx.fillStyle = "#c89b48";
    ctx.beginPath();
    ctx.arc(signSideX + 14, signY + 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#382414";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Facade Wall Lanterns at shop height
  for (const lx of [x + 6, x + w - 6]) {
    ctx.fillStyle = "#201c18";
    ctx.fillRect(lx - 2, shopY + 2, 4, 8);
    if (isNight) {
      const lGlow = ctx.createRadialGradient(lx, shopY + 6, 0, lx, shopY + 6, 12);
      lGlow.addColorStop(0, "rgba(255,210,120,0.65)");
      lGlow.addColorStop(1, "rgba(255,210,120,0)");
      ctx.fillStyle = lGlow;
      ctx.beginPath();
      ctx.arc(lx, shopY + 6, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffda78";
    ctx.fillRect(lx - 1.5, shopY + 4, 3, 4);
  }

  drawLvivIndieShopSign(x + 14, shopY - 19, w - 28, variant, isNight);
  ctx.restore();
}

function drawLvivIndieCafeModule(x, y, variant, timePeriod) {
  const isNight = timePeriod === "time-night";
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + 84, y + 90, 100, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const umbrellaColors = ["#b94236", "#2f7a83", "#81518d", "#d48030"];
  const umbrella = umbrellaColors[variant % umbrellaColors.length];

  // String lights between umbrella posts
  ctx.strokeStyle = "rgba(255,220,130,0.65)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 42, y + 26);
  ctx.quadraticCurveTo(x + 84, y + 36, x + 126, y + 26);
  ctx.stroke();
  for (let l = x + 50; l <= x + 118; l += 14) {
    ctx.fillStyle = isNight ? "#ffe890" : "#ffd460";
    ctx.beginPath();
    ctx.arc(l, y + 30 + Math.sin((l - x) * 0.05) * 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outdoor umbrellas & tables
  for (const tx of [x + 42, x + 126]) {
    // Pole
    ctx.strokeStyle = "#3a2c24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tx, y + 44);
    ctx.lineTo(tx, y + 86);
    ctx.stroke();

    // Umbrella dome
    ctx.fillStyle = umbrella;
    ctx.beginPath();
    ctx.moveTo(tx - 34, y + 47);
    ctx.quadraticCurveTo(tx, y + 16, tx + 34, y + 47);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,240,210,0.45)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Table
    ctx.fillStyle = "#815339";
    ctx.fillRect(tx - 18, y + 68, 36, 6);
    ctx.strokeStyle = "#3a2c24";
    ctx.beginPath();
    ctx.moveTo(tx - 13, y + 74);
    ctx.lineTo(tx - 18, y + 90);
    ctx.moveTo(tx + 13, y + 74);
    ctx.lineTo(tx + 18, y + 90);
    ctx.stroke();

    // Steam on coffee cup
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1.2;
    const st = Math.sin(fr * 0.09 + tx) * 2;
    ctx.beginPath();
    ctx.moveTo(tx - 2, y + 66);
    ctx.quadraticCurveTo(tx - 5 + st, y + 58, tx, y + 50);
    ctx.stroke();
  }

  // Chalkboard menu stand
  ctx.fillStyle = "#2c2824";
  ctx.beginPath();
  ctx.moveTo(x + 84, y + 64);
  ctx.lineTo(x + 76, y + 86);
  ctx.lineTo(x + 92, y + 86);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8c6038";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#f0e6c8";
  ctx.font = "bold 6px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MENU", x + 84, y + 76);
  ctx.textAlign = "left";

  const glow = ctx.createRadialGradient(x + 84, y + 40, 0, x + 84, y + 40, 78);
  glow.addColorStop(0, isNight ? "rgba(255,210,120,0.28)" : "rgba(255,213,139,0.18)");
  glow.addColorStop(1, "rgba(255,210,120,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, 168, 100);
  ctx.restore();
}

function drawLvivIndieSkyline(timePeriod) {
  if (currentLocation !== 1) return;
  const isNight = timePeriod === "time-night";
  const y = GND - 224;
  ctx.save();

  const skyGlow = ctx.createRadialGradient(W * 0.52, y + 90, 0, W * 0.52, y + 90, W * 0.68);
  skyGlow.addColorStop(0, isNight ? "rgba(90,108,155,0.14)" : "rgba(255,203,118,0.42)");
  skyGlow.addColorStop(0.52, isNight ? "rgba(56,69,105,0.08)" : "rgba(255,181,110,0.18)");
  skyGlow.addColorStop(1, "rgba(255,181,110,0)");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, W, GND - 106);

  // Small soft parallax clouds; avoid stretched ellipses that read as a sky seam.
  ctx.fillStyle = isNight ? "rgba(180,200,240,0.13)" : "rgba(255,255,255,0.34)";
  for (let i = 0; i < 5; i++) {
    const cx = Math.round(((i * 170 - bgOff * 0.02) % (W + 180)) - 90);
    const cy = 72 + (i % 3) * 22;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy - 3, 15, 0, Math.PI * 2);
    ctx.arc(cx + 32, cy + 2, 11, 0, Math.PI * 2);
    ctx.arc(cx + 8, cy + 5, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = isNight ? "rgba(210,220,238,0.32)" : "rgba(68,74,86,0.38)";
  for (let i = 0; i < 7; i++) {
    const bx = Math.round(((i * 96 - bgOff * 0.045) % (W + 120)) - 60);
    const by = y + 24 + (i % 3) * 14;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + 5, by - 5, bx + 10, by);
    ctx.quadraticCurveTo(bx + 15, by - 5, bx + 20, by);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

  // Gentle green Lviv hills
  ctx.globalAlpha = isNight ? 0.22 : 0.32;
  ctx.fillStyle = isNight ? "#1c2e22" : "#8caa78";
  ctx.beginPath();
  ctx.moveTo(0, y + 104);
  for (let hx = 0; hx <= W; hx += 32) {
    const hh = 20 + Math.sin(hx * 0.018 + 0.8) * 14;
    ctx.lineTo(hx, y + 104 - hh);
  }
  ctx.lineTo(W, y + 104);
  ctx.closePath();
  ctx.fill();

  // Distant city silhouette
  ctx.globalAlpha = isNight ? 0.40 : 0.62;
  ctx.fillStyle = isNight ? "#182636" : "#ad7b5a";
  for (let x = -100 - (Math.round(bgOff * 0.06) % 180); x < W + 140; x += 92) {
    const h = 48 + ((Math.floor(x) % 4) * 12);
    ctx.fillRect(x, y + 120 - h, 78, h);
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 120 - h);
    ctx.lineTo(x + 39, y + 98 - h);
    ctx.lineTo(x + 83, y + 120 - h);
    ctx.closePath();
    ctx.fill();
  }

  // Lviv Opera House dome & facade silhouette
  const operaX = W / 2 - 92;
  ctx.fillRect(operaX, y + 68, 184, 58);
  ctx.fillRect(operaX + 18, y + 42, 148, 26);
  ctx.beginPath();
  ctx.moveTo(operaX + 4, y + 42);
  ctx.lineTo(operaX + 92, y + 4);
  ctx.lineTo(operaX + 180, y + 42);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(operaX + 42, y + 12, 100, 8);
  for (let i = 0; i < 7; i++) ctx.fillRect(operaX + 20 + i * 24, y + 72, 9, 54);

  // Dominican Church & Cathedral spires
  for (const tower of [
    [W * 0.14, y + 36, 40, 122],
    [W * 0.79, y + 22, 50, 142],
    [W * 0.62, y + 52, 34, 102],
    [W * 0.35, y + 64, 28, 86],
  ]) {
    const [tx, ty, tw, th] = tower;
    ctx.fillRect(tx, ty + 34, tw, th - 34);
    ctx.beginPath();
    ctx.moveTo(tx - 5, ty + 34);
    ctx.lineTo(tx + tw / 2, ty);
    ctx.lineTo(tx + tw + 5, ty + 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(tx + tw / 2 - 2, ty - 14, 4, 16);
  }

  ctx.globalAlpha = 1;
  const haze = ctx.createLinearGradient(0, y + 38, 0, GND - 118);
  haze.addColorStop(0, "rgba(255,225,175,0)");
  haze.addColorStop(1, isNight ? "rgba(28,40,58,0.24)" : "rgba(255,229,184,0.28)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, y, W, GND - y - 112);
  ctx.restore();
}

function drawLvivIndieArchitecture(timePeriod) {
  if (currentLocation !== 1) return;
  const offVeryFar = Math.round(bgOff * 0.08) % 280;
  const offFar = Math.round(bgOff * 0.14) % 360;
  const offMid = Math.round(bgOff * 0.24) % 520;
  ctx.save();
  clipOutsideRoad();

  // 3rd Far-Distant Parallax Layer (subtle muted buildings)
  for (let base = -280; base < W + 280; base += 280) {
    const x = base - offVeryFar;
    drawLvivIndieBuilding(x + 12, 96, 96, H - 126, 20 + base, 0.58, timePeriod);
    drawLvivIndieBuilding(x + 112, 88, 104, H - 118, 21 + base, 0.58, timePeriod);
    drawLvivIndieBuilding(x + 220, 102, 90, H - 132, 22 + base, 0.58, timePeriod);
  }

  // 2nd Far Parallax Layer
  for (let base = -360; base < W + 360; base += 360) {
    const x = base - offFar;
    drawLvivIndieBuilding(x - 4, 72, 122, H - 92, 10 + base, 0.84, timePeriod);
    drawLvivIndieBuilding(x + 126, 64, 112, H - 88, 11 + base, 0.84, timePeriod);
    drawLvivIndieBuilding(x + 246, 84, 132, H - 108, 12 + base, 0.84, timePeriod);
  }

  // 1st Foreground Parallax Layer
  for (let base = -520; base < W + 520; base += 520) {
    const x = base - offMid;
    drawLvivIndieBuilding(x - 22, 44, 152, H - 72, 1 + base, 1, timePeriod);
    drawLvivIndieBuilding(x + 138, 62, 124, H - 96, 2 + base, 1, timePeriod);
    drawLvivIndieBuilding(x + 270, 38, 146, H - 82, 3 + base, 1, timePeriod);
    drawLvivIndieBuilding(x + 424, 70, 154, H - 112, 4 + base, 1, timePeriod);
  }
  ctx.restore();
}

function drawLvivIndieRoadside(timePeriod) {
  if (currentLocation !== 1) return;
  const off = Math.round(bgOff * 0.34) % 560;
  ctx.save();
  clipOutsideRoad();
  for (let base = -560; base < W + 560; base += 560) {
    const x = base - off;
    drawLvivIndieCafeModule(x + 20, GND - 108, base, timePeriod);
    drawLvivIndieCafeModule(W - x - 188, GND - 108, base + 1, timePeriod);
  }
  ctx.restore();
  drawLvivStreetFurniture();
  drawLvivLivingCityLayer();
}

function clipOutsideRoad() {
  const horizonY = GND - 132;
  const bottomY = H + 18;
  const cx = W / 2;
  const topHalf = ROAD_TOP_HALF + 18;
  const bottomHalf = ROAD_BOTTOM_HALF + 18;
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.moveTo(cx - topHalf, horizonY - 8);
  ctx.lineTo(cx + topHalf, horizonY - 8);
  ctx.lineTo(cx + bottomHalf, bottomY);
  ctx.lineTo(cx - bottomHalf, bottomY);
  ctx.closePath();
  ctx.clip("evenodd");
}
function drawKyivMaidanScene() {
  if (currentLocation !== 0) return;
  const off = (bgOff * 0.18) % 760;
  for (let base = -760; base < W + 760; base += 760) {
    const x = base - off;
    ctx.save();
    clipOutsideRoad();

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 350, GND + 2, 238, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d7c89d";
    ctx.fillRect(x + 58, GND - 156, 168, 156);
    ctx.fillStyle = "#c7b47d";
    ctx.fillRect(x + 76, GND - 188, 132, 32);
    ctx.fillStyle = "#f5e8bd";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u0425\u0420\u0415\u0429\u0410\u0422\u0418\u041a", x + 142, GND - 166);
    ctx.textAlign = "left";
    ctx.fillStyle = "#4b6f8a";
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = x + 84 + col * 30;
        const wy = GND - 132 + row * 34;
        ctx.fillRect(wx, wy, 18, 22);
        ctx.fillStyle = "rgba(255,235,150,0.72)";
        ctx.fillRect(wx + 2, wy + 2, 14, 18);
        ctx.fillStyle = "#4b6f8a";
      }
    }

    ctx.fillStyle = "#cfd9e3";
    ctx.fillRect(x + 392, GND - 132, 158, 132);
    ctx.fillStyle = "#9faec0";
    ctx.beginPath();
    ctx.moveTo(x + 382, GND - 132);
    ctx.lineTo(x + 471, GND - 178);
    ctx.lineTo(x + 560, GND - 132);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#214d89";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("\u041c\u0410\u0419\u0414\u0410\u041d", x + 471, GND - 112);
    ctx.textAlign = "left";
    ctx.fillStyle = "#5d7691";
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const wx = x + 414 + col * 30;
        const wy = GND - 88 + row * 32;
        ctx.fillRect(wx, wy, 18, 20);
        ctx.fillStyle = "rgba(255,236,155,0.7)";
        ctx.fillRect(wx + 3, wy + 3, 12, 14);
        ctx.fillStyle = "#5d7691";
      }
    }

    for (const fx of [x + 270, x + 620]) {
      ctx.strokeStyle = "#2b3340";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(fx, GND);
      ctx.lineTo(fx, GND - 118);
      ctx.stroke();
      ctx.fillStyle = "#0057b7";
      ctx.fillRect(fx + 4, GND - 116, 34, 11);
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(fx + 4, GND - 105, 34, 11);
    }

    const fountainX = x + 326;
    ctx.fillStyle = "rgba(120,190,230,0.2)";
    ctx.beginPath();
    ctx.ellipse(fountainX, GND - 4, 78, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#87d8ff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const arc = -0.8 + i * 0.27;
      const top = Math.sin(fr * 0.08 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(fountainX, GND - 9);
      ctx.quadraticCurveTo(
        fountainX + Math.cos(arc) * 34,
        GND - 70 + top,
        fountainX + Math.cos(arc) * 64,
        GND - 14,
      );
      ctx.stroke();
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
  const generatedKyivSkyline = lv.loc === 0 && drawGeneratedKyivSkyline();
  const generatedLvivParallax = lv.loc === 1 && drawLvivImageParallaxBackground(timePeriod);
  drawStormSkyOverlay();

  if (lv.loc === 1 && !generatedLvivParallax) drawLvivIndieSkyline(timePeriod);

  if (!generatedKyivSkyline) {
    if (lv.loc === 1) {
      if (!generatedLvivParallax) drawLvivIndieArchitecture(timePeriod);
    } else {
      const off = (bgOff * 0.25) % 400;
      for (let bx = -400; bx < W + 400; bx += 400) {
        const x = bx - off;
        const warm = "#ffd66b";
        const cool = "#9ed8ff";
        drawStreetBuilding(x - 8, 92, 112, H - 142, lv.bldA, warm, 0, lv.loc);
        drawStreetBuilding(x + 112, 118, 82, H - 168, lv.bldB, cool, 1, lv.loc);
        drawStreetBuilding(x + 210, 74, 72, H - 124, lv.bldC, warm, 2, lv.loc);
        drawStreetBuilding(x + 300, 104, 92, H - 154, lv.bldB, cool, 3, lv.loc);
        drawGreetingBuildings(x, lv.loc);
      }
    }
  }

  if (lv.loc === 0 && !generatedKyivSkyline) drawKyivMaidanScene();
  if (lv.loc !== 1 || !generatedLvivParallax) {
    drawLvivTram();
    drawLvivIndieRoadside(timePeriod);
  }
  drawRealRoad(timePeriod);
  if (lv.loc === 1 && generatedLvivParallax) {
    if (isRoadEvent("lviv_tram")) drawLvivTram();
    drawLvivForegroundIdentity(timePeriod === "time-night");
  }
  if (generatedKyivSkyline) drawKyivRoadsideDetails();
  drawRoadRunTrack();
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

  const rawX = secretRoute.entering ? LANES[secretRoute.lane] : secretRoute.entranceX;
  const x = secretRoute.id === "underpass" ? LANES[1] : rawX;
  const y = GND;
  const near =
    pLane === secretRoute.lane && Math.abs(rawX - LANES[pLane]) <= 72;
  ctx.save();
  ctx.globalAlpha = Math.max(0.25, Math.min(1, (rawX + 80) / 150));
  ctx.shadowColor = secretRoute.color;
  ctx.shadowBlur = near ? 22 : 10;
  ctx.fillStyle = "#343a40";
  ctx.beginPath();
  ctx.moveTo(x - 54, y);
  ctx.lineTo(x - 54, y - 74);
  ctx.arc(x, y - 74, 54, Math.PI, 0);
  ctx.lineTo(x + 54, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = near ? "#ffffff" : secretRoute.color;
  ctx.lineWidth = near ? 6 : 4;
  ctx.stroke();

  const tunnelGlow = ctx.createRadialGradient(x, y - 59, 4, x, y - 59, 46);
  tunnelGlow.addColorStop(0, "rgba(20,26,35,1)");
  tunnelGlow.addColorStop(0.65, "rgba(5,8,13,0.98)");
  tunnelGlow.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = tunnelGlow;
  ctx.beginPath();
  ctx.moveTo(x - 43, y);
  ctx.lineTo(x - 43, y - 70);
  ctx.arc(x, y - 70, 43, Math.PI, 0);
  ctx.lineTo(x + 43, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 3; ring++) {
    const inset = 9 + ring * 10;
    ctx.beginPath();
    ctx.arc(x, y - 66, 46 - inset, Math.PI, 0);
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
  ctx.font = secretRoute.id === "underpass" ? "bold 11px sans-serif" : "bold 10px sans-serif";
  ctx.textAlign = "center";
  const routeLabel = secretRoute.entering
    ? "\u0422\u0423\u041d\u0415\u041b\u042c"
    : secretRoute.id === "underpass"
      ? "\u041f\u0406\u0414\u0417\u0415\u041c\u041d\u0418\u0419 \u041f\u0415\u0420\u0415\u0425\u0406\u0414"
      : secretRoute.name.toUpperCase();
  const labelW = secretRoute.id === "underpass" && !secretRoute.entering ? 160 : 100;
  const labelY = secretRoute.id === "underpass" && !secretRoute.entering ? y - 120 : y - 90;
  ctx.fillStyle = "rgba(5,10,22,0.94)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - labelW / 2, labelY - 15, labelW, 21, 6);
  else ctx.rect(x - labelW / 2, labelY - 15, labelW, 21);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(routeLabel, x, labelY);
  ctx.shadowBlur = 0;
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
      ? Math.min(schoolWalkTimer / 30, 1)
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
    const progress = Math.min(schoolWalkTimer / 94, 1);
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
  if (sk.id === "marichka") {
    drawPlayableMarichka(x, y);
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
    } else if (sk.id === "chase_master") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x - 18, y - 18, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ff4fa3";
      ctx.fillRect(x - 28, y - 18, 20, 3);
      ctx.fillStyle = "#ffd14a";
      ctx.fillRect(x - 10, y - 24, 10, 3);
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
    if (sk.id === "chase_master") {
      ctx.strokeStyle = "#ffd14a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 39);
      ctx.lineTo(x + 10, y - 22);
      ctx.moveTo(x + 10, y - 39);
      ctx.lineTo(x - 10, y - 22);
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
    } else if (sk.id === "chase_master") {
      ctx.fillStyle = sk.hat;
      ctx.beginPath();
      ctx.arc(x, y - 58, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#ff4fa3";
      ctx.fillRect(x - 10, y - 58, 20, 4);
      ctx.fillStyle = "#ffd14a";
      ctx.fillRect(x + 8, y - 64, 11, 3);
      ctx.strokeStyle = "rgba(255,79,163,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 24, footY - 9);
      ctx.lineTo(x - 43, footY - 9);
      ctx.moveTo(x + 18, footY - 8);
      ctx.lineTo(x + 38, footY - 8);
      ctx.stroke();
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

function drawPlayableMarichka(x, y) {
  const onRoad = y >= GND - 1 && !pSlide;
  const speedLevel = getPlayerUpgradeLevel("speed");
  const step = onRoad
    ? Math.sin(fr * (0.24 + Math.min(spd, 5) * 0.045 + speedLevel * 0.03)) * (9 + speedLevel)
    : Math.sin(fr * 0.18) * 5;

  ctx.save();
  if (pSlide) {
    ctx.translate(x, y - 8);
    ctx.rotate(-0.2);
    ctx.scale(1.08, 0.72);
    ctx.translate(-x, -y + 8);
    drawMarichkaRemodel(x - 4, y + 10, { step: 0 });
    drawAndriiWeapon(x + 2, y + 8, true);
  } else {
    drawMarichkaRemodel(x, y, { step });
    drawAndriiWeapon(x, y, false);
  }
  ctx.restore();
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
  if (gameState === "win" || gameState === "schoolEnter" || getSkin().id === "marichka") return;
  const dangerPct = Math.min(Math.max((chaserX + 100) / (LANES[0] - 80), 0), 1);
  const chasePoint = getPerspectiveLanePoint(pLane, 0.43 + dangerPct * 0.05);
  const cx = chasePoint.x;
  const cy = GND + 8 + dangerPct * 8;
  const lp = Math.sin(fr * 0.32) * 10;

  // небезпечна зона — аура рожева коли близько
  if (dangerPct > 0.5) {
    const auraAlpha = (dangerPct - 0.5) * 0.35;
    ctx.fillStyle = `rgba(255,100,180,${auraAlpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 28, 30, 58, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  const scale = 0.74 + dangerPct * 0.12;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawMarichkaRemodel(cx, cy, { step: lp, showName: true, dangerPct });
  ctx.restore();
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
  let x = o.x;
  if (o.type === "scooter") {
    drawScooterRider(o);
  } else if (o.type === "traffic_car") {
    const roadPoint = getTrafficCarRoadPoint(o);
    x = roadPoint.x;
    const y = roadPoint.y - 24;
    const bob = Math.sin(fr * 0.12 + (o.phase || 0)) * 1.5;
    const isLvivRoad = currentLocation === 1;
    const spawnAlpha = getRoadSpawnAlpha(o);
    if (spawnAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= spawnAlpha;
    ctx.translate(x, roadPoint.y);
    ctx.scale(roadPoint.scale, roadPoint.scale);
    ctx.translate(-x, -roadPoint.y);

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, roadPoint.y + 7, 48, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isStormWeather()) {
      const shine = ctx.createLinearGradient(x - 62, roadPoint.y + 8, x + 62, roadPoint.y + 18);
      shine.addColorStop(0, "rgba(96, 180, 255, 0)");
      shine.addColorStop(0.5, "rgba(158, 222, 255, 0.26)");
      shine.addColorStop(1, "rgba(96, 180, 255, 0)");
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.ellipse(x, roadPoint.y + 14, 62, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = o.body || (isLvivRoad ? "#7c2d3c" : "#1f3158");
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 43, y - 12 + bob, 86, 28, 8);
    else ctx.rect(x - 43, y - 12 + bob, 86, 28);
    ctx.fill();

    ctx.fillStyle = o.body || "#24344f";
    ctx.beginPath();
    ctx.moveTo(x - 25, y - 12 + bob);
    ctx.lineTo(x - 12, y - 32 + bob);
    ctx.lineTo(x + 18, y - 32 + bob);
    ctx.lineTo(x + 34, y - 12 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = o.glass || "#9fd8ff";
    ctx.globalAlpha = 0.86 * spawnAlpha;
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 15 + bob);
    ctx.lineTo(x - 7, y - 28 + bob);
    ctx.lineTo(x + 12, y - 28 + bob);
    ctx.lineTo(x + 23, y - 15 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = spawnAlpha;

    ctx.fillStyle = "#101521";
    for (const wx of [-27, 27]) {
      ctx.beginPath();
      ctx.arc(x + wx, y + 17 + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6d7d91";
      ctx.beginPath();
      ctx.arc(x + wx, y + 17 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101521";
    }

    ctx.fillStyle = "#fff1a8";
    ctx.fillRect(x - 45, y - 2 + bob, 8, 6);
    ctx.fillRect(x + 37, y - 2 + bob, 8, 6);
    if (isStormWeather() || getMenuTimeOfDay().className === "time-night") {
      ctx.fillStyle = "rgba(255, 241, 168, 0.18)";
      ctx.beginPath();
      ctx.moveTo(x - 43, y + 1 + bob);
      ctx.lineTo(x - 94, y - 10 + bob);
      ctx.lineTo(x - 94, y + 16 + bob);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x - 28, y - 8 + bob, 28, 2);
    ctx.restore();
  } else if (o.type === "cone") {
    const p = getConeRoadPoint(o);
    x = p.x;
    const y = p.y;
    const blink = 0.75 + Math.sin(fr * 0.18 + (o.phase || 0)) * 0.25;
    const spawnAlpha = getRoadSpawnAlpha(o);
    if (spawnAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= spawnAlpha;
    ctx.translate(x, y);
    ctx.scale(p.scale, p.scale);
    ctx.translate(-x, -y);

    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 28, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2f343b";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 28, y - 5, 56, 10, 3);
    else ctx.fillRect(x - 28, y - 5, 56, 10);
    ctx.fill();

    ctx.fillStyle = "#ff7a18";
    ctx.beginPath();
    ctx.moveTo(x - 19, y - 5);
    ctx.lineTo(x, y - 62);
    ctx.lineTo(x + 19, y - 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff7df";
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 25);
    ctx.lineTo(x + 12, y - 25);
    ctx.lineTo(x + 16, y - 15);
    ctx.lineTo(x - 16, y - 15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 44);
    ctx.lineTo(x + 7, y - 44);
    ctx.lineTo(x + 10, y - 36);
    ctx.lineTo(x - 10, y - 36);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 204, 72, ${0.25 + blink * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y - 64, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd34d";
    ctx.beginPath();
    ctx.arc(x, y - 64, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (o.type === "crosswalk") {
    const y = GND + 6;
    const pulse = 0.75 + Math.sin(fr * 0.12 + (o.phase || 0)) * 0.25;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 150, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = -3; i <= 3; i++) {
      const stripeX = x + i * 34;
      const farW = 13;
      const nearW = 22;
      ctx.fillStyle = o.green
        ? "rgba(225, 255, 242, 0.82)"
        : "rgba(235, 238, 255, 0.72)";
      ctx.beginPath();
      ctx.moveTo(stripeX - farW, y - 34);
      ctx.lineTo(stripeX + farW, y - 34);
      ctx.lineTo(stripeX + nearW, y + 32);
      ctx.lineTo(stripeX - nearW, y + 32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(80, 120, 180, 0.08)";
      ctx.fillRect(stripeX - nearW + 3, y + 20, nearW * 2 - 6, 3);
    }

    ctx.strokeStyle = o.green
      ? "rgba(90, 255, 170, 0.65)"
      : "rgba(255, 88, 104, 0.66)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 150, y - 38);
    ctx.lineTo(x + 150, y - 38);
    ctx.moveTo(x - 168, y + 34);
    ctx.lineTo(x + 168, y + 34);
    ctx.stroke();

    const poleX = x + 138;
    ctx.fillStyle = "#29344b";
    ctx.fillRect(poleX - 3, y - 104, 6, 92);
    ctx.fillStyle = "rgba(7, 13, 26, 0.9)";
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(poleX - 16, y - 122, 32, 58, 6);
      ctx.fill();
    } else {
      ctx.fillRect(poleX - 16, y - 122, 32, 58);
    }
    ctx.fillStyle = o.green ? "rgba(70, 255, 138, 0.28)" : "rgba(255, 68, 80, 0.24)";
    ctx.beginPath();
    ctx.arc(poleX, y - (o.green ? 78 : 108), 18 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = o.green ? "#55ff91" : "#ff4d5d";
    ctx.beginPath();
    ctx.arc(poleX, y - (o.green ? 78 : 108), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = o.green ? "#273044" : "#31171e";
    ctx.beginPath();
    ctx.arc(poleX, y - (o.green ? 108 : 78), 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = o.green ? "#55ff91" : "#ff6c7b";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(o.green ? "+10" : gt("jumpShort"), poleX, y - 132);
    ctx.textAlign = "left";
    ctx.restore();
  } else if (o.type === "hole") {
    const p = getSmallRoadPoint(o, 0);
    x = p.x;
    const y = p.y;
    const spawnAlpha = getRoadSpawnAlpha(o);
    if (spawnAlpha <= 0) return;
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.save();
    ctx.globalAlpha *= spawnAlpha;
    ctx.translate(x, y);
    ctx.scale(p.scale, p.scale);
    ctx.translate(-x, -y);
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
    ctx.restore();
  } else if (o.type === "puddle") {
    const p = getSmallRoadPoint(o, 0);
    x = p.x;
    const y = p.y;
    const shine = Math.sin(fr * 0.08 + x * 0.01) * 3;
    const spawnAlpha = getRoadSpawnAlpha(o);
    if (spawnAlpha <= 0) return;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.save();
    ctx.globalAlpha *= spawnAlpha;
    ctx.translate(x, y);
    ctx.scale(p.scale, p.scale);
    ctx.translate(-x, -y);
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
    ctx.restore();
  } else if (o.type === "oil") {
    const p = getSmallRoadPoint(o, 0);
    x = p.x;
    const y = p.y;
    const slick = Math.sin(fr * 0.09 + x * 0.02) * 4;
    const spawnAlpha = getRoadSpawnAlpha(o);
    if (spawnAlpha <= 0) return;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.save();
    ctx.globalAlpha *= spawnAlpha;
    ctx.translate(x, y);
    ctx.scale(p.scale, p.scale);
    ctx.translate(-x, -y);
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 40, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const oil = ctx.createLinearGradient(x - 38, y - 10, x + 38, y + 8);
    oil.addColorStop(0, "rgba(12, 12, 18, 0.82)");
    oil.addColorStop(0.45, "rgba(36, 31, 48, 0.88)");
    oil.addColorStop(1, "rgba(5, 7, 12, 0.86)");
    ctx.fillStyle = oil;
    ctx.beginPath();
    ctx.ellipse(x, y, 38, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(138, 236, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x - 9 + slick, y - 2, 19, 4, -0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 112, 220, 0.42)";
    ctx.beginPath();
    ctx.ellipse(x + 10 - slick * 0.5, y + 2, 15, 3, 0.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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
  const roadPoint = getScooterRoadPoint(o);
  const x = roadPoint.x;
  const y = roadPoint.y;
  const phase = fr * 0.32 + (o.wheelPhase || 0);
  const bob = Math.sin(phase) * 2;

  const spawnAlpha = getRoadSpawnAlpha(o);
  if (spawnAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha *= spawnAlpha;
  ctx.translate(x, y);
  ctx.scale(roadPoint.scale, roadPoint.scale);
  ctx.translate(-x, -y);
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
  const p = getSmallRoadPoint(c, 12);
  const x = p.x;
  const y = p.y;
  drawRoadObjectShadow(p, 13, 4, 0.24);
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
  const g = ctx.createRadialGradient(x, y, 0, x, y, 17 * p.scale);
  g.addColorStop(0, "rgba(255,255,180,1)");
  g.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 18 * p.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y, 8 * p.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b8860b";
  ctx.font = `bold ${Math.max(7, 10 * p.scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("в‚ґ", x, y + 3 * p.scale);
  ctx.textAlign = "left";
}

function drawMagnet(m) {
  const p = getSmallRoadPoint(m, 36);
  const x = p.x;
  const y = p.y + Math.sin(fr * 0.12 + (m.phase || 0)) * 4 * p.scale;
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

function drawChestnutPower(c) {
  const p = getSmallRoadPoint(c, 38);
  const x = p.x;
  const y = p.y + Math.sin(fr * 0.13 + (c.phase || 0)) * 4 * p.scale;
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 31);
  glow.addColorStop(0, "rgba(255, 210, 94, 0.75)");
  glow.addColorStop(1, "rgba(255, 210, 94, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 31, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b4a24";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 14, 16, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b2d17";
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, 8, 11, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6d28c";
  ctx.beginPath();
  ctx.arc(x - 6, y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2f6b3f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 2, y - 13);
  ctx.quadraticCurveTo(x + 16, y - 25, x + 25, y - 12);
  ctx.stroke();
  ctx.fillStyle = "#ffd45c";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("x2", x, y + 27);
  ctx.restore();
}

function drawCoffeePower(c) {
  const p = getSmallRoadPoint(c, 38);
  const x = p.x;
  const y = p.y + Math.sin(fr * 0.12 + (c.phase || 0)) * 4 * p.scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.scale, p.scale);
  ctx.translate(-x, -y);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 31);
  glow.addColorStop(0, "rgba(255, 210, 120, 0.75)");
  glow.addColorStop(1, "rgba(255, 210, 120, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7efe0";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - 14, y - 14, 25, 24, 6);
  else ctx.rect(x - 14, y - 14, 25, 24);
  ctx.fill();
  ctx.strokeStyle = "#8b5a2b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 11, y - 4, 8, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = "#7a3f16";
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 7, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 6, y - 21);
    ctx.quadraticCurveTo(x + i * 6 - 5, y - 28, x + i * 6 + 1, y - 35);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShieldItem(s) {
  const p = getSmallRoadPoint(s, 38);
  const x = p.x;
  const y = p.y + Math.sin(fr * 0.12 + (s.phase || 0)) * 4 * p.scale;
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
  const p = getSmallRoadPoint(j, 40);
  const x = p.x;
  const y = p.y + Math.sin(fr * 0.14 + (j.phase || 0)) * 5 * p.scale;
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

function drawRescueBus(bus) {
  const p = getSmallRoadPoint(bus, 18);
  const x = p.x;
  const y = p.y + Math.sin(fr * 0.12 + (bus.phase || 0)) * 2 * p.scale;
  const spawnAlpha = getRoadSpawnAlpha(bus);
  if (spawnAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= spawnAlpha;
  ctx.translate(x, y);
  ctx.scale(p.scale, p.scale);
  ctx.translate(-x, -y);

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 58, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5c542";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - 58, y - 52, 116, 48, 10);
  else ctx.rect(x - 58, y - 52, 116, 48);
  ctx.fill();
  ctx.fillStyle = "#2f5f9f";
  ctx.fillRect(x - 48, y - 43, 23, 17);
  ctx.fillRect(x - 18, y - 43, 23, 17);
  ctx.fillRect(x + 12, y - 43, 23, 17);
  ctx.fillStyle = "#fff4b8";
  ctx.fillRect(x + 42, y - 39, 12, 10);
  ctx.fillStyle = "#334155";
  ctx.fillRect(x - 52, y - 19, 104, 5);
  ctx.fillStyle = "#1d2b3f";
  for (const wx of [-38, 38]) {
    ctx.beginPath();
    ctx.arc(x + wx, y - 1, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9fd8ff";
    ctx.beginPath();
    ctx.arc(x + wx, y - 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d2b3f";
  }
  ctx.fillStyle = "#1f4b8f";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("\u0428\u041a\u041e\u041b\u0410", x, y - 59);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("+20", x, y - 28);
  ctx.textAlign = "left";
  ctx.restore();
}
function drawCityGift(gift) {
  const p = getSmallRoadPoint(gift, gift.kind === "shield" ? 14 : 8);
  const x = p.x;
  const y = p.y;
  drawPeasantGiftGiver(gift);
  drawRoadObjectShadow(p, gift.secret ? 20 : 15, 5, 0.28);
  ctx.save();
  ctx.globalAlpha = Math.min(1, gift.life / 24);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, (gift.secret ? 24 : 19) * p.scale);
  glow.addColorStop(0, gift.kind === "shield" ? "rgba(88,190,255,0.95)" : gift.secret ? "rgba(255,247,178,0.95)" : "rgba(255,255,210,0.8)");
  glow.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, (gift.secret ? 24 : 19) * p.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gift.kind === "shield" ? "#58beff" : gift.secret ? "#ffd45c" : "#ffd700";
  ctx.beginPath();
  ctx.arc(x, y, (gift.secret ? 10 : 8) * p.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = gift.kind === "shield" ? "#e7f8ff" : gift.secret ? "#0057b7" : "#b8860b";
  ctx.lineWidth = Math.max(1.5, 2.5 * p.scale);
  ctx.beginPath();
  ctx.arc(x, y, (gift.secret ? 10 : 8) * p.scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#6b4b00";
  ctx.font = `bold ${Math.max(8, (gift.secret ? 11 : 9) * p.scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(gift.kind === "shield" ? "\u0429" : "+" + gift.value, x, y + 4 * p.scale);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawPostcardItem(item) {
  const card = CITY_POSTCARDS.find((entry) => entry.id === item.cardId);
  if (!card) return;
  const p = getSmallRoadPoint(item, 16);
  const x = p.x;
  const y = p.y;
  drawRoadObjectShadow(p, 17, 5, 0.25);
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 26 * p.scale);
  glow.addColorStop(0, card.color + "cc");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 26 * p.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y);
  ctx.scale(p.scale, p.scale);
  ctx.rotate(Math.sin(fr * 0.05 + item.phase) * 0.08);
  ctx.fillStyle = "#f8f1d0";
  ctx.strokeStyle = card.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-18, -13, 36, 26, 4);
  else ctx.rect(-18, -13, 36, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = card.color;
  ctx.fillRect(-14, -9, 28, 8);
  ctx.fillStyle = "#21304a";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(card.icon, 0, 9);
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
  if (levelMissionReward > 0) {
    ctx.fillStyle = "#6bcb77";
    ctx.font = "13px sans-serif";
    ctx.fillText(
      gt(
        "missionSummary",
        levelMissionReward,
        getCompletedLevelMissions().length,
        levelMissions.length,
      ),
      W / 2,
      H / 2 + 58,
    );
  }
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
      H / 2 + (levelMissionReward > 0 ? 82 : 68),
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
  return (
    type === "hole" ||
    type === "puddle" ||
    type === "oil" ||
    type === "cone" ||
    type === "crosswalk" ||
    type === "traffic_car"
  );
}
function oRect(o) {
  if (o.type === "hole") {
    const p = getSmallRoadPoint(o, 0);
    return { x: p.x - 32 * p.scale, y: p.y - 12 * p.scale, w: 64 * p.scale, h: 22 * p.scale };
  }
  if (o.type === "puddle") {
    const p = getSmallRoadPoint(o, 0);
    return { x: p.x - 38 * p.scale, y: p.y - 12 * p.scale, w: 76 * p.scale, h: 22 * p.scale };
  }
  if (o.type === "oil") {
    const p = getSmallRoadPoint(o, 0);
    return { x: p.x - 40 * p.scale, y: p.y - 12 * p.scale, w: 80 * p.scale, h: 22 * p.scale };
  }
  if (o.type === "crosswalk")
    return { x: o.x - 145, y: GND - 42, w: 290, h: 82 };
  if (o.type === "traffic_car")
  {
    const p = getTrafficCarRoadPoint(o);
    return {
      x: p.x - 44 * p.scale,
      y: p.y - 60 * p.scale,
      w: 88 * p.scale,
      h: 66 * p.scale,
    };
  }
  if (o.type === "cone") {
    const p = getConeRoadPoint(o);
    return {
      x: p.x - 24 * p.scale,
      y: p.y - 58 * p.scale,
      w: 48 * p.scale,
      h: 62 * p.scale,
    };
  }
  if (o.type === "scooter") {
    const p = getScooterRoadPoint(o);
    return {
      x: p.x - 30 * p.scale,
      y: p.y - 55 * p.scale,
      w: 60 * p.scale,
      h: 62 * p.scale,
    };
  }
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
  if (trickComboMult >= 2) addLevelMissionProgress("trick2");
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
    ctx.fillText(shieldCharges > 1 ? "Щит x" + shieldCharges : "Щит", 14, 46);
  }
  if (coffeeTimer > 0) {
    const remain = Math.max(0, Math.min(1, coffeeTimer / 520));
    ctx.fillStyle = "rgba(122, 63, 22, 0.62)";
    ctx.fillRect(10, 76, 92, 6);
    ctx.fillStyle = "#ffd28a";
    ctx.fillRect(10, 76, 92 * remain, 6);
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("Р›Р¬Р’Р†Р’РЎР¬РљРђ РљРђР’Рђ", 14, 73);
  }
  if (rescueBusTimer > 0) {
    const remain = Math.max(0, Math.min(1, rescueBusTimer / 330));
    ctx.fillStyle = "rgba(31, 75, 143, 0.62)";
    ctx.fillRect(10, 86, 92, 6);
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(10, 86, 92 * remain, 6);
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("BUS BOOST", 14, 83);
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
  if (chestnutTimer > 0) {
    const cw = 86;
    const remain = Math.max(0, Math.min(1, chestnutTimer / 600));
    ctx.fillStyle = "rgba(42,25,10,0.68)";
    ctx.fillRect(10, 66, cw, 9);
    ctx.fillStyle = "#d78a3d";
    ctx.fillRect(10, 66, cw * remain, 9);
    ctx.fillStyle = "#ffd45c";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CHESTNUT x2", 101, 75);
  }
  if (schoolBellActive && (gameState === "run" || gameState === "schoolEnter")) {
    const remain = Math.max(0, Math.ceil(schoolBellTimer / 60));
    const pct = Math.max(0, Math.min(1, schoolBellTimer / SCHOOL_BELL_FRAMES));
    const bx = W / 2 - 72;
    const by = 22;
    ctx.fillStyle = "rgba(20,24,38,0.74)";
    ctx.fillRect(bx, by, 144, 24);
    ctx.fillStyle = pct > 0.25 ? "#ffd45c" : "#ff6b6b";
    ctx.fillRect(bx + 6, by + 17, 132 * pct, 3);
    ctx.fillStyle = "#fff6cf";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ДЗВОНИК " + remain + "с  +" + SCHOOL_BELL_REWARD + "₴", W / 2, by + 14);
    ctx.textAlign = "left";
  }
  ctx.fillStyle = "rgba(7,18,28,0.7)";
  ctx.fillRect(W - 142, 22, 132, 34);
  ctx.fillStyle = "#cde7ff";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Рюкзак  E", W - 136, 34);
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
  drawLevelMissionHud();
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

function drawLevelMissionHud() {
  if (!levelMissions.length) return;
  const compact = multiplayerMode;
  const x = compact ? 12 : 188;
  const y = compact ? 52 : 58;
  const w = compact ? 214 : 304;
  const rowH = compact ? 12 : 15;
  const panelH = (compact ? 15 : 18) + levelMissions.length * rowH;
  ctx.save();
  ctx.globalAlpha = compact ? 0.78 : 1;
  ctx.fillStyle = compact ? "rgba(7,18,28,0.46)" : "rgba(7,18,28,0.68)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, panelH, 7);
  else ctx.fillRect(x, y, w, panelH);
  ctx.fillStyle = "#ffd700";
  ctx.font = compact ? "bold 9px sans-serif" : "bold 10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(gt("levelMissions"), x + 8, y + (compact ? 11 : 13));
  levelMissions.forEach((mission, index) => {
    const done = getLevelMissionProgress(mission) >= mission.target;
    const progress = Math.floor(getLevelMissionProgress(mission));
    const label =
      mission.target > 1
        ? `${mission.title}: ${progress}/${mission.target}${mission.unit || ""}`
        : mission.title;
    ctx.fillStyle = done ? "#6bcb77" : "#d8e7ff";
    ctx.font = compact ? "9px sans-serif" : "10px sans-serif";
    const text = compact && label.length > 31 ? label.slice(0, 30) + "..." : label;
    ctx.fillText((done ? "OK " : "- ") + text, x + 8, y + (compact ? 24 : 30) + index * rowH);
  });
  ctx.restore();
}

function getCityStartCopy() {
  const lvNames = getLevelNames(currentLocation, lang);
  const district = lvNames[currentLevel] || "";
  if (lang === "uk") {
    return currentLocation === 0
      ? {
          city: "\u041a\u0438\u0457\u0432",
          district,
          tip: "\u0420\u043e\u0431\u043e\u0442\u0440\u043e\u043d: \u0441\u043f\u043e\u0447\u0430\u0442\u043a\u0443 \u0440\u043e\u0437\u0436\u0435\u043d\u0438\u0441\u044f, \u043f\u043e\u0442\u0456\u043c \u0437\u0431\u0438\u0440\u0430\u0439 \u043c\u043e\u043d\u0435\u0442\u0438.",
          phaseClear: "\u0420\u043e\u0437\u0433\u0456\u043d: \u0434\u043e\u0440\u043e\u0433\u0430 \u0447\u0438\u0441\u0442\u0430",
          phaseCoins: "\u041c\u043e\u043d\u0435\u0442\u0438 \u043f\u043e\u043f\u0435\u0440\u0435\u0434\u0443",
          phaseDanger: "\u0423\u0432\u0430\u0433\u0430: \u043f\u043e\u0447\u0438\u043d\u0430\u044e\u0442\u044c\u0441\u044f \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438",
        }
      : {
          city: "\u041b\u044c\u0432\u0456\u0432",
          district,
          tip: "\u0420\u043e\u0431\u043e\u0442\u0440\u043e\u043d: \u043d\u0430 \u0431\u0440\u0443\u043a\u0456\u0432\u0446\u0456 \u0440\u043e\u0437\u0436\u0435\u043d\u0438\u0441\u044f \u0456 \u043f\u0438\u043b\u044c\u043d\u0443\u0439 \u043a\u043e\u043d\u0443\u0441\u0438.",
          phaseClear: "\u0420\u043e\u0437\u0433\u0456\u043d: \u0431\u0440\u0443\u043a\u0456\u0432\u043a\u0430 \u0447\u0438\u0441\u0442\u0430",
          phaseCoins: "\u041c\u043e\u043d\u0435\u0442\u0438 \u043f\u043e\u043f\u0435\u0440\u0435\u0434\u0443",
          phaseDanger: "\u0423\u0432\u0430\u0433\u0430: \u043a\u043e\u043d\u0443\u0441\u0438 \u0456 \u0441\u0430\u043c\u043e\u043a\u0430\u0442\u0438 \u043d\u0430 \u0441\u0442\u0430\u0440\u0442\u0456",
        };
  }
  return currentLocation === 0
    ? {
        city: "Kyiv",
        district,
        tip: "Robotron: accelerate first, then collect coins.",
        phaseClear: "Warm-up: road is clear",
        phaseCoins: "Coins ahead",
        phaseDanger: "Warning: obstacles begin",
      }
    : {
        city: "Lviv",
        district,
        tip: "Robotron: warm up on the cobblestones and watch the cones.",
        phaseClear: "Warm-up: road is clear",
        phaseCoins: "Coins ahead",
        phaseDanger: "Warning: obstacles begin",
      };
}
function drawStartPhaseBanner() {
  if (gameState !== "run" || fr > START_SAFE_FRAMES + 120) return;
  const copy = getCityStartCopy();
  const text = fr < START_EMPTY_FRAMES || totalDist < START_EMPTY_DISTANCE
    ? copy.phaseClear
    : fr < START_SAFE_FRAMES || totalDist < START_SAFE_DISTANCE
      ? copy.phaseCoins
      : copy.phaseDanger;
  const alpha = Math.min(1, fr / 24, (START_SAFE_FRAMES + 120 - fr) / 36);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha) * 0.94;
  const x = W / 2;
  const y = 58;
  ctx.fillStyle = "rgba(10, 14, 28, 0.84)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x - 128, y - 16, 256, 30, 8);
  else ctx.rect(x - 128, y - 16, 256, 30);
  ctx.fill();
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#f6fbff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y + 3);
  ctx.restore();
}
function drawLevelMissionIntroOverlay() {
  const copy = getCityStartCopy();
  if (multiplayerMode) {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(5,10,20,0.28)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(15,24,42,0.58)";
    ctx.strokeStyle = "rgba(255,215,0,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(12, 54, 246, 52, 8);
    else ctx.rect(12, 54, 246, 52);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(gt("levelMissions"), 22, 70);
    ctx.fillStyle = "#d8e7ff";
    ctx.font = "9px sans-serif";
    levelMissions.slice(0, 2).forEach((mission, index) => {
      const text = mission.title.length > 34 ? mission.title.slice(0, 33) + "..." : mission.title;
      ctx.fillText("- " + text, 22, 86 + index * 12);
    });
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(5,10,20,0.76)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";

  ctx.fillStyle = "rgba(15,24,42,0.9)";
  ctx.strokeStyle = currentLocation === 0 ? "rgba(98,214,255,0.55)" : "rgba(255,215,0,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(W / 2 - 210, 44, 420, 76, 12);
  else ctx.rect(W / 2 - 210, 44, 420, 76);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = currentLocation === 0 ? "#62d6ff" : "#ffd45c";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(copy.city, W / 2, 76);
  ctx.fillStyle = "#f2f7ff";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(`\u0420\u0456\u0432\u0435\u043d\u044c ${currentLevel + 1}: ${copy.district}`, W / 2, 98);
  ctx.fillStyle = "#aabbcc";
  ctx.font = "12px sans-serif";
  ctx.fillText(copy.tip, W / 2, 114);

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(gt("levelMissions"), W / 2, 145);

  const cardX = W / 2 - 205;
  const cardY = 164;
  const cardW = 410;
  ctx.fillStyle = "rgba(15,24,42,0.92)";
  ctx.strokeStyle = "rgba(255,215,0,0.42)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, 116, 10);
  else ctx.rect(cardX, cardY, cardW, 116);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  levelMissions.forEach((mission, index) => {
    const y = cardY + 28 + index * 30;
    ctx.fillStyle = "#6bcb77";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`${index + 1}.`, cardX + 24, y);
    ctx.fillStyle = "#f2f7ff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(mission.title, cardX + 54, y);
    ctx.fillStyle = "#ffd700";
    ctx.font = "11px sans-serif";
    ctx.fillText(gt("missionReward", LEVEL_MISSION_REWARD), cardX + 290, y);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#aabbcc";
  ctx.font = "13px sans-serif";
  ctx.fillText(gt("startMissions"), W / 2, 304);
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
    `${L.earned}: ${runCoins} РјРѕРЅРµС‚   ${L.winBonus}: +${getLvl().bonusCoins} РјРѕРЅРµС‚`,
    W / 2,
    H / 2 + 22,
  );
  ctx.fillStyle = "#aabbcc";
  ctx.font = "13px sans-serif";
  ctx.fillText(L.total + ": " + totalCoins + " РјРѕРЅРµС‚", W / 2, H / 2 + 48);
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
      L.score + ": " + score + "   " + L.earned + ": " + runCoins + " РјРѕРЅРµС‚",
      W / 2,
      H / 2 + 8,
    );
    ctx.fillStyle = "#6bcb77";
    ctx.font = "13px sans-serif";
    ctx.fillText(L.total + ": " + totalCoins + " РјРѕРЅРµС‚", W / 2, H / 2 + 32);
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
const MARICHKA_LINES_BY_LANG = {
  uk: {
    name: "\u041c\u0430\u0440\u0456\u0447\u043a\u0430",
    project1:
      "\u041e\u0439, \u0449\u043e \u0446\u0435 \u0432\u0438\u043f\u0430\u043b\u043e \u0437 \u0440\u044e\u043a\u0437\u0430\u043a\u0430 \u0410\u043d\u0434\u0440\u0456\u044f?",
    project2:
      "\u0422\u0430 \u0446\u0435 \u0436 \u0439\u043e\u0433\u043e \u0448\u043a\u0456\u043b\u044c\u043d\u0438\u0439 \u043f\u0440\u043e\u0454\u043a\u0442! \u0411\u0435\u0437 \u043d\u044c\u043e\u0433\u043e \u0432\u0456\u043d \u043d\u0435 \u0437\u043c\u043e\u0436\u0435 \u0432\u0438\u0441\u0442\u0443\u043f\u0438\u0442\u0438.",
    project3:
      "\u0410\u043d\u0434\u0440\u0456\u044e, \u0437\u0430\u0447\u0435\u043a\u0430\u0439! \u0422\u0438 \u0437\u0430\u0431\u0443\u0432 \u043f\u0440\u043e\u0454\u043a\u0442! \u042f \u0442\u0435\u0431\u0435 \u043d\u0430\u0437\u0434\u043e\u0436\u0435\u043d\u0443!",
    school:
      "\u0410\u043d\u0434\u0440\u0456\u044e, \u0437\u0430\u0447\u0435\u043a\u0430\u0439! \u0422\u0438 \u0437\u0430\u0431\u0443\u0432 \u0441\u0432\u0456\u0439 \u043f\u0440\u043e\u0454\u043a\u0442.",
    run: "\u0411\u0456\u0436\u0438, \u0410\u043d\u0434\u0440\u0456\u044e, \u0431\u0456\u0436\u0438!",
    jumpHint: "\u0421\u0442\u0440\u0438\u0431\u0430\u0439, \u043f\u043e\u043f\u0435\u0440\u0435\u0434\u0443 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0430!",
    carHint: "\u041f\u043e\u043f\u0435\u0440\u0435\u0434\u0443 \u043c\u0430\u0448\u0438\u043d\u0430, \u0442\u0440\u0438\u043c\u0430\u0439\u0441\u044f \u0443\u0432\u0430\u0436\u043d\u043e!",
    coinHint: "\u041c\u043e\u043d\u0435\u0442\u0438 \u043f\u043e\u043f\u0435\u0440\u0435\u0434\u0443, \u043d\u0435 \u043f\u0440\u043e\u043f\u0443\u0441\u0442\u0438!",
    finishHint: "\u0414\u043e \u0448\u043a\u043e\u043b\u0438 \u0432\u0436\u0435 \u0431\u043b\u0438\u0437\u044c\u043a\u043e!",
    bellHint: "\u0410\u043d\u0434\u0440\u0456\u044e, \u0434\u0437\u0432\u043e\u043d\u0438\u043a \u0441\u043a\u043e\u0440\u043e!",
    thanks:
      "\u0414\u044f\u043a\u0443\u044e, \u041c\u0430\u0440\u0456\u0447\u043a\u043e! \u0422\u0438 \u043c\u0435\u043d\u0435 \u0432\u0440\u044f\u0442\u0443\u0432\u0430\u043b\u0430.",
  },
  en: {
    name: "Marichka",
    project1: "Oh, what fell out of Andrii's backpack?",
    project2: "That is his school project! Without it, he will not be able to present.",
    project3: "Andrii, wait! You forgot your project! I will catch up with you!",
    school: "Andrii, wait! You forgot your project.",
    run: "Run, Andrii, run!",
    jumpHint: "Jump, there is an obstacle ahead!",
    carHint: "Car ahead, stay sharp!",
    coinHint: "Coins ahead, do not miss them!",
    finishHint: "The school is close now!",
    bellHint: "Andrii, the bell is coming soon!",
    thanks: "Thank you, Marichka! You saved me.",
  },
  de: {
    name: "Marichka",
    project1: "Oh, was ist aus Andriis Rucksack gefallen?",
    project2: "Das ist sein Schulprojekt! Ohne es kann er nicht präsentieren.",
    project3: "Andrii, warte! Du hast dein Projekt vergessen! Ich hole dich ein!",
    school: "Andrii, warte! Du hast dein Projekt vergessen.",
    run: "Lauf, Andrii, lauf!",
    jumpHint: "Spring, vor dir ist ein Hindernis!",
    carHint: "Auto voraus, bleib aufmerksam!",
    coinHint: "Münzen voraus, verpasse sie nicht!",
    finishHint: "Die Schule ist schon nah!",
    bellHint: "Andrii, die Glocke läutet gleich!",
    thanks: "Danke, Marichka! Du hast mich gerettet.",
  },
  fr: {
    name: "Marichka",
    project1: "Oh, qu'est-ce qui est tombé du sac d'Andrii ?",
    project2: "C'est son projet scolaire ! Sans lui, il ne pourra pas le présenter.",
    project3: "Andrii, attends ! Tu as oublié ton projet ! Je vais te rattraper !",
    school: "Andrii, attends ! Tu as oublié ton projet.",
    run: "Cours, Andrii, cours !",
    jumpHint: "Saute, il y a un obstacle devant !",
    carHint: "Voiture devant, reste attentif !",
    coinHint: "Des pièces devant, ne les rate pas !",
    finishHint: "L'école est toute proche !",
    bellHint: "Andrii, la sonnerie arrive bientôt !",
    thanks: "Merci, Marichka ! Tu m'as sauvé.",
  },
  es: {
    name: "Marichka",
    project1: "Oh, ¿qué se cayó de la mochila de Andrii?",
    project2: "¡Es su proyecto escolar! Sin él, no podrá presentarlo.",
    project3: "¡Andrii, espera! ¡Olvidaste tu proyecto! ¡Te alcanzaré!",
    school: "¡Andrii, espera! Olvidaste tu proyecto.",
    run: "¡Corre, Andrii, corre!",
    jumpHint: "¡Salta, hay un obstáculo adelante!",
    carHint: "¡Coche adelante, mantente atento!",
    coinHint: "¡Monedas adelante, no las pierdas!",
    finishHint: "¡La escuela ya está cerca!",
    bellHint: "¡Andrii, la campana sonará pronto!",
    thanks: "¡Gracias, Marichka! Me salvaste.",
  },
};
function getMarichkaLine(key) {
  const pack = MARICHKA_LINES_BY_LANG[settingRobotVoiceLang] || MARICHKA_LINES_BY_LANG.uk;
  return pack[key] || MARICHKA_LINES_BY_LANG.uk[key];
}
function getMarichkaProjectLines() {
  const who = getMarichkaLine("name");
  return ["project1", "project2", "project3"].map((key) => ({
    who,
    text: getMarichkaLine(key),
    voiceLanguage: settingRobotVoiceLang,
  }));
}

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
  rescueBuses = [];
  cityGifts = [];
  postcardItems = [];
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
    addMarichkaChainProgress("project");
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
      ? getMarichkaProjectLines()
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
  drawRealRoad("time-day");
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
    const enterProgress = Math.min(schoolWalkTimer / 94, 1);
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
      getMarichkaLine("name"),
      getMarichkaLine("school"),
      650,
      48,
      "right",
    );
  } else if (schoolDialogueStep === 2) {
    drawSpeechBox(
      "�����",
      getMarichkaLine("thanks"),
      28,
      48,
      "left",
    );
  }
}

function drawSchoolFinaleScene() {
  if (gameState !== "schoolEnter" || !schoolDialogueDone || schoolWalkTimer < 42)
    return;
  const reveal = Math.min((schoolWalkTimer - 42) / 34, 1);
  const panelY = 48 + (1 - reveal) * 18;

  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.fillStyle = "rgba(6, 15, 30, 0.56)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(152, panelY, 376, 112, 12);
  else ctx.fillRect(152, panelY, 376, 112);
  ctx.fill();
  ctx.strokeStyle = "#ffd34d";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#12325c";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Проєкт здано!", W / 2, panelY + 38);
  ctx.fillStyle = "#2d5d35";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("Андрій встиг до школи", W / 2, panelY + 66);
  ctx.fillStyle = "#586578";
  ctx.font = "13px sans-serif";
  ctx.fillText("Марічка принесла проєкт, а Роботрон підтвердив перемогу.", W / 2, panelY + 91);

  drawNeonRobotron(118, GND + 8);
  drawStoryMarichka(W - 118, GND, false);
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("Роботрон: місію виконано!", 118, GND - 94);
  ctx.fillStyle = "#ff8fc8";
  ctx.fillText("Марічка: встигли!", W - 118, GND - 94);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
  ctx.restore();
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
  drawRealRoad("time-day");
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
  ctx.fillText(gt("skipScene"), W / 2, H - 13);
  ctx.textAlign = "left";
}

function completeLevelAfterSchool() {
  if (levelCompleteLocked) return;
  levelCompleteLocked = true;
  spd = 0;
  const lv = getLvl();
  const isFinalLevel = currentLevel >= getLevels().length - 1;
  addQuestProgress("levels");
  addQuestProgress("finishes");
  if (schoolBellRewardEarned && !schoolBellRewardClaimed) {
    runCoins += SCHOOL_BELL_REWARD;
    schoolBellRewardClaimed = true;
    addMarichkaChainProgress("bell");
  }
  addMarichkaChainProgress("finish");
  runCoins += lv.bonusCoins;
  claimLevelMissionReward();
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
  if (gameState === "missionIntro") return;
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
    if (schoolDialogueDone) {
      schoolExitTimer++;
      schoolWalkTimer++;
    }
    fr++;
    pY = GND;
    pVY = 0;
    pSlide = false;
    if (schoolEnterTimer === 22 && schoolDialogueStep === 0) {
      schoolDialogueStep = 1;
      speakAndWait(getMarichkaLine("school"), settingRobotVoiceLang)
        .then(() => {
          if (gameState !== "schoolEnter") return null;
          schoolDialogueStep = 2;
          return speakAndWait(getMarichkaLine("thanks"), settingRobotVoiceLang);
        })
        .then(() => {
          if (gameState !== "schoolEnter") return;
          schoolDialogueStep = 0;
          schoolDialogueDone = true;
        });
    }
    if (!schoolDialogueDone && schoolEnterTimer >= 360) {
      schoolDialogueStep = 0;
      schoolDialogueDone = true;
    }
    if ((schoolDialogueDone && schoolWalkTimer >= 160) || schoolEnterTimer >= 700)
      completeLevelAfterSchool();
    return;
  }
  if (gameState !== "run") return;
  fr++;
  const lv = getLvl();
  const FDIST = getFinishDistance();
  const diffMult = { easy: 0.75, normal: 1.0, hard: 1.4 }[settingDiff] || 1.0;
  const speedUpgradeMult = getSpeedUpgradeMult();
  const coffeeBoost = coffeeTimer > 0 ? 0.38 : 0;
  const rescueBusBoost = rescueBusTimer > 0 ? 0.72 : 0;
  const base = getLevelStartSpeed(lv, diffMult, speedUpgradeMult) + coffeeBoost + rescueBusBoost;
  const maxS = lv.maxSpd * diffMult * speedUpgradeMult * GAME_SPEED_MULT + coffeeBoost + rescueBusBoost;
  const accel = 0.0012 * diffMult * GAME_SPEED_MULT * (1 + currentLevel * 0.15);
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
  const distanceStep = spd / 60;
  totalDist += distanceStep;
  score = Math.max(score, Math.round(totalDist * 10));
  addQuestProgress("distance", distanceStep);
  addLevelMissionProgress("distance", distanceStep);
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
    chestnuts = [];
    coffees = [];
  rescueBuses = [];
  shields = [];
    superJumps = [];
    cityGifts = [];
    postcardItems = [];
    forceMusicTrackRefresh();
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
    schoolBellActive = true;
    schoolBellTimer = SCHOOL_BELL_FRAMES;
    schoolBellRewardEarned = false;
    schoolBellRewardClaimed = false;
    schoolBellWarningSpoken = false;
    speakMarichkaHint("finishHint", 760);
  }
  if (finishActive) {
    if (schoolBellActive && schoolBellTimer > 0) schoolBellTimer--;
    if (
      schoolBellActive &&
      !schoolBellWarningSpoken &&
      schoolBellTimer > 0 &&
      schoolBellTimer <= 10 * 60
    ) {
      schoolBellWarningSpoken = true;
      speakMarichkaHint("bellHint", 520);
    }
    finishX -= spd;
    if (finishX < W / 2) {
      schoolBellRewardEarned = schoolBellActive && schoolBellTimer > 0;
      schoolBellActive = false;
      gameState = "schoolEnter";
      schoolEnterTimer = 0;
      schoolDialogueStep = 0;
      schoolDialogueDone = false;
      schoolExitTimer = 0;
      schoolWalkTimer = 0;
      spd = 0;
      obs = [];
      bullets = [];
      playerBullets = [];
      shields = [];
      superJumps = [];
      chestnuts = [];
      postcardItems = [];
      chaserX = -220;
      showAndriiBubble("\u0423\u0440\u0430! \u042f \u0434\u0456\u0441\u0442\u0430\u0432\u0441\u044f \u0434\u043e \u0448\u043a\u043e\u043b\u0438!");
      sfxSchoolBell();
      return;
    }
  }

  pY += pVY;
  const wasAirborne = pY < GND;
  pVY += PLAYER_JUMP_GRAVITY;
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
  if (chestnutTimer > 0) chestnutTimer--;
  if (coffeeTimer > 0) coffeeTimer--;
  if (rescueBusTimer > 0) rescueBusTimer--;
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
  if (robotRadioCooldown > 0) robotRadioCooldown--;
  if (bubbleQuietTimer > 0) bubbleQuietTimer--;
  if (marichkaVoiceCooldown > 0) marichkaVoiceCooldown--;
  if (lightningFlash > 0) lightningFlash--;
  if (isStormWeather()) {
    if (fr % 22 === 0) sfxRainLayer();
    if (fr % 920 === 360) robotRadio("radioStorm", 620);
    nextLightning--;
    if (nextLightning <= 0) {
      lightningFlash = 18;
      nextLightning = 250 + ((Math.random() * 320) | 0);
      sfxThunder();
    }
  }
  if (!bossActive && !secretRoute?.active && chaserX < LANES[0] - 100)
    chaserX += (chaseMode?.timer > 0 ? 1.05 : 0.5) + (spd - 2.8) * 0.1;
  if (chaserX > -10 && chaserX < LANES[0] - 130) speakMarichkaSupport();
  const laneObstacle = obs.find(
    (o) =>
      o.lane === pLane &&
      getRoadObstacleDepth(o) > 0.25 &&
      getRoadObstacleDepth(o) < 0.72 &&
      ["traffic_car", "hole", "kiosk", "scooter", "bollard", "cone", "oil"].includes(o.type),
  );
  if (laneObstacle) {
    speakMarichkaHint(
      laneObstacle.type === "traffic_car" ? "carHint" : "jumpHint",
      680,
    );
  }
  const visibleCoin = coins.find(
    (c) =>
      c.lane === pLane &&
      !c.done &&
      (c.x ?? LANES[c.lane]) > LANES[pLane] + 100 &&
      (c.x ?? LANES[c.lane]) < LANES[pLane] + 260,
  );
  if (visibleCoin && coinCombo === 0) speakMarichkaHint("coinHint", 620);
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

  const baseObstacleInterval = Math.max(
    160 - Math.floor(spd * 6),
    settingDiff === "hard" ? 75 : settingDiff === "easy" ? 118 : 96,
  );
  const interval = Math.ceil(baseObstacleInterval * OBSTACLE_SPAWN_GAP_MULT);
  const startEmpty = fr < START_EMPTY_FRAMES || totalDist < START_EMPTY_DISTANCE;
  const startSafe = fr < START_SAFE_FRAMES || totalDist < START_SAFE_DISTANCE;
  updateRoadEvent(startSafe);
  updateChaseMode(startSafe);
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    fr % interval === 0 &&
    totalDist < FDIST - 100
  )
    spawnObs();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    fr % 540 === 160 &&
    totalDist > 90 &&
    totalDist < FDIST - 150
  )
    spawnCrosswalk();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    fr % 460 === 260 &&
    totalDist > 120 &&
    totalDist < FDIST - 170
  )
    spawnTrafficCar();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startEmpty &&
    fr > 70 &&
    fr % 110 === 0 &&
    totalDist < FDIST - 50
  )
    spawnCoin();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    fr % 620 === 180 &&
    totalDist > 80 &&
    totalDist < FDIST - 160
  )
    spawnMagnet();
  if (
    currentLocation === 0 &&
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    chestnutTimer <= 0 &&
    fr % 720 === 260 &&
    totalDist > 110 &&
    totalDist < FDIST - 170
  )
    spawnChestnut();
  if (
    currentLocation === 1 &&
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    coffeeTimer <= 0 &&
    fr % 720 === 260 &&
    totalDist > 110 &&
    totalDist < FDIST - 170
  )
    spawnCoffee();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
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
    !startSafe &&
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
    !startSafe &&
    rescueBusTimer <= 0 &&
    fr % 980 === 440 &&
    totalDist > 160 &&
    totalDist < FDIST - 220
  )
    spawnRescueBus();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    fr % 260 === 80 &&
    totalDist < FDIST - 80
  )
    spawnCityGift(false);
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    fr % 780 === 220 &&
    totalDist < FDIST - 120
  )
    spawnCityGift(true);
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    fr % 900 === 520 &&
    totalDist > 130 &&
    totalDist < FDIST - 170
  )
    spawnPostcard();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    isRoadEvent("kyiv_traffic") &&
    fr % 210 === 70 &&
    totalDist < FDIST - 150
  )
    spawnTrafficCar();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    isRoadEvent("lviv_roadwork") &&
    fr % 145 === 35 &&
    totalDist < FDIST - 120
  )
    spawnObs();
  if (
    !bossActive &&
    !bossDefeated &&
    !secretRoute?.active &&
    !startSafe &&
    isRoadEvent("lviv_tram") &&
    fr % 240 === 80 &&
    totalDist < FDIST - 160
  )
    spawnTrafficCar();

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
    if ((magnetTimer > 0 || chestnutTimer > 0) && (dist < 190 || c.magneted)) {
      c.magneted = true;
      const pull = chestnutTimer > 0 ? 0.2 : 0.16;
      c.x = cx + dx * pull;
      c.y += dy * (chestnutTimer > 0 ? 0.15 : 0.12);
    } else {
      c.magneted = false;
    }
  });
  magnets.forEach((m) => (m.x -= spd));
  chestnuts.forEach((c) => (c.x -= spd));
  coffees.forEach((c) => (c.x -= spd));
  shields.forEach((s) => (s.x -= spd));
  superJumps.forEach((j) => (j.x -= spd));
  rescueBuses.forEach((bus) => (bus.x -= spd + 0.55));
  postcardItems.forEach((item) => (item.x -= spd));
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
  postcardItems = postcardItems.filter((item) => item.x > -40);

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
    b.prevX = b.x;
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
        forceMusicTrackRefresh();
        bossTransform = 120;
        bossX = W + 180;
        totalDist = Math.max(
          totalDist,
          getFinishDistance() - FINISH_APPROACH_DISTANCE - 5,
        );
        finishActive = false;
        finishX = 9999;
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
      const isMinigunTarget = b.type === "minigun" && isMinigunDestroyable(o);
      const isLvivObject =
        currentLocation === 1 &&
        (b.type === "minigun"
          ? isMinigunDestroyable(o)
          : o.type === "kiosk" || o.type === "bollard");
      const laneMatches = isMinigunTarget || b.lane === o.lane;
      if (hitTarget || !laneMatches || (!isEnemy && !isLvivObject)) return true;
      const br =
        b.type === "minigun"
          ? {
              x: Math.min(b.prevX ?? b.x, b.x) - 24,
              y: GND - 96,
              w: Math.abs(b.x - (b.prevX ?? b.x)) + 62,
              h: 118,
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
  chestnuts = chestnuts.filter((c) => c.x > -50);
  coffees = coffees.filter((c) => c.x > -50);
  shields = shields.filter((s) => s.x > -50);
  superJumps = superJumps.filter((j) => j.x > -50);
  rescueBuses = rescueBuses.filter((bus) => bus.x > -80);
  cityGifts = cityGifts.filter((gift) => gift.life > 0 && gift.x > -30);

  const pr = pRect(),
    px = LANES[pLane];
  magnets = magnets.filter((m) => {
    if (m.lane !== pLane) return true;
    const point = getSmallRoadPoint(m, 36);
    const mr = {
      x: point.x - 22 * point.scale,
      y: point.y - 24 * point.scale,
      w: 44 * point.scale,
      h: 48 * point.scale,
    };
    if (!hit(pr, mr)) return true;
    collectBackpackBonus("magnet", point.x, point.y, "#62d6ff");
    return false;
  });
  chestnuts = chestnuts.filter((c) => {
    if (c.lane !== pLane) return true;
    const point = getSmallRoadPoint(c, 38);
    const cr = {
      x: point.x - 24 * point.scale,
      y: point.y - 26 * point.scale,
      w: 48 * point.scale,
      h: 52 * point.scale,
    };
    if (!hit(pr, cr)) return true;
    chestnutTimer = Math.max(chestnutTimer, 600);
    magnetTimer = Math.max(magnetTimer, 260);
    sfxCoin();
    addParts(point.x, point.y, "#ffd45c");
    showAndriiBubble("\u041a\u0438\u0457\u0432\u0441\u044c\u043a\u0438\u0439 \u043a\u0430\u0448\u0442\u0430\u043d! \u041c\u043e\u043d\u0435\u0442\u0438 x2!");
    hudUp();
    return false;
  });
  coffees = coffees.filter((c) => {
    if (c.lane !== pLane) return true;
    const point = getSmallRoadPoint(c, 38);
    const cr = {
      x: point.x - 24 * point.scale,
      y: point.y - 26 * point.scale,
      w: 48 * point.scale,
      h: 52 * point.scale,
    };
    if (!hit(pr, cr)) return true;
    coffeeTimer = Math.max(coffeeTimer, 520);
    runCoins += 15;
    addQuestProgress("coins", 15);
    addLevelMissionProgress("coins", 15);
    sfxCoin();
    addParts(point.x, point.y, "#d99a48");
    showAndriiBubble("\u041b\u044c\u0432\u0456\u0432\u0441\u044c\u043a\u0430 \u043a\u0430\u0432\u0430! +15\u20b4 \u0456 \u0448\u0432\u0438\u0434\u0448\u0438\u0439 \u0440\u0438\u0432\u043e\u043a!");
    hudUp();
    return false;
  });
  shields = shields.filter((s) => {
    if (s.lane !== pLane) return true;
    const point = getSmallRoadPoint(s, 38);
    const sr = {
      x: point.x - 22 * point.scale,
      y: point.y - 24 * point.scale,
      w: 44 * point.scale,
      h: 48 * point.scale,
    };
    if (!hit(pr, sr)) return true;
    collectBackpackBonus("shield", point.x, point.y, "#58beff");
    return false;
  });
  superJumps = superJumps.filter((j) => {
    if (j.lane !== pLane) return true;
    const point = getSmallRoadPoint(j, 40);
    const jr = {
      x: point.x - 22 * point.scale,
      y: point.y - 25 * point.scale,
      w: 44 * point.scale,
      h: 50 * point.scale,
    };
    if (!hit(pr, jr)) return true;
    collectBackpackBonus("jump", point.x, point.y, "#fff36a");
    return false;
  });
  rescueBuses = rescueBuses.filter((bus) => {
    if (bus.lane !== pLane || !isRoadObjectReady(bus)) return true;
    const point = getSmallRoadPoint(bus, 18);
    const br = {
      x: point.x - 48 * point.scale,
      y: point.y - 58 * point.scale,
      w: 96 * point.scale,
      h: 70 * point.scale,
    };
    if (!hit(pr, br)) return true;
    rescueBusTimer = Math.max(rescueBusTimer, 330);
    runCoins += 20;
    addQuestProgress("coins", 20);
    addLevelMissionProgress("coins", 20);
    totalDist = Math.min(getFinishDistance() - 65, totalDist + 35);
    obs = obs.filter((o) => Math.abs(o.x - bus.x) > 210 || o.lane !== bus.lane);
    sfxCoin();
    addParts(point.x, point.y, "#f5c542");
    addParts(LANES[pLane], pY - 30, "#9fd8ff");
    showAndriiBubble("\u0410\u0432\u0442\u043e\u0431\u0443\u0441 \u043f\u0456\u0434\u0432\u0456\u0437! +20\u20b4");
    hudUp();
    return false;
  });
  cityGifts = cityGifts.filter((gift) => {
    const gr = { x: gift.x - 16, y: gift.y - 16, w: 32, h: 32 };
    if (!hit(pr, gr)) return true;
    if (gift.kind === "shield") {
      shieldCharges = Math.min(getMaxShieldCharges(), shieldCharges + 1);
      addParts(gift.x, gift.y, "#58beff");
      showAndriiBubble("\u041b\u044e\u0434\u0438 \u0443 \u0432\u0456\u043a\u043d\u0430\u0445 \u0434\u0430\u043b\u0438 \u0449\u0438\u0442!");
    } else {
      runCoins += gift.value;
      addQuestProgress("coins", gift.value);
      addLevelMissionProgress("coins", gift.value);
      addParts(gift.x, gift.y, gift.secret ? "#ffd45c" : "#ffd700");
    }
    sfxCoin();
    hudUp();
    return false;
  });

  // перевірка куль
  postcardItems = postcardItems.filter((item) => {
    if (item.lane !== pLane) return true;
    const card = CITY_POSTCARDS.find((entry) => entry.id === item.cardId);
    const prc = { x: item.x - 22, y: item.y - 24, w: 44, h: 48 };
    if (!card || !hit(pr, prc)) return true;
    const firstTime = !postcards[card.id];
    postcards[card.id] = true;
    if (firstTime) {
      runCoins += 25;
      addQuestProgress("coins", 25);
      addLevelMissionProgress("coins", 25);
      showAndriiBubble("Листівка: " + card.title + " +25 монет");
    }
    sfxCoin();
    addParts(item.x, item.y, card.color);
    saveGame();
    hudUp();
    return false;
  });

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
      markChaseHit();
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
    if (
      ["hole", "puddle", "oil", "cone", "scooter", "traffic_car"].includes(o.type) &&
      !isRoadObjectReady(o)
    )
      return;
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
    if (o.type === "oil") {
      if (!o.triggered && hit(pr, oRect(o))) {
        o.triggered = true;
        if (pY < GND - 42) return;
        const drift = pLane === 0 ? 1 : pLane === 2 ? -1 : Math.random() < 0.5 ? -1 : 1;
        pLane = Math.max(0, Math.min(2, pLane + drift));
        pSlide = true;
        slideT = Math.max(slideT, 30);
        puddleSlow = Math.max(puddleSlow, 28);
        resetTrickCombo();
        addParts(px, GND - 6, "#22242d");
        addParts(LANES[pLane], GND - 10, "#8aecff");
        sfxLand();
        showAndriiBubble("Обережно, масло!");
      }
      return;
    }
    if (o.type === "crosswalk") {
      if (!hit(pr, oRect(o))) return;
      if (o.green) {
        if (!o.rewarded) {
          o.rewarded = true;
          runCoins += 10;
          addQuestProgress("coins", 10);
          addLevelMissionProgress("coins", 10);
          addLevelMissionProgress("greenCrosswalks");
          addParts(px, GND - 24, "#55ff91");
          sfxCoin();
          showAndriiBubble(gt("trafficGreen"));
          hudUp();
        }
        return;
      }
      if (pY < GND - 42) {
        if (!o.rewarded) {
          o.rewarded = true;
          addParts(px, GND - 36, "#ffd700");
          showAndriiBubble(gt("trafficJump"));
        }
        return;
      }
    }
    if (o.type === "hole" && pY < GND - 46) return;
    if (o.type === "cone" && pY < GND - 42) return;
    if (pSlide && o.type === "bollard") return;
    if (pY < GND - 50 && o.type === "kiosk") return;
    if (pY < GND - 48 && o.type === "scooter") return;
    if (pY < GND - 64 && o.type === "traffic_car") {
      const carRect = oRect(o);
      if (!o.rewarded && carRect.x < px + 28 && carRect.x + carRect.w > px - 28) {
        o.rewarded = true;
        addLevelMissionProgress("trafficCars");
        addParts(px, GND - 55, "#9fd8ff");
        showAndriiBubble(gt("trafficCarJump"));
      }
      return;
    }
    if (hit(pr, oRect(o)) && inv === 0) {
      if (absorbShieldHit(o.x, GND - 28, "#58beff")) {
        o.x = -100;
        return;
      }
      resetCoinCombo();
      resetTrickCombo();
      markChaseHit();
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
    const point = getSmallRoadPoint(c, 16);
    const coinX = point.x;
    const coinY = point.y;
    const cr = {
      x: coinX - 18 * point.scale,
      y: coinY - 26 * point.scale,
      w: 36 * point.scale,
      h: 52 * point.scale,
    };
    if (hit(pr, cr)) {
      const dangerPct = Math.min(
        Math.max((chaserX + 100) / (LANES[0] - 80), 0),
        1,
      );
      const dangerMult = dangerPct > 0.45 ? 2 : 1;
      const chestnutMult = chestnutTimer > 0 ? 2 : 1;
      const comboMult = registerCoinCombo();
      const trickMult = registerTrickCoinCombo();
      const mult = dangerMult * comboMult * trickMult * chestnutMult;
      addQuestProgress("coins", mult);
      addMarichkaChainProgress("coins", mult);
      addLevelMissionProgress("coins", mult);
      runCoins += mult;
      score += mult * 25;
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
      if (chestnutMult > 1) {
        addParts(coinX, coinY - 44, "#8b4a24");
      }
      return false;
    }
    return true;
  });
  if (fr % 15 === 0) hudUp();
}

function logFrameGuard(label, error, item = null) {
  if (fr % 180 !== 0) return;
  console.warn("Kyiv Runner frame guard", label, error, item || "");
}
function safeCall(label, fn) {
  try {
    return fn();
  } catch (error) {
    logFrameGuard(label, error);
    return null;
  }
}
function safeDrawEach(label, list, drawFn) {
  if (!Array.isArray(list)) return list;
  for (let i = list.length - 1; i >= 0; i--) {
    try {
      drawFn(list[i]);
    } catch (error) {
      logFrameGuard(label, error, list[i]);
      list.splice(i, 1);
    }
  }
  return list;
}
function recoverGameLoop(reason) {
  if (gameState === "stopped" || loopActive) return;
  logFrameGuard("loop", reason);
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}
window.addEventListener("error", (event) => {
  recoverGameLoop(event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  recoverGameLoop(event.reason);
});
function loop() {
  if (gameState === "stopped") return;
  raf = null;
  loopActive = true;
  try {
    ctx.clearRect(0, 0, W, H);
    if (gameState === "story") {
      safeCall("story-panel", updateEndPanel);
      safeCall("story-scene", () => {
        if (tckScene?.kind === "marichka_project") drawMarichkaProjectScene();
        else drawTckScene();
      });
      safeCall("story-update", update);
      return;
    }
    safeCall("background", drawBG);
    safeCall("secret-entrance", drawSecretRouteEntrance);
    safeCall("finish", drawFinishLine);
    superJumps = safeDrawEach("superJumps", superJumps, drawSuperJumpItem);
    rescueBuses = safeDrawEach("rescueBuses", rescueBuses, drawRescueBus);
    shields = safeDrawEach("shields", shields, drawShieldItem);
    coffees = safeDrawEach("coffees", coffees, drawCoffeePower);
    chestnuts = safeDrawEach("chestnuts", chestnuts, drawChestnutPower);
    magnets = safeDrawEach("magnets", magnets, drawMagnet);
    coins = safeDrawEach("coins", coins, drawCoin);
    postcardItems = safeDrawEach("postcards", postcardItems, drawPostcardItem);
    cityGifts = safeDrawEach("cityGifts", cityGifts, drawCityGift);
    obs = safeDrawEach("obstacles", obs, drawObs);
    safeCall("boss", drawKyivBoss);
    safeCall("chaser", drawChaser);
    safeCall("school-pursuers", drawSchoolPursuersScene);
    safeCall("school-marichka", drawSchoolMarichkaScene);
    safeCall("player", drawPlayer);
    safeCall("school-finale", drawSchoolFinaleScene);
    safeCall("shield-aura", drawPlayerShieldAura);
    safeCall("superjump-aura", drawSuperJumpAura);
    safeCall("rain", drawRain);
    safeCall("secret-foreground", drawSecretTunnelForeground);
    safeCall("parts", drawParts);
    safeCall("bullets", drawBullets);
    safeCall("bubble", drawAndriiBubble);
    if (gameState === "run" || gameState === "paused") {
      safeCall("hud", drawHUDCanvas);
      safeCall("distance", drawDistBar);
      safeCall("start-phase", drawStartPhaseBanner);
      safeCall("secret-hud", drawSecretRouteHUD);
      safeCall("road-event", drawRoadEventBanner);
      safeCall("chase", drawChaseBanner);
      safeCall("achievement-toast", drawAchievementToast);
    }
    if (gameState === "win") {
      safeCall("confetti", drawConfetti);
      safeCall("win", drawWinOverlay);
    }
    if (gameState === "levelClear") {
      safeCall("confetti-clear", drawConfetti);
      safeCall("level-clear", drawLevelClearOverlay);
    }
    if (gameState === "missionIntro") safeCall("mission-intro", drawLevelMissionIntroOverlay);
    if (gameState === "idle" || gameState === "over") safeCall("overlay", drawOverlay);
    safeCall("end-panel", updateEndPanel);
    safeCall("pause-panel", updatePausePanel);
    if (gameState !== "paused") {
      safeCall("update", update);
    }
  } catch (error) {
    logFrameGuard("loop", error);
  } finally {
    loopActive = false;
    if (gameState !== "stopped") raf = requestAnimationFrame(loop);
  }
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
  const text = formatActiveCharacterText(lines[Math.floor(Math.random() * lines.length)]);
  bubbleText = text;
  bubbleTimer = 260;
  speakAndWait(text);
}
function speakSceneLine(line) {
  cancelSpeech();
  bubbleText = line.text;
  bubbleTimer = 640;
  speakAndWait(line.text, line.voiceLanguage || "uk").then(() => {
    if (!tckScene || tckScene.line !== line) return;
    tckScene.spoken = false;
    tckScene.waitUntil = tckScene.frame + 90;
  });
}
function _doSpeakAndrii(lines) {
  const text = formatActiveCharacterText(lines[Math.floor(Math.random() * lines.length)]);
  showAndriiBubble(text);
  speakAndWait(text);
}
function speakMarichkaSupport() {
  if (marichkaVoiceCooldown > 0 || bubbleTimer > 0 || gameState !== "run") return;
  const text = formatActiveCharacterText(getMarichkaLine("run"));
  marichkaVoiceCooldown = 900;
  bubbleText = getMarichkaLine("name") + ": " + text;
  bubbleTimer = 170;
  speakAndWait(text, settingRobotVoiceLang);
}
function speakMarichkaHint(key, cooldown = 640) {
  if (marichkaVoiceCooldown > 0 || bubbleTimer > 0 || gameState !== "run") return;
  const text = formatActiveCharacterText(getMarichkaLine(key));
  if (!text) return;
  marichkaVoiceCooldown = cooldown;
  bubbleText = getMarichkaLine("name") + ": " + text;
  bubbleTimer = 160;
  speakAndWait(text, settingRobotVoiceLang);
}

// Bubble над гравцем
let bubbleText = "",
  bubbleTimer = 0,
  bubbleQuietTimer = 0,
  bubbleQueue = [];
function enqueueBubbleText(text) {
  if (!text || bubbleQueue.length >= 4) return;
  if (bubbleText === text || bubbleQueue[bubbleQueue.length - 1] === text) return;
  bubbleQueue.push(text);
}
function activateBubbleText(text, duration = 130) {
  bubbleText = text;
  bubbleTimer = duration;
}
function showAndriiBubble(text, force = false) {
  if (gameState === "over") {
    bubbleText = "";
    bubbleTimer = 0;
    bubbleQueue = [];
    return;
  }
  const formatted = formatActiveCharacterText(text);
  if (!formatted) return;
  if (force) {
    bubbleQueue = [];
    bubbleQuietTimer = 0;
    activateBubbleText(formatted);
    return;
  }
  if (gameState === "run") {
    if (bubbleTimer > 0 || bubbleQuietTimer > 0) {
      enqueueBubbleText(formatted);
      return;
    }
    bubbleQuietTimer = 90;
  }
  activateBubbleText(formatted);
}
function drawAndriiBubble() {
  if (gameState === "over") {
    bubbleText = "";
    bubbleTimer = 0;
    bubbleQueue = [];
    return;
  }
  if (bubbleTimer <= 0) {
    const nextBubble = bubbleQueue.shift();
    if (!nextBubble) return;
    activateBubbleText(nextBubble);
  }
  bubbleTimer--;
  const x = LANES[pLane],
    y = pY - 112;
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
    "\u041f\u0440\u0438\u0432\u0456\u0442! \u042f \u0420\u043e\u0431\u043e\u0442\u0440\u043e\u043d-9000.",
    "\u0425\u043e\u0447\u0443 \u0440\u043e\u0437\u043f\u043e\u0432\u0456\u0441\u0442\u0438 \u0442\u043e\u0431\u0456 \u043e\u0434\u043d\u0443 \u0432\u0430\u0436\u043b\u0438\u0432\u0443 \u0456\u0441\u0442\u043e\u0440\u0456\u044e...",
    "\u0416\u0438\u0432 \u0441\u043e\u0431\u0456 \u0445\u043b\u043e\u043f\u0435\u0446\u044c \u043d\u0430 \u0456\u043c\u0027\u044f \u0410\u043d\u0434\u0440\u0456\u0439.",
    "\u0417\u0432\u0438\u0447\u0430\u0439\u043d\u0438\u0439 \u043a\u0438\u0457\u0432\u0441\u044c\u043a\u0438\u0439 \u0448\u043a\u043e\u043b\u044f\u0440 \u2014 \u0434\u043e\u0431\u0440\u0438\u0439 \u0456 \u0432\u0435\u0441\u0435\u043b\u0438\u0439.",
    "\u041a\u043e\u0436\u043d\u043e\u0433\u043e \u0440\u0430\u043d\u043a\u0443 \u0432\u0456\u043d \u0431\u0456\u0433 \u043d\u0430 \u0443\u0440\u043e\u043a\u0438 \u0432\u0443\u043b\u0438\u0446\u044f\u043c\u0438 \u043c\u0456\u0441\u0442\u0430.",
    "\u0410\u043b\u0435 \u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456 \u0449\u043e\u0441\u044c \u043f\u0456\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a...",
    "\u041e\u0445\u043e\u0440\u043e\u043d\u0446\u0456 \u0432\u0438\u0440\u0456\u0448\u0438\u043b\u0438 \u0439\u043e\u0433\u043e \u0437\u0443\u043f\u0438\u043d\u0438\u0442\u0438!",
    "\u0410\u043d\u0434\u0440\u0456\u0439 \u043d\u0435 \u0437\u043b\u044f\u043a\u0430\u0432\u0441\u044f.",
    "\u0412\u0456\u043d \u043f\u043e\u0431\u0456\u0433 \u2014 \u0448\u0432\u0438\u0434\u043a\u043e, \u0441\u043f\u0440\u0438\u0442\u043d\u043e, \u0445\u043e\u0440\u043e\u0431\u0440\u043e!",
    "\u0414\u043e\u043f\u043e\u043c\u043e\u0436\u0438 \u0439\u043e\u043c\u0443 \u0434\u043e\u0431\u0456\u0433\u0442\u0438 \u0434\u043e \u0444\u0456\u043d\u0456\u0448\u0443.",
    "\u0421\u043b\u0430\u0432\u0430 \u0423\u043a\u0440\u0430\u0457\u043d\u0456!",
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
  ix.fill();
  ix.beginPath();
  ix.arc(cx + 24, hy + 20, 7, 0, Math.PI * 2);
  ix.fill();
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
  ix.fillText("ROBOTRON-9000", cx, IH - 6);
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
      iTypedText + (iCharIdx < full.length ? "\u258b" : "");
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
  const cleanText = normalizeSpeechText(text);

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

window.addEventListener("kyiv-runner:finish-intro", () => {
  window.__kyivRunnerFinishIntroRequested = false;
  focusApp();
  finishIntro();
});

if (window.__kyivRunnerFinishIntroRequested) {
  window.__kyivRunnerFinishIntroRequested = false;
  focusApp();
  finishIntro();
}


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
  window.__kyivRunnerStartIntroRequested = false;
  startIntro();
}
window.addEventListener("kyiv-runner:start-intro", () => {
  focusApp();
  beginIntroAfterGesture();
});
if (window.__kyivRunnerStartIntroRequested) beginIntroAfterGesture();
const introAutoStartTimer = window.setTimeout(() => {
  const introScreen = document.getElementById("sIntro");
  if (!introStarted && introScreen?.classList.contains("active")) startIntro();
}, 1200);
drawBot(0, false);
document.getElementById("introSubtitle").textContent =
  "\u041d\u0430\u0442\u0438\u0441\u043d\u0438 \u043d\u0430 \u0435\u043a\u0440\u0430\u043d, \u0449\u043e\u0431 \u043f\u043e\u0447\u0430\u0442\u0438.";
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
