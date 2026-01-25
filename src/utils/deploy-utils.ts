/**
 * @title Foundry Deploy Library
 * @description Foundry deployment utilities for Deno and Bun
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 *
 * @example
 * ```typescript
 * import { deploy } from "@dreamer/foundry";
 *
 * const address = await deploy("MyContract", {
 *   rpcUrl: "https://rpc.example.com",
 *   privateKey: "0x...",
 *   network: "testnet",
 * }, ["arg1", "arg2"]);
 * ```
 */

import { existsSync, readTextFileSync, writeTextFileSync, mkdir, cwd } from "@dreamer/runtime-adapter";
import { join } from "@dreamer/runtime-adapter";
import { createCommand } from "@dreamer/runtime-adapter";
import { logger } from "./logger.ts";

/**
 * 网络配置接口
 */
export interface NetworkConfig {
  /** 账户地址 */
  address: string;
  /** RPC URL */
  rpcUrl: string;
  /** 部署者私钥 */
  privateKey: string;
  /** 链 ID（可选） */
  chainId?: number;
}

/**
 * 部署选项
 */
export interface DeployOptions {
  /** 是否验证合约 */
  verify?: boolean;
  /** Etherscan API Key（验证时需要） */
  etherscanApiKey?: string;
  /** 链 ID（验证时需要） */
  chainId?: number;
  /** 是否强制部署（覆盖已存在的合约） */
  force?: boolean;
  /** 自定义合约路径，如 "lib/pancake-swap-core/contracts/PancakeFactory.sol:PancakeFactory" */
  contractPath?: string;
  /** ABI 输出目录，默认为 "build/abi/{network}" */
  abiDir?: string;
}

/**
 * 合约信息类型
 */
export interface ContractInfo {
  contractName: string;
  address: string;
  abi: any[];
  args?: any[];
}

/**
 * 部署合约
 * @param contractName 合约名称
 * @param config 网络配置
 * @param constructorArgs 构造函数参数（可以是数组或对象）
 * @param options 可选参数
 * @returns 合约地址
 */
export async function deploy(
  contractName: string,
  config: NetworkConfig,
  constructorArgs: string[] | Record<string, any> = [],
  options: DeployOptions = {},
): Promise<string> {
  // 转换构造函数参数为数组
  if (typeof constructorArgs === "object" && constructorArgs !== null && !Array.isArray(constructorArgs)) {
    constructorArgs = Object.values(constructorArgs);
  }

  const argsArray = (constructorArgs as string[]).map((arg) => {
    if (Array.isArray(arg)) {
      return `[${arg.join(",")}]`;
    }
    return String(arg);
  });

  // 如果提供了自定义路径，使用自定义路径；否则使用默认路径
  const contractPath = options.contractPath || `src/${contractName}.sol:${contractName}`;

  const forgeArgs = [
    "create",
    contractPath,
    "--rpc-url",
    config.rpcUrl,
    "--private-key",
    config.privateKey,
    "--json",
    "--broadcast",
  ];

  if (argsArray.length > 0) {
    forgeArgs.push("--constructor-args");
    forgeArgs.push(...argsArray);
  }

  // 添加验证参数
  if (options.verify && options.etherscanApiKey && (options.chainId || config.chainId)) {
    forgeArgs.push("--verify");
    forgeArgs.push("--etherscan-api-key", options.etherscanApiKey);
    forgeArgs.push("--chain-id", String(options.chainId || config.chainId));
  }

  const cmd = createCommand("forge", {
    args: forgeArgs,
    stdout: "piped",
    stderr: "piped",
    cwd: cwd(),
  });

  const output = await cmd.output();
  const stdoutText = new TextDecoder().decode(output.stdout);
  const stderrText = new TextDecoder().decode(output.stderr);

  if (!output.success) {
    logger.error("Deployment failed:");
    logger.error(stderrText);
    throw new Error(`Deployment failed: ${stderrText}`);
  }

  // 尝试从 JSON 输出中提取地址和交易哈希
  let address: string | null = null;
  let txHash: string | null = null;

  const txHashPatterns = [
    /transaction hash:\s*(0x[a-fA-F0-9]{64})/i,
    /hash:\s*(0x[a-fA-F0-9]{64})/i,
    /(0x[a-fA-F0-9]{64})/,
  ];

  const combinedOutput = stderrText + stdoutText;
  for (const pattern of txHashPatterns) {
    const match = combinedOutput.match(pattern);
    if (match && match[1]) {
      txHash = match[1];
      break;
    }
  }

  try {
    const jsonOutput = JSON.parse(stdoutText);
    if (jsonOutput.transaction?.hash) {
      txHash = jsonOutput.transaction.hash;
    } else if (jsonOutput.hash) {
      txHash = jsonOutput.hash;
    } else if (jsonOutput.receipt?.transactionHash) {
      txHash = jsonOutput.receipt.transactionHash;
    }

    if (jsonOutput.deployedTo) {
      address = jsonOutput.deployedTo;
    } else if (jsonOutput.address) {
      address = jsonOutput.address;
    } else if (jsonOutput.contractAddress) {
      address = jsonOutput.contractAddress;
    }
  } catch {
    // JSON 解析失败，尝试从输出中提取地址
  }

  // 如果仍未找到地址，尝试从 forge 输出中提取
  if (!address) {
    const addressPattern = /Deployed to:\s*(0x[a-fA-F0-9]{40})/i;
    const match = combinedOutput.match(addressPattern);
    if (match && match[1]) {
      address = match[1];
    }
  }

  if (!address) {
    logger.error("无法从部署输出中提取合约地址");
    logger.error("输出:", stdoutText);
    logger.error("错误:", stderrText);
    throw new Error("无法提取合约地址");
  }

  // 保存合约信息
  const network = options.abiDir?.split("/").pop() || "local";
  await saveContract(contractName, address, network, constructorArgs as string[], options.abiDir);

  logger.info(`✅ ${contractName} deployed to: ${address}`);
  if (txHash) {
    logger.info(`   交易哈希: ${txHash}`);
  }

  return address;
}

/**
 * 保存合约信息到 JSON 文件
 */
async function saveContract(
  contractName: string,
  address: string,
  network: string,
  constructorArgs: string[],
  abiDir?: string,
): Promise<void> {
  const buildDir = abiDir || join(cwd(), "build", "abi", network);
  await mkdir(buildDir, { recursive: true });

  const artifactPath = join(
    cwd(),
    "build",
    "out",
    `${contractName}.sol`,
    `${contractName}.json`,
  );

  if (!existsSync(artifactPath)) {
    logger.warn(`Artifact not found: ${artifactPath}`);
    logger.warn("合约信息将不包含 ABI");
    const contractData = {
      contractName: contractName,
      address: address,
      abi: [],
      args: constructorArgs,
    };
    const outputPath = join(buildDir, `${contractName}.json`);
    writeTextFileSync(outputPath, JSON.stringify(contractData, null, 2));
    return;
  }

  const artifact = JSON.parse(readTextFileSync(artifactPath));
  const _abi = (artifact.abi || []).map((item: any) => {
    const { signature: _signature, ...rest } = item;
    return rest;
  });

  const contractData = {
    contractName: contractName,
    address: address,
    abi: _abi,
    args: constructorArgs,
  };

  const outputPath = join(buildDir, `${contractName}.json`);
  writeTextFileSync(outputPath, JSON.stringify(contractData, null, 2));
  logger.info(`合约信息已保存到: ${join("build", "abi", network, `${contractName}.json`)}`);
}

/**
 * 读取已部署的合约信息
 */
export function loadContract(
  contractName: string,
  network: string = "local",
  abiDir?: string,
): ContractInfo {
  const buildDir = abiDir || join(cwd(), "build", "abi", network);
  const abiPath = join(buildDir, `${contractName}.json`);

  if (!existsSync(abiPath)) {
    throw new Error(
      `${contractName} address not found. Please deploy or configure ${contractName} first. Expected file: ${abiPath}`,
    );
  }

  try {
    const data = JSON.parse(readTextFileSync(abiPath));
    const contractNameFromFile = data.contractName || data.name || contractName;
    const address = data.address || null;

    if (!address || address === "0x0000000000000000000000000000000000000000") {
      throw new Error(
        `${contractName} address not found or is zero address. Please deploy ${contractName} first.`,
      );
    }

    return {
      contractName: contractNameFromFile,
      address: address,
      abi: data.abi || [],
      args: data.args || undefined,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to read ${contractName} from ${abiPath}: ${error}`);
  }
}
