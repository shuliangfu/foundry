# @dreamer/foundry

> 一个 Foundry 智能合约部署和验证工具，支持 Deno 和 Bun 运行时，提供完整的项目初始化和自动化部署能力

[![JSR](https://jsr.io/badges/@dreamer/foundry)](https://jsr.io/@dreamer/foundry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-29%20passed-brightgreen)](./TEST_REPORT.md)

---

## 🎯 功能

`@dreamer/foundry` 是一个专为 Foundry 项目设计的现代化智能合约部署和验证工具库。它提供了完整的项目初始化、自动化部署、合约验证等功能，完美支持 Deno 和 Bun 运行时，让智能合约开发更加高效便捷。

---

## 📦 安装

### 方式一：作为库使用（推荐用于项目）

#### Deno

```bash
deno add jsr:@dreamer/foundry
```

#### Bun

```bash
bunx jsr add @dreamer/foundry
```

### 方式二：全局安装 CLI（推荐用于命令行工具）

安装后可以在任何地方使用 `foundry` 命令：

```bash
# 克隆或下载项目后，运行安装脚本
deno run -A jsr:@dreamer/foundry/setup.ts

# 安装后使用
foundry deploy --network testnet
foundry verify --network testnet --contract MyToken
```

**卸载全局 CLI**：
```bash
deno run -A setup.ts --uninstall
```

---

## 🌍 环境兼容性

| 环境 | 版本要求 | 状态 |
|------|---------|------|
| **Deno** | 2.5.0+ | ✅ 完全支持 |
| **Bun** | 1.3.0+ | ✅ 完全支持 |
| **服务端** | - | ✅ 支持（兼容 Deno 和 Bun 运行时） |

---

## ✨ 特性

- **核心功能**：
  - 自动扫描并执行部署脚本
  - 在 Etherscan/BSCScan 上验证合约
  - 项目初始化功能（快速创建 Foundry 项目结构）
- **工具函数**：
  - 日志工具（info, warn, error）
  - 环境变量加载和验证
  - 合约加载和管理
  - Web3 客户端封装
  - 时间同步控制
- **跨运行时支持**：
  - 使用 `@dreamer/runtime-adapter` 兼容 Deno 和 Bun
  - 统一的 API 接口，无需关心运行时差异
- **项目初始化**：
  - 自动创建项目目录结构
  - 生成配置文件和模板
  - 创建示例合约和脚本

---

## 🎯 使用场景

- **智能合约开发**：快速初始化 Foundry 项目，部署和验证智能合约
- **自动化部署**：集成到 CI/CD 流程中，自动化部署和验证流程
- **多链支持**：支持 Ethereum、BSC 等多个区块链网络
- **开发工具**：提供完整的工具函数，简化开发工作流

---

## 🚀 快速开始

### 安装全局 CLI 命令

```bash
# 克隆或下载项目后，运行安装脚本
deno run -A src/setup.ts

# 安装后可以在任何地方使用 foundry 命令
```

**卸载全局 CLI**：
```bash
deno run -A src/setup.ts --uninstall
```

### 使用 CLI 命令

#### 初始化项目

```bash
# 在当前目录初始化项目
foundry init

# 或在指定目录初始化
foundry init /path/to/project
```

#### 部署合约

```bash
# 部署所有合约到测试网
foundry deploy --network testnet

# 部署指定合约
foundry deploy --network testnet --contract MyToken

# 部署多个合约
foundry deploy --network testnet --contract MyToken MyContract

# 强制重新部署
foundry deploy --network testnet --contract MyToken --force
```

#### 验证合约

```bash
# 验证合约（从 .env 读取 ETH_API_KEY）
foundry verify --network testnet --contract MyToken

# 或指定 API Key
foundry verify --network testnet --contract MyToken --api-key YOUR_API_KEY

# 指定合约地址
foundry verify --network testnet --contract MyToken --address 0x1234...
```

---

## 🎨 使用示例

### 示例 1：使用工具函数

```typescript
import { logger, loadEnv, loadContract, Web3 } from "@dreamer/foundry/utils";

// 日志工具
logger.info("正在部署合约...");
logger.warn("警告信息");
logger.error("错误信息");

// 环境变量
const env = await loadEnv();

// 加载合约
const contract = loadContract("MyContract", "testnet");
console.log(contract.address);

// Web3 客户端
const web3 = new Web3("MyContract", {
  rpcUrl: "https://rpc.example.com",
  chainId: 97,
  privateKey: "0x...",
  address: "0x...",
});

const balance = await web3.read("balanceOf", ["0x..."]);
```

### 示例 2：部署单个合约

```typescript
import { deployContract } from "@dreamer/foundry/utils";

const address = await deployContract(
  "MyContract",
  {
    rpcUrl: "https://rpc.example.com",
    privateKey: "0x...",
    address: "0x...",
    chainId: 97,
  },
  ["arg1", "arg2"],
  {
    verify: true,
    etherscanApiKey: "your-api-key",
  }
);
```

---

## 📚 API 文档

### `init(projectRoot?: string)`

初始化一个新的 Foundry 项目。

**参数**:
- `projectRoot?: string` - 项目根目录，默认为当前工作目录

**示例**:
```typescript
await init();
await init("/path/to/project");
```

### `deploy(options: DeployScriptOptions)`

主部署函数，扫描并执行部署脚本。

**选项**:
- `scriptDir?: string` - 部署脚本目录（默认: `./script`）
- `network: string` - 网络名称
- `config: NetworkConfig` - 网络配置
- `force?: boolean` - 强制重新部署（默认: `false`）
- `contracts?: string[]` - 要部署的特定合约列表（默认: 全部）
- `web3?: Web3Options` - Web3 配置选项（用于创建 Web3 实例）
  - `wssUrl?: string` - WebSocket RPC URL（可选）
  - `chainId?: number` - 链 ID（可选，会从 config 中继承）

### `verify(options: VerifyOptions)`

在 Etherscan/BSCScan 上验证已部署的合约。

**选项**:
- `address: string` - 合约地址
- `contractName: string` - 合约名称
- `network: string` - 网络名称（sepolia, mainnet, testnet, bsc_testnet, bsc）
- `apiKey: string` - Etherscan/BSCScan API Key
- `rpcUrl: string` - RPC URL
- `constructorArgs?: string[]` - 构造函数参数
- `chainId?: number` - 链 ID

### `createDeployer(network, config, force, accountIndex)`

创建部署器实例，用于部署脚本中。

### `loadContract(contractName, network)`

从 JSON 文件加载已部署的合约信息。

### `deployContract(contractName, config, constructorArgs, options)`

部署单个合约。

---

## 📊 测试报告

本库经过全面测试，所有 29 个测试用例均已通过，测试覆盖率达到 100%。详细测试报告请查看 [TEST_REPORT.md](./TEST_REPORT.md)。

**测试统计**：
- **总测试数**: 29
- **通过**: 29 ✅
- **失败**: 0
- **通过率**: 100% ✅
- **测试执行时间**: ~0.89秒（Deno 环境），~0.75秒（Bun 环境）
- **测试覆盖**: 所有公共 API、边界情况、错误处理
- **测试环境**: Deno 2.6.6, Bun 1.3.5

**测试类型**：
- ✅ 单元测试（29 个）
- ✅ 集成测试（18 个）
- ✅ 边界情况和错误处理测试（6 个）

**测试亮点**：
- ✅ 所有功能、边界情况、错误处理都有完整的测试覆盖
- ✅ 集成测试验证了端到端的完整流程
- ✅ 跨运行时兼容性测试通过（Deno 和 Bun）

查看完整测试报告：[TEST_REPORT.md](./TEST_REPORT.md)

---

## 📝 注意事项

- **网络配置**：使用 `init` 创建项目后，需要编辑 `config/web3.ts` 配置网络和账户信息
- **环境变量**：建议复制 `.env.example` 到 `.env` 并配置必要的环境变量
- **私钥安全**：不要在代码中硬编码私钥，使用环境变量或配置文件
- **合约验证**：验证合约需要提供 Etherscan/BSCScan API Key
- **跨运行时**：所有代码使用 `@dreamer/runtime-adapter`，确保 Deno 和 Bun 兼容性

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License - 详见 [LICENSE.md](./LICENSE.md)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
