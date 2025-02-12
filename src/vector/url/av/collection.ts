interface modules {
    /** 合集列表，按分p方式显示, 不支持section */
    readonly "collection.js": string;
}
namespace API {
    function calcDivWidth(text: string) {
        let elem = document.createElement("div");
        elem.setAttribute("style", "display: inline-block");
        elem.innerText = text;
        document.body.append(elem);
        let w = elem.clientWidth;
        document.body.removeChild(elem);
        return w;
    }

    function calcOffsetPos(elem: HTMLElement) {
        let result = { x: 0, y: 0 };
        for (let e = elem; e != null; e = <HTMLElement>e.offsetParent) {
            result.x += e.offsetLeft;
            result.y += e.offsetTop;
        }
        return result;
    }

    function getAid() {
        return window.history.state?.aid;
    }

    interface ContainerAttr {
        class: string
    }

    interface ItemAttr {
        class: string;
        href: string;
        text: string;
        click: (e: Event) => any;
    }

    interface SpreadAttr {
        top: number;
        text?: string;
    }

    interface EpisodeItem {
        node: HTMLAnchorElement;
        click: (e: Event) => any;
    }

    interface VideoInfo {
        aid: string,
        cid: string
    }

    class CollectionElement {
        container: HTMLDivElement;
        clearfix: HTMLElement;
        items: EpisodeItem[] = [];
        spread: HTMLAnchorElement = <any>null;

        constructor(onSpread: () => any) {
            this.container = <HTMLDivElement>document.createElement("div");

            this.clearfix = document.createElement("ul");
            this.clearfix.className = "clearfix";
            this.container.appendChild(this.clearfix);

            if (onSpread) {
                this.spread = <HTMLAnchorElement>document.createElement("a");
                this.spread.className = "item v-part-toggle";
                this.spread.addEventListener("click", (e) => {
                    onSpread();
                    e.preventDefault();
                });
                this.clearfix.appendChild(this.spread);
            }
        }

        setContainerAttr(attr: ContainerAttr) {
            let staticClass = "multi-page bili-wrapper report-wrap-module report-scroll-module";
            this.container.className = [staticClass, attr.class].join(' ').trim();
        }

        setItemAttrs(attrs: Array<ItemAttr>) {
            // 更新分集DOM节点数量
            while (this.items.length > attrs.length)
                this.clearfix.removeChild((<any>this).items.pop().node);

            while (this.items.length < attrs.length) {
                let i: any = { click: null, node: <HTMLAnchorElement>document.createElement("a") };
                i.node.addEventListener("mouseenter", (e: any) => this.showFloatTxt(e));
                i.node.addEventListener("mouseleave", () => this.hideFloatText());
                i.node.addEventListener("click", (e: any) => {
                    // 参考vue router-link中防跳转处理
                    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.defaultPrevented || e.button != 0)
                        return;

                    e.preventDefault();
                    i.click && i.click(e);
                });
                this.clearfix.insertBefore(i.node, this.spread);
                this.items.push(i);
            }
            // 更新DOM节点属性
            const staticClass = "item";
            for (let i = 0; i < this.items.length; i++) {
                this.items[i].node.className = [staticClass, attrs[i].class].join(' ').trim();
                this.items[i].node.innerText = attrs[i].text;
                this.items[i].node.href = attrs[i].href;
                this.items[i].click = attrs[i].click;
            }
        }

        setSpreadAttr(attr: SpreadAttr) {
            if (this.spread) {
                this.spread.style.top = attr.top + "px";
                attr.text && (this.spread.innerText = attr.text);
            }
        }

        showFloatTxt(e: Event) {
            let item = <HTMLAnchorElement>e.target;
            let treshold = calcDivWidth(item.innerText) + 14;
            if (item.offsetWidth >= treshold)
                return;

            let floatTxt = document.createElement("div");
            floatTxt.className = "p-float-txt"
            floatTxt.innerText = item.innerText;
            document.body.appendChild(floatTxt);

            let pos = calcOffsetPos(item);
            floatTxt.style.left = pos.x + 'px';
            floatTxt.style.top = pos.y - 8 - floatTxt.clientHeight + 'px';
            // transition代替animate()
            floatTxt.style.transition = "opacity 0.4s, top 0.4s cubic-bezier(0.37, 0, 0.63, 1)";
            floatTxt.style.top = pos.y - 3 - floatTxt.clientHeight + 'px';
            floatTxt.style.opacity = "1";
        }

        hideFloatText() {
            let e = document.querySelector(".p-float-txt");
            e && document.body.removeChild(e);
        }
    }

    class CollectionData {
        notify: { spread: (b: boolean) => any; spreadBtnTop: (n: number) => any; ep: () => any } = <any>null;
        private _viewEpisodes = [];
        private _ep = 0;
        private _spread = false;
        private _spreadBtnTop = 0;
        private _colCount = 4;
        readonly episodes = [];

        get viewEpisodes(): Array<any> {
            return this._viewEpisodes;
        }

        get ep(): number {
            if ((<any>this).episodes[this._ep].aid != getAid())
                this._ep = this.episodes.findIndex((ep: any) => ep.aid == getAid())

            return this._ep;
        }

        get spreadBtnTop(): number {
            return this._spreadBtnTop;
        }

        set spreadBtnTop(n: number) {
            if (this._spreadBtnTop != n) {
                this._spreadBtnTop = n;
                this.notify?.spreadBtnTop(this._spreadBtnTop);
            }
        }

        get spread(): boolean {
            return this._spread;
        }

        get colCount(): number {
            return this._colCount;
        }

        // 转换成/x/player/pagelist中的列表格式
        get pageList() {
            return <any[]>this.episodes.reduce((s, ep: any, i) => {
                s.push({
                    aid: ep.aid,
                    cid: ep.cid,
                    page: i + 1,
                    part: ep.title,
                    duration: ep.page.duration,
                    dimension: ep.page.dimension,
                    from: ep.page.from,
                    vid: "",
                    weblink: ""
                });
                return s;
            }, <any>[]);
        }

        constructor(season: any) {
            this.initEpisodes(season);
            this.calcColCount();
            this._viewEpisodes = !this.needSpread() ? this.episodes :
                this.calcViewEpisodesOnCollapsed(this.ep);
        }

        initEpisodes(season: any) {
            season.sections.forEach((section: any) => {
                Array.prototype.push.apply(this.episodes, section.episodes);
            });
        }

        calcColCount() {
            let w = calcDivWidth((<any>this).episodes[this.ep].title);
            this._colCount = w >= 241 ? 3 : w >= 186 ? 4 :
                w >= 149 ? 5 : w >= 123 ? 6 :
                    window.innerWidth > 1440 ? 7 : 6;
        }

        calcViewEpisodesOnCollapsed(ep: number) {
            let begin = ep == 0 ? 0 :
                ep - 1 + this._colCount <= this.episodes.length ? ep - 1 :
                    Math.max(this.episodes.length - this._colCount, 0);

            return this.episodes.slice(begin, begin + this._colCount);
        }

        needSpread(): boolean {
            return this._colCount < this.episodes.length || this.spread;
        }

        toggleSpread() {
            this._spread = !this._spread;
            this._viewEpisodes = this._spread ? this.episodes :
                this.calcViewEpisodesOnCollapsed(this.ep);
            this._spreadBtnTop = 0;
            this.calcColCount();
            this.notify?.spread(this._spread);
        }

        updateEp() {
            let ep = this._ep;
            if (ep == this.ep)
                return;

            this._viewEpisodes = this._spread ? this.episodes :
                this.calcViewEpisodesOnCollapsed(this.ep);
            this.notify?.ep();
        }
    }

    class CollectionComponent {
        data: CollectionData;
        elem: CollectionElement;

        constructor(season: any, player: HTMLElement) {
            this.data = new CollectionData(season);
            this.elem = new CollectionElement(this.data.needSpread() ?
                () => this.data.toggleSpread() : <any>null);
            // 替换播放器换P处理
            (<any>window).callAppointPart = (_p: any, video: any) => {
                let state = { aid: video.aid, cid: video.cid };
                window.history.pushState(state, "", "/video/av" + video.aid);
                this.onRouteChanged(state);
            }
            window.addEventListener("popstate", (e) => {
                this.reloadPlayer(e.state);
                this.onRouteChanged(e.state);
            });
            window.addEventListener("scroll", () => this.onWindowScroll());

            this.render();
            (<any>player).parentNode.insertBefore(this.elem.container, player);
            this.data.notify = {
                spread: (spread) => {
                    this.render();
                    // 收起时页面滚动
                    !spread && window.scroll({ top: calcOffsetPos(<HTMLDivElement>document.getElementById("viewbox_report")).y });
                },
                spreadBtnTop: (top) => {
                    this.elem.setSpreadAttr({ top: top })
                },
                ep: () => this.render()
            }

            // 拦截播放器换P分P列表API
            xhrhook("/x/player/pagelist", undefined, (r) => {
                r.response = JSON.stringify({
                    code: 0,
                    message: 0,
                    ttl: 1,
                    data: this.data.pageList
                });
                r.responseText = r.response;
            }, false);
        }

        render() {
            this.elem.setContainerAttr({ class: "col-" + this.data.colCount });
            this.elem.setItemAttrs(this.data.viewEpisodes.map((p) => {
                return {
                    class: p.aid == getAid() ? "on" : "",
                    href: "/video/av" + p.aid,
                    text: p.title,
                    click: (_e) => {
                        let video = { aid: p.aid, cid: p.cid };
                        this.reloadPlayer(video);
                        (<any>window).callAppointPart(1, video);
                    }
                };
            }, this));
            this.elem.setSpreadAttr({
                top: this.data.spreadBtnTop,
                text: this.data.spread ? "收起" : "展开"
            });
        }

        reloadPlayer(v: VideoInfo) {
            window.GrayManager.reload(`aid=${v.aid}&cid=${v.cid}&has_next=1`);
        }

        onWindowScroll() {
            if (!this.data.spread)
                return;
            // 展开按钮随页面滚动浮动
            let div = this.elem.container;
            let btn = this.elem.spread;
            let divY = calcOffsetPos(div).y;
            let maxTop = div.clientHeight - btn.clientHeight - 20;
            this.data.spreadBtnTop = window.scrollY <= divY - 20 ? 0 :
                Math.min(window.scrollY - divY + 20, maxTop);
        }

        onRouteChanged(state: VideoInfo) {
            this.data.updateEp();

            // 视频信息刷新
            let avComponent = (<any>window).biliUIcomponents;
            // 评论和标签通过修改组件aid刷新
            avComponent.$store.state.aid = state.aid;
            // 简介, 标题, 视频统计
            xhr({
                url: objUrl("https://api.bilibili.com/x/web-interface/view/detail", { aid: state.aid }),
                responseType: "json",
                credentials: true
            }).then((d) => {
                avComponent?.setVideoData(d.data?.View);
            });
            // 下方视频推荐
            xhr({
                url: objUrl("https://api.bilibili.com/x/web-interface/archive/related", { aid: state.aid }),
                responseType: "json",
                credentials: true
            }).then((d) => avComponent.related = d.data);
            // 收藏/投币状态
            avComponent.initPage();
            //TODO: 分区修复 & 点赞数
        }
    }

    class Collection {
        component: CollectionComponent = <any>undefined;

        constructor(videoData: any) {
            xhrhook("/x/player.so", undefined, (r) => {
                // 替换has_next标签值让播放器显示下一P按钮
                r.response = r.response.replace(/<has_next>\s*0/, "<has_next>1");
                r.responseText = r.response;
            }, false);

            doWhile(() => document.getElementById("__bofqi"), player => {
                try {
                    window.history.replaceState({ aid: videoData.aid, cid: videoData.cid }, "");
                    this.component = new CollectionComponent(videoData.ugc_season, <any>player);
                    this.component.render();
                } catch (e) { toast.error("collection.js", e) }
            })
            toast.warning("视频合集，现以分P样式呈现！", "如需关闭，请访问设置-重构-合集选项。");
        }

        static needDisplay(videoData: any): boolean {
            return videoData.videos <= 1 && videoData.ugc_season &&
                videoData.is_season_display;
        }

        static run(videoData: any) {
            this.needDisplay(videoData) && new Collection(videoData);
        }
    }

    /**
     * av页合集显示
     * @param v av详情数据
     */
    export function collection(v: Record<string, any>) {
        Collection.run(v);
    }

}