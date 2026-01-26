/**
 * @title Web3 Utils
 * @description Web3 utility class using @dreamer/web3
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 * 从项目根目录的 config/web3.json 读取配置（项目规则，固定目录）
 */

import { cwd, existsSync, getEnv, join, platform, readTextFileSync } from "@dreamer/runtime-adapter";
import {
  addHexPrefix,
  createWeb3Client,
  type ExtendedTransactionReceipt,
  isAddress,
  isPrivateKey,
  toChecksumAddress,
} from "@dreamer/web3";
import type { ContractInfo } from "./deploy-utils.ts";
import { loadContract } from "./deploy-utils.ts";

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
function loadWeb3ConfigSync(projectRoot?: string): NetworkConfig | null {
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
    let config: NetworkConfig | null = null;
    if (jsonConfig.Web3Config && jsonConfig.Web3Config[web3Env]) {
      config = jsonConfig.Web3Config[web3Env];
    } else if (jsonConfig.Web3Config && jsonConfig.Web3Config.local) {
      config = jsonConfig.Web3Config.local;
    } else if (jsonConfig.web3Config) {
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
  async read(methodName: string, args: any[] = []): Promise<any> {
    if (!this.contract) {
      throw new Error("Contract not initialized");
    }

    return await this.client.readContract({
      address: this.contract.address,
      abi: this.contract.abi as string[],
      functionName: methodName,
      args,
    });
  }

  /**
   * 调用合约函数（写入）
   */
  async call(
    methodName: string,
    args: any[] = [],
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
      abi: this.contract.abi as string[],
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
   * 获取合约地址
   */
  get address(): string {
    return this.contract?.address || "";
  }

  /**
   * 获取合约 ABI
   */
  get abi(): any[] {
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
