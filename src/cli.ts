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
 * foundry deploy --network testnet --contract MyToken
 *
 * # Verify contract
 * foundry verify --network testnet --contract MyToken --api-key YOUR_API_KEY
 * ```
 */

import { Command } from "@dreamer/console";
import { existsSync, readdir, cwd, getEnv, join, readTextFileSync, readStdin, dirname, platform } from "@dreamer/runtime-adapter";
import { logger } from "./utils/logger.ts";
import { verify } from "./verify.ts";
import { init } from "./init.ts";
import { loadEnv } from "./utils/env.ts";
import type { NetworkConfig } from "./utils/deploy-utils.ts";
import { loadWeb3ConfigSync } from "./utils/web3.ts";

/**
 * 查找项目根目录（包含 deno.json 或 package.json 的目录）
 * @param startDir - 起始目录，默认为当前工作目录
 * @returns 项目根目录，如果未找到则返回 null
 */
function findProjectRoot(startDir: string): string | null {
  let currentDir = startDir;
  const plat = platform();
  const root = plat === "windows" ? /^[A-Z]:\\$/ : /^\/$/;

  while (true) {
    // 同时检查 deno.json（Deno）和 package.json（Bun）
    const denoJsonPath = join(currentDir, "deno.json");
    const packageJsonPath = join(currentDir, "package.json");

    if (existsSync(denoJsonPath) || existsSync(packageJsonPath)) {
      return currentDir;
    }

    // 检查是否到达根目录
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir || currentDir.match(root)) {
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * 提示用户确认
 * @param message 提示信息
 * @returns 用户确认返回 true，否则返回 false
 */
async function confirm(message: string): Promise<boolean> {
  console.warn(message);
  console.log("请输入 'yes' 或 'y' 确认，其他任何输入将取消操作：");

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
 * 从框架的 deno.json 读取版本号
 * @returns 版本号字符串，如果读取失败则返回 undefined
 */
function getVersion(): string | undefined {
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
  } catch (error) {
    logger.warn("无法读取框架 deno.json 版本号:", error);
  }
  return undefined;
}

/**
 * 加载网络配置
 * 优先从环境变量加载，如果没有则尝试从 config/web3.json 加载
 */
async function loadNetworkConfig(_network: string): Promise<NetworkConfig> {
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
        rpcUrl: web3Config.host,
        privateKey: account.privateKey,
        address: account.address,
        chainId: web3Config.chainId,
      };
    }
  } catch (error) {
    logger.warn("无法从 config/web3.json 加载配置:", error);
    // 输出更详细的错误信息以便调试
    if (error instanceof Error) {
      logger.warn(`错误详情: ${error.message}`);
      if (error.stack) {
        logger.warn(`错误堆栈: ${error.stack}`);
      }
    }
  }

  // 如果都加载失败，尝试从 .env 文件加载
  try {
    const env = await loadEnv();
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
const cli = new Command("foundry", "Foundry 部署和验证工具");

// 设置版本号（从 deno.json 读取）
const version = getVersion();
if (version) {
  cli.setVersion(version);
}

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
      Deno.exit(1);
    }
  });

// 部署命令
cli
  .command("deploy", "部署智能合约")
  .option({
    name: "network",
    alias: "n",
    description: "网络名称 (local, testnet, mainnet 等)。如果不指定，将从 .env 文件中的 WEB3_ENV 读取",
    requiresValue: true,
    type: "string",
    required: false,
  })
  .option({
    name: "contract",
    alias: "c",
    description: "要部署的合约名称（可选，支持多个，例如: -c contract1 contract2。如果不指定则部署所有合约）",
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
  .action(async (_args, options) => {
    // 如果未指定网络，尝试从 .env 文件读取 WEB3_ENV
    let network = options.network as string | undefined;
    if (!network) {
      try {
        const env = await loadEnv();
        network = env.WEB3_ENV || getEnv("WEB3_ENV");
        if (!network) {
          logger.error("❌ 未指定网络");
          logger.error("   请使用 --network 参数指定网络，或在 .env 文件中设置 WEB3_ENV");
          logger.error("   示例: foundry deploy --network testnet");
          logger.error("   或在 .env 文件中设置: WEB3_ENV=testnet");
          Deno.exit(1);
        }
        logger.info(`从 .env 文件读取网络配置: ${network}`);
      } catch {
        logger.error("❌ 未指定网络且无法读取 .env 文件");
        logger.error("   请使用 --network 参数指定网络");
        logger.error("   示例: foundry deploy --network testnet");
        Deno.exit(1);
      }
    }

    // 此时 network 一定不是 undefined
    const finalNetwork = network as string;

    const contracts = options.contract as string[] | undefined;
    const force = options.force as boolean || false;
    const shouldVerify = options.verify as boolean || false;
    const apiKey = options["api-key"] as string | undefined;
    const scriptDir = join(cwd(), "script");

    // 如果使用强制部署，需要用户确认
    if (force) {
      const confirmed = await confirm(
        "⚠️  警告：强制部署模式将重新部署所有合约，即使合约已存在。\n" +
        "是否继续执行强制部署？"
      );

      if (!confirmed) {
        logger.info("操作已取消。");
        Deno.exit(0);
      }
    }

    logger.info("🚀 开始部署");
    logger.info("网络:", finalNetwork);
    logger.info("");

    // 加载网络配置
    let config: NetworkConfig;
    try {
      config = await loadNetworkConfig(finalNetwork);
      logger.info("RPC URL:", config.rpcUrl);
      logger.info("部署地址:", config.address);
      if (config.chainId) {
        logger.info("链 ID:", config.chainId);
      }
      logger.info("");
    } catch (error) {
      logger.error("加载网络配置失败:", error);
      Deno.exit(1);
    }

    // 扫描部署脚本
    const scripts = await scanScripts(scriptDir);
    if (scripts.length === 0) {
      logger.error("❌ 未找到部署脚本");
      logger.error(`   请检查脚本目录: ${scriptDir}`);
      Deno.exit(1);
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
        Deno.exit(1);
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

    logger.info("");
    logger.info("------------------------------------------");
    
    // 查找项目根目录（包含 deno.json 的目录）
    const projectRoot = findProjectRoot(cwd());
    if (!projectRoot) {
      logger.error("❌ 未找到项目根目录（包含 deno.json 的目录）");
      Deno.exit(1);
    }

    // 获取项目的 deno.json 路径
    const denoJsonPath = join(projectRoot, "deno.json");
    if (!existsSync(denoJsonPath)) {
      logger.error(`❌ 未找到项目的 deno.json 文件: ${denoJsonPath}`);
      Deno.exit(1);
    }

    // 获取 deploy.ts 脚本的路径
    // 如果是从 JSR 包运行的，使用 JSR URL；否则使用文件路径
    let deployScriptPath: string;
    const currentFileUrl = import.meta.url;
    
    if (currentFileUrl.startsWith("https://jsr.io/") || currentFileUrl.startsWith("jsr:")) {
      // 从 JSR URL 解析包名和版本
      const jsrMatch = currentFileUrl.match(/jsr:([^@]+)@([^/]+)\//) || 
                       currentFileUrl.match(/https:\/\/jsr\.io\/([^@]+)@([^/]+)\//);
      if (jsrMatch) {
        const [, packageName, version] = jsrMatch;
        deployScriptPath = `jsr:${packageName}@${version}/deploy`;
      } else {
        // 如果无法解析，尝试使用相对路径
        const currentDir = dirname(currentFileUrl.replace(/^file:\/\//, ""));
        deployScriptPath = join(currentDir, "deploy.ts");
      }
    } else {
      // 本地运行，使用文件路径
      const currentDir = dirname(currentFileUrl.replace(/^file:\/\//, ""));
      deployScriptPath = join(currentDir, "deploy.ts");
    }

    // 构建命令行参数
    const deployArgs: string[] = [
      "run",
      "-A",
      "--config",
      denoJsonPath,
      deployScriptPath,
      "--network",
      finalNetwork,
    ];

    if (force) {
      deployArgs.push("--force");
    }

    if (contracts && contracts.length > 0) {
      deployArgs.push("--contract");
      deployArgs.push(...contracts);
    }

    // 执行部署脚本
    try {
      const cmd = new Deno.Command("deno", {
        args: deployArgs,
        stdout: "piped",
        stderr: "piped",
        cwd: projectRoot,
      });

      const output = await cmd.output();
      const stdoutText = new TextDecoder().decode(output.stdout);
      const stderrText = new TextDecoder().decode(output.stderr);

      // 输出脚本的标准输出
      if (stdoutText) {
        console.log(stdoutText);
      }

      if (!output.success) {
        // 输出错误信息
        if (stderrText) {
          logger.error(stderrText);
        }
        Deno.exit(1);
      }

      logger.info("");
      logger.info("✅ 所有部署脚本执行完成！");

      // 如果启用了验证，自动验证所有部署的合约
      if (shouldVerify) {
        logger.info("");
        logger.info("------------------------------------------");
        logger.info("🔍 开始验证合约...");
        logger.info("------------------------------------------");

        // 获取 API Key
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
          logger.error("   请使用 --api-key 参数提供 API Key，或在 .env 文件中设置 ETH_API_KEY");
          logger.error("   示例: foundry deploy --network testnet --verify --api-key YOUR_API_KEY");
          Deno.exit(1);
        }

        // 确定要验证的合约列表
        const contractsToVerify: string[] = [];
        if (contracts && contracts.length > 0) {
          // 如果指定了合约，验证这些合约
          for (const contract of contracts) {
            const targetScript = findContractScript(contract, scripts);
            if (targetScript) {
              const match = targetScript.match(/^\d+-(.+)\.ts$/);
              if (match) {
                contractsToVerify.push(match[1]);
              }
            }
          }
        } else {
          // 如果没有指定合约，验证所有部署脚本对应的合约
          for (const script of scripts) {
            const match = script.match(/^\d+-(.+)\.ts$/);
            if (match) {
              contractsToVerify.push(match[1]);
            }
          }
        }

        // 导入 loadContract 函数
        const { loadContract } = await import("./utils/deploy-utils.ts");

        // 验证每个合约
        for (let i = 0; i < contractsToVerify.length; i++) {
          const contractName = contractsToVerify[i];
          logger.info(`[${i + 1}/${contractsToVerify.length}] 验证合约: ${contractName}`);

          try {
            // 读取已部署的合约信息
            const contractInfo = loadContract(contractName, finalNetwork);

            if (!contractInfo || !contractInfo.address) {
              logger.warn(`⚠️  合约 ${contractName} 未找到部署信息，跳过验证`);
              continue;
            }

            // 调用验证函数
            await verify({
              address: contractInfo.address,
              contractName: contractName,
              network: finalNetwork,
              apiKey: finalApiKey,
              rpcUrl: config.rpcUrl,
              constructorArgs: contractInfo.args,
              chainId: config.chainId,
            });

            logger.info(`✅ ${contractName} 验证成功`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`❌ ${contractName} 验证失败: ${errorMessage}`);
            // 验证失败不中断流程，继续验证其他合约
          }
        }

        logger.info("");
        logger.info("✅ 所有合约验证完成！");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("❌ 部署失败:", errorMessage);
      Deno.exit(1);
    }
  });

// 验证命令
cli
  .command("verify", "验证智能合约")
  .option({
    name: "network",
    alias: "n",
    description: "网络名称 (local, testnet, mainnet 等)。如果不指定，将从 .env 文件中的 WEB3_ENV 读取",
    requiresValue: true,
    type: "string",
    required: false,
  })
  .option({
    name: "contract",
    alias: "c",
    description: "合约名称",
    requiresValue: true,
    type: "string",
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
    // 如果未指定网络，尝试从 .env 文件读取 WEB3_ENV
    let network = options.network as string | undefined;
    if (!network) {
      try {
        const env = await loadEnv();
        network = env.WEB3_ENV || getEnv("WEB3_ENV");
        if (!network) {
          logger.error("❌ 未指定网络");
          logger.error("   请使用 --network 参数指定网络，或在 .env 文件中设置 WEB3_ENV");
          logger.error("   示例: foundry verify --network testnet --contract MyToken");
          logger.error("   或在 .env 文件中设置: WEB3_ENV=testnet");
          Deno.exit(1);
        }
        logger.info(`从 .env 文件读取网络配置: ${network}`);
      } catch (_error) {
        logger.error("❌ 未指定网络且无法读取 .env 文件");
        logger.error("   请使用 --network 参数指定网络");
        logger.error("   示例: foundry verify --network testnet --contract MyToken");
        Deno.exit(1);
      }
    }

    // 此时 network 一定不是 undefined
    const finalNetwork = network as string;

    const contractName = options.contract as string;
    let apiKey = options["api-key"] as string | undefined;
    const address = options.address as string | undefined;
    const rpcUrl = options["rpc-url"] as string | undefined;
    const chainId = options["chain-id"] as number | undefined;

    // 如果未提供 API Key，尝试从环境变量读取
    if (!apiKey) {
      try {
        const env = await loadEnv();
        apiKey = env.ETH_API_KEY || getEnv("ETH_API_KEY");
      } catch {
        // 如果加载 .env 失败，尝试直接从环境变量读取
        apiKey = getEnv("ETH_API_KEY");
      }
    }

    if (!apiKey) {
      logger.error("❌ 未指定 API Key");
      logger.error("   请使用 --api-key 参数或设置环境变量 ETH_API_KEY");
      logger.error("   可以在 .env 文件中设置: ETH_API_KEY=your-api-key");
      Deno.exit(1);
    }

    logger.info("------------------------------------------");
    logger.info("🔍 开始验证合约");
    logger.info("------------------------------------------");
    logger.info("网络:", finalNetwork);
    logger.info("合约名称:", contractName);
    logger.info("------------------------------------------");
    logger.info("");

    // 确定合约地址
    let contractAddress = address;
    let contractInfo: any = null;
    if (!contractAddress) {
      try {
        const { loadContract } = await import("./utils/deploy-utils.ts");
        contractInfo = loadContract(contractName, finalNetwork);
        contractAddress = contractInfo.address;
        logger.info("从部署记录读取合约地址:", contractAddress);
      } catch {
        logger.error("❌ 无法读取合约地址，请使用 --address 参数指定");
        Deno.exit(1);
      }
    } else {
      // 如果提供了地址，也尝试加载合约信息以获取构造函数参数
      try {
        const { loadContract } = await import("./utils/deploy-utils.ts");
        contractInfo = loadContract(contractName, finalNetwork);
      } catch {
        // 如果加载失败，忽略，使用命令行参数
      }
    }

    // 如果没有提供构造函数参数，尝试从合约信息中读取
    let finalConstructorArgs: string[] | undefined;
    if (contractInfo && contractInfo.args) {
      finalConstructorArgs = contractInfo.args;
      if (finalConstructorArgs && finalConstructorArgs.length > 0) {
        logger.info("从部署记录读取构造函数参数:", finalConstructorArgs.join(", "));
      }
    }

    // 确定 RPC URL 和链 ID
    let finalRpcUrl = rpcUrl;
    let finalChainId = chainId;

    if (!finalRpcUrl || !finalChainId) {
      try {
        const config = await loadNetworkConfig(finalNetwork);
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

    logger.info("合约地址:", contractAddress);
    logger.info("RPC URL:", finalRpcUrl);
    logger.info("链 ID:", finalChainId);
    if (finalConstructorArgs && finalConstructorArgs.length > 0) {
      logger.info("构造函数参数:", finalConstructorArgs.join(", "));
    }
    logger.info("");

    // 执行验证
    try {
      await verify({
        address: contractAddress!,
        contractName,
        network: finalNetwork,
        apiKey: apiKey!,
        rpcUrl: finalRpcUrl!,
        chainId: finalChainId,
        constructorArgs: finalConstructorArgs || undefined,
      });

      logger.info("");
      logger.info("------------------------------------------");
      logger.info("✅ 合约验证成功！");
      logger.info("------------------------------------------");
    } catch (error) {
      logger.error("❌ 验证失败:", error);
      Deno.exit(1);
    }
  });

// 执行 CLI
if (import.meta.main) {
  await cli.execute();
}
