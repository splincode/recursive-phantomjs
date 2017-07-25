const phantomjs = require('phantomjs-prebuilt');
const path = require('path');
const childProcess = require('child_process');
const binPath = phantomjs.path;
const webkitExecutableFile = path.resolve(__dirname, 'helpers', 'webkit-render-page.model.js');

const config = require('./config');
const sleep = require("system-sleep");
const startTime = Date.now();
const endTime = config['time'] * 1000;

let host = config['host'];
let port = config['port'];
let urlList = config['url-list'];
let poolTask = [];

for (let page in urlList) {
    if (urlList.hasOwnProperty(page)) {
        let url = host + urlList[page].url;
        poolTask.push(url);
    }
}

initPage(poolTask.slice());

function initPage(tasks) {
    makePage(tasks);
}

function makePage(urls, cookie = null) {
    let address = urls.splice(0,1)[0];
    console.log("[GET]", address);

    childProcess.execFile(binPath, [ webkitExecutableFile, address, JSON.stringify(cookie || {}) ], (err, stdout, stderr) => {
        let currentCookie = null;

        try {
            let out = JSON.parse(stdout);
            out.logs.forEach(str => console.log(str));
            currentCookie = out['cookie'][0];
        } catch (e) {
            console.log(stdout);
        }

        console.log(stderr);

        if (urls.length) {
            makePage(urls, currentCookie);
        } else {
            console.log("[SLEEP]", config.wait, "\n\n");
            sleep(Number(config.wait));

            if (Date.now() - startTime < endTime) {
                initPage(poolTask.slice());
            }

        }
    });

}
