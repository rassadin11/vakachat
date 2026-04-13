import React, { useEffect, useRef, useState } from 'react';

interface CodeRunnerProps {
  code: string;
}

const NOISE_PATTERNS = [
  'Matplotlib is building the font cache',
  'FigureCanvasAgg is non-interactive',
  'UserWarning:',
  'warnings.warn(',
];

function isNoiseLine(line: string): boolean {
  return NOISE_PATTERNS.some(p => line.includes(p));
}

const THEME_COLORS = {
  dark: {
    bg:       '#1a1a1a',
    axesBg:   '#242424',
    text:     '#e0e0e0',
    grid:     '#333333',
    edge:     '#444444',
    bodyText: '#e0e0e0',
  },
  light: {
    bg:       '#f7f7f7',
    axesBg:   '#ffffff',
    text:     '#111111',
    grid:     '#dddddd',
    edge:     '#cccccc',
    bodyText: '#111111',
  },
};

function buildSrcdoc(code: string, isDark: boolean): string {
  const escapedCode = JSON.stringify(code);
  const c = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  const rcParams = JSON.stringify({
    'figure.facecolor':  c.bg,
    'axes.facecolor':    c.axesBg,
    'savefig.facecolor': c.bg,
    'text.color':        c.text,
    'axes.labelcolor':   c.text,
    'xtick.color':       c.text,
    'ytick.color':       c.text,
    'axes.edgecolor':    c.edge,
    'grid.color':        c.grid,
    'legend.facecolor':  c.axesBg,
    'legend.edgecolor':  c.edge,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 8px; background: ${c.bg}; color: ${c.bodyText}; font-family: sans-serif; font-size: 13px; }
    img { max-width: 100%; display: block; margin: 8px 0; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
    #loading { color: #888; padding: 12px 0; }
    #loading span { display: inline-block; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  </style>
  <script src="https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js"><\/script>
</head>
<body>
  <div id="loading"><span>Загрузка Python...</span></div>
  <div id="output"></div>
  <div id="plots"></div>
  <script>
    const NOISE = ${JSON.stringify(NOISE_PATTERNS)};
    function isNoise(line) { return NOISE.some(p => line.includes(p)); }

    (async () => {
      const loadingEl = document.getElementById('loading');
      const outputEl  = document.getElementById('output');
      const plotsEl   = document.getElementById('plots');

      try {
        const pyodide = await loadPyodide();

        let stdoutBuf = '';
        pyodide.setStdout({ batched: (msg) => {
          if (!isNoise(msg)) stdoutBuf += msg + '\\n';
        }});
        pyodide.setStderr({ batched: (msg) => {
          if (!isNoise(msg)) stdoutBuf += msg + '\\n';
        }});

        const userCode = ${escapedCode};
        await pyodide.loadPackagesFromImports(userCode);

        loadingEl.style.display = 'none';

        const rcParams = ${rcParams};
        const rcJson = JSON.stringify(rcParams);

        await pyodide.runPythonAsync(\`
import sys, io, base64, json, warnings
warnings.filterwarnings('ignore')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

_rc = json.loads('\` + rcJson + \`')
plt.rcParams.update(_rc)

\` + userCode + \`

_bg = _rc.get('figure.facecolor', '#1a1a1a')
_captured_figs = []
for _fig_num in plt.get_fignums():
    _fig = plt.figure(_fig_num)
    _buf = io.BytesIO()
    _fig.savefig(_buf, format='png', bbox_inches='tight', facecolor=_bg, edgecolor='none', dpi=150)
    _buf.seek(0)
    _captured_figs.append(base64.b64encode(_buf.read()).decode())
plt.close('all')
\`);

        const text = stdoutBuf.trim();
        if (text) {
          const pre = document.createElement('pre');
          pre.textContent = text;
          outputEl.appendChild(pre);
        }

        const figs = pyodide.globals.get('_captured_figs').toJs();
        figs.forEach((b64) => {
          const img = document.createElement('img');
          img.src = 'data:image/png;base64,' + b64;
          plotsEl.appendChild(img);
        });

        if (!text && figs.length === 0) {
          outputEl.innerHTML = '<span style="color:#888">(нет вывода)</span>';
        }

      } catch (err) {
        loadingEl.style.display = 'none';
        parent.postMessage({ type: 'error', message: String(err) }, '*');
      }
    })();
  <\/script>
</body>
</html>`;
}

export function CodeRunner({ code }: CodeRunnerProps) {
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  useEffect(() => {
    setError(null);
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'error') {
        setError(e.data.message);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [code]);

  return (
    <div className="md-code-runner">
      {error && <div className="md-code-runner__error">{error}</div>}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        srcdoc={buildSrcdoc(code, isDark)}
        className="md-code-runner__frame"
        title="Code output"
      />
    </div>
  );
}
