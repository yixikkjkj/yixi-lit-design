# 组件开发规范

本文件是新增/修改组件时必须遵守的约定，也是贡献者指南。

## 技术约定

- 基于 **Lit 3**（`lit` 包），TypeScript 开发，属性使用 `@property` / `@state` 装饰器；不使用会自动注册标签的 `@customElement`。
- **Light DOM 渲染**：所有组件继承 `src/base.ts` 的 `LdElement`（其 `createRenderRoot` 返回 `this`），不创建 Shadow Root。
- **全局 CSS**：组件样式写在 `src/styles/<组件名>.css`，类名统一以 `ld-` 前缀（如 `.ld-input`、`.ld-tabs__nav`），状态类用 `is-*`（如 `is-active`、`is-disabled`）。组件 TS 文件中**不写任何样式**。
- **设计令牌**：颜色、尺寸、圆角、间距一律引用 `src/styles/tokens.css` 中的 CSS 变量，不硬编码色值，方便使用者覆盖主题。令牌分三层，优先选语义层，其次基础层，最后才是兼容别名（`--ld-color-primary`、`--ld-height-m` 等旧名称，仅为兼容既有组件保留）：
  - 语义层：`--ld-brand-color`、`--ld-bg-color-container`、`--ld-text-color-primary`、`--ld-border-level-2-color`、`--ld-shadow-1`
  - 基础层：`--ld-brand-color-1`~`10`、`--ld-gray-color-1`~`14`、`--ld-size-1`~`16`、`--ld-radius-default`、`--ld-font-size-body-medium` / `--ld-line-height-body-medium`
  - 每个语义令牌在浅色与深色两套里都有定义，因此**不要在组件里写死浅色值**，加了深色值覆盖也要同步改 `[data-ld-theme='dark']` 块。
- **深色模式**：令牌通过 `[data-ld-theme='dark']` 切换，组件不需要任何额外代码即可适配。若组件内出现无法用令牌表达的颜色（如半透明叠加），需在两套主题块中分别给出。
- **插槽机制**：Light DOM 下浏览器不会投影 `<slot>`，基类做了三件事来补齐：
  - 首次渲染前记录使用方写在宿主体内的子节点，渲染后把它们搬进模板里对应的 `<slot>`。`slot` 的默认样式是 `display: contents`，所以搬进去的渲染位置就等于插槽位置，模板照常写 `<slot></slot>` / `<slot name="header"></slot>` 即可。
  - 判断插槽有没有内容用基类方法 `this.slotHasContent(name?)` / `this.slotText(name?)`，它们读的是使用方写的原始节点，**首次渲染前就是准确的**；不要再用 `slot.assignedNodes()`、`@slotchange` 或 `::slotted()`，这三者在 Light DOM 下全部失效。
  - 需要依据插槽内容派生状态的组件，覆写基类的 `slottedContentChanged()`。它会在首次渲染**之前**调用，因此状态能直接反映在第一次输出里；在里面赋值 `@state` 不会额外触发一轮渲染。
  - 因为内容会被搬进插槽，宿主与内容之间多了一层 `<slot>`，CSS 里请用后代选择器（`.ld-steps--horizontal ld-step`）而不是直接子选择器（`.ld-steps--horizontal > ld-step`）。
- 组件标签名：`ld-` 前缀小写短横线命名（如 `ld-date-picker`）。
- 注册方式：`index.ts` 仅导出组件类 / API，不在模块顶层注册。`register.ts` 导出 `registerXxx()`，在函数内部调用 `define('ld-xxx', LdXxx)`（来自 `src/base.ts`，幂等），并先调用内部依赖组件的注册函数。组合组件在同一注册函数内注册全部相关标签。
- 按需入口：`auto.ts` 导入 `style.css`、调用 `registerXxx()`，并重新导出组件类 / API 和注册函数。`style.css` 导入公共样式、内部依赖组件的样式及本组件样式。主入口 `src/index.ts` 只导出 `index.ts` 和 `register.ts`；全量入口 `src/all.ts` 导入每个组件的 `auto.ts`。
- 发布契约：仅 `auto.ts`、`all.ts`、CSS 和全量浏览器包声明为有副作用。不要向主入口、组件实现或注册函数模块添加顶层 DOM 操作、自动注册等副作用，否则会破坏 tree shaking。新增组件后运行 `npm run test:tree-shaking`。
- 每个组件文件末尾补充 `declare global { interface HTMLElementTagNameMap { ... } }` 类型声明。

## API 约定

- 属性用 `@property`，布尔属性 `{ type: Boolean }`，内部状态用 `@state`。
- **事件**：对外事件以 `ld-` 前缀，通过基类 `this.emit('ld-change', { value })` 派发（自动 bubbles + composed）。常用：`ld-change`（值变化）、`ld-click`、`ld-close`、`ld-open`。
- **插槽**：默认插槽放主体内容；命名插槽在 JSDoc 中用 `@slot 名称 - 说明` 标注。使用方按 Shadow DOM 习惯写 `slot="名称"` 即可，投影由基类完成，组件内不要自己搬节点。插槽相关状态见「技术约定 · 插槽机制」。
- 每个组件类必须有 JSDoc：一句话描述 + `@slot`/`@fires` + `@example` html 用法示例。
- 图标一律使用 `<ld-icon name="..."></ld-icon>`（Remix Icon 名称，不带 `ri-` 前缀），禁止内联 SVG。
- 弹出层（下拉、提示等）优先渲染在组件内部并绝对定位，宿主设置 `position: relative` 或弹层 `position: fixed/absolute`；z-index 使用令牌 `--ld-z-popup` 等。

## 代码结构

```
src/components/<name>/index.ts    # 组件实现，无自动注册
src/components/<name>/register.ts # 显式注册函数（含内部依赖）
src/components/<name>/auto.ts     # 自动注册与样式入口
src/components/<name>/style.css   # 公共样式 + 依赖样式 + 本组件样式
src/styles/<name>.css            # 组件样式（需加入 src/styles/index.css 的 @import 列表）
```

组合组件放在同一目录（如 tabs 目录内含 `LdTabs`、`LdTab` 两个类，各自注册标签）。

## 参考范例

按钮（`src/components/button/index.ts` + `src/styles/button.css`）与图标（`src/components/icon/index.ts`）是标准范例，新组件请保持一致的代码风格。
