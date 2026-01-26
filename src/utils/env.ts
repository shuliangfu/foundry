/**
 * @title Environment Utils
 * @dev 环境变量工具函数库 - 封装环境变量的加载和验证功能
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 */

import { existsSync, readTextFileSync, join, cwd, getEnv, setEnv, exit } from "./deps.ts";
import { logger } from "./logger.ts";

/**
 * 加载环境变量
 * @param envPath 环境变量文件路径，默认为当前目录下的 .env
 * @returns 环境变量对象
 */
export async function loadEnv(envPath?: string): Promise<Record<string, string>> {
  const targetPath = envPath || join(cwd(), ".env");
  if (!existsSync(targetPath)) {
    logger.error("❌ Error: .env file not found");
    logger.error(`Please create .env file at: ${targetPath}`);
    exit(1);
  }

  try {
    // 直接读取 .env 文件内容，手动解析
    const envText = readTextFileSync(targetPath);
    const env: Record<string, string> = {};
    
    for (const line of envText.split("\n")) {
      const trimmed = line.trim();
      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      // 解析 KEY=VALUE 格式
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        // 移除引号（如果存在）
        const cleanValue = value.replace(/^["']|["']$/g, "");
				env[key] = cleanValue;
				setEnv(key, cleanValue);
      }
    }
    
    return env;
  } catch (error) {
    logger.error("❌ Error reading .env file:", error);
    exit(1);
  }
}

/**
 * 验证必要的环境变量
 * @param env 环境变量对象
 * @param required 必需的环境变量列表
 */
export function validateEnv(env: Record<string, string>, required: string[] = []): void {
  for (const key of required) {
    if (!env[key]) {
      logger.error(`❌ Error: ${key} not set in .env`);
      exit(1);
    }
  }
}
