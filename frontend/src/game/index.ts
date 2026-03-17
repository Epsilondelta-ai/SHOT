import Phaser from 'phaser';
import { LobbyScene } from './scenes/LobbyScene';
import { GameScene } from './scenes/GameScene';
import { MyPageScene } from './scenes/MyPageScene';
import { AgentScene } from './scenes/AgentScene';

const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-canvas',
  width: isMobile ? window.innerWidth : 1280,
  height: isMobile ? window.innerHeight : 720,
  backgroundColor: '#111111',
  scene: [LobbyScene, GameScene, MyPageScene, AgentScene],
  scale: {
    mode: isMobile ? Phaser.Scale.FIT : Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'game-canvas',
  },
};

new Phaser.Game(config);
