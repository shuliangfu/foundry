#!/usr/bin/env -S deno run -A
/**
 * @module
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
 * foundry deploy --network testnet
 * foundry verify --network testnet --contract MyToken
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
  join,
  makeTempFile,
  platform,
  readTextFileSync,
  remove,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { logger } from "./utils/logger.ts";

/**
 * 从 import.meta.url 解析 JSR 包信息
 * @returns 包名和版本，如果解析失败则返回 null
 */
function parseJsrPackageFromUrl(): { packageName: string; version: string } | null {
  try {
    // import.meta.url 格式可能是:
    // - https://jsr.io/@dreamer/foundry/1.1.0-beta.9/src/setup.ts (实际格式)
    // - https://jsr.io/@dreamer/foundry@1.1.0-beta.8/setup.ts (旧格式，可能不存在)
    const urlString = import.meta.url;
    logger.info(`🔍 解析 import.meta.url: ${urlString}`);

    const url = new URL(urlString);

    // 检查是否是 JSR URL
    if (url.hostname !== "jsr.io") {
      logger.info(`⚠️  不是 JSR URL，hostname: ${url.hostname}`);
      return null;
    }

    logger.info(`✅ 是 JSR URL，pathname: ${url.pathname}`);

    // 实际路径格式: /@dreamer/foundry/1.1.0-beta.9/src/setup.ts
    // 格式: /@scope/name/version/path/to/file
    // 先尝试匹配实际格式（版本号前是 /）
    // 版本号可能包含：数字、点、连字符、beta、alpha 等
    // 匹配模式: /@scope/name/version/... 其中 version 是第一个路径段（不包含 /）
    let pathMatch = url.pathname.match(/^\/@([^/@]+)\/([^/@]+)\/([^/]+)\//);
    if (pathMatch) {
      const [, scope, name, version] = pathMatch;
      const packageName = `@${scope}/${name}`;
      logger.info(`✅ 解析成功（新格式）: ${packageName}@${version}`);
      return { packageName, version };
    }

    // 尝试匹配没有后续路径的情况（版本号在末尾）
    pathMatch = url.pathname.match(/^\/@([^/@]+)\/([^/@]+)\/([^/]+)$/);
    if (pathMatch) {
      const [, scope, name, version] = pathMatch;
      const packageName = `@${scope}/${name}`;
      logger.info(`✅ 解析成功（新格式，无后续路径）: ${packageName}@${version}`);
      return { packageName, version };
    }

    // 尝试旧格式（版本号前是 @）
    pathMatch = url.pathname.match(/^\/@([^/@]+)\/([^/@]+)@([^/]+)(?:\/|$)/);
    if (pathMatch) {
      const [, scope, name, version] = pathMatch;
      const packageName = `@${scope}/${name}`;
      logger.info(`✅ 解析成功（旧格式）: ${packageName}@${version}`);
      return { packageName, version };
    }

    logger.warn(`⚠️  无法匹配路径格式: ${url.pathname}`);
    return null;
  } catch (error) {
    // 如果是本地运行，返回 null，后续会读取本地项目的配置
    logger.warn(`解析 JSR URL 失败: ${error}`);
    return null;
  }
}

/**
 * 查找本地项目根目录（包含 deno.json 的目录）
 * @param startDir - 起始目录，默认为当前工作目录
 * @returns 项目根目录，如果未找到则返回 null
 */
function findLocalProjectRoot(startDir: string): string | null {
  let currentDir = startDir;
  const plat = platform();
  const root = plat === "windows" ? /^[A-Z]:\\$/ : /^\/$/;

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
    logger.info("📦 检测到本地运行，尝试读取本地项目配置...");
    isLocal = true;
    packageInfo = readLocalDenoJson();
    if (packageInfo) {
      logger.info(`📦 从本地项目读取: ${packageInfo.packageName}@${packageInfo.version}`);
    }
  } else {
    logger.info(`📦 从 JSR URL 解析: ${packageInfo.packageName}@${packageInfo.version}`);
  }

  // 如果是本地运行，直接使用本地项目的 deno.json
  if (isLocal && packageInfo) {
    const localDenoJson = readLocalDenoJsonFull();
    if (localDenoJson) {
      logger.info("📦 使用本地项目的 deno.json 配置");
      return localDenoJson;
    }
  }

  let packageName = "@dreamer/foundry";
  let parsedVersion: string | null = null;

  if (packageInfo) {
    packageName = packageInfo.packageName;
    parsedVersion = packageInfo.version;
    logger.info(`📦 使用包: ${packageName}@${parsedVersion}`);
  } else {
    logger.warn("⚠️  无法从 import.meta.url 或本地项目解析包信息，使用默认值");
  }

  try {
    // 如果从 URL 解析到了版本，直接使用该版本；否则获取最新版本
    let version: string;

    logger.info(`🔍 调试信息: parsedVersion=${parsedVersion}, isLocal=${isLocal}`);

    if (parsedVersion && !isLocal) {
      // 从 JSR URL 解析到了版本，直接使用
      version = parsedVersion;
      logger.info(`📦 使用 URL 中的版本: ${version}`);
    } else {
      // 获取最新版本（只有在本地运行或无法解析版本时才执行）
      if (isLocal) {
        logger.info("📦 本地运行，获取最新版本");
      } else {
        logger.warn(`⚠️  无法从 URL 解析版本 (parsedVersion=${parsedVersion})，获取最新版本`);
      }
      const metaUrl = `https://jsr.io/${packageName}/meta.json`;
      const metaResponse = await fetch(metaUrl);
      if (!metaResponse.ok) {
        throw new Error(`无法获取 meta.json: ${metaResponse.statusText}`);
      }
      const metaData = await metaResponse.json();
      const latestVersion = metaData.latest || metaData.versions?.[0];
      if (!latestVersion) {
        throw new Error("无法从 meta.json 获取最新版本");
      }
      version = latestVersion;
      logger.info(`📦 使用最新版本: ${version}`);
    }

    // 直接获取 deno.json 文件内容
    // JSR API URL 格式: https://jsr.io/@dreamer/foundry/1.1.0-beta.10/deno.json
    // 注意：版本号前是 / 而不是 @（已验证）
    // 重要：必须设置 Accept header，不能包含 text/html，否则会返回 HTML 页面
    const denoJsonUrl = `https://jsr.io/${packageName}/${version}/deno.json`;
    logger.info(`📦 从 JSR 获取 deno.json: ${denoJsonUrl}`);

    const response = await fetch(denoJsonUrl, {
      headers: {
        "Accept": "application/json, */*",
      },
    });
    if (!response.ok) {
      throw new Error(`无法获取 deno.json: ${response.statusText} (${response.status})`);
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
          const denoJson = JSON.parse(jsonMatch[1]);
          logger.info(`✅ 成功从 HTML 中提取 deno.json，版本: ${denoJson.version || version}`);
          return {
            version: denoJson.version || version,
            imports: denoJson.imports || {},
          };
        } catch {
          throw new Error("无法解析 HTML 中的 JSON 内容");
        }
      }
      throw new Error(`返回的内容不是 JSON，Content-Type: ${contentType}`);
    }

    const denoJson = await response.json();
    logger.info(`✅ 成功获取 deno.json，版本: ${denoJson.version || version}`);
    return {
      version: denoJson.version || version,
      imports: denoJson.imports || {},
    };
  } catch (error) {
    logger.error("❌ 获取 deno.json 信息失败:", error);
    if (error instanceof Error) {
      logger.error(`   错误详情: ${error.message}`);
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
  const { version, imports } = await fetchJsrDenoJson();

  // 如果是本地运行，使用本地文件路径；否则使用远程 JSR URL
  let cliUrl: string;
  if (isLocal && packageInfo) {
    // 本地运行：使用本地文件路径
    const projectRoot = findLocalProjectRoot(cwd());
    if (projectRoot) {
      cliUrl = join(projectRoot, "src", "cli.ts");
    } else {
      // 如果找不到项目根目录，回退到远程 URL
      cliUrl = `jsr:${packageName}@${version}/cli`;
    }
  } else {
    // 远程运行：使用远程 JSR URL
    cliUrl = `jsr:${packageName}@${version}/cli`;
  }

  // 创建临时 import map，使用远程 JSR URL
  const importMap = {
    imports: {
      ...imports,
      // 确保主包使用远程 URL
      [packageName]: `jsr:${packageName}@${version}`,
    },
  };

  // 使用 makeTempFile 创建临时文件
  const tempImportMapPath = await makeTempFile({
    prefix: "foundry-temp-import-map-",
    suffix: ".json",
  });

  // 写入 import map 内容
  await writeTextFile(tempImportMapPath, JSON.stringify(importMap, null, 2));

  return { cliUrl, importMapPath: tempImportMapPath };
}

/**
 * 安装 CLI 到全局
 */
async function install(): Promise<void> {
  logger.info("===========================================");
  logger.info("🚀 安装 Foundry CLI 到全局");
  logger.info("===========================================");
  logger.info("");

  const { cliUrl, importMapPath } = await getPaths();

  const args = [
    "install",
    "-A",
    "--global",
    "--force",
    "--import-map",
    importMapPath,
    "--name",
    "foundry",
    cliUrl,
  ];

  console.log(args);

  try {
    // 使用 deno install 命令安装到全局
    // 使用 --import-map 指定导入映射，这样全局安装后才能找到依赖
    // 使用 --force 标志允许覆盖现有安装
    // 使用 -A 或 --allow-all 授予所有权限，确保安装后的命令可以正常运行
    const cmd = createCommand("deno", {
      args: args,
      stdout: "piped",
      stderr: "piped",
    });

    logger.info("正在安装...");
    const output = await cmd.output();
    const stdoutText = new TextDecoder().decode(output.stdout);
    const stderrText = new TextDecoder().decode(output.stderr);

    if (output.success) {
      logger.info("");
      logger.info("✅ Foundry CLI 安装成功！");
      logger.info("");
      logger.info("现在可以在任何地方使用以下命令：");
      logger.info("  foundry init [项目名]");
      logger.info("  foundry deploy --network <网络>");
      logger.info("  foundry verify --network <网络> --contract <合约名>");
      logger.info("");
      logger.info("查看帮助：");
      logger.info("  foundry --help");
      logger.info("  foundry init --help");
      logger.info("  foundry deploy --help");
      logger.info("  foundry verify --help");
      logger.info("");

      if (stdoutText) {
        logger.info("");
        logger.info("安装信息：");
        logger.info(stdoutText);
      }
    } else {
      logger.error("❌ 安装失败");
      if (stderrText) {
        logger.error(stderrText);
      }
      exit(1);
    }
  } catch (error) {
    logger.error("❌ 安装过程中发生错误:", error);
    exit(1);
  } finally {
    // 清理临时 import map 文件
    try {
      if (existsSync(importMapPath)) {
        await remove(importMapPath);
      }
    } catch {
      // 忽略清理错误
    }
  }
}

/**
 * 卸载 CLI
 */
async function uninstall(): Promise<void> {
  logger.info("===========================================");
  logger.info("🗑️  卸载 Foundry CLI");
  logger.info("===========================================");
  logger.info("");

  try {
    // 查找 deno 的 bin 目录
    const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
    const denoBinDir = join(homeDir, ".deno", "bin");

    // 尝试删除 foundry 可执行文件
    const foundryPath = join(denoBinDir, "foundry");

    try {
      if (existsSync(foundryPath)) {
        await remove(foundryPath);
        logger.info("✅ Foundry CLI 已卸载");
        logger.info(`   已删除: ${foundryPath}`);
      } else {
        logger.warn("⚠️  Foundry CLI 未找到，可能已经卸载");
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
}

/**
 * 主函数
 */
async function main() {
  const cmdArgs = args();

  if (cmdArgs.length > 0 && (cmdArgs[0] === "--uninstall" || cmdArgs[0] === "-u")) {
    await uninstall();
  } else if (cmdArgs.length > 0 && (cmdArgs[0] === "--help" || cmdArgs[0] === "-h")) {
    logger.info(`
Foundry CLI 全局安装脚本

用法:
  deno run -A setup.ts [选项]

选项:
  --install, -i    安装 Foundry CLI 到全局（默认）
  --uninstall, -u  卸载 Foundry CLI
  --help, -h       显示此帮助信息

示例:
  # 安装
  deno run -A setup.ts

  # 卸载
  deno run -A setup.ts --uninstall

安装后使用:
  foundry deploy --network testnet
  foundry verify --network testnet --contract MyToken
`);
  } else {
    await install();
  }
}

// 执行主函数
if (import.meta.main) {
  await main();
}
