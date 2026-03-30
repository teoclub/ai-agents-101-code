import React, { useCallback, useRef, useState } from 'react'
import './ChatInput.css'

interface ChatInputProps {
  onSend: (content: string) => void
  isLoading: boolean
}

/**
 * 聊天输入框组件
 * 支持回车发送、Shift+Enter 换行、自动高度调整
 */
const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /**
   * 动态调整 textarea 高度以适应内容
   */
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    adjustHeight()
  }

  /**
   * 回车发送，Shift+Enter 换行
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    setValue('')
    // 发送后重置高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, onSend])

  const canSend = value.trim().length > 0 && !isLoading

  return (
    <div className="chat-input-wrapper">
      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          id="chat-input"
          className="chat-textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
          rows={1}
          disabled={isLoading}
          aria-label="消息输入框"
        />

        <button
          id="send-button"
          className={`send-button ${canSend ? 'active' : ''}`}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="发送消息"
          title="发送 (Enter)"
        >
          {isLoading ? (
            <span className="send-spinner" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          )}
        </button>
      </div>

      <p className="input-hint">
        <kbd>Enter</kbd> 发送 · <kbd>Shift</kbd>+<kbd>Enter</kbd> 换行
      </p>
    </div>
  )
}

export default ChatInput
