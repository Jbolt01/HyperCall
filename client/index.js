// TODO: would be better to get camera for facetracking first, then pass it to RTCMultiConnection
// TODO: use state object to app changes (started, videostarted, connected, etc.)

import onChange from 'on-change';
import { createEl, addEl } from 'lmnt';
import autoBind from 'auto-bind';
import FaceMesh from './components/face-mesh';
import FaceDetect from './components/face-detect';
import RTCMultiConnection from './components/RTCMultiConnection';
import Menu from './components/menu';
import About from './components/about';
import './index.scss';

class App {
  constructor() {
    autoBind(this);
    this.search = new URLSearchParams(window.location.search);

    // TODO: implement all these:
    const state = {
      started: false,
      clients: [],
      roomID: null,
      showDepth: false,
      resetView: false,
    };

    this.state = onChange(state, this.update);
    this.el = createEl('div', { className: 'app' });
    this.title = createEl('h1', { className: 'app-title', innerText: 'HyperCall' });
    this.loading = createEl('p', { className: 'app-loading', innerText: 'Loading... (can take up to a minute)' });
    this.menu = new Menu(this.state, this.joinRoom);
    this.about = new About();

    this.streams = [];

    this.faceMesh = new FaceMesh(this.state, this.showMenu);

    this.faceDetect = new FaceDetect(this.faceMesh);

    this.fsButton = createEl('button', { className: 'fullscreen hidden', innerText: 'FULLSCREEN' }, {}, { click: () => {
      this.el.requestFullscreen();
      this.fsButton.classList.add('hidden');
    } });

    document.addEventListener('fullscreenchange', (event) => {
      this.fsButton.classList[document.fullscreenElement ? 'add' : 'remove']('hidden');
      this.faceMesh.finalCanvas.classList[document.fullscreenElement ? 'add' : 'remove']('full');
    });

    addEl(this.el, this.faceMesh.el, this.title, this.loading, this.menu.el, this.about.el, this.fsButton);
    addEl(this.el);
    // load in the tensorflow model
    this.faceDetect.load().then(() => {
    // then get the camera while we load the threejs scene
      this.faceMesh.load().then(() => {
        this.connection = new RTCMultiConnection();
        this.connection.socketURL = 'https://api.hypercall.tech/';
        if (window.location.href.indexOf('localhost') === -1) { this.connection.socketOptions = { path: '/socket.io/' }; }
        this.connection.session = { audio: true, video: true, data: true };
        this.connection.sdpConstraints.mandatory = { OfferToReceiveAudio: true, OfferToReceiveVideo: true };
        this.connection.mediaConstraints = { video: { width: 640, height: 480, frameRate: 30 }, audio: true };
        this.connection.processSdp = (sdp) => {
          const codecs = 'vp8';
          sdp = this.connection.CodecsHandler.preferCodec(sdp, codecs.toLowerCase());
          sdp = this.connection.CodecsHandler.setApplicationSpecificBandwidth(sdp, { audio: 128, video: 512, screen: 512 });
          sdp = this.connection.CodecsHandler.setVideoBitrates(sdp, { min: 512 * 8 * 1024, max: 512 * 8 * 1024 });
          return sdp;
        };
        this.connection.onstream = (e) => {
          if (this.streams.length === 2) return;
          this.streams.push(e);
          if (this.streams.length === 2) {
            this.menu.el.classList.add('hidden');
            this.localVideo.classList.add('corner');
          }
          if (e.type === 'local') {
            this.localVideo = createEl('video', { className: 'video local' });

            e.mediaElement.removeAttribute('src');
            e.mediaElement.removeAttribute('srcObject');
            e.mediaElement.muted = true;
            e.mediaElement.volume = 0;

            try {
              this.localVideo.setAttributeNode(document.createAttribute('autoplay'));
              this.localVideo.setAttributeNode(document.createAttribute('playsinline'));
            } catch (err) {
              this.localVideo.setAttribute('autoplay', true);
              this.localVideo.setAttribute('playsinline', true);
            }
            this.localVideo.srcObject = e.stream;
            this.localVideo.id = e.streamid;
            addEl(this.el, this.localVideo);
            this.localVideo.volume = 0;

            this.faceDetect.video = this.localVideo;
            this.faceMesh.video = this.localVideo;

            this.faceMesh.segmentCanvas = this.faceDetect.segmentCanvas;
            this.faceMesh.start();
            this.localVideo.addEventListener('loadeddata', () => {
              this.faceDetect.detect();
              this.loading.classList.add('hidden');
            });
          }

          if (e.type === 'remote') {
            console.log('remote stream ready');
            this.remoteVideo = createEl('video', { className: 'video local' });

            e.mediaElement.removeAttribute('src');
            e.mediaElement.removeAttribute('srcObject');
            e.mediaElement.muted = true;
            e.mediaElement.volume = 0;

            try {
              this.remoteVideo.setAttributeNode(document.createAttribute('autoplay'));
              this.remoteVideo.setAttributeNode(document.createAttribute('playsinline'));
            } catch (err) {
              this.remoteVideo.setAttribute('autoplay', true);
              this.remoteVideo.setAttribute('playsinline', true);
            }
            this.remoteVideo.srcObject = e.stream;
            this.remoteVideo.id = e.streamid;

            this.faceDetect.video = this.remoteVideo;
            this.faceMesh.video = this.remoteVideo;

            this.faceMesh.segmentCanvas = this.faceDetect.segmentCanvas;
            this.faceMesh.start();
            this.remoteVideo.addEventListener('loadeddata', () => { this.faceDetect.detect(); });
          }
        };


        if (this.search.get('roomID')) this.joinRoom(this.search.get('roomID'));
        else this.getRoomID().then(this.openRoom);
      });
    });
  }

  getRoomID() {
    return new Promise((resolve) => {
      fetch('https://api.hypercall.tech/createroom').then(res => res.json()).then(({ roomID }) => { resolve(roomID); });
    });
  }

  openRoom(roomID) {
    this.menu.startLink.innerText = `${window.location.origin}/?roomID=${roomID}`;
    const path = `${window.location.origin}/?roomID=${roomID}`;
    window.history.pushState({ path }, '', path);
    this.connection.open(roomID, (isJoinedRoom, roomid, error) => {
      // console.log(isJoinedRoom, roomid, error);
    });
  }

  joinRoom(roomID) {
    this.connection.join(roomID, (isJoinedRoom, roomid, error) => {
      if (!isJoinedRoom) this.openRoom(roomID);
    });
    this.menu.el.classList.add('hidden');
  }

  showMenu() {
    this.menu.el.classList.remove('hidden');
  }

  update(path, current, previous) {
    if (path !== 'faces') {
      console.groupCollapsed('app state changed');
      console.log(`state changed: ${path}`);
      console.log(`previous: ${previous}`);
      console.log(`current: ${current}`);
      console.groupEnd();
    }
    switch (path) {
      case 'showDepth':
        this.faceMesh.toggleDepth(current);
        break;
      case 'resetView':
        if (current) {
          this.faceMesh.resetView();
          this.state.resetView = false;
        }
        break;
      case 'roomID':

        break;
      default:

        break;
    }
  }
}
const app = new App(); //eslint-disable-line
window.app = app;
console.log('Welcome to HyperCall!');
