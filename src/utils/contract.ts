/**
 * @title Contract Utils
 * @description Contract loading utilities
 * 使用 @dreamer/runtime-adapter 兼容 Deno 和 Bun
 */

import {
  cwd,
  existsSync,
  getEnv,
  join,
  readdirSync,
  readTextFileSync,
} from "@dreamer/runtime-adapter";
import { DEFAULT_NETWORK } from "../constants/index.ts";

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
 * @param env 网络名，未传入时从环境变量 WEB3_ENV 读取，仍无则使用默认网络常量
 */
export function loadContracts(env?: string): Record<string, Contract> {
  const network = env ?? getEnv("WEB3_ENV") ?? DEFAULT_NETWORK;
  const abiDir = join(cwd(), "build", "abi", network);
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
