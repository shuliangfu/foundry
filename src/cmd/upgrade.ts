/**
 * upgrade 命令的 CLI 逻辑：检查更新并升级 Foundry CLI
 */

import {
  createCommand,
  dirname,
  existsSync,
  exit,
  IS_BUN,
  join,
  platform,
  readTextFileSync,
} from "@dreamer/runtime-adapter";
import type { JsrDenoJson, JsrMetaData } from "../types/index.ts";
import { getInstalledVersion, readCache, setInstalledVersion, writeCache } from "../utils/cache.ts";
import { createLoadingProgressBar } from "../utils/cli-utils.ts";
import { $tr } from "../i18n.ts";
import { parseJsrPackageFromUrl, parseJsrVersionFromUrl } from "../utils/jsr.ts";
import { logger } from "../utils/logger.ts";

/** 查找框架根目录（包含 deno.json 的目录） */
function findFrameworkRoot(): string | null {
  let currentFileUrl: string;
  try {
    currentFileUrl = import.meta.url;
  } catch {
    return null;
  }
  if (currentFileUrl.startsWith("https://jsr.io/") || currentFileUrl.startsWith("jsr:")) {
    return null;
  }
  let currentDir: string;
  if (currentFileUrl.startsWith("file://")) {
    currentDir = currentFileUrl.replace(/^file:\/\//, "");
    if (currentDir.startsWith("/") && /^[A-Z]:/.test(currentDir.substring(1))) {
      currentDir = currentDir.substring(1);
    }
  } else {
    currentDir = currentFileUrl;
  }
  const srcDir = dirname(currentDir);
  const frameworkRoot = dirname(srcDir);
  const plat = platform();
  // Windows 下路径经 runtime-adapter 统一为正斜杠，根为 "C:" 或 "C:/"
  const root = plat === "windows" ? /^[A-Za-z]:\/?$/ : /^\/$/;
  let currentPath = frameworkRoot;
  while (true) {
    const denoJsonPath = join(currentPath, "deno.json");
    if (existsSync(denoJsonPath)) return currentPath;
    const parentDir = dirname(currentPath);
    if (parentDir === currentPath || currentPath.match(root)) break;
    currentPath = parentDir;
  }
  return null;
}

/** 比较两个版本号 */
function compareVersions(version1: string, version2: string): number {
  const v1 = version1.replace(/^v/, "");
  const v2 = version2.replace(/^v/, "");
  const parts1 = v1.split(/[.-]/);
  const parts2 = v2.split(/[.-]/);
  const maxLength = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || "0";
    const part2 = parts2[i] || "0";
    const num1 = parseInt(part1, 10);
    const num2 = parseInt(part2, 10);
    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
      continue;
    }
    if (!isNaN(num1) && isNaN(num2)) return 1;
    if (isNaN(num1) && !isNaN(num2)) return -1;
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  return 0;
}

/** 从 JSR 获取最新版本（可选包含 beta） */
async function getLatestVersion(
  includeBeta: boolean = false,
  forceRefresh: boolean = false,
): Promise<string | null> {
  try {
    const packageInfo = parseJsrPackageFromUrl();
    const packageName = packageInfo?.packageName || "@dreamer/foundry";
    const cacheKey = `meta_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    let metaData: JsrMetaData | null = forceRefresh
      ? null
      : (readCache(cacheKey, "latest") as JsrMetaData | null);

    if (!metaData) {
      const metaUrl = `https://jsr.io/${packageName}/meta.json`;
      const metaResponse = await fetch(metaUrl);
      if (!metaResponse.ok) {
        throw new Error(
          $tr("foundry.upgrade.metaFetchFailed", { message: metaResponse.statusText }),
        );
      }
      metaData = await metaResponse.json();
      await writeCache(cacheKey, "latest", metaData);
    }

    if (!metaData) throw new Error($tr("foundry.upgrade.metaDataFailed"));

    if (includeBeta) {
      const versionsObj = metaData.versions || {};
      const allVersions = Object.keys(versionsObj);
      if (allVersions.length === 0) throw new Error($tr("foundry.upgrade.metaVersionsFailed"));
      const sorted = [...allVersions].sort((a, b) => compareVersions(b, a));
      return sorted[0];
    }
    return metaData.latest || null;
  } catch (error) {
    logger.error($tr("foundry.upgrade.getLatestFailed", { error: String(error) }));
    return null;
  }
}

/**
 * 获取当前 CLI 版本号（供 CLI 入口与 upgrade 使用）
 * 优先全局安装缓存，其次 JSR URL 解析，最后 JSR API 或本地 deno.json
 */
export async function getVersion(): Promise<string | undefined> {
  try {
    const packageInfo = parseJsrPackageFromUrl();
    const packageName = packageInfo?.packageName || "@dreamer/foundry";
    const installedVersion = getInstalledVersion(packageName);
    if (installedVersion) return installedVersion;

    const parsedVersion = parseJsrVersionFromUrl();
    if (parsedVersion) return parsedVersion;

    const cacheKey = `meta_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    let metaData: JsrMetaData | null = readCache(cacheKey, "latest") as JsrMetaData | null;

    if (!metaData) {
      const metaUrl = `https://jsr.io/${packageName}/meta.json`;
      const metaResponse = await fetch(metaUrl);
      if (!metaResponse.ok) {
        throw new Error(
          $tr("foundry.upgrade.metaFetchFailed", { message: metaResponse.statusText }),
        );
      }
      metaData = await metaResponse.json();
      await writeCache(cacheKey, "latest", metaData);
    }

    const latestVersion = metaData?.latest || (metaData && Object.keys(metaData.versions || {})[0]);
    if (!latestVersion) throw new Error($tr("foundry.upgrade.metaLatestVersionFailed"));

    const denoJsonCacheKey = `deno_json_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    let denoJson: JsrDenoJson | null = readCache(denoJsonCacheKey, latestVersion) as
      | JsrDenoJson
      | null;

    if (!denoJson) {
      const denoJsonUrl = `https://jsr.io/${packageName}/${latestVersion}/deno.json`;
      const response = await fetch(denoJsonUrl, { headers: { "Accept": "application/json, */*" } });
      if (!response.ok) {
        throw new Error(
          $tr("foundry.upgrade.denoJsonFetchFailed", { status: String(response.status) }),
        );
      }
      denoJson = await response.json() as JsrDenoJson;
      await writeCache(denoJsonCacheKey, latestVersion, denoJson);
    }

    return denoJson?.version || latestVersion;
  } catch {
    try {
      const frameworkRoot = findFrameworkRoot();
      if (!frameworkRoot) return undefined;
      const denoJsonPath = join(frameworkRoot, "deno.json");
      if (existsSync(denoJsonPath)) {
        const content = readTextFileSync(denoJsonPath);
        const denoJson = JSON.parse(content) as JsrDenoJson;
        return denoJson.version;
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

/** upgrade 命令的选项 */
export interface UpgradeCliOptions {
  beta?: boolean;
  force?: boolean;
}

/**
 * 执行 upgrade 命令逻辑
 */
export async function runUpgradeCli(options: UpgradeCliOptions): Promise<void> {
  const includeBeta = options.beta === true;

  logger.info("");

  try {
    const currentVersion = await getVersion();
    if (!currentVersion) {
      logger.error($tr("foundry.upgrade.currentVersionFailed") + " \n");
      exit(1);
    }

    const progressBar = createLoadingProgressBar($tr("foundry.upgrade.checkingProgress"));
    const progressInterval = progressBar.start();
    const latestVersion = await getLatestVersion(includeBeta, true);
    progressBar.stop(progressInterval);

    if (!latestVersion) {
      logger.error($tr("foundry.upgrade.latestVersionFailed") + " \n");
      exit(1);
    }

    if (compareVersions(latestVersion, currentVersion) <= 0) {
      logger.info(
        (includeBeta
          ? $tr("foundry.upgrade.alreadyLatestBeta")
          : $tr("foundry.upgrade.alreadyLatest")) + "\n",
      );
      return;
    }

    const packageInfo = parseJsrPackageFromUrl();
    const packageName = packageInfo?.packageName || "@dreamer/foundry";
    const cliUrl = `jsr:${packageName}@${latestVersion}/cli`;
    const args = ["install", "-A", "--global", "--force", "--name", "foundry", cliUrl];

    const installProgressBar = createLoadingProgressBar($tr("foundry.upgrade.installProgress"));
    const installProgressInterval = installProgressBar.start();

    try {
      const runtime = IS_BUN ? "bun" : "deno";
      const cmd = createCommand(runtime, { args, stdout: "piped", stderr: "piped" });
      const output = await cmd.output();
      const stderrText = new TextDecoder().decode(output.stderr);
      installProgressBar.stop(installProgressInterval);

      if (output.success) {
        try {
          await setInstalledVersion(latestVersion, packageName);
        } catch {
          // ignore
        }
        logger.info($tr("foundry.upgrade.upgradedTo", { version: latestVersion }));
      } else {
        logger.error($tr("foundry.upgrade.upgradeFailed"));
        if (stderrText) logger.error(stderrText);
        exit(1);
      }
    } catch (error) {
      installProgressBar.stop(installProgressInterval);
      throw error;
    }
    logger.info("");
  } catch (error) {
    logger.error("\n" + $tr("foundry.upgrade.upgradeError"), error, "\n");
    exit(1);
  }
}
