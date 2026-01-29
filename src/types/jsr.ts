/**
 * @title JSR Types
 * @description JSR API 相关的类型定义
 */

/**
 * JSR 版本信息
 */
export interface JsrVersionInfo {
  createdAt: string;
}

/**
 * JSR meta.json 响应类型
 */
export interface JsrMetaData {
  scope: string;
  name: string;
  latest: string;
  versions: Record<string, JsrVersionInfo>;
}

/**
 * JSR deno.json 类型（部分字段）
 */
export interface JsrDenoJson {
  version?: string;
  imports?: Record<string, string>;
  exports?: Record<string, string>;
  [key: string]: unknown;
}
