/**
 * @title Error Types
 * @description 统一的错误类型系统
 */

/**
 * Foundry 基础错误类
 */
export class FoundryError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FoundryError";
    this.code = code;
    this.context = context;
    
    // 保持正确的原型链
    Object.setPrototypeOf(this, FoundryError.prototype);
  }
}

/**
 * 部署错误
 */
export class DeploymentError extends FoundryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DEPLOYMENT_ERROR", context);
    this.name = "DeploymentError";
    Object.setPrototypeOf(this, DeploymentError.prototype);
  }
}

/**
 * 验证错误
 */
export class VerificationError extends FoundryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VERIFICATION_ERROR", context);
    this.name = "VerificationError";
    Object.setPrototypeOf(this, VerificationError.prototype);
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends FoundryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFIGURATION_ERROR", context);
    this.name = "ConfigurationError";
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * 网络错误
 */
export class NetworkError extends FoundryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", context);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
