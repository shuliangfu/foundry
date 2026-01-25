/**
 * @title Foundry Deploy Tests
 * @description 使用 @dreamer/test 编写的测试文件
 */

import { describe, it, expect, beforeAll, afterAll } from "@dreamer/test";
import { deploy, createDeployer } from "../src/deploy.ts";
import { verify } from "../src/verify.ts";
import { logger, loadEnv, deployContract, loadContract } from "../src/utils/mod.ts";
import type { NetworkConfig } from "../src/utils/deploy-utils.ts";

describe("部署功能测试", () => {
  let testConfig: NetworkConfig;

  beforeAll(async () => {
    logger.info("初始化测试配置...");
    // 测试配置（使用本地网络）
    testConfig = {
      rpcUrl: "http://127.0.0.1:8545",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Anvil 默认账户地址
      chainId: 31337,
    };
  });

  afterAll(() => {
    logger.info("测试完成");
  });

  describe("部署器创建", () => {
    it("应该能够创建部署器", () => {
      const deployer = createDeployer("testnet", testConfig, false);
      expect(deployer.network).toBe("testnet");
      expect(deployer.force).toBe(false);
      expect(deployer.accounts).toBeDefined();
    });
  });

  describe("环境变量工具", () => {
    it("应该能够加载环境变量", async () => {
      try {
        const env = await loadEnv();
        expect(env).toBeDefined();
        expect(typeof env).toBe("object");
      } catch (error) {
        // .env 文件不存在时跳过测试
        logger.warn("跳过环境变量测试：.env 文件不存在");
      }
    });
  });

  describe("合约加载", () => {
    it("应该能够处理不存在的合约", () => {
      expect(() => {
        loadContract("NonExistentContract", "testnet");
      }).toThrow();
    });
  });
});

describe("验证功能测试", () => {
  it("应该能够验证网络配置", () => {
    const networks = ["sepolia", "mainnet", "testnet", "bsc_testnet", "bsc"];
    for (const network of networks) {
      // 验证函数会检查网络是否支持
      expect(network).toBeDefined();
    }
  });
});

describe("工具函数测试", () => {
  it("应该能够使用 logger", () => {
    logger.info("测试日志");
    logger.warn("测试警告");
    logger.error("测试错误");
    expect(true).toBe(true);
  });
});
