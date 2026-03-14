/**
 * @module @dreamer/foundry/utils/time
 * @title 时间推进工具
 * @description 推进 Anvil 区块链时间，供依赖 block.timestamp 的合约使用；不修改系统时间，通过 RPC 调用即可。
 *
 * 说明：
 * - 合约使用 block.timestamp 获取时间，这是区块链时间
 * - Anvil 可以通过 evm_increaseTime RPC 方法推进区块链时间
 * - evm_increaseTime 理论上可以推进任意时间（U256 范围），但建议使用合理的时间间隔
 * - 推进区块链时间后，合约内依赖 block.timestamp 的逻辑会在下次调用时读到新时间
 * - **不需要修改系统时间，也不需要重启 Docker 容器**
 * - 直接通过 RPC 调用即可修改时间，容器保持运行状态
 *
 * 时间限制：
 * - 输入参数：U256（理论上可以非常大，如数亿年）
 * - 返回值：i64（约 2920 亿年的上限）
 * - 建议：使用合理的时间间隔（天、周、月、年），避免极端值
 *
 * 注意：
 * - 只有在需要重置整个区块链状态时才需要重启容器
 * - 时间推进不会影响已部署的合约和状态数据
 */

import { logger } from "./logger.ts";
import { getEnv, loadEnv } from "./env.ts";
import { loadWeb3ConfigSync } from "./web3.ts";

/**
 * 获取当前系统时间戳（秒，东8区 UTC+8）
 * @param timezone 时区（默认8小时）
 * @returns 当前系统时间戳（秒，已加上8小时偏移）
 */
function getSystemTimestamp(timezone: number = 8): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + timezone * 60 * 60);
}

/**
 * 获取 Anvil 区块链当前时间戳
 * @returns 区块链时间戳（秒），如果失败则返回 null
 */
export async function getAnvilTimestamp(): Promise<bigint | null> {
  try {
    loadEnv();
    // 从 loadWeb3ConfigSync 读取当前网络配置（rpcUrl 等，按 WEB3_ENV 选择网络）
    const config = loadWeb3ConfigSync();
    const rpcUrl = config?.rpcUrl;

    if (!rpcUrl) {
      logger.warn("⚠️  无法获取 RPC URL");
      return null;
    }

    // 获取最新区块的时间戳
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", false],
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      logger.warn(`⚠️  获取区块链时间失败: ${data.error.message || JSON.stringify(data.error)}`);
      return null;
    }

    if (data.result && data.result.timestamp) {
      // 将十六进制时间戳转换为 bigint
      const timestamp = BigInt(data.result.timestamp);
      return timestamp;
    }

    return null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`⚠️  获取区块链时间失败: ${message}`);
    return null;
  }
}

/**
 * 同步 Anvil 时间到系统当前时间
 * @param silent 是否静默模式（默认 false）
 * @returns 是否成功
 *
 * @example
 * // 同步 Anvil 时间到系统时间
 * await syncAnvilTime();
 */
export async function syncAnvilTime(silent: boolean = false): Promise<boolean> {
  try {
    loadEnv();
    const network = getEnv("WEB3_ENV") || "local";

    if (network !== "local") {
      if (!silent) {
        logger.warn("⚠️  只有本地网络支持同步 Anvil 时间");
      }
      return false;
    }

    // 获取系统当前时间（东8区 UTC+8）
    const systemTimestamp = getSystemTimestamp();
    const systemDate = new Date(Number(systemTimestamp) * 1000);

    if (!silent) {
      logger.info(`📊 系统时间（东8区 UTC+8）: ${systemTimestamp} (${systemDate.toISOString()})`);
    }

    // 获取当前 Anvil 时间
    const anvilTimestamp = await getAnvilTimestamp();
    if (anvilTimestamp) {
      const anvilDate = new Date(Number(anvilTimestamp) * 1000);
      const timeDiff = Number(systemTimestamp - anvilTimestamp);

      if (!silent) {
        logger.info(`📊 Anvil 时间: ${anvilTimestamp} (${anvilDate.toISOString()})`);
        if (timeDiff !== 0) {
          logger.info(`   时间差: ${timeDiff > 0 ? "+" : ""}${timeDiff} 秒`);
        } else {
          logger.info("   ✅ 时间已同步");
          return true;
        }
      } else if (timeDiff === 0) {
        return true;
      }
    }

    // 从 loadWeb3ConfigSync 获取当前网络 RPC URL
    const config = loadWeb3ConfigSync();
    const rpcUrl = config?.rpcUrl;

    if (!rpcUrl) {
      if (!silent) {
        logger.warn("⚠️  无法获取 RPC URL");
      }
      return false;
    }

    if (!silent) {
      logger.info(`🔄 设置 Anvil 时间到系统时间...`);
    }

    // 使用 evm_setTime 设置时间（参数需要是十六进制字符串）
    const timestampHex = "0x" + systemTimestamp.toString(16);
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "evm_setTime",
        params: [timestampHex],
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      if (!silent) {
        logger.warn(`⚠️  设置时间失败: ${data.error.message || JSON.stringify(data.error)}`);
      }
      return false;
    }

    if (data.result !== undefined) {
      // 推进一个区块，让时间生效
      const mineResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "evm_mine",
          params: [],
          id: 2,
        }),
      });

      const mineData = await mineResponse.json();
      if (mineData.error && !silent) {
        logger.warn(`⚠️  挖矿失败: ${mineData.error.message || JSON.stringify(mineData.error)}`);
      }

      if (!silent) {
        logger.info(`✅ Anvil 时间已同步到系统时间`);
      }

      return true;
    }

    return false;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (!silent) {
      logger.warn(`⚠️  同步 Anvil 时间失败: ${message}`);
    }
    return false;
  }
}

/**
 * 使用 Anvil RPC 推进区块链时间
 * @param seconds 要推进的秒数（可以是任意正数，建议使用合理值）
 * @param silent 为 true 时不输出「推进中」「已推进」等 info 日志，仅保留错误提示
 * @returns 是否成功
 *
 * @example
 * // 推进 1 天
 * await advanceAnvilTime(86400);
 *
 * // 推进 1 天（静默，用于循环中逐日推进）
 * await advanceAnvilTime(86400, true);
 */
export async function advanceAnvilTime(seconds: number, silent?: boolean): Promise<boolean> {
  try {
    const network = getEnv("WEB3_ENV") || "local";

    if (network !== "local") {
      logger.warn("⚠️  只有本地网络支持推进 Anvil 时间");
      return false;
    }

    // 验证时间值是否合理（可选，但建议检查）
    if (seconds < 0) {
      logger.warn("⚠️  时间值不能为负数");
      return false;
    }

    // 警告：如果时间值过大（超过 100 年），给出提示
    const years = seconds / (365 * 24 * 60 * 60);
    if (years > 100) {
      logger.warn(`⚠️  推进时间较大（${years.toFixed(2)} 年），请确认是否合理`);
    }

    // 从 loadWeb3ConfigSync 获取当前网络 RPC URL（按 WEB3_ENV 选择网络）
    const config = loadWeb3ConfigSync();
    if (!config) {
      logger.warn(`⚠️  无法获取网络配置: ${network}`);
      return false;
    }
    const rpcUrl = config.rpcUrl;

    if (!rpcUrl) {
      logger.warn("⚠️  无法获取 RPC URL（rpcUrl 为空）");
      return false;
    }

    // 格式化时间显示（天、小时、分钟）
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const timeStr = days > 0
      ? `${days} 天${hours > 0 ? ` ${hours} 小时` : ""}${minutes > 0 ? ` ${minutes} 分钟` : ""}`
      : hours > 0
      ? `${hours} 小时${minutes > 0 ? ` ${minutes} 分钟` : ""}`
      : `${minutes} 分钟`;

    if (!silent) {
      logger.info(`   推进 Anvil 区块链时间 ${timeStr} (${seconds} 秒)...`);
    }

    // 使用 evm_increaseTime 推进时间
    // 注意：参数需要是字符串格式（因为 U256 可能超出 JavaScript Number 范围）
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds.toString()], // 转换为字符串，支持大数值
        id: 1,
      }),
    });

    const data = await response.json();

    if (data.error) {
      logger.warn(`   ⚠️  推进时间失败: ${data.error.message || JSON.stringify(data.error)}`);
      return false;
    }

    if (data.result !== undefined) {
      if (!silent) {
        logger.info(`   ✅ Anvil 区块链时间已推进 ${timeStr}`);
      }

      // 推进一个区块，让时间生效
      const mineResponse = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "evm_mine",
          params: [],
          id: 2,
        }),
      });

      const mineData = await mineResponse.json();
      if (mineData.error) {
        logger.warn(`   ⚠️  挖矿失败: ${mineData.error.message || JSON.stringify(mineData.error)}`);
        // 即使挖矿失败，时间推进也可能已生效，所以仍然返回 true
      }

      // 获取最新的区块时间戳并转换为年-月-日格式
      if (!silent) {
        try {
          const blockResponse = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getBlockByNumber",
              params: ["latest", false],
              id: 3,
            }),
          });

          const blockData = await blockResponse.json();
          if (blockData.result && blockData.result.timestamp) {
            // 时间戳是十六进制字符串，转换为十进制（秒）
            const timestampSeconds = parseInt(blockData.result.timestamp, 16);
            // 转换为毫秒并加上8小时（北京时间偏移）
            const beijingTimestampMs = timestampSeconds * 1000 + 8 * 60 * 60 * 1000;
            // 创建Date对象（使用UTC方法）
            const beijingDate = new Date(beijingTimestampMs);
            // 格式化为年-月-日（使用UTC方法获取北京时间）
            const year = beijingDate.getUTCFullYear();
            const month = String(beijingDate.getUTCMonth() + 1).padStart(2, "0");
            const day = String(beijingDate.getUTCDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            logger.info(`   当前时间: ${dateStr}`);
          }
        } catch (error: unknown) {
          // 获取时间失败不影响主流程，只记录警告
          logger.warn(
            `   ⚠️  获取最新时间失败: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      return true;
    }

    return false;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`   ⚠️  推进 Anvil 时间失败: ${message}`);
    return false;
  }
}

/**
 * 推进时间（使用 Anvil 区块链时间）
 * @param days 要推进的天数（可以是小数，如 0.5 表示 12 小时）
 * @returns 是否成功
 *
 * @example
 * // 推进 1 天
 * await advanceTime(1);
 *
 * // 推进 7 天（1周）
 * await advanceTime(7);
 *
 * // 推进 30 天（1个月）
 * await advanceTime(30);
 *
 * // 推进 365 天（1年）
 * await advanceTime(365);
 */
export async function advanceTime(days: number = 1): Promise<boolean> {
  const seconds = Math.floor(days * 24 * 60 * 60);
  return await advanceAnvilTime(seconds);
}
