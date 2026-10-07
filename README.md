# MeT-Music Player

基于 React 19、TypeScript 和 Vite 的网页播放器。通过 Session ID 监听 MeT-Music 的播放反馈，显示歌曲信息、实时歌词、音频频谱和封面背景。

## 本地开发

```bash
pnpm install
pnpm dev
```

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

部署时的基础路径为 `/player/`。播放器位于 `/player/`。通过播放器 URL 的 `?sid=...` 参数传入 Session ID；播放器会将其保存到本地存储供后续使用。

## 平台支持

支持 QQ 音乐和网易云音乐。播放器根据 WebSocket 播放反馈的 `data.songSource` 自动选择平台：`qqmusic`（默认）或 `netease`。网易云歌曲 ID 可为数字或字符串；切换平台时会重新加载歌曲，歌曲和歌词缓存按平台隔离。

网易云使用后端的 `platform=netease` 接口获取播放链接（`exhigh` 音质）、歌曲信息和专辑封面，优先显示原生 YRC 逐字歌词，无可用 YRC 时回退到 LRC。旧后端未提供 YRC 字段时仍支持转换后的 QRC。

房间同步反馈已携带歌曲来源，可直接同步网易云播放。当前主站独立播放的反馈上报仍仅支持 QQ 音乐；网易云独立播放的上报需要主站与后端另行接入。`local` 来源会显示暂不支持本地音乐。

## 目录结构

```text
src/
  app/                         全局样式与字体
  features/
    player/
      api/                     歌曲、歌词和封面颜色请求及缓存
      components/              播放器界面组件及各自样式
      context/                 React Context 与 Provider
      hooks/                   远程同步、音频分析、Media Session
      model/                   播放状态与接口类型
      utils/                   歌词、颜色和时间工具
      Player.tsx               页面结构
  shared/                      跨功能的 Session ID 存取
  main.tsx                     播放器入口
index.html                     播放器 HTML 入口
```

`useRemotePlayback` 管理 WebSocket、媒体元素和同步状态，卸载时关闭连接、取消请求并移除事件监听。`api/song.ts` 只负责网络请求和缓存。组件从 Context 获取状态，不直接操作 WebSocket。

## 技术栈

- React 19、TypeScript（严格模式）、Vite 7
- React Context、WebSocket、Web Audio API、Media Session API
- ColorThief 提取封面颜色
- vite-plugin-pwa 提供离线静态资源缓存

## 许可证

MIT License
