/**
 * 平台运行时配置 —— 把"会变"的规则(违禁词表、字数上限、主题)从代码常量外置为可注入配置。
 *
 * 设计:不可变结构 + 缺省回退内置常量。任何环节(变换/校验/序列化)接受可选 PlatformConfig,
 * 不传则用各平台内置默认(保持向后兼容,既有调用与测试不破)。
 */
import type { PlatformLimits } from "../ir/types.js";
import { DEFAULT_BANNED_WORDS } from "../transforms/banned-word-filter.js";

/** 单平台可覆盖的运行时配置项。 */
export interface PlatformConfig {
  /** 违禁/极限词表(覆盖内置)。 */
  readonly bannedWords?: readonly string[];
  /** 字数/数量上限覆盖(部分字段覆盖,未给字段保留平台默认)。 */
  readonly limits?: Partial<PlatformLimits>;
  /** 排版主题 id(公众号等)。 */
  readonly themeId?: string;
}

/** 解析后的有效配置:所有字段都有确定值。 */
export interface ResolvedPlatformConfig {
  readonly bannedWords: readonly string[];
  readonly limits: PlatformLimits;
  readonly themeId?: string;
}

/**
 * 合并平台默认与用户覆盖,产出有效配置。
 *
 * @param defaultLimits 平台 capabilities.limits(基线)
 * @param override 用户覆盖(可选)
 */
export function resolveConfig(
  defaultLimits: PlatformLimits,
  override?: PlatformConfig,
): ResolvedPlatformConfig {
  return {
    bannedWords: override?.bannedWords ?? DEFAULT_BANNED_WORDS,
    limits: { ...defaultLimits, ...(override?.limits ?? {}) },
    themeId: override?.themeId,
  };
}

/** 多平台配置映射:platformId -> 该平台覆盖项。 */
export type PlatformConfigMap = Readonly<Record<string, PlatformConfig>>;
