#!/usr/bin/env -S deno run -A
/**
 * foundry init 命令入口（兼容 dweb 的 cmd/init.ts 结构）
 *
 * 实际逻辑在 cmd/init/mod.ts，本文件保留以兼容 CLI 的 import("./cmd/init.ts")。
 */

import { init, type InitMainOptions, type InitOptions } from "./init/mod.ts";

export { init };
export type { InitMainOptions, InitOptions };
