import EventHandler from './event-handle';
import enableInlineVideo from 'iphone-inline-video';
import {
  isMobile,
  isStartWith,
  stripToClassName,
  toggleClasses,
  isElement,
  moveEl,
  containsWord,
  insertAfter,
  insertBefore,
  prependChild,
  addClass,
  removeClass,
  hasClass
} from './utils';
if (window.Element && !Element.prototype.closest) {
  Element.prototype.closest =
    function(s) {
      var matches = (this.document || this.ownerDocument).querySelectorAll(s),
        i,
        el = this;
      do {
        i = matches.length;
        while (--i >= 0 && matches.item(i) !== el) {};
      } while ((i < 0) && (el = el.parentElement));
      return el;
    };
}
const MenuItemObj = {};
var gid = 1;
class Player {
  constructor(
    vidEl,
    options
  ) {
    this.debug = options.debug;
    this.debug = true;
    this.console = this.console();
    this.extState = {};
    this.projectedIn = options.projectedIn;
    this.currentProjectedIn = options.projectedIn;
    this.appID = 'vrPlayer_' + gid++;
    this.session = {};
    this.videoMode = {};
    this.options = options;
    MenuItemObj[this.appID] = {};
    this.Event = new EventHandler(this.appID);
    this.video = typeof vidEl === 'string' ? document.getElementById(vidEl) : vidEl;
    this.video.controls = false;
    this.bindVideoPlayerEvents();
    Player.apps[this.appID] = this;
  }
  generateSeekTime(time) {
    return {
      curtime() {
        var sec_num = Math.floor(time); // don't forget the second param
        var hours = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (seconds < 10) {
          seconds = "0" + seconds;
        }
        return (hours ? hours + ':' : '') + minutes + ':' + seconds;
      },
      durtime() {
        if (time === Infinity) {
          return 'Stream';
        }
        // The durtime
        var sec_dur = Math.floor(time); // don't forget the second param
        var hoursdur = Math.floor(sec_dur / 3600);
        var minutesdur = Math.floor((sec_dur - (hoursdur * 3600)) / 60);
        var secondsdur = sec_dur - (hoursdur * 3600) - (minutesdur * 60);

        if (secondsdur < 10) {
          secondsdur = "0" + secondsdur;
        }
        return (hoursdur ? hoursdur + ':' : '') + minutesdur + ':' + secondsdur;
      }
    }
  }
  controlBar() {
    const hide = () => {
      this.controls.style.display = 'none';
      toggleClasses(this.playerEl, ['is-hidden-control'], 'is-hidden-control');
    };
    const show = () => {
      this.controls.style.display = 'block';
      toggleClasses(this.playerEl, ['is-hidden-control'], '');
    };
    return {
      show,
      hide
    };
  }
  idleControl() {
    var isInsidePlayer = false,
      interval = null,
      isHideControl = false;
    const setInterval = (e) => {
      var minX = this.playerEl.getBoundingClientRect().left,
        maxX = minX + this.playerEl.offsetWidth,
        minY = this.playerEl.getBoundingClientRect().top,
        maxY = minY + this.playerEl.offsetHeight,
        clientX = e.clientX || e.clientX === 0 ? e.clientX : e.touches[0].clientX,
        clientY = e.clientY || e.clientY === 0 ? e.clientY : e.touches[0].clientY;
      if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY)
        isInsidePlayer = true;
      else
        isInsidePlayer = false;

      if (interval) clear();
      if (!isHideControl && isInsidePlayer) {
        this.playerEl.style.cursor = '';
        this.controlBar().show();
        isHideControl = true;
      }
      interval = setTimeout(() => {
        isHideControl = false;
        this.playerEl.style.cursor = 'none';
        this.controlBar().hide();
        clear();
      }, 10000);
    };

    const clear = () => {
      window.clearInterval(interval);
      interval = null;
    };
    window.addEventListener('mousemove', setInterval, false);
    window.addEventListener('touchstart', setInterval, false);

  }
  seekTime() {
    if (isNaN(this.video.duration)) return;
    var width = 100 / this.video.duration * this.video.currentTime;
    this.session.seekPercent = this.session.durtime === 'Stream' ? '100%' : width + '%';
    // The time
    this.session.durtime = this.generateSeekTime(this.video.duration).durtime();
    this.session.curtime = this.generateSeekTime(this.video.currentTime).curtime();

    this.Event.fire('seek duration', {
      seekPercent: this.session.seekPercent,
      durtime: this.session.durtime,
      curtime: this.session.curtime
    });
  }
  bufDuration(e) {
    var duration = this.video.duration;
    if (duration > 0) {
      for (var i = 0; i < this.video.buffered.length; i++) {
        if (this.video.buffered.start(this.video.buffered.length - 1 - i) < this.video.currentTime) {
          var bufWidth = (this.video.buffered.end(this.video.buffered.length - 1 - i) / duration) * 100 + "%";
          this.session.bufPercent = bufWidth;
          this.Event.fire('buffer duration', {
            bufPercent: this.session.bufPercent
          });
          break;
        }
      }
    }
  }
  videoScreen() {
    const addActiveModeClass = (mode) => {
      mode = mode.trim().toLowerCase();
      const modes = ['fullscreen', 'regular'];
      modes.forEach(
        item => {
          if (item !== mode) {
            if (this.playerEl.classList.contains("is-" + item)) {
              this.playerEl.classList.remove("is-" + item);
            }
          }
        }
      );
      if (!this.playerEl.classList.contains("is-" + mode)) {
        this.playerEl.classList.add("is-" + mode);
      }
    }
    const modeChange = () => {
      var screenMode = mode();
      if (screenMode === 'regular') {
        regular();
        addActiveModeClass('regular');
      } else if (screenMode === 'fullscreen') {
        fullscreen();
        addActiveModeClass('fullscreen');
      }
      return screenMode;
    }
    const init = () => {
      if (this.videoScreenInitialized) return;
      this.videoScreenInitialized = true;
      modeChange();
      ["webkitfullscreenchange", "mozfullscreenchange", "fullscreenchange", "MSFullscreenChange"].forEach(
        evName => document.addEventListener(evName, () => {
          this.Event.fire('video screen', modeChange());
        }, false)
      );
    }
    const mode = () => {
      if (isMobile.iOS()) {
        if (hasClass(this.playerEl, 'is-fullscreen')) {
          return 'fullscreen';
        } else {
          return 'regular';
        }
        return;
      }
      if (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ) {
        return 'fullscreen';
      } else {
        return 'regular';
      }
    }
    const fullscreen = () => {
      if (mode() === 'fullscreen') return;
      if (isMobile.iOS()) {
        addActiveModeClass('fullscreen');
        this.Event.fire('video screen', modeChange());
        return;
      }
      if (this.playerEl.requestFullscreen) {
        this.playerEl.requestFullscreen();
      } else if (this.playerEl.mozRequestFullScreen) {
        this.playerEl.mozRequestFullScreen();
      } else if (this.playerEl.webkitRequestFullscreen) {
        this.playerEl.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      } else if (this.playerEl.msRequestFullscreen) {
        this.playerEl.msRequestFullscreen();
      }
      addActiveModeClass('fullscreen');
    }
    const regular = () => {
      if (mode() === 'regular') return;
      if (isMobile.iOS()) {
        addActiveModeClass('regular');
        this.Event.fire('video screen', modeChange());
        return;
      }
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      addActiveModeClass('regular');
    }
    return {
      init,
      mode,
      fullscreen,
      regular
    }
  }
  intControl() {
    var items = this.options.controlBar.items;
    for (var item in items) {
      if (items.hasOwnProperty(item)) {
        items[item].name = item;
        if (item === 'seek-bar') {
          this.addSeekBar(items[item]);
        } else if (item === 'seek-duration') {
          this.addSeekDuration(items[item]);
          this.seekTime();
        } else if (item === 'volume') {
          this.addVolume(items[item]);
        } else if (item === 'divide') {
          this.addDivision(items[item]);
        } else if (item === 'fullscreen') {
          if (!items[item].iconEl) {
            items[item].iconEl = `
<i class="fa fa-compress _compress"></i>
<i class="fa fa-expand _expand"></i>`;
          }
          items[item].onClickCall = (el, player, e) => {
            var ctrlIconEl = el.querySelector('.vrplyr__control-icon');
            if (hasClass(ctrlIconEl, '_expand')) {
              this.videoScreen().fullscreen();
            } else {
              this.videoScreen().regular();
            }

          };
          items[item].readyCall = (el, player) => {
            var ctrlIconEl = el.querySelector('.vrplyr__control-icon');

            var videoScreenMode = this.videoScreen().mode();
            if (videoScreenMode === 'fullscreen') {
              toggleClasses(ctrlIconEl, ['_expand'], '_compress');
            } else {
              toggleClasses(ctrlIconEl, ['_compress'], '_expand');
            }


            this.Event.on('video screen', () => {
              var videoScreenMode = this.videoScreen().mode();

              if (videoScreenMode === 'fullscreen') {
                toggleClasses(ctrlIconEl, ['_expand'], '_compress');
              } else {
                toggleClasses(ctrlIconEl, ['_compress'], '_expand');
              }
            });
          };
          this.addButton(items[item]);
        } else if (item === 'play-pause') {
          if (!items[item].iconEl) {
            items[item].iconEl = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="_play" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
  <path d="M6.271 5.055a.5.5 0 0 1 .52.038l3.5 2.5a.5.5 0 0 1 0 .814l-3.5 2.5A.5.5 0 0 1 6 10.5v-5a.5.5 0 0 1 .271-.445z"/>
</svg>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="_pause" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
  <path d="M5 6.25a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5zm3.5 0a1.25 1.25 0 1 1 2.5 0v3.5a1.25 1.25 0 1 1-2.5 0v-3.5z"/>
</svg>`;
          }
          items[item].onClickCall = (el, player, e) => {
            if (this.video.paused) {
              this.video.play();
            } else {
              this.video.pause();
            }
          };
          items[item].readyCall = (el, player) => {
            var playPauseCtrlIconEl = el.querySelector('.vrplyr__control-icon');

            if (this.video.paused) {
              addClass(playPauseCtrlIconEl, '_play');
            } else {
              addClass(playPauseCtrlIconEl, '_pause');
            }
            this.Event.on(['playing', 'paused', 'ended'], () => {
              if (this.video.paused) {
                toggleClasses(playPauseCtrlIconEl, ['_pause'], '_play');
              } else {
                toggleClasses(playPauseCtrlIconEl, ['_play'], '_pause');
              }
            });

          };
          this.addButton(items[item]);
        } else if (item === 'settings-menu') {
          this.setupMenu(items[item]);
        } else if (items[item].type === 'button') {
          this.addButton(items[item]);
        }
      }
    }
    this.bigPlayButton.addEventListener('click', () => {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
    });
  }
  setupMenu(setting) {
    const readyCall = (el, player) => {
      var menuEl = document.createElement('div');
      addClass(menuEl, 'vrplyr-menu');
      prependChild(el, menuEl);
      this.settingsMenu = this.MenuItem('settings-menu');
      this.settingsMenu.createMenu(menuEl);
    };
    const onClickCall = () => {
      if (!this.settingsMenu) return;
      if (this.settingsMenu.isOpened()) {
        this.settingsMenu.closeMenu();
      } else {
        this.settingsMenu.openMenu('/');
      }
    }
    this.addButton({
      name: 'settings-menu',
      title: setting.title,
      readyCall,
      onClickCall,
      icon: 'fa fa-cog'
    });
  }
  init() {
    if (isMobile.iOS()) {
      this.video.setAttribute("playsinline", "");
      enableInlineVideo(this.video, true);
    }
    this.initPlayer();
    this.video.addEventListener('timeupdate', this.seekTime.bind(this));
    this.video.addEventListener('progress', this.bufDuration.bind(this));
    this.videoScreen().init();

    this.intControl();
    this.initFrameBuffer();
    this.setFrameSize();
    if (this.video.paused) {
      this.setPoster();
    }
    if (this.currentProjectedIn === 'canvas') {
      this.video.style.display = 'none';
    }
    if (this.currentProjectedIn === 'canvas') this.addCanvasHandlers();

    if (!this.video.paused) {
      if (!hasClass(this.playerEl, 'is-started')) {
        this.videoMode.started = true;
        addClass(this.playerEl, 'is-started');
      }

      if (hasClass(this.playerEl, 'is-ended')) {
        this.videoMode.ended = false;
        removeClass(this.playerEl, 'is-ended');
      }

      this.videoMode.paused = false;
      this.videoMode.playing = true;
      removeClass(this.playerEl, 'is-paused');
      addClass(this.playerEl, 'is-playing');
      this.requestAnimation();
    }
    window.addEventListener("resize", this.resetFrameSize.bind(this), true);
    this.idleControl();
  }
  bindVideoPlayerEvents() {

    this.init();

    this.video.onwaiting = (event) => {
      if (this.playerEl)
        this.playerEl.querySelector(".vrplyr__buf-spinner").style.display = 'block';

    };
    this.video.addEventListener('canplay', () => {
      this.resetFrameSize();
      if (this.playerEl)
        this.playerEl.querySelector(".vrplyr__buf-spinner").style.display = 'none';

      if (this.video.paused) {
        if (this.videoMode.started)
          this.renderFrame();
        else
          this.setPoster();
      }
      this.seekTime();
    });

    this.video.addEventListener('play', () => {
      if (!hasClass(this.playerEl, 'is-started')) {
        this.videoMode.started = true;
        addClass(this.playerEl, 'is-started');
      }

      if (hasClass(this.playerEl, 'is-ended')) {
        this.videoMode.ended = false;
        removeClass(this.playerEl, 'is-ended');
      }

      this.videoMode.paused = false;
      this.videoMode.playing = true;
      removeClass(this.playerEl, 'is-paused');
      addClass(this.playerEl, 'is-playing');
      this.requestAnimation();
      this.Event.fire('playing');
    });

    this.video.addEventListener('pause', () => {
      if (this.currentProjectedIn === 'canvas') {
        this.cancelAnimation();
      }
      this.playing = false;
      removeClass(this.playerEl, 'is-playing');
      addClass(this.playerEl, 'is-paused');
      this.Event.fire('paused');
    });

    this.video.onvolumechange = () => {
      this.Event.fire('volume change');
    };

    this.video.addEventListener('ended', () => {
      if (this.currentProjectedIn === 'canvas') {
        this.cancelAnimation();
      }
      removeClass(this.playerEl, 'is-playing');
      removeClass(this.playerEl, 'is-paused');
      removeClass(this.playerEl, 'is-started');
      addClass(this.playerEl, 'is-ended');
      this.videoMode.ended = true;
      this.videoMode.playing = false;
      this.videoMode.started = false;
      this.videoMode.paused = false;
      this.Event.fire('ended');
      this.setPoster();
    });
    this.videoMode.ready = true;
    this.resetFrameSize();
    this.Event.fire('ready');
  }
  isReady() {
    return this.videoMode.ready
  }
  console() {
    var debug = this.debug;
    return {
      throwError(err) {
        throw new Error(err);
      },
      log(...args) {
        if (debug) {
          return console.log.apply(this, args);
        }
      },
      warn(...args) {
        if (debug) {
          return console.warn.apply(this, args);
        }
      },
      error(...args) {
        if (debug) {
          return console.error.apply(this, args);
        }
      },
    }
  }
  addCanvasHandlers() {
    this.canvas.addEventListener('click', () => {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
    });
  }

  initFrameBuffer() {
    this.framebuffer = document.createElement('canvas');
    this.framebufferCtx = this.framebuffer.getContext('2d');
  }

  initPlayer() {
    this.playerEl = document.createElement('div');
    addClass(this.playerEl, 'vr-player__vrplyr');
    addClass(this.playerEl, this.appID);
    addClass(this.playerEl, 'vrplyr');
    addClass(this.playerEl, 'is-paused');

    this.bufSpinnerEl = document.createElement('div');
    addClass(this.bufSpinnerEl, 'vrplyr__buf-spinner');
    this.playerEl.appendChild(this.bufSpinnerEl);
    if (this.video.controls) {
      addClass(this.playerEl, 'controls-enabled');
    }

    this.bigPlayButton = document.createElement('button');
    addClass(this.bigPlayButton, 'vrplyr-big-play-button');
    this.playerEl.appendChild(this.bigPlayButton);

    insertAfter(this.video, this.playerEl);
    Array.prototype.forEach.call(this.video.classList, (className, i) => {
      if (className.toLowerCase() !== 'vrplyr--video') {
        addClass(this.playerEl, className);
      }
      removeClass(this.video, className);
    });
    if (this.video.id) {
      this.playerEl.id = this.video.id;
      this.video.id = this.video.id + '--src';
    }
    addClass(this.video, 'vrplyr--src');
    moveEl(this.video, this.playerEl);


    this.canvas = document.createElement('canvas');
    this.canvasCtx = this.canvas.getContext('2d');
    addClass(this.canvas, 'vrplyr-canvas');
    if (this.currentProjectedIn === 'canvas') {
      this.playerEl.appendChild(this.canvas);
    }
    this.controls = document.createElement('div');
    addClass(this.controls, 'vrplyr__controls');
    if (this.currentProjectedIn === 'canvas') {
      insertAfter(this.canvas, this.controls);
    } else {
      this.playerEl.appendChild(this.controls);
    }

    this.controlsPanel = document.createElement('div');
    addClass(this.controlsPanel, 'vrplyr__controls-panel');
    this.controls.appendChild(this.controlsPanel);
  }
  resetFrameSize() {
    var width;
    var height;
    var videoHeight = this.video.height,
      videoWidth = this.video.width;
    if (!videoHeight || !videoWidth) {
      videoHeight = this.video.videoHeight;
      videoWidth = this.video.videoWidth;
    }
    if (!videoHeight || !videoWidth) return;
    var canvas = this.canvas;
    var windowRatio = this.playerEl.offsetHeight / this.playerEl.offsetWidth;
    if (this.currentProjectedIn === 'canvas') {
      let canvasRatio = this.video.videoHeight / this.video.videoWidth;
      if (windowRatio < canvasRatio) {
        height = this.playerEl.offsetHeight;
        width = height / canvasRatio;
      } else {
        width = this.playerEl.offsetWidth;
        height = width * canvasRatio;
      }
    } else {
      let videoRatio = this.video.videoHeight / this.video.videoWidth;

      if (windowRatio < videoRatio) {
        height = this.playerEl.offsetHeight;
        width = height / videoRatio;
      } else {
        width = this.playerEl.offsetWidth;
        height = width * videoRatio;
      }
      width = this.video.clientWidth;
      height = this.video.clientHeight;
    }
    this.width = videoWidth;
    this.height = videoHeight;

    this.canvas.setAttribute('width', videoWidth);
    this.canvas.setAttribute('height', videoHeight);
    this.framebuffer.setAttribute('width', videoWidth);
    this.framebuffer.setAttribute('height', videoHeight);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (this.videoMode.started)
      this.renderFrame();
    else
      this.setPoster();
  }
  setFrameSize() {
    this.width = this.video.clientWidth;
    this.height = this.video.clientHeight;
    this.canvas.setAttribute('width', this.width);
    this.canvas.setAttribute('height', this.height);
    this.framebuffer.setAttribute('width', this.width);
    this.framebuffer.setAttribute('height', this.height);
    if ((this.video.videoHeight && this.video.videoWidth) || (this.video.height && this.video.height)) this.resetFrameSize();
  }

  setPoster() {
    if (this.currentProjectedIn !== 'canvas') return;
    const {
      poster
    } = this.video;
    if (poster.length > 0) {
      var posterImageInstance = new Image(this.width, this.height);
      if (!this.posterImage) {
        posterImageInstance.addEventListener('load', () => {
          if (this.video.paused) {
            this.renderFrame(posterImageInstance);
          }
        });
        this.posterImage = poster;
        posterImageInstance.src = this.posterImage;
      } else {
        posterImageInstance.src = this.posterImage;
        this.renderFrame(posterImageInstance);
      }
    }
  }
  useUserProjectionFrame() {
    if (this.projectedIn !== this.currentProjectedIn) {
      if (this.projectedIn === 'canvas') {
        this.currentProjectedIn = this.projectedIn;
        this.video.style.display = 'none';
        this.canvas.style.display = 'block';
        this.resetFrameSize();
        this.requestAnimation();
      } else {
        this.currentProjectedIn = this.projectedIn;
        this.cancelAnimation();
        this.canvas.style.display = 'none';
        this.video.style.display = 'block';
        this.resetFrameSize();
      }
    }
  }
  useVideoFrameProjection() {
    if (this.currentProjectedIn === 'canvas') {
      this.currentProjectedIn = 'video';
      this.cancelAnimation();
      this.canvas.style.display = 'none';
      this.video.style.display = 'block';
    }
  }
  cancelAnimation() {
    if (!this.requestAnimationFrameID) return;
    window.cancelAnimationFrame(this.requestAnimationFrameID);
    this.requestAnimationFrameID = null;
  }
  requestAnimation() {
    if (this.currentProjectedIn === 'canvas') {
      this.renderFrame();
      this.requestAnimationFrameID = window.requestAnimationFrame(() => {
        this.requestAnimation();
      });
    }
  }

  renderFrame(image) {
    if (this.currentProjectedIn !== 'canvas') {
      return;
    }
    const data = this.getData(image);
    this.canvasCtx.putImageData(data, 0, 0);
  }

  getData(image) {
    this.framebufferCtx.drawImage(
      image || this.video,
      0,
      0,
      this.video.videoWidth,
      this.video.videoHeight,
      0,
      0,
      this.width,
      this.height,
    );
    return this.framebufferCtx.getImageData(0, 0, this.width, this.height);
  }
  addSeekBar({
    className,
    title
  }) {
    if (!className) className = '';
    var ctrlClass = 'vrplyr__seek-bar-control';
    if (!containsWord(ctrlClass, className)) {
      if (className.trim())
        className = ctrlClass + ' ' + className;
      else
        className = ctrlClass;
    }
    if (!containsWord('vrplyr__control', className)) {
      className = 'vrplyr__control ' + className;
    }
    var control = document.createElement('div');
    control.setAttribute('class', className);
    if (title) control.setAttribute('title', title);
    var HTML_Children = `<div class="loadbar"></div>
                    <div class="seekbar"></div>`;
    control.insertAdjacentHTML('beforeend', HTML_Children);
    insertBefore(this.controlsPanel, control);

    //The seek drag

    const updatebar = (x) => {
      if (this.session.durtime === 'Stream') return;
      //calculate drag position
      //and update video currenttime
      //as well as progress bar
      var maxduration = this.video.duration;
      var position = x - this.controls.getBoundingClientRect().left;
      var percentage = 100 * position / this.controls.offsetWidth;
      if (percentage > 100) {
        percentage = 100;
      }
      if (percentage < 0) {
        percentage = 0;
      }
      var currentTime = maxduration * percentage / 100;
      if (!isNaN(currentTime)) {
        this.session.seekPercent = this.session.durtime === 'Stream' ? '100%' : percentage + '%';
        this.video.currentTime = currentTime;
        var seekPercent = this.session.seekPercent;
        this.Event.fire('seek duration', {
          seekPercent: seekPercent,
          durtime: this.session.durtime || this.generateSeekTime(this.video.duration).durtime(),
          curtime: this.generateSeekTime(this.video.currentTime).curtime()
        });
        this.Event.fire('drag seek bar', {
          currentTime,
          seekPercent
        });
        this.renderFrame();
      }
    };
    var timeDrag = false;
    const dragIt = (e) => {
      if (timeDrag) {
        updatebar(e.pageX);
      }
    };
    const mouseUp = (e) => {
      if (timeDrag) {
        timeDrag = false;
        updatebar(e.pageX);
      }
      window.removeEventListener('mousemove', dragIt, false);
      window.removeEventListener('mouseup', mouseUp, false);
    };
    control.addEventListener('mousedown', (e) => {
      timeDrag = true;
      window.addEventListener('mousemove', dragIt, false);
      window.addEventListener('mouseup', mouseUp, false);
    }, false);


    const swipeIt = (e) => {
      if (timeDrag) {
        updatebar(e.touches[0].pageX);
      }
    };
    const touchEnd = (e) => {
      if (timeDrag) {
        timeDrag = false;
        if (e.touches[0]) updatebar(e.touches[0].pageX);
      }
      window.removeEventListener('touchmove', swipeIt, false);
      window.removeEventListener('touchend', touchEnd, false);
    };
    control.addEventListener('touchstart', function(e) {
      timeDrag = true;
      window.addEventListener('touchmove', swipeIt, false);
      window.addEventListener('touchend', touchEnd, false);
    }, false);

    var loadbar = control.querySelector('.loadbar');
    var seekbar = control.querySelector('.seekbar');

    this.Event.on('seek duration', (e) => {
      var item = e.detail;
      seekbar.style.width = item.seekPercent;
    });
    this.Event.on('buffer duration', (e) => {
      var item = e.detail;
      loadbar.style.width = item.bufPercent;
    });

    return control;
  }
  addSeekDuration({
    disabled,
    className,
    title
  }) {
    if (!className) className = '';
    var ctrlClass = 'vrplyr__seek-duration-control';
    if (!containsWord(ctrlClass, className)) {
      if (className.trim())
        className = ctrlClass + ' ' + className;
      else
        className = ctrlClass;
    }
    if (!containsWord('vrplyr__control', className)) {
      className = 'vrplyr__control ' + className;
    }
    var control = document.createElement('div');
    control.setAttribute('class', className);
    if (title) control.setAttribute('title', title);
    var HTML_Children = `<span class="curtime">00:00</span> <span class="divider">/</span> <span class="durtime">00:00</span>`;
    control.insertAdjacentHTML('beforeend', HTML_Children);
    this.controlsPanel.appendChild(control);

    var curtime = control.querySelector('.curtime');
    var durtime = control.querySelector('.durtime');

    this.Event.on('seek duration', (e) => {
      var item = e.detail;
      curtime.innerHTML = item.curtime;
      durtime.innerHTML = item.durtime;
    });
    return control;
  }
  addDivision({
    className
  }) {
    if (!className) className = '';
    var ctrlClass = 'vrplyr__divide-control';
    if (!containsWord(ctrlClass, className)) {
      if (className.trim())
        className = ctrlClass + ' ' + className;
      else
        className = ctrlClass;
    }
    if (!containsWord('vrplyr__control', className)) {
      className = 'vrplyr__control ' + className;
    }
    var control = document.createElement('div');
    control.setAttribute('class', className);
    this.controlsPanel.appendChild(control);
    return control;
  }
  addVolume({
    disabled,
    className,
    title,
    noBar
  }) {
    if (!className) className = '';
    var ctrlClass = 'vrplyr__volume-control';
    if (!containsWord(ctrlClass, className)) {
      if (className.trim())
        className = ctrlClass + ' ' + className;
      else
        className = ctrlClass;
    }
    if (!containsWord('vrplyr__control', className)) {
      className = 'vrplyr__control ' + className;
    }
    var control = document.createElement('div');
    control.setAttribute('class', className);
    if (title) control.setAttribute('title', title);
    var HTML_Children = `
                <div class="volume-icon">
                    <div class="vrplyr__control-icon _volume-up" id="mute">
<i class="fa fa-volume-up _volume-up"></i>
<i class="fa fa-volume-off _volume-off"></i>
</div>
                </div>
                <div class="volume-slider-bar${noBar?' _no-bar':''}">
                    <div class="volume-slider"></div>
                </div>`;
    control.insertAdjacentHTML('beforeend', HTML_Children);
    this.controlsPanel.appendChild(control);

    //volume bar event
    const updateVolume = (x, vol) => {
      var volume = control.querySelector('.volume-slider-bar');
      var percentage;
      //if only volume have specificed
      //then direct update volume
      if (vol) {
        percentage = vol * 100;
      } else {
        var position = x - volume.getBoundingClientRect().left;
        percentage = 100 * (position) / volume.offsetWidth;
      }

      if (percentage > 100) {
        percentage = 100;
      }
      if (percentage < 0) {
        percentage = 0;
      }

      //update volume bar and video volume 
      control.querySelector(".volume-slider").style.width = percentage + '%';
      this.video.volume = percentage / 100;
      if (this.video.volume === 0) {
        this.video.muted = true;
      } else {
        this.video.muted = false;
      }
    };


    var volumeDrag = false;
    const dragIt = (e) => {
      if (volumeDrag) {
        updateVolume(e.pageX);
      }
    };
    const mouseUp = (e) => {
      if (volumeDrag) {
        volumeDrag = false;
        updateVolume(e.pageX);
      }
      window.removeEventListener('mousemove', dragIt, false);
      window.removeEventListener('mouseup', mouseUp, false);
    };
    control.querySelector('.volume-slider-bar').addEventListener('mousedown', (e) => {
      volumeDrag = true;
      window.addEventListener('mousemove', dragIt, false);
      window.addEventListener('mouseup', mouseUp, false);
    }, false);


    const swipeIt = (e) => {
      if (volumeDrag) {
        updateVolume(e.touches[0].pageX);
      }
    };
    const touchEnd = (e) => {
      if (volumeDrag) {
        volumeDrag = false;
        updateVolume(e.touches[0].pageX);
      }
      window.removeEventListener('touchmove', swipeIt, false);
      window.removeEventListener('touchend', touchEnd, false);
    };
    control.querySelector('.volume-slider-bar').addEventListener('touchstart', function(e) {
      volumeDrag = true;
      window.addEventListener('touchmove', swipeIt, false);
      window.addEventListener('touchend', touchEnd, false);
    }, false);
    var muteEl = control.querySelector('#mute');
    const muteBtn = (isMuted) => {
      if (isMuted) {
        if (muteEl.classList.contains("_volume-up")) {
          muteEl.classList.remove("_volume-up");
        }
        if (!muteEl.classList.contains("_volume-off")) {
          muteEl.classList.add("_volume-off");
        }
      } else {
        if (muteEl.classList.contains("_volume-off")) {
          muteEl.classList.remove("_volume-off");
        }
        if (!muteEl.classList.contains("_volume-up")) {
          muteEl.classList.add("_volume-up");
        }
      }
    }
    muteBtn(this.video.muted);
    this.Event.on('volume change', () => {
      var smuteEl = control.querySelector('#mute');
      muteBtn(this.video.muted);
    });
    muteEl = control.querySelector('#mute');

    muteEl.addEventListener("click", () => {
      this.video.muted = !this.video.muted;
      muteBtn(this.video.muted);
    });

    return control;
  }

  addButton({
    disabled,
    name,
    className,
    title,
    icon,
    iconEl,
    context,
    onClickCall,
    readyCall
  }) {
    if (!className) className = '';
    var btnClass = 'vrplyr__' + stripToClassName(name) + '-control';
    if (!containsWord(btnClass, className)) {
      if (className.trim())
        className = btnClass + ' ' + className;
      else
        className = btnClass;
    }
    if (!containsWord('vrplyr__control', className)) {
      className = 'vrplyr__control ' + className;
    }
    var control = document.createElement('div');
    control.setAttribute('class', className);
    if (title) control.setAttribute('title', title);

    var controlBtn = document.createElement('div');
    controlBtn.setAttribute('class', 'vrplyr__control-btn');

    var controlText = document.createElement('span');
    controlText.setAttribute('class', 'vrplyr__control-text');
    if (context) controlText.innerHTML = context;
    controlBtn.appendChild(controlText);
    var controlIcon = document.createElement('i');
    if (iconEl) {
      controlIcon.setAttribute('class', 'vrplyr__control-icon');
      if (typeof iconEl === 'string') {
        controlIcon.innerHTML = iconEl;
      } else {
        controlIcon.appendChild(iconEl);
      }
    } else if (icon) {
      controlIcon.setAttribute('class', 'vrplyr__control-icon ' + icon);
    } else {
      controlIcon.setAttribute('class', 'vrplyr__control-icon');
    }
    controlBtn.appendChild(controlIcon);
    control.appendChild(controlBtn);
    this.controlsPanel.appendChild(control);

    if (readyCall) readyCall.call(this, control, this);
    if (onClickCall) controlBtn.addEventListener('click', onClickCall.bind(null, control, this));
    return control;
  }

  MenuItem(menuKey) {
    const getMenuItemObj = () => {
      return MenuItemObj[this.appID];
    }
    const createMenu = el => {
      var oldMenuEl = el.querySelector('.vrplyr-settings-menu');
      if (oldMenuEl) el.removeChild(oldMenuEl);
      var menuBodyEl = document.createElement('div');
      addClass(menuBodyEl, 'vrplyr-settings-menu');
      el.appendChild(menuBodyEl);
      if (getMenuItemObj().hasOwnProperty('settings-menu')) {
        getMenuItemObj().el = el;
      } else {
        getMenuItemObj()[menuKey] = {
          "el": el,
          "items": {}
        }
      }
    }

    const deleteMenuData = (data, route) => {
      var route = makeNevRoute(route, true);
      route = route.replace(/^\/|\/$/g, '').trim();
      if (!route) return data;
      var routeArr = route.split("/");
      const getNestedData = (nestedData, routeArr) => {
        return routeArr.reduce((obj, key) => {
          if (obj && obj[key] !== 'undefined') {
            delete obj[key];
          }
        }, nestedData);
      }
    }
    const getMenuData = (data, route, base) => {
      var route = makeNevRoute(route, base);
      route = route.replace(/^\/|\/$/g, '').trim();
      if (!route) return data;
      var routeArr = route.split("/");
      const getNestedData = (nestedData, routeArr) => {
        return routeArr.reduce((obj, key) =>
          (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedData);
      }
      var depthData = getNestedData(data, routeArr) || {};
      return depthData;
    }

    const makeNevRoute = (route, base) => {
      var route = route.replace(/\/+/g, '\/').replace(/^\/|\/$/g, '').trim();
      if (!route) return route;
      var makeRoute = '';
      route.split("/").forEach((path, i) => {
        if (path === '_items') return;
        makeRoute += path + '/_items/';
      });
      if (base) makeRoute = makeRoute.replace(/\/_items\/$/, '/');
      return makeRoute;
    }

    const routeParse = (route) => {
      var route = route.replace(/\/+/g, '\/').replace(/^\/|\/$/g, '').trim();
      if (!route) return {
        route: route,
        key: route,
        backRoute: "",
        backKey: ""
      };
      var makeRoute = '';
      route.split("/").forEach((path, i) => {
        if (path === '_items') return;
        makeRoute += path + '/';
      });
      makeRoute = makeRoute.replace(/\/_items\/$/, '/');
      makeRoute = makeRoute.replace(/\/+/g, '\/').replace(/^\/|\/$/g, '').trim();
      var backRoute = makeRoute.substr(0, makeRoute.lastIndexOf("/"));

      return {
        route: makeRoute,
        key: makeRoute.split("/").pop(),
        backRoute: backRoute,
        backKey: backRoute.split("/").pop()
      }
    }

    const Item = (route) => {
      route = makeNevRoute(route);
      var data = getMenuItemObj()[menuKey].items;
      var menuItem = getMenuData(data, route, true);
      const saveItem = (route, Key, obj, includeChild, syncEL) => {
        var mainItem = getMenuData(data, route, true);

        for (let key in mainItem) {
          if (key === "_items") continue;
          if (!obj.hasOwnProperty(key)) {
            delete mainItem[key];
          }
        }
        for (let key in obj) {
          if (obj.hasOwnProperty("_items") && !includeChild && key === '_items') contiune;
          if (obj.hasOwnProperty(key) && key !== '_parent') {
            mainItem[key] = obj[key];
          }
        }
        if (syncEL && getMenuItemObj()[menuKey].hasOwnProperty('opened-route')) {
          var updatingRoute = makeNevRoute(route),
            opensRoute = getMenuItemObj()[menuKey]['opened-route'] + Key + '/_items/';

          if (updatingRoute === opensRoute) {
            syncItemElem({
              [Key]: obj
            });
          } else if (isStartWith(updatingRoute, opensRoute)) {
            syncItemElem(getMenuData(getMenuItemObj()[menuKey].items, getMenuItemObj()[menuKey]['opened-route']), null, true);
          }

        }
      }
      const set = (obj) => {
        var menuItem = getMenuData(getMenuItemObj()[menuKey].items, route, true);
        for (let key in obj) {
          if (!obj.hasOwnProperty(key)) continue;
          menuItem[key] = obj[key];
        }
        if (getMenuItemObj()[menuKey].hasOwnProperty('opened-route')) {
          syncItemElem(getMenuData(getMenuItemObj()[menuKey].items, getMenuItemObj()[menuKey]['opened-route']), null, true);
        }
      }
      const get = (Key, includeChild) => {
        if (!Key) {
          throw new Error('Get Key argument must be a type non empty String');
        }

        var getRoute = makeNevRoute(route + '/' + Key),
          parantMainItem = null;
        var mainItem = getMenuData(getMenuItemObj()[menuKey].items, getRoute, true);
        if (!Object.keys(mainItem).length > 0) {
          return null;
        }
        var clonedItem = Object.assign({}, mainItem);
        if (route) {
          var parantMainItem = getMenuData(getMenuItemObj()[menuKey].items, route, true);
          clonedItem['_parent'] = Object.assign({}, parantMainItem);
          if (clonedItem['_parent'].hasOwnProperty("_items")) delete clonedItem['_parent']["_items"];
        }
        if (clonedItem.hasOwnProperty("_items") && !includeChild) delete clonedItem["_items"];
        const sessionItem = clonedItem;
        const save = () => {
          if (parantMainItem) {
            var getParentRoute = routeParse(getRoute);
            saveItem(getRoute, Key, sessionItem, includeChild, false);
            saveItem(makeNevRoute(getParentRoute.backRoute, true), getParentRoute.backKey, sessionItem['_parent'], includeChild, true);
          } else {
            saveItem(getRoute, Key, sessionItem, includeChild, true);
          }
        }
        const remove = () => {
          return removeItem(route, Key);
        }
        return {
          save,
          item: sessionItem,
          remove
        }
      }
      const removeItem = (route, key) => {
        var delRootData = getMenuData(getMenuItemObj()[menuKey].items, makeNevRoute(route, true));
        if (delRootData.hasOwnProperty(key)) {
          delete delRootData[key];
        }

        if (getMenuItemObj()[menuKey].hasOwnProperty('opened-route')) {
          var updatingRoute = makeNevRoute(route),
            opensRoute = getMenuItemObj()[menuKey]['opened-route'] + key + '/_items/';
          if (isStartWith(updatingRoute, opensRoute)) {
            syncItemElem(getMenuData(getMenuItemObj()[menuKey].items, getMenuItemObj()[menuKey]['opened-route']), null, true);
          }
        }
      }
      return {
        get,
        set
      }
    }

    const syncItemElem = (menuItem, menuEl, forceRefresh) => {
      if (!getMenuItemObj()[menuKey].el) return;
      var el = getMenuItemObj()[menuKey].el.querySelector('.vrplyr-settings-menu');
      var update = null,
        oldChildrenKeys = {};
      if (!menuEl) {
        update = true;
        if (!el) return;
        menuEl = el.querySelector('.vrplyr-menu-items');
        if (!menuEl) return;
      }
      var headerEl = el.querySelector('.vrplyr-menu-items--header'),
        headerBackEl = headerEl ? headerEl.querySelector('.vrplyr-menu-items--header-back') : null,
        headerheadingEl = headerEl ? headerEl.querySelector('.vrplyr-menu-items--header-heading') : null;
      if (!headerEl) {
        headerEl = document.createElement('div');
        addClass(headerEl, 'vrplyr-menu-items--header');
        headerEl.addEventListener("click", (e) => {
          openMenu(e.currentTarget.dataset["vrplyrMenuItems-Goto"]);
        });
        headerBackEl = document.createElement('div');
        addClass(headerBackEl, 'vrplyr-menu-items--header-back');
        headerEl.appendChild(headerBackEl);
        headerheadingEl = document.createElement('div');
        addClass(headerheadingEl, 'vrplyr-menu-items--header-heading');
        headerEl.appendChild(headerheadingEl);
        prependChild(el, headerEl);
      }
      if (getMenuItemObj()[menuKey]['opened-route']) {

        var getParentRoute = routeParse(getMenuItemObj()[menuKey]['opened-route']);
        var ParentItem = getMenuData(getMenuItemObj()[menuKey].items, makeNevRoute(getMenuItemObj()[menuKey]['opened-route']), true);
        headerEl.setAttribute("data-vrplyr-menu-items--goto", getParentRoute.backRoute);
        headerheadingEl.innerHTML = ParentItem.heading;
        headerEl.style.display = "flex";
      } else {
        headerEl.setAttribute("data-vrplyr-menu-items--goto", "");
        headerheadingEl.innerHTML = "";
        headerEl.style.display = "none";
      }
      if (update && forceRefresh) {
        menuEl.querySelectorAll('.vrplyr-menu-item')
          .forEach(el => {
            var itemKey = el.getAttribute("data-vrplyr--menu-item-key");
            oldChildrenKeys[itemKey] = true;
          });
      }
      for (var key in menuItem) {
        if (!menuItem.hasOwnProperty(key)) continue;
        if (oldChildrenKeys.hasOwnProperty(key)) delete oldChildrenKeys[key]
        var item = menuItem[key];
        var itemEl = menuEl.querySelector('.vrplyr-menu-item-key--' + key),
          isNewItem = null;
        if (itemEl) {
          var itemRole = itemEl.getAttribute("role");
          if (itemRole !== 'vrplyr-menu-child-' + item.role) {
            isNewItem = true;
            itemEl = document.createElement('li');
          } else {
            isNewItem = false;
          }
        } else {
          isNewItem = true;
          itemEl = document.createElement('li');
        }
        if (item['hide']) {
          itemEl.setAttribute("data-vrplyr--menu-item-hide", "yes");
          itemEl.style.display = 'none';
        } else {
          itemEl.setAttribute("data-vrplyr--menu-item-hide", "no");
          itemEl.style.display = 'flex';
        }
        if (isNewItem) {
          prependChild(menuEl, itemEl);
          itemEl.setAttribute("role", 'vrplyr-menu-child-' + item.role);
          itemEl.setAttribute("data-vrplyr--menu-item-key", key);
          addClass(itemEl, 'vrplyr-menu-item');
          addClass(itemEl, 'vrplyr-menu-item-key--' + key);
          addClass(itemEl, 'vrplyr-menu-item-type--' + item.role);
          var labelEl = document.createElement('div');
          addClass(labelEl, 'vrplyr-menu-item-label');
          itemEl.appendChild(labelEl);
        } else {
          var labelEl = itemEl.querySelector('.vrplyr-menu-item-label');
        }
        labelEl.innerHTML = item.label;

        if (isNewItem) {
          var contentEl = document.createElement('div');
          addClass(contentEl, 'vrplyr-menu-item-content');
          itemEl.appendChild(contentEl);
        } else {
          var contentEl = itemEl.querySelector('.vrplyr-menu-item-content');
        }
        if (item.role === 'menu') {
          if (isNewItem) {
            var contentSubLabelEl = document.createElement('span');
            addClass(contentSubLabelEl, 'vrplyr-menu-item-content-sublabel');
            contentEl.appendChild(contentSubLabelEl);
          } else {
            var contentSubLabelEl = contentEl.querySelector('.vrplyr-menu-item-content-sublabel');
          }
          contentSubLabelEl.innerHTML = item['sub-label'];
        } else if (item.role === 'toggle-checkbox') {
          if (isNewItem) {
            var contentToggleCheckboxEl = document.createElement('div');
            addClass(contentToggleCheckboxEl, 'vrplyr-menu-item-content-toggle-checkbox');
            contentEl.appendChild(contentToggleCheckboxEl);
          } else {
            var contentToggleCheckboxEl = contentEl.querySelector('.vrplyr-menu-item-content-toggle-checkbox');
          }
          if (item.checked) {
            contentToggleCheckboxEl.setAttribute("data-vrplyr--menu-checkbox-checked", 'yes');
          } else {
            contentToggleCheckboxEl.setAttribute("data-vrplyr--menu-checkbox-checked", 'no');
          }
          if (item['disabled']) {
            contentToggleCheckboxEl.setAttribute("data-vrplyr--menu-checkbox-disabled", "yes");
          } else {
            contentToggleCheckboxEl.setAttribute("data-vrplyr--menu-checkbox-disabled", "no");
          }
        } else if (item.role === 'mark') {
          if (isNewItem) {
            var contentCheckboxEl = document.createElement('span');
            addClass(contentCheckboxEl, 'vrplyr-menu-item-content-mark');
            contentEl.appendChild(contentCheckboxEl);
          } else {
            var contentCheckboxEl = contentEl.querySelector('.vrplyr-menu-item-content-mark');
          }
          if (item.marked) {
            contentCheckboxEl.setAttribute("data-vrplyr--menu-mark-marked", 'yes');
          } else {
            contentCheckboxEl.setAttribute("data-vrplyr--menu-mark-marked", 'no');
          }
          if (item['disabled']) {
            contentCheckboxEl.setAttribute("data-vrplyr--menu-mark-disabled", "yes");
          } else {
            contentCheckboxEl.setAttribute("data-vrplyr--menu-mark-disabled", "no");
          }
        }

      }

      for (var key in oldChildrenKeys) {
        var oldItemEl = menuEl.querySelector('.vrplyr-menu-item-key--' + key);
        if (oldItemEl) menuEl.removeChild(oldItemEl);

      }

      if (isNewItem) {
        var oldMenuItemEl = el.querySelector('.vrplyr-menu-items');
        if (oldMenuItemEl) {
          el.replaceChild(menuEl, oldMenuItemEl);
        } else {
          el.appendChild(menuEl);
        }
      }
    }
    const closeMenu = () => {
      var data = getMenuItemObj()[menuKey].items;
      var el = getMenuItemObj()[menuKey].el.querySelector('.vrplyr-settings-menu');
      var ItemsEl = el.querySelector('.vrplyr-menu-items'),
        HeadingEl = el.querySelector('.vrplyr-menu-items--header');
      if (ItemsEl) el.removeChild(ItemsEl);
      if (HeadingEl) el.removeChild(HeadingEl);

      if (getMenuItemObj()[menuKey].hasOwnProperty("opened-route")) delete getMenuItemObj()[menuKey]['opened-route'];
    }
    const isOpened = () => {
      if (getMenuItemObj()[menuKey].hasOwnProperty("opened-route"))
        return true;
      else
        return false;
    };
    const openMenu = (route = '/') => {
      var data = getMenuItemObj()[menuKey].items;
      var el = getMenuItemObj()[menuKey].el;
      route = makeNevRoute(route);
      getMenuItemObj()[menuKey]['opened-route'] = route;
      const nevigateMenu = (route) => {
        return openMenu(makeNevRoute(route));
      }

      var menuItem = getMenuData(data, route);
      var menuEl = document.createElement('ul');
      menuEl.addEventListener("click", (e) => {
        var menuItemClk = e.target.closest('.vrplyr-menu-item');
        if (!menuItemClk) return;
        var role = menuItemClk.getAttribute("role");
        var itemKey = menuItemClk.dataset["vrplyr-MenuItemKey"];
        switch (role) {
          case "vrplyr-menu-child-menu":
            nevigateMenu(route + '/' + itemKey);
            break;
          case "vrplyr-menu-child-toggle-checkbox":
            {
              let ItemMethod = Item(route).get(itemKey);
              if (ItemMethod && ItemMethod.item.onClick) {
                ItemMethod.item.onClick.call(null, {
                  route: route,
                  key: itemKey,
                  menuKey: menuKey,
                  Item,
                  nevigateMenu,
                  closeMenu
                });
              }
            }
            break;
          case "vrplyr-menu-child-mark":
            {
              let ItemMethod = Item(route).get(itemKey);
              if (ItemMethod && ItemMethod.item.onClick) {
                ItemMethod.item.onClick.call(null, {
                  route: route,
                  key: itemKey,
                  menuKey: menuKey,
                  Item,
                  nevigateMenu,
                  closeMenu
                })
              }
            }
            break;
          default:
            break;
        }
      }, true);
      addClass(menuEl, 'vrplyr-menu-items');
      menuEl.setAttribute('role', "vrplyr-menu");
      syncItemElem(menuItem, menuEl);
      var settingsMenuEl = getMenuItemObj()[menuKey].el.querySelector('.vrplyr-settings-menu');
      settingsMenuEl.style["max-height"] = (this.playerEl.offsetHeight - this.controls.offsetHeight - 10) + "px";
      var left = getMenuItemObj()[menuKey].el.offsetLeft - (settingsMenuEl.offsetWidth / 2);

      if (settingsMenuEl.offsetWidth + 5 /*5px for margin*/ > this.playerEl.offsetWidth) {
        var offsetRight = window.innerWidth - (this.playerEl.offsetWidth + this.playerEl.offsetLeft);
        if (this.playerEl.offsetLeft > offsetRight) {
          settingsMenuEl.style.left = null;
          settingsMenuEl.style.right = 5 + 'px';
        } else {
          settingsMenuEl.style.right = null;
          settingsMenuEl.style.left = 5 + 'px';
        }
      } else {
        if ((settingsMenuEl.offsetWidth + left + 5) > this.playerEl.offsetWidth) {
          settingsMenuEl.style.left = null;
          settingsMenuEl.style.right = 5 + 'px';
        } else {
          settingsMenuEl.style.right = null;
          settingsMenuEl.style.left = left + 'px';
        }
      }
    }
    return {
      makeNevRoute,
      createMenu,
      closeMenu,
      openMenu,
      Item,
      isOpened
    }

  }
  reset() {

  }
  distroy() {

  }
}
Player.apps = {};
export default Player;