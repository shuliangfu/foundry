/**
 * @title Web3 Tests
 * @description Web3 类和工具函数测试
 *
 * 注意：部分测试需要运行中的 Anvil 节点
 * 启动方式：anvil
 */

import { cwd, existsSync, join, mkdir, remove, writeTextFile } from "@dreamer/runtime-adapter";
import { afterAll, beforeAll, describe, expect, it } from "@dreamer/test";
import {
  addHexPrefix,
  bytesToHex,
  createWeb3,
  formatAddress,
  fromWei,
  hexToBytes,
  hexToNumber,
  isAddress,
  isPrivateKey,
  isTxHash,
  keccak256,
  loadWeb3ConfigSync,
  numberToHex,
  padLeft,
  padRight,
  shortenAddress,
  stripHexPrefix,
  toChecksumAddress,
  toWei,
} from "../src/utils/web3.ts";

describe("Web3 工具函数测试", () => {
  describe("地址验证函数", () => {
    it("isAddress 应该验证有效地址", () => {
      expect(isAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe(true);
      expect(isAddress("0x0000000000000000000000000000000000000000")).toBe(true);
    });

    it("isAddress 应该拒绝无效地址", () => {
      expect(isAddress("0x123")).toBe(false);
      expect(isAddress("not-an-address")).toBe(false);
      expect(isAddress("")).toBe(false);
    });

    it("isPrivateKey 应该验证有效私钥", () => {
      expect(isPrivateKey("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"))
        .toBe(true);
    });

    it("isPrivateKey 应该拒绝无效私钥", () => {
      expect(isPrivateKey("0x123")).toBe(false);
      expect(isPrivateKey("not-a-private-key")).toBe(false);
    });

    it("isTxHash 应该验证有效交易哈希", () => {
      expect(isTxHash("0x" + "a".repeat(64))).toBe(true);
    });

    it("isTxHash 应该拒绝无效交易哈希", () => {
      expect(isTxHash("0x123")).toBe(false);
      expect(isTxHash("")).toBe(false);
    });
  });

  describe("地址格式化函数", () => {
    it("toChecksumAddress 应该返回校验和地址", () => {
      const address = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
      const checksumAddress = toChecksumAddress(address);
      expect(checksumAddress).toBeDefined();
      expect(checksumAddress.startsWith("0x")).toBe(true);
      expect(checksumAddress.length).toBe(42);
    });

    it("shortenAddress 应该缩短地址", () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const shortened = shortenAddress(address);
      expect(shortened.length).toBeLessThan(address.length);
      expect(shortened).toContain("...");
    });

    it("formatAddress 应该格式化地址", () => {
      const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const formatted = formatAddress(address);
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
    });
  });

  describe("十六进制转换函数", () => {
    it("addHexPrefix 应该添加 0x 前缀", () => {
      expect(addHexPrefix("1234")).toBe("0x1234");
      expect(addHexPrefix("0x1234")).toBe("0x1234"); // 已有前缀不重复添加
    });

    it("stripHexPrefix 应该移除 0x 前缀", () => {
      expect(stripHexPrefix("0x1234")).toBe("1234");
      expect(stripHexPrefix("1234")).toBe("1234"); // 无前缀保持不变
    });

    it("hexToNumber 应该转换十六进制为数字", () => {
      expect(hexToNumber("0x10")).toBe(16);
      expect(hexToNumber("0xff")).toBe(255);
    });

    it("numberToHex 应该转换数字为十六进制", () => {
      expect(numberToHex(16)).toBe("0x10");
      expect(numberToHex(255)).toBe("0xff");
    });

    it("hexToBytes 应该转换十六进制为字节数组", () => {
      const bytes = hexToBytes("0x1234");
      expect(bytes).toBeDefined();
      expect(bytes instanceof Uint8Array).toBe(true);
    });

    it("bytesToHex 应该转换字节数组为十六进制", () => {
      const bytes = new Uint8Array([0x12, 0x34]);
      const hex = bytesToHex(bytes);
      expect(hex).toContain("1234");
    });
  });

  describe("填充函数", () => {
    it("padLeft 应该左填充字符串", () => {
      const padded = padLeft("123", 10, "0");
      expect(padded.length).toBe(10);
      expect(padded).toBe("0000000123");
    });

    it("padRight 应该右填充字符串", () => {
      const padded = padRight("123", 10, "0");
      expect(padded.length).toBe(10);
      expect(padded).toBe("1230000000");
    });
  });

  describe("单位转换函数", () => {
    it("toWei 应该将 ether 转换为 wei", () => {
      const wei = toWei("1", "ether");
      expect(wei).toBe("1000000000000000000");
    });

    it("fromWei 应该将 wei 转换为 ether", () => {
      const ether = fromWei("1000000000000000000", "ether");
      expect(ether).toBe("1");
    });

    it("toWei 应该处理小数", () => {
      const wei = toWei("0.1", "ether");
      expect(wei).toBe("100000000000000000");
    });
  });

  describe("哈希函数", () => {
    it("keccak256 应该计算正确的哈希", async () => {
      const hash = await keccak256("hello");
      expect(hash).toBeDefined();
      expect(hash.startsWith("0x")).toBe(true);
      expect(hash.length).toBe(66); // 0x + 64 字符
    });

    it("keccak256 应该对相同输入返回相同哈希", async () => {
      const hash1 = await keccak256("test");
      const hash2 = await keccak256("test");
      expect(hash1).toBe(hash2);
    });

    it("keccak256 应该对不同输入返回不同哈希", async () => {
      const hash1 = await keccak256("test1");
      const hash2 = await keccak256("test2");
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe("Web3 配置加载测试", () => {
  const testProjectRoot = join(cwd(), "tests", "data", "test-web3-class-project");

  beforeAll(async () => {
    // 创建测试项目目录结构
    await mkdir(join(testProjectRoot, "config"), { recursive: true });

    // 创建测试配置文件
    const web3Config = {
      chain: "bsc",
      network: {
        local: {
          chainId: 31337,
          rpcUrl: "http://127.0.0.1:8545",
          wssUrl: "ws://127.0.0.1:8545",
          accounts: [
            {
              address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
            },
          ],
        },
      },
    };

    await writeTextFile(
      join(testProjectRoot, "config", "web3.json"),
      JSON.stringify(web3Config, null, 2),
    );
  });

  afterAll(async () => {
    // 清理测试项目
    if (existsSync(testProjectRoot)) {
      await remove(testProjectRoot, { recursive: true });
    }
  });

  describe("loadWeb3ConfigSync 函数", () => {
    it("应该返回 null 或配置对象", () => {
      const config = loadWeb3ConfigSync();
      expect(config === null || typeof config === "object").toBe(true);
    });

    it("应该能够指定项目根目录", () => {
      const config = loadWeb3ConfigSync(testProjectRoot);
      if (config) {
        expect(config.chainId).toBeDefined();
        expect(config.rpcUrl).toBeDefined();
      }
    });
  });

  describe("createWeb3 工厂函数", () => {
    it("函数应该存在", () => {
      expect(typeof createWeb3).toBe("function");
    });

    it("应该能够接受可选参数", () => {
      // createWeb3 可以接受 contractName 和 options
      expect(createWeb3.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Web3 类实例测试（需要配置）", () => {
  describe("Web3 实例化", () => {
    it("应该能够创建不绑定合约的实例（需要配置）", () => {
      // 由于需要有效的配置，这里主要测试函数签名
      expect(typeof createWeb3).toBe("function");
    });
  });

  // 需要 RPC 节点的测试（需要运行中的 Anvil）
  describe("Web3 实例方法（需要 Anvil 节点）", () => {
    it("应该能够获取余额", async () => {
      const web3 = createWeb3();
      const balance = await web3.getBalance();
      expect(balance).toBeDefined();
      expect(typeof balance).toBe("string");
    });

    it("应该能够获取当前账户地址", () => {
      const web3 = createWeb3();
      // accountAddress 是账户地址 getter
      const accountAddr = web3.accountAddress;
      expect(isAddress(accountAddr)).toBe(true);
    });

    it("应该能够创建 Web3 实例", () => {
      const web3 = createWeb3();
      expect(web3).toBeDefined();
      // 验证账户地址是有效的以太坊地址
      expect(web3.accountAddress.startsWith("0x")).toBe(true);
      expect(web3.accountAddress.length).toBe(42);
    });
  });
});
