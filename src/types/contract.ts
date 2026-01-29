/**
 * @title Contract Types
 * @description 合约相关的类型定义
 */

import type { AbiItem } from "./abi.ts";

/**
 * 合约 Artifact 类型
 */
export interface ContractArtifact {
  contractName: string;
  abi: AbiItem[];
  bytecode: string;
  deployedBytecode?: string;
  metadata?: string;
}

/**
 * 已部署合约信息
 */
export interface DeployedContract {
  contractName: string;
  address: string;
  abi: AbiItem[];
  args?: unknown[];
  network: string;
  deployedAt?: string;
  txHash?: string;
}

/**
 * 合约信息（兼容旧接口）
 */
export interface ContractInfo {
  contractName: string;
  address: string;
  abi: AbiItem[];
  args?: unknown[];
}
