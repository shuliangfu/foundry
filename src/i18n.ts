/**
 * @module @dreamer/foundry/i18n
 *
 * Foundry CLI 文案国际化：不挂全局，各模块通过 import $tr 使用。
 * 根据环境变量 LANGUAGE / LC_ALL / LANG 自动检测语言，支持 zh-CN、en-US。
 */

import { createI18n, type I18n, type TranslationData, type TranslationParams } from "@dreamer/i18n";
import { getEnv } from "@dreamer/runtime-adapter";
import zhCN from "./locales/zh-CN.json" with { type: "json" };
import enUS from "./locales/en-US.json" with { type: "json" };

/** 支持的 locale */
export type FoundryLocale = "zh-CN" | "en-US";

/** 默认语言 */
export const DEFAULT_LOCALE: FoundryLocale = "en-US";

const LOCALES: FoundryLocale[] = ["zh-CN", "en-US"];

const LOCALE_DATA: Record<string, TranslationData> = {
  "zh-CN": zhCN as TranslationData,
  "en-US": enUS as TranslationData,
};

let foundryI18n: I18n | null = null;

/**
 * 从环境变量检测语言（LANGUAGE > LC_ALL > LANG），
 * 无法检测或不在支持列表时返回 DEFAULT_LOCALE。
 */
export function detectLocale(): FoundryLocale {
  const langEnv = getEnv("LANGUAGE") || getEnv("LC_ALL") || getEnv("LANG");
  if (!langEnv) return DEFAULT_LOCALE;
  const first = langEnv.split(/[:\s]/)[0]?.trim();
  if (!first) return DEFAULT_LOCALE;
  const match = first.match(/^([a-z]{2})[-_]([A-Z]{2})/i);
  if (match) {
    const normalized = `${match[1].toLowerCase()}-${match[2].toUpperCase()}` as FoundryLocale;
    if (LOCALES.includes(normalized)) return normalized;
  }
  const primary = first.substring(0, 2).toLowerCase();
  for (const locale of LOCALES) {
    if (locale.startsWith(primary + "-")) return locale;
  }
  return DEFAULT_LOCALE;
}

function initFoundryI18n(): void {
  if (foundryI18n) return;
  foundryI18n = createI18n({
    defaultLocale: DEFAULT_LOCALE,
    fallbackBehavior: "default",
    locales: [...LOCALES],
    translations: LOCALE_DATA as Record<string, TranslationData>,
  });
  foundryI18n.setLocale(detectLocale());
}

/**
 * 设置当前语言（常用于测试或显式指定）。
 */
export function setFoundryLocale(locale: FoundryLocale): void {
  initFoundryI18n();
  if (foundryI18n) foundryI18n.setLocale(locale);
}

/**
 * 翻译函数：key 为点分路径如 foundry.setup.installTitle，
 * params 为占位符替换如 { path: "xxx" }。
 */
export function $tr(
  key: string,
  params?: Record<string, string | number | boolean>,
  lang?: FoundryLocale,
): string {
  initFoundryI18n();
  if (!foundryI18n) return key;
  if (lang !== undefined) {
    const prev = foundryI18n.getLocale();
    foundryI18n.setLocale(lang);
    try {
      return foundryI18n.t(key, params as TranslationParams);
    } finally {
      foundryI18n.setLocale(prev);
    }
  }
  return foundryI18n.t(key, params as TranslationParams);
}
