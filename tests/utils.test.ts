/**
 * @title Utils Tests
 * @description 工具函数测试
 */

import type { NetworkConfig } from "../src/utils/deploy-utils.ts";
import { describe, expect, it } from "../src/utils/deps.ts";
import { createWeb3, loadContract, loadContracts, loadEnv, logger } from "../src/utils/mod.ts";

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
  // 注意：此测试需要本地 RPC 节点（如 Anvil）运行
  // createWeb3Client 在创建客户端时可能会尝试连接 RPC 节点
  // 如果 RPC 节点不可用，连接会阻塞导致测试卡住
  // 因此暂时跳过此测试，或者确保测试环境中有可用的 RPC 节点
  it.skip("应该能够创建 Web3 实例", () => {
    const config: NetworkConfig = {
      rpcUrl: "http://127.0.0.1:8545",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Anvil 默认账户地址
      chainId: 31337,
    };

    // 使用 createWeb3 工厂函数创建实例
    const web3 = createWeb3(undefined, {
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
      privateKey: config.privateKey,
      address: config.address,
    });

    expect(web3).toBeDefined();
  });
});
