/**
 * @title CLI Utils
 * @description CLI 相关的工具函数，用于减少代码重复
 */

import { cwd, dirname, existsSync, join, getEnv, platform } from "@dreamer/runtime-adapter";
import { logger } from "./logger.ts";
import { parseJsrPackageFromUrl } from "./jsr.ts";
import { loadEnv } from "./env.ts";

/**
 * 获取项目根目录和 deno.json 路径
 * @returns 包含 projectRoot 和 denoJsonPath 的对象，如果未找到则返回 null
 */
export function getProjectConfig(): { projectRoot: string; denoJsonPath: string } | null {
  const projectRoot = findProjectRoot(cwd());
  if (!projectRoot) {
    logger.error("❌ 未找到项目根目录（包含 deno.json 的目录）");
    return null;
  }

  const denoJsonPath = join(projectRoot, "deno.json");
  if (!existsSync(denoJsonPath)) {
    logger.error(`❌ 未找到项目的 deno.json 文件: ${denoJsonPath}`);
    return null;
  }

  return { projectRoot, denoJsonPath };
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
 * 获取脚本路径（deploy.ts 或 verify.ts）
 * 使用缓存机制，避免重复解析
 * @param scriptName - 脚本名称（"deploy" 或 "verify"）
 * @returns 脚本路径
 */
export function getScriptPath(scriptName: "deploy" | "verify"): string {
  const currentFileUrl = import.meta.url;
  
  // 使用全局缓存对象（如果存在）
  const globalCache = (globalThis as any).__foundryCache || {};
  const cacheKey = `${scriptName}ScriptPath_${currentFileUrl}`;
  
  if (globalCache[cacheKey]) {
    logger.info(`[缓存] ✅ 从缓存读取 ${scriptName} 脚本路径: ${globalCache[cacheKey]}`);
    return globalCache[cacheKey];
  }

  logger.info(`[缓存] ⚠️  缓存未命中，解析 ${scriptName} 脚本路径...`);
  let scriptPath: string;
  
  // 如果是从 JSR 包运行的，使用 JSR URL；否则使用文件路径
  if (currentFileUrl.startsWith("https://jsr.io/") || currentFileUrl.startsWith("jsr:")) {
    // 使用工具函数解析 JSR 包信息（不会请求网络）
    const packageInfo = parseJsrPackageFromUrl();
    if (packageInfo) {
      scriptPath = `jsr:${packageInfo.packageName}@${packageInfo.version}/${scriptName}`;
      logger.info(`[缓存] 📦 解析 JSR 包路径: ${scriptPath}`);
    } else {
      // 如果无法解析，尝试使用相对路径
      const currentDir = dirname(currentFileUrl.replace(/^file:\/\//, ""));
      scriptPath = join(currentDir, `${scriptName}.ts`);
      logger.info(`[缓存] 📁 使用相对路径: ${scriptPath}`);
    }
  } else {
    // 本地运行，使用文件路径
    const currentDir = dirname(currentFileUrl.replace(/^file:\/\//, ""));
    scriptPath = join(currentDir, `${scriptName}.ts`);
    logger.info(`[缓存] 📁 使用本地文件路径: ${scriptPath}`);
  }
  
  // 缓存结果（基于当前文件 URL，因为它在运行时是固定的）
  globalCache[cacheKey] = scriptPath;
  (globalThis as any).__foundryCache = globalCache;
  logger.info(`[缓存] 💾 已缓存 ${scriptName} 脚本路径: ${scriptPath}`);
  
  return scriptPath;
}

/**
 * 执行 Deno 子命令
 * @param scriptPath - 脚本路径
 * @param denoJsonPath - deno.json 路径
 * @param projectRoot - 项目根目录
 * @param args - 命令行参数
 * @returns 执行结果，包含 stdout 和 stderr
 */
export async function executeDenoCommand(
  scriptPath: string,
  denoJsonPath: string,
  projectRoot: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  logger.info(`[执行] 🚀 准备执行 Deno 命令`);
  logger.info(`[执行] 📝 脚本路径: ${scriptPath}`);
  logger.info(`[执行] 📄 deno.json 路径: ${denoJsonPath}`);
  logger.info(`[执行] 📂 项目根目录: ${projectRoot}`);
  logger.info(`[执行] ⚙️  命令行参数: ${args.join(" ")}`);
  
  const cmdArgs = [
    "run",
    "-A",
    "--config",
    denoJsonPath,
    scriptPath,
    ...args,
  ];

  logger.info(`[执行] 🔧 完整命令: deno ${cmdArgs.join(" ")}`);
  logger.info(`[执行] ⏳ 开始执行命令...`);

  const startTime = Date.now();
  const cmd = new Deno.Command("deno", {
    args: cmdArgs,
    stdout: "piped",
    stderr: "piped",
    cwd: projectRoot,
  });

  const output = await cmd.output();
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  logger.info(`[执行] ✅ 命令执行完成，耗时: ${duration}ms`);
  
  const stdoutText = new TextDecoder().decode(output.stdout);
  const stderrText = new TextDecoder().decode(output.stderr);

  if (!output.success) {
    logger.info(`[执行] ❌ 命令执行失败，stderr: ${stderrText.substring(0, 200)}`);
  }

  return {
    stdout: stdoutText,
    stderr: stderrText,
    success: output.success,
  };
}

/**
 * 获取 API Key（从命令行参数或环境变量）
 * @param apiKeyFromOption - 命令行参数中的 API Key
 * @returns API Key，如果未找到则返回 null
 */
export async function getApiKey(apiKeyFromOption?: string): Promise<string | null> {
  // 如果命令行提供了 API Key，直接使用
  if (apiKeyFromOption) {
    return apiKeyFromOption;
  }

  // 尝试从环境变量读取
  try {
    const env = await loadEnv();
    return env.ETH_API_KEY || getEnv("ETH_API_KEY") || null;
  } catch {
    // 如果加载 .env 失败，尝试直接从环境变量读取
    return getEnv("ETH_API_KEY") || null;
  }
}

/**
 * 加载网络配置（从环境变量、config/web3.json 或 .env 文件）
 * @param network - 网络名称（可选，用于从 web3.json 加载特定网络配置）
 * @returns 网络配置
 */
export async function loadNetworkConfig(network?: string): Promise<{
  rpcUrl: string;
  privateKey: string;
  address: string;
  chainId?: number;
}> {
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
    const { loadWeb3ConfigSync } = await import("./web3.ts");
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
 * 获取网络名称（从命令行参数或环境变量）
 * @param networkFromOption - 命令行参数中的网络名称
 * @param requireNetwork - 是否要求必须指定网络（默认 false，允许使用默认值）
 * @returns 网络名称，如果 requireNetwork 为 true 且未找到则返回 null
 */
export async function getNetworkName(
  networkFromOption?: string,
  requireNetwork: boolean = false,
): Promise<string | null> {
  // 如果命令行提供了网络名称，直接使用
  if (networkFromOption) {
    return networkFromOption;
  }

  // 尝试从环境变量读取
  let network: string | null = null;
  try {
    const env = await loadEnv();
    network = env.WEB3_ENV || getEnv("WEB3_ENV") || null;
  } catch {
    // 如果加载 .env 失败，尝试直接从环境变量读取
    network = getEnv("WEB3_ENV") || null;
  }

  // 如果 requireNetwork 为 true 且未找到网络，返回 null
  if (requireNetwork && !network) {
    return null;
  }

  // 返回网络名称或默认值
  return network || "local";
}

/**
 * 处理 Deno 命令执行结果
 * @param result - 执行结果
 * @param successMessage - 成功消息（可选）
 */
export function handleCommandResult(
  result: { stdout: string; stderr: string; success: boolean },
  successMessage?: string,
): void {
  // 输出脚本的标准输出
  if (result.stdout) {
    console.log(result.stdout);
  }

  if (!result.success) {
    // 输出错误信息
    if (result.stderr) {
      logger.error(result.stderr);
    }
    Deno.exit(1);
  }

  // 如果有成功消息，输出它
  if (successMessage) {
    logger.info("");
    logger.info(successMessage);
  }
}
