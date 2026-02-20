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
import { cwd, existsSync, exit, join, readdir, setEnv } from "@dreamer/runtime-adapter";
import { $tr } from "../i18n.ts";
import {
  createLoadingProgressBar,
  getApiKey,
  getNetworkName,
  getProjectConfig,
  loadNetworkConfig as loadNetworkConfigUtil,
} from "../utils/cli-utils.ts";
import { loadEnv } from "../utils/env.ts";
import { confirm } from "./common.ts";
import type { ContractInfo, DeployOptions, NetworkConfig } from "../utils/deploy-utils.ts";
import { forgeDeploy, loadContract } from "../utils/deploy-utils.ts";
import { logger } from "../utils/logger.ts";
import { createWeb3, type Web3, type Web3Options } from "../utils/web3.ts";

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
  /** 等待的区块确认数（默认: local 网络为 0，其他网络为 2） */
  confirmations?: number;
  /** 是否在部署后立即验证合约 */
  verify?: boolean;
  /** 验证使用的 API Key */
  apiKey?: string;
}

/**
 * 扫描部署脚本
 */
async function scanDeployScripts(scriptDir: string): Promise<string[]> {
  const scripts: string[] = [];

  if (!existsSync(scriptDir)) {
    throw new Error($tr("foundry.deploy.scriptDirNotFound", { scriptDir }));
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
 * @param network - 网络名称
 * @param config - 网络配置
 * @param force - 是否强制部署
 * @param confirmations - 等待的区块确认数（可选）
 */
export function createDeployer(
  network: string,
  config: NetworkConfig,
  force: boolean = false,
  confirmations?: number,
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
      // 合并 force 和 confirmations 参数到 options，并设置 abiDir 为当前网络的目录
      const deployOptions: DeployOptions = {
        ...options,
        force: options?.force ?? force,
        // 如果没有提供 abiDir，根据网络名称构建 abiDir
        abiDir: options?.abiDir || join(cwd(), "build", "abi", network),
        // 使用传入的 confirmations，如果没有则使用 createDeployer 的默认值
        confirmations: options?.confirmations ?? confirmations,
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
    throw new Error($tr("foundry.deploy.noDeployScripts"));
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
      throw new Error(
        $tr("foundry.deploy.contractsNotFound", { contracts: notFoundContracts.join(", ") }),
      );
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
    options.confirmations,
  );

  // 查找项目根目录（包含 deno.json 或 package.json 的目录）
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    throw new Error($tr("foundry.deploy.projectRootNotFound"));
  }

  try {
    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      logger.info($tr("foundry.deploy.executingScript", {
        current: String(i + 1),
        total: String(scripts.length),
        script,
      }));

      try {
        const scriptPath = join(scriptDir, script);

        // 使用动态导入，Deno 会从脚本所在目录向上查找 deno.json
        // 使用绝对路径，Deno 会自动从脚本所在目录向上查找 deno.json
        const scriptUrl = new URL(`file://${scriptPath}`).href;
        const scriptModule = await import(scriptUrl);

        if (!scriptModule.deploy || typeof scriptModule.deploy !== "function") {
          logger.error($tr("foundry.deploy.noDeployFunction", { script }));
          continue;
        }

        // 执行部署脚本（进度条继续显示）
        const progressBar = createLoadingProgressBar($tr("foundry.deploy.deployingProgress"));
        // 在 for 循环之前启动进度条，这样在分割线之后立即显示
        const progressInterval = progressBar.start();
        // 输出换行符，让部署脚本的输出从新行开始，避免与进度条混在一起
        console.log("");
        try {
          // 部署合约
          await scriptModule.deploy(deployer);
          // 所有脚本执行完成后停止进度条
          progressBar.stop(progressInterval);
          logger.info($tr("foundry.deploy.scriptSuccess", { script }) + " \n");
        } finally {
          progressBar.stop(progressInterval);
        }

        // 如果启用了验证，在部署成功后立即验证该合约
        if (options.verify && options.apiKey) {
          // 从脚本名称提取合约名称（如 "2-hash.ts" -> "hash"）
          const match = script.match(/^\d+-(.+)\.ts$/);
          const contractName = match ? match[1] : script.replace(/\.ts$/, "");

          // 首字母大写（如 "hash" -> "Hash"）
          const capitalizedName = contractName.charAt(0).toUpperCase() + contractName.slice(1);

          logger.info($tr("foundry.deploy.verifyingContract", { name: capitalizedName }));

          try {
            // 导入验证函数和工具
            const { verify, findContractFileName } = await import("./verify.ts");

            // 查找实际的合约文件名（大小写不敏感）
            const actualFileName = findContractFileName(capitalizedName, options.network);
            const actualContractName = actualFileName
              ? actualFileName.replace(/\.json$/, "")
              : capitalizedName;

            // 读取已部署的合约信息
            const contractInfo = loadContract(actualContractName, options.network);

            if (contractInfo && contractInfo.address) {
              // 调用验证函数（保留 args 的嵌套数组结构，如 address[]）
              await verify({
                address: contractInfo.address,
                contractName: actualContractName,
                network: options.network,
                apiKey: options.apiKey,
                rpcUrl: options.config.rpcUrl,
                constructorArgs: contractInfo.args,
                chainId: options.config.chainId,
              });
              logger.info($tr("foundry.deploy.verifySuccess", { name: actualContractName }));
            } else {
              logger.warn($tr("foundry.deploy.contractNoDeployInfo", { name: capitalizedName }));
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(
              $tr("foundry.deploy.verifyFailed", { name: capitalizedName, message: errorMessage }),
            );
            // 验证失败不中断部署流程
          }
        }

        logger.info("");

        // 当前脚本完成后、下一个脚本开始前等待 3 秒，避免 RPC/链上状态未就绪
        if (i < scripts.length - 1) {
          const loadingProgressBar = createLoadingProgressBar(
            $tr("foundry.deploy.waitRpcProgress"),
          );
          const loadingProgressInterval = loadingProgressBar.start();
          await new Promise((resolve) => setTimeout(resolve, 3000));
          loadingProgressBar.stop(loadingProgressInterval);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error($tr("foundry.deploy.errorExecuting", { script, message: errorMessage }));
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
}

/** 从 argv 解析 -c/--contract 后的多个合约名称 */
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

/** deploy 命令的选项（供 cli.ts 传入） */
export interface DeployCliOptions {
  network?: string;
  contract?: string | string[];
  force?: boolean;
  verify?: boolean;
  "api-key"?: string;
  confirmations?: number;
}

/**
 * 供 cli.ts 调用的 deploy 命令逻辑
 */
export async function runDeployCli(options: DeployCliOptions, argv: string[]): Promise<void> {
  loadEnv();

  const network = getNetworkName(options.network, false);
  if (!network) {
    logger.error($tr("foundry.deploy.networkRequired"));
    logger.error($tr("foundry.deploy.networkRequiredHint"));
    exit(1);
  }
  setEnv("WEB3_ENV", network);

  if (!options.network && network !== "local") {
    logger.info($tr("foundry.deploy.networkFromEnv", { network }));
  }

  const contractsFromArgv = parseContractNamesFromArgv(argv);
  const contracts = contractsFromArgv.length > 0
    ? contractsFromArgv
    : (options.contract != null
      ? (Array.isArray(options.contract) ? options.contract : [options.contract as string])
      : undefined);
  const force = options.force === true;
  const scriptDir = join(cwd(), "deploy");

  logger.info($tr("foundry.deploy.startDeploy"));
  logger.info($tr("foundry.deploy.networkLabel", { network }));
  logger.info("");

  let config: NetworkConfig;
  try {
    config = await loadNetworkConfigUtil();
    logger.info($tr("foundry.deploy.rpcUrl") + " " + config.rpcUrl);
    logger.info($tr("foundry.deploy.deployAddress") + " " + config.address);
    if (config.chainId) logger.info($tr("foundry.deploy.chainId") + " " + String(config.chainId));
    logger.info("");
  } catch (error) {
    logger.error($tr("foundry.deploy.loadConfigFailed"), error);
    exit(1);
  }

  let scripts: string[];
  try {
    scripts = await scanDeployScripts(scriptDir);
  } catch {
    logger.error($tr("foundry.deploy.noScriptsFound"));
    logger.error($tr("foundry.deploy.scriptDirHint", { scriptDir }));
    exit(1);
  }

  if (force) {
    const confirmed = await confirm($tr("foundry.deploy.forceConfirm"));
    if (!confirmed) {
      logger.info($tr("foundry.setup.operationCancelled"));
      exit(0);
    }
    logger.info("");
  }

  if (contracts && contracts.length > 0) {
    const notFoundContracts: string[] = [];
    for (const contract of contracts) {
      const targetScript = findContractScript(contract, scripts);
      if (!targetScript) notFoundContracts.push(contract);
    }
    if (notFoundContracts.length > 0) {
      logger.error(
        $tr("foundry.deploy.noContractFound", { contracts: notFoundContracts.join(", ") }),
      );
      logger.error($tr("foundry.deploy.availableContracts"));
      scripts.forEach((script) => {
        const m = script.match(/^\d+-(.+)\.ts$/);
        if (m) logger.error(`  - ${m[1]}`);
      });
      exit(1);
    }
  }

  logger.info($tr("foundry.verify.sectionStart"));

  const shouldVerify = options.verify === true;
  const apiKey = shouldVerify ? getApiKey(options["api-key"]) : undefined;
  if (shouldVerify && !apiKey) {
    logger.error($tr("foundry.deploy.apiKeyRequired"));
    logger.error($tr("foundry.deploy.apiKeyHint"));
    exit(1);
  }

  try {
    await deploy({
      scriptDir,
      network,
      config,
      force,
      contracts,
      confirmations: options.confirmations,
      verify: options.verify,
      apiKey: apiKey ?? undefined,
    });
    logger.info("");
    logger.info($tr("foundry.deploy.allScriptsDone"));
    logger.info("");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error($tr("foundry.deploy.deployFailed"), msg);
    exit(1);
  }
}
