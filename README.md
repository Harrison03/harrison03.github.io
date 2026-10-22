# Haoran Zhao — academic homepage

纯静态单页，无框架；由 GitHub Actions 更新统计、组装静态发布目录并部署 Pages。字体、媒体和地图均自托管，暗色跟随系统。运行时唯一外部服务为 GoatCounter：计数脚本、计数上报和公开总数 JSON。

## 本地预览

在本目录运行：

```sh
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000`。页面内容在 `index.html`，样式在 `assets/css/style.css`，交互在 `assets/js/main.js`。不要直接用 `file://` 验证视频和字体。

## 访客统计上线步骤

1. 注册 [GoatCounter](https://www.goatcounter.com/)，创建站点。
2. **唯一站点代码配置**在 `index.html` 的 `<section id="visitors" data-goatcounter-code="…">`；把占位代码改为注册的代码。浏览器和 Action 都从这里读取，无需在 JS/workflow 再改一次。
3. 在 GoatCounter 设置中开启 **Allow adding visitor counts**，允许读取 `/counter/TOTAL.json`。
4. 在 GoatCounter 用户菜单 → API 创建 token，只授予 **读取统计（read-only statistics / stats）** 权限。
5. GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，名称为 `GOATCOUNTER_TOKEN`，值为该 token；不要写进源码。
6. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，不选 Deploy from a branch。个人账号的私有仓库需 [GitHub Pro](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)（[学生包](https://education.github.com/pack)可获得）；公开仓库可使用 Free。
7. 检查 `.github/workflows/deploy.yml` 顶部的 `GOATCOUNTER_START`（默认上线日 `2026-10-22`，UTC），然后在 **Actions → Deploy GitHub Pages → Run workflow** 手动运行一次。推送到 `main`、每天 UTC 02:17（新加坡 10:17）及手动运行都会构建并部署。

页面在 Projects 后显示 Visitors，不加入导航。默认 `data/visitors.js` 是 10 个国家的示例，只允许 `localhost`、`127.0.0.1` 和 `file://` 显示，并注明 Sample data。正式域名上示例/缺失数据会让整个区块隐藏，但计数脚本照常加载，开始积累真实数据。GoatCounter 默认不统计 localhost，不使用 cookie；没有额外开启本地计数。总数优先读取公开 JSON（5 秒超时），失败保留文件总数，两者都没有则隐藏数字。

Action 使用 API v0 的 `/stats/total` 和 `/stats/locations`，带 Bearer token，按上线日累计并读取所有分页；仅输出国家汇总，不输出 IP 或个人数据。有 token 时只在构建工作区生成 `sample:false` 的 `data/visitors.js`，`updated` 为本次成功刷新日期；不提交回仓库。缺少 token 时脚本安全退出 0，保留仓库示例并继续部署，正式域名自动隐藏 Visitors。发布目录排除 `.git/`、`.github/`、`tools/`、`README.md`、`*.mjs` 和 `*.py`，随后 configure-pages → upload-pages-artifact → deploy-pages 直接发布，无需 bot 提交触发后续构建。

工作流采用核验时的稳定大版本：[checkout v7](https://github.com/actions/checkout/releases/tag/v7.0.1)、[configure-pages v6](https://github.com/actions/configure-pages/releases/tag/v6.0.0)、[upload-pages-artifact v5](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0)、[deploy-pages v5](https://github.com/actions/deploy-pages/releases/tag/v5.0.1)。

地图已经构建，日常更新不需要 Node.js 或地图依赖。需要重建时用 Node.js ≥18 执行 `node tools/build-visitor-map.mjs`；只有该构建脚本下载固定版本的 [world-atlas 2.0.2 / Natural Earth 110m land](https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json)、D3 7.9.0 和 topojson-client 3.1.0。使用 Equal Earth 投影、去南极洲、无国界、单一 path，输出 `assets/img/world.svg`；同时同步生成 `index.html` 中不直接显示的 SVG template，由 main.js 克隆渲染；viewBox 收紧至大陆外接框并保留约 1% 边距；内联 path 使用 `--map-land`，兼容 file:// 并保持明暗主题一致。浏览器不加载这些构建依赖。

`data/country-centroids.js` 包含 243 个投影后坐标，来自 [Google DSPL countries.csv（固定提交）](https://github.com/google/dspl/blob/8a9eda10b7caa7c3bfb56a8ae15981b146f1e1e8/samples/google/canonical/countries.csv)，与地图共用投影；省略南极洲和无坐标条目。来源为国家代表经纬度，适合位置标记，并非精确行政区几何质心。Google DSPL 地理数据集的 BSD-3-Clause 声明保留于 `data/country-centroids-LICENSE.txt`（[原始声明](https://github.com/google/dspl/blob/8a9eda10b7caa7c3bfb56a8ae15981b146f1e1e8/samples/google/canonical/geo.xml)）；Natural Earth 为公有领域。缺少坐标的国家仍可列入前 8 国排行，条宽按地区总次数占比计算。桌面左列 38% 放总数和排行，右列 62% 放垂直居中的地图；手机依次显示地图、总数、排行。

## 怎么新增一篇论文

1. 在 `index.html` 的 `#publications` 中复制一整段 `<article class="publication">…</article>`。视频论文复制 VLA 卡；图片论文复制 CIRP 卡。按年份倒序插入。
2. 修改作者下方的完整 venue 行（简称加粗，不另加顶部 venue 标签）、标题及标题链接、完整作者、TL;DR 和链接胶囊。本人姓名包在 `<strong>` 中；已核实的共同一作用 `<sup>*</sup>`，通讯作者用 `<sup>†</sup>`。不确定的信息加 HTML TODO 注释，不猜测作者标记。只保留实际存在的 Paper / arXiv / Project / Video / Code 链接。
3. 建立 `media/pubs/<slug>/`。从项目工作区调用脚本生成短视频（此处路径仅为命令格式示例）：

```sh
tools/make_loop.sh /absolute/path/to/input.mp4 1 6.5 media/pubs/new-paper
```

脚本使用仓库旁 `../.tools/venv/` 中的 `imageio-ffmpeg` 和 Pillow，输出 `loop.mp4` + `poster.jpg`。若迁移工作区，用 `TOOLS_PYTHON=/path/to/venv/bin/python` 指定该虚拟环境；不要安装到系统 Python。

- loop：6–10 秒、宽 960、24fps、H.264/yuv420p、CRF 28（必要时 30）、无音轨、faststart、≤1.5MB。默认等比例缩放并裁切为 960×540；标准卡媒体框用 CSS 裁切为 3:2，视频/照片 cover，示意图白底 contain；Projects 同样使用标准 3:2 卡。
- 可选 `CROP=宽:高:x:y` 在缩放前裁切，`POSTER_TIME=秒` 选择相对 loop 的封面时间，`LOOP_CRF=26…30` 调整质量。
- 例：`CROP=640:334:210:26 LOOP_CRF=30 POSTER_TIME=3 tools/make_loop.sh input.mp4 2 8 media/pubs/new-paper`。
- poster：960px 宽、≤100KB。脚本会检查体积，超出限制返回错误；此时应另选更短或更易压缩的片段。
- 完整视频另存 `full.mp4`，限制为 720p、≤15MB；全站 MP4 均无音轨。装配项目例外使用原构图、宽≤1280、≤5MB 的完整视频作为轮播首张和 Full video 同源文件。

4. 修改媒体路径：`poster` 指向新 poster，`data-src` 指向新 loop；`aria-label` 写具体画面描述。保留 `muted loop playsinline preload="none"`、宽高及 `.loop-toggle` 按钮，JS 会自动处理新卡片。不要给 loop 加 `autoplay` 或直接 `src`，以免提前下载。
5. 有完整视频时保留媒体角标和 Video 胶囊，二者 `href` 都指向 full，并保留 `data-full-video` 和描述性的 `data-title`。无完整视频则删除这两个链接；外链视频直接使用 `target="_blank" rel="noopener noreferrer"`，不加 `data-full-video`。
6. 图片卡使用 `.media.media--image`，写清 `alt`、原始 `width/height` 和 `loading="lazy"`；最长边≤1600、≤250KB，照片默认 cover 铺满；线图/示意图额外加 `.media--diagram`，白底 contain。不要复制出版商全文 PDF 到仓库。
7. 更新 footer 日期。用 1440px 明暗色和 390px 手机检查布局、键盘焦点、视频暂停/播放、弹窗关闭和资源体积。

## 新增项目或替换在研工作

`#projects` 全部使用标准 `.project` 卡（媒体 48%、3:2、垂直居中），未来 NTU 项目放在本科项目之前。当前微机器人（2023）在前，视觉装配（2022）在后；文字顺序为标题、Team leader / 比赛 / 年份、加粗奖项、1–2 句描述。

多素材复制 `.media.media-carousel`：图片/视频放在 `.carousel-slide` 中，首张 `is-active`；照片 `slide--photo`，识别图/仿真使用 contain，按背景选择 `slide--dark` 或 `slide--light`。每张对应一个 `.carousel-dots button`（aria-label、aria-pressed）；容器保留 `aria-roledescription="carousel"`。视频使用 data-src、poster、muted、playsinline、preload="none"，不要加 loop 或直接 src。图片 4 s、视频结束或最多 12 s 自动切换；离开视口、后台、弹窗时暂停；reduced-motion 首次仅第一张，可手动点圆点。完整装配视频右下角 Full video 打开同文件的 controls 弹窗。

ISCER 使用原文第 4 页 Figure 3 装配环境总览图（300 dpi 整页渲染后裁切），以白底 contain 单图展示；装配项目仍使用完整仿真视频与两张模板匹配图。微机器人顺序为血栓钻进、S 形轨迹、U 形轨迹、交变磁场仿真、线圈装置实拍。交变磁场来自 `2023机器人与人工智能大赛/extracted/images/答辩ppt国赛__image40.GIF`，裁去外围黑边后转为 24fps 无声 MP4，仅该 slide 使用白底。候选图与本轮验收见工作区 `_codex/shots/S_iscer_candidates.png`、`_codex/S_validation.json`。原始素材来自只读 Resources；来源、尺寸与验收见工作区 `_codex/O_media_manifest.json`、`_codex/O_validation.json` 和 `_codex/O_report.txt`。

Ongoing Research 板块在论文发表前暂时移除（HTML 片段与媒体保存在本地，不在本仓库中）；恢复时把片段放回 Publications 与 Honors 之间，并在顶栏导航加回 `#ongoing` 链接。

## 字体和素材

字体固定为 `@fontsource/montserrat@5.1.1`，仅在准备静态资产时从 `https://registry.npmjs.org/@fontsource/montserrat/-/montserrat-5.1.1.tgz` 下载，提取 `package/files/montserrat-latin-{400,500,600,700}-normal.woff2` 至 `assets/fonts/`，许可证为同包 `package/LICENSE`（保存为 `montserrat-LICENSE.txt`）。运行时字体只请求站内文件，使用 `font-display: swap`。

全站使用 Montserrat 400/500/600/700，中文依次回退至 PingFang SC、Noto Sans CJK SC、Microsoft YaHei、sans-serif。头像由用户原图裁切，研究素材来自工作区 Resources，完整出处和验收记录见工作区 `_codex/B_report.md`。

页面所有未确认事项都标有 `<!-- TODO: … -->`；搜索 `TODO` 即可定位。VLA 作者关系与 TeX 一致：`*` 共同一作、`†` 通讯作者。ICCA 按用户确认的 IEEE 页面作者顺序，不标注共同一作/通讯符号；使用用户确认采用的 Tianxin Hu 主页 motivation.jpg 配图，站内为 `media/pubs/rover-energy/figure.jpg`，以白底 contain 展示；视频不采用。`.pub--no-media` 样式保留供以后使用。

本轮媒体裁切、片段起止与来源见工作区 `_codex/C_media_manifest.json`；验收见 `_codex/C_report.md`。ISCER 旧机械臂视频已替换为论文总览图，装配完整仿真已移至 Projects。预览按钮只在 reduced-motion 或自动播放失败时显示于中央。
