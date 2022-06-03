function insertAfter(referenceNode, newNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function insertBefore(referenceNode, newNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode);
}

function prependChild(referenceNode, newNode) {
  referenceNode.insertBefore(newNode, referenceNode.childNodes[0]);
}
function hasClass(element, className) {
  return element.classList.contains(className);
}
function stripToClassName(str) {
  str = str.replace(/[^A-Za-z0-9_-]/gi, '=').toLowerCase().replace(/(^=)|(=$)/g, "");
  str = str.replace(/=+/g, '-');
  return str;
}

function containsWord(str, searchValue, matchCase) {
  if (!str || !searchValue) return false;
  if (!matchCase) {
    str = str.toLowerCase();
    searchValue = searchValue.toLowerCase();
  }
  var words = str.split(/ /g);
  return words.indexOf(searchValue) > -1
}

function removeClass(el, className) {
  if (!el) return;
  if (isElement(el)) {
    if (el.classList.contains(className)) {
      el.classList.remove(className);
    }
  } else {
    var Els = el;
    if (typeof el === 'string') {
      Els = document.querySelectorAll(el);
    }
    if (!Els) return;
    Els.forEach(function(el) {
      if (el.classList.contains(className)) {
        el.classList.remove(className);
      }
    });
  }

}

function addClass(el, className) {
  if (!el) return;
  if (isElement(el)) {
    if (!el.classList.contains(className)) {
      el.classList.add(className);
    }
  } else {
    var Els = el;
    if (typeof el === 'string') {
      Els = document.querySelectorAll(el);
    }
    if (!Els) return;
    Els.forEach(function(el) {
      if (!el.classList.contains(className)) {
        el.classList.add(className);
      }
    });
  }
}

function toggleClasses(el, haystack, needle) {
  if(needle) needle = needle.trim().toLowerCase();
  haystack.forEach(
    item => {
      item = item.trim().toLowerCase();
      if (item !== needle) {
        if (el.classList.contains(item)) {
          el.classList.remove(item);
        }
      }
    }
  );
  if (needle && !el.classList.contains(needle)) {
    el.classList.add(needle);
  }
}

function moveEl(from, dest) {
  var fragment = document.createDocumentFragment();
  fragment.appendChild(from);
  dest.appendChild(fragment);
}

function isElement(element) {
  return element instanceof Element || element instanceof HTMLDocument;
}

function isStartWith(needle, haystack){
    return (haystack.substr(0, needle.length) == needle);
}
const isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    Any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};
export { isMobile, isStartWith, stripToClassName, toggleClasses, isElement, moveEl, containsWord, insertAfter, insertBefore,prependChild, addClass, removeClass, hasClass };
