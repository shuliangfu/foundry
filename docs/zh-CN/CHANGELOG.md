# 变更日志

本文档记录 @dreamer/foundry 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)， 版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

## [1.8.2] - 2026-02-26

### 新增

- **build 命令**：`foundry build` 编译 Solidity 合约，支持 `-s`（显示合约大小）、`-f`（强制重新编译）、`--optimizer-runs`。

### 变更

- **缓存目录**：由 `~/.foundry-cache` 改为 `~/.dreamer/foundry`；安装/升级的版本号写入 `~/.dreamer/foundry/version.json`，`getInstalledVersion` / `setInstalledVersion` 直接读写该文件，支持多包格式。
- **deploy --verify**：使用 `--verify` 时改为「部署一个、验证一个」，不再等全部部署完再统一验证；`--api-key` 可省略，从 `.env` 的 `ETH_API_KEY` 读取。
- **CLI 示例**：帮助与错误提示中的合约名示例改为通用占位符（如 `Contract1`、`Contract2`），不再使用业务相关名称。
- **init 模板**：示例测试脚本中 `describe` / `it` 的文案使用 `"${$tr(...)}"` 生成合法字符串字面量；Solidity 默认版本改为 `^0.8.20`。
- **setup**：安装成功后自动检查并安装官方 Foundry 工具链（forge/cast/anvil）；帮助信息列出全部 CLI 命令与用法；移除 deploy/verify/build 命令内的重复 Foundry 安装检查（仅在 setup 时执行一次）。

### 修复

- **验证构造函数参数**：支持嵌套数组（如 `address[]`），不再用 `.map(String)` 压平；`VerifyOptions.constructorArgs` 改为 `unknown[]`，`serializeConstructorArg` 递归序列化；修复 lint `no-inner-declarations`（将函数移至模块顶层）。
- **foundry test**：通过 `createCommand` + `stdin/stdout/stderr: "inherit"` 实现实时输出与 Ctrl+C 终止；正确传递 `WEB3_ENV` 等环境变量。

## [1.8.1] - 2026-02-20

### 变更

- **导出**：移除冗余的 `./deploy`、`./verify` 子路径导出，统一从主入口 `@dreamer/foundry` 使用。
- **环境变量**：`loadEnv()` 在 `.env` 不存在时返回 `{}`（不退出进程）；读取失败时改为 throw
  便于调用方处理；新增 i18n 键 `envNotFoundEmpty`。
- **ConfigManager**：从项目根目录加载 `.env`（`join(projectRoot, ".env")`），便于测试与 CI。
- **CLI**：`getApiKey("")` 现返回 `null`（空字符串视为无效）。
- **工具**：移除 `utils/mod.ts` 中重复的 logger 导出；`deno.json` 的 fmt 改为 flat
  选项以消除弃用警告。
- **文档**：为 deno.json 所有入口补充模块与导出
  JSDoc（mod、cli、setup、utils、utils/env、utils/web3、utils/logger、utils/time）；补充
  `Web3Options` 与 `Web3` 类说明。

### 修复

- CI：配置与 init 测试在无 `.env` 或英文环境下不再失败；放宽 `getAllEnvConfig` 断言；init
  测试通过设置 zh-CN 断言中文。

## [1.8.0] - 2026-02-20

### 新增

- **CI**：新增 GitHub Actions 工作流 `.github/workflows/ci.yml`，在推送到或 PR 到 `dev` 时于
  Linux、macOS、Windows 上执行 `deno check`、`deno lint`、`deno test -A tests/`，用于跨平台验证。
- **i18n**：新增 `@dreamer/i18n` 依赖，CLI 与相关文案支持国际化（中英文等），文案统一由
  `src/locales/` 与 `$tr()` 管理。

### 变更

- **CLI**：优化 `cli.ts` 结构，将 deploy、init、verify、run、test、upgrade、uninstall、build
  等命令逻辑迁移至 `src/cmd/`，CLI 入口仅负责命令注册与委托执行，便于维护与扩展。
- 依赖版本更新：升级
  `@dreamer/web3`、`@dreamer/logger`、`@dreamer/runtime-adapter`、`@dreamer/test`、`@dreamer/console`
  至当前稳定版本。
- **Windows 兼容**：`run` 命令脚本路径使用 `isAbsolute`/`resolve` 识别与解析，支持 Windows
  绝对路径（如 `C:\path\to\script.ts`）；`setup.ts` 与 `cmd/upgrade.ts` 中 Windows
  根路径判断改为匹配经 runtime-adapter 统一后的正斜杠形式（`C:`/`C:/`），避免根目录检测错误。
- 测试报告（`docs/zh-CN/TEST_REPORT.md`、`docs/en-US/TEST_REPORT.md`）与 README（根目录及
  `docs/zh-CN/README.md`）：更新测试统计为 264 个测试、261 通过、3 忽略，执行时间约 6 秒，通过率
  98.9%。

## [1.7.10] - 2026-02-13

### 新增

- 在 `docs/` 下建立文档目录结构：`docs/en-US/` 与 `docs/zh-CN/` 分别存放英文与中文内容。
- 英文测试报告位于 `docs/en-US/TEST_REPORT.md`（由根目录移入）。
- 中文测试报告位于 `docs/zh-CN/TEST_REPORT.md`。
- 英文变更日志位于 `docs/en-US/CHANGELOG.md`。
- 中文变更日志位于 `docs/zh-CN/CHANGELOG.md`。
- 中文 README 位于 `docs/zh-CN/README.md`（完整中文文档）。

### 变更

- **CLI**：`foundry test` 命令的网络参数现支持 `mainnet`（校验与提示由仅允许 local、testnet 改为
  local、testnet、mainnet）。
- 根目录 `README.md` 改为仅英文；原中文内容迁移至 `docs/zh-CN/README.md`。
- 根目录 README 中的测试报告与变更日志链接指向 `docs/en-US/` 与 `docs/zh-CN/` 对应文件。
- `docs/zh-CN/README.md` 中增加指向英文 README、英文测试报告及中英文变更日志的链接。
- Cursor 规则 `00-文档位置.mdc` 已更新 foundry 文档路径（en-US/zh-CN 的
  README、TEST_REPORT、CHANGELOG）。

### 文档与许可证

- 许可证仍为 **Apache License 2.0**；根目录 `LICENSE` 文件未改动。README 徽章与链接在根目录指向
  `./LICENSE`，在 `docs/zh-CN/` 下指向 `../../LICENSE`。

## [1.7.9] - 2026-02-13

### 新增

- 实现 `serializeConstructorArg`，在合约验证时支持构造函数参数中嵌套数组的序列化。

### 变更

- 将 `@dreamer/test` 升级至 1.0.5。
- 增强验证时的构造函数参数处理，支持嵌套数组。

## [1.7.8] - 2026-02-05

### 变更

- 将 `@dreamer/web3` 升级至 ^1.0.6-beta.13。

## [1.7.7] - 2026-02-01

### 变更

- 将 `@dreamer/web3` 升级至 1.0.6-beta.12，以兼容最新依赖。

## [1.7.6] - 2026-02-01

### 变更

- 版本号更新，依赖兼容性调整。

## [1.7.5] - 2026-02-01

### 变更

- 优化 CLI 中强制部署的提示文案，表述更清晰。

## [1.7.4] - 2026-01-31

### 变更

- 优化 CLI 部署与验证命令中的合约名示例说明。

## [1.7.3] - 2026-01-31

### 新增

- 在 CLI 安装/设置阶段检查 Foundry 是否已安装；重构设置流程以在需要时校验 Foundry 可用性。

### 变更

- 扩展 `.gitignore`，忽略测试输出与覆盖率产物。

## [1.7.2] - 2026-01-31

### 变更

- 调整 CLI 描述，更准确反映合约开发能力。

## [1.7.1] - 2026-01-31

### 变更

- 调整 CLI 描述，突出合约开发工具用途。

## [1.7.0] - 2026-01-31

### 变更

- 重组 CLI 中强制部署确认逻辑，交互与流程更清晰。

## [1.6.9] - 2026-01-31

### 变更

- 在强制部署确认提示中增加换行，提升可读性。

## [1.6.8] - 2026-01-31

### 变更

- 优化 CLI 提示文案与换行格式。

## [1.6.7] - 2026-01-31

### 变更

- 调整 CLI 中部署开始相关日志的输出位置。

## [1.6.6] - 2026-01-31

### 新增

- 在部署流程中支持部署后立即验证合约；CLI 与 deploy 模块支持 API Key 传入。

## [1.6.5] - 2026-01-31

### 变更

- 在 init 中将默认 Solidity 编译器版本升级为 0.8.20，提升兼容性与功能。

## [1.6.4] - 2026-01-31

### 新增

- 新增 `foundry build` 命令，用于编译 Solidity 合约，支持 sizes、强制重编译、optimizer runs 等选项。

## [1.6.3] - 2026-01-31

### 变更

- 将 `@dreamer/web3`、`@dreamer/logger`、`@dreamer/test` 升级至最新 beta 版本。

## [1.6.2] - 2026-01-30

### 新增

- 在 CLI 中恢复全局环境变量初始化，便于配置管理。

### 变更

- 优化 CLI 错误信息，便于排查问题。

## [1.6.1] - 2026-01-29

### 变更

- 在 CLI 中于脚本执行后增加换行，提升可读性。

## [1.6.0] - 2026-01-29

### 变更

- 在 CLI 脚本执行后的日志中增加换行。

## [1.5.9] - 2026-01-29

### 变更

- 移除 deploy 中多余日志，输出更简洁。

## [1.5.8] - 2026-01-29

### 变更

- 移除 deploy 中的完成提示日志。

## [1.5.7] - 2026-01-29

### 变更

- 在 CLI 合约验证流程中增加换行格式，提升可读性。

## [1.5.6] - 2026-01-29

### 变更

- 优化 CLI 版本检查时的错误日志，去掉多余换行。

## [1.5.5] - 2026-01-29

### 变更

- 在 deploy-utils 的交易确认处理中移除加载进度条，简化日志。

## [1.5.4] - 2026-01-29

### 变更

- 在 CLI 版本检查与升级相关消息中增加换行格式。

## [1.5.3] - 2026-01-29

### 新增

- 在 deploy-utils 中为区块确认过程增加加载进度条，提升反馈。

## [1.5.2] - 2026-01-29

### 变更

- CLI 中命令执行改为使用 `spawn()`，改善进程管理与错误上报。
- 对齐配置中的 runtime-adapter 版本。

## [1.5.1] - 2026-01-29

### 变更

- CLI 中命令执行改为使用 `spawn()` 并正确检查状态。

## [1.5.0] - 2026-01-29

### 新增

- CLI 中对网络选项进行校验。

### 变更

- 确保 CLI 中正确传递 `WEB3_ENV`，网络配置行为一致。

## [1.4.9] - 2026-01-29

### 新增

- 在 deploy-utils 中实现 `waitForConfirmations`，用于部署时的交易确认等待。

## [1.4.8] - 2026-01-29

### 新增

- CLI 中增加 `--confirmations` 选项，用于指定部署时等待的区块确认数。
- 更新部署相关接口与文档以支持确认数配置。

## [1.4.7] - 2026-01-29

### 新增

- `foundry test` 命令，支持按网络运行测试。
- README 中补充 test 命令用法；setup 帮助信息中包含 test 命令说明。

## [1.4.6] - 2026-01-29

### 新增

- `foundry run` 命令，用于按网络执行 TypeScript 脚本。

### 变更

- env 模块中环境变量处理避免覆盖已有值。

## [1.4.5] - 2026-01-29

### 新增

- `foundry run` 命令及 README 使用说明。

## [1.4.4] - 2026-01-29

### 变更

- 在 deploy 中增加控制台输出，便于查看进度。

## [1.4.3] - 2026-01-29

### 变更

- 重构 CLI、deploy、verify 中的参数解析，将 `runtimeArgs` 按函数形式处理，以兼容 Deno/Bun。

## [1.4.2] - 2026-01-29

### 变更

- 重构命令执行逻辑，兼容 Deno 与 Bun。
- 改进脚本执行时的环境变量处理。

## [1.4.1] - 2026-01-29

### 新增

- README 中同时说明 Deno 与 Bun 运行时用法。
- `.gitignore` 中增加与 Bun 相关的忽略项。

### 变更

- 提升 CLI 工具与验证相关测试覆盖与错误处理。

## [1.4.0] - 2026-01-29

### 变更

- 调整 deploy 中进度条提示文案，提升反馈。

## [1.3.9] - 2026-01-29

### 变更

- 重构 deploy 中进度条逻辑，确保每个脚本开始与结束正确。

## [1.3.8] - 2026-01-29

### 变更

- 确保所有部署脚本执行完毕后正确停止进度条。

## [1.3.7] - 2026-01-29

### 新增

- 在 deploy 中增加带 5 秒等待的加载进度条。

### 变更

- 调整 README 中许可证徽章链接。

## [1.3.6] - 2026-01-29

### 变更

- 在 init 中将 `auto_detect_remappings` 设为 false，并配置显式 remappings，避免依赖移除导致问题。

## [1.3.5] - 2026-01-28

### 变更

- 增加 deploy、verify 相关路径；调整 CLI 结构。

## [1.3.4] - 2026-01-28

### 变更

- 统一 CLI、deploy、verify 中的导入路径。
- 加强 deploy-utils 中的错误处理与日志。

## [1.3.3] - 2026-01-28

### 变更

- init 中文件包含规则增加测试文件，完善项目结构。

## [1.3.2] - 2026-01-28

### 新增

- 新时间工具（Anvil）；README 中增加本地 Anvil 时间操作示例。

### 变更

- 用新时间工具替代原 time-sync；在 mod 中导出；移除已弃用的 time-sync。

## [1.3.1] - 2026-01-28

### 新增

- 在 CLI 与 setup 中自动检查 Foundry 是否已安装。

## [1.3.0] - 2026-01-28

### 变更

- 重构 deploy、verify 中的网络处理，使用默认网络常量。

## [1.2.9] - 2026-01-28

### 变更

- 在 deploy-utils 中区分连接错误与其他错误（交易替换场景）。

## [1.2.8] - 2026-01-28

### 变更

- 部署脚本之间等待时间改为 3 秒，确保 RPC/状态就绪。

## [1.2.7] - 2026-01-28

### 新增

- 部署与验证命令支持在参数中传入多个合约名。

### 变更

- README 中明确合约名在 deploy/verify 中的用法。

## [1.2.6] - 2026-01-28

### 变更

- 清理 deploy-utils 中的空白与格式。

## [1.2.5] - 2026-01-28

### 新增

- 在 deploy-utils 中增加与 gas 价格相关的常量。

### 变更

- 加强 deploy-utils 中部署错误处理与交易管理。

## [1.2.4] - 2026-01-28

### 变更

- 简化 CLI 中的确认提示。

## [1.2.3] - 2026-01-28

### 变更

- 在部署脚本之间增加 2 秒等待，确保 RPC/状态就绪。

## [1.2.2] - 2026-01-28

### 变更

- 在 CLI、deploy、verify 中设置 `WEB3_ENV`，统一网络配置。

## [1.2.1] - 2026-01-28

### 变更

- 部署账户改为使用 `config.address`，地址管理更清晰。

## [1.2.0] - 2026-01-28

### 新增

- README 中增加部署脚本示例；部署器接口增加 logger。

## [1.1.9] - 2026-01-26

### 变更

- 从 README 中移除全局 CLI 安装说明。

## [1.1.8] - 2026-01-26

### 变更

- 更新 CLI 中脚本路径与网络配置处理；移除过时文档。

## [1.1.7] - 2026-01-26

### 新增

- deno.json 中新增工具导出；Web3 类增加账户与合约管理方法。

## [1.1.6] - 2026-01-26

### 新增

- `foundry uninstall` 命令，带确认与路径检测。

## [1.1.5] - 2026-01-26

### 新增

- CLI 升级过程中显示加载进度条。

## [1.1.4] - 2026-01-26

### 变更

- 完善 deploy 中的类型注解，提升类型安全。

## [1.1.3] - 2026-01-26

### 变更

- 加强 CLI、deploy、verify 中的类型安全与错误处理。

## [1.1.2] - 2026-01-26

### 变更

- 精简 CLI 中版本检查与升级相关日志。

## [1.1.1] - 2026-01-26

### 变更

- 移除 deploy-utils 重试过程中的冗余日志。

## [1.1.0] - 2026-01-26

### 变更

- 精简 CLI 与 deploy 中的日志输出。

## [1.1.0-beta.41] - 2026-01-26

### 变更

- 升级命令不再需要用户确认，自动升级到最新版本。

## [1.1.0-beta.40] - 2026-01-26

### 新增

- 在 CLI、deploy、verify 中为部署与验证增加加载进度条。

## [1.1.0-beta.39] - 2026-01-26

### 变更

- 版本检查始终从网络刷新，保证比较结果准确。

## [1.1.0-beta.38] - 2026-01-26

### 新增

- CLI 中版本缓存支持强制刷新选项。

## [1.1.0-beta.37] - 2026-01-26

### 新增

- setup 中为升级命令增加帮助说明。

## [1.1.0-beta.36] - 2026-01-26

### 新增

- `foundry upgrade` 命令，用于检查并升级到最新版本（含 beta）。

## [1.1.0-beta.35] - 2026-01-26

### 新增

- 在 verify 与 cli-utils 中实现支持实时 stdout/stderr 流式输出的命令执行。

## [1.1.0-beta.34] - 2026-01-26

### 变更

- 增强部署相关日志；CLI 与 deploy 中脚本路径缓存优化。

## [1.1.0-beta.33] - 2026-01-26

### 新增

- 在 CLI 与 setup 中增加全局已安装版本缓存。

## [1.1.0-beta.32] - 2026-01-26

### 变更

- 优化 init、verify 中的网络配置与 web3 配置加载。

## [1.1.0-beta.31] - 2026-01-26

### 新增

- CLI 与 verify 中合约名支持大小写不敏感。

## [1.1.0-beta.30] - 2026-01-26

### 新增

- 验证前在链上检查合约是否存在；改进 API Key 相关错误提示。

## [1.1.0-beta.29] - 2026-01-26

### 新增

- verify 中支持构造函数参数编码。

## [1.1.0-beta.28] - 2026-01-26

### 变更

- 优化 deploy、deploy-utils 中 abiDir 与网络提取逻辑。

## [1.1.0-beta.27] - 2026-01-26

### 变更

- 在 CLI 与 setup 中为 JSR 元数据与 deno.json 拉取增加缓存。

## [1.1.0-beta.26] - 2026-01-26

### 新增

- 模块中导出 deploy 与 verify。

---

更早的 beta 与 1.0.x 变更请参见 git 历史。

[1.7.10]: https://github.com/dreamer-jsr/foundry/compare/v1.7.9...v1.7.10
[1.7.9]: https://github.com/dreamer-jsr/foundry/compare/v1.7.8...v1.7.9
[1.7.8]: https://github.com/dreamer-jsr/foundry/compare/v1.7.7...v1.7.8
[1.7.7]: https://github.com/dreamer-jsr/foundry/compare/v1.7.6...v1.7.7
[1.7.6]: https://github.com/dreamer-jsr/foundry/compare/v1.7.5...v1.7.6
[1.7.5]: https://github.com/dreamer-jsr/foundry/compare/v1.7.4...v1.7.5
[1.7.4]: https://github.com/dreamer-jsr/foundry/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/dreamer-jsr/foundry/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/dreamer-jsr/foundry/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/dreamer-jsr/foundry/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/dreamer-jsr/foundry/compare/v1.6.9...v1.7.0
[1.6.9]: https://github.com/dreamer-jsr/foundry/compare/v1.6.8...v1.6.9
[1.6.8]: https://github.com/dreamer-jsr/foundry/compare/v1.6.7...v1.6.8
[1.6.7]: https://github.com/dreamer-jsr/foundry/compare/v1.6.6...v1.6.7
[1.6.6]: https://github.com/dreamer-jsr/foundry/compare/v1.6.5...v1.6.6
[1.6.5]: https://github.com/dreamer-jsr/foundry/compare/v1.6.4...v1.6.5
[1.6.4]: https://github.com/dreamer-jsr/foundry/compare/v1.6.3...v1.6.4
[1.6.3]: https://github.com/dreamer-jsr/foundry/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/dreamer-jsr/foundry/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/dreamer-jsr/foundry/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/dreamer-jsr/foundry/compare/v1.5.9...v1.6.0
[1.5.9]: https://github.com/dreamer-jsr/foundry/compare/v1.5.8...v1.5.9
[1.5.8]: https://github.com/dreamer-jsr/foundry/compare/v1.5.7...v1.5.8
[1.5.7]: https://github.com/dreamer-jsr/foundry/compare/v1.5.6...v1.5.7
[1.5.6]: https://github.com/dreamer-jsr/foundry/compare/v1.5.5...v1.5.6
[1.5.5]: https://github.com/dreamer-jsr/foundry/compare/v1.5.4...v1.5.5
[1.5.4]: https://github.com/dreamer-jsr/foundry/compare/v1.5.3...v1.5.4
[1.5.3]: https://github.com/dreamer-jsr/foundry/compare/v1.5.2...v1.5.3
[1.5.2]: https://github.com/dreamer-jsr/foundry/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/dreamer-jsr/foundry/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/dreamer-jsr/foundry/compare/v1.4.9...v1.5.0
[1.4.9]: https://github.com/dreamer-jsr/foundry/compare/v1.4.8...v1.4.9
[1.4.8]: https://github.com/dreamer-jsr/foundry/compare/v1.4.7...v1.4.8
[1.4.7]: https://github.com/dreamer-jsr/foundry/compare/v1.4.6...v1.4.7
[1.4.6]: https://github.com/dreamer-jsr/foundry/compare/v1.4.5...v1.4.6
[1.4.5]: https://github.com/dreamer-jsr/foundry/compare/v1.4.4...v1.4.5
[1.4.4]: https://github.com/dreamer-jsr/foundry/compare/v1.4.3...v1.4.4
[1.4.3]: https://github.com/dreamer-jsr/foundry/compare/v1.4.2...v1.4.3
[1.4.2]: https://github.com/dreamer-jsr/foundry/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/dreamer-jsr/foundry/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/dreamer-jsr/foundry/compare/v1.3.9...v1.4.0
[1.3.9]: https://github.com/dreamer-jsr/foundry/compare/v1.3.8...v1.3.9
[1.3.8]: https://github.com/dreamer-jsr/foundry/compare/v1.3.7...v1.3.8
[1.3.7]: https://github.com/dreamer-jsr/foundry/compare/v1.3.6...v1.3.7
[1.3.6]: https://github.com/dreamer-jsr/foundry/compare/v1.3.5...v1.3.6
[1.3.5]: https://github.com/dreamer-jsr/foundry/compare/v1.3.4...v1.3.5
[1.3.4]: https://github.com/dreamer-jsr/foundry/compare/v1.3.3...v1.3.4
[1.3.3]: https://github.com/dreamer-jsr/foundry/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/dreamer-jsr/foundry/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/dreamer-jsr/foundry/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/dreamer-jsr/foundry/compare/v1.2.9...v1.3.0
[1.2.9]: https://github.com/dreamer-jsr/foundry/compare/v1.2.8...v1.2.9
[1.2.8]: https://github.com/dreamer-jsr/foundry/compare/v1.2.7...v1.2.8
[1.2.7]: https://github.com/dreamer-jsr/foundry/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/dreamer-jsr/foundry/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/dreamer-jsr/foundry/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/dreamer-jsr/foundry/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/dreamer-jsr/foundry/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/dreamer-jsr/foundry/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/dreamer-jsr/foundry/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/dreamer-jsr/foundry/compare/v1.1.9...v1.2.0
[1.1.9]: https://github.com/dreamer-jsr/foundry/compare/v1.1.8...v1.1.9
[1.1.8]: https://github.com/dreamer-jsr/foundry/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/dreamer-jsr/foundry/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/dreamer-jsr/foundry/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/dreamer-jsr/foundry/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/dreamer-jsr/foundry/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/dreamer-jsr/foundry/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/dreamer-jsr/foundry/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/dreamer-jsr/foundry/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/dreamer-jsr/foundry/compare/v1.1.0-beta.41...v1.1.0
