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

import {
  createCommand,
  cwd,
  existsSync,
  getEnv,
  join,
  mkdir,
  readdir,
  readdirSync,
  readTextFileSync,
  remove,
  writeTextFileSync,
} from "@dreamer/runtime-adapter";
import {
  ALREADY_KNOWN_REPLACE_RETRIES,
  DEFAULT_NETWORK,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_DELAY,
  GAS_BUMP_MULTIPLIERS,
} from "../constants/index.ts";
import { DeploymentError } from "../errors/index.ts";
import type { AbiItem, ContractInfo, DeployOptions, NetworkConfig } from "../types/index.ts";
import { createLoadingProgressBar } from "./cli-utils.ts";
import { logger } from "./logger.ts";

/**
 * 重新导出类型，保持向后兼容
 */
export type { ContractInfo, DeployOptions, NetworkConfig } from "../types/index.ts";

/**
 * 从 abiDir 路径中提取网络名称
 * @param abiDir ABI 输出目录路径（如 "build/abi/testnet"）
 * @returns 网络名称，未能解析时从环境变量或默认值获取
 */
export function extractNetworkFromAbiDir(abiDir?: string): string {
  if (!abiDir) return getEnv("WEB3_ENV") ?? DEFAULT_NETWORK;
  const parts = abiDir.split(/[/\\]/);
  const networkIndex = parts.indexOf("abi");
  if (networkIndex >= 0 && networkIndex < parts.length - 1) {
    return parts[networkIndex + 1];
  }
  return parts[parts.length - 1] ?? getEnv("WEB3_ENV") ?? DEFAULT_NETWORK;
}

/**
 * 过滤敏感信息（私钥、API Key 等）
 * 用于在日志和错误消息中隐藏敏感数据，避免泄露
 * @param text 原始文本
 * @returns 过滤后的文本
 */
export function filterSensitiveInfo(text: string): string {
  // 过滤私钥（0x 开头的 64 位十六进制字符串）
  let filtered = text.replace(/0x[a-fA-F0-9]{64}/g, "0x[PRIVATE_KEY_HIDDEN]");
  // 过滤可能的 API Key（常见格式）
  filtered = filtered.replace(/([A-Za-z0-9]{32,})/g, (match) => {
    // 如果看起来像是 API Key（长度 >= 32 且全是字母数字），则隐藏
    if (match.length >= 32 && /^[A-Za-z0-9]+$/.test(match)) {
      return "[API_KEY_HIDDEN]";
    }
    return match;
  });
  // 过滤 --private-key 参数后的值
  filtered = filtered.replace(/--private-key\s+\S+/g, "--private-key [HIDDEN]");
  // 过滤 --etherscan-api-key 参数后的值
  filtered = filtered.replace(/--etherscan-api-key\s+\S+/g, "--etherscan-api-key [HIDDEN]");
  return filtered;
}

/**
 * 清理 Foundry broadcast 目录中的交易记录
 * @param _network 网络名称（保留用于未来扩展）
 */
async function cleanBroadcastDir(_network: string): Promise<void> {
  try {
    const broadcastDir = join(cwd(), "broadcast");
    if (!existsSync(broadcastDir)) {
      return;
    }

    // Foundry 的 broadcast 目录结构通常是: broadcast/{script_name}/{chain_id}/run-latest.json
    // 为了确保能重新部署，我们需要更彻底地清理交易记录
    // 删除整个链目录，这样更彻底

    // 尝试读取 broadcast 目录
    const entries = await readdir(broadcastDir);

    // 清理所有子目录中的链目录（删除整个 chain_id 目录）
    for (const entry of entries) {
      if (entry.isDirectory) {
        const scriptDir = join(broadcastDir, entry.name);
        const scriptEntries = await readdir(scriptDir);

        for (const chainEntry of scriptEntries) {
          if (chainEntry.isDirectory) {
            const chainDir = join(scriptDir, chainEntry.name);

            // 删除整个链目录，这样更彻底
            try {
              await remove(chainDir, { recursive: true });
              logger.info(`已清理交易记录目录: ${chainDir}`);
            } catch (_error) {
              // 如果删除目录失败，尝试只删除 run-latest.json
              const runLatestPath = join(chainDir, "run-latest.json");
              if (existsSync(runLatestPath)) {
                await remove(runLatestPath);
                logger.info(`已清理交易记录: ${runLatestPath}`);
              } else {
                logger.warn(`无法清理交易记录: ${chainDir}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // 清理失败不影响部署，只记录警告
    logger.warn(`清理 broadcast 目录时出错: ${error}`);
  }
}

/**
 * 通过 cast gas-price 获取当前链上 gas 价格（wei）
 * @param rpcUrl RPC URL
 * @returns 当前 gas 价格（wei），失败返回 null
 */
async function getCurrentGasPriceWei(rpcUrl: string): Promise<number | null> {
  try {
    const cmd = createCommand("cast", {
      args: ["gas-price", "--rpc-url", rpcUrl],
      stdout: "piped",
      stderr: "piped",
      cwd: cwd(),
    });
    const output = await cmd.output();
    const text = new TextDecoder().decode(output.stdout).trim();
    if (!output.success || !text) return null;
    const parsed = parseInt(text, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 等待交易达到指定的区块确认数
 * @param txHash - 交易哈希
 * @param rpcUrl - RPC URL
 * @param confirmations - 需要等待的区块确认数
 * @param timeoutMs - 超时时间（毫秒），默认 120 秒
 */
async function waitForConfirmations(
  txHash: string,
  rpcUrl: string,
  confirmations: number,
  timeoutMs: number = 120000,
): Promise<void> {
  const startTime = Date.now();
  const pollInterval = 2000; // 每 2 秒检查一次

  while (Date.now() - startTime < timeoutMs) {
    try {
      // 使用 cast receipt 获取交易收据
      const receiptCmd = createCommand("cast", {
        args: ["receipt", txHash, "--rpc-url", rpcUrl, "--json"],
        stdout: "piped",
        stderr: "piped",
        cwd: cwd(),
      });
      const receiptOutput = await receiptCmd.output();

      if (!receiptOutput.success) {
        // 交易可能还未被打包，继续等待
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      const receiptText = new TextDecoder().decode(receiptOutput.stdout);
      const receipt = JSON.parse(receiptText);
      const txBlockNumber = parseInt(receipt.blockNumber, 16);

      // 获取当前区块号
      const blockCmd = createCommand("cast", {
        args: ["block-number", "--rpc-url", rpcUrl],
        stdout: "piped",
        stderr: "piped",
        cwd: cwd(),
      });
      const blockOutput = await blockCmd.output();

      if (blockOutput.success) {
        const currentBlockText = new TextDecoder().decode(blockOutput.stdout).trim();
        const currentBlockNumber = parseInt(currentBlockText, 10);
        const currentConfirmations = currentBlockNumber - txBlockNumber;

        if (currentConfirmations >= confirmations) {
          return; // 已达到所需确认数
        }
      }

      // 继续等待
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch {
      // 出错时继续等待
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(`等待区块确认超时（${timeoutMs / 1000}秒）`);
}

/**
 * 检查合约是否已部署
 * @param contractName 合约名称
 * @param network 网络名称
 * @param abiDir ABI 输出目录
 * @returns 如果合约已存在返回地址，否则返回 null
 */
function checkContractExists(
  contractName: string,
  network: string,
  abiDir?: string,
): string | null {
  try {
    const buildDir = abiDir || join(cwd(), "build", "abi", network);
    const abiPath = join(buildDir, `${contractName}.json`);

    if (!existsSync(abiPath)) {
      return null;
    }

    const data = JSON.parse(readTextFileSync(abiPath));
    const address = data.address || null;

    if (!address || address === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    return address;
  } catch {
    return null;
  }
}

/**
 * 部署合约（forgeDeploy 的别名，提供更友好的 API）
 * @param contractName 合约名称
 * @param config 网络配置
 * @param constructorArgs 构造函数参数（可以是数组或对象）
 * @param options 可选参数
 * @returns 合约地址
 */
export function deployContract(
  contractName: string,
  config: NetworkConfig,
  constructorArgs: string[] | Record<string, any> = [],
  options: DeployOptions = {},
): Promise<string> {
  return forgeDeploy(contractName, config, constructorArgs, options);
}

/**
 * 部署合约
 * @param contractName 合约名称
 * @param config 网络配置
 * @param constructorArgs 构造函数参数（可以是数组或对象）
 * @param options 可选参数
 * @returns 合约地址
 */
export async function forgeDeploy(
  contractName: string,
  config: NetworkConfig,
  constructorArgs: string[] | Record<string, unknown> = [],
  options: DeployOptions = {},
): Promise<string> {
  // 从 abiDir 中提取网络名称
  const network = extractNetworkFromAbiDir(options.abiDir);

  // 检查合约是否已存在
  const existingAddress = checkContractExists(contractName, network, options.abiDir);

  if (existingAddress && !options.force) {
    logger.warn(`⚠️  合约 ${contractName} 已存在，地址: ${existingAddress}`);
    logger.warn(`   如需重新部署，请使用 --force 参数强制部署。`);
    return existingAddress;
  }

  // 如果 force 为 true，清理之前的交易记录
  if (options.force) {
    await cleanBroadcastDir(network);
  }

  // 转换构造函数参数为数组
  if (
    typeof constructorArgs === "object" && constructorArgs !== null &&
    !Array.isArray(constructorArgs)
  ) {
    constructorArgs = Object.values(constructorArgs) as string[];
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

  // 计算需要等待的区块确认数（部署成功后使用）
  // local 网络默认不等待确认（0），其他网络默认等待 2 个区块确认
  const isLocalNetwork = network === "local" || config.rpcUrl.includes("127.0.0.1") ||
    config.rpcUrl.includes("localhost");
  const confirmations = options.confirmations ?? (isLocalNetwork ? 0 : 2);

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

  logger.info(`正在部署合约 ${contractName}...`);

  // 显示进度条
  const progressBar = createLoadingProgressBar("正在部署中...");
  const progressInterval = progressBar.start();

  const cmd = createCommand("forge", {
    args: forgeArgs,
    stdout: "piped",
    stderr: "piped",
    cwd: cwd(),
  });

  const output = await cmd.output();

  // 停止进度条
  progressBar.stop(progressInterval);

  const stdoutText = new TextDecoder().decode(output.stdout);
  const stderrText = new TextDecoder().decode(output.stderr);

  // 检查是否是 "transaction already imported" 错误
  const isTransactionAlreadyImported = stderrText.includes("transaction already imported") ||
    stderrText.includes("error code -32003");

  // 检查是否是 "already known" 错误（交易已在 mempool 中）
  const isAlreadyKnown = stderrText.includes("error code -32000") ||
    stderrText.toLowerCase().includes("already known");

  if (!output.success) {
    // 如果是 "already known" 错误，尝试用更高 gas 替换 mempool 中的交易
    if (isAlreadyKnown) {
      const baseGasWei = await getCurrentGasPriceWei(config.rpcUrl);
      if (baseGasWei != null && baseGasWei > 0) {
        for (let r = 0; r < ALREADY_KNOWN_REPLACE_RETRIES; r++) {
          if (r > 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
          const mult = GAS_BUMP_MULTIPLIERS[r] ?? 1.5;
          const gasWei = Math.ceil(baseGasWei * mult);
          const replaceArgs = [...forgeArgs, "--gas-price", String(gasWei)];
          const replaceProgressBar = createLoadingProgressBar("正在部署中...");
          const replaceInterval = replaceProgressBar.start();
          try {
            const replaceCmd = createCommand("forge", {
              args: replaceArgs,
              stdout: "piped",
              stderr: "piped",
              cwd: cwd(),
            });
            const replaceOutput = await replaceCmd.output();
            replaceProgressBar.stop(replaceInterval);
            const replaceStderr = new TextDecoder().decode(replaceOutput.stderr);
            const replaceStdout = new TextDecoder().decode(replaceOutput.stdout);
            const stillAlreadyKnown = replaceStderr.includes("error code -32000") ||
              replaceStderr.toLowerCase().includes("already known");
            if (replaceOutput.success) {
              return await extractAddressFromOutput(
                replaceStdout,
                replaceStderr,
                contractName,
                options,
                constructorArgs as string[],
                config.rpcUrl,
                confirmations,
              );
            }
            if (!stillAlreadyKnown) {
              // 区分网络/RPC 连接异常（可重试）与其它错误
              const isConnectionError =
                /connection error|TLS|close_notify|eof|sendrequest|connection reset|timed out/i
                  .test(replaceStderr);
              if (isConnectionError) {
                logger.warn(
                  `替换交易时 RPC 连接异常（第 ${r + 1} 次），将重试: ${
                    replaceStderr.slice(0, 120)
                  }...`,
                );
                replaceProgressBar.stop(replaceInterval);
                if (r < ALREADY_KNOWN_REPLACE_RETRIES - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 3000));
                  continue;
                }
                logger.error("❌ 替换时 RPC 多次连接失败，请稍后重试或更换 config 中的 rpcUrl");
                throw new DeploymentError(
                  "替换 mempool 交易时 RPC 连接失败，请稍后重试或更换 RPC 节点。",
                  { contractName, network, rpcUrl: config.rpcUrl },
                );
              }
              logger.error("替换交易时发生其他错误:", replaceStderr);
              throw new DeploymentError(
                `替换 mempool 交易时失败: ${replaceStderr}`,
                { contractName, network, rpcUrl: config.rpcUrl },
              );
            }
          } catch (e) {
            replaceProgressBar.stop(replaceInterval);
            if (e instanceof DeploymentError) throw e;
          }
        }
      }
      logger.error("❌ 部署失败：交易已在 mempool 中");
      logger.error("");
      logger.error("💡 解决方案：");
      logger.error("  1. 等待更长时间后再部署（建议等待 5-10 分钟）");
      logger.error("  2. 使用不同的账户地址进行部署");
      logger.error("  3. 若已尝试用更高 gas 替换仍失败，可稍后重试或联系节点服务商");
      logger.error("");
      throw new DeploymentError(
        "交易已在 mempool 中 (already known)。请等待更长时间或更换部署地址。",
        { contractName, network, rpcUrl: config.rpcUrl },
      );
    }
    // 如果是 "transaction already imported" 错误且 force 为 true，清理后重试
    if (isTransactionAlreadyImported && options.force) {
      const retryNetwork = extractNetworkFromAbiDir(options.abiDir);
      const maxRetries = DEFAULT_RETRY_ATTEMPTS;
      let lastError: string | null = null;

      for (let retryCount = 1; retryCount <= maxRetries; retryCount++) {
        // 每次重试前都清理 broadcast 目录
        await cleanBroadcastDir(retryNetwork);

        // 等待一段时间，让 RPC 节点清除交易缓存（每次重试等待时间递增）
        const waitTime = DEFAULT_RETRY_DELAY * retryCount;
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // 重试部署，显示进度条
        const retryProgressBar = createLoadingProgressBar("正在部署中...");
        const retryProgressInterval = retryProgressBar.start();

        try {
          const retryCmd = createCommand("forge", {
            args: forgeArgs,
            stdout: "piped",
            stderr: "piped",
            cwd: cwd(),
          });

          const retryOutput = await retryCmd.output();

          // 停止重试进度条
          retryProgressBar.stop(retryProgressInterval);

          const retryStdoutText = new TextDecoder().decode(retryOutput.stdout);
          const retryStderrText = new TextDecoder().decode(retryOutput.stderr);

          if (retryOutput.success) {
            // 重试成功，使用重试的输出
            return await extractAddressFromOutput(
              retryStdoutText,
              retryStderrText,
              contractName,
              options,
              constructorArgs as string[],
              config.rpcUrl,
              confirmations,
            );
          }

          // 检查是否仍然是 "transaction already imported" 错误
          const isStillTransactionError =
            retryStderrText.includes("transaction already imported") ||
            retryStderrText.includes("error code -32003");

          if (!isStillTransactionError) {
            // 如果不是交易已存在的错误，直接抛出错误（过滤敏感信息）
            const filteredStderr = filterSensitiveInfo(retryStderrText);
            logger.error("重试部署失败:");
            logger.error(filteredStderr);
            throw new DeploymentError(
              `重试部署失败: ${filteredStderr}`,
              { contractName, network: retryNetwork, retryCount },
            );
          }

          // 如果还是交易已存在的错误，保存错误信息并继续下一次重试
          lastError = retryStderrText;
        } catch (error) {
          // 停止进度条
          retryProgressBar.stop(retryProgressInterval);
          // 如果不是交易已存在的错误，直接抛出
          if (!(error instanceof Error && error.message.includes("transaction already imported"))) {
            throw error;
          }
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      // 所有重试都失败了（过滤敏感信息）
      const filteredLastError = filterSensitiveInfo(lastError || stderrText);
      logger.error(`重试 ${maxRetries} 次后仍然失败，可能是 RPC 节点缓存了交易:`);
      logger.error(filteredLastError);
      logger.error("\n提示：");
      logger.error("  1. 如果使用的是本地 Anvil 节点，请重启节点以清除交易缓存");
      logger.error("  2. 或者等待更长时间后再次尝试部署");
      logger.error("  3. 或者使用不同的 nonce 或账户进行部署");
      throw new DeploymentError(
        `重试 ${maxRetries} 次后仍然失败，可能是 RPC 节点缓存了交易`,
        {
          contractName,
          network: retryNetwork,
          maxRetries,
          lastError: filteredLastError,
        },
      );
    }

    // 如果是 "transaction already imported" 错误但未使用 force，给出提示并尝试获取已存在的地址
    if (isTransactionAlreadyImported && !options.force) {
      logger.warn(`⚠️  合约 ${contractName} 的交易已存在，跳过部署。`);
      logger.warn(`   如需重新部署，请使用 --force 参数强制重新部署。`);

      // 尝试从已存在的合约信息中获取地址
      try {
        const existingNetwork = extractNetworkFromAbiDir(options.abiDir);
        const existingAddress = checkContractExists(contractName, existingNetwork, options.abiDir);
        if (existingAddress) {
          logger.info(`   当前合约地址: ${existingAddress}`);
          return existingAddress;
        } else {
          // 尝试从错误输出中提取地址（Foundry 可能会在错误信息中包含地址）
          const addressPattern = /(0x[a-fA-F0-9]{40})/i;
          const addressMatch = stderrText.match(addressPattern) || stdoutText.match(addressPattern);
          if (addressMatch && addressMatch[1]) {
            const extractedAddress = addressMatch[1];
            logger.info(`   从交易信息中提取的合约地址: ${extractedAddress}`);
            return extractedAddress;
          }

          logger.warn(
            `   无法获取已存在的合约地址，请检查 build/abi/${existingNetwork}/${contractName}.json 文件。`,
          );
          // 即使找不到地址，也不抛出错误，返回空字符串让调用者处理
          return "";
        }
      } catch {
        // 如果无法获取地址，给出提示但不抛出错误
        logger.warn(`   无法获取已存在的合约地址。`);
        return "";
      }
    }

    // 仅抛出错误，由上层统一打印（过滤敏感信息）
    const filteredStderr = filterSensitiveInfo(stderrText);
    throw new DeploymentError(
      `部署失败: ${filteredStderr}`,
      { contractName, network },
    );
  }

  return await extractAddressFromOutput(
    stdoutText,
    stderrText,
    contractName,
    options,
    constructorArgs as string[],
    config.rpcUrl,
    confirmations,
  );
}

/**
 * 从部署输出中提取合约地址并保存
 * @param stdoutText - 标准输出
 * @param stderrText - 标准错误
 * @param contractName - 合约名称
 * @param options - 部署选项
 * @param constructorArgs - 构造函数参数
 * @param rpcUrl - RPC URL（用于等待区块确认）
 * @param confirmations - 等待的区块确认数
 */
async function extractAddressFromOutput(
  stdoutText: string,
  stderrText: string,
  contractName: string,
  options: DeployOptions,
  constructorArgs: string[],
  rpcUrl: string,
  confirmations: number,
): Promise<string> {
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
    // 过滤敏感信息后再打印日志
    const filteredStdout = filterSensitiveInfo(stdoutText);
    const filteredStderr = filterSensitiveInfo(stderrText);
    logger.error("无法从部署输出中提取合约地址");
    logger.error("输出:", filteredStdout);
    logger.error("错误:", filteredStderr);
    throw new DeploymentError(
      "无法提取合约地址",
      { contractName },
    );
  }

  // 等待区块确认（如果需要）
  if (confirmations > 0 && txHash) {
    try {
      await waitForConfirmations(txHash, rpcUrl, confirmations);
    } catch {
      logger.warn(`⚠️  等待区块确认超时，但合约可能已部署成功`);
    }
  }

  // 保存合约信息
  const saveNetwork = extractNetworkFromAbiDir(options.abiDir);
  await saveContract(
    contractName,
    address,
    saveNetwork,
    constructorArgs,
    options.abiDir,
    options.force,
  );

  if (txHash) {
    logger.info(`✅ 交易哈希: ${txHash}`);
  }

  return address;
}

/**
 * 保存合约信息到 JSON 文件
 * @param contractName 合约名称
 * @param address 合约地址
 * @param network 网络名称
 * @param constructorArgs 构造函数参数
 * @param abiDir ABI 输出目录
 * @param force 是否强制覆盖已存在的合约信息
 */
async function saveContract(
  contractName: string,
  address: string,
  network: string,
  constructorArgs: string[],
  abiDir?: string,
  force?: boolean,
): Promise<void> {
  const buildDir = abiDir || join(cwd(), "build", "abi", network);
  await mkdir(buildDir, { recursive: true });

  const outputPath = join(buildDir, `${contractName}.json`);

  // 如果合约已存在且未使用 force，跳过保存
  if (!force && existsSync(outputPath)) {
    logger.warn(`⚠️  合约 ${contractName} 已存在，跳过保存 ABI。如需覆盖，请使用 --force 参数。`);
    logger.warn(`   现有地址: ${JSON.parse(readTextFileSync(outputPath)).address}`);
    logger.warn(`   新地址: ${address}`);
    return;
  }

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
    writeTextFileSync(outputPath, JSON.stringify(contractData, null, 2));
    return;
  }

  const artifact = JSON.parse(readTextFileSync(artifactPath));
  const _abi = (artifact.abi || []).map((item: AbiItem & { signature?: string }) => {
    const { signature: _signature, ...rest } = item;
    return rest;
  });

  const contractData = {
    contractName: contractName,
    address: address,
    abi: _abi,
    args: constructorArgs,
  };

  writeTextFileSync(outputPath, JSON.stringify(contractData, null, 2));
  logger.info(`✅ 合约信息已保存到: ${join("build", "abi", network, `${contractName}.json`)}`);
}

/**
 * 读取已部署的合约信息
 * @param contractName 合约名称（支持大小写不敏感查找）
 * @param network 网络名称
 * @param abiDir ABI 目录（可选）
 * @returns 合约信息
 */
export function loadContract(
  contractName: string,
  network?: string,
  abiDir?: string,
): ContractInfo {
  // 网络未传入时优先从环境变量 WEB3_ENV 读取，否则使用默认网络常量
  if (network == null || network === "") {
    network = getEnv("WEB3_ENV") ?? DEFAULT_NETWORK;
  }

  const buildDir = abiDir || join(cwd(), "build", "abi", network);

  // 首先尝试直接使用提供的合约名称
  let abiPath = join(buildDir, `${contractName}.json`);

  // 如果文件不存在，尝试大小写不敏感的查找
  if (!existsSync(abiPath)) {
    try {
      const contractNameLower = contractName.toLowerCase();
      const entries = readdirSync(buildDir);
      for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          const fileNameWithoutExt = entry.name.replace(/\.json$/, "");
          if (fileNameWithoutExt.toLowerCase() === contractNameLower) {
            abiPath = join(buildDir, entry.name);
            break;
          }
        }
      }
    } catch {
      // 如果查找失败，继续使用原始路径
    }
  }

  if (!existsSync(abiPath)) {
    throw new Error(
      `${contractName} address not found. Please deploy or configure ${contractName} first. Expected file: ${
        join(buildDir, `${contractName}.json`)
      }`,
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
