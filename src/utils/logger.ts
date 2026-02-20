/**
 * @module @dreamer/foundry/utils/logger
 * @title Logger Utils
 * @description 统一日志实例，基于 @dreamer/logger，供 foundry 各模块使用。
 */

import { createLogger, type Logger } from "@dreamer/logger";

/**
 * Foundry 包内共享的 logger 实例（不显示时间与级别前缀，便于 CLI 输出）
 */
export const logger: Logger = createLogger({
  showTime: false,
  showLevel: false,
});
