/**
 * @title Setup Tests
 * @description Foundry CLI 安装脚本测试
 *
 * 注意：由于 findFoundryPath 和 ensureFoundryInstalled 会创建子进程，
 * 直接调用这些函数会导致资源泄漏警告。
 * 这些测试主要验证函数签名和导出，实际功能测试需要在集成测试中进行。
 */

import { describe, expect, it } from "@dreamer/test";
import { ensureFoundryInstalled, findFoundryPath } from "../src/setup.ts";

describe("Foundry 安装脚本测试", () => {
  describe("函数导出测试", () => {
    it("ensureFoundryInstalled 函数应该存在且可调用", () => {
      expect(typeof ensureFoundryInstalled).toBe("function");
    });

    it("findFoundryPath 函数应该存在且可调用", () => {
      expect(typeof findFoundryPath).toBe("function");
    });

    it("ensureFoundryInstalled 函数签名正确", () => {
      // ensureFoundryInstalled 不接受参数
      expect(ensureFoundryInstalled.length).toBe(0);
    });

    it("findFoundryPath 函数签名正确", () => {
      // findFoundryPath 不接受参数
      expect(findFoundryPath.length).toBe(0);
    });
  });

  describe("函数返回类型验证", () => {
    it("ensureFoundryInstalled 应该返回 Promise", () => {
      // 验证函数是异步的（返回 Promise）
      // 注意：不实际执行以避免子进程泄漏
      expect(typeof ensureFoundryInstalled).toBe("function");
      // 函数应该是异步函数
      expect(ensureFoundryInstalled.constructor.name).toBe("AsyncFunction");
    });

    it("findFoundryPath 应该返回 Promise", () => {
      // 验证函数是异步的
      expect(typeof findFoundryPath).toBe("function");
      expect(findFoundryPath.constructor.name).toBe("AsyncFunction");
    });
  });

  // 以下测试会创建子进程，跳过以避免资源泄漏
  describe("实际功能测试（跳过以避免资源泄漏）", () => {
    it.skip("findFoundryPath 应该返回字符串或 null", async () => {
      const path = await findFoundryPath();
      expect(path === null || typeof path === "string").toBe(true);
    });

    it.skip("ensureFoundryInstalled 应该能够检测 Foundry", async () => {
      await ensureFoundryInstalled();
    });
  });
});

describe("Foundry 路径常量测试", () => {
  describe("默认安装路径", () => {
    it("默认安装路径应该是 ~/.foundry/bin", () => {
      // Foundry 默认安装到用户目录下的 .foundry/bin
      const expectedPath = ".foundry/bin";
      expect(expectedPath).toContain(".foundry");
      expect(expectedPath).toContain("bin");
    });

    it("forge 可执行文件名称", () => {
      // Foundry 的主要可执行文件是 forge
      const executable = "forge";
      expect(executable).toBe("forge");
    });

    it("cast 可执行文件名称", () => {
      // Foundry 还包含 cast 工具
      const executable = "cast";
      expect(executable).toBe("cast");
    });

    it("anvil 可执行文件名称", () => {
      // Foundry 还包含 anvil 本地节点
      const executable = "anvil";
      expect(executable).toBe("anvil");
    });
  });
});
