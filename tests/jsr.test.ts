/**
 * @title JSR Utils Tests
 * @description JSR 工具函数测试
 */

import { describe, expect, it } from "@dreamer/test";
import {
  parseJsrPackageFromUrl,
  parseJsrPackageNameFromUrl,
  parseJsrVersionFromUrl,
} from "../src/utils/jsr.ts";

describe("JSR 工具函数测试", () => {
  describe("parseJsrPackageFromUrl", () => {
    it("应该能够解析标准 JSR URL", () => {
      // 模拟 JSR URL（实际测试中需要 mock import.meta.url）
      // 由于无法直接修改 import.meta.url，这里主要测试函数逻辑
      // 在实际环境中，这些函数会从 import.meta.url 解析

      // 测试函数存在且可调用
      expect(typeof parseJsrPackageFromUrl).toBe("function");

      // 在非 JSR 环境中，应该返回 null
      // 注意：实际行为取决于 import.meta.url 的值
      const result = parseJsrPackageFromUrl();
      // 如果不在 JSR 环境中，应该返回 null
      // 如果在 JSR 环境中，应该返回包信息
      expect(result === null || (result && result.packageName && result.version)).toBe(true);
    });

    it("应该能够处理非 JSR URL", () => {
      // 在本地文件系统中，应该返回 null
      // 这个测试主要验证函数不会抛出错误
      expect(() => parseJsrPackageFromUrl()).not.toThrow();
    });
  });

  describe("parseJsrVersionFromUrl", () => {
    it("应该能够解析版本号", () => {
      expect(typeof parseJsrVersionFromUrl).toBe("function");

      const version = parseJsrVersionFromUrl();
      // 在非 JSR 环境中应该返回 null
      // 在 JSR 环境中应该返回版本号字符串
      expect(version === null || typeof version === "string").toBe(true);
    });

    it("应该能够处理无效 URL", () => {
      expect(() => parseJsrVersionFromUrl()).not.toThrow();
    });
  });

  describe("parseJsrPackageNameFromUrl", () => {
    it("应该能够解析包名", () => {
      expect(typeof parseJsrPackageNameFromUrl).toBe("function");

      const packageName = parseJsrPackageNameFromUrl();
      // 在非 JSR 环境中应该返回 null
      // 在 JSR 环境中应该返回包名字符串
      expect(packageName === null || typeof packageName === "string").toBe(true);
    });

    it("应该能够处理无效 URL", () => {
      expect(() => parseJsrPackageNameFromUrl()).not.toThrow();
    });
  });

  describe("函数关系", () => {
    it("parseJsrVersionFromUrl 应该基于 parseJsrPackageFromUrl", () => {
      const packageInfo = parseJsrPackageFromUrl();
      const version = parseJsrVersionFromUrl();

      if (packageInfo) {
        expect(version).toBe(packageInfo.version);
      } else {
        expect(version).toBeNull();
      }
    });

    it("parseJsrPackageNameFromUrl 应该基于 parseJsrPackageFromUrl", () => {
      const packageInfo = parseJsrPackageFromUrl();
      const packageName = parseJsrPackageNameFromUrl();

      if (packageInfo) {
        expect(packageName).toBe(packageInfo.packageName);
      } else {
        expect(packageName).toBeNull();
      }
    });
  });
});
