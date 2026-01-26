/**
 * @title ABI Types
 * @description Solidity ABI 相关的类型定义
 */

/**
 * ABI 参数类型
 */
export interface AbiParameter {
  name: string;
  type: string;
  internalType?: string;
  indexed?: boolean;
}

/**
 * ABI 基础项类型
 */
export interface AbiItem {
  type: string;
  name?: string;
  inputs?: AbiParameter[];
  outputs?: AbiParameter[];
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
  anonymous?: boolean;
}

/**
 * ABI 函数类型
 */
export interface AbiFunction extends AbiItem {
  type: "function";
  name: string;
  inputs: AbiParameter[];
  outputs: AbiParameter[];
  stateMutability: "pure" | "view" | "nonpayable" | "payable";
}

/**
 * ABI 构造函数类型
 */
export interface AbiConstructor extends AbiItem {
  type: "constructor";
  inputs: AbiParameter[];
  stateMutability: "nonpayable";
}

/**
 * ABI 事件类型
 */
export interface AbiEvent extends AbiItem {
  type: "event";
  name: string;
  inputs: AbiParameter[];
  anonymous: boolean;
}
