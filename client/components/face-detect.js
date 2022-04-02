import * as facemesh from '@tensorflow-models/facemesh';
import * as bodypix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs-core';

export default class FaceDetect {
  constructor(faceMesh) {
    this.faceMesh = faceMesh;
    this.load = this.load.bind(this);
    this.detect = this.detect.bind(this);

    this.segmentCanvas = document.createElement('canvas');
    this.segmentCanvas.width = 640;
    this.segmentCanvas.height = 480;

    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = 640;
    this.maskCanvas.height = 480;
    this.maskContext = this.maskCanvas.getContext('2d');
    this.maskContext.fillStyle = 'rgb(0, 0, 0)';
    this.maskContext.fillRect(0, 0, 640, 480);

    this.distance = 0.5;

    this.segmentContext = this.segmentCanvas.getContext('2d');

    this.confidenceThreshold = 0.5;
    this.video = null;
    this.model = null;
  }

  load() {
    return new Promise((resolve) => {
      tf.setBackend('webgl').then(() => {
        facemesh.load({ maxFaces: 1 }).then((_model) => {
          this.model = _model;

          bodypix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 4,
          }).then((res) => {
            this.segmentation = res;
            resolve();
          });
        });
      });
    });
  }

  detect() {
    this.model.estimateFaces(this.video).then((predictions) => {
      if ((predictions.length === 1 && predictions[0].faceInViewConfidence > this.confidenceThreshold)) {
        this.distance = ((predictions[0].boundingBox.bottomRight[0][1] - predictions[0].boundingBox.topLeft[0][1]) / 480);
        this.faceMesh.updateMesh({ mesh: predictions[0].scaledMesh, box: predictions[0].boundingBox });
      }
    });
    this.segmentation.segmentPerson(this.video, { segmentationThreshold: 0.7, internalResolution: 'medium', maxDetections: 1 }).then((results) => {
      if (results.allPoses.length === 1) {
        const coloredPartImage = bodypix.toMask(results);
        const opacity = 1;
        const flipHorizontal = false;
        const maskBlurAmount = 10;
        this.maskContext.fillStyle = `rgb(${(this.distance * 200) - 50}, ${(this.distance * 200) - 50}, ${(this.distance * 200) - 50})`;
        this.maskContext.fillRect(10, 10, 620, 460);
        bodypix.drawMask(this.segmentCanvas, this.maskCanvas, coloredPartImage, opacity, maskBlurAmount, flipHorizontal);
        this.faceMesh.updateMask();
      }
    });
    requestAnimationFrame(this.detect);
  }
}
