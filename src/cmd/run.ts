/**
 * run 命令的 CLI 逻辑：执行用户 TypeScript 脚本
 */

import { existsSync, exit, getEnv, isAbsolute, resolve, setEnv } from "@dreamer/runtime-adapter";
import { DEFAULT_NETWORK } from "../constants/index.ts";
import { $tr } from "../i18n.ts";
import { executeCommand, getNetworkName, getProjectConfig } from "../utils/cli-utils.ts";
import { loadEnv } from "../utils/env.ts";
import { logger } from "../utils/logger.ts";

/** run 命令的选项 */
export interface RunCliOptions {
  network?: string;
}

/**
 * 执行 run 命令逻辑
 * @param args 位置参数，args[0] 为脚本路径
 */
export async function runRunCli(args: string[], options: RunCliOptions): Promise<void> {
  loadEnv();

  const scriptPath = args[0];
  if (!scriptPath) {
    logger.error($tr("foundry.run.scriptRequired"));
    logger.error($tr("foundry.run.runUsage"));
    logger.error($tr("foundry.run.runExample"));
    exit(1);
  }

  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    logger.error($tr("foundry.run.projectRootNotFound"));
    exit(1);
  }
  const { projectRoot, denoJsonPath } = projectConfig;

  // 跨平台：绝对路径（Unix / 或 Windows C:\）直接使用，相对路径则基于 projectRoot 解析
  const fullScriptPath = isAbsolute(scriptPath) ? scriptPath : resolve(projectRoot, scriptPath);
  if (!existsSync(fullScriptPath)) {
    logger.error($tr("foundry.run.scriptNotExist", { path: fullScriptPath }));
    exit(1);
  }

  const network = getNetworkName(options.network, false);
  const finalNetwork = network ?? getEnv("WEB3_ENV") ?? DEFAULT_NETWORK;
  setEnv("WEB3_ENV", finalNetwork);

  logger.info($tr("foundry.run.networkLabel", { network: finalNetwork }));
  logger.info($tr("foundry.run.runScript", { script: scriptPath }));
  logger.info($tr("foundry.verify.sectionStart"));

  const scriptArgs = args.slice(1);
  const extraEnv: Record<string, string> = { WEB3_ENV: finalNetwork };

  try {
    const result = await executeCommand(
      fullScriptPath,
      denoJsonPath,
      projectRoot,
      scriptArgs,
      extraEnv,
    );
    if (!result.success) {
      logger.error($tr("foundry.run.scriptFailed"));
      exit(1);
    }
    logger.info("");
    logger.info($tr("foundry.verify.sectionStart"));
    logger.info($tr("foundry.run.scriptDone"));
    logger.info("");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error($tr("foundry.run.scriptFailedMsg"), msg);
    exit(1);
  }
}
