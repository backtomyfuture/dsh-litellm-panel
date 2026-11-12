window.__ModuleLoader__.load({
  id: 'dsh-litellm-panel',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    var React = require('react')
    var h = React.createElement
    var PANEL_ID = 'litellm-panel'
    var ROUTE = '/litellm-panel'
    var STYLE_ID = 'dsh-litellm-panel-style'

    var CSS = [
      '.urc-root{box-sizing:border-box;width:100%;height:100%;min-height:0;flex:1 1 auto;overflow:auto;overscroll-behavior:contain;color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-base,transparent);font:13px/1.5 ui-sans-serif,system-ui,sans-serif;}',
      '.urc-root,.urc-root *{box-sizing:border-box;}',
      '.urc-page{width:min(1080px,100%);margin:0 auto;padding:22px 28px 64px;}',
      '.urc-sticky{position:sticky;top:0;z-index:3;margin:-22px -28px 18px;padding:18px 28px 12px;background:var(--dsw-alias-bg-base,canvas);border-bottom:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 12%,transparent));}',
      '.urc-kicker{margin:0;font-size:12px;letter-spacing:.04em;color:var(--dsw-alias-label-tertiary,color-mix(in srgb,currentColor 55%,transparent));}',
      '.urc-title{margin:2px 0 0;font-size:22px;line-height:1.2;font-weight:640;letter-spacing:-.03em;}',
      '.urc-sub{margin:4px 0 0;max-width:640px;color:var(--dsw-alias-label-tertiary,color-mix(in srgb,currentColor 55%,transparent));}',
      '.urc-tabs{display:flex;gap:4px;width:max-content;margin-top:14px;padding:3px;border-radius:12px;background:var(--dsw-alias-bg-layer-2,color-mix(in srgb,currentColor 6%,transparent));}',
      '.urc-tab{height:30px;border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary,inherit);font:inherit;padding:0 12px;cursor:pointer;}',
      '.urc-tab[aria-selected="true"]{background:var(--dsw-alias-bg-base,canvas);color:var(--dsw-alias-label-primary,inherit);}',
      '.urc-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}',
      '.urc-field,.urc-area{width:100%;border:1px solid var(--dsw-alias-border-l3,color-mix(in srgb,currentColor 18%,transparent));border-radius:9px;background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;font:inherit;padding:7px 10px;}',
      '.urc-field{height:34px;}',
      '.urc-area{min-height:72px;resize:vertical;font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;}',
      '.urc-field:focus,.urc-area:focus{outline:2px solid var(--dsw-focus-ring-color,color-mix(in srgb,currentColor 35%,transparent));outline-offset:1px;}',
      '.urc-button{height:34px;border:1px solid var(--dsw-alias-border-l3,color-mix(in srgb,currentColor 18%,transparent));border-radius:9px;background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;font:inherit;padding:0 12px;cursor:pointer;}',
      '.urc-button:hover{background:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,currentColor 6%,transparent));}',
      '.urc-button:disabled{opacity:.55;cursor:default;}',
      '.urc-button-primary{background:var(--dsw-alias-state-business-primary,#4d6bfe);border-color:transparent;color:white;}',
      '.urc-button-danger{color:var(--dsw-alias-state-danger-label,#b42318);}',
      '.urc-banner{margin:0 0 14px;padding:10px 12px;border-radius:12px;background:var(--dsw-alias-state-warn-tertiary,color-mix(in srgb,#d97706 16%,transparent));}',
      '.urc-banner-ok{background:var(--dsw-alias-state-success-tertiary,#e7f8ef);}',
      '.urc-banner-busy{background:color-mix(in srgb,#4d6bfe 14%,transparent);}',
      '.urc-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.8fr);gap:14px;}',
      '@media (max-width:860px){.urc-grid,.urc-split{grid-template-columns:1fr;}}',
      '.urc-card{padding:14px;border:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 12%,transparent));border-radius:14px;background:var(--dsw-alias-bg-layer-1,color-mix(in srgb,currentColor 4%,transparent));}',
      '.urc-card h2{margin:0 0 10px;font-size:15px;font-weight:640;}',
      '.urc-label{display:block;margin:10px 0 4px;color:var(--dsw-alias-label-secondary,color-mix(in srgb,currentColor 62%,transparent));font-size:12px;}',
      '.urc-row{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 10%,transparent));}',
      '.urc-row > :first-child{flex:1 1 auto;min-width:0;}',
      '.urc-tools{flex:0 0 auto;}',
      '.urc-button{white-space:nowrap;flex-shrink:0;}',
      '.urc-name{font-weight:630;letter-spacing:-.01em;}',
      '.urc-meta{color:var(--dsw-alias-label-tertiary,color-mix(in srgb,currentColor 55%,transparent));font-size:12px;font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);overflow-wrap:anywhere;}',
      '.urc-desc{margin:2px 0 0;color:var(--dsw-alias-label-secondary,color-mix(in srgb,currentColor 68%,transparent));overflow-wrap:anywhere;}',
      '.urc-switch-wrap{display:inline-flex;align-items:center;gap:6px;}',
      '.urc-switch-text{min-width:3.2em;font-size:12px;text-align:right;color:var(--dsw-alias-label-secondary,inherit);}',
      '.urc-switch{width:36px;height:22px;flex:0 0 auto;padding:0;border:1px solid color-mix(in srgb,currentColor 55%,transparent);border-radius:99px;background:color-mix(in srgb,currentColor 28%,transparent);position:relative;cursor:pointer;}',
      '.urc-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.35);transition:transform .15s ease;}',
      '.urc-switch.is-on{background:var(--dsw-alias-state-business-primary,#4d6bfe);border-color:transparent;}',
      '.urc-switch.is-on::after{transform:translateX(14px);}',
      '.urc-switch:disabled{opacity:.5;cursor:default;}',
      '.urc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;}',
      '.urc-kpi{padding:12px 14px;border:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 12%,transparent));border-radius:14px;}',
      '.urc-kpi small{display:block;color:var(--dsw-alias-label-secondary,inherit);}',
      '.urc-kpi b{display:block;margin-top:4px;font-size:24px;letter-spacing:-.04em;font-variant-numeric:tabular-nums;}',
      '.urc-pill{border-radius:99px;padding:2px 8px;font-size:12px;background:var(--dsw-alias-bg-layer-3,color-mix(in srgb,currentColor 8%,transparent));}',
      '.urc-pill-ok{background:var(--dsw-alias-state-success-tertiary,#e7f8ef);color:var(--dsw-alias-state-success-primary,#067647);}',
      '.urc-pill-warn{background:var(--dsw-alias-state-warn-tertiary,#fff4e5);color:var(--dsw-alias-state-warn-label,#b54708);}',
      '.urc-pre{margin:8px 0 0;padding:10px;overflow:auto;border-radius:10px;background:var(--dsw-alias-bg-layer-2,color-mix(in srgb,currentColor 5%,transparent));font:12px/1.45 var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);white-space:pre-wrap;}',
      '.urc-overlay{position:fixed;inset:0;z-index:5;display:flex;justify-content:flex-end;background:color-mix(in srgb,black 28%,transparent);}',
      '.urc-drawer{width:min(560px,100%);height:100%;overflow:auto;padding:22px;background:var(--dsw-alias-bg-base,canvas);}',
      '.urc-empty{margin:8px 0 0;color:var(--dsw-alias-label-secondary,inherit);}',
      '.urc-foot{margin:22px 0 0;color:var(--dsw-alias-label-tertiary,color-mix(in srgb,currentColor 55%,transparent));font-size:12px;}',
      '.urc-link{height:34px;margin-top:8px;padding:0;border:0;background:transparent;color:var(--dsw-alias-state-business-primary,#4d6bfe);font:inherit;cursor:pointer;}',
      '.urc-link:hover{text-decoration:underline;}',
      '.urc-link:disabled{opacity:.55;cursor:default;text-decoration:none;}',
      '.urc-check{display:flex;gap:8px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 10%,transparent));}',
      '.urc-bar{height:8px;border-radius:99px;background:var(--dsw-alias-bg-layer-3,color-mix(in srgb,currentColor 8%,transparent));overflow:hidden;}',
      '.urc-fill{height:100%;background:var(--dsw-alias-state-business-primary,#4d6bfe);}',
      '.urc-status{display:flex;align-items:center;gap:10px;margin:0 0 12px;}',
      '.urc-status .urc-switch-wrap{margin-left:auto;}',
      '.urc-dot{width:10px;height:10px;border-radius:50%;background:#98a2b3;box-shadow:0 0 0 4px color-mix(in srgb,#98a2b3 25%,transparent);flex:0 0 auto;}',
      '.urc-dot.is-on{background:#12b76a;box-shadow:0 0 0 4px color-mix(in srgb,#12b76a 28%,transparent);}',
      '.urc-dot.is-down{background:#f04438;box-shadow:0 0 0 4px color-mix(in srgb,#f04438 28%,transparent);}',
      '.urc-model{padding:8px 0;border-top:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 10%,transparent));}',
      '.urc-model .urc-row{border-top:0;padding:2px 0;}',
      '.urc-model .urc-check{border-top:0;padding:0;}',
      '.urc-detail{margin:4px 0 8px;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-bg-layer-2,color-mix(in srgb,currentColor 5%,transparent));}',
      '.urc-attrs{margin:8px 0 0;}',
      '.urc-attr{display:grid;grid-template-columns:minmax(140px,34%) minmax(0,1fr);gap:8px;padding:4px 0;border-top:1px solid var(--dsw-alias-border-l2,color-mix(in srgb,currentColor 10%,transparent));}',
      '.urc-attr dt,.urc-attr dd{margin:0;}',
      '.urc-attr dt{color:var(--dsw-alias-label-tertiary,color-mix(in srgb,currentColor 55%,transparent));font:12px/1.45 var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);overflow-wrap:anywhere;}',
      '.urc-attr dd{overflow-wrap:anywhere;}',
      '.urc-progress{height:4px;margin:0 0 12px;overflow:hidden;border-radius:99px;background:color-mix(in srgb,currentColor 12%,transparent);}',
      '.urc-progress>span{display:block;width:36%;height:100%;border-radius:99px;background:#4d6bfe;animation:urc-slide 1.1s ease-in-out infinite;}',
      '@keyframes urc-slide{from{transform:translateX(-130%);}to{transform:translateX(280%);}}',
    ].join('')

    function warn(ctx, err) {
      var logger = ctx && ctx.logger
      var sink = (logger && (logger.warn || logger.info)) || (typeof console !== 'undefined' ? console.warn : null)
      if (!sink) return
      try { sink.call(logger || console, '[dsh-litellm-panel] ' + (err && err.message ? err.message : String(err))) } catch { /* logging must never throw */ }
    }

    function ensureStyle() {
      if (typeof document === 'undefined') return
      var style = document.getElementById(STYLE_ID)
      if (!style) {
        style = document.createElement('style')
        style.id = STYLE_ID
        document.head.appendChild(style)
      }
      style.textContent = CSS
    }

    function openPreview(name, previewState) {
      previewState[1]({ name: name, body: '正在读取…' })
      fetch(ROUTE + '?op=preview&name=' + encodeURIComponent(name), { headers: { accept: 'application/json' } })
        .then(function (res) { return res.json() })
        .then(function (body) {
          if (!body || body.ok === false) throw new Error((body && body.error) || '预览失败')
          previewState[1](body.preview)
        })
        .catch(function (err) { previewState[1]({ name: name, body: err.message }) })
    }

    function request(op, payload) {
      var url = ROUTE
      var init = { headers: { accept: 'application/json' } }
      if (payload) {
        init.method = 'POST'
        init.headers['content-type'] = 'application/json'
        init.body = JSON.stringify(Object.assign({ op: op }, payload))
      } else {
        url += '?op=' + encodeURIComponent(op)
      }
      return fetch(url, init).then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok || !body || body.ok === false) throw new Error((body && body.error) || ('HTTP ' + res.status))
          return body
        })
      })
    }

    function PanelIcon(props) {
      var size = (props && props.size) || 16
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('rect', { x: 3.5, y: 3.5, width: 9, height: 9, rx: 1.5 }),
      h('rect', { x: 6.2, y: 6.2, width: 3.6, height: 3.6, rx: 0.6 }),
      h('path', { d: 'M6 1.5v2 M10 1.5v2 M6 12.5v2 M10 12.5v2 M1.5 6h2 M1.5 10h2 M12.5 6h2 M12.5 10h2' }))
    }

    function Toggle(props) {
      return h('span', { className: 'urc-switch-wrap' },
        props.text ? h('span', { className: 'urc-switch-text' }, props.text) : null,
        h('button', {
          type: 'button',
          className: 'urc-switch' + (props.on ? ' is-on' : ''),
          role: 'switch',
          'aria-checked': props.on ? 'true' : 'false',
          'aria-label': props.label,
          disabled: props.disabled,
          onClick: props.onClick,
        }))
    }

    function Banner(props) {
      if (!props.text) return null
      var tone = props.tone || ''
      var klass = 'urc-banner' + (tone === 'ok' ? ' urc-banner-ok' : '') + (tone === 'busy' ? ' urc-banner-busy' : '')
      return h('div', { className: klass, role: tone === 'ok' || tone === 'busy' ? 'status' : 'alert' }, props.text)
    }

    function Progress(props) {
      if (!props.on) return null
      return h('div', { className: 'urc-progress', role: 'progressbar', 'aria-valuetext': props.label || '进行中' }, h('span'))
    }

    function bannerTone(note) {
      if (!note) return ''
      if (note.indexOf('正在') === 0) return 'busy'
      if (note.indexOf('完成') >= 0 || note.indexOf('已同步') === 0 || note.indexOf('已关闭') === 0 || note.indexOf('已写入') === 0 || note.indexOf('已从对话') === 0) return 'ok'
      return ''
    }

    function money(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '—'
      if (value > 0 && value < 0.01) return '$' + value.toFixed(4)
      return '$' + value.toFixed(2)
    }

    function perMillion(value) {
      if (typeof value !== 'number' || !isFinite(value)) return ''
      return '$' + (value * 1000000).toFixed(2) + '/百万'
    }

    function formatCount(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '未设置'
      return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

    function millionTokens(value) {
      if (typeof value !== 'number' || !isFinite(value)) return '—'
      var millions = value / 1000000
      if (value > 0 && millions < 0.01) return '<0.01 百万'
      return millions.toFixed(2) + ' 百万'
    }

    function utcDay(offsetMonths) {
      var now = new Date()
      var date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      if (offsetMonths) date.setUTCMonth(date.getUTCMonth() + offsetMonths)
      return date.toISOString().slice(0, 10)
    }

    function inputText(model) {
      if (!model || !model.input || !model.input.length) return '未设置'
      return model.input.map(function (item) {
        if (item === 'text') return '文本'
        if (item === 'image') return '图片'
        return item
      }).join('、')
    }

    function reasoningText(model) {
      if (!model) return '未设置'
      if (model.reasoningEfforts === false) return '不支持'
      if (model.reasoningEfforts && typeof model.reasoningEfforts === 'object') {
        return Object.keys(model.reasoningEfforts).map(function (level) {
          var wire = model.reasoningEfforts[level]
          if (wire == null || wire === level) return level
          return level + '=' + wire
        }).join(' / ')
      }
      if (model.supportsReasoning === true) return '支持，但没有列出等级'
      return '未设置'
    }

    function skillNameIssue(name) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return 'DSH 只加载小写 kebab-case 技能名，这个不会出现在对话里'
      return ''
    }

    function occupiedNote(local) {
      if (!local) return ''
      if (local.source === 'disabled') return '这份技能在已关闭目录里，没有从这里安装，所以不能在这里覆盖。'
      var where = {
        'user-agents': '~/.agents/skills',
        'user-dsh': '~/.dsh/skills',
        'project-dsh': '项目里的 .dsh/skills',
        'project-agents': '项目里的 .agents/skills',
      }[local.source] || '本机'
      return '已在 ' + where + '，DSH 会直接加载。这里不另装一份。'
    }

    function formatAttr(value) {
      if (value === true) return '是'
      if (value === false) return '否'
      if (Array.isArray(value)) return value.join(', ')
      if (value && typeof value === 'object') {
        return Object.keys(value).map(function (key) {
          var wire = value[key]
          return wire == null || wire === key ? key : key + '=' + wire
        }).join(', ')
      }
      return String(value)
    }

    function detailRows(model) {
      if (model && Array.isArray(model.attributes)) return model.attributes
      var rows = []
      function add(key, value) {
        if (value == null || value === '') return
        rows.push({ key: key, value: value })
      }
      add('contextWindow', model.contextWindow)
      add('maxTokens', model.maxTokens)
      add('input', model.input)
      add('reasoningEfforts', model.reasoningEfforts)
      add('supportsReasoning', model.supportsReasoning)
      add('defaultReasoningEffort', model.defaultReasoningEffort)
      add('thinkingAlwaysOn', model.thinkingAlwaysOn)
      add('inputCostPerToken', model.inputCostPerToken)
      add('outputCostPerToken', model.outputCostPerToken)
      return rows
    }

    function detailNote(model) {
      if (model && Array.isArray(model.attributes)) {
        if (model.attributes.length) return '这些值来自上次同步。要改请在 LiteLLM 改完再同步。这里不提供修改。'
        return '上次同步没有带上可展示的 model_info 字段。这里不提供修改。'
      }
      return '这次目录没有带上完整属性。再同步一次就能看到 LiteLLM model_info 里的字段。这里不提供修改。'
    }

    function ResourcePage() {
      ensureStyle()
      var tabState = React.useState('litellm')
      var snapshotState = React.useState(null)
      var statusState = React.useState('loading')
      var errorState = React.useState('')
      var revisionState = React.useState(0)
      var tab = tabState[0]
      var setTab = tabState[1]
      var snapshot = snapshotState[0]
      var setSnapshot = snapshotState[1]
      var status = statusState[0]
      var setStatus = statusState[1]
      var error = errorState[0]
      var setError = errorState[1]
      var revision = revisionState[0]
      var setRevision = revisionState[1]

      React.useEffect(function () {
        var cancelled = false
        setStatus('loading')
        request('state').then(function (body) {
          if (cancelled) return
          setSnapshot(body)
          setError('')
          setStatus('ready')
        }).catch(function (err) {
          if (cancelled) return
          setError(err.message)
          setStatus('error')
        })
        return function () { cancelled = true }
      }, [revision])

      function reload() { setRevision(function (value) { return value + 1 }) }

      var tabs = [
        ['litellm', 'LiteLLM'],
        ['models', '模型'],
        ['mcp', 'MCP'],
        ['skills', 'Skill'],
        ['spend', '消耗'],
      ]

      return h('div', { className: 'urc-root' },
        h('div', { className: 'urc-page' },
          h('header', { className: 'urc-sticky' },
            h('p', { className: 'urc-kicker' }, 'LiteLLM资源中心'),
            h('h1', { className: 'urc-title' }, '统一管理网关、MCP 和技能'),
            h('p', { className: 'urc-sub' }, '先连接网关。之后用开关安装，关掉就移除。'),
            h('div', { className: 'urc-tabs', role: 'tablist' }, tabs.map(function (item) {
              return h('button', {
                key: item[0],
                type: 'button',
                className: 'urc-tab',
                role: 'tab',
                'aria-selected': tab === item[0] ? 'true' : 'false',
                onClick: function () { setTab(item[0]) },
              }, item[1])
            }))),
          h(Banner, { text: error }),
          status === 'loading' && !snapshot ? h('p', { className: 'urc-empty' }, '正在读取本机资源…') : null,
          snapshot && tab === 'litellm' ? h(LiteLLMTab, { snapshot: snapshot, reload: reload }) : null,
          snapshot && tabGate(snapshot, tab) ? h(GatewayGate, {
            mode: tabGate(snapshot, tab),
            onOpen: function () { setTab('litellm') },
          }) : null,
          snapshot && tab === 'models' && !tabGate(snapshot, tab) ? h(ModelsTab, { snapshot: snapshot, reload: reload }) : null,
          snapshot && tab === 'mcp' && !tabGate(snapshot, tab) ? h(McpTab, { snapshot: snapshot, reload: reload }) : null,
          snapshot && tab === 'skills' && !tabGate(snapshot, tab) ? h(SkillTab, { snapshot: snapshot, reload: reload }) : null,
          snapshot && tab === 'spend' && !tabGate(snapshot, tab) ? h(SpendTab, { snapshot: snapshot }) : null))
    }

    function tabGate(snapshot, tab) {
      if (!snapshot || tab === 'litellm') return ''
      if (!snapshot.litellm.keySaved) return 'nokey'
      if ((tab === 'models' || tab === 'mcp') && snapshot.litellm.enabled === false) return 'off'
      return ''
    }

    function GatewayGate(props) {
      var off = props.mode === 'off'
      return h('section', { className: 'urc-card' },
        h('h2', null, off ? '网关已关闭' : '还没连接网关'),
        h('p', { className: 'urc-desc' }, off ? '打开网关之后，这里才会列出内容。' : '先在 LiteLLM 里填地址和虚拟钥匙，点连接。'),
        h('div', { className: 'urc-tools', style: { marginTop: 12 } },
          h('button', {
            type: 'button',
            className: 'urc-button urc-button-primary',
            onClick: props.onOpen,
          }, off ? '去打开' : '去连接')))
    }

    function LiteLLMTab(props) {
      var litellm = props.snapshot.litellm
      var baseState = React.useState(litellm.baseUrl)
      var keyState = React.useState('')
      var busyState = React.useState('')
      var noteState = React.useState('')
      var linkState = React.useState(null)
      var editState = React.useState(false)
      var yamlState = React.useState('')
      var baseUrl = baseState[0]
      var apiKey = keyState[0]
      var busy = busyState[0]
      var note = noteState[0]
      var link = linkState[0]
      var yaml = yamlState[0]
      var enabled = litellm.enabled !== false
      var editing = !litellm.keySaved || editState[0]

      React.useEffect(function () {
        var cancelled = false
        request('litellm.ping').then(function (body) {
          if (!cancelled) linkState[1](body)
        }).catch(function (err) {
          if (!cancelled) linkState[1]({ status: 'down', enabled: enabled, message: err.message })
        })
        return function () { cancelled = true }
      }, [litellm.enabled, litellm.keySaved, litellm.baseUrl])

      function run(label, op, payload, done) {
        busyState[1](label)
        noteState[1]('正在' + label + '…')
        return request(op, payload).then(function (body) {
          var failed = body && body.applied && body.applied.applied === false && body.applied.reason
          if (body && body.applied && body.applied.yaml && !body.applied.applied) yamlState[1](body.applied.yaml)
          else yamlState[1]('')
          if (failed) noteState[1](body.applied.reason)
          else if (op === 'litellm.enabled' && payload && payload.enabled === true) {
            var count = body.litellm && body.litellm.catalog ? body.litellm.catalog.length : 0
            noteState[1](count ? '已同步 ' + count + ' 个模型并写入对话。' : '已经打开，但网关没有返回模型。')
          } else if (op === 'litellm.enabled') noteState[1]('已关闭，并从对话里去掉 LiteLLM。')
          else noteState[1](label + '完成')
          if (body && body.ok && typeof done === 'function') done(body)
          props.reload()
          return body
        }).catch(function (err) {
          noteState[1](err.message)
        }).then(function (body) { busyState[1](''); return body })
      }

      function connect() {
        run('连接', 'litellm.enabled', { enabled: true, baseUrl: baseUrl, apiKey: apiKey }, function () {
          editState[1](false)
          keyState[1]('')
        })
      }

      function openEdit() {
        baseState[1](litellm.baseUrl)
        keyState[1]('')
        editState[1](true)
      }

      var dot = 'urc-dot'
      if (link && link.status === 'on') dot += ' is-on'
      if (link && link.status === 'down') dot += ' is-down'
      var modelCount = litellm.enabledModelIds ? litellm.enabledModelIds.length : 0

      return h('section', { className: 'urc-card' },
        h('h2', null, litellm.keySaved ? '网关' : '连接网关'),
        litellm.keySaved ? h('div', { className: 'urc-status' },
          h('span', { className: dot, role: 'img', 'aria-label': link ? link.message : '正在检查网关' }),
          h('span', null, link ? link.message : '正在检查网关…'),
          editing ? null : h(Toggle, {
            on: enabled,
            disabled: !!busy,
            text: enabled ? '生效' : '已关闭',
            label: enabled ? '关闭 LiteLLM' : '启用 LiteLLM',
            onClick: function () {
              if (enabled) {
                run('关闭', 'litellm.enabled', { enabled: false })
                return
              }
              run('启用', 'litellm.enabled', { enabled: true, baseUrl: litellm.baseUrl })
            },
          })) : null,
        litellm.keySaved && !editing && enabled && modelCount ? h('p', { className: 'urc-meta' }, modelCount + ' 个模型已写入对话') : null,
        litellm.keySaved && !editing ? h('button', {
          type: 'button',
          className: 'urc-link',
          disabled: !!busy,
          onClick: openEdit,
        }, '更换地址或钥匙') : null,
        h(Banner, { text: note, tone: bannerTone(note) }),
        h(Progress, { on: !!busy, label: note || busy }),
        editing ? h('p', { className: 'urc-desc' }, litellm.keySaved
          ? '改完点重新连接，会重新拉取全部模型并生效。钥匙留空就继续用现在这把。'
          : '填网关地址和虚拟钥匙，点一次连接。连上之后，模型、MCP 和技能才会出现。') : null,
        editing ? h('label', { className: 'urc-label', htmlFor: 'urc-base' }, 'Base URL') : null,
        editing ? h('input', {
          id: 'urc-base',
          className: 'urc-field',
          value: baseUrl,
          onChange: function (event) { baseState[1](event.target.value) },
        }) : null,
        editing ? h('label', { className: 'urc-label', htmlFor: 'urc-key' }, litellm.keySaved ? '虚拟钥匙（留空不更换）' : '虚拟钥匙') : null,
        editing ? h('input', {
          id: 'urc-key',
          className: 'urc-field',
          type: 'password',
          value: apiKey,
          autoComplete: 'off',
          placeholder: litellm.keySaved ? '留空则继续用已保存的钥匙' : '发给你的 Virtual Key',
          onChange: function (event) { keyState[1](event.target.value) },
        }) : null,
        editing ? h('div', { className: 'urc-tools', style: { marginTop: 12 } },
          h('button', {
            type: 'button',
            className: 'urc-button urc-button-primary',
            disabled: !!busy || !String(baseUrl || '').trim() || (!litellm.keySaved && !apiKey),
            onClick: connect,
          }, litellm.keySaved ? '重新连接' : '连接'),
          litellm.keySaved ? h('button', {
            type: 'button',
            className: 'urc-button',
            disabled: !!busy,
            onClick: function () {
              editState[1](false)
              baseState[1](litellm.baseUrl)
              keyState[1]('')
            },
          }, '取消') : null) : null,
        yaml ? h('pre', { className: 'urc-pre' }, yaml) : null)
    }

    function ModelsTab(props) {
      var litellm = props.snapshot.litellm
      var pickedState = React.useState(litellm.enabledModelIds.slice())
      var busyState = React.useState('')
      var noteState = React.useState('')
      var yamlState = React.useState('')
      var openState = React.useState('')
      var picked = pickedState[0]
      var busy = busyState[0]
      var note = noteState[0]
      var yaml = yamlState[0]
      var open = openState[0]

      function toggle(id) {
        pickedState[1](function (current) {
          return current.indexOf(id) >= 0 ? current.filter(function (item) { return item !== id }) : current.concat([id])
        })
      }

      function run(label, op, payload) {
        busyState[1](label)
        noteState[1]('正在' + label + '…')
        return request(op, payload).then(function (body) {
          if (body.applied && body.applied.yaml && !body.applied.applied) yamlState[1](body.applied.yaml)
          else yamlState[1]('')
          if (body.applied && body.applied.reason && !body.applied.applied) noteState[1](body.applied.reason)
          else if (!picked.length || (body.litellm && body.litellm.enabled === false)) noteState[1]('已从对话里去掉 LiteLLM。DSH 不保留一个没有模型的供应商。')
          else noteState[1]('已写入 ' + picked.length + ' 个模型。')
          props.reload()
          return body
        }).catch(function (err) {
          noteState[1](err.message)
        }).then(function (body) { busyState[1](''); return body })
      }

      return h('section', { className: 'urc-card' },
        h('h2', null, '对话里的模型'),
        h(Banner, { text: note, tone: bannerTone(note) }),
        h(Progress, { on: !!busy, label: note || busy }),
        h('p', { className: 'urc-desc' }, '勾选后点「写入对话」。一个都不选再写入，会从对话里去掉 LiteLLM。点「详情」查看属性，这里不提供修改。'),
        litellm.syncedAt ? h('p', { className: 'urc-meta' }, '上次同步 ' + litellm.syncedAt) : null,
        litellm.catalog.length === 0
          ? h('p', { className: 'urc-empty' }, '还没有模型。先在 LiteLLM 里连接网关。')
          : litellm.catalog.map(function (model) {
            var on = picked.indexOf(model.id) >= 0
            var shown = open === model.id
            var facts = [
              '上下文 ' + formatCount(model.contextWindow),
              '最大输出 ' + formatCount(model.maxTokens),
              '输入 ' + inputText(model),
              '思考 ' + reasoningText(model),
            ]
            if (model.defaultReasoningEffort) facts.push('默认 ' + model.defaultReasoningEffort)
            if (model.thinkingAlwaysOn === true) facts.push('思考默认开启')
            if (model.thinkingFormat) facts.push('格式 ' + model.thinkingFormat)
            var price = [perMillion(model.inputCostPerToken), perMillion(model.outputCostPerToken)].filter(Boolean).join(' · ')
            var rows = detailRows(model)
            return h('div', { key: model.id, className: 'urc-model' },
              h('div', { className: 'urc-row' },
                h('label', { className: 'urc-check' },
                  h('input', { type: 'checkbox', checked: on, onChange: function () { toggle(model.id) } }),
                  h('span', { className: 'urc-name' }, model.id)),
                h('button', {
                  type: 'button',
                  className: 'urc-button',
                  'aria-expanded': shown ? 'true' : 'false',
                  onClick: function () { openState[1](shown ? '' : model.id) },
                }, shown ? '收起' : '详情')),
              h('p', { className: 'urc-desc' }, facts.join(' · ')),
              price ? h('p', { className: 'urc-meta' }, price) : null,
              shown ? h('div', { className: 'urc-detail' },
                h('p', { className: 'urc-meta' }, detailNote(model)),
                rows.length ? h('dl', { className: 'urc-attrs' }, rows.map(function (row) {
                  return h('div', { key: row.key, className: 'urc-attr' },
                    h('dt', null, row.key),
                    h('dd', null, formatAttr(row.value)))
                })) : null) : null)
          }),
        litellm.catalog.length ? h('div', { className: 'urc-tools', style: { marginTop: 12 } },
          h('button', {
            type: 'button',
            className: 'urc-button urc-button-primary',
            disabled: !!busy,
            onClick: function () {
              run('写入', 'litellm.save', { baseUrl: litellm.baseUrl, providerId: litellm.providerId || 'litellm', modelIds: picked, apply: true })
            },
          }, '写入对话')) : null,
        yaml ? h('pre', { className: 'urc-pre' }, yaml) : null)
    }

    function McpTab(props) {
      var busyState = React.useState('')
      var noteState = React.useState('')
      var openState = React.useState('')
      var gatewayState = React.useState(null)
      var busy = busyState[0]
      var note = noteState[0]
      var open = openState[0]
      var gateway = gatewayState[0]

      React.useEffect(function () {
        var cancelled = false
        request('mcp.pull', {}).then(function (body) {
          if (!cancelled) gatewayState[1](body.servers || [])
        }).catch(function (err) {
          if (!cancelled) {
            gatewayState[1]([])
            noteState[1](err.message)
          }
        })
        return function () { cancelled = true }
      }, [props.snapshot.litellm.keySaved, props.snapshot.litellm.baseUrl])

      function run(label, op, payload) {
        busyState[1](label)
        noteState[1]('正在' + label + '…')
        return request(op, payload).then(function (body) {
          noteState[1](label + '完成')
          props.reload()
          return body
        }).catch(function (err) {
          noteState[1](err.message)
        }).then(function (body) { busyState[1](''); return body })
      }

      var seen = {}
      var rows = (gateway || []).map(function (item) {
        seen[item.serverName] = true
        return item
      })
      props.snapshot.mcpServers.forEach(function (server) {
        if (seen[server.serverName]) return
        rows.push({
          serverName: server.serverName,
          description: '已安装，这次网关列表里没有',
          url: '',
          orphan: true,
        })
      })

      return h('div', null,
        h(Banner, { text: note, tone: bannerTone(note) }),
        h(Progress, { on: !!busy, label: note || busy }),
        h('section', { className: 'urc-card' },
          h('h2', null, 'LiteLLM 上的 MCP'),
          h('p', { className: 'urc-meta' }, '只列出这把虚拟钥匙被授权的服务器。右边的开关是安装和卸载，未安装时显示「未安装」。安装时上面会有进度，请等它完成。连接走网关转发。上游密钥在 LiteLLM 填写，这里不填。DSH 没有单独的 MCP 设置页。'),
          gateway === null ? h('p', { className: 'urc-empty' }, '正在读取网关…') : null,
          gateway && rows.length === 0 ? h('p', { className: 'urc-empty' }, '这把钥匙还没有被授权任何 MCP。请管理员在 Virtual Key 上勾选要分发的服务器。') : null,
          rows.map(function (item) {
            var installed = props.snapshot.mcpServers.find(function (server) { return server.serverName === item.serverName })
            var shown = open === item.serverName
            return h('div', { key: item.serverName },
              h('div', { className: 'urc-row' },
                h('div', null,
                  h('div', { className: 'urc-name' }, item.serverName),
                  h('p', { className: 'urc-desc' }, item.description || '经网关转发'),
                  item.needsCredential ? h('div', { className: 'urc-meta' }, '上游密钥在 LiteLLM 的这个 MCP 上填写，这里不填。') : null,
                  installed && installed.runtime && installed.runtime.message ? h('div', { className: 'urc-meta' }, installed.runtime.message) : null,
                  busy && busy.indexOf(item.serverName) >= 0 ? h('div', { className: 'urc-meta' }, '正在处理，请稍等') : null),
                h('div', { className: 'urc-tools' },
                  installed ? h('button', {
                    type: 'button',
                    className: 'urc-button',
                    onClick: function () { openState[1](shown ? '' : item.serverName) },
                  }, shown ? '收起' : '工具') : null,
                  h(Toggle, {
                    on: !!installed,
                    disabled: !!busy,
                    text: installed ? '已安装' : '未安装',
                    label: (installed ? '卸载 ' : '安装 ') + item.serverName,
                    onClick: function () {
                      if (installed) {
                        run('卸载 ' + item.serverName, 'mcp.delete', { serverName: item.serverName })
                        return
                      }
                      run('安装 ' + item.serverName, 'mcp.save', {
                        serverName: item.serverName,
                        enabled: true,
                      })
                    },
                  }))),
              shown && installed ? h(McpTools, { server: installed, run: run }) : null)
          })))
    }

    function McpTools(props) {
      var server = props.server
      var probeState = React.useState(null)
      var probe = probeState[0]
      React.useEffect(function () {
        var cancelled = false
        request('mcp.probe', { serverName: server.serverName }).then(function (body) {
          if (!cancelled) probeState[1]({ list: body.tools || [], notice: body.notice || '' })
        }).catch(function (err) {
          if (!cancelled) probeState[1]({ list: [], notice: err.message })
        })
        return function () { cancelled = true }
      }, [server.serverName])
      if (!probe) return h('p', { className: 'urc-empty' }, '正在向网关读取工具…')
      if (!probe.list.length) return h('p', { className: 'urc-desc' }, probe.notice || '网关没有返回工具。')
      return h('div', null, probe.list.map(function (tool) {
        return h('div', { key: tool.name, className: 'urc-row' },
          h('div', null,
            h('div', { className: 'urc-name' }, tool.name),
            tool.description ? h('p', { className: 'urc-desc' }, tool.description) : null))
      }))
    }

    function SkillTab(props) {
      var listState = React.useState(null)
      var busyState = React.useState('')
      var noteState = React.useState('')
      var previewState = React.useState(null)
      var list = listState[0]
      var busy = busyState[0]
      var note = noteState[0]
      var preview = previewState[0]

      React.useEffect(function () {
        var cancelled = false
        request('hub.pull', {}).then(function (body) {
          if (!cancelled) listState[1](body.skills || [])
        }).catch(function (err) {
          if (!cancelled) {
            listState[1]([])
            noteState[1](err.message)
          }
        })
        return function () { cancelled = true }
      }, [props.snapshot.litellm.keySaved, props.snapshot.litellm.baseUrl, props.snapshot.hub.length])

      function run(label, work) {
        busyState[1](label)
        noteState[1]('正在' + label + '…')
        return work().then(function (body) {
          noteState[1](label + '完成')
          props.reload()
          return body
        }).catch(function (err) {
          noteState[1](err.message)
        }).then(function () { busyState[1]('') })
      }

      return h('div', null,
        h(Banner, { text: note, tone: bannerTone(note) }),
        h(Progress, { on: !!busy, label: note || '进行中' }),
        h('section', { className: 'urc-card' },
          h('h2', null, 'LiteLLM 上的技能'),
          h('p', { className: 'urc-meta' }, '开关即安装或卸载，装上就会启用。已经在 ~/.agents/skills 或其他本机目录里的同名技能标成「本机已有」，这里不另装一份。'),
          list === null ? h('p', { className: 'urc-empty' }, '正在读取网关…') : null,
          list && list.length === 0 ? h('p', { className: 'urc-empty' }, '网关上还没有可安装的技能。') : null,
          list ? list.map(function (skill) {
            var record = props.snapshot.hub.find(function (item) { return item.name === skill.name })
            var local = props.snapshot.skills.find(function (item) { return item.name === skill.name })
            var blocked = local && !record
            var nameIssue = skillNameIssue(skill.name)
            var parked = !!(record && local && local.enabled === false)
            var active = !!(record && local && local.enabled !== false)
            return h('div', { key: skill.name, className: 'urc-row' },
              h('div', null,
                h('div', { className: 'urc-name' }, skill.name),
                skill.description ? h('p', { className: 'urc-desc' }, skill.description) : null,
                nameIssue ? h('div', { className: 'urc-meta' }, nameIssue) : null,
                local && local.error ? h('div', { className: 'urc-meta' }, local.error) : null,
                blocked ? h('div', { className: 'urc-meta' }, occupiedNote(local)) : null,
                busy && busy.indexOf(skill.name) >= 0 ? h('div', { className: 'urc-meta' }, '正在处理，请稍等') : null),
              h('div', { className: 'urc-tools' },
                local ? h('button', { type: 'button', className: 'urc-button', onClick: function () { openPreview(skill.name, previewState) } }, '预览') : null,
                active ? h('button', {
                  type: 'button',
                  className: 'urc-button',
                  disabled: !!busy,
                  onClick: function () { run('更新 ' + skill.name, function () { return request('hub.update', { name: skill.name }) }) },
                }, '更新') : null,
                blocked ? h('span', { className: 'urc-pill urc-pill-ok' }, '本机已有') : h(Toggle, {
                  on: active,
                  disabled: !!busy || (!active && !!nameIssue),
                  text: active ? '已安装' : '未安装',
                  label: (active ? '卸载 ' : '安装 ') + skill.name,
                  onClick: function () {
                    if (!active && nameIssue) return
                    if (active) {
                      run('卸载 ' + skill.name, function () { return request('hub.uninstall', { name: skill.name }) })
                      return
                    }
                    if (parked) {
                      run('安装 ' + skill.name, function () { return request('skill.enabled', { name: skill.name, enabled: true }) })
                      return
                    }
                    run('安装 ' + skill.name, function () { return request('hub.install', { names: [skill.name] }) })
                  },
                })))
          }) : null),
        preview ? h('div', { className: 'urc-overlay', onClick: function () { previewState[1](null) } },
          h('aside', { className: 'urc-drawer', onClick: function (event) { event.stopPropagation() } },
            h('div', { className: 'urc-tools' },
              h('strong', null, preview.name || '预览'),
              h('button', { type: 'button', className: 'urc-button', onClick: function () { previewState[1](null) } }, '关闭')),
            preview.description ? h('p', { className: 'urc-desc' }, preview.description) : null,
            h('pre', { className: 'urc-pre' }, preview.body || ''))) : null)
    }

    function SpendTab() {
      var startState = React.useState(utcDay(-1))
      var endState = React.useState(utcDay(0))
      var dataState = React.useState(null)
      var errorState = React.useState('')
      var ticketState = React.useState({ n: 0 })
      var data = dataState[0]
      var error = errorState[0]
      var loadTicket = ticketState[0]

      function load(start, end) {
        if (start && end && start > end) {
          errorState[1]('开始日期要早于结束日期')
          return
        }
        var ticket = ++loadTicket.n
        errorState[1]('')
        dataState[1](null)
        fetch(ROUTE + '?op=spend&start=' + start + '&end=' + end, { headers: { accept: 'application/json' } })
          .then(function (res) { return res.json().then(function (body) { if (!res.ok || body.ok === false) throw new Error(body.error || ('HTTP ' + res.status)); return body }) })
          .then(function (body) {
            if (ticket !== loadTicket.n) return
            dataState[1](body)
          })
          .catch(function (err) {
            if (ticket !== loadTicket.n) return
            errorState[1](err.message)
          })
      }

      React.useEffect(function () { load(startState[0], endState[0]) }, [])
      var summary = data && data.summary
      var max = summary && summary.byModel[0] ? summary.byModel[0].spend : 0

      return h('div', null,
        h(Banner, { text: error }),
        h('p', { className: 'urc-meta', style: { marginBottom: 8 } }, '默认最近一个月。改日期会重新查询。Token 按每百万显示。金额来自这把 Virtual Key 自己的 spend logs。'),
        h('div', { className: 'urc-tools', style: { marginBottom: 12 } },
          h('input', {
            className: 'urc-field',
            style: { width: 150 },
            type: 'date',
            'aria-label': '开始日期',
            value: startState[0],
            onChange: function (event) {
              startState[1](event.target.value)
              load(event.target.value, endState[0])
            },
          }),
          h('input', {
            className: 'urc-field',
            style: { width: 150 },
            type: 'date',
            'aria-label': '结束日期',
            value: endState[0],
            onChange: function (event) {
              endState[1](event.target.value)
              load(startState[0], event.target.value)
            },
          }),
          h('button', { type: 'button', className: 'urc-button', onClick: function () { load(startState[0], endState[0]) } }, '刷新')),
        summary ? h('div', { className: 'urc-kpis' },
          h(Kpi, { label: '请求', value: String(summary.requests) }),
          h(Kpi, { label: 'Token', value: millionTokens(summary.tokens) }),
          h(Kpi, { label: '花费', value: money(summary.spend) })) : null,
        summary ? h('section', { className: 'urc-card' },
          h('h2', null, '按模型'),
          summary.byModel.length === 0 ? h('p', { className: 'urc-empty' }, '这段时间没有模型调用。') : null,
          summary.byModel.map(function (row) {
            var width = max > 0 ? Math.max(4, Math.round(row.spend / max * 100)) : 0
            return h('div', { key: row.key, className: 'urc-row' },
              h('div', { style: { flex: 1 } },
                h('div', { className: 'urc-name' }, row.key),
                h('div', { className: 'urc-bar' }, h('div', { className: 'urc-fill', style: { width: width + '%' } }))),
              h('span', { className: 'urc-meta' }, money(row.spend) + ' · ' + millionTokens(row.tokens) + ' · ' + row.requests + ' 次'))
          })) : (!error ? h('p', { className: 'urc-empty' }, '正在向 LiteLLM 查询花费…') : null))
    }

    function Kpi(props) {
      return h('article', { className: 'urc-kpi' }, h('small', null, props.label), h('b', null, props.value))
    }

    function apply(ctx) {
      try {
        ensureStyle()
        var slots = ctx && ctx.slots
        if (!slots || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
          warn(ctx, new Error('slots 服务不存在，侧边栏没有注册'))
          return
        }
        slots.inject('main', function () {
          return slots.register({ name: 'main', key: PANEL_ID }, ResourcePage)
        })
        slots.inject('sidebar.panellist', function () {
          return slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 35,
            label: 'LiteLLM资源中心',
          }, PanelIcon)
        })
      } catch (err) {
        warn(ctx, err)
      }
    }

    exports.name = 'dsh-litellm-panel'
    exports.inject = ['slots']
    exports.apply = apply
    return module.exports
  },
})
