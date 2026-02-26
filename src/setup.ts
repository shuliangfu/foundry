#!/usr/bin/env -S deno run -A
/**
 * @module @dreamer/foundry/setup
 * @title Foundry CLI Global Installation Script
 * @description Installs the Foundry CLI globally, allowing the `foundry` command to be used anywhere.
 *
 * This module uses @dreamer/runtime-adapter for Deno and Bun compatibility.
 *
 * @example
 * ```bash
 * # Install in Deno environment
 * deno run -A src/setup.ts
 *
 * # Install in Bun environment
 * bun run src/setup.ts
 *
 * # Use after installation
 * foundry init myproject              # Create new project
 * foundry build                       # Compile contracts
 * foundry deploy -n testnet           # Deploy contracts
 * foundry deploy -n testnet --verify  # Deploy and verify
 * foundry verify -n testnet -c Token  # Verify contract
 * foundry run scripts/mint.ts         # Run script
 * foundry test -n local               # Run tests
 * ```
 */

import {
  args,
  createCommand,
  cwd,
  dirname,
  existsSync,
  exit,
  getEnv,
  IS_BUN,
  join,
  platform,
  readStdin,
  readTextFileSync,
  remove,
  writeStdoutSync,
} from "@dreamer/runtime-adapter";
import { $tr } from "./i18n.ts";
import type { JsrDenoJson, JsrMetaData } from "./types/index.ts";
import { readCache, setInstalledVersion, writeCache } from "./utils/cache.ts";
import { parseJsrPackageFromUrl } from "./utils/jsr.ts";
import { logger } from "./utils/logger.ts";

/**
 * 查找本地项目根目录（包含 deno.json 的目录）
 * @param startDir - 起始目录，默认为当前工作目录
 * @returns 项目根目录，如果未找到则返回 null
 */
function findLocalProjectRoot(startDir: string): string | null {
  let currentDir = startDir;
  const plat = platform();
  // Windows 下 dirname/join 经 runtime-adapter 统一为正斜杠，根为 "C:" 或 "C:/"
  const root = plat === "windows" ? /^[A-Za-z]:\/?$/ : /^\/$/;

  while (true) {
    const denoJsonPath = join(currentDir, "deno.json");
    if (existsSync(denoJsonPath)) {
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
 * 从本地项目读取 deno.json 配置
 * @returns 包名和版本，如果读取失败则返回 null
 */
function readLocalDenoJson(): { packageName: string; version: string } | null {
  try {
    const projectRoot = findLocalProjectRoot(cwd());
    if (!projectRoot) {
      return null;
    }

    const denoJsonPath = join(projectRoot, "deno.json");
    if (!existsSync(denoJsonPath)) {
      return null;
    }

    const denoJsonContent = readTextFileSync(denoJsonPath);
    const denoJson = JSON.parse(denoJsonContent);

    // 从 deno.json 中获取包名和版本
    const packageName = denoJson.name || "@dreamer/foundry";
    const version = denoJson.version || "latest";

    return { packageName, version };
  } catch {
    return null;
  }
}

/**
 * 从本地项目读取完整的 deno.json
 */
function readLocalDenoJsonFull(): { version: string; imports: Record<string, string> } | null {
  try {
    const projectRoot = findLocalProjectRoot(cwd());
    if (!projectRoot) {
      return null;
    }

    const denoJsonPath = join(projectRoot, "deno.json");
    if (!existsSync(denoJsonPath)) {
      return null;
    }

    const denoJsonContent = readTextFileSync(denoJsonPath);
    const denoJson = JSON.parse(denoJsonContent);

    return {
      version: denoJson.version || "latest",
      imports: denoJson.imports || {},
    };
  } catch {
    return null;
  }
}

/**
 * 从 JSR 远程获取包的 deno.json 信息
 */
async function fetchJsrDenoJson(): Promise<{ version: string; imports: Record<string, string> }> {
  // 首先尝试从 import.meta.url 解析包信息（远程 JSR URL）
  let packageInfo = parseJsrPackageFromUrl();
  let isLocal = false;

  // 如果是本地运行（packageInfo 为 null），尝试读取本地项目的 deno.json
  if (!packageInfo) {
    isLocal = true;
    packageInfo = readLocalDenoJson();
  }

  // 如果是本地运行，直接使用本地项目的 deno.json
  if (isLocal && packageInfo) {
    const localDenoJson = readLocalDenoJsonFull();
    if (localDenoJson) {
      return localDenoJson;
    }
  }

  let packageName = "@dreamer/foundry";
  let parsedVersion: string | null = null;

  if (packageInfo) {
    packageName = packageInfo.packageName;
    parsedVersion = packageInfo.version;
  } else {
    logger.warn($tr("foundry.setup.packageInfoFallback"));
  }

  try {
    // 如果从 URL 解析到了版本，直接使用该版本；否则获取最新版本
    let version: string;

    if (parsedVersion && !isLocal) {
      // 从 JSR URL 解析到了版本，直接使用
      version = parsedVersion;
    } else {
      // 获取最新版本（只有在本地运行或无法解析版本时才执行）
      // 先尝试从缓存读取 meta.json
      const metaCacheKey = `meta_${packageName}`;
      let metaData: JsrMetaData | null = readCache(metaCacheKey, "latest") as JsrMetaData | null;

      if (!metaData) {
        // 缓存未命中，从网络获取
        const metaUrl = `https://jsr.io/${packageName}/meta.json`;
        const metaResponse = await fetch(metaUrl);
        if (!metaResponse.ok) {
          throw new Error(
            $tr("foundry.setup.metaFetchFailed", { message: metaResponse.statusText }),
          );
        }
        metaData = await metaResponse.json() as JsrMetaData;
        // 写入缓存
        await writeCache(metaCacheKey, "latest", metaData);
      }

      const latestVersion = metaData.latest || Object.keys(metaData.versions || {})[0];
      if (!latestVersion) {
        throw new Error($tr("foundry.setup.metaLatestFailed"));
      }
      version = latestVersion;
    }

    // 直接获取 deno.json 文件内容
    // JSR API URL 格式: https://jsr.io/@dreamer/foundry/1.1.0-beta.10/deno.json
    // 注意：版本号前是 / 而不是 @（已验证）
    // 重要：必须设置 Accept header，不能包含 text/html，否则会返回 HTML 页面

    // 先尝试从缓存读取 deno.json
    const denoJsonCacheKey = `deno.json_${packageName}`;
    let denoJson: JsrDenoJson | null = readCache(denoJsonCacheKey, version) as JsrDenoJson | null;

    if (!denoJson) {
      // 缓存未命中，从网络获取
      const denoJsonUrl = `https://jsr.io/${packageName}/${version}/deno.json`;

      const response = await fetch(denoJsonUrl, {
        headers: {
          "Accept": "application/json, */*",
        },
      });
      if (!response.ok) {
        throw new Error($tr("foundry.setup.denoJsonFetchFailed", {
          message: response.statusText,
          status: String(response.status),
        }));
      }

      // 检查 Content-Type，确保返回的是 JSON
      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("application/json")) {
        // 如果返回的不是 JSON，可能是 HTML，尝试解析 HTML 中的 JSON
        const text = await response.text();
        // 尝试从 HTML 中提取 JSON（通常在 <pre> 标签中）
        const jsonMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
        if (jsonMatch) {
          try {
            denoJson = JSON.parse(jsonMatch[1]) as JsrDenoJson;
          } catch {
            throw new Error($tr("foundry.setup.htmlJsonParseFailed"));
          }
        } else {
          throw new Error($tr("foundry.setup.contentNotJson", { contentType: contentType || "" }));
        }
      } else {
        denoJson = await response.json() as JsrDenoJson;
      }

      // 写入缓存
      await writeCache(denoJsonCacheKey, version, denoJson);
    }

    return {
      version: denoJson.version || version,
      imports: denoJson.imports || {},
    };
  } catch (error) {
    logger.error($tr("foundry.setup.denoJsonFailed"), error);
    if (error instanceof Error) {
      logger.error($tr("foundry.setup.errorDetail", { message: error.message }));
    }
    exit(1);
  }
}

/**
 * 获取 CLI 远程 URL 和创建临时 import map（使用远程 JSR URL）
 */
async function getPaths() {
  // 首先尝试从 import.meta.url 解析包信息（远程 JSR URL）
  let packageInfo = parseJsrPackageFromUrl();
  let isLocal = false;

  // 如果是本地运行（packageInfo 为 null），尝试读取本地项目的 deno.json
  if (!packageInfo) {
    isLocal = true;
    packageInfo = readLocalDenoJson();
  }

  const packageName = packageInfo?.packageName || "@dreamer/foundry";

  // 从 JSR 远程获取包信息（本地运行时会直接使用本地配置）
  const { version } = await fetchJsrDenoJson();

  // 如果是本地运行，使用本地文件路径；否则使用远程 JSR URL
  let cliUrl: string;
  /** 本地安装时项目根目录，用于传 --config，避免在子目录运行 foundry 时用到子目录的 deno.json */
  let configPath: string | null = null;

  if (isLocal && packageInfo) {
    // 本地运行：使用本地文件路径
    const projectRoot = findLocalProjectRoot(cwd());
    if (projectRoot) {
      cliUrl = join(projectRoot, "src", "cli.ts");
      const denoJsonPath = join(projectRoot, "deno.json");
      if (existsSync(denoJsonPath)) {
        configPath = denoJsonPath;
      }
    } else {
      // 如果找不到项目根目录，回退到远程 URL
      cliUrl = `jsr:${packageName}@${version}/cli`;
    }
  } else {
    // 远程运行：使用远程 JSR URL
    cliUrl = `jsr:${packageName}@${version}/cli`;
  }

  return { cliUrl, version, configPath };
}

/**
 * 安装 CLI 到全局
 */
async function install(): Promise<void> {
  logger.info($tr("foundry.init.separator"));
  logger.info($tr("foundry.setup.installTitle"));
  logger.info($tr("foundry.init.separator"));
  logger.info("");

  const { cliUrl, version, configPath } = await getPaths();

  // 本地安装时必须传 --config，否则在子目录（如 app-test）运行 foundry 时
  // Deno 会使用该目录的 deno.json，其中没有 @dreamer/runtime-adapter 等依赖，导致报错
  const args: string[] = [
    "install",
    "-A",
    "--global",
    "--force",
    "--name",
    "foundry",
  ];
  if (configPath) {
    args.push("--config", configPath);
  }
  args.push(cliUrl);

  try {
    // 使用 deno/bun install 命令安装到全局
    // 使用 --import-map 指定导入映射，这样全局安装后才能找到依赖
    // 使用 --force 标志允许覆盖现有安装
    // 使用 -A 或 --allow-all 授予所有权限，确保安装后的命令可以正常运行
    // 根据运行时环境选择正确的命令
    const runtime = IS_BUN ? "bun" : "deno";
    const cmd = createCommand(runtime, {
      args: args,
      stdout: "piped",
      stderr: "piped",
    });

    logger.info($tr("foundry.setup.installing"));
    const output = await cmd.output();
    const stdoutText = new TextDecoder().decode(output.stdout);
    const stderrText = new TextDecoder().decode(output.stderr);

    if (output.success) {
      // 安装成功后，将版本号写入全局缓存（这是全局版本号的标准来源）
      try {
        const packageInfo = parseJsrPackageFromUrl() || readLocalDenoJson();
        const packageName = packageInfo?.packageName || "@dreamer/foundry";

        // 使用专门的函数写入全局安装版本号
        await setInstalledVersion(version, packageName);

        logger.info("");
        logger.info($tr("foundry.setup.installSuccess"));
        logger.info($tr("foundry.setup.versionLabel", { version }));
        logger.info("");
      } catch {
        logger.warn($tr("foundry.setup.versionCacheWarn"));
        logger.info("");
        logger.info($tr("foundry.setup.installSuccess"));
        logger.info("");
      }

      logger.info($tr("foundry.setup.checkFoundry"));
      try {
        await ensureFoundryInstalled();
        logger.info($tr("foundry.setup.foundryReady"));
        logger.info("");
      } catch {
        logger.warn($tr("foundry.setup.foundryInstallFailed"));
        logger.warn($tr("foundry.setup.foundryInstallCmd"));
        logger.warn($tr("foundry.setup.foundryupCmd"));
        logger.info("");
      }

      logger.info($tr("foundry.setup.usageIntro"));
      logger.info("");
      logger.info($tr("foundry.setup.initUsage"));
      logger.info($tr("foundry.setup.initCmd"));
      logger.info("");
      logger.info($tr("foundry.setup.buildUsage"));
      logger.info($tr("foundry.setup.buildCmd"));
      logger.info($tr("foundry.setup.buildSizeCmd"));
      logger.info($tr("foundry.setup.buildForceCmd"));
      logger.info("");
      logger.info($tr("foundry.setup.deployUsage"));
      logger.info($tr("foundry.setup.deployCmd1"));
      logger.info($tr("foundry.setup.deployCmd2"));
      logger.info($tr("foundry.setup.deployCmd3"));
      logger.info($tr("foundry.setup.deployVerifyCmd"));
      logger.info("");
      logger.info($tr("foundry.setup.verifyUsage"));
      logger.info($tr("foundry.setup.verifyCmd1"));
      logger.info($tr("foundry.setup.verifyCmd2"));
      logger.info("");
      logger.info($tr("foundry.setup.runUsage"));
      logger.info($tr("foundry.setup.runCmd1"));
      logger.info($tr("foundry.setup.runCmd2"));
      logger.info("");
      logger.info($tr("foundry.setup.testUsage"));
      logger.info($tr("foundry.setup.testCmd1"));
      logger.info($tr("foundry.setup.testCmd2"));
      logger.info($tr("foundry.setup.testCmd3"));
      logger.info("");
      logger.info($tr("foundry.setup.upgradeUsage"));
      logger.info($tr("foundry.setup.upgradeCmd1"));
      logger.info($tr("foundry.setup.upgradeCmd2"));
      logger.info("");
      logger.info($tr("foundry.setup.helpIntro"));
      logger.info($tr("foundry.setup.helpCmd1"));
      logger.info($tr("foundry.setup.helpCmd2"));
      logger.info("");

      if (stdoutText) {
        logger.info("");
        logger.info($tr("foundry.setup.installInfo"));
        logger.info(stdoutText);
      }
    } else {
      logger.error($tr("foundry.setup.installFailed"));
      if (stderrText) {
        logger.error(stderrText);
      }
      exit(1);
    }
  } catch (error) {
    logger.error($tr("foundry.setup.installError"), error);
    exit(1);
  }
}

/**
 * 检测 forge 是否可用（Foundry 工具链是否已安装）
 * @returns 若 forge 在 PATH 中且可执行则返回 true
 */
async function isForgeAvailable(): Promise<boolean> {
  try {
    const plat = platform();
    const cmd = createCommand(plat === "windows" ? "where" : "which", {
      args: ["forge"],
      stdout: "piped",
      stderr: "piped",
    });
    const out = await cmd.output();
    const text = new TextDecoder().decode(out.stdout).trim();
    return out.success && text.length > 0;
  } catch {
    return false;
  }
}

/**
 * 自动安装 Foundry 工具链（forge/cast/anvil）：执行 curl -L https://foundry.paradigm.xyz | bash 后运行 foundryup
 * 仅在未检测到 forge 时执行，Windows 下建议使用 Git BASH 或 WSL
 */
export async function ensureFoundryInstalled(): Promise<void> {
  if (await isForgeAvailable()) {
    return;
  }

  logger.info($tr("foundry.setup.foundryNotDetected"));
  const plat = platform();
  if (plat === "windows") {
    logger.warn($tr("foundry.setup.windowsInstallWarn"));
  }

  try {
    const installScript = "curl -L https://foundry.paradigm.xyz | bash";
    const installCmd = createCommand("bash", {
      args: ["-c", installScript],
      stdout: "inherit",
      stderr: "inherit",
    });
    const installOut = await installCmd.output();
    if (!installOut.success) {
      throw new Error($tr("foundry.setup.installScriptFailed"));
    }

    const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
    const foundryupPath = homeDir ? join(homeDir, ".foundry", "bin", "foundryup") : "foundryup";
    if (existsSync(foundryupPath)) {
      logger.info($tr("foundry.setup.runningFoundryup"));
      const foundryupCmd = createCommand(foundryupPath, {
        args: [],
        stdout: "inherit",
        stderr: "inherit",
      });
      const foundryupOut = await foundryupCmd.output();
      if (!foundryupOut.success) {
        logger.warn($tr("foundry.setup.foundryupFailed"));
      }
    } else {
      logger.info($tr("foundry.setup.foundryupManual"));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error($tr("foundry.setup.autoInstallFailed", { message: msg }));
    logger.info($tr("foundry.setup.manualInstallCmd"));
    throw err;
  }
}

/**
 * 查找 foundry 可执行文件的实际路径
 * @returns foundry 的完整路径，如果未找到则返回 null
 */
export async function findFoundryPath(): Promise<string | null> {
  const plat = platform();
  const isWindows = plat === "windows";

  try {
    // 使用 which/where 命令查找 foundry 的实际路径
    const command = isWindows ? "where" : "which";
    const cmd = createCommand(command, {
      args: ["foundry"],
      stdout: "piped",
      stderr: "piped",
    });

    const output = await cmd.output();
    const stdoutText = new TextDecoder().decode(output.stdout).trim();

    if (output.success && stdoutText) {
      // which/where 可能返回多行，取第一行
      const paths = stdoutText.split("\n").map((line) => line.trim()).filter((line) => line);
      if (paths.length > 0) {
        return paths[0];
      }
    }

    // 如果 which/where 找不到，尝试常见的安装路径
    const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
    if (homeDir) {
      // Deno 安装路径
      const denoBinDir = join(homeDir, ".deno", "bin");
      const denoFoundryPath = join(denoBinDir, "foundry");
      if (existsSync(denoFoundryPath)) {
        return denoFoundryPath;
      }

      // Bun 安装路径（如果存在）
      const bunBinDir = join(homeDir, ".bun", "bin");
      const bunFoundryPath = join(bunBinDir, "foundry");
      if (existsSync(bunFoundryPath)) {
        return bunFoundryPath;
      }
    }

    return null;
  } catch (_error) {
    // 如果命令执行失败，尝试常见的安装路径
    const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
    if (homeDir) {
      const denoBinDir = join(homeDir, ".deno", "bin");
      const denoFoundryPath = join(denoBinDir, "foundry");
      if (existsSync(denoFoundryPath)) {
        return denoFoundryPath;
      }
    }
    return null;
  }
}

/**
 * 提示用户确认
 * @param message 提示信息
 * @returns 用户确认返回 true，否则返回 false
 */
async function confirm(message: string): Promise<boolean> {
  logger.warn(message);
  // 使用 writeStdoutSync 在同一行显示输入提示（不换行），兼容 Deno 和 Bun
  const prompt = "请输入 'yes' 或 'y' 确认，其他任何输入将取消操作：";
  try {
    writeStdoutSync(new TextEncoder().encode(prompt));
  } catch {
    // 如果写入失败，使用 logger.info
    logger.info(prompt);
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
 * 卸载 CLI
 */
export async function uninstall(): Promise<void> {
  logger.info($tr("foundry.init.separator"));
  logger.info($tr("foundry.setup.uninstallTitle"));
  logger.info($tr("foundry.init.separator"));
  logger.info("");

  try {
    // 查找 foundry 的实际安装路径
    const foundryPath = await findFoundryPath();

    if (!foundryPath) {
      logger.warn($tr("foundry.setup.uninstallNotFound"));
      logger.info("");
      logger.info($tr("foundry.setup.uninstallCheckPaths"));
      const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
      if (homeDir) {
        logger.info(`  ${join(homeDir, ".deno", "bin", "foundry")}`);
        logger.info(`  ${join(homeDir, ".bun", "bin", "foundry")}`);
      }
      return;
    }

    // 显示找到的路径并要求用户确认
    logger.info($tr("foundry.setup.foundryPathFound", { path: foundryPath }));
    logger.info("");

    const confirmed = await confirm($tr("foundry.setup.uninstallConfirm"));

    if (!confirmed) {
      logger.info($tr("foundry.setup.operationCancelled"));
      return;
    }

    try {
      if (existsSync(foundryPath)) {
        await remove(foundryPath);
        logger.info($tr("foundry.setup.uninstallSuccess"));
        logger.info($tr("foundry.setup.uninstallDeleted", { path: foundryPath }));
      } else {
        logger.warn($tr("foundry.setup.uninstallNotFound"));
        logger.info($tr("foundry.setup.uninstallExpectedPath", { path: foundryPath }));
      }
    } catch (error) {
      logger.error($tr("foundry.setup.uninstallFailedMsg"), error);
      logger.info("");
      logger.info($tr("foundry.setup.uninstallManualDelete"));
      logger.info(`  ${foundryPath}`);
      exit(1);
    }
  } catch (error) {
    logger.error($tr("foundry.setup.uninstallError"), error);
    exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  const cmdArgs = args();

  if (cmdArgs.length > 0 && (cmdArgs[0] === "--uninstall" || cmdArgs[0] === "-u")) {
    await uninstall();
  } else if (cmdArgs.length > 0 && (cmdArgs[0] === "--help" || cmdArgs[0] === "-h")) {
    logger.info($tr("foundry.setup.helpFull"));
  } else {
    await install();
  }
}

// 执行主函数
if (import.meta.main) {
  await main();
}
