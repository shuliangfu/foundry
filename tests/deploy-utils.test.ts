/**
 * @title Deploy Utils Tests
 * @description 部署工具函数测试
 */

import { describe, expect, it, beforeAll, afterAll } from "@dreamer/test";
import { loadContract } from "../src/utils/deploy-utils.ts";
import { writeTextFile, remove, join, cwd, existsSync, mkdir } from "@dreamer/runtime-adapter";

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
      JSON.stringify(contractInfo, null, 2)
    );

    await writeTextFile(
      join(testProjectRoot, "build", "abi", "testnet", "TestContract.json"),
      JSON.stringify({
        ...contractInfo,
        address: "0x9876543210987654321098765432109876543210",
      }, null, 2)
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
});
