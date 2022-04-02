import { addEl, createEl } from 'lmnt';

export default class Menu {
  constructor(state, joinRoom) {
    this.state = state;
    this.joinRoom = joinRoom;
    this.el = createEl('div', { className: 'menu hidden' });

    this.buttons = createEl('div', { className: 'menu-buttons' });
    this.secondary = createEl('div', { className: 'menu-secondary' });

    this.startInfo = createEl('div', { className: 'menu-start-info hidden' });
    this.startText = createEl('p', { className: 'menu-start-info-text', innerText: 'Send this link to a friend:' });
    this.startLinkCopied = createEl('p', { className: 'menu-start-info-copied hidden', innerText: 'Link copied to clipboard' });
    this.startLink = createEl('p', { className: 'menu-start-info-link', innerText: 'http://hypercall.tech/roomID=0000' }, {}, {
      click: () => {
        navigator.clipboard.writeText(this.startLink.innerText);
        this.startLinkCopied.classList.remove('hidden');
        setTimeout(() => { this.startLinkCopied.classList.add('hidden'); }, 3000);
      },
    });
    addEl(this.startInfo, this.startText, this.startLink, this.startLinkCopied);

    this.joinInfo = createEl('div', { className: 'menu-join-info hidden' });
    this.joinText = createEl('p', { className: 'menu-join-info-text', innerText: 'enter the four letter code for the call:' });
    this.joinCode = createEl('input', { className: 'menu-join-info-code', type: 'text', placeholder: 'AAAA' }, { maxlength: 4 }, {
      input: () => {
        this.joinSubmit.classList[this.joinCode.value.length === 4 ? 'remove' : 'add']('disabled');
      },
      keydown: ({ key }) => {
        if (key === 'Enter' && !this.joinSubmit.classList.contains('disabled')) this.joinRoom(this.joinCode.value.toUpperCase());
      },
    });
    this.joinSubmit = createEl('button', { className: 'menu-join-info-submit disabled', innerText: '→' }, {}, {
      click: () => {
        this.joinRoom(this.joinCode.value.toUpperCase());
      },
    });
    addEl(this.joinInfo, this.joinText, this.joinCode, this.joinSubmit);
    this.startButton = createEl('button', { type: 'text', className: 'menu-start', innerText: 'Start Call' }, {}, { click: () => {
      this.startInfo.classList.remove('hidden');
      this.joinInfo.classList.add('hidden');
    } });
    this.joinButton = createEl('button', { type: 'text', className: 'menu-join', innerText: 'Join Call' }, {}, { click: () => {
      this.startInfo.classList.add('hidden');
      this.joinInfo.classList.remove('hidden');
      this.joinCode.focus();
    } });
    addEl(this.buttons, this.startButton, this.startInfo, this.joinInfo, this.joinButton);


    this.toggleDepthMap = createEl('button', { className: 'menu-secondary-depth', innerText: 'toggle depth map' }, {}, { click: () => { this.state.showDepth = !this.state.showDepth; } });
    this.resetCamera = createEl('button', { className: 'menu-secondary-reset', innerText: 'reset view' }, {}, { click: () => { this.state.resetView = true; } });
    addEl(this.secondary, this.toggleDepthMap, this.resetCamera);
    addEl(this.el, this.buttons, this.secondary);
  }
}
