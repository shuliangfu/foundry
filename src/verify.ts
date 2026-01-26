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

import { existsSync, readTextFileSync, createCommand } from "./utils/deps.ts";
import { logger } from "./utils/logger.ts";

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
