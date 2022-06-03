var TARGET = document;
_EventHandlePolyfill();

function _EventHandlePolyfill() {
  if (typeof window.EventHandle === 'function') {
    return;
  }

  function EventHandle(event, params) {
    var evt = document.createEvent('CustomEvent');

    params = params || {
      bubbles: false,
      cancelable: false,
      detail: undefined
    };
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);

    return evt;
  }

  EventHandle.prototype = window.Event.prototype;
  window.EventHandle = EventHandle;
}

/**
 * @param {String} eventName 
 * @param {Object} detail
 */
function _dispatchEvent(eventName, detail) {
  var event = new EventHandle(eventName, {
    detail: detail
  });

  TARGET.dispatchEvent(event);
}
export default class EventHandler {
  constructor(
    appID
  ) {
    this.eventPrefix = 'vrplyr--' + appID;
  }


  on(eventName, callback) {
    if (typeof eventName === 'string') {
      TARGET.addEventListener(this.eventPrefix + eventName, callback);
    } else {
      eventName.forEach((evt) => {
        TARGET.addEventListener(this.eventPrefix + evt, callback);
      });
    }
    return {
      remove: () => {
        if (typeof eventName === 'string') {
          TARGET.removeEventListener(this.eventPrefix + eventName, callback);
        } else {
          eventName.forEach((evt) => {
            TARGET.removeEventListener(this.eventPrefix + evt, callback);
          });
        }
      }
    }
  }
  /**
   * @param {String} eventName 
   * @param {Function} callback 
   */
  once(eventName, callback) {
    TARGET.addEventListener(this.eventPrefix + eventName, callback, {
      once: true
    });
    return {
      remove: () => {
        TARGET.removeEventListener(this.eventPrefix + eventName, callback);
      }
    }
  }

  /**
   * @param {String} eventName 
   */
  off(eventName, Fn) {
    TARGET.removeEventListener(this.eventPrefix + eventName, Fn);
  }

  /**
   * @param {String} eventName 
   * @param {Object} detail
   */
  fire(eventName, detail) {
    _dispatchEvent(this.eventPrefix + eventName, detail || null);
  }
}