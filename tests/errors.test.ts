/**
 * @title Error Types Tests
 * @description 错误类型测试
 */

import { describe, expect, it } from "@dreamer/test";
import {
  ConfigurationError,
  DeploymentError,
  FoundryError,
  NetworkError,
  VerificationError,
} from "../src/errors/index.ts";

describe("错误类型测试", () => {
  describe("FoundryError 基础错误类", () => {
    it("应该能够创建 FoundryError 实例", () => {
      const error = new FoundryError("测试错误", "TEST_ERROR");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FoundryError);
      expect(error.message).toBe("测试错误");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.name).toBe("FoundryError");
    });

    it("应该能够包含上下文信息", () => {
      const context = { network: "testnet", contract: "MyToken" };
      const error = new FoundryError("测试错误", "TEST_ERROR", context);
      expect(error.context).toEqual(context);
      expect(error.context?.network).toBe("testnet");
      expect(error.context?.contract).toBe("MyToken");
    });

    it("应该保持正确的原型链", () => {
      const error = new FoundryError("测试错误", "TEST_ERROR");
      expect(Object.getPrototypeOf(error)).toBe(FoundryError.prototype);
    });
  });

  describe("DeploymentError 部署错误", () => {
    it("应该能够创建 DeploymentError 实例", () => {
      const error = new DeploymentError("部署失败");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FoundryError);
      expect(error).toBeInstanceOf(DeploymentError);
      expect(error.message).toBe("部署失败");
      expect(error.code).toBe("DEPLOYMENT_ERROR");
      expect(error.name).toBe("DeploymentError");
    });

    it("应该能够包含上下文信息", () => {
      const context = { contract: "MyToken", network: "testnet" };
      const error = new DeploymentError("部署失败", context);
      expect(error.context).toEqual(context);
    });
  });

  describe("VerificationError 验证错误", () => {
    it("应该能够创建 VerificationError 实例", () => {
      const error = new VerificationError("验证失败");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FoundryError);
      expect(error).toBeInstanceOf(VerificationError);
      expect(error.message).toBe("验证失败");
      expect(error.code).toBe("VERIFICATION_ERROR");
      expect(error.name).toBe("VerificationError");
    });

    it("应该能够包含上下文信息", () => {
      const context = { address: "0x123", network: "mainnet" };
      const error = new VerificationError("验证失败", context);
      expect(error.context).toEqual(context);
    });
  });

  describe("ConfigurationError 配置错误", () => {
    it("应该能够创建 ConfigurationError 实例", () => {
      const error = new ConfigurationError("配置错误");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FoundryError);
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(error.message).toBe("配置错误");
      expect(error.code).toBe("CONFIGURATION_ERROR");
      expect(error.name).toBe("ConfigurationError");
    });

    it("应该能够包含上下文信息", () => {
      const context = { configPath: "/path/to/config.json" };
      const error = new ConfigurationError("配置错误", context);
      expect(error.context).toEqual(context);
    });
  });

  describe("NetworkError 网络错误", () => {
    it("应该能够创建 NetworkError 实例", () => {
      const error = new NetworkError("网络错误");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FoundryError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe("网络错误");
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.name).toBe("NetworkError");
    });

    it("应该能够包含上下文信息", () => {
      const context = { rpcUrl: "http://example.com", chainId: 1 };
      const error = new NetworkError("网络错误", context);
      expect(error.context).toEqual(context);
    });
  });

  describe("错误继承关系", () => {
    it("所有错误类都应该继承自 FoundryError", () => {
      const deploymentError = new DeploymentError("部署错误");
      const verificationError = new VerificationError("验证错误");
      const configurationError = new ConfigurationError("配置错误");
      const networkError = new NetworkError("网络错误");

      expect(deploymentError).toBeInstanceOf(FoundryError);
      expect(verificationError).toBeInstanceOf(FoundryError);
      expect(configurationError).toBeInstanceOf(FoundryError);
      expect(networkError).toBeInstanceOf(FoundryError);
    });

    it("错误应该能够被正确抛出和捕获", () => {
      expect(() => {
        throw new DeploymentError("部署失败");
      }).toThrow(DeploymentError);

      expect(() => {
        throw new VerificationError("验证失败");
      }).toThrow(VerificationError);

      expect(() => {
        throw new ConfigurationError("配置错误");
      }).toThrow(ConfigurationError);

      expect(() => {
        throw new NetworkError("网络错误");
      }).toThrow(NetworkError);
    });
  });
});
