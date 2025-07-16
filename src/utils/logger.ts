/**
 * Simple logger utility
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO

  static setLogLevel(level: LogLevel) {
    this.logLevel = level
  }

  static debug(message: string, ...args: any[]) {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  static info(message: string, ...args: any[]) {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  static warn(message: string, ...args: any[]) {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  static error(message: string, ...args: any[]) {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }

  static request(method: string, path: string, uuid?: string) {
    this.info(`${method} ${path}${uuid ? ` [UUID: ${uuid}]` : ''}`)
  }

  static apiCall(provider: string, originalModel: string, targetModel: string) {
    this.info(`🚀 API Call: ${provider} | ${originalModel} → ${targetModel}`)
  }

  static toolCall(name: string, args: any) {
    this.info(`🛠 Tool Call: ${name}`, args)
  }

  static toolResult(id: string, result: any) {
    this.info(`📥 Tool Result [${id}]:`, result)
  }

  static tokenCapping(requested: number, capped: number) {
    this.warn(`⚠️ Token capping: ${requested} → ${capped}`)
  }
}