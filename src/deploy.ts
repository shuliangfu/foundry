#!/usr/bin/env -S deno run -A
/**
 * 可执行部署入口：供 CLI 通过子进程调用（executeCommand）。
 * 使用项目的 deno.json 运行，从而正确解析 @dreamer/foundry 等依赖。
 *
 * 用法: deno run -A --config <project/deno.json> deploy.ts --network testnet [选项]
 */

import { args, exit } from "@dreamer/runtime-adapter";
import type { DeployCliOptions } from "./cmd/deploy.ts";
import { runDeployCli } from "./cmd/deploy.ts";
import { logger } from "./utils/logger.ts";

/**
 * 从 argv 解析出 DeployCliOptions
 */
function parseDeployArgs(argv: string[]): DeployCliOptions {
  const options: DeployCliOptions = {};
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
    } else if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--verify") {
      options.verify = true;
    } else if (arg === "--api-key" && argv[i + 1]) {
      options["api-key"] = argv[++i];
    } else if (arg === "--confirmations" && argv[i + 1]) {
      options.confirmations = parseInt(argv[++i], 10);
    }
  }
  return options;
}

/**
 * 部署入口主函数：解析 argv 并执行 runDeployCli
 */
async function main(): Promise<void> {
  const argv = typeof args === "function" ? args() : [];
  const options = parseDeployArgs(argv);
  await runDeployCli(options, argv);
}

// 当作为脚本直接运行时执行主函数
if (import.meta.main) {
  main().catch((error) => {
    logger.error("❌ 执行失败:", error);
    exit(1);
  });
}
