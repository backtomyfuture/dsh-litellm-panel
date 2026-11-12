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
      try { sink.call(logger || console, '[dsh-litellm-panel] ' + (err && err.message ? err.message : String(err))) } catch (ignored) {}
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
            h('p', { className: 'urc-sub' }, '模型、MCP 和技能都从 LiteLLM 读取。打开对应选项卡就能看到这把虚拟钥匙被授权的内容，用开关决定是否装进 DSH。'),
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
          snapshot && tab === 'models' ? h(ModelsTab, { snapshot: snapshot, reload: reload }) : null,
          snapshot && tab === 'mcp' ? h(McpTab, { snapshot: snapshot, reload: reload }) : null,
          snapshot && tab === 'skills' ? h(SkillTab, { snapshot: snapshot, reload: reload }) : null,
          snapshot && tab === 'spend' ? h(SpendTab, { snapshot: snapshot, reload: reload }) : null,
          h('p', { className: 'urc-foot' }, '金额和 Token 来自 LiteLLM 里这把 Virtual Key 自己的 spend logs，按模型汇总。')))
    }

    function LiteLLMTab(props) {
      var litellm = props.snapshot.litellm
      var baseState = React.useState(litellm.baseUrl)
      var keyState = React.useState('')
      var busyState = React.useState('')
      var noteState = React.useState('')
      var linkState = React.useState(null)
      var baseUrl = baseState[0]
      var apiKey = keyState[0]
      var busy = busyState[0]
      var note = noteState[0]
      var link = linkState[0]
      var enabled = litellm.enabled !== false

      React.useEffect(function () {
        var cancelled = false
        request('litellm.ping').then(function (body) {
          if (!cancelled) linkState[1](body)
        }).catch(function (err) {
          if (!cancelled) linkState[1]({ status: 'down', enabled: enabled, message: err.message })
        })
        return function () { cancelled = true }
      }, [litellm.enabled, litellm.keySaved, litellm.baseUrl])

      function run(label, op, payload) {
        busyState[1](label)
        noteState[1]('正在' + label + '…')
        return request(op, payload).then(function (body) {
          var failed = body && body.applied && body.applied.applied === false && body.applied.reason
          if (failed) noteState[1](body.applied.reason)
          else if (op === 'litellm.enabled' && payload && payload.enabled === true) {
            var count = body.litellm && body.litellm.catalog ? body.litellm.catalog.length : 0
            noteState[1](count ? '已同步 ' + count + ' 个模型并写入对话。' : '已经打开，但网关没有返回模型。')
          } else if (op === 'litellm.enabled') noteState[1]('已关闭，并从对话里去掉 LiteLLM。')
          else noteState[1](label + '完成')
          if ((op === 'litellm.sync' || op === 'litellm.key' || op === 'litellm.enabled') && body.ok) keyState[1]('')
          props.reload()
          return body
        }).catch(function (err) {
          noteState[1](err.message)
        }).then(function (body) { busyState[1](''); return body })
      }

      var dot = 'urc-dot'
      if (link && link.status === 'on') dot += ' is-on'
      if (link && link.status === 'down') dot += ' is-down'

      return h('section', { className: 'urc-card' },
        h('h2', null, '是否生效'),
        h('div', { className: 'urc-status' },
          h('span', { className: dot, role: 'img', 'aria-label': link ? link.message : '正在检查网关' }),
          h('span', null, link ? link.message : '正在检查网关…'),
          h(Toggle, {
            on: enabled,
            disabled: !!busy,
            text: enabled ? '生效' : '已关闭',
            label: enabled ? '关闭 LiteLLM' : '启用 LiteLLM',
            onClick: function () {
              run(enabled ? '关闭' : '启用', 'litellm.enabled', { enabled: !enabled, baseUrl: baseUrl, apiKey: apiKey })
            },
          })),
        h('p', { className: 'urc-desc' }, '打开「生效」会拉取这把钥匙能用的全部模型，并写入对话。关掉会从对话里去掉 LiteLLM 这个供应商，已安装的 MCP 也会停掉。DSH 不接受一个没有模型的自定义供应商，所以关闭是删掉这一条，不是写成空列表。'),
        h(Banner, { text: note, tone: bannerTone(note) }),
        h(Progress, { on: !!busy, label: note || busy }),
        h('label', { className: 'urc-label', htmlFor: 'urc-base' }, 'Base URL'),
        h('input', { id: 'urc-base', className: 'urc-field', value: baseUrl, onChange: function (event) { baseState[1](event.target.value) } }),
        h('label', { className: 'urc-label', htmlFor: 'urc-key' }, litellm.keySaved ? '虚拟钥匙已保存，留空则不更换' : '虚拟钥匙'),
        h('input', { id: 'urc-key', className: 'urc-field', type: 'password', value: apiKey, autoComplete: 'off', placeholder: litellm.keySaved ? '留空则继续用已保存的钥匙' : '发给你的 Virtual Key', onChange: function (event) { keyState[1](event.target.value) } }),
        h('p', { className: 'urc-meta' }, '每个人填自己的 Virtual Key。Master Key 和 Salt Key 留在网关管理员那里，不要发给使用者。模型的上下文和思考等级在「模型」选项卡。'),
        h('div', { className: 'urc-tools', style: { marginTop: 12 } },
          h('button', { type: 'button', className: 'urc-button', disabled: !!busy || !apiKey, onClick: function () { run('保存钥匙', 'litellm.key', { apiKey: apiKey }) } }, '保存钥匙')))
    }

    function ModelsTab(props) {
      var litellm = props.snapshot.litellm
      var providerState = React.useState(litellm.providerId)
      var pickedState = React.useState(litellm.enabledModelIds.slice())
      var busyState = React.useState('')
      var noteState = React.useState('')
      var yamlState = React.useState('')
      var openState = React.useState('')
      var providerId = providerState[0]
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
        h('h2', null, '启用的模型'),
        h(Banner, { text: note, tone: bannerTone(note) }),
        h(Progress, { on: !!busy, label: note || busy }),
        h('p', { className: 'urc-desc' }, '勾选只是这一页上的选择，要点「保存并写入 DSH」才会改对话里的模型。一个都不选再保存，会从对话里去掉 LiteLLM 供应商。只写入 LiteLLM model_info 里已经设置的值。点「详情」查看上次同步到的属性，这里不能改。'),
        h('p', { className: 'urc-meta' }, litellm.syncedAt ? '上次同步 ' + litellm.syncedAt : '还没有同步。先在 LiteLLM 选项卡同步，最大输出才会带上。'),
        h('label', { className: 'urc-label', htmlFor: 'urc-provider' }, '写入 DSH 的供应商 ID'),
        h('input', { id: 'urc-provider', className: 'urc-field', value: providerId, onChange: function (event) { providerState[1](event.target.value) } }),
        litellm.catalog.length === 0
          ? h('p', { className: 'urc-empty' }, '同步之后在这里勾选。')
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
        h('div', { className: 'urc-tools', style: { marginTop: 12 } },
          h('button', {
            type: 'button',
            className: 'urc-button urc-button-primary',
            disabled: !!busy,
            onClick: function () {
              run('写入', 'litellm.save', { baseUrl: litellm.baseUrl, providerId: providerId, modelIds: picked, apply: true })
            },
          }, '保存并写入 DSH')),
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
          h('p', { className: 'urc-meta' }, '只列出网关公开的技能，以及管理员单独授权给这把虚拟钥匙的技能。先安装到 ~/.dsh/skills，DSH 才会热加载；没安装之前对话里调不到。安装时上面会有进度。已经在 ~/.agents/skills 或其他本机目录里的同名技能标成「本机已有」，DSH 会直接加载，这里不另装一份。'),
          list === null ? h('p', { className: 'urc-empty' }, '正在读取网关…') : null,
          list && list.length === 0 ? h('p', { className: 'urc-empty' }, '网关上还没有可安装的技能。') : null,
          list ? list.map(function (skill) {
            var record = props.snapshot.hub.find(function (item) { return item.name === skill.name })
            var local = props.snapshot.skills.find(function (item) { return item.name === skill.name })
            var blocked = local && !record
            var nameIssue = skillNameIssue(skill.name)
            var manageable = local && local.writable && !blocked
            var started = manageable && local.enabled !== false
            return h('div', { key: skill.name, className: 'urc-row' },
              h('div', null,
                h('div', { className: 'urc-name' }, skill.name),
                skill.description ? h('p', { className: 'urc-desc' }, skill.description) : null,
                !record && !local ? h('div', { className: 'urc-meta' }, '未安装，对话里还调不到。还没有本地文件，所以不能预览。') : null,
                manageable && local.enabled === false ? h('div', { className: 'urc-meta' }, '已关闭，DSH 扫描不到。再打开启动开关就会回到 ~/.dsh/skills。') : null,
                nameIssue ? h('div', { className: 'urc-meta' }, nameIssue) : null,
                local && local.error ? h('div', { className: 'urc-meta' }, local.error) : null,
                blocked ? h('div', { className: 'urc-meta' }, occupiedNote(local)) : null,
                busy && busy.indexOf(skill.name) >= 0 ? h('div', { className: 'urc-meta' }, '正在处理，请稍等') : null),
              h('div', { className: 'urc-tools' },
                local ? h('button', { type: 'button', className: 'urc-button', onClick: function () { openPreview(skill.name, previewState) } }, '预览') : null,
                record ? h('button', {
                  type: 'button',
                  className: 'urc-button',
                  disabled: !!busy,
                  onClick: function () { run('更新 ' + skill.name, function () { return request('hub.update', { name: skill.name }) }) },
                }, '更新') : null,
                manageable ? h(Toggle, {
                  on: started,
                  disabled: !!busy,
                  text: started ? '已启动' : '已关闭',
                  label: (started ? '关闭 ' : '启动 ') + skill.name,
                  onClick: function () {
                    run((started ? '关闭 ' : '启动 ') + skill.name, function () {
                      return request('skill.enabled', { name: skill.name, enabled: !started })
                    })
                  },
                }) : null,
                blocked ? h('span', { className: 'urc-pill urc-pill-ok' }, '本机已有') : h(Toggle, {
                  on: !!record,
                  disabled: !!busy || !!nameIssue,
                  text: record ? '已安装' : '未安装',
                  label: (record ? '卸载 ' : '安装 ') + skill.name,
                  onClick: function () {
                    if (nameIssue) return
                    if (record) run('卸载 ' + skill.name, function () { return request('hub.uninstall', { name: skill.name }) })
                    else run('安装 ' + skill.name, function () { return request('hub.install', { names: [skill.name] }) })
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

    function SpendTab(props) {
      var today = new Date().toISOString().slice(0, 10)
      var startState = React.useState(today)
      var endState = React.useState(today)
      var dataState = React.useState(null)
      var errorState = React.useState('')
      var data = dataState[0]
      var error = errorState[0]

      function load(start, end) {
        errorState[1]('')
        fetch(ROUTE + '?op=spend&start=' + start + '&end=' + end, { headers: { accept: 'application/json' } })
          .then(function (res) { return res.json().then(function (body) { if (!res.ok || body.ok === false) throw new Error(body.error || ('HTTP ' + res.status)); return body }) })
          .then(function (body) { dataState[1](body) })
          .catch(function (err) { errorState[1](err.message) })
      }

      React.useEffect(function () { load(startState[0], endState[0]) }, [])
      var summary = data && data.summary
      var max = summary && summary.byModel[0] ? summary.byModel[0].spend : 0

      return h('div', null,
        h(Banner, { text: error }),
        h('div', { className: 'urc-tools', style: { marginBottom: 12 } },
          h('input', { className: 'urc-field', style: { width: 150 }, type: 'date', value: startState[0], onChange: function (event) { startState[1](event.target.value) } }),
          h('input', { className: 'urc-field', style: { width: 150 }, type: 'date', value: endState[0], onChange: function (event) { endState[1](event.target.value) } }),
          h('button', { type: 'button', className: 'urc-button urc-button-primary', onClick: function () { load(startState[0], endState[0]) } }, '刷新')),
        summary ? h('div', { className: 'urc-kpis' },
          h(Kpi, { label: '请求', value: String(summary.requests) }),
          h(Kpi, { label: 'Token', value: String(summary.tokens) }),
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
              h('span', { className: 'urc-meta' }, money(row.spend) + ' · ' + row.tokens + ' tok · ' + row.requests + ' 次'))
          })) : h('p', { className: 'urc-empty' }, '正在向 LiteLLM 查询花费…'))
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
