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

import { existsSync, readTextFileSync, createCommand, getEnv } from "@dreamer/runtime-adapter";
import { logger } from "./utils/logger.ts";
import { loadEnv } from "./utils/env.ts";
import { loadContract } from "./utils/deploy-utils.ts";
import { loadWeb3ConfigSync } from "./utils/web3.ts";
import type { NetworkConfig } from "./utils/deploy-utils.ts";

/**
 * 网络配置映射
 */
const NETWORK_MAP: Record<string, {
  apiUrl: string;
  explorerUrl: string;
}> = {
  sepolia: {
    apiUrl: "https://api-sepolia.etherscan.io/api",
    explorerUrl: "https://sepolia.etherscan.io/address",
  },
  mainnet: {
    apiUrl: "https://api.etherscan.io/api",
    explorerUrl: "https://etherscan.io/address",
  },
  testnet: {
    apiUrl: "https://api-testnet.bscscan.com/api",
    explorerUrl: "https://testnet.bscscan.com/address",
  },
  bsc_testnet: {
    apiUrl: "https://api-testnet.bscscan.com/api",
    explorerUrl: "https://testnet.bscscan.com/address",
  },
  bsc: {
    apiUrl: "https://api.bscscan.com/api",
    explorerUrl: "https://bscscan.com/address",
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
  const networkConfig = NETWORK_MAP[options.network];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${options.network}`);
  }

  // 读取 foundry.toml 配置，获取编译器版本和优化次数
  const foundryConfig = readFoundryConfig();
  
  // 读取合约源码路径
  const contractPath = `src/${options.contractName}.sol:${options.contractName}`;
  
  // 构建 forge verify-contract 命令
  const args = [
    "verify-contract",
    options.address,
    contractPath,
    "--chain-id",
    String(options.chainId || 1),
    "--etherscan-api-key",
    options.apiKey,
    "--rpc-url",
    options.rpcUrl,
    "--compiler-version",
    foundryConfig.compilerVersion,
    "--num-of-optimizations",
    String(foundryConfig.optimizerRuns),
  ];

  if (options.constructorArgs && options.constructorArgs.length > 0) {
    args.push("--constructor-args");
    args.push(...options.constructorArgs);
  }

  const cmd = createCommand("forge", {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const output = await cmd.output();
  const stdoutText = new TextDecoder().decode(output.stdout);
  const stderrText = new TextDecoder().decode(output.stderr);

  if (!output.success) {
    logger.error("Verification failed:");
    logger.error(stderrText);
    throw new Error(`Verification failed: ${stderrText}`);
  }

  // 输出成功信息（stdout 可能包含验证成功的详细信息）
  if (stdoutText.trim()) {
    logger.info(stdoutText.trim());
  }
  logger.info(`✅ Contract verified: ${networkConfig.explorerUrl}/${options.address}`);
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
 * 加载网络配置
 */
async function loadNetworkConfigSync(): Promise<NetworkConfig> {
  // 尝试从环境变量加载
  const rpcUrl = getEnv("RPC_URL");
  const privateKey = getEnv("PRIVATE_KEY");
  const address = getEnv("ADDRESS");
  const chainId = getEnv("CHAIN_ID") ? parseInt(getEnv("CHAIN_ID")!, 10) : undefined;

  if (rpcUrl && privateKey && address) {
    return {
      rpcUrl,
      privateKey,
      address,
      chainId,
    };
  }

  // 尝试从 config/web3.json 加载
  try {
    const web3Config = loadWeb3ConfigSync();
    if (web3Config && web3Config.accounts && web3Config.accounts.length > 0) {
      const account = web3Config.accounts[0];
      return {
        rpcUrl: web3Config.host,
        privateKey: account.privateKey,
        address: account.address,
        chainId: web3Config.chainId,
      };
    }
  } catch (error) {
    logger.warn("无法从 config/web3.json 加载配置:", error);
  }

  // 如果都加载失败，尝试从 .env 文件加载
  try {
    const env = await loadEnv();
    return {
      rpcUrl: env.RPC_URL || "",
      privateKey: env.PRIVATE_KEY || "",
      address: env.ADDRESS || "",
      chainId: env.CHAIN_ID ? parseInt(env.CHAIN_ID, 10) : undefined,
    };
  } catch {
    logger.error("无法加载网络配置，请设置环境变量或创建 config/web3.json 配置文件");
    throw new Error("网络配置加载失败");
  }
}

/**
 * 主函数（当作为脚本直接运行时）
 */
async function main() {
  // 解析命令行参数
  const { network: networkArg, contract: contractName, address, rpcUrl, apiKey, chainId, constructorArgs } = parseArgs();

  // 确定网络：优先使用命令行参数，其次使用环境变量
  let network: string;
  if (networkArg) {
    network = networkArg;
  } else {
    try {
      const env = await loadEnv();
      network = env.WEB3_ENV || getEnv("WEB3_ENV") || "local";
    } catch {
      network = getEnv("WEB3_ENV") || "local";
    }
  }

  if (!contractName) {
    logger.error("❌ 未指定合约名称");
    logger.error("   请使用 --contract (-c) 参数指定合约名称");
    Deno.exit(1);
  }

  // 如果未提供 API Key，尝试从环境变量读取
  let finalApiKey = apiKey;
  if (!finalApiKey) {
    try {
      const env = await loadEnv();
      finalApiKey = env.ETH_API_KEY || getEnv("ETH_API_KEY");
    } catch {
      finalApiKey = getEnv("ETH_API_KEY");
    }
  }

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
      const config = await loadNetworkConfigSync();
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

  // 执行验证
  try {
    await verify({
      address: contractAddress!,
      contractName,
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
