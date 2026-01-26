#!/usr/bin/env -S deno run -A
/**
 * @title Foundry Deploy
 * @description Main deployment script that scans and executes deployment scripts
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 *
 * @example
 * ```typescript
 * import { deploy } from "@dreamer/foundry/deploy";
 *
 * await deploy({
 *   scriptDir: "./script",
 *   network: "testnet",
 *   config: {
 *     rpcUrl: "https://rpc.example.com",
 *     privateKey: "0x...",
 *   },
 * });
 * ```
 */

import {
  cwd,
  dirname,
  existsSync,
  join,
  platform,
  readdir,
  setEnv,
  getEnv,
  writeStdoutSync,
} from "@dreamer/runtime-adapter";
import type { DeployOptions, NetworkConfig } from "./utils/deploy-utils.ts";
import { forgeDeploy, loadContract } from "./utils/deploy-utils.ts";
import { logger } from "./utils/logger.ts";
import { createWeb3 } from "./utils/web3.ts";
import { loadEnv } from "./utils/env.ts";
import { loadWeb3ConfigSync } from "./utils/web3.ts";

/**
 * 部署器接口
 */
export interface Deployer {
  network: string;
  accounts: string[];
  force: boolean;
  deploy: (
    contractName: string,
    constructorArgs?: string[] | Record<string, any>,
    options?: DeployOptions,
  ) => Promise<any>;
  web3: (contractName?: string) => any;
  loadContract: (contractName: string, network: string, force: boolean) => any;
}

/**
 * 部署选项
 */
export interface DeployScriptOptions {
  /** 部署脚本目录 */
  scriptDir?: string;
  /** 网络名称 */
  network: string;
  /** 网络配置 */
  config: NetworkConfig;
  /** 是否强制部署 */
  force?: boolean;
  /** 要部署的合约列表（如果为空则部署所有） */
  contracts?: string[];
}

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
 * 扫描部署脚本
 */
async function scanDeployScripts(scriptDir: string): Promise<string[]> {
  const scripts: string[] = [];

  if (!existsSync(scriptDir)) {
    throw new Error(`script directory not found: ${scriptDir}`);
  }

  const entries = await readdir(scriptDir);
  for (const entry of entries) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      const match = entry.name.match(/^(\d+)-/);
      if (match) {
        scripts.push(entry.name);
      }
    }
  }

  scripts.sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)-/)?.[1] || "999") || 999;
    const numB = parseInt(b.match(/^(\d+)-/)?.[1] || "999") || 999;
    return numA - numB;
  });

  return scripts;
}

/**
 * 创建部署器
 */
export function createDeployer(
  network: string,
  config: NetworkConfig,
  force: boolean = false,
): Deployer {
  return {
    network,
    accounts: [config.rpcUrl], // 简化处理
    force,
    deploy: async (
      contractName: string,
      constructorArgs: string[] | Record<string, any> = [],
      options?: DeployOptions,
    ) => {
      // 合并 force 参数到 options
      const deployOptions = {
        ...options,
        force: options?.force ?? force,
      };
      const address = await forgeDeploy(contractName, config, constructorArgs, deployOptions);
      // 返回简化的合约实例
      return { address };
    },
    web3: (contractName?: string) => {
      // 设置环境变量，让 Web3 能正确加载对应网络的合约
      setEnv("WEB3_ENV", network);

      // 使用 createWeb3 同步创建 Web3 实例
      // 配置会自动从 config/web3.json 加载并合并 config 中的参数
      // contractName 是可选的，如果提供则会绑定到指定的合约
      const web3Options: any = {};
      if (config.rpcUrl) web3Options.rpcUrl = config.rpcUrl;
      if (config.chainId) web3Options.chainId = config.chainId;
      if (config.privateKey) web3Options.privateKey = config.privateKey;
      if (config.address) web3Options.address = config.address;

      // 同步调用工厂函数，会自动合并配置文件和 options
      return createWeb3(contractName, web3Options);
    },
    loadContract: (contractName: string, network: string, _force: boolean) => {
      return loadContract(contractName, network);
    },
  };
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

    // 如果合约名称是脚本名（不带 .ts）
    if (script === `${contractName}.ts` || script === contractName) {
      return script;
    }
  }

  return null;
}

/**
 * 加载网络配置
 */
async function loadNetworkConfig(): Promise<NetworkConfig> {
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
 * 执行部署
 */
export async function deploy(options: DeployScriptOptions): Promise<void> {
  const scriptDir = options.scriptDir || join(cwd(), "script");
  let scripts = await scanDeployScripts(scriptDir);

  if (scripts.length === 0) {
    throw new Error("No deployment scripts found");
  }

  // 如果指定了合约列表，过滤脚本
  if (options.contracts && options.contracts.length > 0) {
    const targetScripts: string[] = [];
    const notFoundContracts: string[] = [];

    for (const contract of options.contracts) {
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
      throw new Error(`Contracts not found: ${notFoundContracts.join(", ")}`);
    }

    // 按原始脚本顺序排序
    scripts = targetScripts.sort((a, b) => {
      const numA = parseInt(a.match(/^(\d+)-/)?.[1] || "999") || 999;
      const numB = parseInt(b.match(/^(\d+)-/)?.[1] || "999") || 999;
      return numA - numB;
    });
  }

  logger.info("");

  const deployer = createDeployer(
    options.network,
    options.config,
    options.force || false,
  );

  // 查找项目根目录（包含 deno.json 或 package.json 的目录）
  const projectRoot = findProjectRoot(cwd());
  if (!projectRoot) {
    throw new Error("未找到项目根目录（包含 deno.json 或 package.json 的目录）");
  }

  /**
   * 创建进度条
   * @returns 进度条对象，包含 start 和 stop 方法
   */
  function createProgressBar() {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let currentFrame = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    return {
      start(): ReturnType<typeof setInterval> {
        const update = () => {
          const frame = frames[currentFrame % frames.length];
          // 使用 runtime-adapter 的 writeStdoutSync 方法，兼容 Deno 和 Bun
          try {
            const text = `\r${frame} 正在部署中...`;
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

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    logger.info(`[${i + 1}/${scripts.length}] Executing: ${script}`);

    try {
      const scriptPath = join(scriptDir, script);

      // 使用动态导入，Deno 会从脚本所在目录向上查找 deno.json
      // 使用绝对路径，Deno 会自动从脚本所在目录向上查找 deno.json
      const scriptUrl = new URL(`file://${scriptPath}`).href;
      const scriptModule = await import(scriptUrl);

      if (!scriptModule.deploy || typeof scriptModule.deploy !== "function") {
        logger.error(`❌ Error: ${script} does not export a deploy function`);
        continue;
      }

      // 显示进度条
      const progressBar = createProgressBar();
      const progressInterval = progressBar.start();

      try {
        await scriptModule.deploy(deployer);
        // 停止进度条
        progressBar.stop(progressInterval);
        logger.info(`✅ ${script} completed successfully`);
      } catch (error) {
        // 停止进度条
        progressBar.stop(progressInterval);
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Error executing ${script}: ${errorMessage}`);
      throw error;
    }
  }

  logger.info("");
  logger.info("✅ All Deployment Scripts Completed!");
}

/**
 * 解析命令行参数
 */
function parseArgs(): {
  network?: string;
  contracts?: string[];
  force?: boolean;
} {
  const args = Deno.args;
  let network: string | undefined;
  const contracts: string[] = [];
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--force" || arg === "-f") {
      force = true;
    } else if (arg === "--contract" || arg === "-c") {
      // 收集所有后续的非选项参数作为合约名称
      while (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        i++;
        contracts.push(args[i].toLowerCase());
      }
      if (contracts.length === 0) {
        logger.error("❌ Error: --contract (-c) requires at least one contract name");
        Deno.exit(1);
      }
    } else if (arg === "--network" || arg === "-n") {
      if (i + 1 < args.length) {
        network = args[i + 1];
        i++;
      } else {
        logger.error("❌ Error: --network (-n) requires a network name");
        Deno.exit(1);
      }
    } else if (!arg.startsWith("-")) {
      // 位置参数作为网络名称（向后兼容）
      if (!network) {
        network = arg;
      }
    }
  }

  return { network, contracts: contracts.length > 0 ? contracts : undefined, force };
}

/**
 * 主函数（当作为脚本直接运行时）
 */
async function main() {
  // 解析命令行参数
  const { network: networkArg, contracts, force } = parseArgs();

  // 确定网络：优先使用命令行参数，其次使用环境变量，最后使用默认值 local
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

  // 加载网络配置（不输出信息，因为 cli.ts 已经输出了）
  let config: NetworkConfig;
  try {
    config = await loadNetworkConfig();
  } catch (error) {
    logger.error("加载网络配置失败:", error);
    Deno.exit(1);
  }

  // 执行部署
  try {
    await deploy({
      scriptDir: join(cwd(), "script"),
      network,
      config,
      force,
      contracts,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ 部署失败:", errorMessage);
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
