#!/usr/bin/env -S deno run -A
/**
 * @module @dreamer/foundry/cli
 * @title Foundry CLI
 * @description Foundry 命令行入口，仅注册命令并委托 cmd 目录执行逻辑。
 *
 * @example
 * ```bash
 * foundry deploy --network testnet
 * foundry verify --network testnet --contract Contract1 --api-key YOUR_API_KEY
 * ```
 */

import { Command } from "@dreamer/console";
import { exit, getEnv, setEnv } from "@dreamer/runtime-adapter";
import { DEFAULT_NETWORK } from "./constants/index.ts";
import { $tr } from "./i18n.ts";
import { runBuildCli } from "./cmd/build.ts";
import type { BuildCliOptions } from "./cmd/build.ts";
import { init } from "./cmd/init.ts";
import { type RunCliOptions, runRunCli } from "./cmd/run.ts";
import { runTestCli, type TestCliOptions } from "./cmd/test.ts";
import { getVersion, runUpgradeCli, type UpgradeCliOptions } from "./cmd/upgrade.ts";
import { runUninstallCli } from "./cmd/uninstall.ts";
import {
  executeCommand,
  getApiKey,
  getNetworkName,
  getProjectConfig,
  getScriptPath,
  handleCommandResult,
} from "./utils/cli-utils.ts";
import { loadEnv } from "./utils/env.ts";
import { logger } from "./utils/logger.ts";

loadEnv();

const cli = new Command("foundry", $tr("foundry.cli.appDescription"));

// ----- init -----
cli
  .command("init", $tr("foundry.cli.initCommandDesc"))
  .argument({
    name: "projectRoot",
    description: $tr("foundry.cli.initArgDesc"),
    required: false,
  })
  .action(async (args) => {
    try {
      await init(args.length > 0 ? args[0] : undefined);
    } catch (error) {
      logger.error($tr("foundry.cli.initFailed") + ":", error);
      exit(1);
    }
  });

// ----- deploy -----
cli
  .command("deploy", $tr("foundry.cli.deployCommandDesc"))
  .option({
    name: "network",
    alias: "n",
    description: $tr("foundry.cli.networkOptionDesc"),
    requiresValue: true,
    type: "string",
    required: false,
  })
  .option({
    name: "contract",
    alias: "c",
    description: $tr("foundry.cli.contractOptionDesc"),
    requiresValue: true,
    type: "array",
  })
  .option({
    name: "force",
    alias: "f",
    description: $tr("foundry.cli.forceDesc"),
    type: "boolean",
  })
  .option({
    name: "verify",
    description: $tr("foundry.cli.verifyDesc"),
    type: "boolean",
  })
  .option({
    name: "api-key",
    description: $tr("foundry.cli.apiKeyOptionDesc"),
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "confirmations",
    description: $tr("foundry.cli.confirmationsDesc"),
    requiresValue: true,
    defaultValue: 2,
    type: "number",
  })
  .action(async (_args, options) => {
    const network = getNetworkName(options.network as string | undefined, false);
    if (!network) {
      logger.error($tr("foundry.deploy.networkRequired"));
      logger.error($tr("foundry.deploy.networkRequiredHint"));
      exit(1);
    }
    setEnv("WEB3_ENV", network);
    const shouldVerify = options.verify === true;
    if (shouldVerify && !getApiKey(options["api-key"] as string | undefined)) {
      logger.error($tr("foundry.verify.apiKeyRequired"));
      logger.error($tr("foundry.verify.apiKeyHint"));
      exit(1);
    }
    const projectConfig = getProjectConfig();
    if (!projectConfig) {
      exit(1);
    }
    const { projectRoot, denoJsonPath } = projectConfig;
    const deployScriptPath = getScriptPath("deploy");
    const deployArgs: string[] = ["--network", network];
    if (options.force === true) deployArgs.push("--force");
    const contracts = options.contract != null
      ? (Array.isArray(options.contract) ? options.contract : [options.contract as string])
      : undefined;
    if (contracts?.length) {
      deployArgs.push("--contract", ...contracts);
    }
    if (options.confirmations !== undefined) {
      deployArgs.push("--confirmations", String(options.confirmations));
    }
    if (shouldVerify) {
      deployArgs.push("--verify");
      const apiKey = getApiKey(options["api-key"] as string | undefined);
      if (apiKey) deployArgs.push("--api-key", apiKey);
    }
    try {
      const result = await executeCommand(
        deployScriptPath,
        denoJsonPath,
        projectRoot,
        deployArgs,
      );
      handleCommandResult(result, $tr("foundry.deploy.allScriptsDone"), true);
    } catch (error) {
      logger.error($tr("foundry.deploy.scriptFailedExit") + ":", error);
      exit(1);
    }
  });

// ----- verify -----
cli
  .command("verify", $tr("foundry.cli.verifyCommandDesc"))
  .option({
    name: "network",
    alias: "n",
    description: $tr("foundry.cli.networkOptionDesc"),
    requiresValue: true,
    type: "string",
    required: false,
  })
  .option({
    name: "contract",
    alias: "c",
    description: $tr("foundry.cli.contractOptionVerifyDesc"),
    requiresValue: true,
    type: "array",
    required: true,
  })
  .option({
    name: "address",
    alias: "a",
    description: $tr("foundry.cli.addressOptionDesc"),
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "rpc-url",
    description: $tr("foundry.cli.rpcUrlOptionDesc"),
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "api-key",
    description: $tr("foundry.cli.apiKeyOptionDesc"),
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "chain-id",
    description: $tr("foundry.cli.chainIdOptionDesc"),
    requiresValue: true,
    type: "number",
  })
  .action(async (_args, options) => {
    const network = getNetworkName(options.network as string | undefined, false);
    if (!network) {
      logger.error($tr("foundry.verify.networkRequired"));
      logger.error($tr("foundry.verify.networkHint"));
      exit(1);
    }
    setEnv("WEB3_ENV", network);
    const contractNames = options.contract != null
      ? (Array.isArray(options.contract) ? options.contract : [options.contract as string])
      : [];
    if (contractNames.length === 0) {
      logger.error($tr("foundry.verify.contractRequired"));
      logger.error($tr("foundry.verify.contractHint"));
      exit(1);
    }
    const apiKey = getApiKey(options["api-key"] as string | undefined);
    if (!apiKey) {
      logger.error($tr("foundry.verify.apiKeyRequired"));
      logger.error($tr("foundry.verify.apiKeyHint"));
      exit(1);
    }
    const projectConfig = getProjectConfig();
    if (!projectConfig) {
      exit(1);
    }
    const { projectRoot, denoJsonPath } = projectConfig;
    const verifyScriptPath = getScriptPath("verify");
    const verifyArgs = [
      "--network",
      network,
      "--contract",
      ...contractNames,
      "--api-key",
      apiKey,
    ];
    if (options.address != null) {
      verifyArgs.push("--address", options.address as string);
    }
    if (options["rpc-url"] != null) {
      verifyArgs.push("--rpc-url", options["rpc-url"] as string);
    }
    if (options["chain-id"] != null) {
      verifyArgs.push("--chain-id", String(options["chain-id"]));
    }
    try {
      const result = await executeCommand(
        verifyScriptPath,
        denoJsonPath,
        projectRoot,
        verifyArgs,
      );
      handleCommandResult(result, undefined, true);
      logger.info($tr("foundry.verify.sectionSuccess"));
    } catch (error) {
      logger.error($tr("foundry.verify.commandFailed") + ":", error);
      exit(1);
    }
  });

// ----- run -----
cli
  .command("run", $tr("foundry.cli.runCommandDesc"))
  .option({
    name: "network",
    alias: "n",
    description: $tr("foundry.cli.networkOptionDesc"),
    requiresValue: true,
    type: "string",
    required: false,
    defaultValue: getEnv("WEB3_ENV") ?? DEFAULT_NETWORK,
    validator: (value) => {
      if (value !== "local" && value !== "testnet" && value !== "mainnet") {
        return $tr("foundry.cli.networkMustBe");
      }
      return true;
    },
  })
  .action(async (args, options) => {
    await runRunCli(args, options as RunCliOptions);
  });

// ----- build -----
cli
  .command("build", $tr("foundry.cli.buildCommandDesc"))
  .option({
    name: "sizes",
    alias: "s",
    description: $tr("foundry.cli.sizeOptionDesc"),
    type: "boolean",
  })
  .option({
    name: "force",
    alias: "f",
    description: $tr("foundry.cli.forceBuildDesc"),
    type: "boolean",
  })
  .option({
    name: "optimizer-runs",
    description: $tr("foundry.cli.optimizerRunsDesc"),
    requiresValue: true,
    type: "number",
  })
  .action(async (_args, options) => {
    await runBuildCli(options as BuildCliOptions);
  });

// ----- test -----
cli
  .command("test", $tr("foundry.cli.testCommandDesc"))
  .option({
    name: "network",
    alias: "n",
    description: $tr("foundry.cli.networkOptionDesc"),
    requiresValue: true,
    type: "string",
    required: false,
    defaultValue: getEnv("WEB3_ENV") ?? DEFAULT_NETWORK,
    validator: (value) => {
      if (value !== "local" && value !== "testnet" && value !== "mainnet") {
        return $tr("foundry.cli.networkMustBe");
      }
      return true;
    },
  })
  .option({
    name: "filter",
    alias: "f",
    description: $tr("foundry.cli.filterOptionDesc"),
    requiresValue: true,
    type: "string",
  })
  .option({
    name: "coverage",
    description: $tr("foundry.cli.coverageOptionDesc"),
    type: "boolean",
  })
  .option({
    name: "concurrency",
    alias: "j",
    description: $tr("foundry.cli.concurrencyOptionDesc"),
    requiresValue: true,
    type: "number",
  })
  .action(async (args, options) => {
    await runTestCli(args, options as TestCliOptions);
  });

// ----- upgrade -----
cli
  .command("upgrade", $tr("foundry.cli.upgradeCommandDesc"))
  .option({
    name: "beta",
    description: $tr("foundry.cli.betaOptionDesc"),
    type: "boolean",
  })
  .option({
    name: "force",
    alias: "f",
    description: $tr("foundry.cli.forceUpgradeDesc"),
    type: "boolean",
  })
  .action(async (_args, options) => {
    await runUpgradeCli(options as UpgradeCliOptions);
  });

// ----- uninstall -----
cli
  .command("uninstall", $tr("foundry.cli.uninstallCommandDesc"))
  .action(async () => {
    await runUninstallCli();
  });

// ----- 执行 -----
if (import.meta.main) {
  try {
    const version = await getVersion();
    if (version) {
      const appName = $tr("foundry.cli.appName");
      const versionLabel = $tr("foundry.cli.versionLabel");
      const sub = $tr("foundry.cli.versionBannerSub");
      cli.setVersion(
        `\n\x1b[36m${appName}\x1b[0m
\x1b[1m\x1b[36m${versionLabel}\x1b[0m \x1b[33m${version}\x1b[0m

\x1b[90m${sub}\x1b[0m \n`,
      );
    }
  } catch {
    // 版本号可选
  }
  await cli.execute();
}
