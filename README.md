# @dreamer/foundry

> 一个 Foundry 智能合约部署和验证工具，基于 Deno 运行时，提供完整的项目初始化和自动化部署能力

[![JSR](https://jsr.io/badges/@dreamer/foundry)](https://jsr.io/@dreamer/foundry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-104%20passed-brightgreen)](./TEST_REPORT.md)

---

## 🎯 功能

`@dreamer/foundry` 是一个专为 Foundry 项目设计的现代化智能合约部署和验证工具库。它提供了完整的项目初始化、自动化部署、合约验证等功能，基于 Deno 运行时，让智能合约开发更加高效便捷。

---

## 📦 安装

### 全局安装 CLI

安装后可以在任何地方使用 `foundry` 命令：

```bash
# 克隆或下载项目后，运行安装脚本
deno run -A jsr:@dreamer/foundry/setup

# 安装后使用
foundry init [项目名]
foundry deploy --network testnet
foundry verify --network testnet --contract MyToken
```

**卸载全局 CLI**：
```bash
deno run -A jsr:@dreamer/foundry/setup --uninstall
```

---

## 🌍 环境兼容性

| 环境 | 版本要求 | 状态 |
|------|---------|------|
| **Deno** | 2.5.0+ | ✅ 完全支持 |
| **服务端** | - | ✅ 支持（基于 Deno 运行时） |

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
- **Deno 原生支持**：
  - 基于 Deno 运行时，充分利用 Deno 的特性
  - 统一的 API 接口，简洁高效
- **项目初始化**：
  - 自动创建项目目录结构
  - 生成配置文件和模板
  - 创建示例合约和脚本

---

## 🎯 使用场景

- **智能合约开发**：快速初始化 Foundry 项目，部署和验证智能合约
- **自动化部署**：集成到 CI/CD 流程中，自动化部署和验证流程
- **多链支持**：支持 11+ 条主流区块链网络（详见下方支持链列表）
- **开发工具**：提供完整的工具函数，简化开发工作流

### 部署功能支持

**部署功能支持所有 EVM 兼容链**，包括但不限于：
- 上述 11 条链（完整支持）
- 其他 EVM 兼容链（如 Fantom、Gnosis、Celo、Moonbeam、Metis、Boba、Fuse、Cronos、Kava、Evmos 等）

对于未在验证支持列表中的链，你可以：
1. 正常部署合约（只需提供正确的 RPC URL 和 chainId）
2. 手动在对应的区块浏览器上验证合约

**注意事项**：
- 验证功能需要对应的区块浏览器 API Key（如 Etherscan、BSCScan 等）
- 配置文件中的 `chain` 字段应使用上述标识符（如 `"bsc"`, `"eth"` 等）
- 对于未列出的链，`chain` 字段可以使用任意标识符，但验证功能将不可用

---

## 🚀 快速开始

### 使用 CLI 命令

安装后可使用 `foundry` 命令，包含以下子命令：`init`、`deploy`、`verify`、`upgrade`、`uninstall`。

#### `foundry init` — 初始化项目

在当前目录或指定目录初始化 Foundry 项目结构。

```bash
# 在当前目录初始化
foundry init

# 在指定目录初始化（会创建该目录）
foundry init /path/to/project
```

| 参数 | 说明 |
|------|------|
| `projectRoot`（可选） | 项目目录。不传则在当前目录初始化；传入则创建该目录并初始化 |

---

#### `foundry deploy` — 部署合约

扫描 `deploy/` 目录下的脚本并按顺序执行部署。

```bash
# 部署所有合约到指定网络
foundry deploy --network testnet

# 部署指定合约
foundry deploy --network testnet --contract MyToken

# 部署多个合约
foundry deploy --network testnet --contract MyToken MyContract

# 强制重新部署（覆盖已存在合约，会提示确认）
foundry deploy --network testnet --force

# 部署后自动验证（需 API Key）
foundry deploy --network testnet --verify --api-key YOUR_API_KEY

# 使用环境变量 ETH_API_KEY 时可不写 --api-key
foundry deploy --network testnet --verify

# 部署指定合约并验证
foundry deploy --network testnet --contract MyToken --verify --api-key YOUR_API_KEY
```

| 选项 | 简写 | 说明 |
|------|------|------|
| `--network` | `-n` | 网络名称：`local`、`testnet`、`mainnet`。不指定时从 `.env` 的 `WEB3_ENV` 读取 |
| `--contract` | `-c` | 要部署的合约名，可写多个。不指定则按脚本部署全部 |
| `--force` | `-f` | 强制重新部署已存在的合约 |
| `--verify` | - | 部署完成后自动在区块浏览器上验证 |
| `--api-key` | - | Etherscan/BSCScan 等 API Key。验证时也可用环境变量 `ETH_API_KEY` |

---

#### `foundry verify` — 验证合约

在区块浏览器上提交合约验证（源码与链上字节码一致）。

```bash
# 使用 .env 中的 ETH_API_KEY
foundry verify --network testnet --contract MyToken

# 显式传入 API Key
foundry verify --network testnet --contract MyToken --api-key YOUR_API_KEY

# 指定合约地址（不指定则从 build/abi/{network}/{contract}.json 读）
foundry verify --network testnet --contract MyToken --address 0x1234...

# 指定 RPC 和链 ID（不指定则从 config/web3.json 读）
foundry verify --network testnet --contract MyToken --rpc-url https://... --chain-id 97
```

| 选项 | 简写 | 必填 | 说明 |
|------|------|------|------|
| `--network` | `-n` | 否 | 网络名称。不指定时从 `WEB3_ENV` 读取 |
| `--contract` | `-c` | **是** | 合约名称 |
| `--address` | `-a` | 否 | 合约地址。不传则从 `build/abi/{network}/{contract}.json` 读 |
| `--api-key` | - | 否 | 区块浏览器 API Key。不传则用环境变量 `ETH_API_KEY` |
| `--rpc-url` | - | 否 | RPC URL。不传则从 `config/web3.json` 读 |
| `--chain-id` | - | 否 | 链 ID。不传则从配置读 |

---

#### `foundry upgrade` — 升级 CLI

将本机安装的 Foundry CLI 升级到最新版本。

```bash
# 升级到最新正式版
foundry upgrade

# 升级到最新版（含 beta）
foundry upgrade --beta

# 忽略本地缓存，从 JSR 拉取版本后再升级
foundry upgrade --force
```

| 选项 | 简写 | 说明 |
|------|------|------|
| `--beta` | - | 包含 beta，升级到“最新正式版或 beta”中更高的版本 |
| `--force` | `-f` | 强制刷新版本缓存，从 JSR 重新拉取版本再比较与升级 |

---

#### `foundry uninstall` — 卸载 CLI

移除通过 `deno run -A jsr:@dreamer/foundry/setup` 安装的全局 `foundry` 命令。执行前会提示确认。

```bash
foundry uninstall
```

无参数、无选项。确认后删除当前环境中的 `foundry` 可执行文件。

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

### 示例 2：使用配置文件创建 Web3 实例

```typescript
import { createWeb3 } from "@dreamer/foundry/utils";

// 方式1：使用配置文件（自动从 config/web3.json 读取）
const web3 = createWeb3("MyContract");

// 方式2：使用配置文件并覆盖部分参数
const web3 = createWeb3("MyContract", {
  rpcUrl: "https://custom-rpc.example.com", // 覆盖配置文件中的 rpcUrl
  // 其他参数使用配置文件中的值
});

// 方式3：完全自定义配置
const web3 = createWeb3("MyContract", {
  rpcUrl: "https://rpc.example.com",
  wssUrl: "wss://rpc.example.com",
  chainId: 97,
  privateKey: "0x...",
  address: "0x...",
});
```

### 示例 3：部署单个合约

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
- `scriptDir?: string` - 部署脚本目录（默认: `./deploy`）
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

**参数**:
- `network: string` - 网络名称
- `config: NetworkConfig` - 网络配置（包含 rpcUrl, wssUrl, chainId, accounts）
- `force?: boolean` - 是否强制重新部署
- `accountIndex?: number` - 账户索引（默认: 0）

### `loadContract(contractName, network)`

从 JSON 文件加载已部署的合约信息。

**参数**:
- `contractName: string` - 合约名称
- `network: string` - 网络名称

**返回**: `ContractInfo | null`

### `deployContract(contractName, config, constructorArgs, options)`

部署单个合约。

**参数**:
- `contractName: string` - 合约名称
- `config: NetworkConfig` - 网络配置
- `constructorArgs?: string[] | Record<string, unknown>` - 构造函数参数
- `options?: DeployOptions` - 部署选项

### `loadWeb3ConfigSync(projectRoot?: string)`

同步加载 Web3 配置文件。

**参数**:
- `projectRoot?: string` - 项目根目录（可选，默认从当前目录向上查找）

**返回**: `NetworkConfig | null`

**错误**: 如果配置文件格式无效，会抛出 `ConfigurationError`

### `createWeb3(contractName?, options?)`

创建 Web3 实例的工厂函数，自动合并配置文件和 options 参数。

**参数**:
- `contractName?: string` - 合约名称（可选）
- `options?: Web3Options` - Web3 配置选项（可选，会与配置文件中的参数合并）

**返回**: `Web3` 实例

**Web3Options**:
- `rpcUrl?: string` - RPC URL
- `wssUrl?: string` - WebSocket RPC URL
- `chainId?: number` - 链 ID
- `privateKey?: string` - 私钥
- `address?: string` - 地址
- `account?: number` - 账户索引

---

## 🌐 支持的区块链网络

### 合约验证支持的网络（11 条链）

以下网络支持完整的合约验证功能（testnet 和 mainnet）：

| 链名称 | 标识符 | 测试网 | 主网 | 说明 |
|--------|--------|--------|------|------|
| **Binance Smart Chain** | `bsc` | ✅ BSC Testnet | ✅ BSC Mainnet | 币安智能链 |
| **Ethereum** | `eth` | ✅ Sepolia | ✅ Ethereum Mainnet | 以太坊主网 |
| **Polygon** | `polygon` | ✅ Amoy | ✅ Polygon Mainnet | Polygon 网络 |
| **Arbitrum** | `arbitrum` | ✅ Arbitrum Sepolia | ✅ Arbitrum One | Arbitrum L2 |
| **Base** | `base` | ✅ Base Sepolia | ✅ Base Mainnet | Coinbase L2 |
| **Optimism** | `optimism` | ✅ OP Sepolia | ✅ Optimism Mainnet | Optimism L2 |
| **Avalanche** | `avalanche` | ✅ Fuji | ✅ Avalanche C-Chain | Avalanche 网络 |
| **Linea** | `linea` | ✅ Linea Sepolia | ✅ Linea Mainnet | ConsenSys L2 |
| **Scroll** | `scroll` | ✅ Scroll Sepolia | ✅ Scroll Mainnet | Scroll L2 |
| **Mantle** | `mantle` | ✅ Mantle Testnet | ✅ Mantle Mainnet | Mantle L2 |
| **Blast** | `blast` | ✅ Blast Sepolia | ✅ Blast Mainnet | Blast L2 |

---

## 📊 测试报告

本库经过全面测试，所有 104 个测试用例均已通过，测试覆盖率达到约 50-60%。详细测试报告请查看 [TEST_REPORT.md](./TEST_REPORT.md)。

**测试统计**：
- **总测试数**: 104
- **通过**: 104 ✅
- **失败**: 0
- **忽略**: 1（需要 RPC 节点）
- **通过率**: 100% ✅
- **测试执行时间**: ~6秒
- **测试覆盖**: 所有公共 API、边界情况、错误处理、工具函数
- **测试环境**: Deno 2.6.6+

**测试类型**：
- ✅ 单元测试（97 个）
- ✅ 集成测试（18 个）
- ✅ 边界情况和错误处理测试（13 个）
- ✅ 工具函数测试（76 个）

**测试模块**：
- ✅ 项目初始化功能（18 个测试）
- ✅ 部署功能（6 个测试）
- ✅ 错误类型系统（13 个测试）
- ✅ 缓存功能（13 个测试）
- ✅ JSR 工具函数（8 个测试）
- ✅ 环境变量工具（6 个测试）
- ✅ 配置管理器（11 个测试）
- ✅ CLI 工具函数（11 个测试）
- ✅ Web3 配置加载（10 个测试）
- ✅ 部署工具函数（4 个测试）

**测试亮点**：
- ✅ 所有功能、边界情况、错误处理都有完整的测试覆盖
- ✅ 集成测试验证了端到端的完整流程
- ✅ 基于 Deno 运行时，稳定可靠
- ✅ 统一的错误处理系统（ConfigurationError, NetworkError 等）

查看完整测试报告：[TEST_REPORT.md](./TEST_REPORT.md)

---

## 📝 注意事项

- **网络配置**：使用 `init` 创建项目后，需要编辑 `config/web3.json` 配置网络和账户信息
- **配置文件格式**：配置文件使用 JSON 格式，必须包含 `chain` 和 `network` 字段，网络配置使用 `rpcUrl` 和 `wssUrl` 字段
- **环境变量**：建议复制 `.env.example` 到 `.env` 并配置必要的环境变量（如 `WEB3_ENV`、`ETH_API_KEY`）
- **私钥安全**：不要在代码中硬编码私钥，使用环境变量或配置文件
- **合约验证**：验证合约需要提供 Etherscan/BSCScan API Key
- **部署脚本目录**：部署脚本位于 `deploy/` 目录（不再是 `script/`）
- **错误处理**：项目使用统一的错误处理系统（`ConfigurationError`、`NetworkError` 等），提供详细的错误信息和上下文
- **Deno 原生**：基于 Deno 运行时，充分利用 Deno 的特性

## 📋 配置文件格式

### config/web3.json

配置文件使用 JSON 格式，结构如下：

```json
{
  "chain": "bsc",
  "network": {
    "local": {
      "chainId": 31337,
      "rpcUrl": "http://127.0.0.1:8545",
      "wssUrl": "ws://127.0.0.1:8545",
      "accounts": [
        {
          "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
          "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        }
      ]
    },
    "testnet": {
      "chainId": 97,
      "rpcUrl": "https://bsc-testnet.nodereal.io/v1/your-api-key",
      "wssUrl": "wss://bsc-testnet.nodereal.io/ws/v1/your-api-key",
      "accounts": [
        {
          "address": "your-testnet-address-here",
          "privateKey": "your-testnet-private-key-here"
        }
      ]
    },
    "mainnet": {
      "chainId": 56,
      "rpcUrl": "https://go.getblock.io/your-api-key",
      "wssUrl": "wss://go.getblock.io/your-api-key",
      "accounts": [
        {
          "address": "your-mainnet-address-here",
          "privateKey": "your-mainnet-private-key-here"
        }
      ]
    }
  }
}
```

**字段说明**：
- `chain`: 链标识符，支持的链见上方 [支持的区块链网络](#-支持的区块链网络) 列表
  - 支持的标识符：`bsc`, `eth`, `polygon`, `arbitrum`, `base`, `optimism`, `avalanche`, `linea`, `scroll`, `mantle`, `blast`
- `network`: 网络配置对象，key 为网络名称（local, testnet, mainnet）
  - `chainId`: 链 ID（如 BSC Testnet: 97, BSC Mainnet: 56, Ethereum Mainnet: 1）
  - `rpcUrl`: RPC 节点 URL（HTTP）
  - `wssUrl`: WebSocket RPC URL（可选）
  - `accounts`: 账户列表，包含地址和私钥

**环境变量**：
- `WEB3_ENV`: 指定使用的网络环境（local, testnet, mainnet），默认为 "local"

**常用链 ID 参考**：
- Local (Anvil): 31337
- BSC Testnet: 97
- BSC Mainnet: 56
- Ethereum Sepolia: 11155111
- Ethereum Mainnet: 1
- Polygon Amoy: 80002
- Polygon Mainnet: 137
- Arbitrum Sepolia: 421614
- Arbitrum One: 42161
- Base Sepolia: 84532
- Base Mainnet: 8453
- Optimism Sepolia: 11155420
- Optimism Mainnet: 10
- Avalanche Fuji: 43113
- Avalanche Mainnet: 43114

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
