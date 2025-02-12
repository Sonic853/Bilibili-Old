interface modules {
    /** 失效视频 */
    readonly "lostVideo.js": string;
}
namespace API {
    async function getLostVideo(aid: number) {
        let result = []; // 失效视频信息缓存
        try { // 尝试访问Biliplus
            let data = await xhr.GM({ url: `https://www.biliplus.com/video/av${aid}` }, true);
            if (data.match(/\<title\>.+?\ \-\ AV/)) {
                result[0] = data.match(/\<title\>.+?\ \-\ AV/)[0].replace(/<title>/, "").replace(/ - AV/, "");
                result[1] = data.match(/\<img style=\"display:none\"\ src=\".+?\"\ alt/)[0].replace(/<img style="display:none" src="/, "").replace(/" alt/, "");
            }
        } catch (e) { debug.error("lostVideo.js", e) }
        if (!result[0] || !result[1]) {
            try { // 标题或封面无效，尝试访问Biliplus CID缓存库
                let data = await xhr.GM({ url: `https://www.biliplus.com/all/video/av${aid}/` }, true);
                if (data.match('/api/view_all?')) {
                    data = data.match(/\/api\/view_all\?.+?\',cloudmoe/)[0].replace(/\',cloudmoe/, "");
                    data = await xhr.GM({ url: `//www.biliplus.com${data}` }, true);
                    data = jsonCheck(data).data;
                    result[0] = result[0] || data.info.title;
                    result[1] = result[1] || data.info.pic;
                }
            } catch (e) { debug.error("lostVideo.js", e) }
        }
        if (!result[0] || !result[1]) {
            try { // 标题或封面依旧无效，尝试访问jijidown
                let data = await xhr.GM({ url: `https://www.jijidown.com/video/${aid}` }, true);
                if (data.match('window._INIT')) {
                    result[0] = result[0] || data.match(/\<title\>.+?\-哔哩哔哩唧唧/)[0].replace(/<title>/, "").replace(/-哔哩哔哩唧唧/, "");
                    result[1] = result[1] || data.match(/\"img\":\ \".+?\",/)[0].match(/http.+?\",/)[0].replace(/",/, "");
                }
            } catch (e) { debug.error("lostVideo.js", e) }
        }
        result[0] = result[0] || `av${aid}` // 无法获取有效数据，将标题改为av号
        result[1] = result[1] ? result[1].replace("http:", "") : "//i0.hdslb.com/bfs/archive/be27fd62c99036dce67efface486fb0a88ffed06.jpg"; //无法获取有效数据，将封面改为哭脸
        return result;
    }
    observerAddedNodes((node) => {
        if (/section channel guest/.test(node.className)) {
            let items = node.querySelectorAll(".small-item.disabled");
            items.forEach(d => {
                let aid = <any>d.getAttribute("data-aid"); // 获取aid
                aid = Number(aid) || abv(aid); // 转化为数字
                d.setAttribute("class", "small-item fakeDanmu-item");
                d.setAttribute("data-aid", aid);
                (<HTMLAnchorElement>d.children[0]).href = `//www.bilibili.com/video/av${aid}`;
                (<HTMLAnchorElement>d.children[1]).href = `//www.bilibili.com/video/av${aid}`;
                d.children[0].setAttribute("target", "_blank");
                d.children[1].setAttribute("target", "_blank");
                d.children[0].setAttribute("class", "cover cover-normal");
                d.children[1].setAttribute("style", "text-decoration : line-through;color : #ff0000;");
                getLostVideo(aid).then(data => {
                    d.children[1].setAttribute("title", data[0]);
                    (<HTMLAnchorElement>d.children[1]).text = data[0];
                    (<HTMLImageElement>d.children[0].children[0]).alt = data[0];
                    (<HTMLImageElement>d.children[0].children[0]).src = data[1];
                })
            })
        }
        if (/small-item disabled/.test(node.className)) {
            let aid: any = node.getAttribute("data-aid"); // 获取aid
            aid = Number(aid) || abv(aid); // 转化为数字
            node.setAttribute("class", "small-item fakeDanmu-item");
            node.setAttribute("data-aid", aid);
            (<HTMLAnchorElement>node.children[0]).href = `//www.bilibili.com/video/av${aid}`;
            (<HTMLAnchorElement>node.children[1]).href = `//www.bilibili.com/video/av${aid}`;
            node.children[0].setAttribute("target", "_blank");
            node.children[1].setAttribute("target", "_blank");
            node.children[0].setAttribute("class", "cover cover-normal");
            node.children[1].setAttribute("style", "text-decoration : line-through;color : #ff0000;");
            getLostVideo(aid).then(data => {
                node.children[1].setAttribute("title", data[0]);
                (<HTMLAnchorElement>node.children[1]).text = data[0];
                (<HTMLImageElement>node.children[0].children[0]).alt = data[0];
                (<HTMLImageElement>node.children[0].children[0]).src = data[1];
            })
        }
    })
}