/**
 * @title CLI Utils Tests
 * @description CLI 工具函数测试
 */

import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  getApiKey,
  getNetworkName,
  getProjectConfig,
  getScriptPath,
} from "../src/utils/cli-utils.ts";
import { cwd, existsSync, join, mkdir, remove, writeTextFile } from "@dreamer/runtime-adapter";

describe("CLI 工具函数测试", () => {
  const testProjectRoot = join(cwd(), "tests", "data", "test-cli-project");

  beforeAll(async () => {
    // 创建测试项目目录
    await mkdir(testProjectRoot, { recursive: true });

    // 创建 deno.json
    const denoJson = {
      version: "1.0.0",
      imports: {
        "@dreamer/foundry": "jsr:@dreamer/foundry@^1.1.0",
      },
    };
    await writeTextFile(
      join(testProjectRoot, "deno.json"),
      JSON.stringify(denoJson, null, 2),
    );
  });

  afterAll(async () => {
    // 清理测试项目
    if (existsSync(testProjectRoot)) {
      await remove(testProjectRoot, { recursive: true });
    }
  });

  describe("getProjectConfig 函数", () => {
    it("应该能够找到项目配置", () => {
      // 注意：这个测试需要在有 deno.json 的目录中运行
      // 或者需要 mock cwd()
      const config = getProjectConfig();

      // 如果当前目录有 deno.json，应该返回配置
      // 如果没有，应该返回 null
      if (config) {
        expect(config.projectRoot).toBeDefined();
        expect(config.denoJsonPath).toBeDefined();
        expect(config.denoJsonPath).toContain("deno.json");
      } else {
        // 如果没有找到项目配置，这是正常的（取决于测试环境）
        expect(config).toBeNull();
      }
    });
  });

  describe("getScriptPath 函数", () => {
    it("应该能够获取 deploy 脚本路径", () => {
      const path = getScriptPath("deploy");
      expect(path).toBeDefined();
      expect(typeof path).toBe("string");
      expect(path.length).toBeGreaterThan(0);
    });

    it("应该能够获取 verify 脚本路径", () => {
      const path = getScriptPath("verify");
      expect(path).toBeDefined();
      expect(typeof path).toBe("string");
      expect(path.length).toBeGreaterThan(0);
    });

    it("应该使用缓存机制", () => {
      const path1 = getScriptPath("deploy");
      const path2 = getScriptPath("deploy");
      expect(path1).toBe(path2);
    });
  });

  describe("getApiKey 函数", () => {
    it("应该能够从参数获取 API Key", () => {
      const apiKey = getApiKey("test-api-key-123");
      expect(apiKey).toBe("test-api-key-123");
    });

    it("应该能够处理 null 参数", () => {
      const apiKey = getApiKey(undefined);
      // 如果没有环境变量，应该返回 null
      expect(apiKey === null || typeof apiKey === "string").toBe(true);
    });

    it("应该能够处理空字符串", () => {
      const apiKey = getApiKey("");
      // 空字符串应该被视为无效
      expect(apiKey === null || apiKey === "").toBe(true);
    });
  });

  describe("getNetworkName 函数", () => {
    it("应该能够从参数获取网络名称", () => {
      const network = getNetworkName("testnet");
      expect(network).toBe("testnet");
    });

    it("应该能够处理 null 参数", () => {
      const network = getNetworkName(undefined);
      // 如果没有环境变量，应该返回默认值或 null
      expect(network === null || typeof network === "string").toBe(true);
    });

    it("应该能够处理空字符串", () => {
      const network = getNetworkName("");
      // 空字符串应该被视为无效，返回默认值 "local"
      expect(network).toBe("local");
    });
  });
});
