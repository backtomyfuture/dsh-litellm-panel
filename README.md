# dsh-litellm-panel

DeepSeek Harness 侧边栏里的资源与工具中心。网关、模型和技能原来要改 YAML，现在放在同一个页面：

1. **LiteLLM**：这一页管整条链路是否生效。绿点表示网关接受了这把虚拟钥匙。打开「生效」会拉取这把钥匙能用的全部模型并写入对话。关掉会从对话里去掉 LiteLLM 这个供应商，已安装的 MCP 也会停掉。DSH 不接受一个没有模型的自定义供应商，所以关闭是删掉这一条。
2. **模型**：勾选不会立刻改对话，要点「保存并写入 DSH」。一个都不选再保存，会去掉 LiteLLM 供应商。点「详情」查看上次同步到的属性，这些属性只读。上下文、最大输出、输入类型和思考等级只按 LiteLLM `model_info` 里已经设置的值写入，不按模型名补。
3. **MCP**：打开页面就列出这把虚拟钥匙被授权的服务器。每行都有「未安装 / 已安装」开关。安装和卸载时页面上有进度。点「工具」只展示网关返回的工具，没有单独的工具开关。网关返回空列表时会说明，而不是一片空白。连接走网关转发，上游密钥留在 LiteLLM，这里不填。
4. **Skill**：列出 LiteLLM 上的技能。安装开关把它放进 `~/.dsh/skills`，安装时有进度。已经在 `~/.agents/skills` 或其他本机目录里的同名技能标成「本机已有」，可以预览，不能从这里覆盖。还没落地的技能要安装之后才能预览。安装只认网关技能列表里的来源：页面只传技能名，来源地址由插件向网关重新取，不接受页面或请求里带来的地址，也不能手动添加 MCP 服务器。

**消耗** 选项卡读取 LiteLLM 里这把 Virtual Key 自己的 spend logs，按模型汇总请求数、Token 和美元。

## 钥匙怎么发

网关管理员留着 `LITELLM_MASTER_KEY` 和 Salt Key，不要随插件发出去。在 LiteLLM 里给每个人建一把 Virtual Key，只勾给他能用的模型，并设好额度。使用者只拿到两样东西：网关的 Base URL，和他自己的 Virtual Key。

## 第一次使用

1. 在 LiteLLM 选项卡填写发给你的 Virtual Key，打开「生效」。钥匙会保存到本机，模型会从网关拉下来并写入对话。关掉这一页的开关会从对话里去掉 LiteLLM 供应商。
2. 打开 **模型** 选项卡可以少选几个，再点 **保存并写入 DSH**。勾选本身不改对话。一个都不选再保存，供应商会被去掉。点「详情」看上次同步的属性，这里不能改。写进去的上下文、最大输出和思考等级都来自 LiteLLM 已经设置的字段；没设置的不会补。DSH 用凭据名 `DSH_LITELLM_KEY` 调用网关。钥匙会写入 DSH 的凭据库；只放进进程环境变量时，模型菜单会是空的。改完插件后必须完全退出再打开。
3. MCP 选项卡直接列出这把虚拟钥匙被授权的服务器。每行都有安装开关；未安装时旁边写着「未安装」。点下去之后进度条还在，就是还在安装。打开后，DSH 连到网关的 `/服务器名/mcp`，由 LiteLLM 带上上游密钥转发。工具列表只展示，不单独开关。Tavily 这类上游密钥在 LiteLLM 的 MCP 服务器上填写，不在这个页面填。
4. Skill 选项卡直接列出 LiteLLM 上的技能。安装开关把它放进 `~/.dsh/skills`，DSH 会自己热加载。没安装、也还没有本地文件时，不能预览。已经在本机同名目录里的，显示「本机已有」和预览，不另装一份。装上之后，启动开关可以把技能移出扫描目录。
5. 消耗选项卡按模型显示这把钥匙自己的请求、Token 和金额。Virtual Key 的 Allowed Routes 需要包含 `spend_tracking_routes`，否则 LiteLLM 会返回 HTTP 403。

改完插件代码后要完全退出并重新打开 DeepSeek Harness，正在运行的进程不会重新加载这份脚本。

## 安装

先完全退出 DeepSeek Harness，再装进 desktop profile：

```sh
dsh plugin --profile desktop add dsh-litellm-panel
```

`dsh web` 把 `desktop` 换成 `web`。重新打开后，侧边栏出现「LiteLLM资源中心」。

页面只接受本机回环请求。虚拟钥匙写在 `$DSH_HOME/resource-center/litellm.key`（权限 `0600`），接口响应里没有钥匙。插件把它放进 `DSH_LITELLM_KEY`，并交给 DSH 凭据库，供 `apiKeyEnv` 使用。不会写进 `cordis.patch.yml`，也不会改 `LITELLM_MASTER_KEY`。

DSH 没有面向新手的 MCP 管理页。MCP 服务器是 `dsh-mcp-client` 的配置条目。这个插件只安装 LiteLLM 分发下来的服务器。

## 从 dsh-resource-center 迁移

旧包名是 `dsh-resource-center`，新包名是 `dsh-litellm-panel`。两个不能同时装，先移除旧的再装新的：

```sh
dsh plugin --profile desktop remove dsh-resource-center
dsh plugin --profile desktop add dsh-litellm-panel
```

钥匙和勾选保存在 `$DSH_HOME/resource-center`，迁移后原样保留。

0.2.0 删除了两个功能：手输 Git/HTTP 地址安装技能、手动添加 MCP。技能和 MCP 的来源现在只由 LiteLLM 网关提供。旧状态里的 stdio MCP 服务器会被忽略。

## 边界

- 模型写入走宿主的 `configEditor`。DSH 的编辑器会把 `llm-pi-ai` 的当前配置整段钉在 profile 层。找不到这条或没有编辑器时，页面给出可以贴进 `cordis.patch.yml` 的片段。
- MCP 热启停是把 `@deepseek-ai/dsh-mcp-client` 挂成子插件。插件目录解析不到这个包时，改从 DeepSeek Harness 的 `app.asar` 里加载。宿主里仍然没有时，配置会保存，运行状态是错误。
- 工具列表来自网关的 `tools/list`。网关把上游失败收成空列表时，页面会说明原因，不提供单个工具的开关。
- 只有 `~/.dsh/skills` 里的技能可以在页面上停用，做法是移到 `~/.dsh/resource-center/disabled-skills`。项目技能留在仓库里。
- DSH 只扫描技能根的下一层。网关技能安装会将选中的技能放进 `~/.dsh/skills/<name>/SKILL.md`。
- 会话痕迹来自 `llm/stream` 和 `tools/result`。金额仍以 LiteLLM 为准。花费选项卡可以停止采集。
- 插件对照的是 DeepSeek Harness `0.2.1-rc.5` 的侧边栏槽 `sidebar.panellist` 和 `main`。DSH 还在开发预览，槽名以后可能变。

## 开发

```sh
npm test
```

状态文件在 `$DSH_HOME/resource-center/state.json`。删掉这个目录会清空面板里保存的服务器、勾选和网关技能的安装记录，不会删除已经安装到 `~/.dsh/skills` 的技能。

## 许可

MIT
