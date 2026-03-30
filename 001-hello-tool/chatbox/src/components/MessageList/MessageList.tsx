import React, { useEffect, useRef } from 'react'
import type { Message } from '../../types/chat'
import MessageBubble from '../MessageBubble/MessageBubble'
import './MessageList.css'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

/**
 * 消息列表组件
 * 渲染所有消息并在新消息到来时自动滚动到底部
 */
const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  // NOTE: 每次消息更新时自动滚动到最新消息
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="message-list" id="message-list">
      <div className="message-list-inner">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* AI 正在思考时的加载指示器 */}
        {isLoading && messages[messages.length - 1]?.status !== 'streaming' && (
          <div className="thinking-indicator">
            <div className="thinking-dots">
              <span />
              <span />
              <span />
            </div>
            <span className="thinking-text">AI 正在思考...</span>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={bottomRef} className="scroll-anchor" />
      </div>
    </div>
  )
}

export default MessageList
