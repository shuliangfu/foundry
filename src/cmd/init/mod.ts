/**
 * foundry init 脚手架入口：解析目标目录、确认后调用 generate 生成项目
 */

import {
  basename,
  cwd,
  existsSync,
  exit,
  isAbsolute,
  mkdir,
  resolve,
  stat,
} from "@dreamer/runtime-adapter";
import { $tr } from "../../i18n.ts";
import { logger } from "../../utils/logger.ts";
import { generate } from "./generate.ts";
import { confirm, isDirectoryEmpty } from "./helpers.ts";
import type { InitMainOptions, InitOptions } from "./types.ts";

export type { InitMainOptions, InitOptions };
export { generate } from "./generate.ts";

/**
 * 主入口：初始化 Foundry 项目
 * @param projectRoot 可选项目根目录；不传则在当前目录初始化
 */
export async function init(projectRoot?: string): Promise<void> {
  let root: string;

  if (projectRoot) {
    const targetPath = isAbsolute(projectRoot) ? projectRoot : resolve(cwd(), projectRoot);

    if (existsSync(targetPath)) {
      const fileStat = await stat(targetPath);
      if (fileStat.isFile) {
        throw new Error($tr("foundry.init.pathIsFile", { path: projectRoot }));
      }
      root = targetPath;
      logger.info($tr("foundry.init.useExistingDir", { path: projectRoot }));
    } else {
      await mkdir(targetPath, { recursive: true });
      root = targetPath;
      logger.info($tr("foundry.init.createNewDir", { path: projectRoot }));
    }
  } else {
    root = cwd();
    const isEmpty = await isDirectoryEmpty(root);
    if (!isEmpty) {
      const dirName = basename(root);
      const confirmed = await confirm($tr("foundry.init.confirmNonEmpty", { dir: dirName }));
      if (!confirmed) {
        logger.info($tr("foundry.init.cancelAndHint"));
        logger.info($tr("foundry.init.cancelHint"));
        exit(0);
      }
    }
  }

  logger.info($tr("foundry.init.separator"));
  logger.info($tr("foundry.init.title"));
  logger.info($tr("foundry.init.separator"));
  logger.info($tr("foundry.init.projectRoot", { root }));
  logger.info("");

  try {
    const displayPrefix = projectRoot ?? (root !== cwd() ? basename(root) : undefined);
    await generate({ targetDir: root, displayPrefix });
    logger.info("");
    logger.info($tr("foundry.init.separator"));
    logger.info($tr("foundry.init.initComplete"));
    logger.info($tr("foundry.init.separator"));
    logger.info("");
    logger.info($tr("foundry.init.nextStepsTitle"));
    logger.info($tr("foundry.init.nextStep1"));
    logger.info($tr("foundry.init.nextStep2"));
    logger.info($tr("foundry.init.nextStep3"));
    logger.info($tr("foundry.init.nextStep4"));
    logger.info("");
  } catch (error) {
    logger.error($tr("foundry.init.initFailedMsg"), error);
    throw error;
  }
}
