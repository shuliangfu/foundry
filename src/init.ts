/**
 * @title Foundry Project Initializer
 * @description 初始化 Foundry 项目，创建目录结构和配置文件
 * 参照 hashmarket 项目结构
 */

import {
  basename,
  cwd,
  dirname,
  existsSync,
  exit,
  isAbsolute,
  join,
  mkdir,
  readdir,
  readStdin,
  remove,
  resolve,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { logger } from "./utils/logger.ts";

/**
 * Foundry 配置文件内容
 */
const FOUNDRY_TOML = `[profile.default]
# 目录配置
src = "src"
test = "test"
script = "script"
out = "build/out"
cache_path = "build/cache"
broadcast = "broadcast"

# 库目录配置（如果需要使用外部库，取消注释并安装）
# libs = ["lib"]

# 编译器配置
# 注意：Uniswap V2 使用 Solidity 0.5.16 和 0.6.6，项目使用 0.8.18
# 启用自动检测 Solidity 版本，Foundry 会自动下载并使用对应的编译器版本
auto_detect_solc = true  # 自动检测并下载需要的 Solidity 版本
solc_version = "0.8.18"  # 默认版本（用于项目自己的合约，如果 auto_detect_solc 为 false）
evm_version = "shanghai"  # EVM 版本：london, berlin, shanghai, cancun 等
optimizer = true          # 启用优化器
optimizer_runs = 200      # 优化器运行次数（影响代码大小 vs gas 成本）

# 导入路径配置
auto_detect_remappings = true  # 自动检测 remapping

# 编译选项
cache = true              # 启用编译缓存
extra_output = ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
build_info = true         # 生成构建信息（用于验证）

# 测试配置
fuzz = { runs = 256 }     # Fuzz 测试运行次数
invariant = { runs = 256 } # 不变性测试运行次数

# 性能配置
# jobs = 0               # 并行编译任务数（某些版本不支持，使用默认值）

# 代码检查
[lint]
lint_on_build = true      # 编译时进行 lint 检查

# See more config options: https://github.com/foundry-rs/foundry/blob/master/crates/config/README.md#all-options
# 完整配置说明请查看: FOUNDRY_CONFIG.md

# 注意：rpc_url 和 chain_id 不是 foundry.toml 的有效配置项
# 这些配置仅用于文档说明，实际部署时通过命令行参数或环境变量传递
#
# 本地测试网络（Anvil）：
#   RPC URL: http://127.0.0.1:8545
#   Chain ID: 31337
#
# 测试网（BSC Testnet）：
#   RPC URL: https://bsc-testnet.nodereal.io/v1/3d9db4b759454a22b901cb13630f9294
#   Chain ID: 97
`;

/**
 * .gitignore 文件内容
 */
const GITIGNORE = `# Foundry 构建输出
build/out/
build/cache/

# Foundry 测试覆盖率
coverage/
coverage.json

# 环境变量文件
.env
.env.local
*.env

# IDE 文件
.vscode/
.idea/
.DS_Store

# Foundry 依赖库（通过 forge install 管理）
/lib/

# Deno 缓存和依赖
.deno/
deno.lock
node_modules/

# 日志文件
*.log

# 测试相关
tests/data/
`;

/**
 * .env.example 文件内容
 */
const ENV_EXAMPLE = `# ============================================
# Foundry 项目环境变量配置
# ============================================

# ============================================
# 网络环境配置
# ============================================
# 注意：PRIVATE_KEY 和 RPC_URL 配置在 config/web3.ts 中
# 根据 WEB3_ENV 环境变量自动选择对应的配置
# 可选值: local, testnet, mainnet
WEB3_ENV=local

# ============================================
# 合约验证配置（可选，用于 verify.ts）
# ============================================

# Etherscan/BSCScan/Polygonscan API Key
# 用于合约验证，可以从以下地址获取：
#   - Etherscan: https://etherscan.io/apis
#   - BSCScan: https://bscscan.com/apis
#   - Polygonscan: https://polygonscan.com/apis
ETH_API_KEY=your-api-key-here
`;

/**
 * .env 文件内容（实际使用的环境变量文件）
 */
const ENV_FILE = `# ============================================
# Foundry 项目环境变量配置
# ============================================

# ============================================
# 网络环境配置
# ============================================
# 注意：PRIVATE_KEY 和 RPC_URL 配置在 config/web3.ts 中
# 根据 WEB3_ENV 环境变量自动选择对应的配置
# 可选值: local, testnet, mainnet
WEB3_ENV=local

# ============================================
# 合约验证配置（可选，用于 verify.ts）
# ============================================

# Etherscan/BSCScan/Polygonscan API Key
# 用于合约验证，可以从以下地址获取：
#   - Etherscan: https://etherscan.io/apis
#   - BSCScan: https://bscscan.com/apis
#   - Polygonscan: https://polygonscan.com/apis
ETH_API_KEY=your-api-key-here
`;

/**
 * .prettierrc 文件内容
 */
const PRETTIERRC = `{
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "singleQuote": false,
  "bracketSpacing": true,
  "arrowParens": "always"
}
`;

/**
 * .cursorignore 文件内容
 */
const CURSORIGNORE = `# Deno 相关
.deno/
deno.lock
*.so
*.dylib
*.dll

# 依赖
node_modules/
.npm/
.pnpm-store/

# 构建输出
dist/
build/
out/
.next/
.nuxt/
.cache/
runtime/

# 测试覆盖率
coverage/
.nyc_output/
*.lcov

# 日志文件
*.log
*.log.*
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# 环境变量
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test

# IDE 和编辑器
.vscode/
.cursor/
.idea/
*.swp
*.swo
*~
.project
.classpath
.settings/
*.sublime-project
*.sublime-workspace

# 系统文件
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
Desktop.ini

# 临时文件和缓存
tmp/
temp/
*.tmp
*.temp
.cache/
.tmp/
*.pid
*.seed
*.pid.lock

# 测试相关
.test/
test-results/
playwright-report/
test-results/

# 文档生成
docs/_build/
site/

# 其他
*.pem
*.key
*.cert
*.crt
*.p12
*.pfx
`;

/**
 * deno.json 模板内容
 */
const DENO_JSON_TEMPLATE = `{
  "version": "1.0.0",
  "license": "MIT",
  "tasks": {
    "build": "forge build",
    "test": "forge test",
    "deploy": "deno run -A deploy.ts"
  },
  "imports": {
    "@dreamer/foundry": "jsr:@dreamer/foundry@^1.0.0",
		"@dreamer/test": "jsr:@dreamer/test@1.0.0-beta.23"
  },
  "nodeModulesDir": "auto",
  "fmt": {
    "files": {
      "include": ["**/*.ts", "**/*.js"]
    },
    "options": {
      "indentWidth": 2,
      "lineWidth": 100,
      "useTabs": false
    }
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "exclude": ["no-explicit-any"]
    },
    "files": {
      "include": ["scripts/**/*.ts"]
    }
  },
  "compilerOptions": {
    "lib": ["deno.window"],
    "strict": true,
    "noImplicitAny": false
  }
}
`;

/**
 * config/web3.ts 模板内容
 */
const CONFIG_WEB3_TS = `import { loadEnv } from "../utils/env.ts";

/**
 * 网络配置类型
 */
export interface NetworkConfig {
  chainId: number;
  host: string;
  wss: string;
  accounts: Array<{
    address: string;
    privateKey: string;
  }>;
}

export const Web3Config = {
  local: {
    chainId: 31337, // Anvil 默认 chain ID
    host: "http://127.0.0.1:8545",
    wss: "ws://127.0.0.1:8545",
    accounts: [
      {
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      },
    ],
  },
  testnet: {
    chainId: 97,
    host: "https://bsc-testnet.nodereal.io/v1/your-api-key",
    wss: "wss://bsc-testnet.nodereal.io/ws/v1/your-api-key",
    accounts: [
      {
        "address": "your-testnet-address-here",
        "privateKey": "your-testnet-private-key-here",
      },
    ],
  },
  mainnet: {
    chainId: 56,
    host: "https://go.getblock.io/your-api-key",
    wss: "wss://go.getblock.io/your-api-key",
    accounts: [
      {
        address: "your-mainnet-address-here",
        privateKey: "your-mainnet-private-key-here",
      },
    ],
  }
};

const env = await loadEnv();

const web3Env = env.WEB3_ENV || "local";

export const web3Config = Web3Config[web3Env as keyof typeof Web3Config] ||
  Web3Config.local;
`;

/**
 * 示例合约 MyToken.sol
 */
const EXAMPLE_CONTRACT_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title MyToken
 * @dev 示例 ERC20 代币合约
 */
contract MyToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev 构造函数
     * @param _name 代币名称
     * @param _symbol 代币符号
     * @param _decimals 小数位数
     * @param _initialSupply 初始供应量
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10 ** _decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    /**
     * @dev 转账
     */
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    /**
     * @dev 授权
     */
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    /**
     * @dev 代理转账
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}
`;

/**
 * 示例部署脚本
 */
const EXAMPLE_DEPLOY_SCRIPT = `#!/usr/bin/env -S deno run -A

/**
 * @title Deploy MyToken Contract
 * @dev 部署 MyToken 代币合约
 *
 * 使用方法:
 *   deno run -A deploy.ts --network local
 */

import type { Deployer } from "@dreamer/foundry/deploy";
import { logger } from "@dreamer/foundry/utils";

/**
 * 部署函数
 * @param deployer 部署器对象
 */
export async function deploy(deployer: Deployer) {
  logger.info("------------------------------------------");
  logger.info("开始部署 MyToken 合约");
  logger.info("------------------------------------------\\n");

  // MyToken 构造函数参数
  const args = [
    "MyToken",      // name
    "MTK",          // symbol
    "18",           // decimals
    "1000000",      // initialSupply (100万)
  ];

  // 部署合约
  const myToken = await deployer.deploy("MyToken", args);

  logger.info(\`✅ MyToken deployed at: \${myToken.address}\`);
  logger.info("\\n✅ Deployment completed!");
}
`;

/**
 * 示例测试脚本
 */
const EXAMPLE_TEST_SCRIPT = `/**
 * @title MyToken 合约测试
 * @dev 测试 MyToken 代币合约的基本功能
 *
 * 使用方法:
 *   WEB3_ENV=local deno test -A tests/01-mytoken.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { Web3, preloadWeb3Config } from "@dreamer/foundry/utils";
import { logger } from "@dreamer/foundry/utils";

describe("MyToken 合约测试", () => {
  let web3: Web3;
  let deployerAddress: string;

  beforeAll(async () => {
    // 预加载 Web3 配置（从 config/web3.ts 加载）
    await preloadWeb3Config();

    // 创建 Web3 实例
    web3 = new Web3("MyToken");

    // 获取部署者地址（账户0，Anvil 默认账户）
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

    it("应该能够读取小数位数", async () => {
      const decimals = await web3.read("decimals");
      expect(decimals).toBe(18n);
    });

    it("应该能够读取总供应量", async () => {
      const totalSupply = await web3.read("totalSupply");
      expect(totalSupply).toBeDefined();
      expect(Number(totalSupply)).toBeGreaterThan(0);
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
`;

/**
 * 创建目录结构
 */
async function createDirectories(projectRoot: string): Promise<void> {
  const directories = [
    "src",
    "script",
    "tests",
    "utils",
    "build",
    "build/abi",
    "build/abi/local",
    "build/abi/testnet",
    "build/abi/mainnet",
    "config",
  ];

  logger.info("创建项目目录结构...");
  for (const dir of directories) {
    const dirPath = join(projectRoot, dir);
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
      logger.info(`  ✓ 创建目录: ${dir}`);
    } else {
      // 检查路径是否是文件，如果是文件则抛出错误
      try {
        const fileStat = await stat(dirPath);
        if (fileStat.isFile) {
          throw new Error(
            `无法创建目录 ${dir}：路径已存在且是一个文件。请先删除该文件。`,
          );
        }
        logger.info(`  - 目录已存在: ${dir}`);
      } catch (error) {
        if (error instanceof Error && error.message.includes("文件")) {
          throw error;
        }
        // 其他错误，记录并继续
        logger.warn(`  - 检查目录状态失败: ${dir} (${error})`);
        throw error;
      }
    }
  }
}

/**
 * 创建配置文件
 */
async function createConfigFiles(projectRoot: string): Promise<void> {
  logger.info("创建配置文件...");

  const configFiles = [
    { path: "foundry.toml", content: FOUNDRY_TOML },
    { path: ".gitignore", content: GITIGNORE },
    { path: ".env.example", content: ENV_EXAMPLE },
    { path: ".env", content: ENV_FILE },
    { path: ".prettierrc", content: PRETTIERRC },
    { path: ".cursorignore", content: CURSORIGNORE },
    { path: "deno.json", content: DENO_JSON_TEMPLATE },
    { path: "config/web3.ts", content: CONFIG_WEB3_TS },
  ];

  for (const file of configFiles) {
    const filePath = join(projectRoot, file.path);

    // 检查路径是否存在，如果存在且是目录则删除（由调用者负责清理，但这里也处理以防万一）
    try {
      if (existsSync(filePath)) {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory) {
          // 如果是目录，删除后创建文件（测试脚本应该已经清理，但这里也处理）
          logger.warn(`  - 发现目录形式的文件 ${file.path}，删除后重新创建`);
          await remove(filePath, { recursive: true });
        } else {
          // 如果是文件，跳过
          logger.warn(`  - 文件已存在，跳过: ${file.path}`);
          continue;
        }
      }
    } catch (error) {
      // 如果 stat 失败，尝试删除后重新创建（可能是目录）
      logger.warn(`  - 检查文件状态失败，尝试删除后重新创建: ${file.path} (${error})`);
      try {
        await remove(filePath, { recursive: true });
      } catch {
        // 忽略删除错误，继续执行
      }
    }

    // 确保父目录存在
    const parentDir = dirname(filePath);
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true });
    }

    await writeTextFile(filePath, file.content);
    logger.info(`  ✓ 创建文件: ${file.path}`);
  }
}

/**
 * 创建示例文件
 */
async function createExampleFiles(projectRoot: string): Promise<void> {
  logger.info("创建示例文件...");

  const exampleFiles = [
    { path: "src/MyToken.sol", content: EXAMPLE_CONTRACT_SOL },
    { path: "script/1-mytoken.ts", content: EXAMPLE_DEPLOY_SCRIPT },
    { path: "tests/01-mytoken.test.ts", content: EXAMPLE_TEST_SCRIPT },
  ];

  for (const file of exampleFiles) {
    const filePath = join(projectRoot, file.path);

    // 检查路径是否存在，如果存在且是目录则删除
    try {
      if (existsSync(filePath)) {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory) {
          // 如果是目录，删除后创建文件
          logger.warn(`  - 发现目录形式的文件 ${file.path}，删除后重新创建`);
          await remove(filePath, { recursive: true });
        } else {
          // 如果是文件，跳过
          logger.warn(`  - 示例文件已存在，跳过: ${file.path}`);
          continue;
        }
      }
    } catch (error) {
      // 如果 stat 失败，尝试删除后重新创建（可能是目录）
      logger.warn(`  - 检查文件状态失败，尝试删除后重新创建: ${file.path} (${error})`);
      try {
        await remove(filePath, { recursive: true });
      } catch {
        // 忽略删除错误，继续执行
      }
    }

    // 确保父目录存在
    const parentDir = join(filePath, "..");
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true });
    }

    // 创建文件（再次检查，防止在检查和创建之间被创建为目录）
    try {
      await writeTextFile(filePath, file.content);
      logger.info(`  ✓ 创建示例文件: ${file.path}`);
    } catch (error) {
      // 如果写入失败且错误是 IsADirectory 或 EISDIR，说明路径是目录，删除后重试
      const errorCode = (error as { code?: string })?.code;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        error instanceof Error &&
        (error.name === "IsADirectory" ||
          errorMessage.includes("IsADirectory") ||
          errorCode === "EISDIR" ||
          errorMessage.includes("EISDIR"))
      ) {
        logger.warn(`  - 写入时发现是目录，删除后重新创建: ${file.path}`);
        try {
          await remove(filePath, { recursive: true });
          await writeTextFile(filePath, file.content);
          logger.info(`  ✓ 重新创建示例文件: ${file.path}`);
        } catch (_retryError) {
          const errorMsg =
            `无法创建文件 ${file.path}：路径已存在且是一个目录，删除失败。请先删除该目录。`;
          logger.error(`  ✗ ${errorMsg}`);
          throw new Error(errorMsg);
        }
      } else {
        throw error;
      }
    }
  }
}

/**
 * 创建 README.md
 */
async function createREADME(projectRoot: string): Promise<void> {
  const readmePath = join(projectRoot, "README.md");
  if (existsSync(readmePath)) {
    logger.warn("  README.md 已存在，跳过创建");
    return;
  }

  const readmeContent = `# Foundry Project

基于 Foundry 的智能合约开发项目。

## 项目结构

\`\`\`
.
├── src/              # Solidity 合约源码
├── script/          # 部署脚本
├── tests/           # 测试文件
├── config/          # 配置文件
│   └── web3.ts      # Web3 网络配置
├── utils/           # 工具函数
└── build/           # 构建输出
    └── abi/         # ABI 文件
\`\`\`

## 快速开始

### 1. 安装依赖

\`\`\`bash
# 安装 Deno 依赖
deno install

# 编译合约
forge build
\`\`\`

### 2. 配置环境变量

\`\`\`bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置你的环境变量
# WEB3_ENV=local  # 可选: local, testnet, mainnet
# ETH_API_KEY=your-api-key  # 用于合约验证
\`\`\`

### 3. 配置网络

编辑 \`config/web3.ts\` 文件，配置你的网络和账户信息。

### 4. 编译合约

\`\`\`bash
forge build
\`\`\`

### 5. 运行测试

\`\`\`bash
forge test
# 或使用 Deno 测试
deno test -A tests/
\`\`\`

### 6. 部署合约

\`\`\`bash
deno run -A deploy.ts
\`\`\`

## 使用 @dreamer/foundry 库

本项目使用 \`@dreamer/foundry\` 库进行部署和验证：

\`\`\`typescript
import { deploy, verify } from "@dreamer/foundry";
import { preloadWeb3Config } from "@dreamer/foundry/utils";
import { Web3 } from "@dreamer/foundry/utils";

// 预加载 Web3 配置
await preloadWeb3Config();

// 使用 Web3 类
const web3 = new Web3("MyContract");
\`\`\`

## 更多信息

- [Foundry 文档](https://book.getfoundry.sh/)
- [@dreamer/foundry 文档](https://jsr.io/@dreamer/foundry)
`;

  await writeTextFile(readmePath, readmeContent);
  logger.info("  ✓ 创建 README.md");
}

/**
 * 检查目录是否为空（忽略 .git 和 .DS_Store 等隐藏文件）
 */
async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await readdir(dirPath);
    // 过滤掉隐藏文件和常见系统文件
    const visibleEntries = entries.filter((entry) => {
      const name = entry.name;
      // 忽略所有隐藏文件（包括 .git, .DS_Store 等）
      if (name.startsWith(".")) {
        return false;
      }
      return true;
    });
    // 如果只有隐藏文件（如 .git），也认为目录是空的
    return visibleEntries.length === 0;
  } catch {
    // 如果读取失败，假设目录不为空（安全起见）
    return false;
  }
}

/**
 * 提示用户确认
 */
async function confirm(message: string): Promise<boolean> {
  logger.warn(message);
  logger.info("请输入 'yes' 或 'y' 确认，其他任何输入将取消操作：");

  try {
    const buffer = new Uint8Array(1024);
    const bytesRead = await readStdin(buffer);

    if (bytesRead === null) {
      return false;
    }

    const input = new TextDecoder().decode(buffer.subarray(0, bytesRead))
      .trim()
      .toLowerCase();

    return input === "yes" || input === "y";
  } catch {
    // 如果读取失败，返回 false（安全起见）
    return false;
  }
}

/**
 * 主函数
 * @param projectRoot 项目根目录（可选）
 *   - 如果不指定，则在当前目录初始化
 *   - 如果指定，则创建该目录并在其中初始化
 */
export async function init(projectRoot?: string): Promise<void> {
  let root: string;

  if (projectRoot) {
    // 如果指定了项目目录，解析为绝对路径
    const targetPath = isAbsolute(projectRoot) ? projectRoot : resolve(cwd(), projectRoot);

    if (existsSync(targetPath)) {
      // 目录已存在，检查是否是文件
      const fileStat = await stat(targetPath);
      if (fileStat.isFile) {
        throw new Error(
          `无法初始化项目：路径 "${projectRoot}" 已存在且是一个文件。请先删除该文件或使用其他目录名。`,
        );
      }
      // 目录已存在，使用该目录
      root = targetPath;
      logger.info(`使用已存在的目录: ${projectRoot}`);
    } else {
      // 目录不存在，创建新目录
      await mkdir(targetPath, { recursive: true });
      root = targetPath;
      logger.info(`创建新项目目录: ${projectRoot}`);
    }
  } else {
    // 未指定目录，在当前目录初始化
    root = cwd();

    // 检查当前目录是否为空
    const isEmpty = await isDirectoryEmpty(root);
    if (!isEmpty) {
      const dirName = basename(root);
      const confirmed = await confirm(
        `⚠️  警告：当前目录 "${dirName}" 不为空，初始化可能会覆盖现有文件。\n` +
          `是否继续在当前目录初始化 Foundry 项目？`,
      );

      if (!confirmed) {
        logger.info("操作已取消。");
        logger.info("提示：可以指定一个目录名来创建新项目，例如：foundry init my-project");
        exit(0);
      }
    }
  }

  logger.info("===========================================");
  logger.info("🚀 Foundry 项目初始化");
  logger.info("===========================================");
  logger.info(`项目根目录: ${root}`);
  logger.info("");

  try {
    // 创建目录结构
    await createDirectories(root);

    logger.info("");

    // 创建配置文件
    await createConfigFiles(root);

    logger.info("");

    // 创建示例文件
    await createExampleFiles(root);

    logger.info("");

    // 创建 README
    await createREADME(root);

    logger.info("");
    logger.info("===========================================");
    logger.info("✅ 项目初始化完成！");
    logger.info("===========================================");
    logger.info("");
    logger.info("下一步：");
    logger.info("  1. 配置环境变量: cp .env.example .env");
    logger.info("  2. 编辑 config/web3.ts 配置网络和账户");
    logger.info("  3. 安装 Deno 依赖: deno install");
    logger.info("  4. 编译合约: forge build");
    logger.info("");
  } catch (error) {
    logger.error("初始化失败:", error);
    throw error;
  }
}
