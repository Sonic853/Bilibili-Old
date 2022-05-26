namespace API {
    export class enLike {
        /** aid备份 */
        aid: number = <any>undefined;
        /** 锚节点 硬币 */
        coin: HTMLElement = <any>undefined;
        /** 锚节点 收藏 */
        fav: HTMLElement = <any>undefined;
        /** 锚节点 点赞 */
        span: HTMLSpanElement = <any>undefined;
        /** 点赞了吗？ */
        liked = false;
        /** 是否按住点赞 */
        hold = false;
        /** 按住时的 setTimeout */
        holdTimeout: number = <any>undefined;
        /** 点赞数 */
        number = 0;
        /** 页面类型 */
        type?: "bangumi" | "watchlater";
        /** 未点赞图标 */
        svgLike = getModule("dislike.svg");
        /** 已点赞图标 */
        svgEnLike = getModule("like.svg");
        constructor(type?: "bangumi" | "watchlater", num = 0) {
            this.type = type;
            this.number = num;
            doWhile(() => { // 目标节点存在后才初始化
                this.coin = type === "watchlater" ? document.querySelector<any>(".u.coin") : document.querySelector<any>("[report-id*=coin]");
                this.fav = type === "watchlater" ? document.querySelector<any>(".u.fav") : document.querySelector<any>("[report-id*=collect]");
                return this.coin && this.fav && aid;
            }, () => this.init())
        }
        init() {
            this.style();
            this.aid = aid;
            this.span = document.createElement("span");
            this.span.classList.add("ulike");
            (<any>this).coin.parentElement.insertBefore(this.span, this.coin);
            this.changeLiked();
            this.span.addEventListener("click", () => this.setLike()); // 单击点赞
            this.span.addEventListener("mousedown", ev => this.holdLike(ev)); // 按住触发
            this.span.addEventListener("mousemove", ev => this.unHoldLike()); // 按住时移动了会触发，在点赞处经过也会触发
            switchVideo(() => this.switch());
            try {
                !this.number && xhr({ // 获取点赞数
                    url: `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
                    credentials: true,
                    responseType: "json"
                }, true).then(d => {
                    this.number = jsonCheck(d).data.stat.like;
                    this.changeLiked();
                })
                uid && xhr({ // 获取点赞了吗？
                    url: `https://api.bilibili.com/x/web-interface/archive/has/like?aid=${aid}`,
                    credentials: true,
                    responseType: "json"
                }).then(d => {
                    d = jsonCheck(d).data;
                    d === 1 && (this.liked = true, this.changeLiked());
                })
            } catch (e) {
                toast.error("点赞失败！");
                debug.error("点赞失败！", e);
            }
        }
        /** 修补样式 */
        style() {
            let style = `.ulike {cursor: pointer;}.ulike svg{vertical-align: middle;margin-right: 10px;}`;
            switch (this.type) {
                case "bangumi": style += `.ulike {margin-left: 15px;position: relative;float: left;height: 100%;line-height: 18px;font-size: 12px;color: #222;}`;
                    break;
                case "watchlater": style += `.video-info-module .number .ulike {margin-left: 15px;margin-right: 5px;}`;
                    break;
                default: style += `.video-info-m .number .ulike {margin-left: 15px;margin-right: 5px;}`;
            }
            addCss(style);
        }
        /** 点赞响应 */
        setLike() {
            if (this.hold) {
                this.unHoldLike();
                return
            }
            if (uid) {
                const like = this.liked ? 2 : 1;
                xhr({
                    url: "https://api.bilibili.com/x/web-interface/archive/like",
                    method: "POST",
                    data: `aid=${aid}&like=${like}&csrf=${getCookies().bili_jct}`,
                    credentials: true,
                    responseType: "json"
                }).then(d => {
                    jsonCheck(d).ttl;
                    this.liked = !this.liked;
                    this.number = this.liked ? this.number + 1 : this.number - 1;
                    this.changeLiked();
                })
            } else {
                toast.warning("请先登录 щ(ʘ╻ʘ)щ");
                biliQuickLogin();
            }
        }
        /** 按住点赞 */
        holdLike(ev: MouseEvent) {
            if (!this.hold && ev.button == 0) { // 之前是否按住过，是否为左键
                this.holdTimeout = setTimeout(() => {
                    this.hold = true; // 判定为按住
                    if (this.hold) {
                        this.span.classList.add("shake");
                        this.coin.classList.add("circle");
                        this.fav.classList.add("circle");
                        this.holdTimeout = setTimeout(() => {
                            if (this.hold) {
                                // Todo: 触发三连

                                // Todo结束
                                this.unHoldLike();
                            }
                        }, 2500);
                    }
                }, 800);
            }
        }
        /** 取消按住 */
        unHoldLike() {
            if (this.hold) {
                this.hold = false;
            }
            if (this.holdTimeout) {
                clearTimeout(this.holdTimeout);
                this.holdTimeout = undefined;
            }
            this.span.classList.remove("shake");
            this.coin.classList.remove("circle");
            this.fav.classList.remove("circle");
        }
        /** 图标及数目变化 */
        changeLiked() {
            this.span.innerHTML = `${this.liked ? this.svgEnLike : this.svgLike}</i>点赞 ${unitFormat(this.number) || "--"}`;
        }
        /** 切p后刷新数据 */
        switch() {
            if (this.aid != aid) {
                this.aid = aid;
                xhr({
                    url: `https://api.bilibili.com/x/web-interface/view?aid=${aid}`,
                    credentials: true,
                    responseType: "json"
                }).then(d => {
                    this.number = jsonCheck(d).data.stat.like;
                    this.changeLiked();
                })
            }
        }
    }
}