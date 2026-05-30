/** 校验报告类型与等级。 */
export type Severity = "error" | "warning" | "info";

export interface ValidationIssue {
  readonly severity: Severity;
  readonly code: string;
  readonly message: string;
  /** 相关字段(title/body/cover/tags 等)。 */
  readonly field?: string;
}

export interface ValidationReport {
  readonly platformId: string;
  readonly issues: readonly ValidationIssue[];
  /** 是否存在 error(阻止真实发布)。 */
  readonly hasError: boolean;
}

export function buildReport(platformId: string, issues: readonly ValidationIssue[]): ValidationReport {
  return {
    platformId,
    issues,
    hasError: issues.some((i) => i.severity === "error"),
  };
}
