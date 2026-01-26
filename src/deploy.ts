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

import { existsSync, readdir, cwd, setEnv } from "@dreamer/runtime-adapter";
import { join } from "@dreamer/runtime-adapter";
import { logger } from "./utils/logger.ts";
import { forgeDeploy, loadContract } from "./utils/deploy-utils.ts";
import type { NetworkConfig, DeployOptions } from "./utils/deploy-utils.ts";
import { createWeb3 } from "./utils/web3.ts";

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

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    logger.info(`[${i + 1}/${scripts.length}] Executing: ${script}`);

    try {
      const scriptUrl = new URL(`./${script}`, `file://${scriptDir}/`).href;
      const scriptModule = await import(scriptUrl);

      if (!scriptModule.deploy || typeof scriptModule.deploy !== "function") {
        logger.error(`❌ Error: ${script} does not export a deploy function`);
        continue;
      }

      await scriptModule.deploy(deployer);
      logger.info(`✅ ${script} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Error executing ${script}: ${errorMessage}`);
      throw error;
    }
  }

  logger.info("");
  logger.info("✅ All Deployment Scripts Completed!");
}
