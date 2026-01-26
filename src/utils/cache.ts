/**
 * @title Cache Utils
 * @description 文件缓存工具函数，用于缓存网络请求结果
 */

import {
  existsSync,
  join,
  readTextFileSync,
  writeTextFileSync,
  ensureDir,
  getEnv,
  removeSync,
  readdir,
  remove,
  cwd,
} from "@dreamer/runtime-adapter";

/**
 * 获取缓存目录路径
 * @returns 缓存目录路径（~/.foundry-cache）
 */
function getCacheDir(): string {
  const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || cwd();
  return join(homeDir, ".foundry-cache");
}

/**
 * 获取缓存文件路径
 * @param key - 缓存键（例如：meta.json, deno.json）
 * @param version - 版本号（用于区分不同版本的缓存）
 * @returns 缓存文件路径
 */
function getCacheFilePath(key: string, version: string): string {
  const cacheDir = getCacheDir();
  // 将版本号中的特殊字符替换为安全字符
  const safeVersion = version.replace(/[^a-zA-Z0-9.-]/g, "_");
  const cacheFileName = `${key}_${safeVersion}.json`;
  return join(cacheDir, cacheFileName);
}

/**
 * 读取缓存
 * @param key - 缓存键
 * @param version - 版本号
 * @returns 缓存的数据，如果不存在或已过期则返回 null
 */
export function readCache<T>(key: string, version: string): T | null {
  try {
    const cachePath = getCacheFilePath(key, version);
    if (!existsSync(cachePath)) {
      return null;
    }

    const cacheContent = readTextFileSync(cachePath);
    const cache = JSON.parse(cacheContent);

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
 * @param version - 版本号
 * @param data - 要缓存的数据
 */
export async function writeCache<T>(key: string, version: string, data: T): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    // 使用 runtime-adapter 的 ensureDir 确保缓存目录存在
    await ensureDir(cacheDir);

    const cachePath = getCacheFilePath(key, version);
    const cache = {
      timestamp: Date.now(),
      version,
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
