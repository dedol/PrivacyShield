const storageSet = chrome.storage.local.set;
const storageGet = chrome.storage.local.get;
const HashLength = 30;

let data;
let dataHash;
let g_latestUpdate;
let docId = getRandomString();

function notifyUser(message) {
    var options = {
        type: "basic", 
        title: "Privacy Shield",
        message: message
    };
    chrome.notifications.create(options);
}

title_info = {
    "Canvas Hash": "not set",
    "User-Agent": "default",
    "Timezone": "not set"
}

function update_title() {
    text = "";
    for (const [key, value] of Object.entries(title_info))
        text += key + ": " + value + "\n";
    chrome.browserAction.setTitle({title: text});
}

storageSet({docId});

storageGet(["data", "latestUpdate"], (items = {})=>{
    const {latestUpdate = 0} = items;
    g_latestUpdate = latestUpdate;
    data = items["data"];
    if (data) {
        console.log(data);
        dataHash = md5(data).substring(0, HashLength);
        title_info["Canvas Hash"] = dataHash;
        update_title();
        data = JSON.parse(data);
    } else {
        update_fp(show_notify=false);
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "panel-data-hash") {
        sendResponse({dataHash, "latestUpdate": g_latestUpdate});
    } else if (request.action === "generate-fingerprint") {
        update_fp();
    }
});

function generateNewFingerPrint() {
    return new Promise((success, fail)=>{
        data = {};
        data.r = HashLength - randomIntFromInterval(0, HashLength + 10);
        data.g = HashLength - randomIntFromInterval(0, HashLength + 10);
        data.b = HashLength - randomIntFromInterval(0, HashLength + 10);
        data.a = HashLength - randomIntFromInterval(0, HashLength + 10);
        const jsonData = JSON.stringify(data);
        g_latestUpdate = Date.now();
        storageSet({"data": jsonData, "latestUpdate": g_latestUpdate}, ()=>{
            success(md5(jsonData).substring(0, HashLength));
        });
    });
}

function generateNewFP() {
    data = {};
    data.r = HashLength - randomIntFromInterval(0, HashLength + 10);
    data.g = HashLength - randomIntFromInterval(0, HashLength + 10);
    data.b = HashLength - randomIntFromInterval(0, HashLength + 10);
    data.a = HashLength - randomIntFromInterval(0, HashLength + 10);
    const jsonData = JSON.stringify(data);
    g_latestUpdate = Date.now();
    storageSet({"data": jsonData, "latestUpdate": g_latestUpdate}, ()=>{
        return md5(jsonData).substring(0, HashLength);
    });
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function getRandomString() {
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz";
    for (var i = 0; i < 5; i++)
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
}

async function update_fp(show_notify=true) {
    const dataHash = await generateNewFingerPrint();
    if (show_notify)
        notifyUser("CanvasFP is changed to " + dataHash);
    title_info["Canvas Hash"] = dataHash;
    update_title();
}

// WebRTC
browser.privacy.network.peerConnectionEnabled.set({value: false});
browser.privacy.network.webRTCIPHandlingPolicy.set({value: 'disable_non_proxied_udp'});

var ua = {
    "userAgent": "",
    "appVersion": "",
    "platform": "",
    "vendor": "",
    "product": "",
    "oscpu": "",
}

function get_new_ua() {
    var random_ua = ua_list[Math.round(Math.random()*ua_list.length)];
    return random_ua
}

function update_ua(useragent, show_notify=true) {
    ua.userAgent = useragent;
    ua.appVersion = useragent.replace(/^Mozilla\//, '').replace(/^Opera\//, '');
    const p = (new UAParser(useragent)).getResult();
    ua.platform = p.os.name || '';
    ua.vendor = p.device.vendor || '';
    ua.product = p.engine.name || '';
    ua.oscpu = ((p.os.name || '') + ' ' + (p.os.version || '')).trim();

    chrome.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);
    chrome.webNavigation.onCommitted.removeListener(onCommitted);
    chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeaders, {
        'urls': ['*://*/*']
    }, ['blocking', 'requestHeaders']);
    chrome.webNavigation.onCommitted.addListener(onCommitted);

    info = p.browser.name + ' ' + p.browser.version + ' (' + p.os.name + ' ' + p.os.version + ')';
    title_info["User-Agent"] = info;
    update_title();
    chrome.storage.local.set({ua: useragent});
    if (show_notify)
        notifyUser('User-Agent is changed to ' + info);
}


chrome.storage.local.get('ua', (items = {})=>{
    saved_ua = items["ua"];
    if (saved_ua) {
        update_ua(saved_ua, show_notify=false)
    } else {
        update_ua(get_new_ua(), show_notify=false);
    }
});

window.ua = ua;

const onBeforeSendHeaders = ({requestHeaders}) => {
    const str = ua.userAgent;
    for (let i = 0, name = requestHeaders[0].name; i < requestHeaders.length; i += 1, name = requestHeaders[i].name) {
        if (name === 'User-Agent' || name === 'user-agent') {
            requestHeaders[i].value = str === 'empty' ? '' : str;
            return {
                requestHeaders
            };
        }
    }
};

const onCommitted = ({frameId, url, tabId}) => {
    if (url && (url.startsWith('http') || url.startsWith('ftp')) || url === 'about:blank') {
        let {userAgent, appVersion, platform, vendor, product, oscpu} = ua;
        console.log('onCommitted' );
        chrome.tabs.executeScript(tabId, {
            runAt: 'document_start',
            allFrames: true,
            code: `{
                const script = document.createElement('script');
                script.textContent = \`{
                    const userAgent = "${encodeURIComponent(userAgent)}";
                    const appVersion = "${encodeURIComponent(appVersion)}";
                    const platform = "${encodeURIComponent(platform)}";
                    const vendor = "${encodeURIComponent(vendor)}";
                    const product = "${encodeURIComponent(product)}";
                    const oscpu = "${encodeURIComponent(oscpu)}";
                    navigator.__defineGetter__('userAgent', () => decodeURIComponent(userAgent));
                    navigator.__defineGetter__('appVersion', () => decodeURIComponent(appVersion));
                    navigator.__defineGetter__('platform', () => decodeURIComponent(platform));
                    navigator.__defineGetter__('vendor', () => decodeURIComponent(vendor));
                    navigator.__defineGetter__('product', () => decodeURIComponent(product));
                    navigator.__defineGetter__('oscpu', () => decodeURIComponent(oscpu));
                    navigator.__defineGetter__('productSub', () => '');
                }\`;
                document.documentElement.appendChild(script);
                script.remove();
            }`
        });
    }

    if (url && url.startsWith('http')) {
        let location = localStorage.getItem('location');
        const standard = localStorage.getItem('standard');
        const daylight = localStorage.getItem('daylight');

        let offset = localStorage.getItem('offset') || 0;
        let msg = localStorage.getItem('isDST') === 'false' ? standard : daylight;

        chrome.tabs.executeScript(tabId, {
          runAt: 'document_start',
          frameId,
          matchAboutBlank: true,
          code: `document.documentElement.appendChild(Object.assign(document.createElement('script'), {
            textContent: 'Date.prefs = ["${location}", ${-1 * offset}, ${df}, "${msg}"];'
          })).remove();`
        }, () => chrome.runtime.lastError);
  }
};


var df = (new Date()).getTimezoneOffset();

var randoms = {};
chrome.tabs.onRemoved.addListener(tabId => delete randoms[tabId]);

var set = (timezone = 'Etc/GMT') => {
  const {offset, storage} = resolve.analyze(timezone);
  localStorage.setItem('offset', offset);
  localStorage.setItem('isDST', offset !== storage.offset);
  localStorage.setItem('location', timezone);
  localStorage.setItem('daylight', storage.msg.daylight);
  localStorage.setItem('standard', storage.msg.standard);
};

var update_tz = async(show_notify=true) => {
  try {
    const timezone = await resolve.remote();
    set(timezone);

    if (show_notify)
        notifyUser('Timezone is changed to ' + timezone);
    title_info["Timezone"] = timezone;
    update_title();
  }
  catch(e) {}
};

update_tz(show_notify=false);

{
  const contextMenu = () => {
    chrome.contextMenus.create({
      title: 'Change Canvas FP',
      id: 'update-fp',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      title: 'Change User-Agent',
      id: 'update-ua',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      title: 'Change Timezone',
      id: 'update-tz',
      contexts: ['browser_action']
    });
  };
  chrome.runtime.onInstalled.addListener(contextMenu);
  chrome.runtime.onStartup.addListener(contextMenu);
}

chrome.contextMenus.onClicked.addListener(({menuItemId}) => {
  if (menuItemId === 'update-fp') {
    update_fp();
  }
  else if (menuItemId === 'update-ua') {
    update_ua(get_new_ua());
  }
  else if (menuItemId === 'update-tz') {
    update_tz();
  }
});

chrome.browserAction.onClicked.addListener(() => {
    update_fp(show_notify=false).then(() =>
        update_tz(show_notify=false).then(() => {
            update_ua(get_new_ua(), show_notify=false);
            notify = ""
            for (const [key, value] of Object.entries(title_info))
                notify += key + ": " + value + "\n";
            notifyUser(notify)
        })
    );
});