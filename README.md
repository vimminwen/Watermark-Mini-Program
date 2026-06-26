# 汇水印 · 去水印小程序

基于 **uni-app** 开发的跨端图像/视频处理小程序，主打水印处理与 AI 图像工具，支持微信小程序等多端运行。

仓库地址：[https://github.com/vimminwen/Watermark-Mini-Program](https://github.com/vimminwen/Watermark-Mini-Program)

## 项目介绍

**汇水印** 是一款集水印处理、图片编辑、文字识别、视频工具于一体的实用型小程序。用户可在本地或云端完成常见媒体处理任务，并支持账号登录、会员充值等完整用户体系。

### 主要功能

| 分类 | 功能 |
| --- | --- |
| 水印处理 | 图片加水印、图片去水印、PDF 加水印 |
| 图片编辑 | 图片编辑、智能消除笔、智能抠图、图片压缩、图片剪切、图片滤镜 |
| 智能处理 | 无损放大、图片动漫化 / 科幻化 / 古风化 |
| 文字识别 | 图片提取文字、视频转文字、音频转文字 |
| 视频工具 | 视频消除 |
| 用户体系 | 登录注册、个人中心、会员充值、订单管理 |

底部 Tab 栏包含：**首页**、**功能**、**视频消除**、**滤镜**、**我的**。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | [uni-app](https://uniapp.dcloud.net.cn/)（Vue 3） |
| UI 组件库 | [uView UI 2.x](https://www.uviewui.com/) |
| 样式 | SCSS、自定义主题（深色模式） |
| 运行平台 | 微信小程序（主要）、支付宝/百度/头条小程序、App |
| 网络请求 | 自封装 `utils/request.js` / `utils/http.js` |
| 媒体处理 | Canvas 本地处理 + 后端 AI 接口（OSS 上传等） |

## 目录结构

```
├── api/                 # 接口定义与静态配置数据
├── components/          # 公共组件（支付、登录、工具面板等）
├── pages/               # 页面（首页、工具、用户、会员等）
├── static/              # 静态资源（图标、TabBar 图片等）
├── style/               # 全局样式
├── utils/               # 工具函数（图像、视频、用户、支付等）
├── App.vue              # 应用入口
├── main.js              # 主入口（Vue 3）
├── manifest.json        # 应用配置（AppID、平台配置等）
├── pages.json           # 页面路由与 TabBar 配置
└── package.json         # npm 依赖
```

## 环境要求

- [HBuilderX](https://www.dcloud.io/hbuilderx.html) 3.1.0 及以上（推荐）
- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（调试微信小程序）
- Node.js（用于安装 npm 依赖，可选但推荐）

## 安装依赖

项目使用 npm 管理 UI 组件库依赖，克隆仓库后执行：

```bash
npm install
```

当前主要依赖：

| 包名 | 版本 | 说明 |
| --- | --- | --- |
| uview-ui | ^2.0.38 | UI 组件库 |

## 快速开始

1. 克隆仓库

```bash
git clone https://github.com/vimminwen/Watermark-Mini-Program.git
cd Watermark-Mini-Program
npm install
```

2. 使用 **HBuilderX** 打开项目根目录

3. 在 `manifest.json` 中配置对应平台的 AppID（如微信小程序 AppID）

4. 如需对接后端，修改 `utils/http.js` 中的 `baseUrl` 为你的 API 地址

5. 在 HBuilderX 中选择 **运行 → 运行到小程序模拟器 → 微信开发者工具**

## 配置说明

- **后端 API**：默认地址见 `utils/http.js`，部署前请改为实际服务地址
- **OSS 密钥**：复制 `utils/image/aliyun.config.example.js` 为 `aliyun.config.js` 并填写密钥（该文件已在 `.gitignore` 中忽略，不会提交）
- **构建产物**：编译输出在 `unpackage/` 目录，已加入 `.gitignore`

## 许可证

本项目仅供学习与交流使用。
