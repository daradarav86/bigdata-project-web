import { Component } from 'react'

// 화면 안에서 오류가 나도 전체가 하얗게 되지 않게 막고, 안내를 보여 준다.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error) { console.error('화면 오류', error) }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="panel" role="alert" style={{ margin: '24px 0' }}>
        <h3>화면에 문제가 생겼어요</h3>
        <p>쓴 내용은 이 기기에 저장돼 있어요. 아래 버튼으로 다시 열어 보고, 계속되면 선생님께 알려 주세요.</p>
        <p className="muted small"><code>{String(this.state.error && this.state.error.message)}</code></p>
        <button type="button" className="primary" onClick={() => this.setState({ error: null })}>다시 열기</button>
      </div>
    )
  }
}
