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
  existsSync,
  join,
  readdir,
  setEnv,
} from "@dreamer/runtime-adapter";
import type { DeployOptions, NetworkConfig } from "./utils/deploy-utils.ts";
import { createLoadingProgressBar } from "./utils/cli-utils.ts";
import { forgeDeploy, loadContract } from "./utils/deploy-utils.ts";
import { logger } from "./utils/logger.ts";
import { createWeb3 } from "./utils/web3.ts";
import { getNetworkName, loadNetworkConfig as loadNetworkConfigUtil } from "./utils/cli-utils.ts";

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
      // 合并 force 参数到 options，并设置 abiDir 为当前网络的目录
      const deployOptions: DeployOptions = {
        ...options,
        force: options?.force ?? force,
        // 如果没有提供 abiDir，根据网络名称构建 abiDir
        abiDir: options?.abiDir || join(cwd(), "build", "abi", network),
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
  // 使用 getProjectConfig 来获取项目根目录（虽然这里暂时不需要使用，但保留用于未来扩展）
  const { getProjectConfig } = await import("./utils/cli-utils.ts");
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    throw new Error("未找到项目根目录（包含 deno.json 或 package.json 的目录）");
  }

  // 在 for 循环之前启动进度条，这样在分割线之后立即显示
  const progressBar = createLoadingProgressBar("正在部署中...");
  const progressInterval = progressBar.start();

  try {
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

      // 执行部署脚本（进度条继续显示）
      await scriptModule.deploy(deployer);
      logger.info(`✅ ${script} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Error executing ${script}: ${errorMessage}`);
      throw error;
    }
  }

  // 所有脚本执行完成后停止进度条
  progressBar.stop(progressInterval);
  logger.info("");
  logger.info("✅ All Deployment Scripts Completed!");
  } catch (error) {
    // 发生错误时停止进度条
    progressBar.stop(progressInterval);
    throw error;
  }
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
  logger.info(`[部署脚本] 开始执行部署脚本主函数...`);
  
  // 解析命令行参数
  const { network: networkArg, contracts, force } = parseArgs();
  
  logger.info(`[部署脚本] 解析参数完成: network=${networkArg}, contracts=${contracts}, force=${force}`);

  // 确定网络：优先使用命令行参数，其次使用环境变量，最后使用默认值 local
  const network = await getNetworkName(networkArg, false) || "local";
  logger.info(`[部署脚本] 确定网络: ${network}`);

  // 加载网络配置（不输出信息，因为 cli.ts 已经输出了）
  logger.info(`[部署脚本] 开始加载网络配置...`);
  let config: NetworkConfig;
  try {
    config = await loadNetworkConfigUtil();
    logger.info(`[部署脚本] 网络配置加载完成: RPC URL=${config.rpcUrl}, Address=${config.address}`);
  } catch (error) {
    logger.error("加载网络配置失败:", error);
    Deno.exit(1);
  }

  // 执行部署
  logger.info(`[部署脚本] 开始执行部署...`);
  try {
    await deploy({
      scriptDir: join(cwd(), "script"),
      network,
      config,
      force,
      contracts,
    });
    logger.info(`[部署脚本] 部署完成`);
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
