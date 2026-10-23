# Userscripts

个人在用的油猴脚本。浏览器装好 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) 后，打开下面的安装链接，管理器会弹出安装确认。文件名使用 `.user.js`，管理器靠这个后缀识别脚本。

脚本头里写了 `@downloadURL` / `@updateURL`，指向本仓库 `main` 分支的 raw 地址。合并进 `main` 之后，管理器可以按这些地址检查更新。本机如果已经装过同名旧脚本，用安装链接覆盖一次，之后才会跟着仓库更新。

| 脚本 | 版本 | 文件 |
| --- | --- | --- |
| YouTube 评论栏移到侧边栏 | 1.2.0 | [`youtube-comments-sidebar.user.js`](./youtube-comments-sidebar.user.js) |
| X 界面美化（边栏自动隐藏 + 加宽 + 自定义中文字体） | 1.5 | [`x-ui-beautify.user.js`](./x-ui-beautify.user.js) |

## YouTube 评论栏移到侧边栏

[安装](https://raw.githubusercontent.com/bluenight91/Userscripts/main/youtube-comments-sidebar.user.js)

在 `https://www.youtube.com/*` 的观看页，把评论区挪到右侧边栏，也可以一键切回视频下方。窗口宽度大于 1015px 时评论进侧栏；更窄时留在视频下方。全屏播放时侧栏和悬浮按钮会藏起来。开关会记住，默认开侧栏。

页面上有两个入口：

- 视频操作栏按钮：`侧栏评论` / `下方评论`
- 右下角悬浮按钮：`评论：侧栏` / `评论：下方`

脚本管理器菜单里也可以切换：放到侧栏、放回视频下方，或在两种位置之间来回切。

交互参考 [yakisova41/move-youtube-comments-to-sidebar](https://github.com/yakisova41/move-youtube-comments-to-sidebar)（MIT，Copyright (c) 2023 yakisova41）。本仓库代码的许可见文末。

## X 界面美化（边栏自动隐藏 + 加宽 + 自定义中文字体）

[安装](https://raw.githubusercontent.com/bluenight91/Userscripts/main/x-ui-beautify.user.js)

匹配 `https://x.com/*` 和 `https://twitter.com/*`。页面一加载就生效。

- 左右边栏贴边藏起，鼠标移到屏幕左缘或右缘（约 8px）时滑出，移开后收回。边缘有一条细提示。
- 每侧边栏可以改成始终显示或始终隐藏。
- 中间时间线居中加宽，默认 860px，最宽不超过视口的 96%。
- 推文正文使用自定义中文字体，默认 `PingFang SC`。可以另指定一套拉丁字体给英文和数字，并调整字号、行距。
- 字体默认只作用在推文正文上，也可以改成整个页面。

在扩展图标的脚本菜单里改设置，改完立即生效：

| 菜单 | 默认 |
| --- | --- |
| 左边栏：切换 自动 / 显示 / 隐藏 | 自动（鼠标靠边显示） |
| 右边栏：切换 自动 / 显示 / 隐藏 | 自动（鼠标靠边显示） |
| 设置中文字体 | PingFang SC |
| 设置拉丁字体（英文/数字） | 空，跟随中文字体 |
| 设置推文字号 | 17px |
| 设置行距 | 1.7 |
| 设置时间线宽度 | 860px |
| 切换：字体应用到整个页面 | 关，只作用于推文正文 |

中文字体示例：`PingFang SC`、`LXGW WenKai`、`Songti SC`、`Hiragino Sans GB`。拉丁字体示例：`Inter`、`SF Pro Text`、`Helvetica Neue`、`Georgia`。字体需要本机已经安装，脚本只负责指定名称。

## 许可

两份脚本都以 [MIT License](./LICENCE) 发布，版权所有 © 2026 Daniel。脚本头部的 `@license` 都是 MIT。

## 分发

安装和更新使用本页的 raw 链接，直接装仓库里的 `.user.js`。不需要打开 GitHub Releases，也不需要打开 Packages。
