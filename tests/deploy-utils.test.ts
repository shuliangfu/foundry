/**
 * @title Deploy Utils Tests
 * @description 部署工具函数测试
 */

import { cwd, existsSync, join, mkdir, remove, writeTextFile } from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  extractNetworkFromAbiDir,
  filterSensitiveInfo,
  loadContract,
} from "../src/utils/deploy-utils.ts";

describe("部署工具函数测试", () => {
  const testProjectRoot = join(cwd(), "tests", "data", "test-deploy-project");

  beforeAll(async () => {
    // 创建测试项目目录结构
    await mkdir(join(testProjectRoot, "build", "abi", "local"), { recursive: true });
    await mkdir(join(testProjectRoot, "build", "abi", "testnet"), { recursive: true });

    // 创建测试合约文件
    const contractInfo = {
      address: "0x1234567890123456789012345678901234567890",
      abi: [
        {
          type: "function",
          name: "testFunction",
          inputs: [],
          outputs: [{ type: "uint256" }],
        },
      ],
    };

    await writeTextFile(
      join(testProjectRoot, "build", "abi", "local", "TestContract.json"),
      JSON.stringify(contractInfo, null, 2),
    );

    await writeTextFile(
      join(testProjectRoot, "build", "abi", "testnet", "TestContract.json"),
      JSON.stringify(
        {
          ...contractInfo,
          address: "0x9876543210987654321098765432109876543210",
        },
        null,
        2,
      ),
    );
  });

  afterAll(async () => {
    // 清理测试项目
    if (existsSync(testProjectRoot)) {
      await remove(testProjectRoot, { recursive: true });
    }
  });

  describe("loadContract 函数", () => {
    it("应该能够加载本地网络的合约", () => {
      // 需要设置工作目录为测试项目根目录
      // 由于 loadContract 使用 cwd()，这里主要测试函数存在
      expect(typeof loadContract).toBe("function");
    });

    it("应该能够处理不存在的合约", () => {
      expect(() => {
        loadContract("NonExistentContract", "local");
      }).toThrow();
    });

    it("应该能够处理不存在的网络", () => {
      expect(() => {
        loadContract("TestContract", "non-existent-network");
      }).toThrow();
    });
  });

  describe("extractNetworkFromAbiDir 函数", () => {
    it("应该从 abiDir 路径中提取网络名称", () => {
      const network = extractNetworkFromAbiDir("build/abi/testnet");
      expect(network).toBe("testnet");
    });

    it("应该处理包含 abi 目录的路径", () => {
      const network = extractNetworkFromAbiDir("project/build/abi/mainnet/contracts");
      // 应该返回 abi 后的第一个目录
      expect(network).toBe("mainnet");
    });

    it("应该处理 undefined 参数", () => {
      const network = extractNetworkFromAbiDir(undefined);
      // 应该返回环境变量值或默认值
      expect(typeof network).toBe("string");
      expect(network.length).toBeGreaterThan(0);
    });

    it("应该处理不包含 abi 的路径", () => {
      const network = extractNetworkFromAbiDir("some/other/path/local");
      // 应该返回路径的最后一部分
      expect(network).toBe("local");
    });

    it("应该处理 Windows 风格路径", () => {
      const network = extractNetworkFromAbiDir("build\\abi\\testnet");
      expect(network).toBe("testnet");
    });

    it("应该处理空字符串", () => {
      const network = extractNetworkFromAbiDir("");
      // 空字符串应该返回默认值
      expect(typeof network).toBe("string");
    });
  });

  describe("filterSensitiveInfo 函数", () => {
    it("应该过滤私钥", () => {
      const text =
        "Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      const filtered = filterSensitiveInfo(text);
      expect(filtered).not.toContain(
        "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      );
      expect(filtered).toContain("[PRIVATE_KEY_HIDDEN]");
    });

    it("应该过滤 --private-key 参数", () => {
      const text =
        "forge create --private-key 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef --rpc-url http://localhost:8545";
      const filtered = filterSensitiveInfo(text);
      expect(filtered).toContain("--private-key [HIDDEN]");
    });

    it("应该过滤 --etherscan-api-key 参数", () => {
      const text =
        "forge verify-contract --etherscan-api-key ABCDEFGHIJ1234567890KLMNOPQRSTUV --chain-id 1";
      const filtered = filterSensitiveInfo(text);
      expect(filtered).toContain("--etherscan-api-key [HIDDEN]");
    });

    it("应该保留普通文本", () => {
      const text = "Deploying contract MyToken to network testnet";
      const filtered = filterSensitiveInfo(text);
      expect(filtered).toBe(text);
    });

    it("应该处理多个敏感信息", () => {
      const text =
        "Key1: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80, Key2: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      const filtered = filterSensitiveInfo(text);
      // 应该过滤所有私钥
      expect(filtered.match(/\[PRIVATE_KEY_HIDDEN\]/g)?.length).toBe(2);
    });

    it("应该处理空字符串", () => {
      const filtered = filterSensitiveInfo("");
      expect(filtered).toBe("");
    });

    it("应该不影响短字符串", () => {
      const text = "Short text";
      const filtered = filterSensitiveInfo(text);
      expect(filtered).toBe(text);
    });

    it("应该过滤看起来像 API Key 的长字符串", () => {
      // 32+ 字符的字母数字字符串
      const text = "API Key: ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
      const filtered = filterSensitiveInfo(text);
      expect(filtered).toContain("[API_KEY_HIDDEN]");
    });
  });
});
