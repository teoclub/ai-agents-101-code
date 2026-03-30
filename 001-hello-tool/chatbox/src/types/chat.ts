/**
 * 消息角色类型
 * user: 用户发送的消息
 * assistant: AI 助手回复的消息
 * system: 系统提示消息
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息状态类型
 * sending: 发送中
 * sent: 已发送
 * streaming: 流式输出中
 * done: 完成
 * error: 发生错误
 */
export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'done' | 'error'

/**
 * 单条聊天消息的数据结构
 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  timestamp: number
}

/**
 * 聊天会话配置
 */
export interface ChatConfig {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
}

/**
 * 应用整体状态
 */
export interface ChatState {
  messages: Message[]
  isLoading: boolean
  config: ChatConfig
}
