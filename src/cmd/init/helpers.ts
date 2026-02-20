/**
 * init 脚手架用到的辅助函数：确认、目录检查、框架根目录、版本与 deno.json 模板
 */

import {
  dirname,
  existsSync,
  getEnv,
  join,
  readdir,
  readStdin,
  readTextFileSync,
  writeStdoutSync,
} from "@dreamer/runtime-adapter";
import { $tr } from "../../i18n.ts";
import { logger } from "../../utils/logger.ts";
import { parseJsrVersionFromUrl } from "../../utils/jsr.ts";

/**
 * 查找框架根目录（包含框架 deno.json 的目录）
 * @returns 框架根目录路径，未找到则返回 null
 */
export function findFrameworkRoot(): string | null {
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
  let currentPath = frameworkRoot;
  while (true) {
    const denoJsonPath = join(currentPath, "deno.json");
    if (existsSync(denoJsonPath)) {
      return currentPath;
    }
    const parentDir = dirname(currentPath);
    if (parentDir === currentPath) break;
    currentPath = parentDir;
  }
  return null;
}

/**
 * 获取框架版本号：优先 JSR URL 解析，其次框架 deno.json
 */
export function getCurrentVersion(): string {
  const jsrVersion = parseJsrVersionFromUrl();
  if (jsrVersion) return jsrVersion;
  try {
    const frameworkRoot = findFrameworkRoot();
    if (!frameworkRoot) {
      logger.warn($tr("foundry.init.frameworkRootNotFound"));
      return "1.0.0";
    }
    const denoJsonPath = join(frameworkRoot, "deno.json");
    if (existsSync(denoJsonPath)) {
      const denoJsonContent = readTextFileSync(denoJsonPath);
      const denoJson = JSON.parse(denoJsonContent);
      return denoJson.version || "1.0.0";
    }
  } catch (error) {
    logger.warn($tr("foundry.init.denoJsonVersionFallback"), error);
  }
  return "1.0.0";
}

/**
 * 生成 deno.json 模板内容
 * @param version - @dreamer/foundry 版本号
 */
export function getDenoJsonTemplate(version: string): string {
  return `{
  "version": "1.0.0",
  "license": "MIT",
  "tasks": {
    "build": "forge build",
    "test": "forge test",
    "deploy": "deno run -A deploy.ts"
  },
  "imports": {
    "@dreamer/foundry": "jsr:@dreamer/foundry@^${version}",
		"@dreamer/test": "jsr:@dreamer/test@1.0.0-beta.23"
  },
  "nodeModulesDir": "auto",
  "fmt": {
    "files": {
      "include": ["**/*.ts", "**/*.js"]
    },
    "options": {
      "indentWidth": 2,
      "lineWidth": 100,
      "useTabs": false
    }
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "exclude": ["no-explicit-any"]
    },
    "include": ["deploy/**/*.ts", "tests/**/*.ts"]
  },
  "compilerOptions": {
    "lib": ["deno.window"],
    "strict": true,
    "noImplicitAny": false
  },
  "allowScripts": {
    "allow": [],
    "deny": ["npm:esbuild@0.27.2", "npm:puppeteer@24.36.0"]
  }
}
`;
}

/**
 * 获取版权所有人：优先环境变量 USER，其次 USERNAME，否则为 "Dreamer Team"
 */
export function getCopyrightOwner(): string {
  return getEnv("USER") ?? getEnv("USERNAME") ?? "Dreamer Team";
}

/**
 * 检查目录是否为空（忽略 .git、.DS_Store 等）
 */
export async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
  try {
    const entries = await readdir(dirPath);
    const visibleEntries = entries.filter((e) => !e.name.startsWith("."));
    return visibleEntries.length === 0;
  } catch {
    return false;
  }
}

/**
 * 提示用户确认
 * @param message 提示信息
 * @returns 用户输入 yes/y 返回 true，否则 false
 */
export async function confirm(message: string): Promise<boolean> {
  logger.warn(message);
  const prompt = $tr("foundry.common.confirmPrompt");
  try {
    writeStdoutSync(new TextEncoder().encode(prompt));
  } catch {
    console.log(prompt);
  }
  try {
    const buffer = new Uint8Array(1024);
    const bytesRead = await readStdin(buffer);
    if (bytesRead === null) return false;
    const input = new TextDecoder().decode(buffer.subarray(0, bytesRead)).trim().toLowerCase();
    return input === "yes" || input === "y";
  } catch {
    return false;
  }
}
