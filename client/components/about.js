import { addEl, createEl } from 'lmnt';

export default class About {
  constructor() {
    this.el = createEl('div', { className: 'about hidden' });
    this.back = createEl('div', { className: 'about-back' }, {}, { click: () => { this.el.classList.add('hidden'); } });
    this.icon = createEl('div', { className: 'about-icon', innerText: 'i' }, {}, { click: () => { this.el.classList.remove('hidden'); } });
    this.modal = createEl('div', { className: 'about-modal',
      innerHTML:
    'HyperCall is a 3D video calling solution created by <a target="_blank" href="https://www.vijayrs.com/">Vijay Shanmugam</a>, <a target="_blank" href="https://github.com/fraendt/">Patrick Zhang</a>, & <a target="_blank" href="https://mci.sh/">Michael Ilie</a>. '
    + 'It is a web application that allows you to call people in 3D space, and share your camera with them. '
    + 'It is built on top of <a target="_blank" href="https://google.github.io/mediapipe">MediaPipe</a>, and WebRTC. '
  + 'Source: <a target="_blank" href="https://github.com/Jbolt01/HyperCall">https://github.com/Jbolt01/HyperCall</a>' });

    addEl(this.el, this.back, this.icon, this.modal);
  }
}
