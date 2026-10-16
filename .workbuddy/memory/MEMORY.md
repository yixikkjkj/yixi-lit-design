# yixi-lit-design 项目长期笔记

## 项目概况

Lit 3 Web Components 组件库：Light DOM + 全局 CSS + CSS 变量令牌（src/styles/tokens.css），rspack 构建、oxlint/oxfmt 质量工具、TypeScript strict。标签/事件/CSS 类统一 `ld-` 前缀。新增组件必读 docs/component-spec.md。

## 插槽机制（最容易被踩，务必先读）

Light DOM 下浏览器不投影 `<slot>`，基类 `LdElement`（src/base.ts）做了手动投影，因此：

- 模板照常写 `<slot></slot>` / `<slot name="footer"></slot>`，使用方照常写 `slot="footer"`，不要自己搬节点。
- 判断插槽内容一律用 `this.slotHasContent(name?)` / `this.slotText(name?)`（读使用方原始节点，渲染前即准确）；`@slotchange`、`slot.assignedNodes()`、`::slotted()` 在 Light DOM 下**全部失效**，禁止使用。
- 需要依插槽内容派生状态时覆写 `slottedContentChanged()`（基类在首次渲染**之前**调用）。**不要在 `super.performUpdate()` 之后再赋值 `@state`**：Lit 会紧接着 `__markUpdated()` 清空 `_$changedProperties` 且 `requestUpdate` 不再排队，改动会被静默丢弃。
- 内容被搬进 `<slot>` 后宿主与内容之间多一层，CSS 用后代选择器（`.ld-steps--horizontal ld-step`），不要用直接子选择器。

## 环境与工具坑（2026-10-16 实测）

- **npm 源**：jsdelivr 被网络拦截（curl exit 35），unpkg 可用；Remix Icon 字体改从 unpkg 下载内置（实测与官方 4.6.0 包 MD5 一致）。
- **rspack**：TS 里 `.js` 后缀导入需 `resolve.extensionAlias: { '.js': ['.ts', '.js'] }`；CSS 抽离需 `experiments: { css: true, outputModule: true }`。
- **oxfmt（0.2.x）**：默认即写入，没有 `--write` 参数（会报错）；有已知 bug 会删掉内联类型字面量 `{ content: string; duration?: number }` 的分号导致语法错误，需改用独立 interface 规避；`oxfmt .` 会去扫 node_modules 报错，脚本务必限定 src demo docs 路径。
- **Ardot MCP**：已配置 ~/.workbuddy/mcp.json（ardot-remote, http, https://ardot.tencent.com/mcp），端点 401 需 OAuth；已授权，设计稿 https://ardot.tencent.com/file/725984445489615（TDesign System 指引）可读。
- **无头 Chrome 验证法**：`python -m http.server` + `chrome --headless=new --dump-dom/--screenshot`。注意 `--screenshot` 只截窗口尺寸（要整页就给个够高的 window-size），输出目录用 `%TEMP%` 下的路径（写项目目录会 access denied）；**虚拟时间不驱动 CSS transition**，带 `transition` 的属性读到的是过渡前值，验深色模式前先注入 `*{transition:none!important}`。

## 约定

- 组件实现：src/components/<name>/index.ts + src/styles/<name>.css（新 css 需加进 src/styles/index.css 的 @import）。
- 构建/检查命令：npm run build / lint / format / typecheck。
- 示例页 demo/index.html、文档页 docs/index.html 都引用 dist/ 产物，改源码后需 npm run build。
- 设计令牌：优先语义层（`--ld-brand-color`、`--ld-text-color-primary`），其次基础层（`--ld-brand-color-7`、`--ld-size-6`），最后才是兼容别名（`--ld-text-regular` 等）。新增令牌要在 `:root` 与 `[data-ld-theme='dark']` 两处都写。
