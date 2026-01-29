# @dreamer/foundry

> 一个 Foundry 智能合约部署和验证工具，支持 Deno 和 Bun 运行时，提供完整的项目初始化和自动化部署能力

[![JSR](https://jsr.io/badges/@dreamer/foundry)](https://jsr.io/@dreamer/foundry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE.md)
[![Tests](https://img.shields.io/badge/tests-244%20passed-brightgreen)](./TEST_REPORT.md)
[![Coverage](https://img.shields.io/badge/coverage-80--85%25-green)](./TEST_REPORT.md)

---

## 🎯 功能

`@dreamer/foundry` 是一个专为 Foundry
项目设计的现代化智能合约部署和验证工具库。它提供了完整的项目初始化、自动化部署、合约验证等功能，**同时支持
Deno 和 Bun 运行时**，让智能合约开发更加高效便捷。

---

## 📦 安装

### 全局安装 CLI

安装后可以在任何地方使用 `foundry` 命令：

```bash
# 使用 Deno 安装全局 CLI（推荐，一次性操作）
deno run -A jsr:@dreamer/foundry/setup

# 安装后使用
foundry init [项目名]
foundry deploy --network testnet
foundry verify --network testnet -c <合约名> --api-key YOUR_API_KEY
foundry run scripts/test.ts --network local
foundry test --network local
```

> **为什么使用 Deno 安装？**
>
> - Deno 支持直接运行 `jsr:` URL，无需预先安装
> - Bun 不支持直接运行远程 URL，且 JSR 的 npm 兼容层不支持 `-g` 全局安装
> - 如果你的系统没有 Deno，可以通过 `curl -fsSL https://deno.land/install.sh | sh` 快速安装
>
> **智能运行时检测**：
>
> - 全局 CLI 本身使用 Deno 运行
> - 但执行 `foundry deploy`/`verify`/`run`/`test` 时，会**自动检测项目类型**：
>   - 项目有 `deno.json` → 使用 `deno run`/`deno test` 执行
>   - 项目只有 `package.json` → 使用 `bun run`/`bun test` 执行
> - 这样 Bun 项目也能正常使用全局 CLI

**卸载全局 CLI**：

```bash
deno run -A jsr:@dreamer/foundry/setup --uninstall
# 或使用已安装的 CLI
foundry uninstall
```

### 作为项目依赖使用

如果不需要全局 CLI，可以将包作为项目依赖使用：

**Deno 项目**：

```bash
# 在 deno.json 中添加
deno add jsr:@dreamer/foundry
```

**Bun 项目**：

```bash
# 使用 bunx jsr 添加依赖
bunx jsr add @dreamer/foundry
```

然后在代码中导入使用：

```typescript
import { deploy, verify, Web3 } from "@dreamer/foundry";
```

---

## 🌍 环境兼容性

| 环境       | 版本要求 | 状态                                     |
| ---------- | -------- | ---------------------------------------- |
| **Deno**   | 2.5.0+   | ✅ 完全支持                              |
| **Bun**    | 1.0.0+   | ✅ 支持（通过 @dreamer/runtime-adapter） |
| **服务端** | -        | ✅ 支持（Deno/Bun 运行时）               |

---

## ✨ 特性

- **核心功能**：
  - 自动扫描并执行部署脚本
  - 在 Etherscan/BSCScan 上验证合约
  - 项目初始化功能（快速创建 Foundry 项目结构）
  - 自动检测和安装 Foundry CLI
- **工具函数**：
  - 日志工具（info, warn, error）
  - 环境变量加载和验证
  - 合约加载和管理
  - Web3 客户端封装（读写合约、余额查询、事件监听等）
  - 时间同步控制（Anvil 本地链时间推进）
  - 地址验证和格式化（isAddress, toChecksumAddress, shortenAddress 等）
  - 单位转换（toWei, fromWei）
  - 哈希函数（keccak256, solidityKeccak256）
  - 十六进制转换（hexToNumber, numberToHex, hexToBytes, bytesToHex）
- **跨运行时支持**：
  - 基于 @dreamer/runtime-adapter 实现 Deno/Bun 完全兼容
  - 自动检测运行时环境，选择正确的命令执行方式
  - 统一的 API 接口，简洁高效
  - 在 Deno 和 Bun 环境下行为一致
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

| 参数                  | 说明                                                       |
| --------------------- | ---------------------------------------------------------- |
| `projectRoot`（可选） | 项目目录。不传则在当前目录初始化；传入则创建该目录并初始化 |

---

#### `foundry deploy` — 部署合约

扫描 `deploy/` 目录下的脚本并按顺序执行部署。合约名对应 `deploy/数字-<合约名>.ts`
中的「合约名」部分，由项目自行定义。

```bash
# 部署所有合约到指定网络
foundry deploy --network testnet

# 部署单个合约（-c 后接一个合约名）
foundry deploy --network testnet -c <MyToken>

# 部署多个合约（-c 后接多个合约名，空格分隔）
foundry deploy --network testnet -c <合约名1> <合约名2> <合约名3>

# 强制重新部署（覆盖已存在合约，会提示确认）
foundry deploy --network testnet --force

# 部署后自动验证（需 API Key）
foundry deploy --network testnet --verify --api-key YOUR_API_KEY

# 使用环境变量 ETH_API_KEY 时可不写 --api-key
foundry deploy --network testnet --verify

# 部署指定多个合约并验证
foundry deploy --network testnet -c <合约名1> <合约名2> --verify --api-key YOUR_API_KEY
```

| 选项         | 简写 | 说明                                                                          |
| ------------ | ---- | ----------------------------------------------------------------------------- |
| `--network`  | `-n` | 网络名称：`local`、`testnet`、`mainnet`。不指定时从 `.env` 的 `WEB3_ENV` 读取 |
| `--contract` | `-c` | 要部署的合约名，可写多个（空格分隔）。不指定则按脚本顺序部署全部              |
| `--force`    | `-f` | 强制重新部署已存在的合约                                                      |
| `--verify`   | -    | 部署完成后自动在区块浏览器上验证                                              |
| `--api-key`  | -    | Etherscan/BSCScan 等 API Key。验证时也可用环境变量 `ETH_API_KEY`              |

---

#### `foundry verify` — 验证合约

在区块浏览器上提交合约验证（源码与链上字节码一致）。支持一次验证多个合约。

```bash
# 验证单个合约（使用 .env 中的 ETH_API_KEY）
foundry verify --network testnet -c <合约名>

# 验证多个合约（-c 后接多个合约名，空格分隔）
foundry verify --network testnet -c <合约名1> <合约名2> --api-key YOUR_API_KEY

# 指定合约地址（仅单合约时有效；不指定则从 build/abi/{network}/{合约名}.json 读）
foundry verify --network testnet -c <合约名> --address 0x... --api-key YOUR_API_KEY

# 指定 RPC 和链 ID（不指定则从 config/web3.json 读）
foundry verify --network testnet -c <合约名> --rpc-url https://... --chain-id 97 --api-key YOUR_API_KEY
```

| 选项         | 简写 | 必填   | 说明                                                                            |
| ------------ | ---- | ------ | ------------------------------------------------------------------------------- |
| `--network`  | `-n` | 否     | 网络名称。不指定时从 `WEB3_ENV` 读取                                            |
| `--contract` | `-c` | **是** | 合约名称，可写多个（空格分隔），一次验证多份合约                                |
| `--address`  | `-a` | 否     | 合约地址（仅验证单合约时有效）。不传则从 `build/abi/{network}/{合约名}.json` 读 |
| `--api-key`  | -    | 否     | 区块浏览器 API Key。不传则用环境变量 `ETH_API_KEY`                              |
| `--rpc-url`  | -    | 否     | RPC URL。不传则从 `config/web3.json` 读                                         |
| `--chain-id` | -    | 否     | 链 ID。不传则从配置读                                                           |

---

#### `foundry run` — 执行脚本

执行 TypeScript 脚本，自动传递网络环境变量。适用于执行测试脚本、交互脚本等。

```bash
# 执行脚本
foundry run scripts/test.ts

# 指定网络执行（自动设置 WEB3_ENV 环境变量）
foundry run scripts/test.ts --network local
foundry run scripts/test.ts -n testnet

# 传递额外参数给脚本
foundry run scripts/test.ts -n local arg1 arg2
```

| 选项        | 简写 | 必填   | 说明                                   |
| ----------- | ---- | ------ | -------------------------------------- |
| `<script>`  | -    | **是** | 脚本路径（相对于项目根目录或绝对路径） |
| `--network` | `-n` | 否     | 网络名称。不指定时从 `WEB3_ENV` 读取   |

脚本中可以通过 `getEnv("WEB3_ENV")` 获取网络名称：

```typescript
import { getEnv } from "@dreamer/runtime-adapter";

const network = getEnv("WEB3_ENV"); // 获取 CLI 传入的网络名称
console.log(`当前网络: ${network}`);
```

---

#### `foundry test` — 运行测试

运行项目测试，自动检测运行时（Deno/Bun）并使用对应的测试命令。

```bash
# 运行所有测试
foundry test

# 指定网络（自动设置 WEB3_ENV 环境变量）
foundry test --network local
foundry test -n testnet

# 过滤测试（按名称匹配）
foundry test --filter "deploy"
foundry test -f "Web3"

# 监听模式（文件变化时自动重新运行）
foundry test --watch
foundry test -w

# 生成代码覆盖率报告（仅 Deno）
foundry test --coverage

# 指定测试文件
foundry test tests/deploy.test.ts

# 设置并发数（仅 Bun）
foundry test -j 4
foundry test --concurrency 2

# 组合使用
foundry test -n local -f "deploy" -w
```

| 选项            | 简写 | 说明                                         |
| --------------- | ---- | -------------------------------------------- |
| `--network`     | `-n` | 网络名称。不指定时从 `WEB3_ENV` 读取         |
| `--filter`      | `-f` | 过滤测试名称（正则表达式匹配）               |
| `--watch`       | `-w` | 监听文件变化并重新运行测试                   |
| `--coverage`    | -    | 生成代码覆盖率报告（仅 Deno 支持）           |
| `--concurrency` | `-j` | 最大并发数（仅 Bun 支持，默认为 CPU 核心数） |

**运行时自动检测**：
- 项目有 `deno.json` → 使用 `deno test -A`
- 项目只有 `package.json` → 使用 `bun test`

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

| 选项      | 简写 | 说明                                              |
| --------- | ---- | ------------------------------------------------- |
| `--beta`  | -    | 包含 beta，升级到“最新正式版或 beta”中更高的版本  |
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

以下示例中的合约名可替换为项目 `deploy/`、`build/abi/` 中对应的实际合约名。

```typescript
import { loadContract, loadEnv, logger, Web3 } from "@dreamer/foundry/utils";

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

### 示例 2：使用时间工具（Anvil 本地链）

在本地 Anvil 网络中推进或同步区块链时间（需 `WEB3_ENV=local`）：

```typescript
import { advanceTime, getAnvilTimestamp, syncAnvilTime } from "@dreamer/foundry/utils";

// 获取当前链上时间戳
const ts = await getAnvilTimestamp();
if (ts) console.log("当前区块时间戳:", ts.toString());

// 将链时间同步到系统时间（东 8 区）
await syncAnvilTime();

// 按天推进时间（内部会 evm_increaseTime + evm_mine）
await advanceTime(1); // 推进 1 天
await advanceTime(7); // 推进 1 周
```

推进链上时间后，合约内依赖 `block.timestamp` 的逻辑会在下次调用时使用新的区块时间。

### 示例 3：使用配置文件创建 Web3 实例

合约名使用项目中的实际合约名（对应 `build/abi/{network}/<合约名>.json`）。

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

### 示例 4：部署脚本

部署脚本放在 `deploy/` 目录，文件名为 `数字-合约名.ts`（如 `1-mytoken.ts`、`2-store.ts`
等，合约名由项目自定）。脚本需导出 `deploy(deployer)`，框架会注入部署器并执行。以下以 init
生成的代币合约为例，实际项目中可将合约名、文件名替换为你的合约。

```typescript
// deploy/1-mytoken.ts
import type { Deployer } from "@dreamer/foundry";
import { logger } from "@dreamer/foundry";

export async function deploy(deployer: Deployer) {
  logger.info("开始部署 MyToken 合约\n");

  // 构造函数参数: name, symbol, decimals, initialSupply
  const args = ["MyToken", "MTK", "18", "1000000"];

  const myToken = await deployer.deploy("MyToken", args);
  logger.info(`✅ MyToken deployed at: ${myToken.address}`);

  // 也可用 deployer.logger
  deployer.logger.info("\n✅ Deployment completed!");
}
```

执行方式：使用 CLI `foundry deploy --network local`，或在代码中调用
`deploy({ network, config, ... })`。

### 示例 5：测试脚本

测试脚本放在 `tests/` 目录，使用 `@dreamer/test` 与 `@dreamer/foundry` 的 `createWeb3`、`Web3`
等与链上合约交互。以下以 init 生成的 MyToken 为例，合约名替换为项目中实际部署的合约名即可。

```typescript
// tests/01-mytoken.test.ts
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { createWeb3, logger, type Web3 } from "@dreamer/foundry";

describe("MyToken 合约测试", () => {
  let web3: Web3;
  let deployerAddress: string;

  beforeAll(() => {
    web3 = createWeb3("MyToken");
    deployerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  });

  afterAll(() => {
    logger.info("测试完成");
  });

  describe("合约基本信息", () => {
    it("应该能够读取代币名称", async () => {
      const name = await web3.read("name");
      expect(name).toBe("MyToken");
    });

    it("应该能够读取代币符号", async () => {
      const symbol = await web3.read("symbol");
      expect(symbol).toBe("MTK");
    });
  });

  describe("余额查询", () => {
    it("应该能够查询部署者余额", async () => {
      const balance = await web3.read("balanceOf", [deployerAddress]);
      expect(balance).toBeDefined();
      expect(Number(balance)).toBeGreaterThan(0);
    });
  });
});
```

**执行方式**：

```bash
# Deno 环境
WEB3_ENV=local deno test -A tests/01-mytoken.test.ts

# Bun 环境
WEB3_ENV=local bun test tests/01-mytoken.test.ts
```

更多测试相关的文档与用法，请查看 [@dreamer/test](https://jsr.io/@dreamer/test)。

---

## 📚 API 文档

以下为通过 `import` 调用的程序化 API，供在脚本或应用中直接使用。CLI 子命令用法见上文「使用 CLI
命令」。

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

### `createDeployer(network, config, force?)`

创建部署器实例，供部署脚本中调用（如 `deploy/1-mytoken.ts` 由框架注入的 `Deployer`
即由此构建）。注入的 `Deployer` 包含
`network`、`accounts`、`deploy`、`logger`、`web3`、`loadContract`。

**参数**:

- `network: string` - 网络名称
- `config: NetworkConfig` - 网络配置（包含 rpcUrl, wssUrl, chainId, accounts）
- `force?: boolean` - 是否强制重新部署（默认: `false`）

### `loadContract(contractName, network)`

从 JSON 文件加载已部署的合约信息。

**参数**:

- `contractName: string` - 合约名称
- `network: string` - 网络名称

**返回**: `ContractInfo | null`

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

### utils/web3 — Web3 工具函数

提供常用的 Web3 工具函数，从 `@dreamer/web3` 重新导出。

**引入方式**：

```typescript
import {
  // 十六进制转换
  addHexPrefix,
  bytesToHex,
  checkAddressChecksum,
  // 其他
  computeContractAddress,
  encodeFunctionCall,
  formatAddress,
  fromWei,
  generateWallet,
  getCode,
  getFunctionSelector,
  hexToBytes,
  hexToNumber,
  // 地址验证
  isAddress,
  isPrivateKey,
  isTxHash,
  // 哈希函数
  keccak256,
  numberToHex,
  // 填充函数
  padLeft,
  padRight,
  shortenAddress,
  solidityKeccak256,
  stripHexPrefix,
  // 地址格式化
  toChecksumAddress,
  // 单位转换
  toWei,
} from "@dreamer/foundry/utils";
```

#### 地址验证函数

```typescript
// 验证以太坊地址格式
isAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // true
isAddress("invalid"); // false

// 验证私钥格式
isPrivateKey("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"); // true

// 验证交易哈希格式
isTxHash("0x1234..."); // true/false
```

#### 地址格式化函数

```typescript
// 转换为校验和地址
toChecksumAddress("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
// => "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

// 缩短地址显示
shortenAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
// => "0xf39F...2266"

// 格式化地址（小写 + 0x 前缀）
formatAddress("F39FD6E51AAD88F6F4CE6AB8827279CFFFB92266");
// => "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
```

#### 单位转换函数

```typescript
// 将 ether 转换为 wei
toWei("1"); // => "1000000000000000000"
toWei("0.5"); // => "500000000000000000"

// 将 wei 转换为 ether
fromWei("1000000000000000000"); // => "1"
```

#### 哈希函数

```typescript
// 计算 keccak256 哈希
await keccak256("hello"); // => "0x1c8aff..."

// Solidity 风格的 keccak256
solidityKeccak256(["address", "uint256"], ["0x...", 100]);
```

---

### utils/time — 时间工具（Anvil 本地链）

用于在本地 Anvil 网络中推进或同步区块链时间，无需改系统时间或重启容器。合约内依赖 `block.timestamp`
的逻辑会在推进后下次调用时读到新的区块时间。**仅当 `WEB3_ENV=local` 时生效**，网络配置与 RPC 来自
`loadWeb3ConfigSync()`（即项目中的 `config/web3.json`）。

**引入方式**：

```typescript
import {
  advanceAnvilTime,
  advanceTime,
  getAnvilTimestamp,
  syncAnvilTime,
} from "@dreamer/foundry/utils";
// 或按子路径
import {
  advanceAnvilTime,
  advanceTime,
  getAnvilTimestamp,
  syncAnvilTime,
} from "@dreamer/foundry/utils/time";
```

#### `getAnvilTimestamp(): Promise<bigint | null>`

获取当前 Anvil 链上最新区块的时间戳（秒）。

**返回**：时间戳（秒）的 `bigint`，失败时为 `null`。

**示例**：

```typescript
const ts = await getAnvilTimestamp();
if (ts) console.log("区块时间戳(秒):", ts.toString());
```

#### `syncAnvilTime(silent?: boolean): Promise<boolean>`

将 Anvil 链时间设置为「当前系统时间（东 8 区 UTC+8）」；内部会调 `evm_setTime` 并 `evm_mine`
一次使时间生效。

**参数**：

- `silent?: boolean` - 为 `true` 时不打 info 日志，仅保留错误信息，默认 `false`。

**返回**：成功为 `true`，失败或非 local 网络为 `false`。

**示例**：

```typescript
await syncAnvilTime(); // 同步并输出日志
await syncAnvilTime(true); // 静默同步
```

#### `advanceAnvilTime(seconds: number, silent?: boolean): Promise<boolean>`

按秒数推进 Anvil 链时间（内部使用 `evm_increaseTime` + `evm_mine`）。

**参数**：

- `seconds: number` - 要推进的秒数（建议用合理间隔，如天、周、月）。
- `silent?: boolean` - 为 `true` 时不输出「推进中」「已推进」等 info 日志，默认 `false`。

**返回**：成功为 `true`，否则为 `false`。

**示例**：

```typescript
await advanceAnvilTime(86400); // 推进 1 天
await advanceAnvilTime(86400, true); // 推进 1 天且静默（适合循环里逐日推进）
```

#### `advanceTime(days?: number): Promise<boolean>`

按「天」推进链时间，内部换算为秒后调用 `advanceAnvilTime`。

**参数**：

- `days?: number` - 要推进的天数，可为小数（如 `0.5` 表示 12 小时），默认 `1`。

**返回**：成功为 `true`，否则为 `false`。

**示例**：

```typescript
await advanceTime(1); // 推进 1 天
await advanceTime(7); // 推进 1 周
await advanceTime(30); // 推进约 1 个月
await advanceTime(365); // 推进 1 年
```

**使用说明**：

- 仅在 `WEB3_ENV=local` 且对应 RPC 为 Anvil 时有意义；testnet/mainnet 下会直接返回 `false`
  并打警告。
- 推进链上时间后，合约内依赖 `block.timestamp` 的逻辑会在下次调用时使用新的区块时间。

---

## 🌐 支持的区块链网络

### 合约验证支持的网络（11 条链）

以下网络支持完整的合约验证功能（testnet 和 mainnet）：

| 链名称                  | 标识符      | 测试网              | 主网                 | 说明           |
| ----------------------- | ----------- | ------------------- | -------------------- | -------------- |
| **Binance Smart Chain** | `bsc`       | ✅ BSC Testnet      | ✅ BSC Mainnet       | 币安智能链     |
| **Ethereum**            | `eth`       | ✅ Sepolia          | ✅ Ethereum Mainnet  | 以太坊主网     |
| **Polygon**             | `polygon`   | ✅ Amoy             | ✅ Polygon Mainnet   | Polygon 网络   |
| **Arbitrum**            | `arbitrum`  | ✅ Arbitrum Sepolia | ✅ Arbitrum One      | Arbitrum L2    |
| **Base**                | `base`      | ✅ Base Sepolia     | ✅ Base Mainnet      | Coinbase L2    |
| **Optimism**            | `optimism`  | ✅ OP Sepolia       | ✅ Optimism Mainnet  | Optimism L2    |
| **Avalanche**           | `avalanche` | ✅ Fuji             | ✅ Avalanche C-Chain | Avalanche 网络 |
| **Linea**               | `linea`     | ✅ Linea Sepolia    | ✅ Linea Mainnet     | ConsenSys L2   |
| **Scroll**              | `scroll`    | ✅ Scroll Sepolia   | ✅ Scroll Mainnet    | Scroll L2      |
| **Mantle**              | `mantle`    | ✅ Mantle Testnet   | ✅ Mantle Mainnet    | Mantle L2      |
| **Blast**               | `blast`     | ✅ Blast Sepolia    | ✅ Blast Mainnet     | Blast L2       |

---

## 📊 测试报告

本库经过全面测试，247 个测试用例中 244 个通过，测试覆盖率达到约 80-85%。详细测试报告请查看
[TEST_REPORT.md](./TEST_REPORT.md)。

**测试统计**：

- **总测试数**: 247
- **通过**: 244 ✅
- **失败**: 0
- **忽略**: 3（需要特殊环境）
- **通过率**: 98.8% ✅
- **测试执行时间**: ~17-23秒
- **测试覆盖**: 所有公共 API、边界情况、错误处理、工具函数
- **测试环境**: Deno 2.6.6+ / Anvil 本地节点

**测试模块**（17 个测试文件）：

| 模块               | 测试数 | 说明                     |
| ------------------ | ------ | ------------------------ |
| CLI 命令测试       | 27     | 命令行参数解析、命令识别 |
| Web3 工具函数测试  | 32     | 地址验证、单位转换、哈希 |
| CLI 工具函数测试   | 25     | 配置获取、路径解析       |
| 验证功能测试       | 20     | 合约验证参数、网络配置   |
| 项目初始化测试     | 18     | 目录创建、文件生成       |
| 部署工具函数测试   | 18     | 合约加载、敏感信息过滤   |
| Anvil 时间工具测试 | 16     | 时间同步、时间推进       |
| 缓存功能测试       | 13     | 读写缓存、版本管理       |
| 错误类型测试       | 13     | 错误类继承、上下文信息   |
| Foundry 安装测试   | 12     | 路径查找、自动安装       |
| 配置管理器测试     | 11     | 单例模式、配置加载       |
| Web3 配置加载测试  | 10     | 配置文件、工厂函数       |
| JSR 工具函数测试   | 8      | URL 解析、版本提取       |
| 合约工具测试       | 7      | 合约加载、数据验证       |
| 环境变量工具测试   | 6      | 加载验证、格式处理       |
| 部署功能测试       | 6      | 部署器创建、工具函数     |
| 工具函数测试       | 5      | Logger、合约加载         |

**测试亮点**：

- ✅ 所有功能、边界情况、错误处理都有完整的测试覆盖
- ✅ 集成测试验证了端到端的完整流程
- ✅ 支持 Anvil 本地节点的 RPC 测试
- ✅ 统一的错误处理系统（ConfigurationError, NetworkError 等）
- ✅ 跨运行时兼容性测试（Deno/Bun）

查看完整测试报告：[TEST_REPORT.md](./TEST_REPORT.md)

---

## 📝 注意事项

- **网络配置**：使用 `init` 创建项目后，需要编辑 `config/web3.json` 配置网络和账户信息
- **配置文件格式**：配置文件使用 JSON 格式，必须包含 `chain` 和 `network` 字段，网络配置使用
  `rpcUrl` 和 `wssUrl` 字段
- **环境变量**：建议复制 `.env.example` 到 `.env` 并配置必要的环境变量（如
  `WEB3_ENV`、`ETH_API_KEY`）
- **私钥安全**：不要在代码中硬编码私钥，使用环境变量或配置文件
- **合约验证**：验证合约需要提供 Etherscan/BSCScan API Key
- **部署脚本目录**：部署脚本位于 `deploy/` 目录（不再是 `script/`）
- **错误处理**：项目使用统一的错误处理系统（`ConfigurationError`、`NetworkError`
  等），提供详细的错误信息和上下文
- **跨运行时兼容**：基于 @dreamer/runtime-adapter 实现 Deno/Bun 完全兼容，自动检测运行时环境
- **Foundry 依赖**：CLI 命令会自动检测 Foundry 是否安装，未安装时会提示自动安装
- **测试配置**：运行测试需要 `config/web3.json` 配置文件和 Anvil 本地节点
- **Bun 使用**：在 Bun 项目中，CLI 会自动检测并使用 `bun` 执行脚本；全局 CLI 安装推荐使用
  Deno（一次性操作），安装后可在任何项目中使用

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
  - 支持的标识符：`bsc`, `eth`, `polygon`, `arbitrum`, `base`, `optimism`, `avalanche`, `linea`,
    `scroll`, `mantle`, `blast`
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
