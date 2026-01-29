#!/usr/bin/env -S deno run -A
/**
 * @title Foundry Deploy
 * @description Main deployment script that scans and executes deployment scripts
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 *
 * @example
 * ```typescript
 * import { deploy } from "@dreamer/foundry";
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

import type { Logger } from "@dreamer/logger";
import { cwd, existsSync, join, readdir, setEnv } from "@dreamer/runtime-adapter";
import { DEFAULT_NETWORK } from "./constants/index.ts";
import type { ContractInfo, DeployOptions, NetworkConfig } from "./utils/deploy-utils.ts";
import { forgeDeploy, loadContract } from "./utils/deploy-utils.ts";
import { logger } from "./utils/logger.ts";
import { createWeb3, type Web3, type Web3Options } from "./utils/web3.ts";
import {
  createLoadingProgressBar,
  getNetworkName,
  loadNetworkConfig as loadNetworkConfigUtil,
} from "./utils/cli-utils.ts";

/**
 * 部署器接口
 * force 由框架在 deploy() 内部使用，不暴露给脚本。
 */
export interface Deployer {
  network: string;
  accounts: string[];
  deploy: (
    contractName: string,
    constructorArgs?: string[] | Record<string, unknown>,
    options?: DeployOptions,
  ) => Promise<Web3>;
  logger: Logger;
  web3: (contractName?: string) => Web3;
  loadContract: (contractName: string, network: string, force: boolean) => ContractInfo | null;
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
    /** 当前网络的账户地址列表，accounts[0] 为部署者地址（对应 config.address） */
    accounts: [config.address],
    logger,
    deploy: async (
      contractName: string,
      constructorArgs: string[] | Record<string, unknown> = [],
      options?: DeployOptions,
    ) => {
      // 合并 force 参数到 options，并设置 abiDir 为当前网络的目录
      const deployOptions: DeployOptions = {
        ...options,
        force: options?.force ?? force,
        // 如果没有提供 abiDir，根据网络名称构建 abiDir
        abiDir: options?.abiDir || join(cwd(), "build", "abi", network),
      };
      await forgeDeploy(contractName, config, constructorArgs, deployOptions);

      // 设置环境变量，让 Web3 能正确加载对应网络的合约
      setEnv("WEB3_ENV", network);

      // 创建 Web3 实例并绑定到已部署的合约地址
      return createWeb3(contractName);
    },
    web3: (contractName?: string, options?: Web3Options): Web3 => {
      // 设置环境变量，让 Web3 能正确加载对应网络的合约
      setEnv("WEB3_ENV", network);
      // 同步调用工厂函数，会自动合并配置文件和 options
      return createWeb3(contractName, options);
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
  const scriptDir = options.scriptDir || join(cwd(), "deploy");
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
        logger.info(`✅ ${script} completed successfully \n`);
        // 当前脚本完成后、下一个脚本开始前等待 3 秒，避免 RPC/链上状态未就绪
        if (i < scripts.length - 1) {
          // 这里写一个 loading 进度条，等待 5 秒
          const loadingProgressBar = createLoadingProgressBar("等待 RPC/链上状态就绪...");
          const loadingProgressInterval = loadingProgressBar.start();
          await new Promise((resolve) => setTimeout(resolve, 5000));
          loadingProgressBar.stop(loadingProgressInterval);
        }
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
  // 解析命令行参数
  const { network: networkArg, contracts, force } = parseArgs();

  // 确定网络：优先使用命令行参数，其次使用环境变量（getNetworkName 内部已读 WEB3_ENV），否则使用默认网络常量
  const network = getNetworkName(networkArg, false) ?? DEFAULT_NETWORK;

  setEnv("WEB3_ENV", network);

  // 加载网络配置
  let config: NetworkConfig;
  try {
    config = await loadNetworkConfigUtil();
  } catch (error) {
    logger.error("加载网络配置失败:", error);
    Deno.exit(1);
  }

  // 执行部署
  try {
    await deploy({
      scriptDir: join(cwd(), "deploy"),
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
