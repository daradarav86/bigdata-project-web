// 파이썬(Pyodide)을 브라우저 안의 웹 워커에서 실행한다. 화면이 멈추지 않고, 오래 걸리면 워커를 통째로 끌 수 있다.
// 버전은 pandas 2.2.3(파이썬 3.12)인 0.27.7로 고정한다. 최신판은 pandas 3.0이라 info() 표기가 학습지(object)와 달라진다.
const INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
const DATA_PREFIX = 'https://raw.githubusercontent.com/daradarav86/bigdata/'

// 노트북처럼 동작하게 하는 파이썬 쪽 준비 코드
const SETUP = `
import sys, io, json, ast, base64, warnings
warnings.filterwarnings('ignore')
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pyodide.http import open_url

# 수업 데이터 저장소의 주소만 불러올 수 있다 (노트북의 url = "https://raw.githubusercontent.com/..." 그대로 쓰도록)
_orig_read_csv = pd.read_csv
def _read_csv(path, *a, **k):
    if isinstance(path, str) and path.startswith('http'):
        if not path.startswith('${DATA_PREFIX}'):
            raise ValueError('이 사이트에서는 수업 데이터 저장소(daradarav86/bigdata)의 파일만 불러올 수 있어요.')
        path = open_url(path)
    return _orig_read_csv(path, *a, **k)
pd.read_csv = _read_csv

_OUT = []
class _Writer:
    def write(self, s):
        if not s:
            return 0
        if _OUT and _OUT[-1]['k'] == 'text':
            _OUT[-1]['v'] += s
        else:
            _OUT.append({'k': 'text', 'v': s})
        return len(s)
    def flush(self):
        pass

def _html(x):
    if isinstance(x, pd.Series):
        x = x.to_frame()
    if isinstance(x, pd.DataFrame):
        return x.to_html(max_rows=30, max_cols=20, border=0, classes='pytable')
    return None

def display(*xs):
    for x in xs:
        h = _html(x)
        if h:
            _OUT.append({'k': 'html', 'v': h})
        else:
            print(x)

plt.show = lambda *a, **k: None  # 그림은 셀이 끝난 뒤 한꺼번에 모은다

def _run_cell(code):
    global _OUT
    _OUT = []
    saved = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = _Writer()
    err = None
    try:
        tree = ast.parse(code, '<cell>')
        last = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last = ast.Expression(tree.body.pop().value)  # 주피터처럼 마지막 식의 값을 보여 준다
        exec(compile(tree, '<cell>', 'exec'), globals())
        if last is not None:
            v = eval(compile(last, '<cell>', 'eval'), globals())
            if v is not None:
                h = _html(v)
                if h:
                    _OUT.append({'k': 'html', 'v': h})
                else:
                    print(repr(v))
    except Exception as e:
        import traceback
        line = getattr(e, 'lineno', None) if isinstance(e, SyntaxError) else None
        for fs in traceback.extract_tb(e.__traceback__):
            if fs.filename == '<cell>':
                line = fs.lineno
        err = {'type': type(e).__name__, 'msg': str(e), 'line': line}
    finally:
        sys.stdout, sys.stderr = saved
    for n in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(n).savefig(buf, format='png', dpi=96, bbox_inches='tight')
        _OUT.append({'k': 'img', 'v': base64.b64encode(buf.getvalue()).decode()})
    plt.close('all')
    return json.dumps({'out': _OUT, 'err': err}, ensure_ascii=False)

# 발표 슬라이드에 넘길 결과 요약: 변수 result(Series)의 가장 큰·작은 그룹과 차이
def _result_summary():
    r = globals().get('result')
    if not isinstance(r, pd.Series):
        return json.dumps(None)
    try:
        s = r.dropna()
        lo_v, hi_v = float(s.min()), float(s.max())
        return json.dumps({
            'hi': str(s.idxmax()), 'hiVal': round(hi_v, 2),
            'lo': str(s.idxmin()), 'loVal': round(lo_v, 2),
            'diff': round(hi_v - lo_v, 2), 'ratio': round(hi_v / lo_v, 2) if lo_v else None,
        }, ensure_ascii=False)
    except Exception:
        return json.dumps(None)
`

let py = null

const say = (type, extra = {}) => self.postMessage({ type, ...extra })

async function init() {
  say('progress', { stage: '파이썬 본체를 불러오는 중' })
  const { loadPyodide } = await import(/* @vite-ignore */ INDEX_URL + 'pyodide.mjs')
  py = await loadPyodide({ indexURL: INDEX_URL })
  say('progress', { stage: 'pandas와 그래프 도구를 불러오는 중' })
  await py.loadPackage(['pandas', 'matplotlib'])
  say('progress', { stage: '노트북 환경을 준비하는 중 (처음 한 번만 오래 걸려요)' })
  py.runPython(SETUP)
  say('ready')
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') await init()
    else if (data.type === 'run') {
      const t = Date.now()
      const json = py.globals.get('_run_cell')(data.code)
      say('result', { id: data.id, ...JSON.parse(json), ms: Date.now() - t })
    } else if (data.type === 'summary') {
      say('summary', { id: data.id, summary: JSON.parse(py.globals.get('_result_summary')()) })
    }
  } catch (e) {
    say('fatal', { id: data.id, message: String(e && e.message ? e.message : e) })
  }
}
