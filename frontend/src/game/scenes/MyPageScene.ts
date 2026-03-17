import Phaser from 'phaser';

export class MyPageScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MyPageScene' });
  }

  create() {
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'MY PAGE',
      { fontSize: '48px', color: '#ffffff' }
    ).setOrigin(0.5);
  }
}
