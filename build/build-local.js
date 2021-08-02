// 构建本地版文件，模块直接从本地加载，要求允许脚本管理器访问本地文件
const fs = require("fs");
const meta = require("../meta.json");
const resource = require("../resource.json")

fs.readFile("./JavaScript/index.js", "utf-8", (err, data) => {
    if (err) throw err;
    let content = Object.keys(meta).reduce((s, d) => {
        s = Array.isArray(meta[d]) ? meta[d].reduce((a, b) => {
            a = `${a}// @${d.padEnd(13, " ")}${b}\r\n`;
            return a;
        }, s) : `${s}// @${d.padEnd(13, " ")}${meta[d]}\r\n`;
        return s;
    }, "// ==UserScript==\r\n");
    content = Object.keys(resource).reduce((s, d) => {
        let arr = d.split("/");
        s = `${s}// @resource     ${arr[arr.length - 1]} file:///${process.argv[2].replace(/\\/g, "/")}/${d}\r\n`;
        return s;
    }, content) + "// ==/UserScript==\r\n" + data.replace("\"use strict\";", "");
    fs.writeFile("./main.user.js", content, (err) => { if (err) throw err })
})