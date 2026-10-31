import { Suspense, lazy } from 'react'
import App from './App.jsx'

// /admindara 는 학생 화면과 따로 열리는 선생님용 페이지. 학생 화면에는 코드가 실리지 않도록 따로 불러온다.
const Admin = lazy(() => import('./Admin.jsx'))
const isAdmin = /^\/admindara\/?$/.test(window.location.pathname)

export default function Root() {
  return isAdmin ? <Suspense fallback={null}><Admin /></Suspense> : <App />
}
