#!/usr/bin/env -S deno run -A
/**
 * 可执行验证入口：供 CLI 通过子进程调用（executeCommand）。
 * 使用项目的 deno.json 运行，从而正确解析 @dreamer/foundry 等依赖。
 *
 * 用法: deno run -A --config <project/deno.json> verify.ts --network testnet --contract Contract1 --api-key KEY [选项]
 */

import { args, exit } from "@dreamer/runtime-adapter";
import type { VerifyCliOptions } from "./cmd/verify.ts";
import { runVerifyCli } from "./cmd/verify.ts";
import { logger } from "./utils/logger.ts";

/**
 * 从 argv 解析出 VerifyCliOptions
 */
function parseVerifyArgs(argv: string[]): VerifyCliOptions {
  const options: VerifyCliOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "--network" || arg === "-n") && argv[i + 1]) {
      options.network = argv[++i];
    } else if ((arg === "--contract" || arg === "-c") && argv[i + 1]) {
      const contracts: string[] = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        contracts.push(argv[++i].trim());
      }
      options.contract = contracts;
    } else if ((arg === "--address" || arg === "-a") && argv[i + 1]) {
      options.address = argv[++i];
    } else if (arg === "--rpc-url" && argv[i + 1]) {
      options["rpc-url"] = argv[++i];
    } else if (arg === "--api-key" && argv[i + 1]) {
      options["api-key"] = argv[++i];
    } else if (arg === "--chain-id" && argv[i + 1]) {
      options["chain-id"] = parseInt(argv[++i], 10);
    }
  }
  return options;
}

/**
 * 验证入口主函数：解析 argv 并执行 runVerifyCli
 */
async function main(): Promise<void> {
  const argv = typeof args === "function" ? args() : [];
  const options = parseVerifyArgs(argv);
  await runVerifyCli(options, argv);
}

// 当作为脚本直接运行时执行主函数
if (import.meta.main) {
  main().catch((error) => {
    logger.error("❌ 执行失败:", error);
    exit(1);
  });
}
