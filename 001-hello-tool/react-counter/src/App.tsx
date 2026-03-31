import Counter from './components/Counter'
import './App.css'

/**
 * 根应用组件
 * 渲染居中布局，展示 Counter 演示
 */
function App() {
  return (
    <main className="app-layout">
      <Counter initialValue={0} step={1} min={-100} max={100} />
    </main>
  )
}

export default App
