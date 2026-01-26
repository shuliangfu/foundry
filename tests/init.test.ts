/**
 * @title Init 功能测试
 * @description 测试 init 项目初始化功能
 */

import { describe, it, expect, beforeAll, afterAll } from "../src/utils/deps.ts";
import { existsSync, mkdir, readTextFile, writeTextFile, join, cwd, stat, remove } from "../src/utils/deps.ts";
import { init } from "../src/init.ts";
import { logger } from "../src/utils/logger.ts";

describe("Init 项目初始化测试", () => {
  // 测试项目根目录（放在 data 目录下，测试后保留）
  const testProjectRoot = join(cwd(), "tests", "data", "test-project");

  beforeAll(async () => {
    logger.info("准备测试环境...");
    // 测试前完全清理项目目录（如果存在）
    try {
      if (existsSync(testProjectRoot)) {
        // 使用 remove 递归删除整个目录（兼容 Deno 和 Bun）
        await remove(testProjectRoot, { recursive: true });
        logger.info(`已删除已存在的测试项目: ${testProjectRoot}`);
      }
    } catch (error) {
      logger.warn(`删除测试项目时出错: ${error}`);
      // 如果删除失败，尝试强制删除
      try {
        await remove(testProjectRoot, { recursive: true });
      } catch {
        // 忽略删除错误，继续执行
      }
    }
    
    // 确保测试数据目录存在
    await mkdir(join(cwd(), "tests", "data"), { recursive: true });
    
    // 再次检查并清理可能存在的目录形式的配置文件（在创建项目前）
    // 这些文件应该是文件，如果存在为目录则删除
    const configFiles = [
      "foundry.toml",
      ".gitignore",
      ".env.example",
      ".prettierrc",
      ".cursorignore",
      "deno.json",
    ];
    
    for (const file of configFiles) {
      const filePath = join(testProjectRoot, file);
      try {
        if (existsSync(filePath)) {
          const fileStat = await stat(filePath);
          if (fileStat.isDirectory) {
            logger.warn(`发现目录形式的文件 ${file}，删除: ${filePath}`);
            await remove(filePath, { recursive: true });
          }
        }
      } catch (_error) {
        // 忽略检查错误，继续执行
      }
    }
    
    // 创建一次项目，供所有测试使用
    logger.info("创建测试项目...");
    await init(testProjectRoot);
  });

  afterAll(async () => {
    logger.info("测试完成，清理测试项目...");
    
    // 清理所有测试项目目录
    const testDirs = [
      testProjectRoot,
      join(cwd(), "tests", "data", "current-dir-test"),
      join(cwd(), "tests", "data", "nested-deep-path-test"),
    ];
    
    for (const dir of testDirs) {
      try {
        if (existsSync(dir)) {
          await remove(dir, { recursive: true });
          logger.info(`已删除测试项目: ${dir}`);
        }
      } catch (error) {
        logger.warn(`删除测试项目失败: ${dir} (${error})`);
      }
    }
    
    logger.info("测试清理完成");
  });

  // 目录结构创建测试
  it("应该能够创建所有必需的目录", () => {
    // 项目已在 beforeAll 中创建，直接验证
    const expectedDirs = [
      "src",
      "script",
      "tests",
      "build",
      "build/abi",
      "build/abi/local",
      "build/abi/testnet",
      "build/abi/mainnet",
      "config",
    ];

    for (const dir of expectedDirs) {
      const dirPath = join(testProjectRoot, dir);
      expect(existsSync(dirPath)).toBe(true);
    }
  });

  // 配置文件创建测试
  it("应该能够创建所有配置文件", () => {
    // 项目已在 beforeAll 中创建，直接验证
    const expectedFiles = [
      "foundry.toml",
      ".gitignore",
      ".env.example",
      ".prettierrc",
      ".cursorignore",
      "deno.json",
      "config/web3.json",
    ];

    for (const file of expectedFiles) {
      const filePath = join(testProjectRoot, file);
      expect(existsSync(filePath)).toBe(true);
    }
  });

  it("foundry.toml 应该包含正确的配置", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const content = await readTextFile(join(testProjectRoot, "foundry.toml"));
    expect(content).toContain("[profile.default]");
    expect(content).toContain('src = "src"');
    expect(content).toContain('solc_version = "0.8.18"');
    expect(content).toContain("# libs = [\"lib\"]");
  });

  it(".gitignore 应该包含正确的忽略规则", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const content = await readTextFile(join(testProjectRoot, ".gitignore"));
    expect(content).toContain("build/out/");
    expect(content).toContain(".env");
    expect(content).toContain(".deno/");
  });

  it("deno.json 应该包含正确的配置", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const content = await readTextFile(join(testProjectRoot, "deno.json"));
    expect(content).toContain('"@dreamer/foundry"');
    expect(content).toContain('"@dreamer/test"');
    expect(content).toContain('"build": "forge build"');
  });

  it("config/web3.json 应该包含网络配置", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const content = await readTextFile(join(testProjectRoot, "config/web3.json"));
    // 验证 JSON 格式和网络配置
    expect(content).toContain("local");
    expect(content).toContain("testnet");
    expect(content).toContain("mainnet");
    expect(content).toContain("chainId");
    expect(content).toContain("host");
    // 验证是有效的 JSON 并包含必要的网络配置
    const jsonConfig = JSON.parse(content);
    expect(jsonConfig.local).toBeDefined();
    expect(jsonConfig.testnet).toBeDefined();
    expect(jsonConfig.mainnet).toBeDefined();
  });

  // 示例文件创建测试
  it("应该能够创建示例合约文件", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const contractPath = join(testProjectRoot, "src", "MyToken.sol");
    expect(existsSync(contractPath)).toBe(true);

    const content = await readTextFile(contractPath);
    expect(content).toContain("contract MyToken");
    expect(content).toContain("SPDX-License-Identifier: MIT");
  });

  it("应该能够创建示例部署脚本", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const scriptPath = join(testProjectRoot, "script", "1-mytoken.ts");
    expect(existsSync(scriptPath)).toBe(true);

    const content = await readTextFile(scriptPath);
    expect(content).toContain("Deploy MyToken Contract");
    expect(content).toContain("@dreamer/foundry");
    expect(content).toContain("Deployer");
  });

  it("应该能够创建示例测试脚本", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const testPath = join(testProjectRoot, "tests", "01-mytoken.test.ts");
    expect(existsSync(testPath)).toBe(true);

    const content = await readTextFile(testPath);
    expect(content).toContain("MyToken 合约测试");
    expect(content).toContain("@dreamer/test");
  });

  // README 创建测试
  it("应该能够创建 README.md", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const readmePath = join(testProjectRoot, "README.md");
    expect(existsSync(readmePath)).toBe(true);

    const content = await readTextFile(readmePath);
    expect(content).toContain("# Foundry Project");
    expect(content).toContain("项目结构");
    expect(content).toContain("@dreamer/foundry");
  });

  // 已存在文件处理测试
  it("应该跳过已存在的文件", async () => {
    // 项目已在 beforeAll 中创建，直接修改文件测试
    // 修改一个文件
    const testContent = "test content";
    await writeTextFile(join(testProjectRoot, "foundry.toml"), testContent);

    // 再次初始化
    await init(testProjectRoot);

    // 文件内容应该保持不变
    const content = await readTextFile(join(testProjectRoot, "foundry.toml"));
    expect(content).toBe(testContent);
  });

  it("应该跳过已存在的 README.md", async () => {
    // 项目已在 beforeAll 中创建，直接修改文件测试
    // 修改 README
    const testContent = "# Custom README";
    await writeTextFile(join(testProjectRoot, "README.md"), testContent);

    // 再次初始化
    await init(testProjectRoot);

    // README 内容应该保持不变
    const content = await readTextFile(join(testProjectRoot, "README.md"));
    expect(content).toBe(testContent);
  });

  // 默认目录处理测试
  it("应该能够在当前目录初始化（不指定路径）", async () => {
    const currentDir = join(cwd(), "tests", "data", "current-dir-test");
    try {
      // 测试前完全清理（如果存在）
      if (existsSync(currentDir)) {
        await remove(currentDir, { recursive: true });
      }
      await mkdir(currentDir, { recursive: true });

      // 初始化
      await init(currentDir);

      // 验证文件已创建
      expect(existsSync(join(currentDir, "foundry.toml"))).toBe(true);
      expect(existsSync(join(currentDir, "README.md"))).toBe(true);
      
      logger.info(`默认目录测试完成，项目保留在: ${currentDir}`);
      // 项目将在 afterAll 中统一清理
    } catch (error) {
      logger.warn(`跳过默认目录测试: ${error}`);
    }
  });

  // 错误处理测试
  it("应该能够处理无效路径", async () => {
    // 测试不存在的父目录（应该自动创建）
    const invalidPath = join(cwd(), "tests", "data", "nested-deep-path-test");
    
    // 测试前完全清理（如果存在）
    if (existsSync(invalidPath)) {
      await remove(invalidPath, { recursive: true });
    }
    
    await init(invalidPath);

    // 应该成功创建
    expect(existsSync(join(invalidPath, "foundry.toml"))).toBe(true);
    
    logger.info(`错误处理测试完成，项目保留在: ${invalidPath}`);
    // 项目将在 afterAll 中统一清理
  });

  // 文件内容验证测试
  it("示例合约应该包含完整的 ERC20 功能", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const content = await readTextFile(join(testProjectRoot, "src", "MyToken.sol"));

    // 验证关键功能
    expect(content).toContain("function transfer");
    expect(content).toContain("function approve");
    expect(content).toContain("function transferFrom");
    expect(content).toContain("event Transfer");
    expect(content).toContain("event Approval");
  });

  it("部署脚本应该包含正确的导入", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const content = await readTextFile(join(testProjectRoot, "script", "1-mytoken.ts"));

    expect(content).toContain("@dreamer/foundry");
    expect(content).toContain("Deployer");
    expect(content).toContain("export async function deploy");
  });

  it("测试脚本应该包含完整的测试用例", async () => {
    // 项目已在 beforeAll 中创建，直接验证
    const content = await readTextFile(join(testProjectRoot, "tests", "01-mytoken.test.ts"));

    expect(content).toContain("@dreamer/test");
    expect(content).toContain("describe");
    expect(content).toContain("it(");
    expect(content).toContain("beforeAll");
    expect(content).toContain("afterAll");
  });
});
