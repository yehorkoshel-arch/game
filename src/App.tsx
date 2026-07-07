import { useEffect } from 'react';
import { GameScreen } from './components/GameScreen';
import { AchievementScreen } from './components/AchievementScreen';
import { BackpackScreen } from './components/BackpackScreen';
import { IntroScreen } from './components/IntroScreen';
import { MenuScreen } from './components/MenuScreen';
import { QuestScreen } from './components/QuestScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ShopScreen } from './components/ShopScreen';

export function App() {
  useEffect(() => {
    void import('./legacy/game.js');
  }, []);

  return (
    <div id="app" tabIndex={0}>
      <h2 className="sr-only">Kyiv Runner</h2>
      <IntroScreen />
      <MenuScreen />
      <AchievementScreen />
      <BackpackScreen />
      <QuestScreen />
      <ShopScreen />
      <SettingsScreen />
      <GameScreen />
    </div>
  );
}
