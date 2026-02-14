#!/usr/bin/env -S deno run -A
/**
 * @module
 * @title Foundry CLI
 * @description Foundry deployment and verification command-line tool.
 *
 * This module provides CLI commands for deploying and verifying smart contracts.
 * It uses @dreamer/console and @dreamer/runtime-adapter for Deno and Bun compatibility.
 *
 * @example
 * ```bash
 * # Deploy all contracts to testnet
 * foundry deploy --network testnet
 *
 * # Deploy specific contract
 * foundry deploy --network testnet --contract Contract1
 *
 * # Verify contract
 * foundry verify --network testnet --contract Contract1 --api-key YOUR_API_KEY
 * ```
 */

import { Command } from "@dreamer/console";
import {
  args as runtimeArgs,
  createCommand,
  cwd,
  dirname,
  existsSync,
  exit,
  getEnv,
  getEnvAll,
  IS_BUN,
  join,
  platform,
  readdir,
  readStdin,
  readTextFileSync,
  remove,
  setEnv,
  writeStdoutSync,
} from "@dreamer/runtime-adapter";
import { DEFAULT_NETWORK } from "./constants/index.ts";
import { init } from "./init.ts";
import { findFoundryPath } from "./setup.ts";
import type { JsrDenoJson, JsrMetaData } from "./types/index.ts";
import { getInstalledVersion, readCache, setInstalledVersion, writeCache } from "./utils/cache.ts";
import {
  createLoadingProgressBar,
  executeCommand,
  getApiKey,
  getNetworkName,
  getProjectConfig,
  getScriptPath,
  handleCommandResult,
} from "./utils/cli-utils.ts";
import type { NetworkConfig } from "./utils/deploy-utils.ts";
import { loadEnv } from "./utils/env.ts";
import { parseJsrPackageFromUrl, parseJsrVersionFromUrl } from "./utils/jsr.ts";
import { logger } from "./utils/logger.ts";
import { loadWeb3ConfigSync } from "./utils/web3.ts";

/**
 * 提示用户确认
 * @param message 提示信息
 * @returns 用户确认返回 true，否则返回 false
 */
async function confirm(message: string): Promise<boolean> {
  console.warn(message);
  // 使用 writeStdoutSync 在同一行显示输入提示（不换行），兼容 Deno 和 Bun
  const prompt = "请输入 'yes' 或 'y' 确认：";
  try {
    writeStdoutSync(new TextEncoder().encode(prompt));
  } catch {
    // 如果写入失败，使用 console.log
    console.log(prompt);
  }

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
 * 查找框架根目录（包含框架的 deno.json 的目录）
 * @returns 框架根目录路径，如果未找到则返回 null
 */
function findFrameworkRoot(): string | null {
  // 使用 import.meta.url 获取当前文件的路径
  // cli.ts 在 src/cli.ts，所以框架根目录应该是 src 的父目录
  let currentFileUrl: string;
  try {
    // 在 Deno 中，import.meta.url 是 file:// URL
    // 在 Bun 中，也可能是 file:// URL
    currentFileUrl = import.meta.url;
  } catch {
    // 如果无法获取 import.meta.url，回退到使用 cwd()
    return null;
  }

  // 将 URL 转换为文件路径
  let currentDir: string;
  if (currentFileUrl.startsWith("file://")) {
    // Deno/Bun: file:///path/to/file -> /path/to/file
    currentDir = currentFileUrl.replace(/^file:\/\//, "");
    // Windows: file:///C:/path -> C:/path
    if (currentDir.startsWith("/") && /^[A-Z]:/.test(currentDir.substring(1))) {
      currentDir = currentDir.substring(1);
    }
  } else {
    currentDir = currentFileUrl;
  }

  // 获取 cli.ts 所在的目录（src 目录）
  const srcDir = dirname(currentDir);
  // 框架根目录是 src 的父目录
  const frameworkRoot = dirname(srcDir);

  const plat = platform();
  const root = plat === "windows" ? /^[A-Z]:\\$/ : /^\/$/;

  // 向上查找，找到包含 deno.json 的目录
  let currentPath = frameworkRoot;
  while (true) {
    const denoJsonPath = join(currentPath, "deno.json");
    if (existsSync(denoJsonPath)) {
      return currentPath;
    }

    // 检查是否到达根目录
    const parentDir = dirname(currentPath);
    if (parentDir === currentPath || currentPath.match(root)) {
      break;
    }
    currentPath = parentDir;
  }

  return null;
}

/**
 * 获取最新版本号（从 JSR API）
 * @param includeBeta 是否包含 beta 版本，默认为 false（只返回正式版）
 * @param forceRefresh 是否强制刷新缓存，默认为 false
 * @returns 最新版本号字符串，如果获取失败则返回 null
 */
async function getLatestVersion(
  includeBeta: boolean = false,
  forceRefresh: boolean = false,
): Promise<string | null> {
  try {
    const packageInfo = parseJsrPackageFromUrl();
    const packageName = packageInfo?.packageName || "@dreamer/foundry";

    // 尝试从缓存读取 meta.json（如果不需要强制刷新）
    const cacheKey = `meta_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    let metaData: JsrMetaData | null = forceRefresh
      ? null
      : (readCache(cacheKey, "latest") as JsrMetaData | null);

    if (!metaData) {
      // 缓存未命中或强制刷新，从网络获取
      const metaUrl = `https://jsr.io/${packageName}/meta.json`;
      const metaResponse = await fetch(metaUrl);
      if (!metaResponse.ok) {
        throw new Error(`无法获取 meta.json: ${metaResponse.statusText}`);
      }
      metaData = await metaResponse.json();
      // 写入缓存（使用 "latest" 作为版本标识）
      await writeCache(cacheKey, "latest", metaData);
    }

    if (!metaData) {
      throw new Error("无法获取 meta.json 数据");
    }

    if (includeBeta) {
      // 如果包含 beta，需要从所有版本中找到真正的最新版本（包括 beta）
      // JSR meta.json 的 versions 是一个对象，格式为: { "1.0.0": { createdAt: "..." }, ... }
      const versionsObj = metaData.versions || {};
      const allVersions = Object.keys(versionsObj);

      if (allVersions.length === 0) {
        throw new Error("无法从 meta.json 获取版本列表");
      }

      // 按版本号排序，找到最新的版本
      const sortedVersions = [...allVersions].sort((a: string, b: string) => {
        return compareVersions(b, a); // 降序排列，最新的在前
      });
      return sortedVersions[0];
    } else {
      // 如果不包含 beta，直接返回 metaData.latest（这是最新的正式版）
      return metaData.latest || null;
    }
  } catch (error) {
    logger.error(`获取最新版本失败: ${error}`);
    return null;
  }
}

/**
 * 比较两个版本号
 * @param version1 版本号1
 * @param version2 版本号2
 * @returns 如果 version1 > version2 返回 1，version1 < version2 返回 -1，相等返回 0
 */
function compareVersions(version1: string, version2: string): number {
  // 移除可能的 'v' 前缀
  const v1 = version1.replace(/^v/, "");
  const v2 = version2.replace(/^v/, "");

  // 分割版本号（支持 beta、alpha 等后缀）
  const parts1 = v1.split(/[.-]/);
  const parts2 = v2.split(/[.-]/);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || "0";
    const part2 = parts2[i] || "0";

    // 尝试解析为数字
    const num1 = parseInt(part1, 10);
    const num2 = parseInt(part2, 10);

    // 如果都是数字，直接比较
    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
      continue;
    }

    // 如果一个是数字，一个是字符串，数字更大
    if (!isNaN(num1) && isNaN(num2)) return 1;
    if (isNaN(num1) && !isNaN(num2)) return -1;

    // 都是字符串，按字典序比较
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * 从 JSR 服务器获取版本号
 * 优先从全局安装缓存读取（这是标准来源），其次从 import.meta.url 解析，最后从 JSR API 获取
 * @returns 版本号字符串，如果读取失败则返回 undefined
 */
async function getVersion(): Promise<string | undefined> {
  try {
    // 首先尝试从全局安装缓存读取版本号（这是标准来源）
    const packageInfo = parseJsrPackageFromUrl();
    const packageName = packageInfo?.packageName || "@dreamer/foundry";
    const installedVersion = getInstalledVersion(packageName);

    if (installedVersion) {
      return installedVersion;
    }

    // 如果全局缓存中没有，尝试从 import.meta.url 解析 JSR 版本号
    const parsedVersion = parseJsrVersionFromUrl();
    if (parsedVersion) {
      return parsedVersion;
    }

    // 如果无法从 URL 解析，尝试从 JSR API 获取最新版本（使用缓存）
    // 尝试从缓存读取 meta.json
    const cacheKey = `meta_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    let metaData: any = readCache(cacheKey, "latest");

    if (!metaData) {
      // 缓存未命中，从网络获取
      const metaUrl = `https://jsr.io/${packageName}/meta.json`;
      const metaResponse = await fetch(metaUrl);
      if (!metaResponse.ok) {
        throw new Error(`无法获取 meta.json: ${metaResponse.statusText}`);
      }
      metaData = await metaResponse.json();
      // 写入缓存（使用 "latest" 作为版本标识）
      await writeCache(cacheKey, "latest", metaData);
    }

    const latestVersion = metaData.latest || metaData.versions?.[0];
    if (!latestVersion) {
      throw new Error("无法从 meta.json 获取最新版本");
    }

    // 尝试从缓存读取 deno.json
    const denoJsonCacheKey = `deno_json_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    let denoJson: JsrDenoJson | null = readCache(denoJsonCacheKey, latestVersion) as
      | JsrDenoJson
      | null;

    if (!denoJson) {
      // 缓存未命中，从网络获取
      const denoJsonUrl = `https://jsr.io/${packageName}/${latestVersion}/deno.json`;
      const response = await fetch(denoJsonUrl, {
        headers: {
          "Accept": "application/json, */*",
        },
      });
      if (!response.ok) {
        throw new Error(`无法获取 deno.json: ${response.statusText} (${response.status})`);
      }
      denoJson = await response.json() as JsrDenoJson;
      // 写入缓存（使用版本号作为标识）
      await writeCache(denoJsonCacheKey, latestVersion, denoJson);
    }

    return denoJson.version || latestVersion;
  } catch {
    // 如果从 JSR 获取失败，尝试从本地框架的 deno.json 读取（作为后备方案）
    try {
      const frameworkRoot = findFrameworkRoot();
      if (!frameworkRoot) {
        return undefined;
      }

      const denoJsonPath = join(frameworkRoot, "deno.json");
      if (existsSync(denoJsonPath)) {
        const denoJsonContent = readTextFileSync(denoJsonPath);
        const denoJson = JSON.parse(denoJsonContent);
        return denoJson.version;
      }
    } catch {
      // 忽略本地读取错误
    }
  }
  return undefined;
}

/**
 * 加载网络配置
 * 优先从环境变量加载，如果没有则尝试从 config/web3.json 加载
 */
function loadNetworkConfig(_network: string): NetworkConfig {
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

  // 尝试从 config/web3.json 加载（使用 web3.ts 中的配置加载方法）
  try {
    const web3Config = loadWeb3ConfigSync();
    if (web3Config && web3Config.accounts && web3Config.accounts.length > 0) {
      const account = web3Config.accounts[0];
      return {
        rpcUrl: web3Config.rpcUrl,
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
    const env = loadEnv();
    return {
      rpcUrl: env.RPC_URL || env.RPC_URL || "",
      privateKey: env.PRIVATE_KEY || env.PRIVATE_KEY || "",
      address: env.ADDRESS || env.ADDRESS || "",
      chainId: env.CHAIN_ID ? parseInt(env.CHAIN_ID, 10) : undefined,
    };
  } catch {
    logger.error("无法加载网络配置，请设置环境变量或创建 config/web3.json 配置文件");
    throw new Error("网络配置加载失败");
  }
}

/**
 * 从 argv 中解析 -c/--contract 后的多个合约名称（直到下一个以 - 开头的参数）
 * 用于 deploy 和 verify 命令支持 -c contract1 contract2 contract3 这种写法
 */
function parseContractNamesFromArgv(argv: string[]): string[] {
  const names: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "-c" || argv[i] === "--contract") {
      while (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        i++;
        names.push(argv[i].trim());
      }
      break;
    }
  }
  return names.filter(Boolean);
}

/**
 * 扫描部署脚本目录，获取可用的脚本文件列表
 */
async function scanScripts(scriptDir: string): Promise<string[]> {
  const scripts: string[] = [];

  if (!existsSync(scriptDir)) {
    return scripts;
  }

  try {
    const entries = await readdir(scriptDir);
    for (const entry of entries) {
      if (entry.isFile && entry.name.endsWith(".ts")) {
        const match = entry.name.match(/^\d+-/);
        if (match) {
          scripts.push(entry.name);
        }
      }
    }

    // 按文件名中的数字前缀排序
    scripts.sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)-/)?.[1] || "999") || 999;
      const numB = parseInt(b.match(/^(\d+)-/)?.[1] || "999") || 999;
      return numA - numB;
    });
  } catch (error) {
    logger.warn("扫描部署脚本失败:", error);
  }

  return scripts;
}

/**
 * 根据合约名称查找对应的部署脚本
 */
function findContractScript(contractName: string, scripts: string[]): string | null {
  const normalizedName = contractName.toLowerCase().trim();

  for (const script of scripts) {
    const match = script.match(/^\d+-(.+)\.ts$/);
    if (!match) continue;

    const scriptName = match[1].toLowerCase();

    // 完全匹配
    if (scriptName === normalizedName) {
      return script;
    }

    // 匹配去掉连字符后的名称
    const scriptNameNoDash = scriptName.replace(/-/g, "");
    const normalizedNameNoDash = normalizedName.replace(/-/g, "");
    if (scriptNameNoDash === normalizedNameNoDash) {
      return script;
    }

    // 包含匹配
    if (scriptName.includes(normalizedName) || normalizedName.includes(scriptName)) {
      return script;
    }
  }

  return null;
}

// 创建主命令
const cli = new Command("foundry", "Foundry 智能合约开发工具");

// 初始化命令
cli
  .command("init", "初始化 Foundry 项目")
  .argument({
    name: "projectRoot",
    description: "项目目录名（可选）。不指定则在当前目录初始化；指定则创建该目录并初始化",
    required: false,
  })
  .action(async (args) => {
    const projectRoot = args.length > 0 ? args[0] : undefined;

    try {
      await init(projectRoot);
    } catch (error) {
      logger.error("❌ 初始化失败:", error);
      exit(1);
    }
  });

// 部署命令
cli
  .command("deploy", "部署智能合约")
  .option({
    name: "network",
    alias: "n",
    description:
      "网络名称 (local, testnet, mainnet 等)。如果不指定，将从 .env 文件中的 WEB3_ENV 读取",
    requiresValue: true,
    type: "string",
    required: false,
  })
  .option({
    name: "contract",
    alias: "c",
    description:
      "要部署的合约名称（可选，支持多个，例如: -c contract1 contract2。如果不指定则部署所有合约）",
    requiresValue: true,
    type: "array",
  })
  .option({
    name: "force",
    alias: "f",
    description: "强制重新部署，即使合约已存在",
    type: "boolean",
  })
  .option({
    name: "verify",
    description: "部署后自动验证合约（需要提供 --api-key 或在 .env 文件中设置 ETH_API_KEY）",
    type: "boolean",
  })
  .option({
    name: "api-key",
    description: "Etherscan/BSCScan API Key（验证时需要，如果不提供则从环境变量 ETH_API_KEY 读取）",
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "confirmations",
    description: "等待的区块确认数（默认: local 网络为 0，其他网络为 2）",
    requiresValue: true,
    defaultValue: 2,
    type: "number",
  })
  .action(async (_args, options) => {
    // 全局初始化环境变量
    loadEnv();

    // 获取网络名称（从命令行参数或环境变量）
    const network = getNetworkName(options.network as string | undefined, false);
    if (!network) {
      logger.error("❌ 未指定网络");
      logger.error("   请使用 --network 参数指定网络，或在 .env 文件中设置 WEB3_ENV");
      logger.error("   示例: foundry deploy --network testnet");
      logger.error("   或在 .env 文件中设置: WEB3_ENV=testnet");
      exit(1);
    }

    const finalNetwork: string = network;

    setEnv("WEB3_ENV", finalNetwork);

    // 如果未从命令行指定网络，且从环境变量读取到了，显示提示
    if (!options.network && network !== "local") {
      logger.info(`从 .env 文件读取网络配置: ${network}`);
    }

    const contractsFromArgv = parseContractNamesFromArgv(
      typeof runtimeArgs === "function" ? runtimeArgs() : [],
    );
    const contracts = contractsFromArgv.length > 0
      ? contractsFromArgv
      : (options.contract != null
        ? (Array.isArray(options.contract) ? options.contract : [options.contract as string])
        : undefined);
    const force = options.force as boolean || false;
    const shouldVerify = options.verify as boolean || false;
    const apiKey = options["api-key"] as string | undefined;
    const scriptDir = join(cwd(), "deploy");

    logger.info("🚀 开始部署");
    logger.info("网络:", finalNetwork);
    logger.info("");

    // 加载网络配置
    let config: NetworkConfig;
    try {
      config = loadNetworkConfig(finalNetwork);
      logger.info("RPC URL:", config.rpcUrl);
      logger.info("部署地址:", config.address);
      if (config.chainId) {
        logger.info("链 ID:", config.chainId);
      }
      logger.info("");
    } catch (error) {
      logger.error("加载网络配置失败:", error);
      exit(1);
    }

    // 扫描部署脚本
    const scripts = await scanScripts(scriptDir);
    if (scripts.length === 0) {
      logger.error("❌ 未找到部署脚本");
      logger.error(`   请检查脚本目录: ${scriptDir}`);
      exit(1);
    }

    // 如果使用强制部署，需要用户确认
    if (force) {
      const confirmed = await confirm(
        "⚠️  警告：强制部署将会覆盖当前的ABI文件\n" +
          "是否继续执行强制部署？",
      );

      if (!confirmed) {
        logger.info("操作已取消。");
        exit(0);
      }

      logger.info("");
    }

    // 如果指定了合约，过滤脚本
    let scriptsToRun = scripts;
    if (contracts && contracts.length > 0) {
      const targetScripts: string[] = [];
      const notFoundContracts: string[] = [];

      for (const contract of contracts) {
        const targetScript = findContractScript(contract, scripts);
        if (!targetScript) {
          notFoundContracts.push(contract);
        } else {
          if (!targetScripts.includes(targetScript)) {
            targetScripts.push(targetScript);
          }
        }
      }

      if (notFoundContracts.length > 0) {
        logger.error(`❌ 未找到合约: ${notFoundContracts.join(", ")}`);
        logger.error("\n可用合约:");
        scripts.forEach((script) => {
          const match = script.match(/^\d+-(.+)\.ts$/);
          if (match) {
            logger.error(`  - ${match[1]}`);
          }
        });
        exit(1);
      }

      // 按原始脚本顺序排序
      scriptsToRun = targetScripts.sort((a, b) => {
        const numA = parseInt(a.match(/^(\d+)-/)?.[1] || "999") || 999;
        const numB = parseInt(b.match(/^(\d+)-/)?.[1] || "999") || 999;
        return numA - numB;
      });

      if (contracts.length === 1) {
        logger.info(`📦 部署单个合约: ${contracts[0]} (${scriptsToRun[0]})`);
      } else {
        logger.info(`📦 部署 ${contracts.length} 个合约: ${contracts.join(", ")}`);
        scriptsToRun.forEach((script, index) => {
          const match = script.match(/^\d+-(.+)\.ts$/);
          const contractName = match ? match[1] : script;
          logger.info(`  ${index + 1}. ${script} (${contractName})`);
        });
      }
    } else {
      logger.info(`找到 ${scripts.length} 个部署脚本:`);
      scripts.forEach((script, index) => {
        const match = script.match(/^\d+-(.+)\.ts$/);
        const contractName = match ? match[1] : script;
        logger.info(`  ${index + 1}. ${script} (${contractName})`);
      });
    }

    logger.info("------------------------------------------");

    // 获取项目配置（项目根目录和 deno.json 路径）
    const projectConfig = getProjectConfig();
    if (!projectConfig) {
      exit(1);
    }
    const { projectRoot, denoJsonPath } = projectConfig;

    // 获取 deploy.ts 脚本的路径（使用缓存）
    const deployScriptPath = getScriptPath("deploy");

    // 构建命令行参数
    const deployArgs: string[] = ["--network", finalNetwork];

    if (force) {
      deployArgs.push("--force");
    }

    if (contracts && contracts.length > 0) {
      deployArgs.push("--contract");
      deployArgs.push(...contracts);
    }

    // 添加区块确认数参数
    if (options.confirmations !== undefined) {
      deployArgs.push("--confirmations", String(options.confirmations));
    }

    // 如果启用了验证，传递 --verify 和 --api-key 参数给 deploy 脚本
    // 这样可以在部署每个合约后立即验证，而不是等所有合约部署完再验证
    const finalApiKey = shouldVerify ? getApiKey(apiKey) : null;
    if (shouldVerify) {
      if (!finalApiKey) {
        logger.error("❌ 未指定 API Key");
        logger.error("   请使用 --api-key 参数提供 API Key，或在 .env 文件中设置 ETH_API_KEY");
        logger.error("   示例: foundry deploy --network testnet --verify --api-key YOUR_API_KEY");
        logger.info("");
        exit(1);
      }
      deployArgs.push("--verify");
      deployArgs.push("--api-key", finalApiKey);
    }

    // 执行部署脚本
    try {
      const result = await executeCommand(
        deployScriptPath,
        denoJsonPath,
        projectRoot,
        deployArgs,
      );

      // 处理执行结果（output 已通过 executeCommandWithStream 实时输出，不再重复打印）
      handleCommandResult(result, "✅ 所有部署脚本执行完成！", true);
      logger.info("");

      // 注意：如果启用了 --verify，验证已经在 deploy 脚本中逐个完成
      // 每个合约部署成功后立即验证，无需在此统一验证
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ 部署失败:", errorMessage);
      exit(1);
    }
  });

// 验证命令
cli
  .command("verify", "验证智能合约")
  .option({
    name: "network",
    alias: "n",
    description:
      "网络名称 (local, testnet, mainnet 等)。如果不指定，将从 .env 文件中的 WEB3_ENV 读取",
    requiresValue: true,
    type: "string",
    required: false,
  })
  .option({
    name: "contract",
    alias: "c",
    description: "合约名称（可多个，例如: -c Contract1 Contract2）",
    requiresValue: true,
    type: "array",
    required: true,
  })
  .option({
    name: "address",
    alias: "a",
    description: "合约地址（可选，如果不提供则从 build/abi/{network}/{contract}.json 读取）",
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "rpc-url",
    description: "RPC URL（可选，如果不提供则从配置中读取）",
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "api-key",
    description: "Etherscan/BSCScan API Key（可选，如果不提供则从环境变量 ETH_API_KEY 读取）",
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "chain-id",
    description: "链 ID（可选，如果不提供则从配置中读取）",
    requiresValue: true,
    type: "number",
  })
  .action(async (_args, options) => {
    // 全局初始化环境变量
    loadEnv();

    // 获取网络名称（从命令行参数或环境变量）
    const network = getNetworkName(options.network as string | undefined, false);
    if (!network) {
      logger.error("❌ 未指定网络");
      logger.error("   请使用 --network 参数指定网络，或在 .env 文件中设置 WEB3_ENV");
      logger.error("   示例: foundry verify --network testnet --contract Contract1");
      logger.error("   或在 .env 文件中设置: WEB3_ENV=testnet");
      exit(1);
    }

    const finalNetwork: string = network;

    setEnv("WEB3_ENV", finalNetwork);

    // 如果未从命令行指定网络，且从环境变量读取到了，显示提示
    if (!options.network && network !== "local") {
      logger.info(`从 .env 文件读取网络配置: ${network}`);
    }

    const contractsFromArgv = parseContractNamesFromArgv(
      typeof runtimeArgs === "function" ? runtimeArgs() : [],
    );
    const contractNames = contractsFromArgv.length > 0
      ? contractsFromArgv
      : (Array.isArray(options.contract)
        ? options.contract
        : options.contract != null
        ? [options.contract as string]
        : []);
    if (contractNames.length === 0) {
      logger.error("❌ 未指定合约名称");
      logger.error(
        "   请使用 --contract (-c) 参数指定合约名称，可指定多个，例如: -c Contract1 Contract2",
      );
      exit(1);
    }
    const address = options.address as string | undefined;
    const rpcUrl = options["rpc-url"] as string | undefined;
    const chainId = options["chain-id"] as number | undefined;

    // 获取 API Key（从命令行参数或环境变量）
    const apiKey = getApiKey(options["api-key"] as string | undefined);
    if (!apiKey) {
      logger.error("❌ 未指定 API Key");
      logger.error("   请使用 --api-key 参数或设置环境变量 ETH_API_KEY");
      logger.error("   可以在 .env 文件中设置: ETH_API_KEY=your-api-key");
      exit(1);
    }

    logger.info("------------------------------------------");
    logger.info("🔍 开始验证合约");
    logger.info("------------------------------------------");
    logger.info("网络:", finalNetwork);
    logger.info("合约名称:", contractNames.join(", "));
    logger.info("------------------------------------------");
    logger.info("");

    // 获取项目配置（项目根目录和 deno.json 路径）
    const projectConfig = getProjectConfig();
    if (!projectConfig) {
      exit(1);
    }
    const { projectRoot, denoJsonPath } = projectConfig;

    // 获取 verify.ts 脚本的路径（使用缓存）
    const verifyScriptPath = getScriptPath("verify");

    // 构建命令行参数，支持多合约：--contract a b c
    const verifyArgs: string[] = [
      "--network",
      finalNetwork,
      "--contract",
      ...contractNames,
      "--api-key",
      apiKey!,
    ];

    if (address) {
      verifyArgs.push("--address");
      verifyArgs.push(address);
    }

    if (rpcUrl) {
      verifyArgs.push("--rpc-url");
      verifyArgs.push(rpcUrl);
    }

    if (chainId) {
      verifyArgs.push("--chain-id");
      verifyArgs.push(chainId.toString());
    }

    // 执行验证脚本
    try {
      const result = await executeCommand(
        verifyScriptPath,
        denoJsonPath,
        projectRoot,
        verifyArgs,
      );

      // 处理执行结果（output 已实时流式输出，不再重复打印）
      handleCommandResult(result, undefined, true);

      logger.info("");
      logger.info("------------------------------------------");
      logger.info("✅ 合约验证成功！");
      logger.info("------------------------------------------");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ 验证失败:", errorMessage);
      exit(1);
    }
  });

// 运行脚本命令
cli
  .command("run", "执行 TypeScript 脚本")
  .option({
    name: "network",
    alias: "n",
    description:
      "网络名称 (local, testnet, mainnet 等)。如果不指定，将从 .env 文件中的 WEB3_ENV 读取",
    requiresValue: true,
    type: "string",
    required: false,
    defaultValue: getEnv("WEB3_ENV") ?? DEFAULT_NETWORK,
    validator: (value) => {
      if (value !== "local" && value !== "testnet" && value !== "mainnet") {
        return "网络名称必须是 local、testnet 或 mainnet";
      }
      return true;
    },
  })
  .action(async (args, options) => {
    // 全局初始化环境变量
    loadEnv();

    // 获取脚本路径（第一个位置参数）
    const scriptPath = args[0];

    if (!scriptPath) {
      logger.error("❌ 未指定脚本路径");
      logger.error("   用法: foundry run <script.ts> [--network <network>]");
      logger.error("   示例: foundry run scripts/test.ts --network local");
      exit(1);
    }

    // 获取项目配置
    const projectConfig = getProjectConfig();
    if (!projectConfig) {
      logger.error("❌ 未找到项目根目录（包含 deno.json 或 package.json 的目录）");
      exit(1);
    }
    const { projectRoot, denoJsonPath } = projectConfig;

    // 构建完整的脚本路径
    const fullScriptPath = scriptPath.startsWith("/") ? scriptPath : join(projectRoot, scriptPath);

    // 检查脚本是否存在
    if (!existsSync(fullScriptPath)) {
      logger.error(`❌ 脚本不存在: ${fullScriptPath}`);
      exit(1);
    }

    // 获取网络名称（从命令行参数或环境变量）
    const network = getNetworkName(options.network as string, false);

    // 确定最终的网络名称
    const finalNetwork = network ?? getEnv("WEB3_ENV") ?? DEFAULT_NETWORK;

    // 设置环境变量
    setEnv("WEB3_ENV", finalNetwork);

    logger.info(`🌐 网络: ${finalNetwork}`);
    logger.info(`🚀 执行脚本: ${scriptPath}`);
    logger.info("------------------------------------------");

    // 构建命令行参数（传递剩余的位置参数给脚本）
    const scriptArgs: string[] = args.slice(1);

    // 构建额外的环境变量，确保 WEB3_ENV 被正确传递给子进程
    const extraEnv: Record<string, string> = {
      WEB3_ENV: finalNetwork,
    };

    // 执行脚本
    try {
      const result = await executeCommand(
        fullScriptPath,
        denoJsonPath,
        projectRoot,
        scriptArgs,
        extraEnv,
      );

      // 处理执行结果
      if (!result.success) {
        logger.error("❌ 脚本执行失败");
        exit(1);
      }

      logger.info("");
      logger.info("------------------------------------------");
      logger.info("✅ 脚本执行完成！");
      logger.info("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ 脚本执行失败:", errorMessage);
      exit(1);
    }
  });

// 构建命令
cli
  .command("build", "编译 Solidity 合约（执行 forge build）")
  .option({
    name: "sizes",
    alias: "s",
    description: "显示合约大小",
    type: "boolean",
  })
  .option({
    name: "force",
    alias: "f",
    description: "强制重新编译所有合约",
    type: "boolean",
  })
  .option({
    name: "optimizer-runs",
    description: "优化器运行次数（默认 200）",
    requiresValue: true,
    type: "number",
  })
  .action(async (_args, options) => {
    logger.info("🔨 编译 Solidity 合约");
    logger.info("------------------------------------------");

    // 构建 forge build 参数
    const forgeArgs: string[] = ["build"];

    // 显示合约大小
    if (options.sizes as boolean) {
      forgeArgs.push("--sizes");
    }

    // 强制重新编译
    if (options.force as boolean) {
      forgeArgs.push("--force");
    }

    // 优化器运行次数
    const optimizerRuns = options["optimizer-runs"] as number | undefined;
    if (optimizerRuns) {
      forgeArgs.push("--optimizer-runs", String(optimizerRuns));
    }

    // 使用 createCommand 执行 forge build
    try {
      const cmd = createCommand("forge", {
        args: forgeArgs,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });

      const child = cmd.spawn();
      const status = await child.status;

      if (!status.success) {
        logger.error("❌ 编译失败");
        exit(status.code ?? 1);
      }

      logger.info("");
      logger.info("------------------------------------------");
      logger.info("✅ 编译完成！");
      logger.info("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ 编译失败:", errorMessage);
      exit(1);
    }
  });

// 测试命令
cli
  .command("test", "运行测试（兼容 deno test 和 bun test）")
  .option({
    name: "network",
    alias: "n",
    description:
      "网络名称 (local, testnet, mainnet 等)。如果不指定，将从 .env 文件中的 WEB3_ENV 读取",
    requiresValue: true,
    type: "string",
    required: false,
    defaultValue: getEnv("WEB3_ENV") ?? DEFAULT_NETWORK,
    validator: (value) => {
      // 测试必须是 local、testnet，不允许主网测试
      if (value !== "local" && value !== "testnet" && value !== "mainnet") {
        return "网络名称必须是 local、testnet、mainnet";
      }
      return true;
    },
  })
  .option({
    name: "filter",
    alias: "f",
    description: "过滤测试名称（正则表达式）",
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "watch",
    alias: "w",
    description: "监听文件变化并重新运行测试",
    type: "boolean",
  })
  .option({
    name: "coverage",
    description: "生成代码覆盖率报告（仅 Deno）",
    type: "boolean",
  })
  .option({
    name: "concurrency",
    alias: "j",
    description: "最大并发数（仅 Bun，默认为 CPU 核心数）",
    requiresValue: true,
    type: "number",
  })
  .action(async (args, options) => {
    // 全局初始化环境变量
    loadEnv();

    // 获取项目配置
    const projectConfig = getProjectConfig();
    if (!projectConfig) {
      logger.error("❌ 未找到项目根目录（包含 deno.json 或 package.json 的目录）");
      exit(1);
    }
    const { projectRoot, denoJsonPath } = projectConfig;

    // 检测运行时
    const hasDeno = existsSync(join(projectRoot, "deno.json"));
    const hasPackageJson = existsSync(join(projectRoot, "package.json"));
    const runtime = hasDeno ? "deno" : (hasPackageJson ? "bun" : "deno");

    // 获取网络名称（从命令行参数或环境变量）
    const network = getNetworkName(options.network as string | undefined, false);

    // 设置环境变量
    setEnv("WEB3_ENV", network ?? getEnv("WEB3_ENV") ?? DEFAULT_NETWORK as string);

    // 构建测试命令参数
    const testArgs: string[] = ["test"];

    if (runtime === "deno") {
      // Deno 测试参数
      testArgs.push("-A"); // 授予所有权限

      if (denoJsonPath) {
        testArgs.push("--config", denoJsonPath);
      }

      if (options.filter) {
        testArgs.push("--filter", options.filter as string);
      }

      if (options.watch) {
        testArgs.push("--watch");
      }

      if (options.coverage) {
        testArgs.push("--coverage");
      }
    } else {
      // Bun 测试参数
      if (options.filter) {
        testArgs.push("--filter", options.filter as string);
      }

      if (options.watch) {
        testArgs.push("--watch");
      }

      // Bun 不支持 --coverage 选项（使用不同的方式）
      if (options.coverage) {
        logger.warn("⚠️  Bun 暂不支持 --coverage 选项");
      }

      // Bun 的 --concurrency 选项（控制并发数）
      if (options.concurrency) {
        testArgs.push("--concurrency", String(options.concurrency));
      }
    }

    // 添加位置参数（测试文件路径）
    if (args.length > 0) {
      testArgs.push(...args);
    }

    logger.info(`🧪 运行测试 (${runtime})`);
    logger.info(`🌐 网络: ${network}`);
    logger.info("------------------------------------------");

    // 获取当前进程的所有环境变量，并确保 WEB3_ENV 被正确设置
    const envVars: Record<string, string> = { ...(getEnvAll() ?? {}) };
    if (network) {
      envVars.WEB3_ENV = network;
    }

    // 执行测试命令
    // 使用 createCommand + spawn，确保输出实时显示且 Ctrl+C 能正常终止
    try {
      const cmd = createCommand(runtime, {
        args: testArgs,
        cwd: projectRoot,
        env: envVars,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });

      // spawn() 启动进程，status 等待完成
      const child = cmd.spawn();
      const status = await child.status;

      if (!status.success) {
        exit(status.code ?? 1);
      }

      logger.info("------------------------------------------");
      logger.info("✅ 测试完成！");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ 测试执行失败:", errorMessage);
      exit(1);
    }
  });

// 升级命令
cli
  .command("upgrade", "升级 Foundry CLI 到最新版本")
  .option({
    name: "beta",
    description: "升级到最新的 beta 版本（默认只升级到正式版）",
    type: "boolean",
  })
  .option({
    name: "force",
    alias: "f",
    description: "强制刷新版本缓存，从 JSR 重新获取最新版本",
    type: "boolean",
  })
  .action(async (_args, options) => {
    const includeBeta = options.beta === true;

    logger.info("");

    try {
      // 获取当前版本
      const currentVersion = await getVersion();
      if (!currentVersion) {
        logger.error("❌ 无法获取当前版本号 \n");
        exit(1);
      }

      // 检查更新时，总是从网络获取最新版本，不使用缓存
      // 因为需要比较当前版本和最新版本，读取缓存版本号无法正确比较
      const progressBar = createLoadingProgressBar("正在检查更新...");
      const progressInterval = progressBar.start();

      const latestVersion = await getLatestVersion(includeBeta, true); // 总是强制刷新，从网络获取

      // 停止进度条
      progressBar.stop(progressInterval);

      if (!latestVersion) {
        logger.error("❌ 无法获取最新版本号 \n");
        exit(1);
      }

      // 比较版本
      const comparison = compareVersions(latestVersion, currentVersion);
      if (comparison <= 0) {
        logger.info(
          `✅ 当前已经是最新${includeBeta ? "（包括 beta）" : "正式"}版本，无需更新！\n`,
        );
        return;
      }

      // 有新版本，直接升级
      // 获取包信息
      const packageInfo = parseJsrPackageFromUrl();
      const packageName = packageInfo?.packageName || "@dreamer/foundry";

      // 构建升级命令（使用最新版本）
      const cliUrl = `jsr:${packageName}@${latestVersion}/cli`;
      const args = [
        "install",
        "-A",
        "--global",
        "--force",
        "--name",
        "foundry",
        cliUrl,
      ];

      // 显示升级安装的 loading 提示
      const installProgressBar = createLoadingProgressBar("升级安装中...");
      const installProgressInterval = installProgressBar.start();

      try {
        // 根据运行时环境选择正确的命令
        const runtime = IS_BUN ? "bun" : "deno";
        const cmd = createCommand(runtime, {
          args: args,
          stdout: "piped",
          stderr: "piped",
        });

        const output = await cmd.output();
        const stderrText = new TextDecoder().decode(output.stderr);

        // 停止进度条
        installProgressBar.stop(installProgressInterval);

        if (output.success) {
          // 安装成功后，更新版本缓存
          try {
            await setInstalledVersion(latestVersion, packageName);
          } catch {
            // 忽略缓存更新失败
          }

          logger.info(`✅ 已升级到 ${latestVersion}`);
        } else {
          logger.error("❌ 升级失败");
          if (stderrText) {
            logger.error(stderrText);
          }
          exit(1);
        }
      } catch (error) {
        // 发生错误时停止进度条
        installProgressBar.stop(installProgressInterval);
        throw error;
      }
      logger.info("");
    } catch (error) {
      logger.error("\n❌ 升级过程中发生错误:", error, "\n");
      exit(1);
    }
  });

// 卸载命令
cli
  .command("uninstall", "卸载 Foundry CLI 全局命令")
  .action(async () => {
    logger.info("===========================================");
    logger.info("🗑️  卸载 Foundry CLI");
    logger.info("===========================================");
    logger.info("");

    try {
      // 查找 foundry 的实际安装路径
      const foundryPath = await findFoundryPath();

      if (!foundryPath) {
        logger.warn("⚠️  Foundry CLI 未找到，可能已经卸载");
        logger.info("");
        logger.info("如果已安装但未找到，请手动检查以下常见路径：");
        const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
        if (homeDir) {
          logger.info(`  ${join(homeDir, ".deno", "bin", "foundry")}`);
          logger.info(`  ${join(homeDir, ".bun", "bin", "foundry")}`);
        }
        return;
      }

      // 显示找到的路径并要求用户确认
      logger.info(`找到 Foundry CLI 安装路径: ${foundryPath}`);
      logger.info("");

      const confirmed = await confirm(
        "⚠️  警告：此操作将删除 Foundry CLI 全局命令。\n" +
          "是否确认卸载？",
      );

      if (!confirmed) {
        logger.info("操作已取消。");
        return;
      }

      try {
        if (existsSync(foundryPath)) {
          await remove(foundryPath);
          logger.info("✅ Foundry CLI 已卸载");
          logger.info(`   已删除: ${foundryPath}`);
        } else {
          logger.warn("⚠️  Foundry CLI 未找到，可能已经卸载");
          logger.info(`   预期路径: ${foundryPath}`);
        }
      } catch (error) {
        logger.error("❌ 卸载失败:", error);
        logger.info("");
        logger.info("请手动删除以下文件：");
        logger.info(`  ${foundryPath}`);
        exit(1);
      }
    } catch (error) {
      logger.error("❌ 卸载过程中发生错误:", error);
      exit(1);
    }
  });

// 执行 CLI
if (import.meta.main) {
  // 在 CLI 执行前等待版本号设置完成
  try {
    const version = await getVersion();
    if (version) {
      const versionStr = `\n\x1b[36mFoundry CLI\x1b[0m
\x1b[1m\x1b[36mVersion:\x1b[0m \x1b[33m${version}\x1b[0m

\x1b[90mFoundry + Deno 打造的智能合约开发工具\x1b[0m
\x1b[90m用于创建项目、编译、测试、部署、验证智能合约\x1b[0m \n`;
      cli.setVersion(versionStr);
    }
  } catch {
    // 如果获取版本号失败，忽略错误（版本号是可选的）
  }

  await cli.execute();
}
