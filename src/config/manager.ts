/**
 * @title Config Manager
 * @description 统一的配置管理器
 */

import { cwd, existsSync, join } from "@dreamer/runtime-adapter";
import { loadWeb3ConfigSync } from "../utils/web3.ts";
import { loadEnv } from "../utils/env.ts";
import { ConfigurationError } from "../errors/index.ts";

/**
 * Web3 网络配置类型（从 web3.ts 导入）
 */
type Web3NetworkConfig = ReturnType<typeof loadWeb3ConfigSync> extends infer T 
  ? T extends null ? never : T 
  : never;

/**
 * 配置管理器
 * 统一管理 Web3 配置和环境变量配置
 * 注意：这是一个简化的实现，与现有的 loadWeb3ConfigSync 兼容
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private web3Config: Web3NetworkConfig | null = null;
  private envConfig: Record<string, string> | null = null;
  private projectRoot: string | null = null;

  private constructor() {
    // 私有构造函数，单例模式
  }

  /**
   * 获取配置管理器实例（单例）
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 初始化配置管理器
   * @param projectRoot 项目根目录，如果不提供则自动查找
   */
  initialize(projectRoot?: string): void {
    if (projectRoot) {
      this.projectRoot = projectRoot;
    } else {
      // 自动查找项目根目录
      this.projectRoot = this.findProjectRoot(cwd());
    }

    // 加载环境变量配置
    try {
      this.envConfig = loadEnv();
    } catch {
      // 环境变量加载失败不影响使用，只是没有环境变量配置
      this.envConfig = {};
    }

    // Web3 配置在需要时懒加载
  }

  /**
   * 获取 Web3 网络配置
   * @param _network 网络名称（保留用于未来扩展）
   * @param _chain 链名称（可选，保留用于未来扩展）
   * @returns 网络配置
   */
  getWeb3Config(_network?: string, _chain?: string): Web3NetworkConfig {
    if (!this.projectRoot) {
      throw new ConfigurationError(
        "配置管理器未初始化，请先调用 initialize()",
        { network: _network, chain: _chain }
      );
    }

    // 懒加载 Web3 配置（使用现有的 loadWeb3ConfigSync）
    if (!this.web3Config) {
      const config = loadWeb3ConfigSync(this.projectRoot);
      if (!config) {
        throw new ConfigurationError(
          `无法加载 Web3 配置，请检查 config/web3.json 文件`,
          { projectRoot: this.projectRoot, network: _network, chain: _chain }
        );
      }
      this.web3Config = config;
    }

    // loadWeb3ConfigSync 根据环境变量返回对应的配置
    // 此时 this.web3Config 一定不为 null（因为上面已经检查并赋值）
    return this.web3Config;
  }

  /**
   * 获取环境变量配置
   * @param key 配置键
   * @returns 配置值，如果不存在则返回 undefined
   */
  getEnvConfig(key: string): string | undefined {
    return this.envConfig?.[key];
  }

  /**
   * 获取所有环境变量配置
   */
  getAllEnvConfig(): Record<string, string> {
    return this.envConfig || {};
  }

  /**
   * 清除缓存，强制重新加载配置
   */
  clearCache(): void {
    this.web3Config = null;
    this.envConfig = null;
  }

  /**
   * 查找项目根目录
   */
  private findProjectRoot(startDir: string): string {
    let currentDir = startDir;
    const root = /^\/$/;

    while (true) {
      const denoJsonPath = join(currentDir, "deno.json");
      if (existsSync(denoJsonPath)) {
        return currentDir;
      }

      const parentDir = join(currentDir, "..");
      if (parentDir === currentDir || root.test(currentDir)) {
        return startDir; // 如果找不到，返回起始目录
      }
      currentDir = parentDir;
    }
  }
}
