#!/usr/bin/env -S deno run -A
/**
 * @module
 * @title Foundry CLI Global Installation Script
 * @description Installs the Foundry CLI globally, allowing the `foundry` command to be used anywhere.
 *
 * This module uses @dreamer/runtime-adapter for Deno and Bun compatibility.
 *
 * @example
 * ```bash
 * # Install in Deno environment
 * deno run -A src/setup.ts
 *
 * # Install in Bun environment
 * bun run src/setup.ts
 *
 * # Use after installation
 * foundry deploy --network testnet
 * foundry verify --network testnet --contract MyToken
 * ```
 */

import { cwd, join, getEnv, exit, createCommand, existsSync, remove, args } from "@dreamer/runtime-adapter";
import { logger } from "./utils/logger.ts";

/**
 * 获取 CLI 脚本路径和导入映射路径（使用绝对路径）
 */
function getPaths() {
  const projectRoot = cwd();
  const cliPath = join(projectRoot, "src", "cli.ts");
  const importMapPath = join(projectRoot, "import_map.json");
  return { cliPath, importMapPath };
}

/**
 * 安装 CLI 到全局
 */
async function install(): Promise<void> {
  logger.info("===========================================");
  logger.info("🚀 安装 Foundry CLI 到全局");
  logger.info("===========================================");
  logger.info("");

  const { cliPath, importMapPath } = getPaths();

  const args = [
    "install",
    "-A",
    "--global",
    "--force",
    "--import-map",
    importMapPath,
    "--name",
    "foundry",
    cliPath,
  ];

  console.log(args);

  try {
    // 使用 deno install 命令安装到全局
    // 使用 --import-map 指定导入映射，这样全局安装后才能找到依赖
    // 使用 --force 标志允许覆盖现有安装
    // 使用 -A 或 --allow-all 授予所有权限，确保安装后的命令可以正常运行
    const cmd = createCommand("deno", {
      args: args,
      stdout: "piped",
      stderr: "piped",
    });

    logger.info("正在安装...");
    const output = await cmd.output();
    const stdoutText = new TextDecoder().decode(output.stdout);
    const stderrText = new TextDecoder().decode(output.stderr);

    if (output.success) {
      logger.info("");
      logger.info("✅ Foundry CLI 安装成功！");
      logger.info("");
      logger.info("现在可以在任何地方使用以下命令：");
      logger.info("  foundry init [项目名]");
      logger.info("  foundry deploy --network <网络>");
      logger.info("  foundry verify --network <网络> --contract <合约名>");
      logger.info("");
      logger.info("查看帮助：");
      logger.info("  foundry --help");
      logger.info("  foundry init --help");
      logger.info("  foundry deploy --help");
      logger.info("  foundry verify --help");
      logger.info("");

      if (stdoutText) {
        logger.info("");
        logger.info("安装信息：");
        logger.info(stdoutText);
      }
    } else {
      logger.error("❌ 安装失败");
      if (stderrText) {
        logger.error(stderrText);
      }
      exit(1);
    }
  } catch (error) {
    logger.error("❌ 安装过程中发生错误:", error);
    exit(1);
  }
}

/**
 * 卸载 CLI
 */
async function uninstall(): Promise<void> {
  logger.info("===========================================");
  logger.info("🗑️  卸载 Foundry CLI");
  logger.info("===========================================");
  logger.info("");

  try {
    // 查找 deno 的 bin 目录
    const homeDir = getEnv("HOME") || getEnv("USERPROFILE") || "";
    const denoBinDir = join(homeDir, ".deno", "bin");

    // 尝试删除 foundry 可执行文件
    const foundryPath = join(denoBinDir, "foundry");

    try {
      if (existsSync(foundryPath)) {
        await remove(foundryPath);
        logger.info("✅ Foundry CLI 已卸载");
        logger.info(`   已删除: ${foundryPath}`);
      } else {
        logger.warn("⚠️  Foundry CLI 未找到，可能已经卸载");
      }
    } catch (error) {
      logger.error("❌ 卸载失败:", error);
      logger.info("");
      logger.info("请手动删除以下文件：");
      logger.info(`  ${foundryPath}`);
      exit(1);
    }
  } catch (error) {
    logger.error("❌ 卸载过程中发生错误:", error);
    exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  const cmdArgs = args();

  if (cmdArgs.length > 0 && (cmdArgs[0] === "--uninstall" || cmdArgs[0] === "-u")) {
    await uninstall();
  } else if (cmdArgs.length > 0 && (cmdArgs[0] === "--help" || cmdArgs[0] === "-h")) {
    logger.info(`
Foundry CLI 全局安装脚本

用法:
  deno run -A setup.ts [选项]

选项:
  --install, -i    安装 Foundry CLI 到全局（默认）
  --uninstall, -u  卸载 Foundry CLI
  --help, -h       显示此帮助信息

示例:
  # 安装
  deno run -A setup.ts

  # 卸载
  deno run -A setup.ts --uninstall

安装后使用:
  foundry deploy --network testnet
  foundry verify --network testnet --contract MyToken
`);
  } else {
    await install();
  }
}

// 执行主函数
if (import.meta.main) {
  await main();
}
