/**
 * @title Cache Utils
 * @description 文件缓存工具函数，用于缓存网络请求结果
 */

import {
  cwd,
  ensureDir,
  existsSync,
  getEnv,
  join,
  readdir,
  readTextFileSync,
  remove,
  removeSync,
  writeTextFileSync,
} from "@dreamer/runtime-adapter";
import { CACHE_TTL } from "../constants/index.ts";

/**
 * 获取缓存目录路径
 * @returns 缓存目录路径（~/.foundry-cache）
 */
function getCacheDir(): string {
  const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || cwd();
  return join(homeDir, ".foundry-cache");
}

/**
 * 获取全局安装的版本号（从安装时的缓存读取）
 * 这是全局版本号的标准来源，安装时会写入，其他地方应该优先读取这个
 * @param packageName - 包名（可选，默认为 "@dreamer/foundry"）
 * @returns 版本号字符串，如果不存在则返回 null
 */
export function getInstalledVersion(packageName: string = "@dreamer/foundry"): string | null {
  try {
    const versionCacheKey = `installed_version_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const installedVersionCache = readCache<{ version: string }>(versionCacheKey, "installed");

    if (installedVersionCache && installedVersionCache.version) {
      return installedVersionCache.version;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 写入全局安装的版本号（安装时调用）
 * @param version - 版本号
 * @param packageName - 包名（可选，默认为 "@dreamer/foundry"）
 */
export async function setInstalledVersion(
  version: string,
  packageName: string = "@dreamer/foundry",
): Promise<void> {
  const versionCacheKey = `installed_version_${packageName.replace(/[^a-zA-Z0-9]/g, "_")}`;
  await writeCache(versionCacheKey, "installed", { version });
}

/**
 * 获取缓存文件路径
 * @param key - 缓存键（例如：meta.json, deno.json, installed_version）
 * @param version - 版本标识（用于区分不同版本的缓存文件）
 * @returns 缓存文件路径
 * @remarks
 * version 参数的作用：
 * - 用于生成唯一的缓存文件路径，例如：`key_version.json`
 * - "installed" - 用于存储当前安装的版本号（每次安装会覆盖）
 * - "latest" - 用于存储最新版本信息（会定期更新）
 * - 实际版本号（如 "1.1.0-beta.32"）- 用于存储特定版本的缓存（不会互相覆盖）
 */
function getCacheFilePath(key: string, version: string): string {
  const cacheDir = getCacheDir();
  // 将版本号中的特殊字符替换为安全字符
  const safeVersion = version.replace(/[^a-zA-Z0-9.-]/g, "_");
  const cacheFileName = `${key}_${safeVersion}.json`;
  return join(cacheDir, cacheFileName);
}

/**
 * 获取缓存的 TTL（根据 key 类型）
 */
function getCacheTTL(key: string): number {
  if (key.startsWith("meta_")) {
    return CACHE_TTL.META;
  } else if (key.startsWith("deno_json_") || key.startsWith("deno.json_")) {
    return CACHE_TTL.DENO_JSON;
  } else if (key.startsWith("installed_version_")) {
    return CACHE_TTL.CONTRACT; // 永久缓存
  }
  // 默认使用 meta 的 TTL
  return CACHE_TTL.META;
}

/**
 * 读取缓存
 * @param key - 缓存键
 * @param version - 版本标识（必须与写入时使用的版本标识一致）
 * @returns 缓存的数据，如果不存在或已过期则返回 null
 * @remarks
 * 版本标识的说明：
 * - "installed" - 读取安装时缓存的版本号
 * - "latest" - 读取最新版本信息
 * - 实际版本号（如 "1.1.0-beta.32"）- 读取特定版本的缓存
 *
 * 重要：读取时使用的 version 必须与写入时使用的 version 一致，否则无法读取到缓存
 */
export function readCache<T>(key: string, version: string): T | null {
  try {
    const cachePath = getCacheFilePath(key, version);
    if (!existsSync(cachePath)) {
      return null;
    }

    const cacheContent = readTextFileSync(cachePath);
    const cache = JSON.parse(cacheContent);

    // 检查缓存是否过期
    const ttl = getCacheTTL(key);
    if (ttl !== Infinity && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age > ttl) {
        // 缓存已过期，删除文件
        try {
          removeSync(cachePath);
        } catch {
          // 忽略删除错误
        }
        return null;
      }
    }

    // 检查缓存是否过期（24小时）
    const now = Date.now();
    const cacheAge = now - cache.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    if (cacheAge > maxAge) {
      // 缓存已过期，删除文件
      try {
        removeSync(cachePath);
      } catch {
        // 忽略删除错误
      }
      return null;
    }

    return cache.data as T;
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 * @param key - 缓存键
 * @param version - 版本标识（用于区分不同版本的缓存文件，例如："installed", "latest", "1.1.0-beta.32"）
 * @param data - 要缓存的数据
 * @remarks
 * version 参数的作用：
 * - 用于生成唯一的缓存文件路径，例如：`key_version.json`
 * - 不同版本的缓存会存储在不同的文件中，互不干扰
 * - 对于 "installed" 这种特殊标识，每次写入会覆盖之前的缓存（这是预期的行为）
 * - 对于实际版本号（如 "1.1.0-beta.32"），不同版本的缓存会分别存储
 */
export async function writeCache<T>(key: string, version: string, data: T): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    // 使用 runtime-adapter 的 ensureDir 确保缓存目录存在
    await ensureDir(cacheDir);

    const cachePath = getCacheFilePath(key, version);
    const cache = {
      timestamp: Date.now(),
      // 注意：这里的 version 是用于文件路径的版本标识，不是缓存数据中的版本号
      // 如果需要存储数据中的版本号，应该在 data 中单独存储
      data,
    };

    writeTextFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch {
    // 忽略写入错误，不影响主流程
  }
}

/**
 * 清除指定版本的缓存
 * @param version - 版本号（可选，如果不提供则清除所有缓存）
 */
export async function clearCache(version?: string): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    if (!existsSync(cacheDir)) {
      return;
    }

    if (version) {
      // 清除指定版本的缓存
      const safeVersion = version.replace(/[^a-zA-Z0-9.-]/g, "_");
      const pattern = new RegExp(`_${safeVersion.replace(/\./g, "\\.")}\\.json$`);

      const entries = await readdir(cacheDir);
      for (const entry of entries) {
        if (entry.isFile && pattern.test(entry.name)) {
          try {
            await remove(join(cacheDir, entry.name));
          } catch {
            // 忽略删除错误
          }
        }
      }
    } else {
      // 清除所有缓存
      const entries = await readdir(cacheDir);
      for (const entry of entries) {
        if (entry.isFile && entry.name.endsWith(".json")) {
          try {
            await remove(join(cacheDir, entry.name));
          } catch {
            // 忽略删除错误
          }
        }
      }
    }
  } catch {
    // 忽略清除错误
  }
}
