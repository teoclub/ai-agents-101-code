import { useCallback, useRef, useState } from 'react'
import type { Message } from '../types/chat'
import { createMessage, simulateStreamResponse } from '../utils/message'

/**
 * useChatMessages
 * 管理聊天消息列表和发送逻辑的核心 Hook
 * NOTE: 将消息状态与发送行为封装在此，与 UI 层完全解耦
 */
export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好！我是 AI 助手 ✨\n\n我可以帮你回答问题、进行对话。这是一个基于 React + Vite + TypeScript 构建的演示 Chatbox，支持流式输出效果。\n\n请开始提问吧！',
      status: 'done',
      timestamp: Date.now(),
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  // NOTE: 使用 ref 跟踪正在流式输出的消息 ID，避免闭包陷阱
  const streamingMsgIdRef = useRef<string | null>(null)

  /**
   * 发送用户消息并触发 AI 流式回复
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg = createMessage('user', content)
    const assistantMsg = createMessage('assistant', '')
    streamingMsgIdRef.current = assistantMsg.id

    setIsLoading(true)
    setMessages((prev) => [...prev, userMsg, assistantMsg])

    await simulateStreamResponse(
      content,
      // 每次收到新字符时追加到对应消息
      (chunk) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMsgIdRef.current
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        )
      },
      // 输出完成时更新状态
      () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMsgIdRef.current
              ? { ...msg, status: 'done' }
              : msg
          )
        )
        setIsLoading(false)
        streamingMsgIdRef.current = null
      }
    )
  }, [isLoading])

  /**
   * 清空所有消息，仅保留欢迎词
   */
  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: '对话已清空，随时可以开始新的对话！',
        status: 'done',
        timestamp: Date.now(),
      },
    ])
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  }
}
