# Haoran Zhao — academic homepage

纯静态单页，无框架、构建步骤、统计脚本或运行时外部资源。字体和媒体均自托管，暗色跟随系统。当前仓库仅初始化 `main` 并配置 origin，没有提交或推送。

## 本地预览

在本目录运行：

```sh
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000`。页面内容在 `index.html`，样式在 `assets/css/style.css`，交互在 `assets/js/main.js`。不要直接用 `file://` 验证视频和字体。

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

`#ongoing` 的卡片可整体替换为真机结果；同时修改标签、标题、描述、媒体和 TODO。当前 loop 展示带受力 HUD 的单次接触，Full video 展示另一段八次推动仿真，弹窗标题已注明。

## 字体和素材

字体固定为 `@fontsource/montserrat@5.1.1`，仅在准备静态资产时从 `https://registry.npmjs.org/@fontsource/montserrat/-/montserrat-5.1.1.tgz` 下载，提取 `package/files/montserrat-latin-{400,500,600,700}-normal.woff2` 至 `assets/fonts/`，许可证为同包 `package/LICENSE`（保存为 `montserrat-LICENSE.txt`）。运行时只请求站内文件，使用 `font-display: swap`。

全站使用 Montserrat 400/500/600/700，中文依次回退至 PingFang SC、Noto Sans CJK SC、Microsoft YaHei、sans-serif。头像由用户原图裁切，研究素材来自工作区 Resources，完整出处和验收记录见工作区 `_codex/B_report.md`。

页面所有未确认事项都标有 `<!-- TODO: … -->`；搜索 `TODO` 即可定位。VLA 作者关系与 TeX 一致：`*` 共同一作、`†` 通讯作者。ICCA 按用户确认的 IEEE 页面作者顺序，不标注共同一作/通讯符号；使用用户确认采用的 Tianxin Hu 主页 motivation.jpg 配图，站内为 `media/pubs/rover-energy/figure.jpg`，以白底 contain 展示；视频不采用。`.pub--no-media` 样式保留供以后使用。

本轮媒体裁切、片段起止与来源见工作区 `_codex/C_media_manifest.json`；验收见 `_codex/C_report.md`。ISCER 旧机械臂视频已替换为论文总览图，装配完整仿真已移至 Projects。预览按钮只在 reduced-motion 或自动播放失败时显示于中央。
