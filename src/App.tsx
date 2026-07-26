import { useEffect } from 'react';
import { GameScreen } from './components/GameScreen';
import { AchievementScreen } from './components/AchievementScreen';
import { BackpackScreen } from './components/BackpackScreen';
import { CollectionScreen } from './components/CollectionScreen';
import { IntroScreen } from './components/IntroScreen';
import { MenuScreen } from './components/MenuScreen';
import { QuestScreen } from './components/QuestScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ShopScreen } from './components/ShopScreen';

export function App() {
  useEffect(() => {
    (window as Window & { __kyivRunnerLegacyReady?: boolean; __kyivRunnerLegacyFailed?: boolean }).__kyivRunnerLegacyReady = false;
    (window as Window & { __kyivRunnerLegacyReady?: boolean; __kyivRunnerLegacyFailed?: boolean }).__kyivRunnerLegacyFailed = false;
    void import('./legacy/game.js')
      .then(() => {
        (window as Window & { __kyivRunnerLegacyReady?: boolean }).__kyivRunnerLegacyReady = true;
        window.dispatchEvent(new Event('kyiv-runner:legacy-ready'));
      })
      .catch((error) => {
        console.error('Kyiv Runner legacy game failed to load', error);
        (window as Window & { __kyivRunnerLegacyFailed?: boolean }).__kyivRunnerLegacyFailed = true;
        window.dispatchEvent(new Event('kyiv-runner:legacy-failed'));
      });
  }, []);

  return (
    <div id="app" tabIndex={0}>
      <h2 className="sr-only">Kyiv Runner</h2>
      <IntroScreen />
      <MenuScreen />
      <AchievementScreen />
      <BackpackScreen />
      <CollectionScreen />
      <QuestScreen />
      <ShopScreen />
      <SettingsScreen />
      <GameScreen />
    </div>
  );
}
