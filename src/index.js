if (window.NodeList && !NodeList.prototype.forEach) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}
import vrPlayer from './player';
import extension from './extension';
import './playVR';
window.vrPlayer = vrPlayer;
vrPlayer.Entity = {
  extension: extension
};
setTimeout(() => {
  if (window.vrPlayerWaits) {
    for (let i in window.vrPlayerWaits) {
      window.vrPlayerWaits[i].cb();
    }
    window.vrPlayerWaits = [];
  }
}, 0);
export default vrPlayer;