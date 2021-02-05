const storageGet = chrome.storage.local.get;

let allowInjection = true;
let storedObjectPrefix = getRandomString();
let storageElems;
let notificationTimeoutID;


if (window.frameElement != null && window.frameElement.sandbox != null) {
    allowInjection = false;
    for (let i = 0; i < window.frameElement.sandbox.length; i++) {
        const val = window.frameElement.sandbox[i];
        if (val == 'allow-scripts') {
            allowInjection = true;
        }
    }
}

if (allowInjection) {
    storageGet(["docId", "data"], (elems)=>{
        const {docId, data = true} = elems || {};
        if (!data) return;
        storageElems = elems;
        overrideMethods(docId, JSON.parse(data));
    });
}

function overrideMethods(docId, data) {
    const script = document.createElement('script');
    script.id = getRandomString();
    script.type = "text/javascript";
    if (allowInjection) {
        var newChild = document.createTextNode('try{(' + overrideDefaultMethods + ')(' + data.r + ',' + data.g + ',' + data.b + ',' + data.a + ',"' + script.id + '", "' + storedObjectPrefix + '");} catch (e) {console.error(e);}');
        script.appendChild(newChild);
        var node = (document.documentElement || document.head || document.body);
        if (typeof node[docId] === 'undefined') {
            node.insertBefore(script, node.firstChild);
            node[docId] = getRandomString();
        }
    }
}

function getRandomString() {
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz";
    for (var i = 0; i < 5; i++)
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
}

function overrideDefaultMethods(r, g, b, a, scriptId, storedObjectPrefix) {
    var scriptNode = document.getElementById(scriptId);
    function overrideCanvasProto(root) {
        function overrideCanvasInternal(name, old) {
            root.prototype[storedObjectPrefix + name] = old;
            Object.defineProperty(root.prototype, name,
                {
                    value: function () {
                        var width = this.width;
                        var height = this.height;
                        var context = this.getContext("2d");
                        var imageData = context.getImageData(0, 0, width, height);
                        for (var i = 0; i < height; i++) {
                            for (var j = 0; j < width; j++) {
                                var index = ((i * (width * 4)) + (j * 4));
                                imageData.data[index + 0] = imageData.data[index + 0] + r;
                                imageData.data[index + 1] = imageData.data[index + 1] + g;
                                imageData.data[index + 2] = imageData.data[index + 2] + b;
                                imageData.data[index + 3] = imageData.data[index + 3] + a;
                            }
                        }
                        context.putImageData(imageData, 0, 0);
                        return old.apply(this, arguments);
                    }
                }
            );
        }
        overrideCanvasInternal("toDataURL", root.prototype.toDataURL);
        overrideCanvasInternal("toBlob", root.prototype.toBlob);
    }
    function overrideCanvaRendProto(root) {
        const name = "getImageData";
        const getImageData = root.prototype.getImageData;

        root.prototype[storedObjectPrefix + name] = getImageData;

        Object.defineProperty(root.prototype, "getImageData",
            {
                value: function () {
                    var imageData = getImageData.apply(this, arguments);
                    var height = imageData.height;
                    var width = imageData.width;
                    for (var i = 0; i < height; i++) {
                        for (var j = 0; j < width; j++) {
                            var index = ((i * (width * 4)) + (j * 4));
                            imageData.data[index + 0] = imageData.data[index + 0] + r;
                            imageData.data[index + 1] = imageData.data[index + 1] + g;
                            imageData.data[index + 2] = imageData.data[index + 2] + b;
                            imageData.data[index + 3] = imageData.data[index + 3] + a;
                        }
                    }
                    return imageData;
                }
            }
        );
    }
    function inject(element) {
        if (element.tagName.toUpperCase() === "IFRAME" && element.contentWindow) {
            try {
                var hasAccess = element.contentWindow.HTMLCanvasElement;
            } catch (e) {
                console.log("can't access " + e);
                return;
            }
            overrideCanvasProto(element.contentWindow.HTMLCanvasElement);
            overrideCanvaRendProto(element.contentWindow.CanvasRenderingContext2D);
            overrideDocumentProto(element.contentWindow.Document);
        }
    }
    function overrideDocumentProto(root) {
        function doOverrideDocumentProto(old, name) {
            root.prototype[storedObjectPrefix + name] = old;
            Object.defineProperty(root.prototype, name,
                {
                    value: function () {
                        var element = old.apply(this, arguments);
                        if (element == null) {
                            return null;
                        }
                        if (Object.prototype.toString.call(element) === '[object HTMLCollection]' ||
                            Object.prototype.toString.call(element) === '[object NodeList]') {
                            for (var i = 0; i < element.length; ++i) {
                                var el = element[i];
                                inject(el);
                            }
                        } else {
                            inject(element);
                        }
                        return element;
                    }
                }
            );
        }
        doOverrideDocumentProto(root.prototype.createElement, "createElement");
        doOverrideDocumentProto(root.prototype.createElementNS, "createElementNS");
        doOverrideDocumentProto(root.prototype.getElementById, "getElementById");
        doOverrideDocumentProto(root.prototype.getElementsByName, "getElementsByName");
        doOverrideDocumentProto(root.prototype.getElementsByClassName, "getElementsByClassName");
        doOverrideDocumentProto(root.prototype.getElementsByTagName, "getElementsByTagName");
        doOverrideDocumentProto(root.prototype.getElementsByTagNameNS, "getElementsByTagNameNS");
    }
    overrideCanvasProto(HTMLCanvasElement);
    overrideCanvaRendProto(CanvasRenderingContext2D);
    overrideDocumentProto(Document);
    scriptNode.parentNode.removeChild(scriptNode);
}



// iframe.contentWindow
if (
  window !== top &&
  location.href === 'about:blank'
) {
  try {
    top.document; // are we on the same frame?

    const script = document.createElement('script');
    script.textContent = `{
      const nav = top.navigator;

      navigator.__defineGetter__('userAgent', () => nav.userAgent);
      navigator.__defineGetter__('appVersion', () => nav.appVersion);
      navigator.__defineGetter__('platform', () => nav.platform);
      navigator.__defineGetter__('vendor', () => nav.vendor);

      document.documentElement.dataset.fgdvcre = true;
    }`;
    document.documentElement.appendChild(script);
    script.remove();
    // make sure the script is injected
    if (document.documentElement.dataset.fgdvcre !== 'true') {
      document.documentElement.dataset.fgdvcre = true;
      const script = document.createElement('script');
      Object.assign(script, {
        textContent: `
          [...document.querySelectorAll('iframe[sandbox]')]
            .filter(i => i.contentDocument.documentElement.dataset.fgdvcre === 'true')
            .forEach(i => {
              const nav = i.contentWindow.navigator;
              nav.__defineGetter__('userAgent', () => navigator.userAgent);
              nav.__defineGetter__('appVersion', () => navigator.appVersion);
              nav.__defineGetter__('platform', () => navigator.platform);
              nav.__defineGetter__('vendor', () => navigator.vendor);
            });
        `
      });
      top.document.documentElement.appendChild(script);
      script.remove();
    }
    delete document.documentElement.dataset.fgdvcre;
  }
  catch (e) {}
}



var prefs = `
  Date.prefs = Date.prefs || [
    'Etc/GMT', 0, new Date().getTimezoneOffset(), 'London Standard Time'
  ];
  try { // get preferences for subframes synchronously
    Date.prefs = window.parent.Date.prefs;
  }
  catch (e) {}
`;

var intl = `
  const intl = Intl.DateTimeFormat.prototype.resolvedOptions;
  Intl.DateTimeFormat.prototype.resolvedOptions = function(...args) {
    return Object.assign(intl.apply(this, args), {
      timeZone: Date.prefs[0]
    });
  };
`;

var shiftedDate = `
  const clean = str => {
    const toGMT = offset => {
      const z = n => (n < 10 ? '0' : '') + n;
      const sign = offset <= 0 ? '+' : '-';
      offset = Math.abs(offset);
      return sign + z(offset / 60 | 0) + z(offset % 60);
    };
    str = str.replace(/([T\\(])[\\+-]\\d+/g, '$1' + toGMT(Date.prefs[1]));
    if (str.indexOf(' (') !== -1) {
      str = str.split(' (')[0] + ' (' + Date.prefs[3] + ')';
    }
    return str;
  }

  const ODate = Date;
  const {
    getTime, getDate, getDay, getFullYear, getHours, getMilliseconds, getMinutes, getMonth, getSeconds, getYear,
    toDateString, toLocaleString, toString, toTimeString, toLocaleTimeString, toLocaleDateString,
    setYear, setHours, setTime, setFullYear, setMilliseconds, setMinutes, setMonth, setSeconds, setDate,
    setUTCDate, setUTCFullYear, setUTCHours, setUTCMilliseconds, setUTCMinutes, setUTCMonth, setUTCSeconds
  } = ODate.prototype;
  class ShiftedDate extends ODate {
    constructor(...args) {
      super(...args);
      this.nd = new ODate(
        getTime.apply(this) + (Date.prefs[2] - Date.prefs[1]) * 60 * 1000
      );
    }
    // get
    toLocaleString(...args) {
      return toLocaleString.apply(this.nd, args);
    }
    toLocaleTimeString(...args) {
      return toLocaleTimeString.apply(this.nd, args);
    }
    toLocaleDateString(...args) {
      return toLocaleDateString.apply(this.nd, args);
    }
    toDateString(...args) {
      return toDateString.apply(this.nd, args);
    }
    getDate(...args) {
      return getDate.apply(this.nd, args);
    }
    getDay(...args) {
      return getDay.apply(this.nd, args);
    }
    getFullYear(...args) {
      return getFullYear.apply(this.nd, args);
    }
    getHours(...args) {
      return getHours.apply(this.nd, args);
    }
    getMilliseconds(...args) {
      return getMilliseconds.apply(this.nd, args);
    }
    getMinutes(...args) {
      return getMinutes.apply(this.nd, args);
    }
    getMonth(...args) {
      return getMonth.apply(this.nd, args);
    }
    getSeconds(...args) {
      return getSeconds.apply(this.nd, args);
    }
    getYear(...args) {
      return getYear.apply(this.nd, args);
    }
    // set
    setHours(...args) {
      const a = getTime.call(this.nd);
      const b = setHours.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setFullYear(...args) {
      const a = getTime.call(this.nd);
      const b = setFullYear.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setMilliseconds(...args) {
      const a = getTime.call(this.nd);
      const b = setMilliseconds.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setMinutes(...args) {
      const a = getTime.call(this.nd);
      const b = setMinutes.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setMonth(...args) {
      const a = getTime.call(this.nd);
      const b = setMonth.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setSeconds(...args) {
      const a = getTime.call(this.nd);
      const b = setSeconds.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setDate(...args) {
      const a = getTime.call(this.nd);
      const b = setDate.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setYear(...args) {
      const a = getTime.call(this.nd);
      const b = setYear.apply(this.nd, args);
      setTime.call(this, getTime.call(this) + b - a);
      return b;
    }
    setTime(...args) {
      const a = getTime.call(this);
      const b = setTime.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    setUTCDate(...args) {
      const a = getTime.call(this);
      const b = setUTCDate.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    setUTCFullYear(...args) {
      const a = getTime.call(this);
      const b = setUTCFullYear.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    setUTCHours(...args) {
      const a = getTime.call(this);
      const b = setUTCHours.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    setUTCMilliseconds(...args) {
      const a = getTime.call(this);
      const b = setUTCMilliseconds.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    setUTCMinutes(...args) {
      const a = getTime.call(this);
      const b = setUTCMinutes.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    setUTCMonth(...args) {
      const a = getTime.call(this);
      const b = setUTCMonth.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    setUTCSeconds(...args) {
      const a = getTime.call(this);
      const b = setUTCSeconds.apply(this, args);
      setTime.call(this.nd, getTime.call(this.nd) + b - a);
      return b;
    }
    // toString
    toString(...args) {
      return clean(toString.apply(this.nd, args));
    }
    toTimeString(...args) {
      return clean(toTimeString.apply(this.nd, args));
    }
    // offset
    getTimezoneOffset() {
      return Date.prefs[1];
    }
  }
`;

var script = document.createElement('script');
script.textContent = `{
  ${prefs}
  ${intl}
  ${shiftedDate}
  Date = ShiftedDate;
}`;
document.documentElement.appendChild(script);
script.remove();
