# yixi-lit-design

基于 **Lit 3 + Light DOM + 全局 CSS** 的轻量 Web Components 组件库。无框架依赖，任意技术栈（原生 HTML、Vue、React、jQuery）都可以直接使用。

## 特性

- **Light DOM 渲染**：组件不创建 Shadow Root，样式完全由全局 CSS 驱动，使用者可以自由覆盖任何样式
- **插槽按 Shadow DOM 习惯书写**：`<slot>` 在 Light DOM 下不会自动投影，基类 `LdElement` 会在渲染后把使用方写的内容搬进模板里对应的 `<slot>`，因此 `<ld-card><div slot="footer">…</div></ld-card>` 这类写法直接可用
- **CSS 变量主题**：颜色、尺寸、圆角、间距等全部是 CSS 变量（见 `src/styles/tokens.css`），覆盖变量即换肤
- **图标字体内置**：Remix Icon 字体随包分发，`<ld-icon name="...">` 即插即用
- **TypeScript 开发**：完整的类型声明与 `HTMLElementTagNameMap` 增强
- **现代化工具链**：Rspack 构建、oxlint + oxfmt 代码质量

## 快速开始

### 安装与构建

```bash
npm install
npm run build      # 产出 dist/yixi-lit.js 与 dist/yixi-lit.css
```

### 使用

```html
<link rel="stylesheet" href="yixi-lit.css" />
<script type="module" src="yixi-lit.js"></script>

<ld-button variant="primary">按钮</ld-button>
<ld-switch checked></ld-switch>
```

```js
import { message } from './yixi-lit.js';
message.success('操作成功');
```

### 开发命令

| 命令                | 说明                                             |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | 启动开发服务器（默认打开示例页，改代码自动重建） |
| `npm run build`     | 生产构建到 dist/                                 |
| `npm run lint`      | oxlint 检查                                      |
| `npm run format`    | oxfmt 格式化                                     |
| `npm run typecheck` | TypeScript 类型检查                              |

## 目录结构

```
src/
  base.ts              # 组件基类 LdElement（Light DOM）与注册函数
  index.ts             # 入口：引入全局样式并导出全部组件
  styles/
    tokens.css         # 设计令牌（CSS 变量）
    index.css          # 样式入口（引入所有组件样式）
    iconfont/          # Remix Icon 字体文件
    <name>.css         # 各组件样式
  components/
    <name>/index.ts    # 各组件实现
demo/index.html        # 组件示例页（交互演示）
docs/index.html        # 组件文档页（API 参数/事件/插槽说明）
docs/component-spec.md # 组件开发规范（贡献者指南）
```

## 组件清单

| 分类     | 组件                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 通用     | Icon 图标、Button 按钮、Link 链接、Divider 分割线                                                                                  |
| 导航     | BackTop 返回顶部、Anchor 锚点、Breadcrumb 面包屑、Pagination 分页、Tabs 选项卡、Steps 步骤条、Dropdown 下拉菜单                    |
| 表单     | Input 输入框、Textarea 多行文本、PasswordInput 密码框、Checkbox/CheckboxGroup、Radio/RadioGroup、Select/Option、DatePicker、Switch |
| 数据展示 | Tag 标签、Badge 徽标、Card 卡片、Avatar 头像 / AvatarGroup 头像组、Collapse 折叠面板、Progress 进度条                              |
| 反馈     | Alert 警告提示、Loading 加载、Tooltip 文字提示、Message 全局提示（JS API）、Dialog 对话框、Drawer 抽屉                             |

完整 API 文档请打开 `docs/index.html`，交互示例见 `demo/index.html`。

## 约定

- 组件标签统一 `ld-` 前缀（如 `<ld-button>`）
- 对外事件统一 `ld-` 前缀（如 `ld-change`），detail 携带数据
- CSS 类名统一 `ld-` 前缀，状态类用 `is-*`
- 新增组件请先阅读 `docs/component-spec.md`

## 主题定制

设计令牌全部集中在 `src/styles/tokens.css`，包含色阶、语义色、尺寸、圆角、字阶与阴影，数值对齐设计稿的 TDesign System 体系。在自己的全局样式中覆盖变量即可换肤：

```css
:root {
  --ld-brand-color: #7c4dff;
  --ld-radius-medium: 10px;
}
```

### 深色模式

令牌分浅色与深色两套，给任意祖先元素加上 `data-ld-theme="dark"` 即可整体切换，组件用法完全不变：

```html
<html data-ld-theme="dark">
```

```js
// 运行时切换
document.documentElement.dataset.ldTheme = 'dark'
```

同名旧变量（`--ld-color-primary`、`--ld-height-m`、`--ld-radius-m` 等）作为兼容别名保留，覆盖它们同样生效。
