/**
 * @title Contract Utils
 * @description Contract loading utilities
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 */

import { existsSync, readdirSync, readTextFileSync, cwd, join } from "./deps.ts";

/**
 * 合约接口
 */
export interface Contract {
  contractName: string;
  address: string;
  abi: unknown[];
}

/**
 * 加载指定环境的所有合约 ABI
 */
export function loadContracts(env: string = "local"): Record<string, Contract> {
  const abiDir = join(cwd(), "build", "abi", env);
  const contracts: Record<string, Contract> = {};

  try {
    if (!existsSync(abiDir)) {
      return contracts;
    }

    for (const entry of readdirSync(abiDir)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const filePath = join(abiDir, entry.name);
        try {
          const fileContent = readTextFileSync(filePath);
          const contract = JSON.parse(fileContent);

          if (contract.contractName && contract.address && contract.abi) {
            contracts[contract.contractName] = {
              contractName: contract.contractName,
              address: contract.address,
              abi: contract.abi,
            };
          }
        } catch (error) {
          console.error(`读取合约文件失败: ${filePath}`, error);
        }
      }
    }
  } catch (error) {
    console.error(`读取 ABI 目录失败: ${abiDir}`, error);
  }

  return contracts;
}
