/**
 * uninstall 命令的 CLI 逻辑：卸载 Foundry 全局命令
 */

import { existsSync, exit, getEnv, join, remove } from "@dreamer/runtime-adapter";
import { $tr } from "../i18n.ts";
import { findFoundryPath } from "../setup.ts";
import { confirm } from "./common.ts";
import { logger } from "../utils/logger.ts";

/**
 * 执行 uninstall 命令逻辑
 */
export async function runUninstallCli(): Promise<void> {
  logger.info($tr("foundry.init.separator"));
  logger.info($tr("foundry.setup.uninstallTitle"));
  logger.info($tr("foundry.init.separator"));
  logger.info("");

  try {
    const foundryPath = await findFoundryPath();

    if (!foundryPath) {
      logger.warn($tr("foundry.setup.uninstallNotFound"));
      logger.info("");
      logger.info($tr("foundry.setup.uninstallCheckPaths"));
      const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
      if (homeDir) {
        logger.info(`  ${join(homeDir, ".deno", "bin", "foundry")}`);
        logger.info(`  ${join(homeDir, ".bun", "bin", "foundry")}`);
      }
      return;
    }

    logger.info($tr("foundry.setup.foundryPathFound", { path: foundryPath }));
    logger.info("");

    const confirmed = await confirm($tr("foundry.setup.uninstallConfirm"));

    if (!confirmed) {
      logger.info($tr("foundry.setup.operationCancelled"));
      return;
    }

    try {
      if (existsSync(foundryPath)) {
        await remove(foundryPath);
        logger.info($tr("foundry.setup.uninstallSuccess"));
        logger.info($tr("foundry.setup.uninstallDeleted", { path: foundryPath }));
      } else {
        logger.warn($tr("foundry.setup.uninstallNotFound"));
        logger.info($tr("foundry.setup.uninstallExpectedPath", { path: foundryPath }));
      }
    } catch (error) {
      logger.error($tr("foundry.setup.uninstallFailedMsg"), error);
      logger.info("");
      logger.info($tr("foundry.setup.uninstallManualDelete"));
      logger.info(`  ${foundryPath}`);
      exit(1);
    }
  } catch (error) {
    logger.error($tr("foundry.setup.uninstallError"), error);
    exit(1);
  }
}
