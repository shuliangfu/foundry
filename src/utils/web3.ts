/**
 * @title Web3 Utils
 * @description Web3 utility class using @dreamer/web3
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 * 从项目根目录的 config/web3.ts 读取配置（项目规则，固定目录）
 */

import {
	addHexPrefix,
	createWeb3Client,
	type ExtendedTransactionReceipt,
	isAddress,
	isPrivateKey,
	toChecksumAddress,
} from "@dreamer/web3";
import { cwd, existsSync, getEnv, join, platform } from "@dreamer/runtime-adapter";
import { loadContract } from "./deploy-utils.ts";
import type { ContractInfo } from "./deploy-utils.ts";

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
let web3ConfigLoading: Promise<NetworkConfig | null> | null = null;

/**
 * 向上查找配置文件，从指定目录开始向上查找直到找到 config/web3.ts
 * @param startDir - 起始目录，默认为当前工作目录
 * @returns 配置文件所在目录，如果未找到则返回 null
 */
function findConfigDir(startDir: string): string | null {
	let currentDir = startDir;
	const plat = platform();
	const root = plat === "windows" ? /^[A-Z]:\\$/ : /^\/$/;

	while (true) {
		const configPath = join(currentDir, "config", "web3.ts");
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

function loadWeb3Config(projectRoot?: string): Promise<NetworkConfig | null> {
	// 如果正在加载，返回同一个 Promise
	if (web3ConfigLoading) {
		return web3ConfigLoading;
	}

	// 如果已缓存，直接返回 Promise
	if (web3ConfigCache !== null) {
		return Promise.resolve(web3ConfigCache);
	}

	// 开始加载
	web3ConfigLoading = (async () => {
		try {
			// 确定项目根目录
			const rootDir = projectRoot || cwd();

			// 查找配置文件所在目录（向上查找）
			const configDir = findConfigDir(rootDir);
			if (!configDir) {
				return null;
			}

			const configPath = join(configDir, "config", "web3.ts");
			if (!existsSync(configPath)) {
				return null;
			}

			// 动态导入配置模块
			const configUrl = new URL(`file://${configPath}`).href;
			const configModule = await import(configUrl);

			// 获取环境变量
			const web3Env = getEnv("WEB3_ENV") || "local";

			// 从配置中获取对应环境的配置
			let config: NetworkConfig | null = null;
			if (configModule.Web3Config && configModule.Web3Config[web3Env]) {
				config = configModule.Web3Config[web3Env];
			} else if (configModule.Web3Config && configModule.Web3Config.local) {
				config = configModule.Web3Config.local;
			} else if (configModule.web3Config) {
				config = configModule.web3Config;
			}

			if (config) {
				web3ConfigCache = config;
			}

			return config;
		} catch {
			return null;
		} finally {
			web3ConfigLoading = null;
		}
	})();

	return web3ConfigLoading;
}

/**
 * 预加载 Web3 配置（在模块加载时调用）
 * 这允许在构造函数中使用配置
 * @param projectRoot - 可选的项目根目录，如果不提供则从当前工作目录向上查找
 */
export async function preloadWeb3Config(projectRoot?: string): Promise<void> {
	await loadWeb3Config(projectRoot);
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
	private account: { address: string; privateKey: string; index: number };

	/**
	 * 创建 Web3 实例并绑定合约
	 * @param contractName - 合约名称（必须存在于 build/abi/{network} 目录中）
	 * @param options - 可选配置（如果不提供，将从 config/web3.ts 读取配置）
	 * @param options.rpcUrl - 自定义 RPC URL（覆盖配置文件）
	 * @param options.privateKey - 自定义私钥（覆盖配置文件）
	 * @param options.address - 自定义地址（与 privateKey 对应，覆盖配置文件）
	 * @param options.chainId - 自定义链 ID（覆盖配置文件）
	 * @param options.account - 账户索引（从配置的 accounts 数组中选择，默认为 0）
	 * 
	 * @remarks
	 * 配置读取流程：
	 * 1. 如果提供了 options.privateKey 和 options.address，使用自定义账户
	 * 2. 如果未提供 options 或只提供了部分 options，会从 config/web3.ts 读取配置
	 * 3. 配置文件路径：从当前目录向上查找，直到找到包含 config/web3.ts 的目录
	 * 4. 根据 WEB3_ENV 环境变量选择对应的配置（local/testnet/mainnet 等）
	 * 5. 配置会被缓存到 web3ConfigCache，避免重复加载
	 * 
	 * 注意：由于构造函数是同步的，如果配置未加载，需要先调用 preloadWeb3Config()：
	 * ```typescript
	 * await preloadWeb3Config();
	 * const web3 = new Web3("MyContract");
	 * ```
	 */
	constructor(contractName?: string, options?: Web3Options) {
		this.contractName = contractName;

		// 检查 web3Config 是否存在（尝试同步获取缓存）
		// 配置通过 loadWeb3Config() 函数从 config/web3.ts 加载并缓存到 web3ConfigCache
		const web3Config = web3ConfigCache;

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
				// 如果未提供 options 且配置未加载，尝试检查配置文件是否存在
				// 配置读取逻辑在 loadWeb3Config() 函数中（第67-125行）：
				// 1. 从当前目录向上查找 config/web3.ts 文件
				// 2. 动态导入配置模块
				// 3. 根据 WEB3_ENV 环境变量选择对应环境的配置
				// 4. 将配置缓存到 web3ConfigCache
				if (!options || Object.keys(options).length === 0) {
					// 尝试查找配置文件，给出更友好的错误提示
					const configDir = findConfigDir(cwd());
					const configPath = configDir ? join(configDir, "config", "web3.ts") : null;
					
					if (configPath && existsSync(configPath)) {
						// 配置文件存在但未加载
						throw new Error(
							`Web3 配置未加载。检测到配置文件存在：${configPath}\n` +
							`请在使用前调用 preloadWeb3Config() 来加载配置，或者提供 options 参数。\n` +
							`示例：await preloadWeb3Config(); const web3 = new Web3('MyContract');`,
						);
					} else {
						// 配置文件不存在
						throw new Error(
							`Web3 配置未找到。请创建 config/web3.ts 配置文件，或提供 options 参数。\n` +
							`配置文件路径：从当前目录向上查找，直到找到包含 config/web3.ts 的目录。\n` +
							`示例：await preloadWeb3Config(); const web3 = new Web3('MyContract');`,
						);
					}
				} else {
					// 提供了部分 options 但配置未加载，需要提供完整的 options
					throw new Error(
						"Web3 配置未找到。请检查 WEB3_ENV 环境变量或提供完整的 options.privateKey 和 options.address。\n" +
						"如果使用配置文件，请确保 config/web3.ts 存在，并在使用前调用 preloadWeb3Config()",
					);
				}
			}
		}

		// 验证私钥格式
		if (!isPrivateKey(this.account.privateKey)) {
			throw new Error("私钥格式无效，请检查 privateKey 配置");
		}

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
					(web3Config?.host || "http://127.0.0.1:8545"),
				wssUrl: options?.wssUrl || (web3Config?.wss || "ws://127.0.0.1:8545"),
				chainId: options?.chainId || (web3Config?.chainId || 31337),
				privateKey: this.account.privateKey,
			};

			// 传递 account 参数，让框架正确识别账户（使用 this.account 中的地址）
			// 这可能是框架的要求，即使有 privateKey 也需要 account
			clientOptions.account = this.account.address;

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
