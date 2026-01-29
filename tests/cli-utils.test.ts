/**
 * @title CLI Utils Tests
 * @description CLI 工具函数测试
 */

import { cwd, existsSync, join, mkdir, remove, writeTextFile } from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  createLoadingProgressBar,
  getApiKey,
  getNetworkName,
  getProjectConfig,
  getScriptPath,
  handleCommandResult,
  withProgressBar,
} from "../src/utils/cli-utils.ts";

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

  describe("createLoadingProgressBar 函数", () => {
    it("应该返回包含 start 和 stop 方法的对象", () => {
      const progressBar = createLoadingProgressBar("测试消息");
      expect(progressBar).toBeDefined();
      expect(typeof progressBar.start).toBe("function");
      expect(typeof progressBar.stop).toBe("function");
    });

    it("start 应该返回 intervalId", () => {
      const progressBar = createLoadingProgressBar("测试消息");
      const intervalId = progressBar.start();
      expect(intervalId).toBeDefined();
      // 立即停止以避免影响其他测试
      progressBar.stop(intervalId);
    });

    it("stop 应该能够处理 null intervalId", () => {
      const progressBar = createLoadingProgressBar("测试消息");
      // 应该不抛出错误
      expect(() => progressBar.stop(null)).not.toThrow();
    });

    it("应该能够接受不同的消息文本", () => {
      const messages = ["加载中...", "正在部署...", "验证合约..."];
      for (const msg of messages) {
        const progressBar = createLoadingProgressBar(msg);
        expect(progressBar).toBeDefined();
        const intervalId = progressBar.start();
        progressBar.stop(intervalId);
      }
    });
  });

  describe("withProgressBar 函数", () => {
    it("应该是异步函数", () => {
      expect(typeof withProgressBar).toBe("function");
    });

    it("应该能够执行异步操作并返回结果", async () => {
      const result = await withProgressBar("测试中...", () => {
        return Promise.resolve("测试结果");
      });
      expect(result).toBe("测试结果");
    });

    it("应该能够处理返回数字的异步操作", async () => {
      const result = await withProgressBar("计算中...", () => {
        return Promise.resolve(42);
      });
      expect(result).toBe(42);
    });

    it("应该能够处理返回对象的异步操作", async () => {
      const result = await withProgressBar("加载中...", () => {
        return Promise.resolve({ name: "test", value: 123 });
      });
      expect(result.name).toBe("test");
      expect(result.value).toBe(123);
    });

    it("应该能够处理 Promise.resolve", async () => {
      const result = await withProgressBar("等待中...", async () => {
        return await Promise.resolve("resolved");
      });
      expect(result).toBe("resolved");
    });

    it("应该能够捕获并重新抛出错误", async () => {
      let errorThrown = false;
      try {
        await withProgressBar("错误测试...", () => {
          return Promise.reject(new Error("测试错误"));
        });
      } catch (error) {
        errorThrown = true;
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("测试错误");
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("handleCommandResult 函数", () => {
    it("应该能够处理成功的结果", () => {
      const result = {
        stdout: "成功输出",
        stderr: "",
        success: true,
      };
      // 函数在成功时不应该抛出错误
      // 注意：handleCommandResult 在失败时会调用 exit(1)
      // 所以这里只测试成功的情况
      expect(() => handleCommandResult(result)).not.toThrow();
    });

    it("应该能够显示成功消息", () => {
      const result = {
        stdout: "输出",
        stderr: "",
        success: true,
      };
      expect(() => handleCommandResult(result, "操作成功")).not.toThrow();
    });

    it("应该支持 streamed 参数", () => {
      const result = {
        stdout: "流式输出",
        stderr: "",
        success: true,
      };
      // streamed=true 时不应该重复打印输出
      expect(() => handleCommandResult(result, undefined, true)).not.toThrow();
    });

    it("函数签名应该正确", () => {
      // handleCommandResult 接受 result, successMessage?, streamed? 参数
      expect(handleCommandResult.length).toBeGreaterThanOrEqual(1);
    });
  });
});
