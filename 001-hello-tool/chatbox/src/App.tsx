import React from 'react'
import { useChatMessages } from './hooks/useChatMessages'
import MessageList from './components/MessageList/MessageList'
import ChatInput from './components/ChatInput/ChatInput'
import './App.css'

/**
 * 主应用组件
 * 组合头部、消息列表、输入框，构成完整的 Chatbox 界面
 */
const App: React.FC = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useChatMessages()

  return (
    <div className="app-root">
      {/* 背景装饰光晕 */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* 聊天窗口 */}
      <div className="chatbox" role="main">
        {/* 顶部导航栏 */}
        <header className="chatbox-header">
          <div className="header-left">
            <div className="status-dot" title="在线" />
            <div className="header-info">
              <h1 className="header-title">AI 助手</h1>
              <p className="header-subtitle">
                {isLoading ? '正在输入...' : '● 在线'}
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button
              id="clear-button"
              className="action-btn"
              onClick={clearMessages}
              disabled={isLoading}
              title="清空对话"
              aria-label="清空对话记录"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              <span>清空</span>
            </button>

            <div className="model-badge">
              <span className="model-dot" />
              GPT-4o
            </div>
          </div>
        </header>

        {/* 消息区域 */}
        <MessageList messages={messages} isLoading={isLoading} />

        {/* 输入区域 */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  )
}

export default App
