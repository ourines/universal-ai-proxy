// Provider configuration interface
export interface Provider {
  name: string
  baseURL: string
  models: string[]
  maxTokens: number
}

// Claude API interfaces
export interface ContentBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, any>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: any
}

export type MessageContent = string | Array<ContentBlock | ToolUseBlock | ToolResultBlock>

export interface Message {
  role: 'user' | 'assistant'
  content: MessageContent
}

export interface Tool {
  name: string
  description?: string
  input_schema: Record<string, any>
}

export interface MessagesRequest {
  model: string
  messages: Message[]
  max_tokens?: number
  temperature?: number
  tools?: Tool[]
  tool_choice?: string | { type: string; name?: string }
}

// Gemini API interfaces
export interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
  functionCall?: {
    name: string
    args: Record<string, any>
  }
  functionResponse?: {
    name: string
    response: Record<string, any>
  }
}

export interface GeminiContent {
  role: string
  parts: GeminiPart[]
}

export interface GeminiRequest {
  contents: GeminiContent[]
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
    topP?: number
    topK?: number
  }
  tools?: Array<{
    function_declarations: Array<{
      name: string
      description: string
      parameters: Record<string, any>
    }>
  }>
}

// Common response types
export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface TargetConfig {
  model: string
  provider: string
  baseURL: string
  maxTokens: number
}

