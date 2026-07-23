/**
 * test 命令的 CLI 逻辑：运行 deno test / bun test
 */

import {
  createCommand,
  existsSync,
  exit,
  getEnv,
  getEnvAll,
  IS_NODE,
  join,
  setEnv,
} from "@dreamer/runtime-adapter";
import { DEFAULT_NETWORK } from "../constants/index.ts";
import { $tr } from "../i18n.ts";
import { getNetworkName, getProjectConfig } from "../utils/cli-utils.ts";
import { loadEnv } from "../utils/env.ts";
import { logger } from "../utils/logger.ts";

/** test 命令的选项 */
export interface TestCliOptions {
  network?: string;
  filter?: string;
  coverage?: boolean;
  concurrency?: number;
}

/**
 * 执行 test 命令逻辑
 * @param args 位置参数（测试文件路径等）
 */
export async function runTestCli(args: string[], options: TestCliOptions): Promise<void> {
  loadEnv();

  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    logger.error($tr("foundry.test.projectRootNotFound"));
    exit(1);
  }
  const { projectRoot, denoJsonPath } = projectConfig;

  const hasDeno = existsSync(join(projectRoot, "deno.json"));
  const hasPackageJson = existsSync(join(projectRoot, "package.json"));
  // deno.json 项目用 deno；仅有 package.json 时按当前运行时选择（Node 用 node + tsx，Bun 用 bun）
  const runtime = hasDeno ? "deno" : (hasPackageJson ? (IS_NODE ? "node" : "bun") : "deno");

  const network = getNetworkName(options.network, false);
  const finalNetwork = network ?? getEnv("WEB3_ENV") ?? DEFAULT_NETWORK;
  setEnv("WEB3_ENV", finalNetwork);

  // 构建测试启动参数（按运行时差异：deno/bun 用 test 子命令，node 用 --import tsx --test）
  const testArgs: string[] = [];
  if (runtime === "deno") {
    testArgs.push("test", "-A");
    if (denoJsonPath) testArgs.push("--config", denoJsonPath);
    if (options.filter) testArgs.push("--filter", options.filter);
    if (options.coverage) testArgs.push("--coverage");
  } else if (runtime === "bun") {
    testArgs.push("test");
    if (options.filter) testArgs.push("--filter", options.filter);
    if (options.coverage) logger.warn($tr("foundry.test.coverageNotSupported"));
    if (options.concurrency !== undefined) {
      testArgs.push("--concurrency", String(options.concurrency));
    }
  } else {
    // node：--import tsx 注册 TS 加载器，--test 启用内置测试运行器
    // --test-name-pattern 等价于 deno/bun 的 --filter（正则匹配测试名）
    testArgs.push("--import", "tsx", "--test");
    if (options.filter) testArgs.push("--test-name-pattern", options.filter);
    if (options.coverage) {
      logger.warn($tr("foundry.test.coverageNotSupported"));
    }
  }
  if (args.length > 0) testArgs.push(...args);

  logger.info($tr("foundry.test.runningTest", { runtime }));
  logger.info($tr("foundry.test.networkLabel", { network: finalNetwork }));
  logger.info($tr("foundry.build.separator"));

  const envVars: Record<string, string> = { ...(getEnvAll() ?? {}) };
  envVars.WEB3_ENV = finalNetwork;

  try {
    const cmd = createCommand(runtime, {
      args: testArgs,
      cwd: projectRoot,
      env: envVars,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    const status = await child.status;
    if (!status.success) exit(status.code ?? 1);
    logger.info($tr("foundry.build.separator"));
    logger.info($tr("foundry.test.testDone"));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error($tr("foundry.test.testFailed"), msg);
    exit(1);
  }
}
