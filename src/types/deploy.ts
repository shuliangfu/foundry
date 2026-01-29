/**
 * @title Deploy Types
 * @description 部署相关的类型定义
 */

/**
 * 网络配置接口
 * 包含部署合约所需的网络和账户信息
 */
export interface NetworkConfig {
  /** 账户地址 */
  address: string;
  /** RPC URL */
  rpcUrl: string;
  /** 部署者私钥 */
  privateKey: string;
  /** 链 ID（可选） */
  chainId?: number;
}

/**
 * 部署选项接口
 * 用于配置合约部署时的各种选项
 */
export interface DeployOptions {
  /** 是否验证合约 */
  verify?: boolean;
  /** Etherscan API Key（验证时需要） */
  etherscanApiKey?: string;
  /** 链 ID（验证时需要） */
  chainId?: number;
  /** 是否强制部署（覆盖已存在的合约） */
  force?: boolean;
  /** 自定义合约路径，如 "lib/pancake-swap-core/contracts/PancakeFactory.sol:PancakeFactory" */
  contractPath?: string;
  /** ABI 输出目录，默认为 "build/abi/{network}" */
  abiDir?: string;
  /** 等待的区块确认数（默认为 2，local 网络默认为 0） */
  confirmations?: number;
}
