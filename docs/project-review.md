# 项目评审：从组件演示到可复用组件库

评审日期：2026-10-16。评审对象为当前工作区代码及重新构建的生产产物。

结论：技术路线可以保留，但当前交付更接近组件演示集合。首先存在影响几乎全部组件的响应式构建缺陷；其次，内容组合、原生表单、键盘操作和弹层生命周期没有形成可靠的公共基础。组件名称齐全，不能据此判断组件库已经可用于业务。

## 验证范围与边界

- 已读取全部原需求对应组件的主要实现、公共基类、构建配置、CSS、README、示例和 API 文档。
- 已读取 Ardot 设计文件 `725984445489615` 中的按钮、Tabs、日期输入、Select、Radio、Checkbox 等节点及解析后的样式数值。属于结构和规格核对，未做逐像素截图对比。
- `npm run typecheck`、`npm run lint`、`npm run format:check` 均退出成功；`npm run build` 成功并产生三条体积警告。检查通过不代表功能可用，且 lint 的项目配置未被默认加载，详见下文。
- 通过 `npm pack --dry-run --json --cache .workbuddy/npm-audit-cache` 检查发布文件，未发布到注册表。
- 浏览器连接失败：Playwright 的本地连接端口 21222 拒绝连接，Computer Use 未发现可用浏览器。因此没有声称完成真实浏览器的视觉、焦点、触摸或辅助技术验证。
- 使用隔离安装的 happy-dom 加载生产 ESM，执行 DOM 状态诊断，并用隔离构建验证根因。模拟 DOM 不等同真实浏览器；本次状态结论同时有源码和构建产物支持。
- WorkBuddy 分享链接未能读取；关于技术意图的判断依据用户在本次消息中完整提供的原需求。

## 1. P0：生产构建破坏 Lit 的响应式属性

位置：`rspack.config.mjs:34`、`tsconfig.json:9`。

TypeScript 配置指定 `useDefineForClassFields: false`，但生产 JS 由 SWC 输出，SWC transform 未显式配置相同语义。实际产物用 `Object.defineProperty` 初始化 `checked`、`value`、`open` 等字段，创建实例自身的数据属性，遮住 Lit 在原型上安装的 getter/setter。

直接加载本次生产产物的观察结果：

| 操作 | 属性结果 | DOM 结果 |
| --- | --- | --- |
| 点击 Switch 内部 button | `checked === true` | `aria-checked` 仍为 `false`，无 `is-checked` |
| 设置 Input 的 `value` | 新字符串已写入宿主 | 内部 input 的 value 仍为空 |
| 设置 Drawer 的 `open = true` | `open === true` | panel 没有 `is-open` |

这意味着示例中的抽屉打开代码本身就不能正常驱动当前构建产物。初次渲染可能看起来正常，交互后的状态更新却失效。

隔离验证只在 SWC transform 中增加以下选项，未修改原项目配置：

```js
jsc: {
  parser: { syntax: 'typescript', decorators: true },
  transform: {
    legacyDecorator: true,
    decoratorMetadata: false,
    useDefineForClassFields: false,
  },
}
```

重新构建后，上述三种操作均更新了对应 DOM。原版与隔离版结果分别保存在 `.workbuddy/audit/results.json` 和 `results-fixed.json`。

这是 Lit 官方明确说明的类字段遮蔽响应式 accessor 问题，参见 [Lit：Avoiding issues with class fields](https://lit.dev/docs/components/properties/#avoiding-issues-with-class-fields) 与 [SWC compilation 配置](https://swc.rs/docs/configuration/compilation#jsctransformusedefineforclassfields)。应先修正此项，再评估其他交互。

## 2. P1：Light DOM 内容组合只适用于首次静态内容

位置：`src/base.ts:63`、`:67`、`:117`。

`__ldContent` 只采集一次，`slottedContentChanged()` 也只通知一次。后续操作不进入该内容集合：

- 渲染后往 Button 宿主追加内容，新增节点留在宿主下，没有进入内部 button。
- 删除原始文本节点后触发更新，基类又把旧引用追加回 slot，导致删除的内容复活。
- 动态追加 `slot="footer"`，内容没有进入对应 slot，也不会更新组件推导的 footer 状态。

这些现象在原版和修正 SWC 的隔离版中都存在。业务中的异步内容、动态操作按钮和条件渲染会频繁触发此类需求。

Light DOM 本身可行，但浏览器原生 slot 投影属于 Shadow DOM。当前代码实际上维护了一套自定义内容投影机制，需要明确内容所有权、动态增删、slot 变更、嵌套组件和节点移动的规则。[Lit 的说明](https://lit.dev/docs/components/shadow-dom/#implementing-createrenderroot)支持自定义渲染根，并不提供上述 Light DOM 投影机制。

建议保留 Light DOM，先决定公共内容契约：对于结构型容器可直接保留用户子节点；确实需要内部包装的组件，应隔离 Lit 管理区域与用户内容区域，并实现可跟踪的投影规则。不要把改为 Shadow DOM 当作使用全局 CSS 的必要前提。

## 3. P1：Tabs 的结构与子项同步有独立缺陷

位置：`src/components/tabs/index.ts:59`、`:77`、`:120`。

Tabs 模板只输出导航，没有面板容器或默认 slot。用户的 ld-tab 保持在原位置，Lit 把导航追加在后面。实际子元素顺序为 `LD-TAB, LD-TAB, DIV`，面板在导航之前；CSS 没有实现反向布局。

另外，MutationObserver 只观察宿主 childList，改子 Tab 的 label 不会重绘父导航；`querySelectorAll('ld-tab')` 还会收集内层 Tabs 的 Tab。修改 label 后导航仍显示旧标题已经在隔离版中复现。

建议：先明确导航和面板的布局区域；查询只管理最近父 Tabs 为自身的 Tab；明确监听 label/name/disabled、动态新增和移除；默认激活应考虑禁用项和激活项被删除的情况。

## 4. P1：单选组、多选组的状态同步不完整

位置：`src/components/checkbox/index.ts:114`、`src/components/radio/index.ts:93`。

当前逻辑仅在组禁用时写 `child.disabled = true`，重新启用组不恢复子项。简单改为 `child.disabled = group.disabled` 也不够，会覆盖使用者给子项单独设置的禁用状态，需要区分自身禁用与继承禁用。

查询所有后代还会跨越内层组。已复现外层 RadioGroup 的同步把内层已选中的 Radio 清除，内层组 value 仍保持旧值，数据与选中状态不一致。

这些检查在原版中显式调用带 changed key 的 requestUpdate，以绕过第 1 项遮蔽；修正 SWC 后也能复现。它们是独立的组件逻辑缺陷。

## 5. P1：表单组件缺少真实业务所需的表单与键盘能力

位置：`src/components/input/index.ts:116`、`src/components/checkbox/index.ts:46`、`src/components/radio/index.ts:41`、`src/components/select/index.ts:158`。

在 `<form>` 中使用 `<ld-input name="username" value="alice" required>`，宿主的 name/required 不会自动传给内部原生 input。诊断结果为内部 name 为空、required 为 false，FormData 未包含该字段。Checkbox/Radio 连原生 input 都没有。

这不意味着一定需要采用 ElementInternals：Light DOM 完全可以通过内部原生控件完成许多表单语义。但库必须主动定义并实现 name、required、默认值与重置、校验、label 和 focus 行为。

Checkbox、Radio、Select、DatePicker 的主要点击区域是 label/div/span，没有原生可聚焦控件、tabindex 或对应键盘行为；Tabs 的 role=tab 同样没有 tab stop。Switch 使用原生 button，这是可以保留的实现基础。

输入框还未判断 KeyboardEvent.isComposing，中文输入法确认文字时的 Enter 会触发 ld-change，已在 DOM 诊断中复现。建议明确 input/change/提交的边界，并验证 IME、Enter 后失焦的事件次数。

## 6. P1：抽屉和对话框缺少统一的弹层生命周期

位置：`src/components/drawer/index.ts:46`、`src/components/dialog/index.ts` 的同类 updated 逻辑。

代码跳过 open 的首次更新，因此直接写 `<ld-drawer open>` 或 `<ld-dialog open>` 会显示弹层，却没有注册 Escape 监听或锁定 body 滚动。该问题在 SWC 修正后仍存在。

多层实例各自保存和恢复 body.style.overflow，也会互相覆盖。已复现：先开 A，再开 B，关闭 A 后 B 仍打开但 body 恢复滚动；再关 B 后 body 反而停留在 hidden。

此外尚无打开后的初始焦点、焦点约束、关闭后焦点恢复、只关闭顶层弹层的 Escape 规则。关闭态 Drawer 仅平移出屏幕，aria-hidden 不负责移除键盘焦点。Select/Tooltip/DatePicker 的弹出层在组件内绝对定位，还需在真实浏览器验证 overflow 裁剪、视口边缘翻转与滚动定位。

建议抽出共享 overlay controller，统一滚动锁引用计数、栈、键盘与焦点管理，再让 Drawer/Dialog 复用。

## 7. P1：发布包没有类型声明

位置：`package.json:7`、`:16`、`:20`。

README 宣称完整类型声明，但 build 只运行 Rspack；typecheck 使用 tsc --noEmit，tsconfig 的 declaration=true 没有实际产出机会。打包清单中只有 JS、CSS、字体、source map、README 和 package.json，没有任何 .d.ts；exports 也没有 types 条件。

应增加独立的 declaration 构建与 exports.types，并从安装后的包运行 TypeScript 消费验证。不能仅检查本仓库源码的 HTMLElementTagNameMap 就认为使用者能获得类型。[TypeScript 的发布说明](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)描述了声明文件随包分发和入口配置。

目前也只有总入口，没有单组件 subpath export。全量注册入口可以保留，同时提供按需组件入口，并验证各自的 Icon 等依赖注册。JS 入口与 CSS 发布入口应形成明确契约。

## 8. P2：对齐了部分设计数值，但没有完整覆盖设计表现

设计文件的 Button 区域 `157119:9023` 包含：主要填充、默认填充、危险填充、普通描边、主要描边、危险描边，另有 32×32 圆形和方形独立图标按钮。

当前 Button API 的 variant 为 primary/default/dashed/text，shape 为 default/round；没有独立的 theme 维度、实线描边 variant 或固定方形/圆形图标按钮的 shape。使用者需要自行添加 CSS 才能表达稿中若干基本形态，达不到“按组件参数直接复用”的预期。

也有对齐的部分：32/24/40px 高度、16/8/24px 水平内边距和 3px 默认圆角有相应实现。问题不是全部样式错误，而是没有完整的“设计节点—API—状态—示例”映射。

日期输入节点 `157132:245` 的日历图标位于文本右侧，当前 render 把图标放在文本左侧。Tooltip 在深色主题中使用浅色的 text-primary 作为背景，同时使用白色 text-on-primary 作为文字，存在明显的对比度风险；该项尚未做浏览器视觉验证。

建议按稿中实际出现的变化建立映射表，再补 hover/active/focus/disabled/loading/error 状态，避免为了凑功能而添加与本次设计无关的参数。

## 9. P2：字体方案已实现，但若干实际图标名不存在

位置：`src/components/date-picker/index.ts:209`、`:216`、`src/components/message/index.ts:30`。

字体 CSS 中找不到 `ri-d-arrow-left`、`ri-d-arrow-right`、`ri-check-circle-fill` 的映射，日期年份切换与成功消息因此缺少正确的字形定义。项目中 Dialog 使用的 `checkbox-circle-fill` 则是另一个名字。

构建产物约为：JS 154 KiB、CSS 185 KiB、woff2 173 KiB、TTF 557 KiB。TTF 是回退资源，不应把两个字体体积都当成浏览器必定下载的首屏资源。完整 Remix Icon 映射和字体对“轻量库”仍有优化空间，可评估子集字体或可替换字体入口，保留 `name` 使用方式。

## 10. P2：工具与文档看起来齐全，实际契约和覆盖不足

- oxlint 项目文件叫 oxlint.json，但脚本没有 `-c oxlint.json`。对比默认与显式配置的 --print-config，默认 env 只有 builtin，ignorePatterns 为空；显式配置才出现 browser/es2021 和项目忽略项。应改默认文件名或显式加载配置。
- 当前 oxfmt 0.2.0 的检查报告为 33 个文件，与 TS 源文件范围相符。源码使用双引号、不加分号，与 .oxfmtrc.json 声明的 singleQuote=true、semi=true 不一致。现有通过结果不能证明 HTML/CSS 与声明的格式规则得到执行，应核实版本能力和真实覆盖范围。
- API 页面主要是属性表，缺少属性与 JS property 的绑定区别、默认 true 的布尔项如何关闭、数组赋值、受控状态、方法、键盘行为、表单接入和动态内容限制。例如 mask="false" 对默认 Boolean converter 仍表示 true，需要 `.mask=false` 或明确设计其他可配置方式。
- 参数表手写在单个 HTML 中，容易与 TS 漂移；尚无组件行为回归用例或消费包测试。建议从 JSDoc/元数据生成参数、事件、方法和 CSS 变量表，保留人工编写的行为规范与可运行示例。

## 技术路线判断

lit-html 主要负责模板渲染；当前项目进一步使用 LitElement 负责响应式属性和 Custom Elements 生命周期。这是可解释的工程选择，不应仅因依赖名为 lit 就认定偏离需求。建议在 README 解释这个选择。

Rspack、Oxc、TypeScript、Light DOM、全局 CSS、字体 Icon 都可以保留。当前最需要改的是公共基础和交互契约，而不是继续增加组件种类。原需求未要求的 Card、Avatar、Steps、Dropdown、Dialog 等扩展不应优先于已有核心组件的可靠性。

建议修复顺序：

1. 修正 SWC 配置，加入基于生产产物的响应式冒烟检查。
2. 明确 Light DOM 内容契约，修复动态投影、Tabs 和组组件边界。
3. 补原生表单、键盘、焦点与共享弹层管理。
4. 输出可消费的类型和按需入口，完成独立项目安装验证。
5. 按设计稿补组件表现矩阵，让示例和 API 文档覆盖这些约定。

建议验收包含：异步追加和删除内容、子项属性变化、禁用往返切换、真实表单提交与重置、纯键盘完成操作、中文输入法、初始打开/嵌套/移除弹层、嵌套组件、局部主题、窄屏和 overflow 容器，以及 TypeScript 使用者从发布包导入组件。

## 本次新增的诊断材料

原 src、package.json 和 rspack.config.mjs 未修改。生产 dist 通过项目现有命令重新生成。

- `.workbuddy/audit/verify.mjs`：加载构建产物的 DOM 诊断脚本。
- `.workbuddy/audit/results.json`：当前生产构建观察结果。
- `.workbuddy/audit/rspack-verified.config.mjs`：仅补 SWC 选项、输出到隔离目录的验证配置。
- `.workbuddy/audit/results-fixed.json`：隔离修正后的结果，证明三项响应式故障解除，其他问题独立存在。
- `.workbuddy/audit-env/`：隔离 happy-dom 依赖；没有加入项目根依赖或修改根 lockfile。

复现命令（PowerShell，在项目根目录执行）：

```powershell
npm run build
node .workbuddy/audit/verify.mjs
node_modules/.bin/rspack.cmd build --mode production --config .workbuddy/audit/rspack-verified.config.mjs
$env:AUDIT_FIXED='1'
node .workbuddy/audit/verify.mjs
Remove-Item Env:AUDIT_FIXED
```

诊断脚本输出 defect=true 表示观察到相应缺陷，不是“测试通过”。其中组组件和重叠弹层检查显式触发 named requestUpdate，以隔离生产构建的响应式故障。真实浏览器验证仍是后续验收的必要步骤。
