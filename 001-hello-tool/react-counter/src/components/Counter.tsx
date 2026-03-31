import { useState, useCallback, useRef } from 'react'
import './Counter.css'

interface CounterProps {
  /** 初始计数值，默认为 0 */
  initialValue?: number
  /** 每次步进的幅度，默认为 1 */
  step?: number
  /** 最小值限制 */
  min?: number
  /** 最大值限制 */
  max?: number
}

type AnimationDirection = 'up' | 'down' | null

/**
 * Counter 组件
 * 支持增加、减少、重置操作，带方向动画反馈
 */
function Counter({
  initialValue = 0,
  step = 1,
  min = -Infinity,
  max = Infinity,
}: CounterProps) {
  const [count, setCount] = useState(initialValue)
  const [direction, setDirection] = useState<AnimationDirection>(null)
  const [history, setHistory] = useState<number[]>([initialValue])
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 触发数字动画，通过 direction 驱动 CSS 动画类名 */
  const triggerAnimation = useCallback((dir: AnimationDirection) => {
    if (animationRef.current) clearTimeout(animationRef.current)
    setDirection(dir)
    animationRef.current = setTimeout(() => setDirection(null), 400)
  }, [])

  const increment = useCallback(() => {
    setCount((prev) => {
      const next = Math.min(prev + step, max)
      if (next !== prev) {
        setHistory((h) => [...h.slice(-9), next])
        triggerAnimation('up')
      }
      return next
    })
  }, [step, max, triggerAnimation])

  const decrement = useCallback(() => {
    setCount((prev) => {
      const next = Math.max(prev - step, min)
      if (next !== prev) {
        setHistory((h) => [...h.slice(-9), next])
        triggerAnimation('down')
      }
      return next
    })
  }, [step, min, triggerAnimation])

  const reset = useCallback(() => {
    setCount(initialValue)
    setHistory([initialValue])
    triggerAnimation(null)
  }, [initialValue, triggerAnimation])

  const isAtMin = count <= min
  const isAtMax = count >= max
  const isPositive = count > 0
  const isNegative = count < 0

  return (
    <div className="counter-card">
      {/* 标题区域 */}
      <div className="counter-header">
        <div className="counter-icon">🔢</div>
        <h1 className="counter-title">Counter</h1>
        <p className="counter-subtitle">Step: {step}</p>
      </div>

      {/* 数值显示区域 */}
      <div className="counter-display-wrapper">
        <div
          className={[
            'counter-display',
            direction === 'up' && 'animate-up',
            direction === 'down' && 'animate-down',
            isPositive && 'positive',
            isNegative && 'negative',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-live="polite"
          aria-label={`当前计数：${count}`}
        >
          {count}
        </div>
        {/* 进度环装饰 */}
        <div className="counter-glow" />
      </div>

      {/* 操作按钮区域 */}
      <div className="counter-controls">
        <button
          id="btn-decrement"
          className="btn btn-decrement"
          onClick={decrement}
          disabled={isAtMin}
          aria-label={`减少 ${step}`}
        >
          <span className="btn-icon">−</span>
        </button>

        <button
          id="btn-reset"
          className="btn btn-reset"
          onClick={reset}
          aria-label="重置计数"
        >
          <span className="btn-icon">↺</span>
        </button>

        <button
          id="btn-increment"
          className="btn btn-increment"
          onClick={increment}
          disabled={isAtMax}
          aria-label={`增加 ${step}`}
        >
          <span className="btn-icon">+</span>
        </button>
      </div>

      {/* 历史记录区域 */}
      <div className="counter-history">
        <p className="history-label">操作历史</p>
        <div className="history-dots">
          {history.map((val, idx) => (
            <span
              key={idx}
              className={`history-dot ${idx === history.length - 1 ? 'current' : ''}`}
              title={String(val)}
            >
              {val}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Counter
