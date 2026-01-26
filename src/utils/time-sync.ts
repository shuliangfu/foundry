/**
 * @title Time Sync Utils
 * @description System time synchronization control utilities
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 */

import { createCommand, platform } from "@dreamer/runtime-adapter";
import { logger } from "./logger.ts";

/**
 * 时间同步控制结果
 */
export interface TimeSyncResult {
  success: boolean;
  needManual: boolean;
  error?: string;
}

/**
 * 关闭系统自动时间同步
 */
export async function disableSystemTimeSync(
  platformName: string = platform(),
): Promise<TimeSyncResult> {
  logger.info("🕐 关闭系统自动时间同步...");

  try {
    let cmd;

    switch (platformName) {
      case "darwin":
        cmd = createCommand("sudo", {
          args: ["systemsetup", "-setusingnetworktime", "Off"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      case "linux":
        cmd = createCommand("sudo", {
          args: ["timedatectl", "set-ntp", "false"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      case "windows":
        cmd = createCommand("w32tm", {
          args: ["/config", "/manualpeerlist:time.windows.com", "/syncfromflags:manual"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      default:
        return {
          success: false,
          needManual: true,
          error: `不支持的操作系统: ${platformName}`,
        };
    }

    const output = await cmd.output();
    if (output.success) {
      logger.info("   ✅ 系统自动时间同步已关闭");
      return { success: true, needManual: false };
    } else {
      const errorMsg = new TextDecoder().decode(output.stderr);
      return {
        success: false,
        needManual: true,
        error: errorMsg,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      needManual: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 开启系统自动时间同步
 */
export async function enableSystemTimeSync(
  platformName: string = platform(),
): Promise<TimeSyncResult> {
  logger.info("🕐 开启系统自动时间同步...");

  try {
    let cmd;

    switch (platformName) {
      case "darwin":
        cmd = createCommand("sudo", {
          args: ["systemsetup", "-setusingnetworktime", "On"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      case "linux":
        cmd = createCommand("sudo", {
          args: ["timedatectl", "set-ntp", "true"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      case "windows":
        cmd = createCommand("w32tm", {
          args: ["/config", "/syncfromflags:domhier"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      default:
        return {
          success: false,
          needManual: true,
          error: `不支持的操作系统: ${platformName}`,
        };
    }

    const output = await cmd.output();
    if (output.success) {
      logger.info("   ✅ 系统自动时间同步已开启");
      return { success: true, needManual: false };
    } else {
      const errorMsg = new TextDecoder().decode(output.stderr);
      return {
        success: false,
        needManual: true,
        error: errorMsg,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      needManual: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 检查系统时间同步状态
 */
export async function getSystemTimeSyncStatus(
  platformName: string = platform(),
): Promise<boolean | null> {
  try {
    let cmd;

    switch (platformName) {
      case "darwin":
        cmd = createCommand("systemsetup", {
          args: ["-getusingnetworktime"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      case "linux":
        cmd = createCommand("timedatectl", {
          args: ["status"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      case "windows":
        cmd = createCommand("w32tm", {
          args: ["/query", "/status"],
          stdin: "null",
          stdout: "piped",
          stderr: "piped",
        });
        break;
      default:
        return null;
    }

    const output = await cmd.output();
    if (output.success) {
      const stdoutText = new TextDecoder().decode(output.stdout);
      if (platformName === "darwin") {
        return stdoutText.toLowerCase().includes("on");
      } else if (platformName === "linux") {
        return stdoutText.includes("NTP synchronized: yes");
      } else if (platformName === "windows") {
        return stdoutText.includes("Source:") && !stdoutText.includes("Free-running");
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 使用上下文管理器模式控制时间同步
 */
export async function withTimeSyncDisabled<T>(
  callback: () => Promise<T>,
  platformName: string = platform(),
): Promise<T> {
  const result = await disableSystemTimeSync(platformName);
  const wasDisabled = result.success;

  try {
    return await callback();
  } finally {
    if (wasDisabled) {
      await enableSystemTimeSync(platformName);
    }
  }
}
