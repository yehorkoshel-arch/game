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
import { TutorialScreen } from './components/TutorialScreen';

export function App() {
  useEffect(() => {
    const viewportWindow = window as Window & {
      __updateKyivRunnerViewport?: () => void;
    };
    if (viewportWindow.__updateKyivRunnerViewport) {
      viewportWindow.__updateKyivRunnerViewport();
      return undefined;
    }
    
    const VIRTUAL_WIDTH = 680;
    const VIRTUAL_HEIGHT = 520;
    const updateStageScale = () => {
      const viewportWidth = window.visualViewport?.width || window.innerWidth || VIRTUAL_WIDTH;
      const viewportHeight = window.visualViewport?.height || window.innerHeight || VIRTUAL_HEIGHT;
      const scale = Math.max(0.1, Math.min(viewportWidth / VIRTUAL_WIDTH, viewportHeight / VIRTUAL_HEIGHT));
      document.documentElement.style.setProperty('--kyiv-runner-scale', String(scale));
      document.documentElement.style.setProperty('--kyiv-runner-stage-width', `${Math.round(VIRTUAL_WIDTH * scale)}px`);
      document.documentElement.style.setProperty('--kyiv-runner-stage-height', `${Math.round(VIRTUAL_HEIGHT * scale)}px`);
    };

    updateStageScale();
    window.addEventListener('resize', updateStageScale);
    window.addEventListener('orientationchange', updateStageScale);
    window.visualViewport?.addEventListener('resize', updateStageScale);
    return () => {
      window.removeEventListener('resize', updateStageScale);
      window.removeEventListener('orientationchange', updateStageScale);
      window.visualViewport?.removeEventListener('resize', updateStageScale);
    };
  }, []);

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
      <h2 className="sr-only" id="appTitle">Kyiv Runner</h2>
      <TutorialScreen />
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
