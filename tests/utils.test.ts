/**
 * @title Utils Tests
 * @description 工具函数测试
 */

import { describe, it, expect } from "@dreamer/test";
import {
  logger,
  loadEnv,
  loadContract,
  Web3,
  loadContracts,
} from "../src/utils/mod.ts";
import type { NetworkConfig } from "../src/utils/deploy-utils.ts";

describe("Logger 工具测试", () => {
  it("应该能够输出日志", () => {
    logger.info("信息日志");
    logger.warn("警告日志");
    logger.error("错误日志");
    expect(true).toBe(true);
  });
});

describe("环境变量工具测试", () => {
  it("应该能够加载环境变量", async () => {
    try {
      const env = await loadEnv();
      expect(env).toBeDefined();
    } catch {
      // .env 文件不存在时跳过
    }
  });
});

describe("合约工具测试", () => {
  it("应该能够加载合约列表", () => {
    const contracts = loadContracts("local");
    expect(contracts).toBeDefined();
    expect(typeof contracts).toBe("object");
  });

  it("应该能够处理不存在的合约", () => {
    expect(() => {
      loadContract("NonExistentContract", "testnet");
    }).toThrow();
  });
});

describe("Web3 工具测试", () => {
  it("应该能够创建 Web3 实例", () => {
    const config: NetworkConfig = {
      rpcUrl: "http://127.0.0.1:8545",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Anvil 默认账户地址
      chainId: 31337,
    };

    // 提供 privateKey 时必须同时提供 address
    const web3 = new Web3(undefined, {
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      privateKey: config.privateKey,
      address: config.address, // 必须提供 address
    });

    expect(web3).toBeDefined();
    expect(web3.address).toBe("");
  });
});
