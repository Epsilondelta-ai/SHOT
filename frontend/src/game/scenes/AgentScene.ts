import Phaser from 'phaser';

export class AgentScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AgentScene' });
  }

  create() {
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'AI AGENTS',
      { fontSize: '48px', color: '#ffffff' }
    ).setOrigin(0.5);
  }
}
