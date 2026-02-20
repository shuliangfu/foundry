/**
 * build 命令的 CLI 逻辑：执行 forge build
 */

import { createCommand, exit } from "@dreamer/runtime-adapter";
import { $tr } from "../i18n.ts";
import { logger } from "../utils/logger.ts";

/** build 命令的选项 */
export interface BuildCliOptions {
  sizes?: boolean;
  force?: boolean;
  "optimizer-runs"?: number;
}

/**
 * 执行 build 命令逻辑
 */
export async function runBuildCli(options: BuildCliOptions): Promise<void> {
  logger.info($tr("foundry.build.title"));
  logger.info($tr("foundry.build.separator"));

  const forgeArgs: string[] = ["build"];
  if (options.sizes) forgeArgs.push("--sizes");
  if (options.force) forgeArgs.push("--force");
  if (options["optimizer-runs"] !== undefined) {
    forgeArgs.push("--optimizer-runs", String(options["optimizer-runs"]));
  }

  try {
    const cmd = createCommand("forge", {
      args: forgeArgs,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (!status.success) {
      logger.error($tr("foundry.build.buildFailed"));
      exit(status.code ?? 1);
    }
    logger.info("");
    logger.info($tr("foundry.build.separator"));
    logger.info($tr("foundry.build.buildDone"));
    logger.info("");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error($tr("foundry.build.buildFailedMsg"), msg);
    exit(1);
  }
}
