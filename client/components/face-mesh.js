import autoBind from 'auto-bind';
import { addEl, createEl } from 'lmnt';
import { Easing, Tween, autoPlay } from 'es6-tween';
import OrbitControls from './orbitcontrols';
import FBXLoader from './fbxloader';
import * as THREE from './three';
import * as HoloPlay from './holoplay.module';

import { keypointPositionMap } from './keypoints';
import { getClosestVertex } from './utils';

const keypointPositionArray = new Array(476).fill({ x: null, y: null });
keypointPositionMap.forEach(({ index, loc }) => {
  keypointPositionArray[index] = loc;
});


export default class FaceMesh {
  constructor(state, showMenu) {
    autoBind(this);
    autoPlay(true);
    this.showMenu = showMenu;
    this.debug = new URLSearchParams(window.location.search).get('debug');
    this.skipIntro = new URLSearchParams(window.location.search).has('skipIntro');
    this.state = state;

    this.started = false;
    this.rotationTarget = new THREE.Vector3(0, Math.PI, 0);
    this.fakeCursorPosition = { x: 0, y: 0 };
    this.fakeCursor = createEl('div', { className: 'facemesh-cursor' });
    this.instructionsScreen = createEl('div', { className: 'instructions-screen hidden', innerText: 'click and drag to look around' });
    this.instructionsGlass = createEl('div', { className: 'instructions-glass hidden', innerHTML: 'drag this window into a <a href=\'https://lookingglassfactory.com/\'>Looking Glass</a>' });
    this.keypointMapping = new Array(476);
    this.keypointMapping2 = new Array(1428);

    this.depthScene = new THREE.Scene();
    this.depthScene.background = new THREE.Color('rgb(128, 128, 128)');
    const near = 2000;
    const far = 1800;
    this.depthCamera = new THREE.OrthographicCamera(640 / -2, 640 / 2, 480 / 2, 480 / -2, near, far);
    this.depthCamera.position.set(0, 0, 3600);


    this.segmentPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(640, 480, 100, 100),
      new THREE.MeshBasicMaterial({ wireframe: false, side: THREE.BackSide }),
    );
    this.segmentPlane.position.x = 320;
    this.segmentPlane.position.y = -240;
    this.segmentPlane.position.z = 0;
    this.segmentPlane.rotation.x = Math.PI;
    this.depthScene.add(this.segmentPlane);

    this.depthRenderer = new THREE.WebGLRenderer({ antialias: false });
    this.depthRenderer.setSize(512, 512);
    this.depthCanvas = this.depthRenderer.domElement;
    this.depthCanvas.className = 'facemesh-depth hidden';

    this.camera = new HoloPlay.Camera();

    this.renderer = new HoloPlay.Renderer({ disableFullscreenUi: false, render2d: true });
    this.finalCanvas = this.renderer.domElement;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enabled = false;

    this.finalCanvas.className = 'facemesh-final screen';
    this.finalCanvas.addEventListener('nodevice', () => {
      this.renderer.render2d = true;
      this.renderer.renderQuilt = false;
      this.finalCanvas.className = 'facemesh-final screen';
    });
    this.renderer.domElement.addEventListener('inscreen', () => {
      this.state.inGlass = true;
      this.renderer.render2d = false;
      this.renderer.renderQuilt = false;
      this.finalCanvas.className = 'facemesh-final glass';
      document.getElementsByTagName('html')[0].style.fontSize = '16px';
      this.resetView();
    });
    this.renderer.domElement.addEventListener('outscreen', () => {
      this.state.inGlass = false;
      this.renderer.render2d = true;
      this.finalCanvas.className = 'facemesh-final screen';
      document.getElementsByTagName('html')[0].style.fontSize = '6px';
    });
    this.scene = new THREE.Scene();

    this.canvasTexture = new THREE.CanvasTexture(this.depthRenderer.domElement);

    this.finalPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.24, 640 / 10, 480 / 10),
     
      new THREE.MeshPhongMaterial({
        wireframe: false,
        emissive: new THREE.Color('0xFFFFFF'),
        displacementScale: -0.25,
        displacementMap: this.canvasTexture,
        side: THREE.BackSide,
      }),
    );
    this.finalPlane.rotation.y = Math.PI;
    this.finalPlane.position.z = -0.15;
    this.finalPlane.scale.set(1.05, 1.05, 1.05);
    this.scene.add(this.finalPlane);

    this.el = createEl('div', { className: 'facemesh' });
    addEl(this.el, this.renderer.domElement, this.depthRenderer.domElement);

    addEl(this.el, this.fakeCursor, this.instructionsScreen, this.instructionsGlass);
    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const scale = (window.innerHeight / 512);
    this.depthCanvas.style.transform = `translate(-50%, -50%) scale(${scale * -1.33},${scale})`;
  }

  resetView() {
    console.log('reset camera');
    // reset camera:
    new Tween(this.camera.position).to({ x: 0, y: 0, z: 1 }, 2000).easing(Easing.Quadratic.InOut).start();
    new Tween(this.controls.target).to({ x: 0, y: 0, z: 0 }, 2000).easing(Easing.Quadratic.InOut).start();
  }

  load() {
    return new Promise((resolve) => {
      const loader = new FBXLoader();
      loader.load('assets/facemesh.fbx', (obj) => {
        this.facemesh = obj.getObjectByName('FaceMesh');

        
        this.facemesh.geometry = new THREE.Geometry().fromBufferGeometry(this.facemesh.geometry);
        this.facemesh.geometry.mergeVertices();
        this.facemesh.geometry.vertices.forEach(({ x, y }, index) => {
          const closestVertex = getClosestVertex(x, y, keypointPositionArray);
          this.keypointMapping[closestVertex] = index;
        });
        this.foreheadVerts = [2, 4, 6, 8, 10, 250, 252, 254, 256];

        this.facemesh.material = new THREE.MeshDepthMaterial({ wireframe: false });
        this.depthScene.add(this.facemesh);
        resolve();
      });

    });
  }


  toggleDepth(current) {
    this.finalCanvas.classList[current ? 'add' : 'remove']('hidden');
    this.depthCanvas.classList[current ? 'remove' : 'add']('hidden');
  }

  start() {
    this.segmentTexture = new THREE.CanvasTexture(this.segmentCanvas);
    this.segmentPlane.material.map = this.segmentTexture;

    this.vidTexture = new THREE.VideoTexture(this.video);
    
    this.finalPlane.material.emissiveMap = this.vidTexture;
    this.depthCamera.position.set(640 / 2, -480 / 2, 480 * 3.75);

    this.render();
  }

  introAnimation() {
    if (this.skipIntro) {
      this.controls.enabled = true;
      this.showMenu();
      return;
    }

    // reset:
    this.controls.enabled = false;
    this.fakeCursor.style.opacity = 1;
    this.fakeCursorPosition = { x: 0, y: 50 };
    this.fakeCursor.style.transform = 'translate(0, 50px)';
    new Tween(this.finalPlane.rotation).to({ x: 0, y: Math.PI }, 250).easing(Easing.Quadratic.InOut).start();
    new Tween(this.camera.position).to({ x: 0, y: 0, z: 1 }, 250).easing(Easing.Quadratic.InOut).start();
    new Tween(this.fakeCursorPosition).to({ x: 0, y: 0 }, 250).easing(Easing.Quadratic.InOut).on('update', ({ x, y }) => { this.fakeCursor.style.transform = `translate(${x}px, ${y}px)`; }).start();

    // drag right
    setTimeout(() => { this.instructionsScreen.classList.remove('hidden'); });
    new Tween(this.finalPlane.rotation).to({ y: Math.PI + 0.35 }, 2000).delay(1000).easing(Easing.Quadratic.InOut).start();
    new Tween(this.fakeCursorPosition).to({ x: 100, y: 0 }, 2000).delay(1000).easing(Easing.Quadratic.InOut).on('update', ({ x, y }) => { this.fakeCursor.style.transform = `translate(${x}px, ${y}px)`; }).start();

    // drag left
    new Tween(this.finalPlane.rotation).to({ y: Math.PI - 0.2 }, 1500).delay(3250).easing(Easing.Quadratic.InOut).start();
    new Tween(this.fakeCursorPosition).to({ x: -50, y: 0 }, 1500).delay(3250).easing(Easing.Quadratic.InOut).on('update', ({ x, y }) => { this.fakeCursor.style.transform = `translate(${x}px, ${y}px)`; }).start();

    // drag down
    new Tween(this.finalPlane.rotation).to({ x: 0.25, y: Math.PI }, 800).delay(5000).easing(Easing.Quadratic.InOut).start();
    new Tween(this.fakeCursorPosition).to({ x: 0, y: 50 }, 800).delay(5000).easing(Easing.Quadratic.InOut).on('update', ({ x, y }) => { this.fakeCursor.style.transform = `translate(${x}px, ${y}px)`; }).start();

    // reset
    new Tween(this.finalPlane.rotation).to({ x: 0, y: Math.PI }, 800).delay(5800).easing(Easing.Quadratic.InOut).start();
    new Tween(this.fakeCursorPosition).to({ x: 0, y: 0 }, 800).delay(5800).easing(Easing.Quadratic.InOut).on('update', ({ x, y }) => { this.fakeCursor.style.transform = `translate(${x}px, ${y}px)`; }).start();
    setTimeout(() => {
      this.fakeCursor.style.opacity = 0;
      this.instructionsScreen.classList.add('hidden');
    }, 6400);

    setTimeout(() => {
      this.instructionsGlass.classList.remove('hidden');
    }, 7000);

    setTimeout(() => {
      this.instructionsGlass.classList.add('hidden');
      this.controls.enabled = true;
    }, 10000);

    setTimeout(() => {
      this.showMenu();
    }, 11000);
  }

  updateMesh({ mesh, box }) {
    if (!this.started) {
      setTimeout(this.introAnimation, 500);
    }
    this.started = true;
    for (let i = 0; i < mesh.length; i += 1) {
      this.facemesh.geometry.vertices[this.keypointMapping[i]].x = mesh[i][0];
      this.facemesh.geometry.vertices[this.keypointMapping[i]].y = -mesh[i][1];
      this.facemesh.geometry.vertices[this.keypointMapping[i]].z = mesh[i][2];

     
    }

    this.foreheadVerts.forEach((vert) => {
      this.facemesh.geometry.vertices[vert].y += 30;
      this.facemesh.geometry.vertices[vert].z += 20;
    });
    this.facemesh.position.z = (((box.bottomRight[0][1] - box.topLeft[0][1]) / 480) * -200) + 60;

    this.facemesh.geometry.verticesNeedUpdate = true;
    this.facemesh.geometry.computeVertexNormals();
    
  }

  updateMask() {
    this.segmentTexture.needsUpdate = true;
  }

  render() {
    this.depthRenderer.render(this.depthScene, this.depthCamera);

    this.controls.update();

    if (this.debug !== 'face') {
      this.renderer.render(this.scene, this.camera);
      this.canvasTexture.needsUpdate = true;
    }
    requestAnimationFrame(this.render);
  }
}
