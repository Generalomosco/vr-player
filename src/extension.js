import Player from './player';

const extensionsBased = {};


const mergeExtension = (name, extension) => {
  extension.prototype.name = name;

  return function(...args) {
    const instance = new extension(...[this, ...args]);
    this[name] = () => instance;

    return instance;
  };
};
class Extension {
  constructor(app) {
    if (this.constructor === Extension) {
      throw new Error('Invalid Extension!');
    }

    this.app = app;
    this.distroy = this.distroy.bind(this);
    this.app.Event.on('distroy', this.distroy);
  }

  distroy() {
    this.app.Event.off('distroy', this.distroy);
    this.app = null;
    this.app[this.name] = mergeExtension(this.name, extensionsBased[this.name]);
  }

  
  static addExtension(extension,name) {
    if (typeof name !== 'string') {
      throw new Error(`Extension name must be a type string "${name}"!`);
    }

    if (extensionsBased[name] || Player.prototype.hasOwnProperty(name)) {
      throw new Error(`Found existing extension same name with "${name}"!`);
    }

    if (typeof extension !== 'function') {
      throw new Error(`"${name}" must be a type function!`);
    }
    extensionsBased[name] = extension;
    Player.prototype[name] = mergeExtension(name, extension);

    return extension;
  }

}

Extension.addExtension(Extension,'extension');

export default Extension;