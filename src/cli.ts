#!/usr/bin/env -S deno run -A
/**
 * @title Foundry CLI
 * @description Foundry 部署和验证命令行工具
 * 使用 @dreamer/console 和 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 *
 * @example
 * ```bash
 * # 部署所有合约到测试网
 * deno run -A cli.ts deploy --network testnet
 *
 * # 部署指定合约
 * deno run -A cli.ts deploy --network testnet --contract MyToken
 *
 * # 验证合约
 * deno run -A cli.ts verify --network testnet --contract MyToken --api-key YOUR_API_KEY
 * ```
 */

import { Command } from "jsr:@dreamer/console@^1.0.3-beta.6";
import { existsSync, readdir, cwd, getEnv, join, readTextFileSync } from "jsr:@dreamer/runtime-adapter@^1.0.0-beta.19";
import { logger } from "./utils/logger.ts";
import { deploy } from "./deploy.ts";
import { verify } from "./verify.ts";
import { init } from "./init.ts";
import { loadEnv } from "./utils/env.ts";
import type { NetworkConfig } from "./utils/deploy-utils.ts";

/**
 * 从 deno.json 读取版本号
 * @returns 版本号字符串，如果读取失败则返回 undefined
 */
function getVersion(): string | undefined {
  try {
    const denoJsonPath = join(cwd(), "deno.json");
    if (existsSync(denoJsonPath)) {
      const denoJsonContent = readTextFileSync(denoJsonPath);
      const denoJson = JSON.parse(denoJsonContent);
      return denoJson.version;
    }
  } catch (error) {
    logger.warn("无法读取 deno.json 版本号:", error);
  }
  return undefined;
}

/**
 * 加载网络配置
 * 优先从环境变量加载，如果没有则尝试从 config/web3.ts 加载
 */
async function loadNetworkConfig(network: string): Promise<NetworkConfig> {
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

  // 尝试从 config/web3.ts 加载
  try {
    const configPath = join(cwd(), "config", "web3.ts");
    if (existsSync(configPath)) {
      const configUrl = new URL(`file://${configPath}`).href;
      const configModule = await import(configUrl);

      // 设置环境变量
      const web3Env = getEnv("WEB3_ENV") || network;

      let networkConfig: any = null;
      if (configModule.Web3Config && configModule.Web3Config[web3Env]) {
        networkConfig = configModule.Web3Config[web3Env];
      } else if (configModule.Web3Config && configModule.Web3Config.local) {
        networkConfig = configModule.Web3Config.local;
      }

      if (networkConfig && networkConfig.accounts && networkConfig.accounts.length > 0) {
        const account = networkConfig.accounts[0];
        return {
          rpcUrl: networkConfig.host || networkConfig.rpcUrl,
          privateKey: account.privateKey,
          address: account.address,
          chainId: networkConfig.chainId,
        };
      }
    }
  } catch (error) {
    logger.warn("无法从 config/web3.ts 加载配置:", error);
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
    logger.error("无法加载网络配置，请设置环境变量或创建 config/web3.ts 配置文件");
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
    description: "网络名称（local, testnet, mainnet 等）",
    requiresValue: true,
    type: "string",
    required: true,
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
  .action(async (_args, options) => {
    const network = options.network as string;
    const contracts = options.contract as string[] | undefined;
    const force = options.force as boolean || false;
    const scriptDir = join(cwd(), "script");

    logger.info("------------------------------------------");
    logger.info("🚀 开始部署");
    logger.info("------------------------------------------");
    logger.info("网络:", network);
    logger.info("强制部署:", force ? "是" : "否");
    logger.info("------------------------------------------");
    logger.info("");

    // 加载网络配置
    let config: NetworkConfig;
    try {
      config = await loadNetworkConfig(network);
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

    // 执行部署
    try {
      await deploy({
        scriptDir,
        network,
        config,
        force,
        contracts: contracts,
      });

      logger.info("");
      logger.info("------------------------------------------");
      logger.info("✅ 所有部署脚本执行完成！");
      logger.info("------------------------------------------");
      logger.info("");
      logger.info("下一步:");
      logger.info(`  验证合约: foundry verify --network ${network} --contract <合约名>`);
      logger.info(`  或: foundry verify --network ${network} --contract <合约名> --api-key <API_KEY>`);
      logger.info(`  注意: 如果设置了环境变量 ETH_API_KEY，可以省略 --api-key 参数`);
    } catch (error) {
      logger.error("❌ 部署失败:", error);
      Deno.exit(1);
    }
  });

// 验证命令
cli
  .command("verify", "验证智能合约")
  .option({
    name: "network",
    alias: "n",
    description: "网络名称（sepolia, mainnet, testnet, bsc_testnet, bsc）",
    requiresValue: true,
    type: "string",
    required: true,
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
    name: "api-key",
    description: "Etherscan/BSCScan API Key（可选，如果不提供则从环境变量 ETH_API_KEY 读取）",
    requiresValue: true,
    type: "string",
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
    name: "chain-id",
    description: "链 ID（可选，如果不提供则从配置中读取）",
    requiresValue: true,
    type: "number",
  })
  .option({
    name: "constructor-args",
    description: "构造函数参数（可选，多个参数用空格分隔）",
    requiresValue: true,
    type: "array",
  })
  .action(async (_args, options) => {
    const network = options.network as string;
    const contractName = options.contract as string;
    let apiKey = options["api-key"] as string | undefined;
    const address = options.address as string | undefined;
    const rpcUrl = options["rpc-url"] as string | undefined;
    const chainId = options["chain-id"] as number | undefined;
    const constructorArgs = options["constructor-args"] as string[] | undefined;

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
    logger.info("网络:", network);
    logger.info("合约名称:", contractName);
    logger.info("------------------------------------------");
    logger.info("");

    // 确定合约地址
    let contractAddress = address;
    if (!contractAddress) {
      try {
        const { loadContract } = await import("./utils/deploy-utils.ts");
        const contract = loadContract(contractName, network);
        contractAddress = contract.address;
        logger.info("从部署记录读取合约地址:", contractAddress);
      } catch {
        logger.error("❌ 无法读取合约地址，请使用 --address 参数指定");
        Deno.exit(1);
      }
    }

    // 确定 RPC URL 和链 ID
    let finalRpcUrl = rpcUrl;
    let finalChainId = chainId;

    if (!finalRpcUrl || !finalChainId) {
      try {
        const config = await loadNetworkConfig(network);
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
    if (constructorArgs && constructorArgs.length > 0) {
      logger.info("构造函数参数:", constructorArgs.join(", "));
    }
    logger.info("");

    // 执行验证
    try {
      await verify({
        address: contractAddress!,
        contractName,
        network,
        apiKey: apiKey!,
        rpcUrl: finalRpcUrl!,
        chainId: finalChainId,
        constructorArgs,
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
