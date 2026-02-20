/**
 * cmd 共用：确认提示等，供各命令的 CLI 逻辑使用
 */

import { readStdin, writeStdoutSync } from "@dreamer/runtime-adapter";
import { $tr } from "../i18n.ts";
import { logger } from "../utils/logger.ts";

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
