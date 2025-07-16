import { Message, Tool, ToolUseBlock, GeminiRequest, GeminiPart } from '../types'
import { Logger } from './logger'

/**
 * Convert Claude messages to OpenAI format
 */
export function convertMessages(messages: Message[]): Array<{ role: string; content: string }> {
  return messages.map(m => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content }
    } else {
      const parts: string[] = []
      for (const block of m.content) {
        if (block.type === 'text') {
          parts.push(block.text)
        } else if (block.type === 'tool_use') {
          const toolInfo = `[Tool Use: ${block.name}] ${JSON.stringify(block.input)}`
          parts.push(toolInfo)
        } else if (block.type === 'tool_result') {
          Logger.toolResult(block.tool_use_id, block.content)
          parts.push(`<tool_result>${JSON.stringify(block.content)}</tool_result>`)
        }
      }
      return { role: m.role, content: parts.join('\n') }
    }
  })
}

/**
 * Convert Claude tools to OpenAI format
 */
export function convertTools(tools: Tool[]): Array<{ type: string; function: any }> {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description || '',
      parameters: t.input_schema
    }
  }))
}

/**
 * Convert OpenAI tool calls back to Claude format
 */
export function convertToolCallsToAnthropic(toolCalls: any[]): Array<ToolUseBlock> {
  const content: ToolUseBlock[] = []
  for (const call of toolCalls) {
    const fn = call.function
    const args = JSON.parse(fn.arguments)

    Logger.toolCall(fn.name, args)

    content.push({
      type: 'tool_use',
      id: call.id,
      name: fn.name,
      input: args
    })
  }
  return content
}

/**
 * Convert Gemini request to OpenAI format
 */
export function convertGeminiToOpenAI(geminiRequest: GeminiRequest): { 
  messages: any[], 
  tools?: any[], 
  max_tokens?: number, 
  temperature?: number 
} {
  const messages: any[] = []
  
  // Convert Gemini contents to OpenAI messages
  for (const content of geminiRequest.contents) {
    const message: any = {
      role: content.role === 'model' ? 'assistant' : content.role,
      content: ''
    }
    
    const textParts: string[] = []
    const toolCalls: any[] = []
    
    for (const part of content.parts) {
      if (part.text) {
        textParts.push(part.text)
      } else if (part.functionCall) {
        toolCalls.push({
          id: `call_${Math.random().toString(36).substring(2, 15)}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args)
          }
        })
      }
    }
    
    if (textParts.length > 0) {
      message.content = textParts.join('\n')
    }
    
    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls
      if (!message.content) {
        message.content = null
      }
    }
    
    messages.push(message)
  }
  
  // Convert tools
  let tools: any[] | undefined
  if (geminiRequest.tools && geminiRequest.tools.length > 0) {
    tools = geminiRequest.tools.flatMap(tool => 
      tool.function_declarations.map(func => ({
        type: 'function',
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters
        }
      }))
    )
  }
  
  return {
    messages,
    tools,
    max_tokens: geminiRequest.generationConfig?.maxOutputTokens,
    temperature: geminiRequest.generationConfig?.temperature
  }
}

/**
 * Convert OpenAI response back to Gemini format
 */
export function convertOpenAIToGemini(openaiResponse: any, originalModel: string): any {
  const choice = openaiResponse.choices[0]
  const message = choice.message
  
  const parts: GeminiPart[] = []
  
  // Add text content
  if (message.content) {
    parts.push({ text: message.content })
  }
  
  // Add function calls
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      const fn = toolCall.function
      parts.push({
        functionCall: {
          name: fn.name,
          args: JSON.parse(fn.arguments)
        }
      })
    }
  }
  
  return {
    candidates: [{
      content: {
        parts,
        role: 'model'
      },
      finishReason: choice.finish_reason === 'tool_calls' ? 'STOP' : 
                   choice.finish_reason === 'length' ? 'MAX_TOKENS' : 'STOP',
      index: 0
    }],
    usageMetadata: {
      promptTokenCount: openaiResponse.usage?.prompt_tokens || 0,
      candidatesTokenCount: openaiResponse.usage?.completion_tokens || 0,
      totalTokenCount: openaiResponse.usage?.total_tokens || 0
    },
    modelVersion: originalModel
  }
}