import Phaser from 'phaser';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  create() {
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'LOBBY',
      { fontSize: '48px', color: '#ffffff' }
    ).setOrigin(0.5);
  }
}
