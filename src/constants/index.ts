/**
 * @title Constants
 * @description 项目常量定义
 */

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 2000; // 毫秒

/** “already known” 时用更高 gas 替换 mempool 交易的重试次数 */
export const ALREADY_KNOWN_REPLACE_RETRIES = 2;
/** 每次替换重试的 gas 涨幅倍数（相对当前链上 gas price） */
export const GAS_BUMP_MULTIPLIERS = [1.2, 1.5] as const;

/**
 * 缓存 TTL（毫秒）
 */
export const CACHE_TTL = {
  /** meta.json 缓存时间：1小时 */
  META: 3600000,
  /** deno.json 缓存时间：24小时 */
  DENO_JSON: 86400000,
  /** 合约信息缓存：永久 */
  CONTRACT: Infinity,
} as const;

/**
 * 默认网络
 */
export const DEFAULT_NETWORK = "local";

/**
 * 默认链 ID
 */
export const DEFAULT_CHAIN_ID = 31337; // Anvil 默认链 ID

/**
 * 进度条更新间隔（毫秒）
 */
export const PROGRESS_BAR_INTERVAL = 100;

/**
 * 进度条清除行长度
 */
export const PROGRESS_BAR_CLEAR_LENGTH = 50;
