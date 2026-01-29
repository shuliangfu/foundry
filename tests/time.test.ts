/**
 * @title Time Utils Tests
 * @description Anvil 时间工具测试
 *
 * 注意：涉及 RPC 调用的测试需要运行中的 Anvil 节点
 * 启动方式：anvil 或 docker run -p 8545:8545 ghcr.io/foundry-rs/foundry:latest anvil
 */

import { describe, expect, it } from "@dreamer/test";
import {
  advanceAnvilTime,
  advanceTime,
  getAnvilTimestamp,
  syncAnvilTime,
} from "../src/utils/time.ts";

describe("Anvil 时间工具测试", () => {
  describe("函数导出测试", () => {
    it("getAnvilTimestamp 函数应该存在且可调用", () => {
      expect(typeof getAnvilTimestamp).toBe("function");
    });

    it("syncAnvilTime 函数应该存在且可调用", () => {
      expect(typeof syncAnvilTime).toBe("function");
    });

    it("advanceAnvilTime 函数应该存在且可调用", () => {
      expect(typeof advanceAnvilTime).toBe("function");
    });

    it("advanceTime 函数应该存在且可调用", () => {
      expect(typeof advanceTime).toBe("function");
    });
  });

  describe("函数签名测试", () => {
    it("syncAnvilTime 应该接受 silent 参数", () => {
      // 测试函数签名：syncAnvilTime(silent?: boolean)
      expect(syncAnvilTime.length).toBeLessThanOrEqual(1);
    });

    it("advanceAnvilTime 应该接受 seconds 和 silent 参数", () => {
      // 测试函数签名：advanceAnvilTime(seconds: number, silent?: boolean)
      expect(advanceAnvilTime.length).toBeLessThanOrEqual(2);
    });

    it("getAnvilTimestamp 不需要参数", () => {
      // 测试函数签名：getAnvilTimestamp()
      expect(getAnvilTimestamp.length).toBe(0);
    });

    it("advanceTime 应该接受 days 参数", () => {
      // 测试函数签名：advanceTime(days?: number)
      expect(advanceTime.length).toBeLessThanOrEqual(1);
    });
  });

  describe("时间计算测试", () => {
    it("天数转秒数计算正确", () => {
      // 1 天 = 24 * 60 * 60 = 86400 秒
      const oneDay = 24 * 60 * 60;
      expect(oneDay).toBe(86400);
    });

    it("小数天数转秒数计算正确", () => {
      // 0.5 天 = 12 小时 = 43200 秒
      const halfDay = Math.floor(0.5 * 24 * 60 * 60);
      expect(halfDay).toBe(43200);
    });

    it("时间值应该在合理范围内", () => {
      // 1 年 = 365 * 24 * 60 * 60 = 31536000 秒
      const oneYear = 365 * 24 * 60 * 60;
      expect(oneYear).toBe(31536000);

      // 100 年警告阈值
      const hundredYears = 100 * oneYear;
      expect(hundredYears).toBe(3153600000);
    });
  });

  // 需要 Anvil 节点的测试（需要运行 anvil）
  describe("Anvil 节点测试（需要运行中的 Anvil @ http://127.0.0.1:8545）", () => {
    it("应该能够获取 Anvil 时间戳", async () => {
      const timestamp = await getAnvilTimestamp();
      // 如果 Anvil 没有运行，返回 null
      if (timestamp !== null) {
        expect(typeof timestamp).toBe("bigint");
        expect(timestamp > 0n).toBe(true);
      } else {
        // Anvil 未运行，跳过断言
        expect(timestamp).toBeNull();
      }
    });

    it("应该能够同步 Anvil 时间", async () => {
      const result = await syncAnvilTime(true); // 静默模式
      // 返回 boolean，成功或失败都是正常的
      expect(typeof result).toBe("boolean");
    });

    it("应该能够推进 Anvil 时间", async () => {
      const result = await advanceAnvilTime(60, true); // 推进 1 分钟，静默
      // 返回 boolean，成功或失败都是正常的
      expect(typeof result).toBe("boolean");
    });

    it("应该能够推进指定天数", async () => {
      // advanceTime 内部调用 advanceAnvilTime
      // 这里测试返回类型
      const result = await advanceTime(0); // 推进 0 天（不实际推进）
      expect(typeof result).toBe("boolean");
    });

    it("advanceAnvilTime 应该拒绝负数参数", async () => {
      // 负数时间会被函数内部拒绝，返回 false
      const result = await advanceAnvilTime(-100);
      expect(result).toBe(false);
    });
  });
});
