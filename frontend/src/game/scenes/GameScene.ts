import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'GAME',
      { fontSize: '48px', color: '#ffffff' }
    ).setOrigin(0.5);
  }
}
