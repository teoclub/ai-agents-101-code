import React, { memo } from 'react'
import type { Message } from '../../types/chat'
import { formatTime } from '../../utils/message'
import './MessageBubble.css'

interface MessageBubbleProps {
  message: Message
}

/**
 * 消息气泡组件
 * 根据角色渲染不同样式的消息气泡，并展示流式打字光标
 */
const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message }) => {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'

  // 将换行符转换为 <br> 标签以正确渲染
  const renderContent = (content: string) => {
    return content.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      {/* 头像 */}
      <div className="avatar">
        {isUser ? (
          <span className="avatar-icon">👤</span>
        ) : (
          <span className="avatar-icon">✨</span>
        )}
      </div>

      <div className="bubble-container">
        {/* 角色标签 */}
        <span className="role-label">
          {isUser ? '你' : 'AI 助手'}
        </span>

        {/* 消息气泡 */}
        <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
          <p className="bubble-text">
            {renderContent(message.content)}
            {/* 流式输出时显示打字光标 */}
            {isStreaming && <span className="typing-cursor" />}
          </p>
        </div>

        {/* 时间戳 */}
        <span className="timestamp">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
})

MessageBubble.displayName = 'MessageBubble'

export default MessageBubble
