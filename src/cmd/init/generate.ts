/**
 * 根据 init 选项生成项目目录与文件（参考 dweb cmd/init/generate.ts）
 *
 * 负责创建目录、写入配置文件与示例文件，模板内容从 template.ts 获取，版本从 helpers 获取。
 */

import {
  dirname,
  existsSync,
  join,
  mkdir,
  remove,
  stat,
  writeTextFile,
} from "@dreamer/runtime-adapter";
import { $tr } from "../../i18n.ts";
import { logger } from "../../utils/logger.ts";
import { getCopyrightOwner, getCurrentVersion, getLatestJsrVersion } from "./helpers.ts";
import type { InitOptions } from "./types.ts";
import {
  getConfigWeb3Json,
  getCursorignore,
  getDenoJsonTemplate,
  getEnvExample,
  getEnvFile,
  getExampleContractSol,
  getExampleDeployScript,
  getExampleTestScript,
  getFoundryToml,
  getGitignore,
  getLicenseContent,
  getNoticeContent,
  getPrettierrc,
  getReadmeContent,
  getVscodeExtensions,
  getVscodeSettings,
} from "./template.ts";

const DIRECTORIES = [
  "src",
  "deploy",
  "tests",
  "build",
  "build/abi",
  "build/abi/local",
  "build/abi/testnet",
  "build/abi/mainnet",
  "config",
];

/** 日志中显示的路径：有 displayPrefix 时显示为 prefix/path */
function displayPath(prefix: string | undefined, path: string): string {
  return prefix ? `${prefix}/${path}` : path;
}

/**
 * 创建项目目录结构
 */
async function createDirectories(
  projectRoot: string,
  displayPrefix: string | undefined,
): Promise<void> {
  logger.info($tr("foundry.init.createDirStructure"));
  for (const dir of DIRECTORIES) {
    const dirPath = join(projectRoot, dir);
    const showPath = displayPath(displayPrefix, dir);
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
      logger.info($tr("foundry.init.createdDir", { path: showPath }));
    } else {
      try {
        const fileStat = await stat(dirPath);
        if (fileStat.isFile) {
          throw new Error($tr("foundry.init.dirExistsAsFile", { dir }));
        }
        logger.info($tr("foundry.init.dirExists", { path: showPath }));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (error instanceof Error && (msg.includes("文件") || msg.includes("file"))) {
          throw error;
        }
        logger.warn($tr("foundry.init.checkDirFailed", { path: showPath, error: String(error) }));
        throw error;
      }
    }
  }
}

/**
 * 创建配置文件（foundry.toml、.gitignore、deno.json、.vscode 等）
 */
async function createConfigFiles(
  projectRoot: string,
  displayPrefix: string | undefined,
): Promise<void> {
  logger.info($tr("foundry.init.createConfigFiles"));
  const currentVersion = getCurrentVersion();
  const testVersion = await getLatestJsrVersion("dreamer", "test");
  const copyrightOwner = getCopyrightOwner();

  const configFiles = [
    { path: "foundry.toml", content: getFoundryToml() },
    { path: ".gitignore", content: getGitignore() },
    { path: ".env.example", content: getEnvExample() },
    { path: ".env", content: getEnvFile() },
    { path: ".prettierrc", content: getPrettierrc() },
    { path: ".cursorignore", content: getCursorignore() },
    { path: "deno.json", content: getDenoJsonTemplate(currentVersion, testVersion) },
    { path: "config/web3.json", content: getConfigWeb3Json() },
    { path: ".vscode/settings.json", content: getVscodeSettings() },
    { path: ".vscode/extensions.json", content: getVscodeExtensions() },
    { path: "LICENSE", content: getLicenseContent(copyrightOwner) },
    {
      path: "NOTICE",
      content: getNoticeContent(displayPrefix ?? "Foundry Project", copyrightOwner),
    },
  ];

  for (const file of configFiles) {
    const filePath = join(projectRoot, file.path);
    const showPath = displayPath(displayPrefix, file.path);
    try {
      if (existsSync(filePath)) {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory) {
          logger.warn($tr("foundry.init.foundDirAsFileReplace", { path: showPath }));
          await remove(filePath, { recursive: true });
        } else {
          logger.warn($tr("foundry.init.fileExistsSkip", { path: showPath }));
          continue;
        }
      }
    } catch (error) {
      logger.warn($tr("foundry.init.checkFileFailed", { path: showPath, error: String(error) }));
      try {
        await remove(filePath, { recursive: true });
      } catch {
        // 忽略删除错误
      }
    }

    const parentDir = dirname(filePath);
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true });
    }
    await writeTextFile(filePath, file.content);
    logger.info($tr("foundry.init.createdFile", { path: showPath }));
  }
}

/**
 * 创建示例文件（MyToken.sol、1-mytoken.ts、01-mytoken.test.ts）
 */
async function createExampleFiles(
  projectRoot: string,
  displayPrefix: string | undefined,
): Promise<void> {
  logger.info($tr("foundry.init.createExampleFiles"));

  const exampleFiles = [
    { path: "src/MyToken.sol", content: getExampleContractSol() },
    { path: "deploy/1-mytoken.ts", content: getExampleDeployScript() },
    { path: "tests/01-mytoken.test.ts", content: getExampleTestScript() },
  ];

  for (const file of exampleFiles) {
    const filePath = join(projectRoot, file.path);
    const showPath = displayPath(displayPrefix, file.path);
    try {
      if (existsSync(filePath)) {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory) {
          logger.warn($tr("foundry.init.foundDirAsFileReplace", { path: showPath }));
          await remove(filePath, { recursive: true });
        } else {
          logger.warn($tr("foundry.init.exampleExistsSkip", { path: showPath }));
          continue;
        }
      }
    } catch (error) {
      logger.warn($tr("foundry.init.checkFileFailed", { path: showPath, error: String(error) }));
      try {
        await remove(filePath, { recursive: true });
      } catch {
        // 忽略删除错误
      }
    }

    const parentDir = dirname(filePath);
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true });
    }

    try {
      await writeTextFile(filePath, file.content);
      logger.info($tr("foundry.init.createdExampleFile", { path: showPath }));
    } catch (error) {
      const errorCode = (error as { code?: string })?.code;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        error instanceof Error &&
        (error.name === "IsADirectory" ||
          errorMessage.includes("IsADirectory") ||
          errorCode === "EISDIR" ||
          errorMessage.includes("EISDIR"))
      ) {
        logger.warn($tr("foundry.init.writeFoundDirReplace", { path: showPath }));
        try {
          await remove(filePath, { recursive: true });
          await writeTextFile(filePath, file.content);
          logger.info($tr("foundry.init.recreateExample", { path: showPath }));
        } catch (_retryError) {
          const errorMsg = $tr("foundry.init.createFileDirFailed", { path: file.path });
          logger.error(`  ✗ ${errorMsg}`);
          throw new Error(errorMsg);
        }
      } else {
        throw error;
      }
    }
  }
}

/**
 * 创建 README.md
 */
async function createREADME(
  projectRoot: string,
  displayPrefix: string | undefined,
): Promise<void> {
  const readmePath = join(projectRoot, "README.md");
  const showPath = displayPath(displayPrefix, "README.md");
  if (existsSync(readmePath)) {
    logger.warn($tr("foundry.init.readmeExistsSkip", { path: showPath }));
    return;
  }
  await writeTextFile(readmePath, getReadmeContent());
  logger.info($tr("foundry.init.createdReadme", { path: showPath }));
}

/**
 * 根据选项生成项目文件（目录、配置、示例、README）
 * @param opts targetDir 必填，displayPrefix 可选（用于日志中路径前缀，如 app-test/src）
 */
export async function generate(opts: InitOptions): Promise<void> {
  const { targetDir: projectRoot, displayPrefix } = opts;

  await createDirectories(projectRoot, displayPrefix);
  logger.info("");

  await createConfigFiles(projectRoot, displayPrefix);
  logger.info("");

  await createExampleFiles(projectRoot, displayPrefix);
  logger.info("");

  await createREADME(projectRoot, displayPrefix);
}
