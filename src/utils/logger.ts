/**
 * @title Logger Utils
 * @dev 统一的日志工具 - 使用 @dreamer/logger
 */

import { createLogger, type Logger } from "./deps.ts";

// 创建全局 logger 实例
export const logger: Logger = createLogger({
  showTime: false,
  showLevel: false,
});
