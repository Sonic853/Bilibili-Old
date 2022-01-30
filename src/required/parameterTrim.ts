/**
 * 本模块负责处理URL，包括地址栏和a标签
 */
(function () {
    try {
        class ParameterTrim {
            /**
             * 过滤参数
             */
            param = [
                "spm_id_from",
                "from_source",
                "msource",
                "bsource",
                "seid",
                "source",
                "session_id",
                "visit_id",
                "sourceFrom",
                "from_spmid",
                "share_source",
                "share_medium",
                "share_plat",
                "share_session_id",
                "share_tag",
                "unique_k"];
            /**
             * 地址变动参考
             */
            url: string[] = [];
            /**
             * 地址栏
             */
            location() {
                this.url[1] = location.href; // 暂存URL，以便比较URL变化
                if (this.url[0] != this.url[1]) {
                    let href = this.triming(location.href); // 处理链接
                    window.history.replaceState(null, "", href); // 推送到地址栏
                    this.url[0] = location.href; // 刷新暂存
                }
            }
            /**
             * 处理a标签
             * @param list a标签集
             */
            anchor(list: any) {
                list.forEach((d: HTMLAnchorElement) => {
                    if (!d.href) return;
                    d.href.includes("bilibili.tv") && (d.href = d.href.replace("bilibili.tv", "bilibili.com"));
                    d.href.includes("www.bilibili.com/tag") && (d.href = d.href.replace("tag", "topic"));
                    d.href.includes("account.bilibili.com/login?act=exit") && (d.href = "javascript:void(0);", d.onclick = () => API.loginExit());
                    d.href = this.triming(d.href);
                })
            }
            /**
             * 处理引导
             * @param url 源URL
             * @returns URL
             */
            triming(url: string) {
                const obj = new URL(url);
                if (!obj.protocol.includes("http")) return url;
                obj.searchParams.has("bvid") && obj.searchParams.append("aid", <string>API.abv(obj.searchParams.get("bvid"))), obj.searchParams.delete("bvid");
                obj.searchParams.has("aid") && !Number(obj.searchParams.get("aid")) && obj.searchParams.set("aid", <string>API.abv(obj.searchParams.get("aid")));
                obj.searchParams.has("from") && obj.searchParams.get("from") == "search" && obj.searchParams.delete("from");
                this.param.forEach(d => obj.searchParams.delete(d));
                return obj.toJSON().replace(/[bB][vV]1[fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF]{9}/g, s => "av" + API.abv(s));
            }
            click(e: MouseEvent) {
                var f = <HTMLAnchorElement>e.target;
                for (; f && "A" !== f.tagName;) {
                    f = <HTMLAnchorElement>f.parentNode
                }
                if ("A" !== (null == f ? void 0 : f.tagName)) {
                    return
                }
                f.href && (f.href = this.triming(f.href))
            }
        }
        const parameterTrim = new ParameterTrim();
        // @ts-ignore 重写标记
        if (Before) return parameterTrim.location();
        API.switchVideo(() => { parameterTrim.location() });
        API.observerAddedNodes(async (node) => {
            node.querySelectorAll && parameterTrim.anchor(node.querySelectorAll("a"));
            node.tagName == "A" && parameterTrim.anchor([node]);
        })
        window.addEventListener("click", e => parameterTrim.click(e), !1);
    } catch (e) { debug.error("parameterTrim.js", e) }
})();