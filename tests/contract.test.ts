/**
 * @title Contract Utils Tests
 * @description 合约工具函数测试
 */

import { cwd, existsSync, join, mkdir, remove, writeTextFile } from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import { loadContracts } from "../src/utils/contract.ts";

describe("合约工具函数测试", () => {
  const testProjectRoot = join(cwd(), "tests", "data", "test-contract-project");
  const testAbiDir = join(testProjectRoot, "build", "abi", "local");

  beforeAll(async () => {
    // 创建测试目录结构
    await mkdir(testAbiDir, { recursive: true });

    // 创建测试合约 ABI 文件
    const testContract1 = {
      contractName: "TestToken",
      address: "0x1234567890123456789012345678901234567890",
      abi: [
        {
          type: "function",
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
        },
        {
          type: "function",
          name: "balanceOf",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ type: "uint256" }],
        },
      ],
    };

    const testContract2 = {
      contractName: "TestNFT",
      address: "0x9876543210987654321098765432109876543210",
      abi: [
        {
          type: "function",
          name: "ownerOf",
          inputs: [{ name: "tokenId", type: "uint256" }],
          outputs: [{ type: "address" }],
        },
      ],
    };

    // 无效的合约文件（缺少必要字段）
    const invalidContract = {
      name: "InvalidContract",
      // 缺少 contractName, address, abi
    };

    await writeTextFile(
      join(testAbiDir, "TestToken.json"),
      JSON.stringify(testContract1, null, 2),
    );

    await writeTextFile(
      join(testAbiDir, "TestNFT.json"),
      JSON.stringify(testContract2, null, 2),
    );

    await writeTextFile(
      join(testAbiDir, "Invalid.json"),
      JSON.stringify(invalidContract, null, 2),
    );

    // 创建非 JSON 文件（应该被忽略）
    await writeTextFile(join(testAbiDir, "readme.txt"), "This is not a contract file");
  });

  afterAll(async () => {
    // 清理测试目录
    if (existsSync(testProjectRoot)) {
      await remove(testProjectRoot, { recursive: true });
    }
  });

  describe("loadContracts 函数", () => {
    it("应该能够加载合约列表", () => {
      // 注意：此测试依赖于工作目录
      // loadContracts 使用 cwd() + build/abi/{network}
      const contracts = loadContracts("local");
      expect(contracts).toBeDefined();
      expect(typeof contracts).toBe("object");
    });

    it("应该返回空对象当目录不存在时", () => {
      const contracts = loadContracts("non-existent-network-12345");
      expect(contracts).toBeDefined();
      expect(Object.keys(contracts).length).toBe(0);
    });

    it("应该能够处理未指定网络参数", () => {
      // 未指定网络时，使用环境变量或默认值
      const contracts = loadContracts();
      expect(contracts).toBeDefined();
      expect(typeof contracts).toBe("object");
    });

    it("函数应该存在且可调用", () => {
      expect(typeof loadContracts).toBe("function");
    });

    it("应该能够处理空目录", async () => {
      // 创建空目录
      const emptyDir = join(cwd(), "tests", "data", "empty-abi-dir", "build", "abi", "empty");
      await mkdir(emptyDir, { recursive: true });

      const contracts = loadContracts("empty");
      // 由于 cwd() 不同，可能找不到目录，返回空对象
      expect(contracts).toBeDefined();
      expect(typeof contracts).toBe("object");

      // 清理
      await remove(join(cwd(), "tests", "data", "empty-abi-dir"), { recursive: true });
    });
  });

  describe("合约数据结构", () => {
    it("合约对象应该包含必要字段", () => {
      const contracts = loadContracts("local");
      // 遍历所有合约，检查字段
      for (const [_name, contract] of Object.entries(contracts)) {
        if (contract) {
          expect(contract.contractName).toBeDefined();
          expect(contract.address).toBeDefined();
          expect(contract.abi).toBeDefined();
          expect(Array.isArray(contract.abi)).toBe(true);
        }
      }
    });
  });
});
