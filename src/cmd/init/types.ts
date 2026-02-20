/**
 * init 脚手架用到的类型定义
 */

/** 生成目标：目标目录（绝对路径）及可选的输出路径前缀 */
export interface InitOptions {
  /** 项目根目录（绝对路径） */
  targetDir: string;
  /** 输出中路径的前缀（指定项目名时如 app-test，用于显示 app-test/src 等） */
  displayPrefix?: string;
}

/** init 主入口的选项（来自 CLI 等） */
export interface InitMainOptions {
  /** 可选项目根目录或子目录名，不传则在当前目录初始化 */
  projectRoot?: string;
}
