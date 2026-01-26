/**
 * @title Web3 Utils
 * @description Web3 utility class using @dreamer/web3
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 * 从项目根目录的 config/web3.json 读取配置（项目规则，固定目录）
 */

import {
  cwd,
  existsSync,
  getEnv,
  join,
  platform,
  readTextFileSync,
} from "@dreamer/runtime-adapter";
import {
  addHexPrefix,
  bytesToHex,
  computeContractAddress,
  createWeb3Client,
  encodeFunctionCall as _encodeFunctionCall,
  type ExtendedTransactionReceipt,
  formatAddress,
  fromWei,
  hexToBytes,
  hexToNumber,
  isAddress,
  isPrivateKey,
  isTxHash,
  keccak256,
  numberToHex,
  padLeft,
  padRight,
  shortenAddress,
  solidityKeccak256,
  stripHexPrefix,
  toChecksumAddress,
  toWei,
} from "@dreamer/web3";
import type { ContractInfo } from "./deploy-utils.ts";
import { loadContract } from "./deploy-utils.ts";
import type { AbiItem } from "../types/index.ts";

export {
  addHexPrefix,
  bytesToHex,
  checkAddressChecksum,
  computeContractAddress,
  encodeFunctionCall,
  formatAddress,
  fromWei,
  generateWallet,
  getCode,
  getFunctionSelector,
  hexToBytes,
  hexToNumber,
  isAddress,
  isPrivateKey,
  isTxHash,
  keccak256,
  numberToHex,
  padLeft,
  padRight,
  shortenAddress,
  solidityKeccak256,
  stripHexPrefix,
  toChecksumAddress,
  toWei,
} from "@dreamer/web3";

/**
 * 网络配置类型
 */
interface NetworkConfig {
  chainId: number;
  host: string;
  wss: string;
  accounts: Array<{
    address: string;
    privateKey: string;
  }>;
}

/**
 * 尝试同步加载 web3 配置
 * 使用缓存机制，避免重复加载
 */
let web3ConfigCache: NetworkConfig | null = null;

/**
 * 向上查找配置文件，从指定目录开始向上查找直到找到 config/web3.json
 * @param startDir - 起始目录，默认为当前工作目录
 * @returns 配置文件所在目录，如果未找到则返回 null
 */
function findConfigDir(startDir: string): string | null {
  let currentDir = startDir;
  const plat = platform();
  const root = plat === "windows" ? /^[A-Z]:\\$/ : /^\/$/;

  while (true) {
    const configPath = join(currentDir, "config", "web3.json");
    if (existsSync(configPath)) {
      return currentDir;
    }

    // 检查是否到达根目录
    const parentDir = join(currentDir, "..");
    if (parentDir === currentDir || currentDir.match(root)) {
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

// 注意：自动预加载已移除，改为在 Web3 构造函数中按需加载
// 这样可以避免在模块加载时阻塞，特别是在 init 命令执行时

/**
 * 同步加载 Web3 配置（JSON 格式）
 *
 * @param projectRoot - 可选的项目根目录，如果不提供则从当前工作目录向上查找
 * @returns 配置对象或 null（如果配置文件不存在）
 */
export function loadWeb3ConfigSync(projectRoot?: string): NetworkConfig | null {
  // 如果已缓存，直接返回
  if (web3ConfigCache !== null) {
    return web3ConfigCache;
  }

  try {
    // 确定项目根目录
    const rootDir = projectRoot || cwd();

    // 查找配置文件所在目录（向上查找）
    const configDir = findConfigDir(rootDir);
    if (!configDir) {
      return null;
    }

    // 加载 JSON 配置文件（同步）
    const jsonConfigPath = join(configDir, "config", "web3.json");
    if (!existsSync(jsonConfigPath)) {
      return null;
    }

    const jsonText = readTextFileSync(jsonConfigPath);
    const jsonConfig = JSON.parse(jsonText);

    // 获取环境变量
    const web3Env = getEnv("WEB3_ENV") || "local";

    // 从配置中获取对应环境的配置
    // 新格式：支持 chain + network 结构
    // 格式：{ "chain": "bsc", "network": { "local": {...}, "testnet": {...}, "mainnet": {...} } }
    let config: NetworkConfig | null = null;

    if (jsonConfig.chain && jsonConfig.network) {
      // 新格式：chain + network 结构
      if (jsonConfig.network[web3Env]) {
        config = jsonConfig.network[web3Env];
      } else if (jsonConfig.network.local) {
        // 默认使用 local
        config = jsonConfig.network.local;
      }
    } else if (jsonConfig[web3Env]) {
      // 向后兼容：直接使用网络名称作为顶级 key（旧格式）
      config = jsonConfig[web3Env];
    } else if (jsonConfig.local) {
      // 向后兼容：默认使用 local（旧格式）
      config = jsonConfig.local;
    } else if (jsonConfig.Web3Config && jsonConfig.Web3Config[web3Env]) {
      // 向后兼容：支持 Web3Config 包装（旧格式）
      config = jsonConfig.Web3Config[web3Env];
    } else if (jsonConfig.Web3Config && jsonConfig.Web3Config.local) {
      // 向后兼容：默认使用 local（旧格式）
      config = jsonConfig.Web3Config.local;
    } else if (jsonConfig.web3Config) {
      // 兼容其他可能的格式
      config = jsonConfig.web3Config;
    }

    if (config) {
      web3ConfigCache = config;
      return config;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 同步获取 Web3 配置
 * 如果配置未加载，会尝试同步加载
 *
 * @param projectRoot - 可选的项目根目录
 * @returns 配置对象，如果未加载则返回 null
 */
function getWeb3ConfigSync(projectRoot?: string): NetworkConfig | null {
  return loadWeb3ConfigSync(projectRoot);
}

/**
 * 预加载 Web3 配置（为了保持 API 兼容性）
 * 现在配置文件是 JSON 格式，会同步加载
 * @param projectRoot - 可选的项目根目录，如果不提供则从当前工作目录向上查找
 */
export function preloadWeb3Config(projectRoot?: string): void {
  loadWeb3ConfigSync(projectRoot);
}

/**
 * Web3 配置选项
 */
export interface Web3Options {
  rpcUrl?: string;
  wssUrl?: string;
  chainId?: number;
  privateKey?: string;
  address?: string;
  account?: number;
}

/**
 * Web3 工具类
 */
export class Web3 {
  private client: ReturnType<typeof createWeb3Client>;
  private contract?: ContractInfo;
  private contractName?: string;
  private account!: { address: string; privateKey: string; index: number };
  private rpcUrl!: string;

  /**
   * 创建 Web3 实例并绑定合约
   * @param contractName - 合约名称（必须存在于 build/abi/{network} 目录中）
   * @param options - 可选配置（如果不提供，将从 config/web3.json 读取配置）
   * @param options.rpcUrl - 自定义 RPC URL（覆盖配置文件）
   * @param options.privateKey - 自定义私钥（覆盖配置文件）
   * @param options.address - 自定义地址（与 privateKey 对应，覆盖配置文件）
   * @param options.chainId - 自定义链 ID（覆盖配置文件）
   * @param options.account - 账户索引（从配置的 accounts 数组中选择，默认为 0）
   *
   * @remarks
   * 配置读取流程：
   * 1. 如果提供了 options.privateKey 和 options.address，使用自定义账户
   * 2. 如果未提供 options 或只提供了部分 options，会从 config/web3.json 读取配置
   * 3. 配置文件路径：从当前目录向上查找，直到找到包含 config/web3.json 的目录
   * 4. 根据 WEB3_ENV 环境变量选择对应的配置（local/testnet/mainnet 等）
   * 5. 配置会被缓存到 web3ConfigCache，避免重复加载
   * 6. 配置文件是 JSON 格式，会同步加载，无需预加载
   */
  constructor(contractName?: string, options?: Web3Options) {
    this.contractName = contractName;

    // 检查 web3Config 是否存在（尝试同步获取缓存）
    // 配置通过 loadWeb3ConfigSync() 函数从 config/web3.json 加载并缓存到 web3ConfigCache
    let web3Config = getWeb3ConfigSync();

    // 如果未提供 options，且配置已加载，使用配置文件中的配置
    // 如果提供了自定义的 privateKey 和 address，使用自定义账户
    if (options?.privateKey && options?.address) {
      // 确保 privateKey 有正确的格式（添加 0x 前缀如果缺失）
      let formattedPrivateKey = options.privateKey.trim();
      if (!formattedPrivateKey.startsWith("0x")) {
        formattedPrivateKey = addHexPrefix(formattedPrivateKey);
      }

      // 验证地址格式
      if (!isAddress(options.address)) {
        throw new Error("提供的地址格式无效");
      }

      // 保存自定义账户信息
      this.account = {
        address: toChecksumAddress(options.address),
        privateKey: formattedPrivateKey,
        index: -1, // 自定义账户使用 -1 作为索引
      };
    } else {
      // 使用配置中的账户
      // 获取账户索引（默认为 0）
      const accountIndex = options?.account ?? 0;

      // 如果提供了 privateKey，使用它
      if (options?.privateKey) {
        let formattedPrivateKey = options.privateKey.trim();
        if (!formattedPrivateKey.startsWith("0x")) {
          formattedPrivateKey = addHexPrefix(formattedPrivateKey);
        }

        const accountAddress = options?.address || "";
        if (!accountAddress) {
          throw new Error("使用 privateKey 时必须提供对应的 address");
        }

        this.account = {
          address: toChecksumAddress(accountAddress),
          privateKey: formattedPrivateKey,
          index: accountIndex,
        };
      } else if (web3Config) {
        // 从配置中获取指定索引的账户
        const selectedAccount = web3Config.accounts?.[accountIndex];

        // 检查账户是否存在
        if (!selectedAccount) {
          throw new Error(
            `账户索引 ${accountIndex} 不存在，配置中只有 ${
              web3Config.accounts?.length || 0
            } 个账户`,
          );
        }

        // 检查 privateKey 是否存在且不为空
        const privateKey = selectedAccount?.privateKey;
        if (!privateKey || privateKey.trim() === "") {
          throw new Error(
            `私钥未配置，请在配置文件中设置 accounts[${accountIndex}].privateKey 或通过 options 传入`,
          );
        }

        // 确保 privateKey 有正确的格式（添加 0x 前缀如果缺失）
        let formattedPrivateKey = privateKey.trim();
        if (!formattedPrivateKey.startsWith("0x")) {
          formattedPrivateKey = addHexPrefix(formattedPrivateKey);
        }

        // 使用配置中的 address
        const accountAddress = selectedAccount.address;

        // 保存账户信息
        this.account = {
          address: toChecksumAddress(accountAddress),
          privateKey: formattedPrivateKey,
          index: accountIndex,
        };
      } else {
        // 如果未提供 options 且配置未加载，尝试自动加载配置
        if (!options || Object.keys(options).length === 0) {
          // 尝试查找配置文件并同步加载
          const loadedConfig = loadWeb3ConfigSync();
          if (!loadedConfig) {
            // 配置文件不存在或加载失败
            const configDir = findConfigDir(cwd());
            const configPath = configDir ? join(configDir, "config", "web3.json") : null;
            throw new Error(
              `Web3 配置未找到。请创建 config/web3.json 配置文件，或提供 options 参数。\n` +
                `配置文件路径：从当前目录向上查找，直到找到包含 config/web3.json 的目录。\n` +
                (configPath ? `检测到的配置文件路径：${configPath}` : ""),
            );
          }
          // 如果加载成功，重新获取配置并使用
          const reloadedConfig = getWeb3ConfigSync();
          if (!reloadedConfig) {
            throw new Error("Web3 配置加载失败，请检查配置文件格式。");
          }
          // 使用重新加载的配置
          const selectedAccount = reloadedConfig.accounts?.[accountIndex];
          if (!selectedAccount) {
            throw new Error(
              `账户索引 ${accountIndex} 不存在，配置中只有 ${
                reloadedConfig.accounts?.length || 0
              } 个账户`,
            );
          }
          const privateKey = selectedAccount?.privateKey;
          if (!privateKey || privateKey.trim() === "") {
            throw new Error(
              `私钥未配置，请在配置文件中设置 accounts[${accountIndex}].privateKey 或通过 options 传入`,
            );
          }
          let formattedPrivateKey = privateKey.trim();
          if (!formattedPrivateKey.startsWith("0x")) {
            formattedPrivateKey = addHexPrefix(formattedPrivateKey);
          }
          this.account = {
            address: toChecksumAddress(selectedAccount.address),
            privateKey: formattedPrivateKey,
            index: accountIndex,
          };
          // 更新 web3Config 变量以便后续使用
          web3Config = reloadedConfig;
        } else {
          // 提供了部分 options 但配置未加载，需要提供完整的 options
          throw new Error(
            "Web3 配置未找到。请检查 WEB3_ENV 环境变量或提供完整的 options.privateKey 和 options.address。\n" +
              "如果使用配置文件，请确保 config/web3.json 存在。",
          );
        }
      }
    }

    // 验证私钥格式
    if (!isPrivateKey(this.account.privateKey)) {
      throw new Error("私钥格式无效，请检查 privateKey 配置");
    }

    // 获取最终使用的配置（可能是从 options 或 web3Config）
    const finalConfig = web3Config || getWeb3ConfigSync();

    // 创建 Web3 客户端
    // 注意：框架在服务端环境要求使用 privateKey 创建账户
    // 根据错误信息，框架需要 account 参数来识别账户，即使有 privateKey
    // 框架应该自动使用本地私钥签名交易，然后使用 eth_sendRawTransaction 发送
    // 但如果框架仍然使用 eth_sendTransaction，说明框架可能没有正确配置本地签名
    try {
      // 传递 privateKey 和 account，让框架正确识别账户
      // account 参数用于框架识别账户，privateKey 用于签名
      const clientOptions: {
        rpcUrl: string;
        wssUrl: string;
        chainId: number;
        privateKey: string;
        account?: string;
      } = {
        rpcUrl: options?.rpcUrl ||
          (finalConfig?.host || "http://127.0.0.1:8545"),
        wssUrl: options?.wssUrl || (finalConfig?.wss || "ws://127.0.0.1:8545"),
        chainId: options?.chainId || (finalConfig?.chainId || 31337),
        privateKey: this.account.privateKey,
      };

      // 传递 account 参数，让框架正确识别账户（使用 this.account 中的地址）
      // 这可能是框架的要求，即使有 privateKey 也需要 account
      clientOptions.account = this.account.address;

      // 保存 RPC URL，用于后续的 RPC 调用（如获取 nonce）
      this.rpcUrl = clientOptions.rpcUrl;

      this.client = createWeb3Client(clientOptions);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `创建 Web3 客户端失败: ${errorMsg}。请确保 privateKey 格式正确（64 位十六进制字符串，带或不带 0x 前缀）`,
      );
    }

    // 初始化合约（异步加载）
    if (this.contractName) {
      this.initContract();
    }
  }

  /**
   * 初始化合约信息
   */
  private initContract(): void {
    try {
      const network = getEnv("WEB3_ENV") || "local";
      this.contract = loadContract(this.contractName!, network);
    } catch (error) {
      throw new Error(`Failed to load contract ${this.contractName}: ${error}`);
    }
  }

  /**
   * 读取合约数据
   */
  async read(methodName: string, args: unknown[] = []): Promise<unknown> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    return await this.client.readContract({
      address: this.contract.address,
      abi: this.contract.abi as unknown as Record<string, unknown>[],
      functionName: methodName,
      args,
    });
  }

  /**
   * 调用合约函数（写入）
   */
  async call(
    methodName: string,
    args: unknown[] = [],
    options?: {
      value?: string;
      gasLimit?: string;
    },
  ): Promise<ExtendedTransactionReceipt> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    const result = await this.client.callContract({
      address: this.contract.address,
      abi: this.contract.abi as unknown as Record<string, unknown>[],
      functionName: methodName,
      args,
      value: options?.value || "0",
      gasLimit: options?.gasLimit,
    });

    // callContract 已经自动等待交易确认，返回交易收据
    return result as ExtendedTransactionReceipt;
  }

  /**
   * 获取账户地址
   */
  get accountAddress(): string {
    return this.account.address;
  }

  /**
   * 获取当前账户信息
   */
  get currentAccount(): { address: string; privateKey: string; index: number } {
    return this.account;
  }

  /**
   * 获取合约信息
   */
  get contractInfo(): ContractInfo | undefined {
    return this.contract;
  }

  /**
   * 获取合约名称
   */
  get name(): string {
    return this.contractName || "";
  }

  /**
   * 获取 Web3 客户端实例（用于高级操作）
   */
  getClient(): ReturnType<typeof createWeb3Client> {
    return this.client;
  }

  /**
   * 获取账户的当前 nonce（交易计数）
   * @param address - 可选，要查询的地址，默认为当前账户地址
   * @returns 返回账户的 nonce 值
   */
  async getNonce(address?: string): Promise<number> {
    const targetAddress = address || this.account.address;

    try {
      // 直接调用 RPC 的 eth_getTransactionCount 方法
      // 这是标准的 JSON-RPC 方法，用于获取账户的交易计数（nonce）
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getTransactionCount",
          params: [targetAddress, "latest"],
          id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC 请求失败: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC 错误: ${data.error.message || JSON.stringify(data.error)}`);
      }

      // 将十六进制字符串转换为数字
      const nonceHex = data.result as string;
      return parseInt(nonceHex, 16);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`获取 nonce 失败: ${errorMsg}`);
    }
  }

  /**
   * 监听合约事件
   * @param eventName - 事件名称
   * @param callback - 事件回调函数
   * @param options - 可选配置
   * @param options.fromBlock - 起始区块号（如果指定，会先扫描历史事件）
   * @param options.toBlock - 结束区块号（仅在 fromBlock 指定时有效）
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * // 只监听新事件
   * const off = await web3.onEvent("Transfer", (event) => {
   *   console.log("Transfer 事件:", event)
   * })
   *
   * // 从指定区块开始监听（包含历史事件）
   * const offWithHistory = await web3.onEvent("Transfer", (event) => {
   *   console.log("Transfer 事件:", event)
   * }, { fromBlock: 1000 })
   *
   * // 取消监听
   * off()
   * ```
   */
  onEvent(
    eventName: string,
    callback: (event: unknown) => void,
    options?: {
      fromBlock?: number;
      toBlock?: number;
    },
  ): Promise<() => void> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    const result = this.client.onContractEvent(
      this.contract.address,
      eventName,
      callback,
      {
        abi: JSON.parse(JSON.stringify(this.contract.abi)) as string[],
        fromBlock: options?.fromBlock,
        toBlock: options?.toBlock,
      },
    );

    // 如果返回的是 Promise，直接返回；否则包装成 Promise
    return result instanceof Promise ? result : Promise.resolve(result);
  }

  /**
   * 扫描合约指定方法的所有调用交易
   * 支持分页和参数解析
   * @param functionSignature - 函数签名（如 "register(address,string)"）
   * @param options - 扫描选项
   * @param options.fromBlock - 起始区块号（可选，默认最近 10000 个区块）
   * @param options.toBlock - 结束区块号（可选，默认最新区块）
   * @param options.page - 页码（默认 1）
   * @param options.pageSize - 每页数量（默认 20）
   * @param options.abi - 函数 ABI（可选，用于解析函数参数）
   * @returns 扫描结果，包含交易列表和分页信息
   *
   * @example
   * ```typescript
   * // 扫描 register 方法的所有调用
   * const result = await web3.scanMethodTransactions(
   *   "register(address,string)",
   *   {
   *     fromBlock: 1000,
   *     toBlock: 2000,
   *     page: 1,
   *     pageSize: 20,
   *     abi: ["function register(address user, string name)"]
   *   }
   * )
   * ```
   */
  async scanMethodTransactions(
    functionSignature: string,
    options?: {
      fromBlock?: number;
      toBlock?: number;
      page?: number;
      pageSize?: number;
      abi?: string[];
    },
  ): Promise<{
    transactions: Array<{
      hash: string;
      from: string;
      to: string;
      blockNumber: number;
      blockHash: string;
      timestamp?: number;
      gasUsed?: string;
      gasPrice?: string;
      value: string;
      data: string;
      args?: unknown[];
      receipt?: unknown;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    // 如果提供了 ABI，使用提供的；否则使用合约的完整 ABI
    const abi = options?.abi
      ? options.abi
      : (JSON.parse(JSON.stringify(this.contract.abi)) as string[]);

    // 获取分页参数
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;

    // 调用框架方法
    const result = await this.client.scanContractMethodTransactions(
      this.contract.address,
      functionSignature,
      {
        fromBlock: options?.fromBlock,
        toBlock: options?.toBlock,
        abi,
      },
    );

    // 计算分页信息
    const total = result.total || result.transactions.length;
    const totalPages = Math.ceil(total / pageSize);

    // 手动分页处理（如果框架不支持分页）
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedTransactions = result.transactions.slice(startIndex, endIndex);

    return {
      transactions: paginatedTransactions,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 等待交易确认
   * @param txHash - 交易哈希
   * @param confirmations - 确认数（默认 1）
   * @returns 交易收据
   *
   * @example
   * ```typescript
   * const txHash = await web3.call("transfer", ["0x...", "100"])
   * const receipt = await web3.waitForTransaction(txHash, 1)
   * ```
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
  ): Promise<unknown> {
    return await this.client.waitForTransaction(txHash, confirmations);
  }

  /**
   * 获取交易信息
   * @param txHash - 交易哈希
   * @returns 交易信息
   */
  async getTransaction(txHash: string): Promise<unknown> {
    return await this.client.getTransaction(txHash);
  }

  /**
   * 获取交易收据
   * @param txHash - 交易哈希
   * @returns 交易收据
   */
  async getTransactionReceipt(txHash: string): Promise<unknown> {
    return await this.client.getTransactionReceipt(txHash);
  }

  /**
   * 估算 Gas
   * @param methodName - 函数名称
   * @param args - 函数参数数组
   * @param options - 可选配置
   * @returns 估算的 Gas 数量
   */
  async estimateGas(
    methodName: string,
    args: unknown[] = [],
    options?: {
      value?: string;
    },
  ): Promise<string> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    // 使用 encodeFunctionCall 方法编码函数调用数据
    const data = await this.encodeFunctionCall(methodName, args);

    return await this.client.estimateGas({
      from: this.account.address,
      to: this.contract.address,
      data,
      value: options?.value || "0",
    });
  }

  /**
   * 编码函数调用数据
   * 支持函数重载，可以通过函数签名或函数名+参数数量自动匹配
   * @param functionName - 函数名称或函数签名（如 "transfer" 或 "transfer(address,uint256)"）
   * @param args - 函数参数数组
   * @returns 编码后的数据
   *
   * @example
   * ```typescript
   * // 使用函数名（自动匹配重载）
   * const data = await web3.encodeFunctionCall("transfer", ["0x...", "1000000000000000000"])
   *
   * // 使用函数签名（精确匹配）
   * const data = await web3.encodeFunctionCall("transfer(address,uint256)", ["0x...", "1000000000000000000"])
   * ```
   */
  encodeFunctionCall(
    functionName: string,
    args: unknown[],
  ): Promise<string> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    // 从 ABI 中查找函数定义（支持重载函数，通过参数数量匹配）
    let abiFunction: AbiItem | undefined;

    // 如果函数名包含函数签名（如 "buyNode(uint256)"），则精确匹配
    if (functionName.includes("(") && functionName.includes(")")) {
      // 提取函数名和参数类型
      const match = functionName.match(/^(\w+)\((.*)\)$/);
      if (match) {
        const [, name, paramsStr] = match;
        const paramTypes = paramsStr ? paramsStr.split(",").map((p) => p.trim()) : [];

        // 查找匹配的函数签名
        abiFunction = this.contract.abi.find(
          (item: AbiItem) => {
            if (item.type !== "function" || item.name !== name) return false;
            const itemParamTypes = (item.inputs || []).map((input) => input.type);
            return itemParamTypes.length === paramTypes.length &&
              itemParamTypes.every((type: string, i: number) => type === paramTypes[i]);
          },
        );
      }
    }

    // 如果没有找到精确匹配，或者函数名不包含签名，则按参数数量匹配
    if (!abiFunction) {
      const functionNameOnly = functionName.includes("(")
        ? functionName.match(/^(\w+)/)?.[1] || functionName
        : functionName;

      // 先尝试精确匹配函数名和参数数量
      const candidates = this.contract.abi.filter(
        (item: AbiItem) => item.type === "function" && item.name === functionNameOnly,
      );

      if (candidates.length === 1) {
        // 只有一个匹配，直接使用
        abiFunction = candidates[0];
      } else if (candidates.length > 1) {
        // 多个重载函数，根据参数数量匹配
        abiFunction = candidates.find(
          (item: AbiItem) => (item.inputs || []).length === args.length,
        );

        // 如果还是找不到，使用第一个（可能是默认行为）
        if (!abiFunction && candidates.length > 0) {
          abiFunction = candidates[0];
        }
      }
    }

    if (!abiFunction || abiFunction.type !== "function") {
      throw new Error(`函数 "${functionName}" 在合约 ABI 中不存在`);
    }

    // 构建函数签名（如 "transfer(address,uint256)"）
    const functionSignature = `${abiFunction.name}(${
      (abiFunction.inputs || []).map((input) => input.type).join(",")
    })`;

    // 使用框架的 encodeFunctionCall 工具函数编码函数调用数据
    return Promise.resolve(_encodeFunctionCall(functionSignature, args));
  }

  /**
   * 检查地址是否为合约地址
   * @param address - 地址（可选，默认使用合约地址）
   * @returns 是否为合约地址
   */
  async isContract(address?: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    return await this.client.isContract(address || this.contract.address);
  }

  /**
   * 获取余额
   * @param address - 地址（可选，默认使用当前账户的地址）
   * @returns 余额（wei）
   */
  async getBalance(address?: string): Promise<string> {
    // 如果没有指定地址，使用当前账户的地址
    return await this.client.getBalance(address || this.account.address);
  }

  /**
   * 获取当前区块号
   * @returns 区块号
   */
  async getBlockNumber(): Promise<number> {
    return await this.client.getBlockNumber();
  }

  /**
   * 获取网络信息
   * @returns 网络信息
   */
  async getNetwork(): Promise<{ chainId: number; name: string }> {
    return await this.client.getNetwork();
  }

  /**
   * 获取链 ID
   * @returns 链 ID
   */
  async getChainId(): Promise<number> {
    return await this.client.getChainId();
  }

  /**
   * 获取 Gas 价格
   * @returns Gas 价格
   */
  async getGasPrice(): Promise<string> {
    return await this.client.getGasPrice();
  }

  /**
   * 发送交易
   * @param options - 交易选项
   * @returns 交易哈希
   */
  async sendTransaction(
    options: { to: string; value: string; data?: string; gasLimit?: string },
  ): Promise<string> {
    return await this.client.sendTransaction(options);
  }

  /**
   * 签名消息
   * @param message - 消息内容
   * @returns 签名
   */
  async signMessage(message: string): Promise<string> {
    return await this.client.signMessage(message);
  }

  /**
   * 验证消息签名
   * @param message - 消息内容
   * @param signature - 签名
   * @param address - 地址
   * @returns 是否有效
   */
  async verifyMessage(
    message: string,
    signature: string,
    address: string,
  ): Promise<boolean> {
    return await this.client.verifyMessage(message, signature, address);
  }

  // ==================== 常用工具方法 ====================

  /**
   * 单位转换：Wei 转其他单位
   * @param value - Wei 值（字符串）
   * @param unit - 目标单位：wei, kwei, mwei, gwei, szabo, finney, ether
   * @returns 转换后的值
   *
   * @example
   * ```typescript
   * const eth = web3.fromWei("1000000000000000000", "ether") // "1.0"
   * const gwei = web3.fromWei("1000000000", "gwei") // "1.0"
   * ```
   */
  fromWei(
    value: string,
    unit: "wei" | "kwei" | "mwei" | "gwei" | "szabo" | "finney" | "ether",
  ): string {
    return fromWei(value, unit);
  }

  /**
   * 单位转换：其他单位转 Wei（实例方法）
   * @param value - 数值（字符串）
   * @param unit - 源单位：wei, kwei, mwei, gwei, szabo, finney, ether
   * @returns 转换后的 Wei 值
   *
   * @example
   * ```typescript
   * const wei = web3.toWei("1", "ether") // "1000000000000000000"
   * const wei = web3.toWei("1", "gwei") // "1000000000"
   * ```
   */
  toWei(
    value: string,
    unit: "wei" | "kwei" | "mwei" | "gwei" | "szabo" | "finney" | "ether" =
      "ether",
  ): string {
    return toWei(value, unit);
  }

  /**
   * 验证地址格式
   * @param address - 地址字符串
   * @returns 是否为有效地址
   *
   * @example
   * ```typescript
   * const isValid = web3.isAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb") // true
   * ```
   */
  isAddress(address: string): boolean {
    return isAddress(address);
  }

  /**
   * 转换为校验和地址
   * @param address - 地址字符串
   * @returns 校验和地址
   *
   * @example
   * ```typescript
   * const checksummed = web3.toChecksumAddress("0x742d35cc6634c0532925a3b844bc9e7595f0beb")
   * // "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
   * ```
   */
  toChecksumAddress(address: string): string {
    return toChecksumAddress(address);
  }

  /**
   * 格式化地址（添加 0x 前缀，转小写）
   * @param address - 地址字符串
   * @returns 格式化后的地址
   *
   * @example
   * ```typescript
   * const formatted = web3.formatAddress("742d35cc6634c0532925a3b844bc9e7595f0beb")
   * // "0x742d35cc6634c0532925a3b844bc9e7595f0beb"
   * ```
   */
  formatAddress(address: string): string {
    return formatAddress(address);
  }

  /**
   * 缩短地址显示（用于 UI）
   * @param address - 地址字符串
   * @param chars - 显示字符数（默认 4）
   * @returns 缩短后的地址
   *
   * @example
   * ```typescript
   * const short = web3.shortenAddress("0x742d35cc6634c0532925a3b844bc9e7595f0beb")
   * // "0x742d...0beb"
   * ```
   */
  shortenAddress(address: string, chars: number = 4): string {
    return shortenAddress(address, chars);
  }

  /**
   * Keccak-256 哈希
   * @param data - 要哈希的数据
   * @returns 哈希值（0x 开头的十六进制字符串）
   *
   * @example
   * ```typescript
   * const hash = await web3.keccak256("hello world") // "0x..."
   * ```
   */
  async keccak256(data: string): Promise<string> {
    return await keccak256(data);
  }

  /**
   * Solidity Keccak-256 哈希（处理 ABI 编码）
   * @param types - 类型数组
   * @param values - 值数组
   * @returns 哈希值
   *
   * @example
   * ```typescript
   * const hash = await web3.solidityKeccak256(
   *   ["address", "uint256"],
   *   ["0x...", "100"]
   * )
   * ```
   */
  async solidityKeccak256(
    types: string[],
    values: unknown[],
  ): Promise<string> {
    return await solidityKeccak256(types, values);
  }

  /**
   * 十六进制转字节数组
   * @param hex - 十六进制字符串
   * @returns 字节数组
   *
   * @example
   * ```typescript
   * const bytes = web3.hexToBytes("0x48656c6c6f")
   * // Uint8Array([72, 101, 108, 108, 111])
   * ```
   */
  hexToBytes(hex: string): Uint8Array {
    return hexToBytes(hex);
  }

  /**
   * 字节数组转十六进制
   * @param bytes - 字节数组
   * @returns 十六进制字符串
   *
   * @example
   * ```typescript
   * const hex = web3.bytesToHex(new Uint8Array([72, 101, 108, 108, 111]))
   * // "0x48656c6c6f"
   * ```
   */
  bytesToHex(bytes: Uint8Array): string {
    return bytesToHex(bytes);
  }

  /**
   * 十六进制转数字
   * @param hex - 十六进制字符串
   * @returns 数字
   *
   * @example
   * ```typescript
   * const num = web3.hexToNumber("0xff") // 255
   * ```
   */
  hexToNumber(hex: string): number {
    return hexToNumber(hex);
  }

  /**
   * 数字转十六进制
   * @param num - 数字
   * @returns 十六进制字符串
   *
   * @example
   * ```typescript
   * const hex = web3.numberToHex(255) // "0xff"
   * ```
   */
  numberToHex(num: number): string {
    return numberToHex(num);
  }

  /**
   * 移除 0x 前缀
   * @param hex - 十六进制字符串
   * @returns 移除前缀后的字符串
   *
   * @example
   * ```typescript
   * const withoutPrefix = web3.stripHexPrefix("0xff") // "ff"
   * ```
   */
  stripHexPrefix(hex: string): string {
    return stripHexPrefix(hex);
  }

  /**
   * 添加 0x 前缀
   * @param hex - 十六进制字符串
   * @returns 添加前缀后的字符串
   *
   * @example
   * ```typescript
   * const withPrefix = web3.addHexPrefix("ff") // "0xff"
   * ```
   */
  addHexPrefix(hex: string): string {
    return addHexPrefix(hex);
  }

  /**
   * 左侧填充
   * @param value - 值
   * @param length - 目标长度
   * @param char - 填充字符（默认 "0"）
   * @returns 填充后的字符串
   *
   * @example
   * ```typescript
   * const leftPadded = web3.padLeft("ff", 4) // "00ff"
   * ```
   */
  padLeft(value: string, length: number, char: string = "0"): string {
    return padLeft(value, length, char);
  }

  /**
   * 右侧填充
   * @param value - 值
   * @param length - 目标长度
   * @param char - 填充字符（默认 "0"）
   * @returns 填充后的字符串
   *
   * @example
   * ```typescript
   * const rightPadded = web3.padRight("ff", 4) // "ff00"
   * ```
   */
  padRight(value: string, length: number, char: string = "0"): string {
    return padRight(value, length, char);
  }

  /**
   * 验证私钥格式
   * @param privateKey - 私钥字符串
   * @returns 是否为有效私钥
   *
   * @example
   * ```typescript
   * const isValidKey = web3.isPrivateKey("0x...") // true
   * ```
   */
  isPrivateKey(privateKey: string): boolean {
    return isPrivateKey(privateKey);
  }

  /**
   * 验证交易哈希格式
   * @param txHash - 交易哈希字符串
   * @returns 是否为有效交易哈希
   *
   * @example
   * ```typescript
   * const isValidHash = web3.isTxHash("0x...") // true
   * ```
   */
  isTxHash(txHash: string): boolean {
    return isTxHash(txHash);
  }

  /**
   * 计算合约地址（CREATE）
   * @param deployer - 部署者地址
   * @param nonce - 部署者的 nonce
   * @returns 合约地址
   *
   * @example
   * ```typescript
   * const contractAddress = await web3.computeContractAddress("0x...", 0)
   * ```
   */
  async computeContractAddress(
    deployer: string,
    nonce: number,
  ): Promise<string> {
    return await computeContractAddress(deployer, nonce);
  }

  /**
   * 获取合约地址
   */
  get address(): string {
    return this.contract?.address || "";
  }

  /**
   * 获取合约 ABI
   */
  get abi(): AbiItem[] {
    return this.contract?.abi || [];
  }
}

/**
 * Web3 工厂函数
 * 创建 Web3 实例的便捷方法，自动合并配置文件和 options 参数
 * 配置文件是 JSON 格式，会同步加载
 *
 * @param contractName - 合约名称（可选）
 * @param options - Web3 配置选项（可选，会与配置文件中的参数合并，options 优先）
 * @returns Web3 实例
 *
 * @remarks
 * 配置合并规则：
 * 1. 如果提供了 options，会先加载配置文件（如果存在）
 * 2. options 中的参数会覆盖配置文件中的对应参数
 * 3. 如果 options 中未提供的参数，会使用配置文件中的值
 * 4. 如果配置文件不存在或未加载，且 options 不完整，会抛出错误
 * 5. 配置文件是 JSON 格式（config/web3.json），会同步加载
 *
 * @example
 * ```typescript
 * // 方式1：使用配置文件（同步加载）
 * const web3 = createWeb3("MyContract");
 *
 * // 方式2：使用自定义配置（会尝试加载配置并合并）
 * const web3 = createWeb3("MyContract", {
 *   privateKey: "0x...",
 *   address: "0x...",
 *   // rpcUrl 和 chainId 如果未提供，会从配置文件读取
 * });
 *
 * // 方式3：部分覆盖配置
 * const web3 = createWeb3("MyContract", {
 *   rpcUrl: "http://custom-rpc:8545", // 覆盖配置文件中的 rpcUrl
 *   // 其他参数使用配置文件中的值
 * });
 * ```
 */
export function createWeb3(
  contractName?: string,
  options?: Web3Options,
): Web3 {
  // 同步加载 JSON 配置
  const config = getWeb3ConfigSync();

  // 合并配置：options 优先，然后使用 config 中的值作为默认值
  const mergedOptions: Web3Options = {
    // 如果提供了 options，使用 options 的值，否则使用 config 中的值
    rpcUrl: options?.rpcUrl || config?.host,
    wssUrl: options?.wssUrl || config?.wss,
    chainId: options?.chainId || config?.chainId,
    // 账户相关参数：如果提供了 options，使用 options，否则使用 config
    privateKey: options?.privateKey,
    address: options?.address,
    account: options?.account ?? 0,
  };

  // 如果提供了 privateKey 但没有提供 address，且 config 中有账户信息
  // 尝试从 config 中获取对应的 address
  if (mergedOptions.privateKey && !mergedOptions.address && config) {
    // 查找匹配的账户
    const accountIndex = mergedOptions.account ?? 0;
    const matchedAccount = config.accounts?.[accountIndex];
    if (matchedAccount && matchedAccount.privateKey === mergedOptions.privateKey) {
      mergedOptions.address = matchedAccount.address;
    }
  }

  // 创建实例（构造函数会处理配置合并和验证）
  return new Web3(contractName, mergedOptions);
}
