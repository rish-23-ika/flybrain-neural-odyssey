import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, LevelDefinition, PlayerFlightState, LevelResult } from './types/game';
import { LEVELS } from './game/LevelData';
import { GameCanvas } from './game/GameCanvas';
import { BrainCanvas } from './brain/BrainCanvas';
import { FlyLab } from './brain/FlyLab';
import { NeuralDodgeCanvas } from './brain/NeuralDodgeCanvas';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/HUD';
import { LevelSelectModal } from './components/LevelSelectModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseMenu } from './components/PauseMenu';
import { ControlsGuideModal } from './components/ControlsGuideModal';
import { sound } from './audio/SoundEngine';

export default function App() {
  // Brain-first architecture: start directly in the 3D interactive connectome
  const [mode, setMode] = useState<GameMode>('brain');
  const [currentLevel, setCurrentLevel] = useState<LevelDefinition>(LEVELS[0]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Graphics Quality State (Low: 1.0 DPR & light particles; Medium: 1.25 DPR & balanced; High: 1.5 DPR & full)
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>(() => {
    try {
      const saved = localStorage.getItem('flybrain_quality');
      if (saved === 'low' || saved === 'medium' || saved === 'high') return saved;
    } catch {
      // Ignore
    }
    return 'medium';
  });

  const handleCycleQuality = useCallback(() => {
    setQuality((prev) => {
      const next = prev === 'low' ? 'medium' : prev === 'medium' ? 'high' : 'low';
      try {
        localStorage.setItem('flybrain_quality', next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Modals state
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);

  // Flight Telemetry State for HUD
  const [flightState, setFlightState] = useState<PlayerFlightState>({
    speed: 13,
    maxSpeed: 30,
    boostSpeed: 30,
    isBoosting: false,
    boostEnergy: 100,
    altitude: 9,
    nectarCollected: 0,
    ringsCompleted: 0,
    score: 0,
    timeElapsed: 0,
    nearMisses: 0,
    collisionWarning: false,
  });

  // Victory / Result state
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);

  // High scores loaded from localStorage
  const [highScores, setHighScores] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('flybrain_highscores');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  }, [isMuted]);

  // Start Flight on a given level
  const handleStartFlight = (level: LevelDefinition) => {
    setCurrentLevel(level);
    setIsPaused(false);
    setShowLevelSelect(false);
    setFlightState({
      speed: 13,
      maxSpeed: 30,
      boostSpeed: 30,
      isBoosting: false,
      boostEnergy: 100,
      altitude: 9,
      nectarCollected: 0,
      ringsCompleted: 0,
      score: 0,
      timeElapsed: 0,
      nearMisses: 0,
      collisionWarning: false,
    });
    setMode('flight');
  };

  // Keyboard shortcut for pausing with Escape or P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'flight') {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          setIsPaused((prev) => !prev);
          sound.playUiClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  // Level Complete callback
  const handleLevelComplete = useCallback(
    (stats: { score: number; nectar: number; rings: number; time: number }) => {
      let medal: LevelResult['medal'] = 'bronze';
      if (stats.score >= currentLevel.goldScore) {
        medal = 'gold';
      } else if (stats.score >= currentLevel.silverScore) {
        medal = 'silver';
      }

      const previousBest = highScores[currentLevel.id] || 0;
      const isNewRecord = stats.score > previousBest;

      if (isNewRecord) {
        setHighScores((prev) => {
          const updated = { ...prev, [currentLevel.id]: stats.score };
          try {
            localStorage.setItem('flybrain_highscores', JSON.stringify(updated));
          } catch {
            // Ignore
          }
          return updated;
        });
      }

      setLevelResult({
        levelId: currentLevel.id,
        score: stats.score,
        nectar: stats.nectar,
        rings: stats.rings,
        time: stats.time,
        medal,
        newRecord: isNewRecord,
      });

      setMode('victory');
    },
    [currentLevel, highScores]
  );

  // Next level handler
  const handleNextLevel = () => {
    const currentIndex = LEVELS.findIndex((l) => l.id === currentLevel.id);
    if (currentIndex >= 0 && currentIndex < LEVELS.length - 1) {
      handleStartFlight(LEVELS[currentIndex + 1]);
    } else {
      setMode('menu');
    }
  };

  const handleRetry = () => {
    handleStartFlight(currentLevel);
  };

  const hasNextLevel =
    LEVELS.findIndex((l) => l.id === currentLevel.id) < LEVELS.length - 1;

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#060810] text-slate-100 flex flex-col select-none">
      {/* 1. Main Menu Mode */}
      {mode === 'menu' && (
        <MainMenu
          onStartGame={handleStartFlight}
          onOpenLevelSelect={() => setShowLevelSelect(true)}
          onOpenBrainExplorer={() => {
            sound.playUiClick();
            setMode('brain');
          }}
          onOpenFlyLab={() => {
            sound.playUiClick();
            setMode('flylab');
          }}
          onOpenNeuralDodge={() => {
            sound.playUiClick();
            setMode('neural-dodge');
          }}
          onOpenControlsGuide={() => setShowControlsGuide(true)}
          levels={LEVELS}
          highScores={highScores}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* 2. Flight 3D Game Canvas Mode */}
      {mode === 'flight' && (
        <div className="relative w-full h-full">
          <GameCanvas
            level={currentLevel}
            isPaused={isPaused}
            quality={quality}
            onUpdateHUD={setFlightState}
            onLevelComplete={handleLevelComplete}
            onGameOver={() => setMode('gameover')}
          />

          <HUD
            level={currentLevel}
            flightState={flightState}
            isMuted={isMuted}
            quality={quality}
            onToggleMute={handleToggleMute}
            onCycleQuality={handleCycleQuality}
            onPause={() => setIsPaused(true)}
          />

          {isPaused && (
            <PauseMenu
              onResume={() => setIsPaused(false)}
              onRestart={() => handleStartFlight(currentLevel)}
              onHome={() => {
                sound.stopFlightAudio();
                setMode('menu');
              }}
              isMuted={isMuted}
              quality={quality}
              onToggleMute={handleToggleMute}
              onCycleQuality={handleCycleQuality}
            />
          )}
        </div>
      )}

      {/* 3. Brain Connectome Explorer Mode */}
      {mode === 'brain' && (
        <BrainCanvas
          onBackToMenu={() => {
            sound.playUiClick();
            setMode('menu');
          }}
          onOpenFlyLab={() => {
            sound.playUiClick();
            setMode('flylab');
          }}
          onOpenNeuralDodge={() => {
            sound.playUiClick();
            setMode('neural-dodge');
          }}
          onStartFlight={() => {
            sound.playUiClick();
            handleStartFlight(currentLevel);
          }}
        />
      )}

      {/* 4. FLYLAB - Broken Escape Circuit Experiment */}
      {mode === 'flylab' && (
        <FlyLab
          onBackToMenu={() => {
            sound.playUiClick();
            setMode('menu');
          }}
          onOpenBrainExplorer={() => {
            sound.playUiClick();
            setMode('brain');
          }}
          onOpenNeuralDodge={() => {
            sound.playUiClick();
            setMode('neural-dodge');
          }}
          onStartFlight={() => {
            sound.playUiClick();
            handleStartFlight(currentLevel);
          }}
        />
      )}

      {/* 5. Neural Dodge Challenge Mode */}
      {mode === 'neural-dodge' && (
        <NeuralDodgeCanvas
          onBackToMenu={() => {
            sound.playUiClick();
            setMode('menu');
          }}
          onOpenFlyLab={() => {
            sound.playUiClick();
            setMode('flylab');
          }}
          onOpenBrainExplorer={() => {
            sound.playUiClick();
            setMode('brain');
          }}
          onStartFlight={() => {
            sound.playUiClick();
            handleStartFlight(currentLevel);
          }}
        />
      )}

      {/* 5. Victory / Results Modal */}
      {mode === 'victory' && levelResult && (
        <VictoryModal
          level={currentLevel}
          result={levelResult}
          onNextLevel={handleNextLevel}
          onRetry={handleRetry}
          onHome={() => setMode('menu')}
          hasNextLevel={hasNextLevel}
        />
      )}

      {/* 5. Game Over / Time Expired Modal */}
      {mode === 'gameover' && (
        <GameOverModal
          onRetry={handleRetry}
          onHome={() => setMode('menu')}
        />
      )}

      {/* Modals on top of menu or game */}
      {showLevelSelect && (
        <LevelSelectModal
          levels={LEVELS}
          highScores={highScores}
          onSelectLevel={handleStartFlight}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {showControlsGuide && (
        <ControlsGuideModal onClose={() => setShowControlsGuide(false)} />
      )}
    </div>
  );
}
