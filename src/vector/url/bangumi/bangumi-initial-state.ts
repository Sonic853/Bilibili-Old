namespace API {
    /** epStat，用于判定ep状态。同样由于原生缺陷，ep_id初始化时不会更新本信息，需要主动更新 */
    function setEpStat(status: number, pay: number, payPackPaid: number, loginInfo: Record<string, any>) {
        var s = 0
            , o = !1
            , a = (1 === loginInfo.vipType || 2 === loginInfo.vipType) && 1 === loginInfo.vipStatus
            , r = "number" == typeof payPackPaid ? payPackPaid : -1;
        return 1 === pay ? s = 0 : 6 === status || 7 === status ? s = loginInfo.isLogin ? a ? 0 : 1 : 2 : 8 === status || 9 === status ? (s = loginInfo.isLogin ? 1 : 2,
            o = !0) : 12 === status ? s = loginInfo.isLogin ? 1 === r ? 0 : 1 : 2 : 13 === status && (s = loginInfo.isLogin ? a ? 0 : 1 : 2),
        {
            status: s,
            isPay: 6 === status || 7 === status || 8 === status || 9 === status || 12 === status || 13 === status,
            isVip: a,
            vipNeedPay: o,
            payPack: r
        }
    }
    export async function bangumiInitialState(): Promise<any> {
        try {
            const obj: Record<string, string | number> = epid ? { ep_id: epid } : { season_id: ssid };
            const result = await Promise.allSettled([
                xhr({ // bangumi接口，更符合旧版数据构造
                    url: objUrl("https://bangumi.bilibili.com/view/web_api/season", obj),
                    responseType: "json",
                    credentials: true
                }, true),
                xhr({ // api接口，带有历史记录信息，同时备用
                    url: objUrl("https://api.bilibili.com/pgc/view/web/season/user/status", obj),
                    responseType: "json",
                    credentials: true
                }, true)
            ]);
            const data = <Record<"bangumi" | "status", Record<PropertyKey, any>>>{};
            const t = (<any>window).__INITIAL_STATE__;
            result[0].status === "fulfilled" && (result[0].value.code === 0) && (data.bangumi = result[0].value.result);
            result[1].status === "fulfilled" && (result[1].value.code === 0) && (data.status = result[1].value.result);
            if (data.status) {
                const i = data.status.progress ? data.status.progress.last_ep_id : -1
                    , n = data.status.progress ? data.status.progress.last_ep_index : ""
                    , s = data.status.progress ? data.status.progress.last_time : 0
                    , o = data.status.vip_info || {};
                !epid && i > 0 && (epid = i); // 正常启动必须
                t.userStat = {
                    loaded: !0,
                    error: void 0 === data.status.pay,
                    follow: data.status.follow || 0,
                    pay: data.status.pay || 0,
                    payPackPaid: data.status.pay_pack_paid || 0,
                    sponsor: data.status.sponsor || 0,
                    watchProgress: {
                        lastEpId: 0 === i ? -1 : i,
                        lastEpIndex: n,
                        lastTime: s
                    },
                    vipInfo: {
                        due_date: o.due_date || 0,
                        status: o.status || 0,
                        type: o.type || 0
                    }
                };
                data.status.paster && (t.paster = data.status.paster || {});
                limit = data.status.area_limit || 0;
                !config.videoLimit.switch && (t.area = limit);
                t.seasonFollowed = 1 === data.status.follow;
            }
            if (data.bangumi) {
                // -> bangumi-play.809bd6f6d1fba866255d2e6c5dc06dabba9ce8b4.js:1148
                // 原数据有些问题导致一些回调事件不会正常加载需要主动写入epId、epInfo（顺序）
                // 如果没有这个错误，根本必须手动重构`__INITIAL_STATE__` 🤣
                const i = JSON.parse(JSON.stringify(data.bangumi));
                delete i.episodes;
                delete i.seasons;
                delete i.up_info;
                delete i.rights;
                delete i.publish;
                delete i.newest_ep;
                delete i.rating;
                delete i.pay_pack;
                delete i.payment;
                delete i.activity;
                if (config.bangumiEplist) delete i.bkg_cover;
                // APP限制
                config.videoLimit.switch && data.bangumi.rights && (data.bangumi.rights.watch_platform = 0);
                t.mediaInfo = i;
                t.mediaInfo.bkg_cover && (t.special = !0, bkg_cover = t.mediaInfo.bkg_cover);
                t.ssId = data.bangumi.season_id || -1;
                t.mdId = data.bangumi.media_id;
                t.epInfo = (epid && data.bangumi.episodes.find((d: any) => d.ep_id == epid)) || data.bangumi.episodes[0];
                t.epList = data.bangumi.episodes || [];
                t.seasonList = data.bangumi.seasons || [];
                t.upInfo = data.bangumi.up_info || {};
                t.rightsInfo = data.bangumi.rights || {};
                t.app = 1 === t.rightsInfo.watch_platform;
                t.pubInfo = data.bangumi.publish || {};
                t.newestEp = data.bangumi.newest_ep || {};
                t.mediaRating = data.bangumi.rating || {};
                t.payPack = data.bangumi.pay_pack || {};
                t.payMent = data.bangumi.payment || {};
                t.activity = data.bangumi.activity || {};
                t.epStat = setEpStat(t.epInfo.episode_status || t.mediaInfo.season_status, t.userStat.pay, t.userStat.payPackPaid, t.loginInfo);
                t.epId = epid || data.bangumi.episodes[0].ep_id;
                // 记录bangumi参数备用
                Object.defineProperties(API, {
                    ssid: {
                        configurable: true,
                        get: () => t.ssId
                    },
                    epid: {
                        configurable: true,
                        get: () => t.epId
                    }
                });
                if (t.epInfo.badge === "互动") {
                    // 番剧能互动？ .e.g: https://www.bilibili.com/bangumi/play/ep385091
                    sessionStorage.setItem("keepNew", 1);
                    location.reload();
                }
            } else {
                debug.error(result[0]);
                debug.error(result[1]);
                return globalSession();
            }
        } catch (e) {
            toast.error("获取视频数据出错 ಥ_ಥ");
            debug.error("视频数据", e);
        }
    }
    async function globalSession() {
        toast.warning("这大概是个无效bangumi~", "正在进行最后的尝试");
        const obj: Record<string, string | number> = epid ? { ep_id: epid } : { season_id: ssid };
        Object.assign(obj, {
            access_key: config.accessKey.key || undefined,
            build: 108003,
            mobi_app: "bstar_a",
            s_locale: "zh_SG"
        });
        try {
            const result = await xhr({
                url: objUrl(`https://${config.videoLimit.th || 'api.global.bilibili.com'}/intl/gateway/v2/ogv/view/app/season`, obj),
                responseType: "json"
            }, true);
            if (result.code === 0) {
                // th = true; 暂不支持播放
                const t = (<any>window).__INITIAL_STATE__;
                const i = JSON.parse(JSON.stringify(result.result));
                const episodes = result.result.modules.reduce((s: any[], d: any) => {
                    d.data.episodes.forEach((d: any) => {
                        s.push({
                            aid: d.aid,
                            cid: d.id,
                            cover: d.cover,
                            ep_id: d.id,
                            episode_status: d.status,
                            from: d.from,
                            index: d.title,
                            index_title: d.title_display,
                            subtitles: d.subtitles
                        })
                    });
                    return s;
                }, []);
                delete i.episodes;
                delete i.seasons;
                delete i.up_info;
                delete i.rights;
                delete i.publish;
                delete i.newest_ep;
                delete i.rating;
                delete i.pay_pack;
                delete i.payment;
                delete i.activity;
                t.mediaInfo = i;
                t.mediaInfo.bkg_cover && (t.special = !0, bkg_cover = t.mediaInfo.bkg_cover);
                t.ssId = result.result.season_id || -1;
                t.epInfo = (epid && episodes.find((d: any) => d.ep_id == epid)) || episodes[0];
                t.epList = episodes;
                t.seasonList = result.result.series || [];
                t.upInfo = result.result.up_info || {};
                t.rightsInfo = result.result.rights || {};
                t.app = 1 === t.rightsInfo.watch_platform;
                t.pubInfo = result.result.publish || {};
                t.newestEp = result.result.new_ep || {};
                t.mediaRating = result.result.rating || {};
                t.payPack = result.result.pay_pack || {};
                t.payMent = result.result.payment || {};
                t.activity = result.result.activity_dialog || {};
                t.epStat = setEpStat(t.epInfo.episode_status || t.mediaInfo.season_status, t.userStat.pay, t.userStat.payPackPaid, t.loginInfo);
                t.epId = epid || episodes[0].ep_id;
                Object.defineProperties(API, {
                    ssid: {
                        configurable: true,
                        get: () => t.ssId
                    },
                    epid: {
                        configurable: true,
                        get: () => t.epId
                    }
                });
                toast.custom(0, "warning", "这大概是一个东南亚版bangumi，很抱歉暂时不支持播放ಥ_ಥ");
            }
            else throw result;
        } catch (e) {
            toast.error("访问国际版B站出错~", e);
            debug.error("BilibiliGlobal", e);
        }
    }
}
declare namespace API {
    /** 背景 */
    let bkg_cover: string | undefined;
    /** 泰区 */
    let th: boolean;
}