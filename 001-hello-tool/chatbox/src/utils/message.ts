import { v4 as uuidv4 } from 'uuid'
import type { Message, MessageRole } from '../types/chat'

/**
 * 生成唯一消息 ID
 */
export const generateId = (): string => uuidv4()

/**
 * 创建一条新消息对象
 */
export const createMessage = (
  role: MessageRole,
  content: string
): Message => ({
  id: generateId(),
  role,
  content,
  status: role === 'user' ? 'sent' : 'streaming',
  timestamp: Date.now(),
})

/**
 * 格式化时间戳为可读时间字符串（HH:MM）
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * 模拟 AI 流式回复
 * NOTE: 实际项目中应替换为真实的 API 调用（如 OpenAI Stream API）
 */
export const simulateStreamResponse = async (
  prompt: string,
  onChunk: (chunk: string) => void,
  onDone: () => void
): Promise<void> => {
  // 根据用户输入生成模拟回复内容
  const responses = [
    `你好！我收到了你的消息："${prompt}"。\n\n这是一个模拟的 AI 回复，展示流式输出效果。在实际应用中，这里会接入真实的 AI 模型 API（如 OpenAI、Claude 等）来生成有意义的回复内容。\n\n你可以继续向我发送消息，我会持续为你提供回复！`,
    `感谢你的提问！"${prompt}" 是一个很好的问题。\n\n作为一个演示用的 AI 助手，我目前以流式方式输出回复，模拟真实 AI 的打字效果。每个字符逐渐显示，给用户带来更好的阅读体验。\n\n如有更多问题，欢迎继续交流！`,
    `我理解你想了解 "${prompt}" 相关的内容。\n\n这个 Chatbox 使用 React + Vite + TypeScript 构建，具备：\n• 流式消息输出\n• 深色主题设计\n• 玻璃拟态 UI\n• 平滑动画效果\n\n希望这个演示对你有所帮助！`,
  ]

  const response = responses[Math.floor(Math.random() * responses.length)]
  const chars = response.split('')

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300))

  for (const char of chars) {
    onChunk(char)
    // 模拟打字间隔（中文字符稍慢，标点更快）
    const delay = /[\u4e00-\u9fa5]/.test(char)
      ? 30 + Math.random() * 20
      : /[，。！？\n]/.test(char)
        ? 80 + Math.random() * 40
        : 15 + Math.random() * 10
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  onDone()
}
