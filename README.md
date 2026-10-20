# yixi-lit-design

基于 **Lit 3 + Light DOM + 全局 CSS** 的轻量 Web Components 组件库。无框架依赖，任意技术栈（原生 HTML、Vue、React、jQuery）都可以直接使用。

## 特性

- **Light DOM 渲染**：组件不创建 Shadow Root，样式完全由全局 CSS 驱动，使用者可以自由覆盖任何样式
- **插槽按 Shadow DOM 习惯书写**：`<slot>` 在 Light DOM 下不会自动投影，基类 `LdElement` 会在渲染后把使用方写的内容搬进模板里对应的 `<slot>`，因此 `<ld-dialog><div slot="footer">…</div></ld-dialog>` 这类写法直接可用
- **CSS 变量主题**：颜色、尺寸、圆角、间距等全部是 CSS 变量（见 `src/styles/tokens.css`），覆盖变量即换肤
- **图标字体内置**：Remix Icon 字体随包分发，`<ld-icon name="...">` 即插即用
- **TypeScript 开发**：完整的类型声明与 `HTMLElementTagNameMap` 增强
- **Tree shaking / 按需加载**：发布保留模块边界的 ESM；主入口无自动注册和样式副作用，按需入口自动加载组件、内部依赖和样式
- **现代化工具链**：Rspack 构建、oxlint + oxfmt 代码质量

## 快速开始

### 安装与构建

开发环境需要 Node.js `^20.19.0 || >=22.12.0`，推荐使用 Node.js 24 LTS。

```bash
npm install
npm run build      # 产出 ESM、类型声明、按需样式及 dist/browser/ 全量浏览器包
```

当前工具链为 Rspack 2、TypeScript 7、Oxlint 1 和 Oxfmt 0.73。`package-lock.json` 与 `pnpm-lock.yaml` 同步维护，选择 npm 或 pnpm 安装即可。

Oxfmt 已支持 VS Code 扩展使用的 `--lsp`。升级依赖后，在命令面板运行 `Oxc: Restart oxfmt Server`；如编辑器仍持有旧依赖，运行 `Developer: Reload Window`。可执行 `npm run test:formatter-lsp` 验证语言服务启动及项目格式配置。

### 按需使用（推荐）

在支持 CSS 导入的构建工具中，只导入需要的组件：

```ts
import 'yixi-lit-design/components/button';
import 'yixi-lit-design/components/switch';
import { message } from 'yixi-lit-design/components/message';

message.success('操作成功');
```

入口自动注册对应标签，并加载公共样式、组件样式及内部依赖。例如 Button 自动注册 Icon，PasswordInput 自动注册 Input 和 Icon；Checkbox、Select、Tabs 等入口同时注册同组的子组件。自行放进插槽的组件仍需单独导入。

```html
<ld-button variant="primary">按钮</ld-button>
<ld-switch checked></ld-switch>
```

### 从主入口 tree shake

主入口只导出组件类、注册函数和 API，**导入不会注册标签，也不会加载 CSS**。显式调用需要的注册函数，构建工具便可移除其他组件：

```ts
import { registerButton, registerSwitch, message } from 'yixi-lit-design';
import 'yixi-lit-design/styles/button.css';
import 'yixi-lit-design/styles/switch.css';
import 'yixi-lit-design/styles/message.css';

registerButton();
registerSwitch();
message.success('操作成功');
```

注册函数可重复调用，包含组件内部依赖。`message` / `showMessage` 在调用时注册所需的 Icon。每个 `styles/<组件名>.css` 已包含公共样式与内部依赖样式，无需另引入 tokens、base 或 icon；`styles/common.css` 可用于单独加载公共样式。

如果只导入 `LdButton` 等组件类，标签不会自动注册；一般使用 `registerButton()`，组件类导出用于类型引用、自定义继承等场景。

### 批量绑定属性（Lit / JavaScript）

Lit 模板使用元素指令实现类似 JSX `{...props}` 的批量绑定：

```ts
import { html } from 'lit';
import { spread } from 'yixi-lit-design/directives/spread';
import 'yixi-lit-design/components/input';
import 'yixi-lit-design/components/button';

const inputProps = {
  name: 'quantity',
  type: 'number',
  required: true,
  min: 0,
  max: 100,
  step: 1,
  autocomplete: 'off',
  '.value': '2',
  '@ld-input': (event: CustomEvent<{ value: string }>) => console.log(event.detail.value),
};
const buttonProps = { variant: 'primary', '?disabled': false, '@ld-click': () => console.log('保存') };

const view = html`
  <ld-input ${spread(inputProps)}></ld-input>
  <ld-button ${spread(buttonProps)}>保存</ld-button>
`;
```

`spread` 也可以从主入口导入，支持原生 `<input>` / `<button>` 等元素。它是本库提供的指令，并非 Lit 内置语法；原生 HTML 不解析 JSX 的 `{...props}`。

| 对象键 | 行为 |
| --- | --- |
| `name`、`min` 等普通键 | 写入 HTML attribute；`null` / `undefined` / Lit `nothing` 移除属性 |
| `required: true/false` | 布尔值控制属性存在与否；`aria-*` / `data-*` 保留字符串 `'true'` / `'false'` |
| `'.value'`、`'.options'` | 写入 DOM property，可传对象 / 数组，使用大小写敏感的 property 名 |
| `'?disabled'` | 显式控制布尔属性 |
| `'@click'`、`'@ld-input'` | 绑定事件函数或 `handleEvent` 对象，支持 `capture` / `once` / `passive`；函数的 `this` 与 Lit 事件绑定一致 |

对象变化后需要重新渲染；Lit 组件内修改对象时优先替换对象引用，或调用 `requestUpdate()`。删除键、给 `spread()` 传入 `null` / `undefined`，或移除指令时，会清理事件并恢复对应绑定前的值。不要用多个指令或显式绑定同时控制同一属性。

批量绑定只作用于指定的元素，不会自动把宿主上的所有属性复制到内部控件。本库已为 Input（含 PasswordInput）透传 `name`、`form`、`required`、`minlength`、`min/max/step`、`pattern`、`autocomplete`、`inputmode`、`enterkeyhint`、`list`；Textarea 支持对应的文本输入属性；Button 支持 `name/value/form` 和 `formaction/formmethod/formenctype/formtarget/formnovalidate`。原生约束是否生效取决于输入 `type`，例如 `min/max/step` 适用于 number/date 等类型。

原生 JavaScript 可以直接批量赋值组件 property：

```js
const input = document.querySelector('ld-input');
Object.assign(input, { name: 'email', type: 'email', required: true, autocomplete: 'email' });
input.addEventListener('ld-input', (event) => console.log(event.detail.value));
```

### 日期与日期区间

日期选择器支持单日和双月区间模式：

```html
<ld-date-picker clearable></ld-date-picker>
<ld-date-picker range value="2026-10-26,2026-11-05" clearable></ld-date-picker>
```

`range` 模式下，JavaScript 的 `value` 为 `[开始日期, 结束日期]`，HTML 属性用逗号分隔。第二次点选后才触发 `ld-change`，反向选择自动排序，清空区间返回 `[]`。

### 使用者构建配置

保留 ES Modules（不要在构建前转成 CommonJS），使用生产构建即可。Rspack 使用 `mode: 'production'`，已有 CSS 处理配置的项目不需要额外的 tree shaking 插件。组件库已准确标记 CSS 和自动注册入口的 `sideEffects`，不要覆盖成 `false`。

JavaScript tree shaking 不会分析 HTML 标签或按选择器裁剪 CSS。需要按需样式时使用上述组件入口或 `styles/<组件名>.css`；`styles.css` 是全量样式。含图标的组件仍携带完整 Remix Icon 样式和字体，不做字体子集裁剪。

### 全量使用 / 无构建工具

在应用构建工具中可用 `import 'yixi-lit-design/all'` 注册并加载全部组件和样式；此入口用于明确需要全量组件的情况。

直接通过浏览器加载时使用单独生成的全量包（无需解析 npm 依赖）：

```html
<link rel="stylesheet" href="dist/browser/index.css" />
<script type="module" src="dist/browser/index.js"></script>

<ld-button variant="primary">按钮</ld-button>
<ld-switch checked></ld-switch>
```

```js
import { message } from './dist/browser/index.js';
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
| `npm run test:tree-shaking` | 构建并验证组件裁剪、CSS/字体、注册依赖及消费者类型 |
| `npm run test:browser-build` | 验证 demo 的开发 / 生产编译产物中 Lit 响应式属性正常工作 |
| `npm run test:native-props` | 在真实 Chrome/Edge 中验证原生属性、表单校验与 spread 更新 / 清理；可用 `BROWSER_BIN` 指定浏览器 |
| `npm run test:formatter-lsp` | 验证 Oxfmt LSP 初始化、格式化和项目配置读取 |

## 目录结构

```
src/
  base.ts              # 组件基类 LdElement（Light DOM）与注册函数
  index.ts             # 无自动注册或 CSS 的主入口
  all.ts               # 全量注册与样式入口
  styles/
    tokens.css         # 设计令牌（CSS 变量）
    index.css          # 样式入口（引入所有组件样式）
    common.css         # 公共样式（tokens + base）
    iconfont/          # Remix Icon 字体文件
    <name>.css         # 各组件样式
  components/
    <name>/index.ts    # 组件类 / API，不在模块顶层注册
    <name>/register.ts # 显式注册函数，包含内部组件依赖
    <name>/auto.ts     # 按需自动注册入口，加载 style.css
    <name>/style.css   # 按需样式入口，包含公共样式与内部依赖样式
scripts/build.mjs     # ESM / 类型 / 样式发布构建；Lit 保持外部依赖
dist/browser/         # 独立全量浏览器包，仅用于直接加载或示例
demo/index.html        # 组件示例页（交互演示）
docs/index.html        # 组件文档页（API 参数/事件/插槽说明）
docs/component-spec.md # 组件开发规范（贡献者指南）
```

## 组件清单

| 分类     | 组件                                                                                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 通用     | Icon 图标、Button 按钮、Link 链接                                                                                  |
| 导航     | BackTop 返回顶部、Anchor 锚点、Breadcrumb 面包屑、Pagination 分页、Tabs 选项卡、Steps 步骤条、Dropdown 下拉菜单                    |
| 表单     | Input 输入框、Textarea 多行文本、PasswordInput 密码框、Checkbox/CheckboxGroup、Radio/RadioGroup、Select/Option、DatePicker、Switch |
| 数据展示 | Tag 标签、Badge 徽标、Avatar 头像 / AvatarGroup 头像组、Collapse 折叠面板、Progress 进度条                              |
| 反馈     | Alert 警告提示、Loading 加载、Tooltip 文字提示、Message 全局提示（JS API）、Dialog 对话框、Drawer 抽屉                             |

完整 API 文档请打开 `docs/index.html`，交互示例见 `demo/index.html`。

示例页左侧提供组件目录与搜索，右侧展示组件效果、可复制的示例代码、输入参数和类型格式表格，以及事件与插槽说明。支持浅色 / 深色模式和小屏布局。

`npm run dev` 默认打开 `http://localhost:8080/demo/index.html`。修改 `src` 中的组件 / 样式会重新编译并刷新；修改 `demo` 中的 HTML、CSS、JS 会刷新示例页。`docs` 仍可通过 `/docs/index.html` 访问，修改文档不会触发示例页刷新，需手动刷新文档页查看最新内容；磁盘上的 `dist` 也不重复监听。

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
