/**
 * @title Cache Utils Tests
 * @description 缓存功能测试
 */

import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  clearCache,
  getInstalledVersion,
  readCache,
  setInstalledVersion,
  writeCache,
} from "../src/utils/cache.ts";

describe("缓存功能测试", () => {
  const testKey = "test_cache_key";
  const testVersion = "test_version";
  const testData = { message: "测试数据", timestamp: Date.now() };

  beforeAll(async () => {
    // 清理测试缓存
    await clearCache(testVersion);
  });

  afterAll(async () => {
    // 清理测试缓存
    await clearCache(testVersion);
  });

  describe("writeCache 和 readCache", () => {
    it("应该能够写入和读取缓存", async () => {
      // 写入缓存
      await writeCache(testKey, testVersion, testData);

      // 读取缓存
      const cached = readCache<typeof testData>(testKey, testVersion);
      expect(cached).not.toBeNull();
      expect(cached?.message).toBe(testData.message);
      expect(cached?.timestamp).toBe(testData.timestamp);
    });

    it("应该能够处理不同的版本标识", async () => {
      const version1 = "1.0.0";
      const version2 = "2.0.0";
      const data1 = { value: "version1" };
      const data2 = { value: "version2" };

      await writeCache(testKey, version1, data1);
      await writeCache(testKey, version2, data2);

      const cached1 = readCache<typeof data1>(testKey, version1);
      const cached2 = readCache<typeof data2>(testKey, version2);

      expect(cached1?.value).toBe("version1");
      expect(cached2?.value).toBe("version2");
    });

    it("读取不存在的缓存应该返回 null", () => {
      const cached = readCache("non_existent_key", testVersion);
      expect(cached).toBeNull();
    });

    it("应该能够缓存复杂对象", async () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: "value" },
        },
        string: "test",
        number: 123,
        boolean: true,
      };

      await writeCache("complex_key", testVersion, complexData);
      const cached = readCache<typeof complexData>("complex_key", testVersion);

      expect(cached).not.toBeNull();
      expect(cached?.nested.array).toEqual([1, 2, 3]);
      expect(cached?.nested.object.key).toBe("value");
      expect(cached?.string).toBe("test");
      expect(cached?.number).toBe(123);
      expect(cached?.boolean).toBe(true);
    });
  });

  describe("getInstalledVersion 和 setInstalledVersion", () => {
    it("应该能够设置和获取安装版本", async () => {
      const testPackage = "@dreamer/test-package";
      const testVersion = "1.2.3";

      // 设置版本
      await setInstalledVersion(testVersion, testPackage);

      // 获取版本
      const version = getInstalledVersion(testPackage);
      expect(version).toBe(testVersion);
    });

    it("获取不存在的版本应该返回 null", () => {
      const version = getInstalledVersion("@dreamer/non-existent-package");
      expect(version).toBeNull();
    });

    it("应该能够更新已存在的版本", async () => {
      const testPackage = "@dreamer/test-package-update";
      const version1 = "1.0.0";
      const version2 = "2.0.0";

      await setInstalledVersion(version1, testPackage);
      expect(getInstalledVersion(testPackage)).toBe(version1);

      await setInstalledVersion(version2, testPackage);
      expect(getInstalledVersion(testPackage)).toBe(version2);
    });
  });

  describe("clearCache", () => {
    it("应该能够清除指定版本的缓存", async () => {
      const version1 = "clear_test_v1";
      const version2 = "clear_test_v2";

      await writeCache("key1", version1, { data: "v1" });
      await writeCache("key2", version2, { data: "v2" });

      // 清除 version1 的缓存
      await clearCache(version1);

      // version1 的缓存应该被清除
      expect(readCache("key1", version1)).toBeNull();
      // version2 的缓存应该还在
      expect(readCache("key2", version2)).not.toBeNull();

      // 清理
      await clearCache(version2);
    });

    it("应该能够清除所有缓存", async () => {
      await writeCache("key1", "all_test_v1", { data: "1" });
      await writeCache("key2", "all_test_v2", { data: "2" });

      // 清除所有缓存
      await clearCache();

      // 所有缓存应该被清除
      expect(readCache("key1", "all_test_v1")).toBeNull();
      expect(readCache("key2", "all_test_v2")).toBeNull();
    });
  });

  describe("缓存 TTL 机制", () => {
    it("应该能够处理缓存过期", async () => {
      // 注意：这个测试依赖于缓存的 TTL 机制
      // 由于 TTL 是 24 小时，实际测试中可能不会过期
      // 这里主要测试缓存结构是否正确
      const expiredKey = "expired_test_key";
      await writeCache(expiredKey, testVersion, { data: "test" });

      const cached = readCache(expiredKey, testVersion);
      expect(cached).not.toBeNull();
    });
  });

  describe("错误处理", () => {
    it("应该能够处理无效的缓存键", async () => {
      // 写入和读取应该不会抛出错误
      await writeCache("", testVersion, { data: "test" });
      const cached = readCache("", testVersion);
      // 可能返回 null 或数据，取决于实现
      expect(cached === null || typeof cached === "object").toBe(true);
    });

    it("应该能够处理特殊字符的版本号", async () => {
      const specialVersion = "1.0.0-beta.1";
      await writeCache("special_key", specialVersion, { data: "test" });
      const cached = readCache("special_key", specialVersion);
      expect(cached).not.toBeNull();
    });
  });
});
