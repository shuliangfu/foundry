#!/usr/bin/env -S deno run -A
/**
 * @title Foundry Verify
 * @description Contract verification utilities for Etherscan/BSCScan
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 *
 * @example
 * ```typescript
 * import { verify } from "@dreamer/foundry/verify";
 *
 * await verify({
 *   address: "0x...",
 *   contractName: "MyContract",
 *   network: "testnet",
 *   apiKey: "your-api-key",
 *   rpcUrl: "https://rpc.example.com",
 * });
 * ```
 */

import {
  createCommand,
  cwd,
  existsSync,
  join,
  readdirSync,
  readTextFileSync,
  writeStdoutSync,
} from "@dreamer/runtime-adapter";
import { logger } from "./utils/logger.ts";
import { loadContract } from "./utils/deploy-utils.ts";
import { getApiKey, getNetworkName, loadNetworkConfig, executeCommandWithStream } from "./utils/cli-utils.ts";
import { loadWeb3ConfigSync } from "./utils/web3.ts";

/**
 * 创建验证进度条
 * @returns 进度条对象，包含 start 和 stop 方法
 */
function createVerifyProgressBar() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let currentFrame = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    start(): ReturnType<typeof setInterval> {
      const update = () => {
        const frame = frames[currentFrame % frames.length];
        // 使用 runtime-adapter 的 writeStdoutSync 方法，兼容 Deno 和 Bun
        try {
          const text = `\r${frame} 正在验证中...`;
          writeStdoutSync(new TextEncoder().encode(text));
        } catch {
          // 如果写入失败，忽略错误
        }
        currentFrame++;
      };

      // 立即显示第一帧
      update();

      // 每 100ms 更新一次
      intervalId = setInterval(update, 100);

      return intervalId;
    },
    stop(intervalId: ReturnType<typeof setInterval> | null) {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      // 清除进度条，回到行首并清除整行
      try {
        const clearLine = "\r" + " ".repeat(50) + "\r";
        writeStdoutSync(new TextEncoder().encode(clearLine));
      } catch {
        // 如果写入失败，忽略错误
      }
    },
  };
}

/**
 * 网络配置映射
 * 格式：{ chain: { testnet: {...}, mainnet: {...} } }
 * 注意：所有 API URL 都使用 /api 后缀（Etherscan 兼容格式）
 */
const NETWORK_MAP: Record<string, {
  testnet?: {
    apiUrl: string;
    explorerUrl: string;
  };
  mainnet?: {
    apiUrl: string;
    explorerUrl: string;
  };
}> = {
  bsc: {
    testnet: {
      apiUrl: "https://api-testnet.bscscan.com/api",
      explorerUrl: "https://testnet.bscscan.com/address",
    },
    mainnet: {
      apiUrl: "https://api.bscscan.com/api",
      explorerUrl: "https://bscscan.com/address",
    },
  },
  eth: {
    testnet: {
      apiUrl: "https://api-sepolia.etherscan.io/api",
      explorerUrl: "https://sepolia.etherscan.io/address",
    },
    mainnet: {
      apiUrl: "https://api.etherscan.io/api",
      explorerUrl: "https://etherscan.io/address",
    },
  },
  polygon: {
    testnet: {
      // Polygon 测试网现在是 Amoy (Chain ID: 80002)
      apiUrl: "https://api-amoy.polygonscan.com/api",
      explorerUrl: "https://amoy.polygonscan.com/address",
    },
    mainnet: {
      apiUrl: "https://api.polygonscan.com/api",
      explorerUrl: "https://polygonscan.com/address",
    },
  },
  arbitrum: {
    testnet: {
      // Arbitrum Sepolia 测试网
      apiUrl: "https://api-sepolia.arbiscan.io/api",
      explorerUrl: "https://sepolia.arbiscan.io/address",
    },
    mainnet: {
      apiUrl: "https://api.arbiscan.io/api",
      explorerUrl: "https://arbiscan.io/address",
    },
  },
  base: {
    testnet: {
      // Base Sepolia 测试网
      apiUrl: "https://api-sepolia.basescan.org/api",
      explorerUrl: "https://sepolia.basescan.org/address",
    },
    mainnet: {
      apiUrl: "https://api.basescan.org/api",
      explorerUrl: "https://basescan.org/address",
    },
  },
  optimism: {
    testnet: {
      // Optimism Sepolia 测试网 (OP Sepolia)
      apiUrl: "https://api-sepolia-optimistic.etherscan.io/api",
      explorerUrl: "https://sepolia-optimistic.etherscan.io/address",
    },
    mainnet: {
      apiUrl: "https://api-optimistic.etherscan.io/api",
      explorerUrl: "https://optimistic.etherscan.io/address",
    },
  },
  zkSync: {
    // 注意：zkSync Era 不使用标准的 Etherscan API，可能需要特殊处理
    // 这里保留配置，但验证时可能需要使用不同的方法
    testnet: {
      apiUrl: "https://api-sepolia-era.zksync.network/api",
      explorerUrl: "https://sepolia.explorer.zksync.io/address",
    },
    mainnet: {
      apiUrl: "https://api-era.zksync.network/api",
      explorerUrl: "https://explorer.zksync.io/address",
    },
  },
  avalanche: {
    testnet: {
      // Avalanche Fuji 测试网
      apiUrl: "https://api-testnet.snowtrace.io/api",
      explorerUrl: "https://testnet.snowtrace.io/address",
    },
    mainnet: {
      apiUrl: "https://api.snowtrace.io/api",
      explorerUrl: "https://snowtrace.io/address",
    },
  },
  // 添加更多链的支持
  linea: {
    testnet: {
      apiUrl: "https://api-testnet.lineascan.build/api",
      explorerUrl: "https://sepolia.lineascan.build/address",
    },
    mainnet: {
      apiUrl: "https://api.lineascan.build/api",
      explorerUrl: "https://lineascan.build/address",
    },
  },
  scroll: {
    testnet: {
      apiUrl: "https://api-sepolia.scrollscan.com/api",
      explorerUrl: "https://sepolia.scrollscan.com/address",
    },
    mainnet: {
      apiUrl: "https://api.scrollscan.com/api",
      explorerUrl: "https://scrollscan.com/address",
    },
  },
  mantle: {
    testnet: {
      apiUrl: "https://api-explorer.testnet.mantle.xyz/api",
      explorerUrl: "https://explorer.testnet.mantle.xyz/address",
    },
    mainnet: {
      apiUrl: "https://api-explorer.mantle.xyz/api",
      explorerUrl: "https://explorer.mantle.xyz/address",
    },
  },
  blast: {
    testnet: {
      apiUrl: "https://api-sepolia.blastscan.io/api",
      explorerUrl: "https://sepolia.blastscan.io/address",
    },
    mainnet: {
      apiUrl: "https://api.blastscan.io/api",
      explorerUrl: "https://blastscan.io/address",
    },
  },
};

/**
 * 验证选项
 */
export interface VerifyOptions {
  /** 合约地址 */
  address: string;
  /** 合约名称 */
  contractName: string;
  /** 网络名称 */
  network: string;
  /** API Key */
  apiKey: string;
  /** RPC URL */
  rpcUrl: string;
  /** 构造函数参数（可选） */
  constructorArgs?: string[];
  /** 链 ID（可选） */
  chainId?: number;
}

/**
 * 验证合约
 */
export async function verify(options: VerifyOptions): Promise<void> {
  // 尝试从 web3.json 读取 chain 信息
  let chain: string | null = null;
  try {
    const web3Config = loadWeb3ConfigSync();
    if (web3Config) {
      // 尝试从配置文件读取 chain 信息
      const configPath = join(cwd(), "config", "web3.json");
      if (existsSync(configPath)) {
        const configText = readTextFileSync(configPath);
        const config = JSON.parse(configText);
        if (config.chain) {
          chain = config.chain;
        }
      }
    }
  } catch {
    // 如果读取失败，忽略错误
  }

  // 根据 chain 和 network 查找网络配置
  let networkConfig: { apiUrl: string; explorerUrl: string } | null = null;
  
  if (chain && NETWORK_MAP[chain]) {
    // 如果找到了 chain，从 NETWORK_MAP 中查找对应的 network
    const chainConfig = NETWORK_MAP[chain];
    if (options.network === "testnet" && chainConfig.testnet) {
      networkConfig = chainConfig.testnet;
    } else if (options.network === "mainnet" && chainConfig.mainnet) {
      networkConfig = chainConfig.mainnet;
    }
  }

  // 如果未找到配置，尝试向后兼容的方式（直接使用 network 作为 key）
  if (!networkConfig) {
    // 向后兼容：如果 network 是 "testnet" 或 "mainnet"，且 chain 是 "bsc"，使用旧的映射方式
    if (options.network === "testnet" && (!chain || chain === "bsc")) {
      networkConfig = NETWORK_MAP.bsc?.testnet || null;
    } else if (options.network === "mainnet" && (!chain || chain === "bsc")) {
      networkConfig = NETWORK_MAP.bsc?.mainnet || null;
    } else if (options.network === "sepolia") {
      networkConfig = NETWORK_MAP.eth?.testnet || null;
    }
  }

  if (!networkConfig) {
    throw new Error(
      `Unsupported network: ${options.network}${chain ? ` (chain: ${chain})` : ""}. Please check your config/web3.json file.`,
    );
  }

  // 读取 foundry.toml 配置，获取编译器版本和优化次数
  const foundryConfig = readFoundryConfig();

  // 构建 forge verify-contract 命令
  // 注意：forge verify-contract 的格式是: verify-contract <地址> <合约名>
  // 合约名应该是 Solidity 文件中的合约名称，而不是文件路径
  // 参考参考脚本，参数顺序：verify-contract <地址> <合约名> --chain-id <id> --rpc-url <url> --etherscan-api-key <key> ...
  const args = [
    "verify-contract",
    options.address,
    options.contractName, // 使用合约名称，而不是完整路径
    "--chain-id",
    String(options.chainId || 1),
    "--rpc-url",
    options.rpcUrl,
    "--etherscan-api-key",
    options.apiKey,
    "--compiler-version",
    foundryConfig.compilerVersion,
    "--num-of-optimizations",
    String(foundryConfig.optimizerRuns),
  ];

  // 处理构造函数参数
  // 如果提供了构造函数参数，使用 cast abi-encode 编码为十六进制字符串
  if (options.constructorArgs && options.constructorArgs.length > 0) {
    const encodedArgs = await encodeConstructorArgs(
      options.contractName,
      options.network,
      options.constructorArgs,
    );
    if (encodedArgs) {
      args.push("--constructor-args");
      args.push(encodedArgs);
      logger.info("ℹ️  使用构造函数参数（已编码）");
    } else {
      // 如果编码失败，尝试使用 --guess-constructor-args
      logger.warn("⚠️  无法编码构造函数参数，尝试使用 --guess-constructor-args");
      args.push("--guess-constructor-args");
    }
  }

  // 在验证之前，先检查合约是否在链上
  logger.info("🔍 检查合约是否已部署到链上...");
  const checkCmd = createCommand("cast", {
    args: ["code", options.address, "--rpc-url", options.rpcUrl],
    stdout: "piped",
    stderr: "piped",
  });

  const checkOutput = await checkCmd.output();
  const contractCode = new TextDecoder().decode(checkOutput.stdout).trim();

  if (!checkOutput.success || !contractCode || contractCode === "0x" || contractCode.length <= 2) {
    logger.error("❌ 错误：链上未找到合约");
    logger.error(`   地址: ${options.address}`);
    logger.error(`   网络: ${options.network} (Chain ID: ${options.chainId || 1})`);
    logger.error("");
    logger.error("可能的原因：");
    logger.error("  1. 合约尚未部署到此地址");
    logger.error("  2. 合约部署失败");
    logger.error("  3. 网络或地址错误");
    logger.error("");
    logger.error("请检查：");
    if (options.network === "testnet") {
      logger.error(
        `  - 在 BSCScan 上查看地址: https://testnet.bscscan.com/address/${options.address}`,
      );
    } else if (options.network === "mainnet") {
      logger.error(`  - 在 BSCScan 上查看地址: https://bscscan.com/address/${options.address}`);
    } else if (options.network === "sepolia") {
      logger.error(
        `  - 在 Etherscan 上查看地址: https://sepolia.etherscan.io/address/${options.address}`,
      );
    }
    logger.error("  - 确保合约已成功部署");
    logger.error("  - 如果刚刚部署，请等待几个区块确认");
    throw new Error(`Contract not found on chain at address ${options.address}`);
  }

  logger.info("✅ 链上找到合约代码，开始验证...");
  logger.info("");

  // 添加 --watch 参数，等待验证完成
  args.push("--watch");

  // 启动验证进度条
  const progressBar = createVerifyProgressBar();
  const progressInterval = progressBar.start();

  const cmd = createCommand("forge", {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  // 使用 spawn 来实时读取输出
  const child = cmd.spawn();
  
  // 使用通用流式输出函数
  const result = await executeCommandWithStream(child);

  // 停止进度条
  progressBar.stop(progressInterval);

  const stdoutText = result.stdout;
  const stderrText = result.stderr;

  if (!result.success) {
    logger.error("Verification failed:");
    logger.error(stderrText);

    // 检查是否是 API Key 相关的错误
    if (stderrText.includes("Invalid API Key") || stderrText.includes("API key")) {
      logger.error("");
      logger.error("💡 提示：");
      logger.error("   1. 请检查 API Key 是否正确设置");
      logger.error("   2. 对于 BSC 测试网，请使用 BSCScan 的 API Key");
      logger.error("   3. 对于 Ethereum 网络，请使用 Etherscan 的 API Key");
      logger.error("   4. 可以在 .env 文件中设置: ETH_API_KEY=your-api-key");
      logger.error("   5. 或使用命令行参数: --api-key your-api-key");
    }

    throw new Error(`Verification failed: ${stderrText}`);
  }

  // 过滤并处理输出信息
  // 移除重复的 "Submitting verification" 和状态检查信息
  const filteredOutput = stdoutText
    .split("\n")
    .filter((line) => {
      const trimmedLine = line.trim();

      // 过滤掉重复的提交信息和状态检查信息
      if (trimmedLine.includes("Submitting verification for")) {
        return false;
      }
      if (trimmedLine.includes("Submitted contract for verification:")) {
        return false;
      }
      if (trimmedLine.includes("Contract verification status:")) {
        return false;
      }
      if (
        trimmedLine.startsWith("Response:") &&
        (trimmedLine.includes("`OK`") || trimmedLine.includes("`NOTOK`"))
      ) {
        return false;
      }
      if (
        trimmedLine.startsWith("Details:") &&
        (trimmedLine.includes("Pending in queue") || trimmedLine.includes("Already Verified"))
      ) {
        return false;
      }
      if (trimmedLine.startsWith("GUID:") || trimmedLine.startsWith("URL:")) {
        return false;
      }
      // 保留其他重要信息
      return trimmedLine.length > 0;
    })
    .join("\n")
    .trim();

  // 检查是否验证成功
  const isVerified = stdoutText.includes("Already Verified") ||
    stdoutText.includes("Successfully verified") ||
    stdoutText.includes("Contract successfully verified");

  if (isVerified) {
    // 提取合约地址的浏览器链接（如果存在）
    const urlMatch = stdoutText.match(/URL:\s*(https?:\/\/[^\s]+)/);
    const explorerUrl = urlMatch ? urlMatch[1] : `${networkConfig.explorerUrl}/${options.address}`;

    logger.info(`✅ 合约验证成功: ${explorerUrl}`);
  } else if (filteredOutput) {
    // 如果有其他重要输出，显示它
    logger.info(filteredOutput);
  } else {
    // 默认成功消息
    logger.info(`✅ Contract verified: ${networkConfig.explorerUrl}/${options.address}`);
  }
}

/**
 * 查找大小写不敏感的合约文件名
 * @param contractName 合约名称（可能大小写不匹配）
 * @param network 网络名称
 * @returns 实际的文件名（保持原始大小写），如果不存在则返回 null
 */
export function findContractFileName(contractName: string, network: string): string | null {
  const abiDir = join(cwd(), "build", "abi", network);

  if (!existsSync(abiDir)) {
    return null;
  }

  try {
    const contractNameLower = contractName.toLowerCase();
    const entries = readdirSync(abiDir);
    for (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const fileNameWithoutExt = entry.name.replace(/\.json$/, "");
        if (fileNameWithoutExt.toLowerCase() === contractNameLower) {
          return entry.name; // 返回实际的文件名（保持原始大小写）
        }
      }
    }
  } catch {
    // 忽略错误
  }

  return null;
}

/**
 * 从 ABI JSON 文件读取构造参数并编码为 ABI 格式
 * @param contractName 合约名称
 * @param network 网络名称
 * @param constructorArgs 构造函数参数数组（如果提供则使用，否则从 ABI 文件读取）
 * @returns ABI 编码后的十六进制字符串，如果无法编码则返回 null
 */
async function encodeConstructorArgs(
  contractName: string,
  network: string,
  constructorArgs?: string[],
): Promise<string | null> {
  // 使用大小写不敏感的文件名查找
  const actualFileName = findContractFileName(contractName, network);
  if (!actualFileName) {
    return null;
  }

  const abiPath = join(cwd(), "build", "abi", network, actualFileName);

  try {
    const abiData = JSON.parse(readTextFileSync(abiPath));

    // 优先使用提供的构造函数参数，否则从 ABI 文件读取
    let argsArray: any[] | null = null;
    if (constructorArgs && constructorArgs.length > 0) {
      argsArray = constructorArgs;
    } else if (abiData.args && Array.isArray(abiData.args)) {
      argsArray = abiData.args;
    }

    if (!argsArray || argsArray.length === 0) {
      return null;
    }

    // 从 ABI 中获取构造函数定义
    const abi = abiData.abi || [];
    const constructor = abi.find((item: any) => item.type === "constructor");

    if (!constructor || !constructor.inputs) {
      return null;
    }

    // 构建构造函数签名用于 cast abi-encode
    // cast abi-encode 需要 "constructor(type1,type2,...)" 格式
    const inputTypes = constructor.inputs.map((input: any) => input.type);
    const signature = `constructor(${inputTypes.join(",")})`;

    // 使用 cast abi-encode 编码参数
    const castArgs = [
      "abi-encode",
      signature,
      ...argsArray.map((arg: any) => {
        // 处理数组类型参数（如 address[], uint256[]）
        if (Array.isArray(arg)) {
          return `[${arg.join(",")}]`;
        }
        return String(arg);
      }),
    ];

    const cmd = createCommand("cast", {
      args: castArgs,
      stdout: "piped",
      stderr: "piped",
    });

    const output = await cmd.output();

    if (!output.success) {
      const error = new TextDecoder().decode(output.stderr);
      logger.warn(`⚠️  编码构造函数参数失败: ${error}`);
      return null;
    }

    const encoded = new TextDecoder().decode(output.stdout).trim();
    return encoded || null;
  } catch (error) {
    logger.warn(`⚠️  编码构造函数参数时出错: ${error}`);
    return null;
  }
}

/**
 * 从 foundry.toml 读取配置
 * 用于获取编译器版本和优化次数，确保验证时使用与编译时相同的设置
 */
function readFoundryConfig(): {
  compilerVersion: string;
  optimizerRuns: number;
} {
  const defaultConfig = {
    compilerVersion: "0.8.18",
    optimizerRuns: 200,
  };

  try {
    if (!existsSync("foundry.toml")) {
      return defaultConfig;
    }

    const tomlContent = readTextFileSync("foundry.toml");
    const compilerMatch = tomlContent.match(/solc_version\s*=\s*"([^"]+)"/);
    const optimizerMatch = tomlContent.match(/optimizer_runs\s*=\s*(\d+)/);

    return {
      compilerVersion: compilerMatch ? compilerMatch[1] : defaultConfig.compilerVersion,
      optimizerRuns: optimizerMatch ? parseInt(optimizerMatch[1], 10) : defaultConfig.optimizerRuns,
    };
  } catch {
    return defaultConfig;
  }
}

/**
 * 验证合约（简化版本）
 */
export function verifyContract(
  address: string,
  contractName: string,
  network: string,
  apiKey: string,
  rpcUrl: string,
  constructorArgs?: string[],
  chainId?: number,
): Promise<void> {
  return verify({
    address,
    contractName,
    network,
    apiKey,
    rpcUrl,
    constructorArgs,
    chainId,
  });
}

/**
 * 解析命令行参数
 */
function parseArgs(): {
  network?: string;
  contract?: string;
  address?: string;
  rpcUrl?: string;
  apiKey?: string;
  chainId?: number;
  constructorArgs?: string[];
} {
  const args = Deno.args;
  let network: string | undefined;
  let contract: string | undefined;
  let address: string | undefined;
  let rpcUrl: string | undefined;
  let apiKey: string | undefined;
  let chainId: number | undefined;
  const constructorArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--network" || arg === "-n") {
      if (i + 1 < args.length) {
        network = args[i + 1];
        i++;
      }
    } else if (arg === "--contract" || arg === "-c") {
      if (i + 1 < args.length) {
        contract = args[i + 1];
        i++;
      }
    } else if (arg === "--address" || arg === "-a") {
      if (i + 1 < args.length) {
        address = args[i + 1];
        i++;
      }
    } else if (arg === "--rpc-url") {
      if (i + 1 < args.length) {
        rpcUrl = args[i + 1];
        i++;
      }
    } else if (arg === "--api-key") {
      if (i + 1 < args.length) {
        apiKey = args[i + 1];
        i++;
      }
    } else if (arg === "--chain-id") {
      if (i + 1 < args.length) {
        chainId = parseInt(args[i + 1], 10);
        i++;
      }
    } else if (arg === "--constructor-args") {
      // 收集所有后续的参数作为构造函数参数
      while (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        i++;
        constructorArgs.push(args[i]);
      }
    }
  }

  return {
    network,
    contract,
    address,
    rpcUrl,
    apiKey,
    chainId,
    constructorArgs: constructorArgs.length > 0 ? constructorArgs : undefined,
  };
}

/**
 * 主函数（当作为脚本直接运行时）
 */
async function main() {
  // 解析命令行参数
  const {
    network: networkArg,
    contract: contractName,
    address,
    rpcUrl,
    apiKey,
    chainId,
    constructorArgs,
  } = parseArgs();

  // 确定网络：优先使用命令行参数，其次使用环境变量
  const network = await getNetworkName(networkArg, false) || "local";

  if (!contractName) {
    logger.error("❌ 未指定合约名称");
    logger.error("   请使用 --contract (-c) 参数指定合约名称");
    Deno.exit(1);
  }

  // 获取 API Key（从命令行参数或环境变量）
  const finalApiKey = await getApiKey(apiKey);
  if (!finalApiKey) {
    logger.error("❌ 未指定 API Key");
    logger.error("   请使用 --api-key 参数或设置环境变量 ETH_API_KEY");
    Deno.exit(1);
  }

  // 确定合约地址
  let contractAddress = address;
  let contractInfo: any = null;
  if (!contractAddress) {
    try {
      contractInfo = loadContract(contractName, network);
      contractAddress = contractInfo.address;
    } catch {
      logger.error("❌ 无法读取合约地址，请使用 --address 参数指定");
      Deno.exit(1);
    }
  } else {
    // 如果提供了地址，也尝试加载合约信息以获取构造函数参数
    try {
      contractInfo = loadContract(contractName, network);
    } catch {
      // 如果加载失败，忽略，使用命令行参数
    }
  }

  // 如果没有提供构造函数参数，尝试从合约信息中读取
  let finalConstructorArgs: string[] | undefined = constructorArgs;
  if (!finalConstructorArgs && contractInfo && contractInfo.args) {
    finalConstructorArgs = contractInfo.args;
  }

  // 确定 RPC URL 和链 ID
  let finalRpcUrl = rpcUrl;
  let finalChainId = chainId;

  if (!finalRpcUrl || !finalChainId) {
    try {
      const config = await loadNetworkConfig();
      finalRpcUrl = finalRpcUrl || config.rpcUrl;
      finalChainId = finalChainId || config.chainId;
    } catch {
      logger.warn("无法从配置加载 RPC URL 和链 ID，请使用 --rpc-url 和 --chain-id 参数指定");
    }
  }

  if (!finalRpcUrl) {
    logger.error("❌ 未指定 RPC URL，请使用 --rpc-url 参数或配置环境变量");
    Deno.exit(1);
  }

  if (!finalChainId) {
    logger.error("❌ 未指定链 ID，请使用 --chain-id 参数或配置环境变量");
    Deno.exit(1);
  }

  // 查找实际的文件名（大小写不敏感）
  // 这样可以确保使用正确的合约名称（保持原始大小写）
  const actualFileName = findContractFileName(contractName, network);
  const actualContractName = actualFileName ? actualFileName.replace(/\.json$/, "") : contractName;

  // 如果实际文件名与输入不同，提示用户
  if (actualFileName && actualFileName !== `${contractName}.json`) {
    logger.info(`ℹ️  合约名称已自动匹配为: ${actualContractName}`);
  }

  // 执行验证（使用实际的合约名称，因为 forge verify-contract 需要匹配 Solidity 文件中的合约名称）
  try {
    await verify({
      address: contractAddress!,
      contractName: actualContractName, // 使用实际的文件名（保持原始大小写）
      network,
      apiKey: finalApiKey!,
      rpcUrl: finalRpcUrl!,
      chainId: finalChainId,
      constructorArgs: finalConstructorArgs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ 验证失败:", errorMessage);
    Deno.exit(1);
  }
}

// 当作为脚本直接运行时执行主函数
if (import.meta.main) {
  main().catch((error) => {
    logger.error("❌ 执行失败:", error);
    Deno.exit(1);
  });
}
