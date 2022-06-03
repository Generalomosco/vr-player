import WebVRPolyfill from 'webvr-polyfill';
import VRControls from './component/vr-controls';
import VREffect from './component/vr-effect';
import OrbitOrientationContols from './component/orbit-orientation-controls';
import Extension from './extension';
import {
  stripToClassName,
  toggleClasses,
  isElement,
  moveEl,
  containsWord,
  insertAfter,
  insertBefore,
  addClass,
  removeClass,
  hasClass,
  isMobile
} from './utils';

class playVR extends Extension {
  constructor(
    app,
    options,
  ) {
    options = Object.assign({
      projection: '360'
    },options);
    super(app, options);
    this.options = options;
    this.polyfill_ = new WebVRPolyfill({
      // do not show rotate instructions
      ROTATE_INSTRUCTIONS_DISABLED: true
    });
    this.polyfill_ = new WebVRPolyfill();
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);
    this.vrdisplaypresentchange = this.vrdisplaypresentchange.bind(this)

    this.setDefaultProjection(this.options.projection);

    if (this.app.isReady) {
      this.init(this.currentProjection);
    }
    this.app.Event.on('ready', this.init.bind(this, this.currentProjection));

  }
  changeProjection(projection) {
    this.setProjection(projection);
    this.init(projection);
  }
  setProjection(projection) {
    if (!projection) {
      projection = 'regular';
    }
    const position = {
      x: 0,
      y: 0,
      z: 0
    };

    if (this.scene) {
      this.scene.remove(this.movieScreen);
    }
    if (projection === 'regular') {

    } else if (projection === '360') {

      this.movieGeometry = new THREE.SphereBufferGeometry(256, 32, 32);
      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        overdraw: true,
        side: THREE.BackSide
      });

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.position.set(position.x, position.y, position.z);

      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({
        x: 0,
        y: 1,
        z: 0
      }, -Math.PI / 2);
      this.scene.add(this.movieScreen);
    }
    this.currentProjection = projection;

  }
  
  activateVrDisplay() {
    if (!this.vrDisplay) {
      return;
    }
    this.app.videoScreen().fullscreen();
    this.vrDisplay.requestPresent([{
      source: this.renderedCanvas
    }]).then(() => {
      if (!this.vrDisplay.cardboardUI_) {
        return;
      }

      // webvr cardboard UI
      let touches = [];
      const iosCardboardTouchStart = (e) => {
        for (let i = 0; i < e.touches.length; i++) {
          touches.push(e.touches[i]);
        }
      };

      const iosCardboardTouchEnd = (e) => {
        if (!touches.length) {
          return;
        }

        touches.forEach((t) => {
          const simulatedClick = new window.MouseEvent('click', {
            screenX: t.screenX,
            screenY: t.screenY,
            clientX: t.clientX,
            clientY: t.clientY
          });

          this.renderedCanvas.dispatchEvent(simulatedClick);
        });

        touches = [];
      };

      this.renderedCanvas.addEventListener('touchstart', iosCardboardTouchStart);
      this.renderedCanvas.addEventListener('touchend', iosCardboardTouchEnd);

      this.iosRevertTouchToClick = () => {
        this.renderedCanvas.removeEventListener('touchstart', iosCardboardTouchStart);
        this.renderedCanvas.removeEventListener('touchend', iosCardboardTouchEnd);
        this.iosRevertTouchToClick = null;
      };
    });
  }
  deactivateVrDisplay() {
    if (!this.vrDisplay) {
      return;
    }
    if (this.iosRevertTouchToClick) {
      this.iosRevertTouchToClick();
    }
    this.vrDisplay.exitPresent();

  }

  requestAnimationFrame(fn) {
    if (this.vrDisplay) {
      return this.vrDisplay.requestAnimationFrame(fn);
    }

    return requestAnimationFrame.call(window, fn.bind(this));
  }

  cancelAnimationFrame(id) {
    if (this.vrDisplay) {
      return this.vrDisplay.cancelAnimationFrame(id);
    }

    return cancelAnimationFrame.call(window, id);
  }
  animate() {
    if (!this.initialized) {
      return;
    }
    if (this.app.video.readyState === this.app.video.HAVE_ENOUGH_DATA) {
      if (this.videoTexture) {
        this.videoTexture.needsUpdate = true;
      }
    }

    this.controls3d.update();
    this.effect.render(this.scene, this.camera);

    if (window.navigator.getGamepads) {
      // Gamepads
      const gamepads = window.navigator.getGamepads();

      for (let i = 0; i < gamepads.length; ++i) {
        const gamepad = gamepads[i];
        if (!gamepad || !gamepad.timestamp || gamepad.timestamp === this.prevTimestamps[i]) {
          continue;
        }
        for (let j = 0; j < gamepad.buttons.length; ++j) {
          if (gamepad.buttons[j].pressed) {
            this.prevTimestamps[i] = gamepad.timestamp;
            break;
          }
        }
      }
    }
    this.camera.getWorldDirection(this.cameraVector);

    this.animationFrameId = this.requestAnimationFrame(this.animate);
  }

  handleResize() {
    const width = this.app.playerEl.offsetWidth;
    const height = this.app.playerEl.offsetHeight;

    this.effect.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setDefaultProjection(projection) {
    this.currentProjection = projection;
    this.defaultProjection = projection;
  }

  ProjectionMenu({
    key
  }, noNevigate) {
    this.app.Event.fire('ext:playVR projection change', {
      projection: key
    });
    var ItemMethod = this.app.settingsMenu.Item('/').get('playVR-projection', true);
    for (var loopKey in ItemMethod.item._items) {
      if (!ItemMethod.item._items.hasOwnProperty(loopKey)) continue;
      if (ItemMethod.item._items[loopKey].marked && loopKey === key) {
        break;
      } else if (loopKey === key) {
        ItemMethod.item._items[loopKey].marked = true;
        ItemMethod.item["sub-label"] = ItemMethod.item._items[loopKey]["sub-label"];
        if (this.currentProjection !== key) this.changeProjection(key);
      } else {
        ItemMethod.item._items[loopKey].marked = false;
      }
    }
    ItemMethod.save();
    if (!noNevigate) {
      this.app.settingsMenu.openMenu("/");
    }
  }
  init(currentProjection) {
    this.reset();

    this.app.settingsMenu.Item('/').set({
      'playVR-projection': {
        "label": "Projection",
        "heading": "Projection",
        "sub-label": "Regular",
        "role": "menu",
        "_items": {
          'regular': {
            "label": "Regular",
            "sub-label": "Regular",
            "marked": true,
            'role': "mark",
            "onClick": this.ProjectionMenu.bind(this)
          },
          '360': {
            "label": "360°",
            "sub-label": "360°",
            "marked": false,
            "role": "mark",
            "onClick": this.ProjectionMenu.bind(this)
          }
        }
      }
    });
    this.ProjectionMenu({
      key: this.currentProjection
    }, true);
    this.camera = new THREE.PerspectiveCamera(75, this.app.playerEl.offsetWidth / this.app.playerEl.offsetHeight, 1, 1000);
    this.cameraVector = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.videoTexture = new THREE.VideoTexture(this.app.video);

    // shared regardless of wether VideoTexture is used or an image canvas is used
    this.videoTexture.generateMipmaps = false;
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.format = THREE.RGBFormat;
    this.setProjection(currentProjection);
    if (this.currentProjection === 'regular') {
      this.reset(true);
      return;
    }
    this.app.useVideoFrameProjection();

    this.app.settingsMenu.Item('/').set({
      'playVR-cardboard': {
        "label": "Cardboard",
        "checked": false,
        "disabled": false,
        'onClick': ({
          key,
          Item,
          route,
          closeMenu
        }) => {
          var ItemMethod = Item(route).get(key);
          if (ItemMethod.item.checked) {
            this.deactivateVrDisplay();
          } else {
            this.activateVrDisplay();
          }
          closeMenu();
        },
        'role': "toggle-checkbox"
      }
    });


    this.camera.position.set(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      devicePixelRatio: window.devicePixelRatio,
      alpha: false,
      clearColor: 0xffffff,
      antialias: true
    });

    const webglContext = this.renderer.getContext('webgl');
    const oldTexImage2D = webglContext.texImage2D;

    webglContext.texImage2D = (...args) => {
      try {
        return oldTexImage2D.apply(webglContext, args);
      } catch (e) {
        this.reset();
        this.app.video.pause();
        this.app.console.log('Web-vr hls cors is not supported!');
        throw new Error(e);
      }
    };

    this.renderer.setSize(this.app.playerEl.offsetWidth, this.app.playerEl.offsetHeight, false);
    this.effect = new VREffect(this.renderer);

    this.effect.setSize(this.app.playerEl.offsetWidth, this.app.playerEl.offsetHeight, false);
    this.vrDisplay = null;

    // Previous timestamps for gamepad updates
    this.prevTimestamps = [];

    this.renderedCanvas = this.renderer.domElement;
    this.renderedCanvas.setAttribute('style', 'width: 100%; height: 100%; position: absolute; top:0;');
    insertBefore(this.app.video, this.renderedCanvas);
    this.app.video.style.display = 'none';

    if (window.navigator.getVRDisplays) {
      this.app.console.log('is supported, getting vr displays');
      window.navigator.getVRDisplays().then((displays) => {
        if (displays.length > 0) {
          this.app.console.log('Displays found', displays);
          this.vrDisplay = displays[0];

          // Native WebVR Head Mounted Displays (HMDs)
          if (!this.vrDisplay.isPolyfilled) {
            this.app.console.log('HMD found using VRControls', this.vrDisplay);
            this.controls3d = new VRControls(this.camera);
          }
        }

        if (!this.controls3d) {
          this.app.console.log('No HMD is found using VRControls!');
          const options = {
            camera: this.camera,
            canvas: this.renderedCanvas,
            orientation: isMobile.Any()
          };

          this.controls3d = new OrbitOrientationContols(options);
        }

        this.animationFrameId = this.requestAnimationFrame(this.animate);
      });
    } else if (window.navigator.getVRDevices) {
      this.app.console.throwError('Web-vr is outdated!');
    } else {
      this.app.console.throwError('Web-vr is not supported!');
    }

    this.app.Event.on('fullscreenchange', this.handleResize);
    window.addEventListener('vrdisplaypresentchange', this.vrdisplaypresentchange, true);

    this.initialized = true;
  }
  vrdisplaypresentchange(e) {
    this.handleResize();

    var ItemMethod = this.app.settingsMenu.Item('/').get('playVR-cardboard');
    if (ItemMethod) {
      if (this.vrDisplay.isPresenting) {
        ItemMethod.item.checked = true;
      } else {
        ItemMethod.item.checked = false;
      }
      ItemMethod.save();
    }
  }
  reset(partial) {
    if (!this.initialized) {
      return;
    }
    if (!partial) this.app.settingsMenu.Item('/').get('playVR-projection').remove();
    this.app.settingsMenu.Item('/').get('playVR-cardboard').remove();
    if (this.controls3d) {
      this.controls3d.dispose();
      this.controls3d = null;
    }

    if (this.canvasPlayerControls) {
      this.canvasPlayerControls.dispose();
      this.canvasPlayerControls = null;
    }

    if (this.effect) {
      this.effect.dispose();
      this.effect = null;
    }

    this.app.Event.off('fullscreenchange', this.handleResize);
    window.removeEventListener('vrdisplaypresentchange', this.handleResize, true);

    // reset the video display style
    this.app.video.style.display = '';

    // set the current projection to the default
    this.currentProjection = this.defaultProjection;

    // reset the ios touch
    if (this.iosRevertTouchToClick) {
      this.iosRevertTouchToClick();
    }

    // remove the old canvas
    if (this.renderedCanvas) {
      this.renderedCanvas.parentNode.removeChild(this.renderedCanvas);
    }

    if (this.animationFrameId) {
      this.cancelAnimationFrame(this.animationFrameId);
    }
    this.app.useUserProjectionFrame();
    this.initialized = false;
  }

  distroy() {
    super.distroy();
    this.reset();
  }

}

Extension.addExtension(playVR, 'playVR');
export default playVR;