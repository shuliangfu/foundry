/**
 * @module
 * @title Foundry Deploy Library
 * @description Foundry deployment and verification utilities for Deno and Bun.
 * 
 * This module provides core functionality for deploying and verifying smart contracts
 * using Foundry framework. It includes deployment scripts execution, contract verification,
 * and utility functions for Web3 interactions.
 * 
 * @example
 * ```typescript
 * import { deploy, verify, Web3, preloadWeb3Config } from "@dreamer/foundry";
 * 
 * // Preload Web3 configuration
 * await preloadWeb3Config();
 * 
 * // Use Web3 class
 * const web3 = new Web3("MyContract");
 * ```
 */

// 导出部署功能
export * from "./deploy.ts";


// 导出工具函数
export * from "./utils/mod.ts";
