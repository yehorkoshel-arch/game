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
    const win = window as Window & {
      __kyivRunnerFinishIntroRequested?: boolean;
      __kyivRunnerStartIntroRequested?: boolean;
      __kyivRunnerLegacyReady?: boolean;
      __kyivRunnerLegacyFailed?: boolean;
    };
    win.__kyivRunnerLegacyReady = false;
    win.__kyivRunnerLegacyFailed = false;
    void import('./legacy/game.js')
      .then(() => {
        win.__kyivRunnerLegacyReady = true;
        window.dispatchEvent(new Event('kyiv-runner:legacy-ready'));
        if (win.__kyivRunnerFinishIntroRequested) {
          window.dispatchEvent(new Event('kyiv-runner:finish-intro'));
        } else if (win.__kyivRunnerStartIntroRequested) {
          window.dispatchEvent(new Event('kyiv-runner:start-intro'));
        }
      })
      .catch((error) => {
        console.error('Kyiv Runner legacy game failed to load', error);
        win.__kyivRunnerLegacyFailed = true;
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
