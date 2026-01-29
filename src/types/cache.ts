/**
 * @title Cache Types
 * @description 缓存相关的类型定义
 */

/**
 * 全局缓存接口
 */
export interface GlobalCache {
  [key: string]: unknown;
}

/**
 * 命令状态类型（兼容 Deno.Command 和 runtime-adapter）
 */
export interface CommandStatus {
  success?: boolean;
  code?: number | null;
  signal?: string | null;
}
