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

// 导出部署与验证功能（统一从主入口 @dreamer/foundry 使用，无需子路径）
export * from "./deploy.ts";
export * from "./utils/mod.ts";
export * from "./verify.ts";
