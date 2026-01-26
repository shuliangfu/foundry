/**
 * @title JSR Utils
 * @description JSR 包相关的工具函数
 */

/**
 * 从 import.meta.url 解析 JSR 包信息
 * @returns 包名和版本，如果解析失败则返回 null
 */
export function parseJsrPackageFromUrl(): { packageName: string; version: string } | null {
  try {
    // import.meta.url 格式可能是:
    // - https://jsr.io/@dreamer/foundry/1.1.0-beta.9/src/file.ts (实际格式)
    // - https://jsr.io/@dreamer/foundry@1.1.0-beta.8/file.ts (旧格式，可能不存在)
    const urlString = import.meta.url;
    const url = new URL(urlString);

    // 检查是否是 JSR URL
    if (url.hostname !== "jsr.io") {
      return null;
    }

    // 实际路径格式: /@dreamer/foundry/1.1.0-beta.9/src/file.ts
    // 格式: /@scope/name/version/path/to/file
    // 先尝试匹配实际格式（版本号前是 /）
    // 版本号可能包含：数字、点、连字符、beta、alpha 等
    // 匹配模式: /@scope/name/version/... 其中 version 是第一个路径段（不包含 /）
    let pathMatch = url.pathname.match(/^\/@([^/@]+)\/([^/@]+)\/([^/]+)\//);
    if (pathMatch) {
      const [, scope, name, version] = pathMatch;
      const packageName = `@${scope}/${name}`;
      return { packageName, version };
    }

    // 尝试匹配没有后续路径的情况（版本号在末尾）
    pathMatch = url.pathname.match(/^\/@([^/@]+)\/([^/@]+)\/([^/]+)$/);
    if (pathMatch) {
      const [, scope, name, version] = pathMatch;
      const packageName = `@${scope}/${name}`;
      return { packageName, version };
    }

    // 尝试旧格式（版本号前是 @）
    pathMatch = url.pathname.match(/^\/@([^/@]+)\/([^/@]+)@([^/]+)(?:\/|$)/);
    if (pathMatch) {
      const [, scope, name, version] = pathMatch;
      const packageName = `@${scope}/${name}`;
      return { packageName, version };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 从 import.meta.url 解析 JSR 包版本号
 * @returns 版本号，如果解析失败则返回 null
 */
export function parseJsrVersionFromUrl(): string | null {
  const packageInfo = parseJsrPackageFromUrl();
  return packageInfo?.version || null;
}

/**
 * 从 import.meta.url 解析 JSR 包名
 * @returns 包名，如果解析失败则返回 null
 */
export function parseJsrPackageNameFromUrl(): string | null {
  const packageInfo = parseJsrPackageFromUrl();
  return packageInfo?.packageName || null;
}
