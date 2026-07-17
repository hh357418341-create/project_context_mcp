export const UI_HTML = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project Context 本地工作台</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="/vendor/cytoscape.js" defer></script>
  <script src="/app.js" defer></script>
</head>
<body>
  <header class="app-header">
    <div class="brand">
      <span class="brand-mark">PC</span>
      <div><strong>Project Context</strong><span>本地项目工作台</span></div>
    </div>
    <nav class="view-tabs" aria-label="主要视图">
      <button class="tab active" data-view="portrait">项目画像</button>
      <button class="tab" data-view="rules">规则</button>
      <button class="tab" data-view="context">上下文预览</button>
    </nav>
    <div class="local-state"><span class="status-dot"></span>仅限本机</div>
  </header>

  <main>
    <section id="portrait-view" class="portrait-view">
      <header class="portrait-toolbar">
        <div><span class="panel-label">PROJECT PORTRAIT</span><h1>项目画像</h1></div>
        <div class="portrait-actions">
          <div class="field"><label for="portrait-project">项目</label><select id="portrait-project"></select></div>
          <button id="index-project" class="secondary-button" type="button">立即索引</button>
          <button id="toggle-watch" class="secondary-button" type="button">启动监听</button>
          <button id="refresh-portrait" class="secondary-button" type="button">刷新画像</button>
        </div>
      </header>
      <div id="portrait-loading" class="empty-state"><strong>正在读取项目画像</strong></div>
      <div id="portrait-empty" class="empty-state portrait-empty" hidden><strong>没有可展示的项目</strong><span>登记并索引项目后，画像会显示在这里。</span></div>
      <div id="portrait-content" hidden>
        <section class="portrait-identity">
          <div class="portrait-heading">
            <div><div class="portrait-title-row"><h2 id="portrait-name"></h2><span id="portrait-state" class="status-badge active"></span></div><p id="portrait-path"></p></div>
            <div id="portrait-index-state" class="index-state"></div>
          </div>
          <div id="portrait-metrics" class="portrait-metrics"></div>
        </section>
        <nav class="portrait-mode-tabs" aria-label="项目画像模式">
          <button class="portrait-mode active" data-portrait-mode="overview" type="button">概览</button>
          <button class="portrait-mode" data-portrait-mode="graph" type="button">关系图</button>
        </nav>
        <div id="portrait-overview" class="portrait-grid">
          <section class="portrait-section portrait-span-2"><header><div><span class="panel-label">CODEBASE</span><h2>代码构成</h2></div></header><div id="portrait-file-types" class="file-types"></div></section>
          <section class="portrait-section"><header><div><span class="panel-label">VERSION CONTROL</span><h2>版本控制状态</h2></div></header><dl id="portrait-git" class="portrait-facts"></dl></section>
          <section class="portrait-section"><header><div><span class="panel-label">KNOWLEDGE</span><h2>知识状态</h2></div></header><div id="portrait-knowledge" class="status-groups"></div></section>
          <section class="portrait-section"><header><div><span class="panel-label">ACTIVE WORK</span><h2>进行中的任务</h2></div></header><div id="portrait-tasks" class="portrait-list"></div></section>
          <section class="portrait-section"><header><div><span class="panel-label">RECENT MEMORY</span><h2>近期记忆</h2></div></header><div id="portrait-memories" class="portrait-list"></div></section>
          <section class="portrait-section"><header><div><span class="panel-label">STALE MEMORY</span><h2>待处理记忆</h2></div></header><div id="portrait-stale-memories" class="portrait-list"></div></section>
          <section class="portrait-section"><header><div><span class="panel-label">INDEXED SOURCES</span><h2>主要来源</h2></div></header><div id="portrait-sources" class="portrait-list source-list"></div></section>
          <section class="portrait-section"><header><div><span class="panel-label">REVIEW QUEUE</span><h2>待审核候选</h2></div></header><div id="portrait-candidates" class="portrait-list"></div></section>
        </div>
        <section id="portrait-graph" class="graph-panel" hidden>
          <header class="graph-toolbar">
            <div class="graph-search-wrap">
              <form id="graph-search-form" class="graph-search" role="search">
                <label class="sr-only" for="graph-search">搜索文件、类或函数</label>
                <input id="graph-search" type="search" maxlength="120" autocomplete="off" placeholder="搜索文件、类或函数">
                <button class="secondary-button" type="submit">定位</button>
              </form>
              <div id="graph-search-results" class="graph-search-results" hidden></div>
            </div>
            <fieldset id="graph-relations" class="relation-filters">
              <legend class="sr-only">关系类型</legend>
              <label><input type="checkbox" value="IMPORTS" checked><span class="relation-swatch imports"></span>导入</label>
              <label><input type="checkbox" value="CALLS" checked><span class="relation-swatch calls"></span>调用</label>
              <label><input type="checkbox" value="EXTENDS" checked><span class="relation-swatch extends"></span>继承</label>
              <label><input type="checkbox" value="IMPLEMENTS" checked><span class="relation-swatch implements"></span>实现</label>
            </fieldset>
            <div class="graph-tools">
              <label class="sr-only" for="graph-layout">图布局</label>
              <select id="graph-layout" title="图布局">
                <option value="cose">力导向</option>
                <option value="breadthfirst">分层</option>
                <option value="circle">环形</option>
              </select>
              <button id="graph-fit" class="secondary-button" type="button" title="适应画布">适应</button>
              <button id="graph-relayout" class="secondary-button" type="button" title="重新计算布局">重排</button>
            </div>
          </header>
          <div class="graph-workspace">
            <div class="graph-canvas-wrap">
              <div id="code-graph" class="code-graph" role="application" aria-label="项目代码关系图"></div>
              <div id="graph-loading" class="graph-loading" hidden><strong>正在构建关系图</strong></div>
              <div id="graph-empty" class="graph-loading" hidden><strong>没有可展示的代码关系</strong></div>
            </div>
            <aside id="graph-details" class="graph-details" aria-labelledby="graph-detail-title">
              <header><div><span class="panel-label">NODE DETAIL</span><h2 id="graph-detail-title">选择节点</h2></div><button id="graph-detail-close" class="icon-button" type="button" aria-label="关闭节点详情" title="关闭节点详情">×</button></header>
              <div id="graph-detail-body" class="graph-detail-body"><p class="portrait-list-empty">选择文件或符号后显示详细信息。</p></div>
              <div class="graph-detail-actions">
                <button id="graph-expand-one" class="secondary-button" type="button" disabled>展开一层</button>
                <button id="graph-expand-two" class="secondary-button" type="button" disabled>展开两层</button>
              </div>
            </aside>
          </div>
          <footer class="graph-footer"><span id="graph-status">0 个节点 · 0 条关系</span><span id="graph-scope">文件级概览</span></footer>
        </section>
      </div>
    </section>

    <section id="rules-view" class="rules-layout" hidden>
      <aside class="scope-panel">
        <div class="panel-label">作用范围</div>
        <nav id="scope-nav" class="scope-nav"></nav>
        <div class="field compact-field">
          <label for="project-filter">项目筛选</label>
          <select id="project-filter"><option value="">全部项目</option></select>
        </div>
        <label class="check-row"><input id="show-inactive" type="checkbox">显示历史和已删除规则</label>
      </aside>

      <section class="rule-list-panel" aria-labelledby="rule-list-title">
        <header class="panel-header">
          <div><h1 id="rule-list-title">全部规则</h1><p id="rule-count">0 条规则</p></div>
          <button id="new-rule" class="primary-button" type="button">新建规则</button>
        </header>
        <div class="search-row">
          <label class="sr-only" for="rule-search">搜索规则</label>
          <input id="rule-search" type="search" placeholder="搜索标题或内容">
        </div>
        <div id="rule-list" class="rule-list" role="list"></div>
        <div id="empty-rules" class="empty-state" hidden><strong>没有匹配的规则</strong><span>调整筛选条件或新建一条规则。</span></div>
      </section>

      <section id="editor-panel" class="editor-panel" aria-labelledby="editor-title">
        <header class="editor-header">
          <div><span class="panel-label">规则编辑器</span><h2 id="editor-title">新建规则</h2></div>
          <div class="editor-tools"><span id="editor-status" class="status-badge active">ACTIVE</span><button id="editor-close" class="icon-button" type="button" aria-label="关闭编辑器" title="关闭编辑器">×</button></div>
        </header>
        <form id="rule-form">
          <div class="field"><label for="rule-title">标题</label><input id="rule-title" name="title" maxlength="160" required></div>
          <div class="two-columns">
            <div class="field"><label for="rule-type">类型</label><select id="rule-type" name="type"></select></div>
            <div class="field"><label for="scope-level">作用域</label><select id="scope-level" name="scopeLevel"></select></div>
          </div>
          <div id="project-field" class="field" hidden><label for="rule-project">所属项目</label><select id="rule-project" name="projectId"></select></div>
          <div id="scope-ref-field" class="field" hidden><label id="scope-ref-label" for="scope-ref">范围定位</label><input id="scope-ref" name="scopeRef" maxlength="500"><small id="scope-ref-help"></small></div>
          <div class="field"><label for="rule-content">规则内容</label><textarea id="rule-content" name="content" rows="8" maxlength="8000" required></textarea></div>
          <div class="field"><label for="rule-reason">原因或背景 <span>可选</span></label><textarea id="rule-reason" name="reason" rows="3" maxlength="3000"></textarea></div>
          <div id="version-note" class="version-note" hidden>保存修改会创建新版本，当前版本将保留为 superseded 历史记录。</div>
          <div class="form-actions">
            <button id="delete-rule" class="danger-button" type="button" hidden>停用规则</button>
            <button id="reactivate-rule" class="secondary-button" type="button" hidden>重新启用</button>
            <button id="save-rule" class="primary-button" type="submit">保存规则</button>
          </div>
        </form>
      </section>
    </section>

    <section id="context-view" class="context-view" hidden>
      <header class="context-header"><div><span class="panel-label">实际组装结果</span><h1>上下文预览</h1></div></header>
      <div class="context-controls">
        <div class="field"><label for="context-project">项目</label><select id="context-project"></select></div>
        <div class="field task-field"><label for="context-task">模拟当前任务</label><textarea id="context-task" rows="3" placeholder="例如：修改认证模块的刷新令牌逻辑"></textarea></div>
        <div class="field budget-field"><label for="context-budget">Token 预算</label><input id="context-budget" type="number" min="500" max="100000" step="500" value="4000"></div>
        <button id="preview-context" class="primary-button" type="button">生成预览</button>
      </div>
      <div id="context-summary" class="context-summary" hidden></div>
      <div id="context-results" class="context-results"></div>
      <div id="empty-context" class="empty-state context-empty"><strong>选择项目并输入任务</strong><span>预览本次会进入模型上下文的个人规则、项目记忆、任务进度和代码证据。</span></div>
    </section>
  </main>

  <dialog id="confirm-dialog">
    <form method="dialog"><h2>停用这条规则？</h2><p>规则会转为 deleted 状态并保留审计记录，不会物理删除。</p><div class="dialog-actions"><button value="cancel" class="secondary-button">取消</button><button value="confirm" class="danger-button">停用</button></div></form>
  </dialog>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
</body>
</html>`;

export const UI_CSS = String.raw`:root {
  color-scheme: light;
  --bg: #f4f6f5;
  --surface: #ffffff;
  --surface-muted: #f8faf9;
  --text: #1c2421;
  --muted: #66716c;
  --line: #d9dfdc;
  --line-strong: #bdc7c2;
  --accent: #176b4d;
  --accent-strong: #0d553b;
  --accent-soft: #e6f2ec;
  --amber: #9a5b08;
  --amber-soft: #fff3db;
  --danger: #a73535;
  --danger-soft: #fbeaea;
  --shadow: 0 8px 24px rgba(19, 36, 29, 0.08);
  font-family: Inter, "Segoe UI", "Microsoft YaHei", sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: var(--bg); color: var(--text); font-size: 14px; letter-spacing: 0; }
button, input, select, textarea { font: inherit; letter-spacing: 0; }
button { cursor: pointer; }
.app-header { height: 64px; display: grid; grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr); align-items: center; padding: 0 24px; background: #202824; color: #fff; border-bottom: 1px solid #303b36; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.brand-mark { width: 32px; height: 32px; display: grid; place-items: center; background: #e9f3ee; color: #184b38; border-radius: 5px; font-weight: 800; font-size: 12px; }
.brand div { display: flex; flex-direction: column; min-width: 0; }
.brand strong { font-size: 14px; }
.brand div span { color: #acb8b2; font-size: 11px; margin-top: 2px; }
.view-tabs { display: flex; align-self: stretch; }
.tab { position: relative; min-width: 100px; border: 0; background: transparent; color: #aeb9b4; font-weight: 600; }
.tab.active { color: #fff; }
.tab.active::after { content: ""; position: absolute; height: 3px; left: 18px; right: 18px; bottom: 0; background: #58b98d; }
.local-state { justify-self: end; color: #bdc8c3; font-size: 12px; display: flex; align-items: center; gap: 7px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #58b98d; box-shadow: 0 0 0 3px rgba(88,185,141,.15); }
main { height: calc(100vh - 64px); overflow: hidden; }
.rules-layout { height: 100%; display: grid; grid-template-columns: 210px minmax(300px, 420px) minmax(440px, 1fr); }
.scope-panel, .rule-list-panel, .editor-panel { min-height: 0; background: var(--surface); }
.scope-panel { padding: 22px 14px; border-right: 1px solid var(--line); background: var(--surface-muted); overflow-y: auto; }
.panel-label { display: block; color: var(--muted); font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
.scope-nav { display: grid; gap: 3px; margin-bottom: 24px; }
.scope-button { display: flex; justify-content: space-between; width: 100%; padding: 9px 10px; border: 0; border-radius: 5px; background: transparent; color: #39433e; text-align: left; }
.scope-button span { color: var(--muted); font-size: 12px; }
.scope-button.active { background: var(--accent-soft); color: var(--accent-strong); font-weight: 700; }
.field { display: grid; gap: 6px; }
.field label { font-size: 12px; font-weight: 700; color: #3e4944; }
.field label span, .field small { color: var(--muted); font-weight: 400; }
.compact-field { margin-bottom: 16px; }
input, select, textarea { width: 100%; border: 1px solid var(--line-strong); border-radius: 5px; background: #fff; color: var(--text); padding: 9px 10px; outline: none; }
textarea { resize: vertical; line-height: 1.55; }
input:focus, select:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(23,107,77,.1); }
.check-row { display: flex; gap: 8px; align-items: flex-start; color: var(--muted); font-size: 12px; line-height: 1.4; }
.check-row input { width: 15px; margin: 1px 0 0; }
.rule-list-panel { display: flex; flex-direction: column; border-right: 1px solid var(--line); }
.panel-header, .editor-header, .context-header, .portrait-toolbar { min-height: 78px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--line); }
h1, h2, p { margin: 0; }
.panel-header h1, .context-header h1, .portrait-toolbar h1 { font-size: 18px; line-height: 1.3; }
.panel-header p { margin-top: 3px; color: var(--muted); font-size: 12px; }
.search-row { padding: 12px 14px; border-bottom: 1px solid var(--line); background: var(--surface-muted); }
.rule-list { flex: 1; overflow-y: auto; }
.rule-item { width: 100%; display: grid; gap: 7px; padding: 14px 16px; border: 0; border-bottom: 1px solid var(--line); background: #fff; color: inherit; text-align: left; }
.rule-item:hover { background: #f7faf8; }
.rule-item.selected { background: var(--accent-soft); box-shadow: inset 3px 0 var(--accent); }
.rule-item-title { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.rule-item-title strong { font-size: 13px; line-height: 1.4; overflow-wrap: anywhere; }
.rule-item p { color: #56615c; font-size: 12px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rule-meta { display: flex; gap: 6px; flex-wrap: wrap; color: var(--muted); font-size: 11px; }
.meta-pill { padding: 2px 6px; border: 1px solid var(--line); border-radius: 4px; background: #fff; }
.editor-panel { overflow-y: auto; }
.editor-header { position: sticky; top: 0; z-index: 2; background: rgba(255,255,255,.97); }
.editor-header h2 { font-size: 17px; }
.editor-tools { display: flex; align-items: center; gap: 8px; }
.icon-button { width: 32px; height: 32px; display: none; place-items: center; padding: 0; border: 1px solid var(--line); border-radius: 5px; background: #fff; color: #44504a; font-size: 21px; line-height: 1; }
.status-badge { border-radius: 4px; padding: 4px 7px; font-size: 10px; font-weight: 800; }
.status-badge.active { color: var(--accent-strong); background: var(--accent-soft); }
.status-badge.inactive { color: var(--amber); background: var(--amber-soft); }
#rule-form { display: grid; gap: 18px; max-width: 760px; padding: 24px; }
.two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.version-note { padding: 10px 12px; border-left: 3px solid var(--amber); background: var(--amber-soft); color: #704405; font-size: 12px; line-height: 1.5; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
.primary-button, .secondary-button, .danger-button { min-height: 36px; border-radius: 5px; padding: 8px 13px; font-weight: 700; border: 1px solid transparent; }
.primary-button { background: var(--accent); color: #fff; }
.primary-button:hover { background: var(--accent-strong); }
.secondary-button { background: #fff; border-color: var(--line-strong); color: #35413b; }
.danger-button { background: #fff; border-color: #d9a9a9; color: var(--danger); }
.danger-button:hover { background: var(--danger-soft); }
.empty-state { margin: auto; padding: 40px 24px; text-align: center; color: var(--muted); }
.empty-state strong, .empty-state span { display: block; }
.empty-state strong { color: #3d4943; margin-bottom: 6px; }
.context-view { height: 100%; overflow-y: auto; background: var(--surface); }
.context-header { min-height: 84px; }
.context-controls { display: grid; grid-template-columns: minmax(220px, .8fr) minmax(320px, 2fr) 140px auto; align-items: end; gap: 14px; padding: 18px 24px; border-bottom: 1px solid var(--line); background: var(--surface-muted); }
.context-controls .primary-button { margin-bottom: 1px; }
.context-summary { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 24px; border-bottom: 1px solid var(--line); }
.summary-stat { border: 1px solid var(--line); border-radius: 5px; padding: 6px 9px; background: #fff; color: var(--muted); font-size: 12px; }
.summary-stat strong { color: var(--text); margin-right: 4px; }
.context-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 0; max-width: 1200px; margin: 0 auto; border-left: 1px solid var(--line); }
.context-section { min-height: 180px; padding: 20px 22px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.context-section h2 { font-size: 14px; margin-bottom: 12px; }
.context-entry { padding: 10px 0; border-top: 1px solid var(--line); }
.context-entry:first-of-type { border-top: 0; }
.context-entry strong { display: block; font-size: 12px; margin-bottom: 4px; overflow-wrap: anywhere; }
.context-entry p { color: #56615c; font-size: 12px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.context-entry small { display: block; margin-top: 5px; color: var(--muted); }
.context-empty { margin-top: 80px; }
.portrait-view { height: 100%; overflow-y: auto; background: var(--surface); }
.portrait-toolbar { position: sticky; top: 0; z-index: 3; min-height: 84px; background: #fff; }
.portrait-actions { display: flex; flex-wrap: wrap; align-items: end; justify-content: flex-end; gap: 10px; }
.portrait-actions .field { min-width: min(320px, 38vw); }
.portrait-identity { padding: 24px; border-bottom: 1px solid var(--line); background: var(--surface-muted); }
.portrait-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; max-width: 1280px; margin: 0 auto 20px; }
.portrait-title-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.portrait-title-row h2 { font-size: 24px; line-height: 1.25; }
.portrait-heading p { margin-top: 7px; color: var(--muted); font-family: Consolas, monospace; font-size: 12px; overflow-wrap: anywhere; }
.index-state { flex: 0 0 auto; max-width: 360px; padding-left: 18px; border-left: 3px solid var(--accent); text-align: right; }
.index-state strong, .index-state span { display: block; }
.index-state strong { font-size: 13px; }
.index-state span { margin-top: 4px; color: var(--muted); font-size: 11px; }
.portrait-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); max-width: 1280px; margin: 0 auto; border: 1px solid var(--line); background: #fff; }
.portrait-metric { min-height: 88px; padding: 16px 18px; border-right: 1px solid var(--line); }
.portrait-metric:last-child { border-right: 0; }
.portrait-metric strong, .portrait-metric span { display: block; }
.portrait-metric strong { font-size: 24px; line-height: 1.15; }
.portrait-metric span { margin-top: 7px; color: var(--muted); font-size: 11px; }
.portrait-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 1280px; margin: 0 auto; border-left: 1px solid var(--line); }
.portrait-section { min-height: 240px; padding: 22px 24px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.portrait-section.portrait-span-2 { grid-column: 1 / -1; }
.portrait-section > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.portrait-section h2 { font-size: 15px; }
.file-types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 34px; }
.file-type { display: grid; grid-template-columns: minmax(70px, .6fr) minmax(120px, 1fr) auto; align-items: center; gap: 10px; min-height: 36px; border-top: 1px solid var(--line); font-size: 12px; }
.file-type:nth-child(-n+2) { border-top: 0; }
.file-type strong { overflow-wrap: anywhere; }
.file-type-track { height: 6px; background: #e8ecea; overflow: hidden; }
.file-type-track span { display: block; height: 100%; background: var(--accent); }
.file-type small { color: var(--muted); white-space: nowrap; }
.portrait-facts { display: grid; grid-template-columns: minmax(100px, .7fr) minmax(0, 1.3fr); margin: 0; }
.portrait-facts dt, .portrait-facts dd { min-height: 38px; margin: 0; padding: 10px 0; border-top: 1px solid var(--line); font-size: 12px; overflow-wrap: anywhere; }
.portrait-facts dt:first-of-type, .portrait-facts dt:first-of-type + dd { border-top: 0; }
.portrait-facts dt { color: var(--muted); }
.status-groups { display: grid; gap: 16px; }
.status-group h3 { margin: 0 0 7px; font-size: 12px; }
.status-values { display: flex; flex-wrap: wrap; gap: 7px; }
.status-value { padding: 5px 8px; border: 1px solid var(--line); background: var(--surface-muted); color: var(--muted); font-size: 11px; }
.status-value strong { color: var(--text); margin-right: 5px; }
.portrait-list { display: grid; }
.portrait-item { padding: 11px 0; border-top: 1px solid var(--line); }
.portrait-item:first-child { border-top: 0; padding-top: 0; }
.portrait-item strong, .portrait-item span, .portrait-item small { display: block; overflow-wrap: anywhere; }
.portrait-item strong { font-size: 12px; line-height: 1.45; }
.portrait-item span { margin-top: 4px; color: #56615c; font-size: 11px; line-height: 1.5; }
.portrait-item small { margin-top: 5px; color: var(--muted); font-size: 10px; }
.portrait-item-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 9px; }
.portrait-item-actions button { min-height: 30px; padding: 5px 9px; font-size: 10px; }
.portrait-list-empty { color: var(--muted); font-size: 12px; }
.source-list .portrait-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 14px; }
.source-list .portrait-item small { grid-column: 1 / -1; margin-top: 0; }
.portrait-empty { margin-top: 80px; }
.portrait-mode-tabs { position: sticky; top: 84px; z-index: 2; display: flex; justify-content: center; min-height: 46px; border-bottom: 1px solid var(--line); background: #fff; }
.portrait-mode { position: relative; min-width: 108px; border: 0; background: transparent; color: var(--muted); font-weight: 700; }
.portrait-mode.active { color: var(--accent-strong); }
.portrait-mode.active::after { content: ""; position: absolute; left: 16px; right: 16px; bottom: -1px; height: 3px; background: var(--accent); }
.graph-panel { scroll-margin-top: 130px; background: #fff; }
.graph-toolbar { position: relative; z-index: 2; min-height: 64px; display: grid; grid-template-columns: minmax(260px, 1fr) auto auto; align-items: center; gap: 16px; padding: 12px 18px; border-bottom: 1px solid var(--line); background: var(--surface-muted); }
.graph-search-wrap { position: relative; max-width: 520px; }
.graph-search { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.graph-search-results { position: absolute; z-index: 8; top: calc(100% + 5px); left: 0; right: 0; max-height: 320px; overflow-y: auto; border: 1px solid var(--line-strong); background: #fff; box-shadow: var(--shadow); }
.graph-search-result { width: 100%; display: grid; gap: 3px; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--line); background: #fff; text-align: left; }
.graph-search-result:last-child { border-bottom: 0; }
.graph-search-result:hover, .graph-search-result:focus { background: var(--accent-soft); }
.graph-search-result strong { font-size: 12px; overflow-wrap: anywhere; }
.graph-search-result small { color: var(--muted); font-size: 10px; overflow-wrap: anywhere; }
.relation-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin: 0; padding: 0; border: 0; }
.relation-filters label { min-height: 34px; display: flex; align-items: center; gap: 5px; padding: 6px 8px; border: 1px solid var(--line); background: #fff; color: #46514c; font-size: 11px; cursor: pointer; }
.relation-filters label:has(input:not(:checked)) { color: #8b9490; background: #f1f3f2; }
.relation-filters input { width: 14px; margin: 0; }
.relation-swatch { width: 8px; height: 8px; border-radius: 50%; }
.relation-swatch.imports { background: #177b57; }
.relation-swatch.calls { background: #3377b6; }
.relation-swatch.extends { background: #a05d08; }
.relation-swatch.implements { background: #a43d52; }
.graph-tools { display: flex; align-items: center; gap: 7px; }
.graph-tools select { width: 100px; }
.graph-workspace { height: min(720px, calc(100vh - 258px)); min-height: 540px; display: grid; grid-template-columns: minmax(0, 1fr) 320px; border-bottom: 1px solid var(--line); }
.graph-canvas-wrap { position: relative; min-width: 0; overflow: hidden; background: #f7f9f8; }
.code-graph { position: absolute; inset: 0; }
.graph-loading { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; background: rgba(247,249,248,.88); color: var(--muted); }
.graph-loading strong { padding: 9px 12px; border: 1px solid var(--line); background: #fff; color: #3d4943; font-size: 12px; }
.graph-details { min-width: 0; display: flex; flex-direction: column; border-left: 1px solid var(--line); background: #fff; }
.graph-details > header { min-height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.graph-details h2 { font-size: 15px; overflow-wrap: anywhere; }
.graph-detail-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; }
.graph-detail-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--line); background: var(--surface-muted); }
.graph-facts { display: grid; grid-template-columns: 88px minmax(0, 1fr); margin: 0 0 18px; }
.graph-facts dt, .graph-facts dd { min-height: 34px; margin: 0; padding: 8px 0; border-top: 1px solid var(--line); font-size: 11px; overflow-wrap: anywhere; }
.graph-facts dt:first-of-type, .graph-facts dt:first-of-type + dd { border-top: 0; }
.graph-facts dt { color: var(--muted); }
.graph-detail-section { margin-top: 18px; }
.graph-detail-section h3 { margin: 0 0 8px; font-size: 12px; }
.graph-detail-entry { padding: 8px 0; border-top: 1px solid var(--line); }
.graph-detail-entry strong, .graph-detail-entry span, .graph-detail-entry small { display: block; overflow-wrap: anywhere; }
.graph-detail-entry strong { font-size: 11px; }
.graph-detail-entry span { margin-top: 3px; color: #56615c; font-size: 10px; }
.graph-detail-entry small { margin-top: 4px; color: var(--muted); font-size: 9px; }
.graph-footer { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 18px; color: var(--muted); font-size: 11px; background: #fff; }
.graph-footer span:last-child { color: var(--text); font-weight: 700; }
dialog { width: min(420px, calc(100vw - 32px)); border: 1px solid var(--line); border-radius: 6px; padding: 0; box-shadow: var(--shadow); }
dialog::backdrop { background: rgba(20, 27, 24, .45); }
dialog form { padding: 22px; }
dialog h2 { font-size: 17px; margin-bottom: 8px; }
dialog p { color: var(--muted); line-height: 1.5; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
.toast { position: fixed; right: 22px; bottom: 22px; max-width: min(420px, calc(100vw - 44px)); padding: 11px 14px; border-radius: 5px; background: #202824; color: #fff; box-shadow: var(--shadow); opacity: 0; transform: translateY(8px); pointer-events: none; transition: .18s ease; }
.toast.show { opacity: 1; transform: translateY(0); }
.toast.error { background: var(--danger); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
[hidden] { display: none !important; }
@media (max-width: 980px) {
  .app-header { grid-template-columns: 1fr auto; }
  .view-tabs { order: 3; grid-column: 1 / -1; height: 44px; justify-content: center; background: #202824; }
  .local-state { display: none; }
  .app-header { height: 108px; }
  main { height: calc(100vh - 108px); }
  .rules-layout { grid-template-columns: 190px minmax(280px, 1fr); }
  .editor-panel { display: none; position: fixed; z-index: 5; top: 108px; right: 0; bottom: 0; width: min(560px, calc(100vw - 40px)); box-shadow: -8px 0 28px rgba(20,32,27,.15); }
  .editor-panel.open { display: block; }
  .icon-button { display: grid; }
  .context-controls { grid-template-columns: 1fr 1fr; }
  .task-field { grid-column: 1 / -1; }
  .portrait-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .portrait-metric:nth-child(2) { border-right: 0; }
  .portrait-metric:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
  .graph-toolbar { grid-template-columns: 1fr auto; }
  .graph-search-wrap { max-width: none; }
  .relation-filters { grid-column: 1 / -1; grid-row: 2; }
  .graph-tools { grid-column: 2; grid-row: 1; }
  .graph-workspace { grid-template-columns: minmax(0, 1fr) 280px; }
}
@media (max-width: 640px) {
  .app-header { padding: 0 14px; }
  .rules-layout { display: block; overflow-y: auto; }
  .scope-panel { border-right: 0; border-bottom: 1px solid var(--line); padding: 12px; }
  .scope-nav { display: flex; overflow-x: auto; margin-bottom: 12px; }
  .scope-button { width: auto; flex: 0 0 auto; gap: 8px; }
  .compact-field, .check-row { display: none; }
  .rule-list-panel { min-height: calc(100vh - 210px); border-right: 0; }
  .editor-panel { top: 108px; left: 0; width: 100vw; }
  .two-columns { grid-template-columns: 1fr; }
  #rule-form { padding: 18px 16px 90px; }
  .form-actions { position: fixed; z-index: 6; left: 0; right: 0; bottom: 0; padding: 12px 16px; background: #fff; border-top: 1px solid var(--line); }
  .context-controls { grid-template-columns: 1fr; padding: 16px; }
  .task-field { grid-column: auto; }
  .context-results { grid-template-columns: 1fr; border-left: 0; }
  .context-section { border-right: 0; }
  .tab { min-width: 96px; }
  .portrait-toolbar { align-items: stretch; flex-direction: column; padding: 14px 16px; }
  .portrait-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .portrait-actions .field { grid-column: 1 / -1; min-width: 0; }
  .portrait-actions > button { width: 100%; padding-inline: 6px; }
  .portrait-identity { padding: 20px 16px; }
  .portrait-heading { display: grid; gap: 16px; }
  .portrait-title-row h2 { font-size: 21px; }
  .index-state { max-width: none; text-align: left; }
  .portrait-metrics { grid-template-columns: 1fr 1fr; }
  .portrait-metric { min-height: 78px; padding: 14px; }
  .portrait-metric strong { font-size: 20px; }
  .portrait-grid { grid-template-columns: 1fr; border-left: 0; }
  .portrait-section, .portrait-section.portrait-span-2 { grid-column: auto; border-right: 0; padding: 20px 16px; }
  .file-types { grid-template-columns: 1fr; }
  .file-type:nth-child(2) { border-top: 1px solid var(--line); }
  .portrait-mode-tabs { top: 142px; }
  .graph-panel { scroll-margin-top: 188px; }
  .graph-toolbar { display: grid; grid-template-columns: 1fr; gap: 10px; padding: 12px; }
  .graph-search-wrap, .relation-filters, .graph-tools { grid-column: auto; grid-row: auto; }
  .relation-filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 2px; }
  .relation-filters label { flex: 0 0 auto; }
  .graph-tools { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; }
  .graph-tools select { width: 100%; }
  .graph-workspace { position: relative; height: calc(100vh - 318px); min-height: 500px; display: block; }
  .graph-canvas-wrap { position: absolute; inset: 0; }
  .graph-details { position: absolute; z-index: 5; left: 0; right: 0; bottom: 0; height: min(46%, 380px); border-left: 0; border-top: 1px solid var(--line-strong); box-shadow: 0 -8px 24px rgba(19,36,29,.1); transform: translateY(100%); transition: transform .18s ease; }
  .graph-details.open { transform: translateY(0); }
  .graph-details .icon-button { display: grid; }
  .graph-footer { align-items: flex-start; }
}
`;

export const UI_JS = String.raw`(function () {
  "use strict";
  var state = {
    projects: [], memories: [], scope: "all", selectedId: null, portraitProjectId: null, portrait: null,
    graphCy: null, graphProjectId: null, graphRoot: null, graphScope: "files",
    graphSelectedId: null, graphSearchResults: [], graphSearchSequence: 0, graphSearchTimer: null
  };
  var scopes = [
    ["all", "全部规则"], ["user", "全局"], ["workspace", "工作区"],
    ["project", "项目"], ["module", "模块"], ["task", "任务"]
  ];
  var types = [["constraint", "约束"], ["preference", "偏好"], ["decision", "决策"], ["fact", "事实"], ["lesson", "经验"], ["issue", "问题"], ["assumption", "假设"], ["task-summary", "任务总结"]];
  var els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();
    populateStaticOptions();
    try {
      await establishSession();
      await refresh();
      newRule(false);
      await loadPortrait(false);
    } catch (error) {
      toast(error.message || String(error), true);
      document.getElementById("rule-list").replaceChildren(errorState("无法连接本地规则服务"));
    }
  }

  function cacheElements() {
    ["scope-nav", "project-filter", "show-inactive", "rule-search", "rule-list", "empty-rules", "rule-count",
      "new-rule", "rule-form", "editor-title", "editor-status", "rule-title", "rule-type", "scope-level",
      "project-field", "rule-project", "scope-ref-field", "scope-ref", "scope-ref-label", "scope-ref-help",
      "rule-content", "rule-reason", "version-note", "delete-rule", "reactivate-rule", "save-rule", "confirm-dialog",
      "editor-panel", "editor-close",
      "context-project", "context-task", "context-budget", "preview-context", "context-results",
      "context-summary", "empty-context",
      "portrait-project", "index-project", "toggle-watch", "refresh-portrait", "portrait-loading", "portrait-empty", "portrait-content",
      "portrait-name", "portrait-state", "portrait-path", "portrait-index-state", "portrait-metrics",
      "portrait-file-types", "portrait-git", "portrait-knowledge", "portrait-tasks", "portrait-memories", "portrait-stale-memories",
      "portrait-sources", "portrait-candidates", "portrait-overview", "portrait-graph",
      "graph-search-form", "graph-search", "graph-search-results", "graph-relations", "graph-layout",
      "graph-fit", "graph-relayout", "graph-loading", "graph-empty", "code-graph", "graph-details",
      "graph-detail-title", "graph-detail-body", "graph-detail-close", "graph-expand-one", "graph-expand-two",
      "graph-status", "graph-scope", "toast"].forEach(function (id) { els[id] = document.getElementById(id); });
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach(function (button) {
      button.addEventListener("click", function () { switchView(button.dataset.view); });
    });
    els["project-filter"].addEventListener("change", renderRules);
    els["show-inactive"].addEventListener("change", renderRules);
    els["rule-search"].addEventListener("input", renderRules);
    els["new-rule"].addEventListener("click", function () { newRule(true); });
    els["editor-close"].addEventListener("click", function () { els["editor-panel"].classList.remove("open"); });
    els["scope-level"].addEventListener("change", updateScopeFields);
    els["rule-form"].addEventListener("submit", saveRule);
    els["delete-rule"].addEventListener("click", function () { els["confirm-dialog"].showModal(); });
    els["confirm-dialog"].addEventListener("close", function () {
      if (els["confirm-dialog"].returnValue === "confirm") updateSelectedStatus("deleted");
    });
    els["reactivate-rule"].addEventListener("click", function () { updateSelectedStatus("active"); });
    els["preview-context"].addEventListener("click", previewContext);
    els["portrait-project"].addEventListener("change", function () { resetGraph(); loadPortrait(true); });
    els["index-project"].addEventListener("click", indexSelectedProject);
    els["toggle-watch"].addEventListener("click", toggleSelectedWatch);
    els["refresh-portrait"].addEventListener("click", function () { loadPortrait(true); });
    document.querySelectorAll(".portrait-mode").forEach(function (button) {
      button.addEventListener("click", function () { setPortraitMode(button.dataset.portraitMode); });
    });
    els["graph-search-form"].addEventListener("submit", function (event) {
      event.preventDefault();
      if (state.graphSearchResults.length) focusGraphResult(state.graphSearchResults[0]);
      else searchGraph(true);
    });
    els["graph-search"].addEventListener("input", function () {
      clearTimeout(state.graphSearchTimer);
      state.graphSearchTimer = setTimeout(function () { searchGraph(false); }, 220);
    });
    els["graph-search"].addEventListener("blur", function () {
      setTimeout(function () { els["graph-search-results"].hidden = true; }, 140);
    });
    els["graph-relations"].addEventListener("change", reloadGraph);
    els["graph-layout"].addEventListener("change", runGraphLayout);
    els["graph-fit"].addEventListener("click", function () { if (state.graphCy) state.graphCy.animate({ fit: { eles: state.graphCy.elements(), padding: 42 }, duration: 220 }); });
    els["graph-relayout"].addEventListener("click", runGraphLayout);
    els["graph-expand-one"].addEventListener("click", function () { expandGraph(1); });
    els["graph-expand-two"].addEventListener("click", function () { expandGraph(2); });
    els["graph-detail-close"].addEventListener("click", function () { els["graph-details"].classList.remove("open"); });
    window.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && !document.getElementById("rules-view").hidden) {
        event.preventDefault(); els["rule-form"].requestSubmit();
      }
    });
  }

  function populateStaticOptions() {
    scopes.slice(1).forEach(function (scope) { addOption(els["scope-level"], scope[0], scope[1]); });
    types.forEach(function (type) { addOption(els["rule-type"], type[0], type[1]); });
  }

  async function establishSession() {
    var params = new URLSearchParams(location.hash.slice(1));
    var token = params.get("token");
    if (token) {
      await fetchJson("/api/session", { method: "POST", body: { token: token }, allowUnauthorized: true });
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  async function refresh() {
    var data = await fetchJson("/api/bootstrap");
    state.projects = data.projects;
    state.memories = data.memories;
    renderProjectOptions();
    renderScopeNav();
    renderRules();
  }

  function renderProjectOptions() {
    [els["project-filter"], els["rule-project"], els["context-project"], els["portrait-project"]].forEach(function (select, index) {
      var current = select.value;
      select.replaceChildren();
      if (index === 0) addOption(select, "", "全部项目");
      else if (state.projects.length === 0) addOption(select, "", "没有已登记项目");
      state.projects.forEach(function (project) { addOption(select, project.id, project.name + (project.archivedAt ? "（已归档）" : "")); });
      if ([].some.call(select.options, function (option) { return option.value === current; })) select.value = current;
    });
  }

  function renderScopeNav() {
    els["scope-nav"].replaceChildren();
    scopes.forEach(function (scope) {
      var count = state.memories.filter(function (memory) { return scope[0] === "all" || memory.scopeLevel === scope[0]; }).length;
      var button = element("button", "scope-button" + (state.scope === scope[0] ? " active" : ""));
      button.type = "button";
      button.append(element("b", "", scope[1]), element("span", "", String(count)));
      button.addEventListener("click", function () { state.scope = scope[0]; renderScopeNav(); renderRules(); });
      els["scope-nav"].append(button);
    });
  }

  function filteredMemories() {
    var query = els["rule-search"].value.trim().toLowerCase();
    var projectId = els["project-filter"].value;
    return state.memories.filter(function (memory) {
      if (!els["show-inactive"].checked && memory.status !== "active") return false;
      if (state.scope !== "all" && memory.scopeLevel !== state.scope) return false;
      if (projectId && memory.projectId !== projectId) return false;
      if (query && (memory.title + " " + memory.content).toLowerCase().indexOf(query) < 0) return false;
      return true;
    });
  }

  function renderRules() {
    var memories = filteredMemories();
    els["rule-list"].replaceChildren();
    els["empty-rules"].hidden = memories.length !== 0;
    els["rule-count"].textContent = memories.length + " 条规则";
    memories.forEach(function (memory) {
      var button = element("button", "rule-item" + (state.selectedId === memory.id ? " selected" : ""));
      button.type = "button"; button.setAttribute("role", "listitem");
      var title = element("div", "rule-item-title");
      title.append(element("strong", "", memory.title), statusBadge(memory.status));
      var meta = element("div", "rule-meta");
      meta.append(metaPill(scopeLabel(memory.scopeLevel)), metaPill(typeLabel(memory.type)));
      var project = projectById(memory.projectId);
      if (project) meta.append(metaPill(project.name));
      button.append(title, element("p", "", memory.content), meta);
      button.addEventListener("click", function () { selectRule(memory.id); });
      els["rule-list"].append(button);
    });
  }

  function newRule(openEditor) {
    state.selectedId = null;
    els["rule-form"].reset();
    els["rule-type"].value = "constraint";
    els["scope-level"].value = state.scope === "all" ? "user" : state.scope;
    els["editor-title"].textContent = "新建规则";
    setEditorStatus("active");
    els["version-note"].hidden = true;
    els["delete-rule"].hidden = true;
    els["reactivate-rule"].hidden = true;
    els["save-rule"].hidden = false;
    updateScopeFields(); renderRules();
    if (openEditor || window.innerWidth > 980) {
      els["editor-panel"].classList.add("open");
      els["rule-title"].focus();
    }
  }

  function selectRule(id) {
    var memory = state.memories.find(function (item) { return item.id === id; });
    if (!memory) return;
    state.selectedId = id;
    els["rule-title"].value = memory.title;
    els["rule-type"].value = memory.type;
    els["scope-level"].value = memory.scopeLevel;
    els["rule-project"].value = memory.projectId || "";
    els["scope-ref"].value = memory.scopeRef || "";
    els["rule-content"].value = memory.content;
    els["rule-reason"].value = memory.reason || "";
    els["editor-title"].textContent = memory.title;
    setEditorStatus(memory.status);
    els["version-note"].hidden = memory.status !== "active";
    els["delete-rule"].hidden = memory.status !== "active";
    els["reactivate-rule"].hidden = memory.status !== "deleted";
    els["save-rule"].hidden = memory.status !== "active";
    updateScopeFields(); renderRules();
    if (window.innerWidth <= 980) {
      els["editor-panel"].classList.add("open");
      els["rule-title"].focus();
    }
  }

  function updateScopeFields() {
    var scope = els["scope-level"].value;
    var needsProject = ["project", "module", "task"].indexOf(scope) >= 0;
    var needsRef = ["workspace", "module", "task"].indexOf(scope) >= 0;
    els["project-field"].hidden = !needsProject;
    els["scope-ref-field"].hidden = !needsRef;
    els["rule-project"].required = needsProject;
    els["scope-ref"].required = needsRef;
    if (scope === "workspace") {
      els["scope-ref-label"].textContent = "工作区绝对路径";
      els["scope-ref-help"].textContent = "规则适用于该目录下的所有已登记项目。";
    } else if (scope === "module") {
      els["scope-ref-label"].textContent = "模块匹配词";
      els["scope-ref-help"].textContent = "当前任务包含这个词时应用，例如 authentication。";
    } else if (scope === "task") {
      els["scope-ref-label"].textContent = "任务匹配词";
      els["scope-ref-help"].textContent = "当前任务包含这个词时应用，例如 migration。";
    }
  }

  async function saveRule(event) {
    event.preventDefault();
    var payload = {
      title: els["rule-title"].value.trim(), type: els["rule-type"].value,
      content: els["rule-content"].value.trim(), reason: els["rule-reason"].value.trim() || undefined,
      scopeLevel: els["scope-level"].value
    };
    if (["project", "module", "task"].indexOf(payload.scopeLevel) >= 0) payload.projectId = els["rule-project"].value;
    if (["workspace", "module", "task"].indexOf(payload.scopeLevel) >= 0) payload.scopeRef = els["scope-ref"].value.trim();
    try {
      var wasEditing = Boolean(state.selectedId);
      var saved = await fetchJson(wasEditing ? "/api/memories/" + encodeURIComponent(state.selectedId) : "/api/memories", {
        method: wasEditing ? "PUT" : "POST", body: payload
      });
      await refresh(); selectRule(saved.id); toast(wasEditing ? "已保存新版本" : "规则已创建");
    } catch (error) { toast(error.message || String(error), true); }
  }

  async function updateSelectedStatus(status) {
    if (!state.selectedId) return;
    try {
      var updated = await fetchJson("/api/memories/" + encodeURIComponent(state.selectedId) + "/status", { method: "PATCH", body: { status: status } });
      await refresh(); selectRule(updated.id); toast(status === "active" ? "规则已重新启用" : "规则已停用");
    } catch (error) { toast(error.message || String(error), true); }
  }

  async function previewContext() {
    var projectId = els["context-project"].value;
    var task = els["context-task"].value.trim();
    if (!projectId || !task) { toast("请选择项目并填写模拟任务", true); return; }
    els["preview-context"].disabled = true;
    try {
      var context = await fetchJson("/api/context-preview", { method: "POST", body: {
        projectId: projectId, task: task, budgetTokens: Number(els["context-budget"].value)
      }});
      renderContext(context); toast("上下文预览已生成");
    } catch (error) { toast(error.message || String(error), true); }
    finally { els["preview-context"].disabled = false; }
  }

  function renderContext(context) {
    els["empty-context"].hidden = true;
    els["context-results"].replaceChildren();
    els["context-summary"].hidden = false;
    els["context-summary"].replaceChildren(
      summaryStat("使用", context.budget.usedTokens + " tokens"), summaryStat("预算", context.budget.requestedTokens),
      summaryStat("个人规则", context.userMemories.length), summaryStat("项目记忆", context.constraints.length + context.decisions.length + context.lessons.length),
      summaryStat("任务", context.activeTasks.length), summaryStat("检索证据", context.relevant.length)
    );
    addContextSection("个人规则", context.userMemories, function (item) { return item.scopeLevel + (item.scopeRef ? " · " + item.scopeRef : ""); });
    addContextSection("项目约束与决策", context.constraints.concat(context.decisions), function (item) { return item.type + (item.sourceRef ? " · " + item.sourceRef : ""); });
    addContextSection("任务进度", context.activeTasks, function (item) { return item.status; }, function (item) { return item.checkpoint.summary || item.goal; });
    addContextSection("相关代码与文档", context.relevant, function (item) { return item.kind + (item.source ? " · " + item.source : ""); });
    if (context.warnings.length) addContextSection("警告", context.warnings.map(function (warning) { return { title: "需要复核", content: warning }; }), function () { return "warning"; });
  }

  function addContextSection(title, items, meta, content) {
    var section = element("section", "context-section");
    section.append(element("h2", "", title + " · " + items.length));
    if (!items.length) section.append(element("p", "", "本次没有选中内容。"));
    items.forEach(function (item) {
      var entry = element("div", "context-entry");
      entry.append(element("strong", "", item.title || item.goal || item.name || "上下文项"));
      entry.append(element("p", "", content ? content(item) : (item.content || "")));
      entry.append(element("small", "", meta(item)));
      section.append(entry);
    });
    els["context-results"].append(section);
  }

  async function loadPortrait(force) {
    var projectId = els["portrait-project"].value;
    if (!projectId) {
      els["portrait-loading"].hidden = true;
      els["portrait-content"].hidden = true;
      els["portrait-empty"].hidden = false;
      return;
    }
    if (!force && state.portraitProjectId === projectId) return;
    els["portrait-loading"].replaceChildren(element("strong", "", "正在读取项目画像"));
    els["portrait-loading"].hidden = false;
    els["portrait-empty"].hidden = true;
    els["portrait-content"].hidden = true;
    els["refresh-portrait"].disabled = true;
    try {
      var portrait = await fetchJson("/api/projects/" + encodeURIComponent(projectId) + "/portrait");
      renderPortrait(portrait);
      state.portrait = portrait;
      state.portraitProjectId = projectId;
    } catch (error) {
      els["portrait-loading"].replaceChildren(errorState(error.message || "无法读取项目画像"));
      toast(error.message || String(error), true);
    } finally {
      els["refresh-portrait"].disabled = false;
    }
  }

  function renderPortrait(portrait) {
    var project = portrait.project;
    var health = portrait.health;
    var lastRun = health.lastIndexRun;
    els["portrait-loading"].hidden = true;
    els["portrait-content"].hidden = false;
    els["portrait-name"].textContent = project.name;
    els["portrait-path"].textContent = project.rootPath;
    els["portrait-state"].textContent = project.archivedAt ? "已归档" : "活跃";
    els["portrait-state"].className = "status-badge " + (project.archivedAt ? "inactive" : "active");
    els["toggle-watch"].textContent = portrait.watch ? "停止监听" : "启动监听";
    els["portrait-index-state"].replaceChildren(
      element("strong", "", lastRun ? indexRunLabel(lastRun.status) : "尚未建立索引"),
      element("span", "", lastRun ? "最近索引 " + formatDate(lastRun.completed_at || lastRun.started_at) : "项目已登记，等待首次索引")
    );
    els["portrait-metrics"].replaceChildren(
      portraitMetric(formatNumber(health.sources), "索引文件"),
      portraitMetric(formatNumber(health.chunks), "内容片段"),
      portraitMetric(formatNumber(health.symbols), "代码符号"),
      portraitMetric(formatNumber(health.relations), "代码关系")
    );
    renderFileTypes(portrait.fileTypes);
    renderGit(portrait);
    renderStatusGroups(portrait.statuses);
    renderPortraitList(els["portrait-tasks"], portrait.activeTasks, "当前没有进行中的任务", function (item) {
      return {
        title: item.goal, content: item.checkpoint.summary || "尚未保存任务摘要", meta: "更新于 " + formatDate(item.updatedAt),
        actions: [
          { label: "标记完成", className: "secondary-button", action: function () { updateTask(item.id, "complete"); } },
          { label: "取消任务", className: "danger-button", action: function () { updateTask(item.id, "cancel"); } }
        ]
      };
    });
    renderPortraitList(els["portrait-memories"], portrait.recentMemories, "当前没有活跃项目记忆", function (item) {
      return { title: item.title, content: item.content, meta: typeLabel(item.type) + " · " + formatDate(item.updatedAt) };
    });
    renderPortraitList(els["portrait-stale-memories"], portrait.staleMemories, "没有待处理的过期记忆", function (item) {
      return {
        title: item.title, content: item.content, meta: statusLabel(item.status) + " · " + (item.sourceRef || "无来源"),
        actions: [{ label: "标记删除", className: "danger-button", action: function () { deleteStaleMemory(item.id); } }]
      };
    });
    renderPortraitList(els["portrait-sources"], portrait.primarySources, "当前没有已索引来源", function (item) {
      return { title: item.path, content: formatBytes(item.sizeBytes), meta: "索引于 " + formatDate(item.indexedAt) };
    });
    renderPortraitList(els["portrait-candidates"], portrait.pendingCandidates, "没有待审核候选", function (item) {
      return {
        title: item.title, content: item.content, meta: item.sourceKind + " · 置信度 " + Math.round(item.confidence * 100) + "%",
        actions: [
          { label: "接受", className: "secondary-button", action: function () { reviewCandidate(item.id, "accept"); } },
          { label: "拒绝", className: "danger-button", action: function () { reviewCandidate(item.id, "reject"); } }
        ]
      };
    });
  }

  function renderFileTypes(items) {
    els["portrait-file-types"].replaceChildren();
    if (!items.length) { els["portrait-file-types"].append(element("p", "portrait-list-empty", "当前没有文件类型数据")); return; }
    var maximum = Math.max.apply(null, items.map(function (item) { return item.count; }));
    items.forEach(function (item) {
      var row = element("div", "file-type");
      var track = element("span", "file-type-track");
      var bar = element("span");
      bar.style.width = Math.max(5, Math.round(item.count / maximum * 100)) + "%";
      track.append(bar);
      row.append(element("strong", "", item.extension === "[no extension]" ? "无扩展名" : item.extension), track, element("small", "", item.count + " 个 · " + formatBytes(item.bytes)));
      els["portrait-file-types"].append(row);
    });
  }

  function renderGit(portrait) {
    var git = portrait.vcsState || portrait.gitState || {};
    var changes = parseJsonArray(git.status);
    var providerNames = { git: "Git", hg: "Mercurial", svn: "Subversion" };
    var facts = [
      ["管理工具", providerNames[git.provider] || "未检测到"],
      ["远程仓库", portrait.project.remoteUrl || "未配置"],
      ["当前分支", git.branch || "不可用"],
      ["版本", git.revision ? git.revision.slice(0, 12) : (git.head ? git.head.slice(0, 12) : "不可用")],
      ["工作区变化", git.status === undefined ? "未捕获" : changes.length + " 项"],
      ["捕获时间", portrait.vcsCapturedAt || portrait.gitCapturedAt ? formatDate(portrait.vcsCapturedAt || portrait.gitCapturedAt) : "尚未捕获"]
    ];
    els["portrait-git"].replaceChildren();
    facts.forEach(function (fact) { els["portrait-git"].append(element("dt", "", fact[0]), element("dd", "", fact[1])); });
  }

  function renderStatusGroups(statuses) {
    var groups = [["项目记忆", statuses.memories], ["记忆候选", statuses.candidates], ["任务", statuses.tasks]];
    els["portrait-knowledge"].replaceChildren();
    groups.forEach(function (group) {
      var section = element("section", "status-group");
      section.append(element("h3", "", group[0]));
      var values = element("div", "status-values");
      var entries = Object.entries(group[1]);
      if (!entries.length) values.append(element("span", "status-value", "暂无数据"));
      entries.forEach(function (entry) {
        var value = element("span", "status-value");
        value.append(element("strong", "", entry[1]), document.createTextNode(statusLabel(entry[0])));
        values.append(value);
      });
      section.append(values); els["portrait-knowledge"].append(section);
    });
  }

  function renderPortraitList(container, items, emptyText, map) {
    container.replaceChildren();
    if (!items.length) { container.append(element("p", "portrait-list-empty", emptyText)); return; }
    items.forEach(function (item) {
      var value = map(item); var row = element("article", "portrait-item");
      row.append(element("strong", "", value.title), element("span", "", value.content), element("small", "", value.meta));
      if (value.actions && value.actions.length) {
        var actions = element("div", "portrait-item-actions");
        value.actions.forEach(function (action) {
          var button = element("button", action.className || "secondary-button", action.label);
          button.type = "button";
          button.addEventListener("click", action.action);
          actions.append(button);
        });
        row.append(actions);
      }
      container.append(row);
    });
  }

  async function indexSelectedProject() {
    var projectId = els["portrait-project"].value;
    if (!projectId) return;
    await mutatePortrait("/api/projects/" + encodeURIComponent(projectId) + "/index", { method: "POST", body: {} }, "项目索引已更新", els["index-project"]);
  }

  async function toggleSelectedWatch() {
    var projectId = els["portrait-project"].value;
    if (!projectId) return;
    var active = Boolean(state.portrait && state.portrait.project.id === projectId && state.portrait.watch);
    await mutatePortrait("/api/projects/" + encodeURIComponent(projectId) + "/watch", active
      ? { method: "DELETE" }
      : { method: "POST", body: { debounceMs: 1000 } }, active ? "文件监听已停止" : "文件监听已启动", els["toggle-watch"]);
  }

  async function reviewCandidate(candidateId, action) {
    var projectId = els["portrait-project"].value;
    await mutatePortrait("/api/projects/" + encodeURIComponent(projectId) + "/candidates/" + encodeURIComponent(candidateId) + "/" + action,
      { method: "POST", body: {} }, action === "accept" ? "候选已接受" : "候选已拒绝");
  }

  async function deleteStaleMemory(memoryId) {
    var projectId = els["portrait-project"].value;
    await mutatePortrait("/api/projects/" + encodeURIComponent(projectId) + "/memories/" + encodeURIComponent(memoryId) + "/status",
      { method: "PATCH", body: { status: "deleted" } }, "过期记忆已标记删除");
  }

  async function updateTask(taskId, action) {
    var projectId = els["portrait-project"].value;
    await mutatePortrait("/api/projects/" + encodeURIComponent(projectId) + "/tasks/" + encodeURIComponent(taskId) + "/" + action,
      { method: "POST", body: {} }, action === "complete" ? "任务已完成" : "任务已取消");
  }

  async function mutatePortrait(path, options, success, control) {
    if (control) control.disabled = true;
    try {
      await fetchJson(path, options);
      await loadPortrait(true);
      toast(success);
    } catch (error) {
      toast(error.message || String(error), true);
    } finally {
      if (control) control.disabled = false;
    }
  }

  function setPortraitMode(mode) {
    if (["overview", "graph"].indexOf(mode) < 0) return;
    els["portrait-overview"].hidden = mode !== "overview";
    els["portrait-graph"].hidden = mode !== "graph";
    document.querySelectorAll(".portrait-mode").forEach(function (button) {
      button.classList.toggle("active", button.dataset.portraitMode === mode);
    });
    if (mode === "graph") {
      loadGraphOverview(false);
      setTimeout(function () { els["portrait-graph"].scrollIntoView({ behavior: "smooth", block: "start" }); }, 0);
    }
  }

  async function loadGraphOverview(force) {
    var projectId = els["portrait-project"].value;
    if (!projectId) return;
    if (!force && state.graphProjectId === projectId && state.graphCy) {
      setTimeout(function () { state.graphCy.resize(); state.graphCy.fit(undefined, 42); }, 0);
      return;
    }
    setGraphLoading(true);
    try {
      var data = await fetchJson(graphPath("") + graphRelationQuery());
      state.graphProjectId = projectId;
      state.graphRoot = null;
      state.graphScope = "files";
      renderGraph(data);
    } catch (error) {
      showGraphError(error.message || String(error));
    }
  }

  async function expandGraph(depth, nodeId) {
    var target = nodeId || state.graphSelectedId;
    if (!target) return;
    setGraphLoading(true);
    try {
      var query = "?node=" + encodeURIComponent(target) + "&depth=" + depth + "&limit=120" + graphRelationSuffix();
      var data = await fetchJson(graphPath("/neighbors") + query);
      state.graphRoot = target;
      state.graphScope = "symbols";
      renderGraph(data);
      if (state.graphCy && state.graphCy.getElementById(target).length) selectGraphNode(target);
    } catch (error) {
      showGraphError(error.message || String(error));
    }
  }

  function reloadGraph(event) {
    if (event && event.target && event.target.type === "checkbox" && !selectedGraphRelations().length) {
      event.target.checked = true;
      toast("至少保留一种关系类型", true);
      return;
    }
    if (state.graphScope === "symbols" && state.graphRoot) expandGraph(1, state.graphRoot);
    else loadGraphOverview(true);
  }

  function renderGraph(data) {
    setGraphLoading(false);
    els["graph-empty"].hidden = data.nodes.length !== 0;
    if (state.graphCy) state.graphCy.destroy();
    state.graphSelectedId = null;
    setGraphDetail(null);
    if (!data.nodes.length) {
      state.graphCy = null;
      updateGraphFooter(data);
      return;
    }
    if (typeof window.cytoscape !== "function") {
      showGraphError("关系图引擎未能加载");
      return;
    }
    state.graphCy = window.cytoscape({
      container: els["code-graph"],
      elements: data.nodes.map(function (node) { return { group: "nodes", data: node }; })
        .concat(data.edges.map(function (edge) { return { group: "edges", data: edge }; })),
      minZoom: .18,
      maxZoom: 3.5,
      boxSelectionEnabled: false,
      style: graphStyles(),
      layout: graphLayoutOptions()
    });
    state.graphCy.on("tap", "node", function (event) { selectGraphNode(event.target.id()); });
    state.graphCy.on("dbltap", "node", function (event) { expandGraph(1, event.target.id()); });
    state.graphCy.on("tap", function (event) {
      if (event.target === state.graphCy) { clearGraphHighlight(); els["graph-details"].classList.remove("open"); }
    });
    state.graphCy.ready(function () { setTimeout(function () { if (state.graphCy) state.graphCy.fit(undefined, 42); }, 20); });
    updateGraphFooter(data);
  }

  function graphStyles() {
    return [
      { selector: "node", style: {
        "background-color": "#176b4d", "border-color": "#0d553b", "border-width": 1,
        "label": "data(label)", "font-family": "Segoe UI, Microsoft YaHei, sans-serif", "font-size": 10,
        "text-wrap": "ellipsis", "text-max-width": 112, "text-valign": "bottom", "text-margin-y": 7,
        "color": "#26312c", "width": "mapData(relationCount, 0, 30, 28, 58)", "height": "mapData(relationCount, 0, 30, 28, 58)"
      }},
      { selector: "node[nodeType = 'file']", style: {
        "shape": "round-rectangle", "background-color": "#245245", "border-color": "#173d33",
        "width": "mapData(symbolCount, 0, 40, 42, 82)", "height": "mapData(symbolCount, 0, 40, 30, 54)",
        "color": "#17211d", "font-weight": 700
      }},
      { selector: "node[kind = 'class']", style: { "background-color": "#3377b6", "border-color": "#23547f", "shape": "round-rectangle" }},
      { selector: "node[kind = 'interface']", style: { "background-color": "#a05d08", "border-color": "#744405", "shape": "diamond" }},
      { selector: "node[kind = 'method']", style: { "background-color": "#b27b18", "border-color": "#80580f" }},
      { selector: "node[kind = 'type']", style: { "background-color": "#697c75", "border-color": "#475750", "shape": "hexagon" }},
      { selector: "edge", style: {
        "curve-style": "bezier", "line-color": "#80a393", "target-arrow-color": "#80a393",
        "target-arrow-shape": "triangle", "arrow-scale": .65, "width": "mapData(count, 1, 20, 1, 5)",
        "opacity": .72, "label": "data(count)", "font-size": 8, "color": "#68736e",
        "text-background-color": "#fff", "text-background-opacity": .82, "text-background-padding": 2
      }},
      { selector: "edge[relationType = 'CALLS']", style: { "line-color": "#3377b6", "target-arrow-color": "#3377b6" }},
      { selector: "edge[relationType = 'EXTENDS']", style: { "line-color": "#a05d08", "target-arrow-color": "#a05d08", "line-style": "dashed" }},
      { selector: "edge[relationType = 'IMPLEMENTS']", style: { "line-color": "#a43d52", "target-arrow-color": "#a43d52", "line-style": "dotted" }},
      { selector: ":selected", style: { "border-width": 4, "border-color": "#111a16", "z-index": 20 }},
      { selector: ".dimmed", style: { "opacity": .12 }},
      { selector: ".focused", style: { "opacity": 1, "z-index": 30 } }
    ];
  }

  function graphLayoutOptions() {
    var name = els["graph-layout"].value || "cose";
    if (name === "breadthfirst") return { name: name, directed: true, padding: 48, spacingFactor: 1.15, animate: false };
    if (name === "circle") return { name: name, padding: 48, spacingFactor: 1.1, animate: false };
    return {
      name: "cose", animate: false, randomize: true, padding: 52, quality: "default",
      nodeRepulsion: function () { return 8500; }, idealEdgeLength: function () { return state.graphScope === "files" ? 115 : 90; },
      edgeElasticity: function () { return 90; }, gravity: .28, numIter: 900
    };
  }

  function runGraphLayout() {
    if (!state.graphCy || !state.graphCy.nodes().length) return;
    state.graphCy.layout(graphLayoutOptions()).run();
    setTimeout(function () { if (state.graphCy) state.graphCy.fit(undefined, 42); }, 30);
  }

  function selectGraphNode(nodeId) {
    if (!state.graphCy) return;
    var node = state.graphCy.getElementById(nodeId);
    if (!node.length) return;
    state.graphSelectedId = nodeId;
    state.graphCy.elements().unselect();
    node.select();
    state.graphCy.elements().addClass("dimmed");
    node.closedNeighborhood().removeClass("dimmed").addClass("focused");
    state.graphCy.animate({ center: { eles: node }, duration: 180 });
    loadGraphNodeDetails(nodeId);
  }

  function clearGraphHighlight() {
    if (!state.graphCy) return;
    state.graphCy.elements().removeClass("dimmed focused").unselect();
    state.graphSelectedId = null;
    setGraphDetail(null);
  }

  async function loadGraphNodeDetails(nodeId) {
    try {
      var details = await fetchJson(graphPath("/nodes/" + encodeURIComponent(nodeId)));
      if (state.graphSelectedId === nodeId) setGraphDetail(details);
    } catch (error) { toast(error.message || String(error), true); }
  }

  function setGraphDetail(details) {
    els["graph-detail-body"].replaceChildren();
    els["graph-expand-one"].disabled = !details;
    els["graph-expand-two"].disabled = !details;
    if (!details) {
      els["graph-detail-title"].textContent = "选择节点";
      els["graph-detail-body"].append(element("p", "portrait-list-empty", "选择文件或符号后显示详细信息。"));
      return;
    }
    els["graph-detail-title"].textContent = details.label;
    var facts = element("dl", "graph-facts");
    var values = details.nodeType === "file" ? [
      ["类型", "文件"], ["路径", details.path], ["大小", formatBytes(details.sizeBytes)],
      ["符号", details.symbolCount + " 个"], ["关系", details.relationCount + " 条"], ["索引时间", formatDate(details.indexedAt)]
    ] : [
      ["类型", symbolKindLabel(details.kind)], ["路径", details.sourcePath], ["行号", details.startLine + "–" + details.endLine],
      ["限定名称", details.qualifiedName], ["签名", details.signature || "无"]
    ];
    values.forEach(function (value) { facts.append(element("dt", "", value[0]), element("dd", "", value[1])); });
    els["graph-detail-body"].append(facts);
    if (details.symbols) appendGraphDetailSection("文件符号", details.symbols, function (item) {
      return { title: item.name, content: symbolKindLabel(item.kind), meta: "第 " + item.startLine + "–" + item.endLine + " 行" };
    });
    if (details.outgoing) appendGraphDetailSection("向外关系", details.outgoing, function (item) {
      return { title: item.toName, content: relationLabel(item.relationType), meta: "第 " + item.startLine + " 行" };
    });
    if (details.incoming) appendGraphDetailSection("向内关系", details.incoming, function (item) {
      return { title: item.fromName, content: relationLabel(item.relationType), meta: item.sourcePath + " · 第 " + item.startLine + " 行" };
    });
    if (window.innerWidth <= 640) els["graph-details"].classList.add("open");
  }

  function appendGraphDetailSection(title, items, map) {
    var section = element("section", "graph-detail-section");
    section.append(element("h3", "", title + " · " + items.length));
    if (!items.length) section.append(element("p", "portrait-list-empty", "暂无数据"));
    items.forEach(function (item) {
      var value = map(item); var row = element("div", "graph-detail-entry");
      row.append(element("strong", "", value.title), element("span", "", value.content), element("small", "", value.meta));
      section.append(row);
    });
    els["graph-detail-body"].append(section);
  }

  async function searchGraph(showEmptyError) {
    var query = els["graph-search"].value.trim();
    if (!query) { state.graphSearchResults = []; els["graph-search-results"].hidden = true; return; }
    var sequence = ++state.graphSearchSequence;
    try {
      var data = await fetchJson(graphPath("/search") + "?q=" + encodeURIComponent(query) + "&limit=20");
      if (sequence !== state.graphSearchSequence) return;
      state.graphSearchResults = data.results;
      renderGraphSearchResults(data.results);
      if (showEmptyError && !data.results.length) toast("没有匹配的文件或符号", true);
    } catch (error) { if (sequence === state.graphSearchSequence) toast(error.message || String(error), true); }
  }

  function renderGraphSearchResults(results) {
    els["graph-search-results"].replaceChildren();
    els["graph-search-results"].hidden = !results.length;
    results.forEach(function (result) {
      var button = element("button", "graph-search-result"); button.type = "button";
      button.append(element("strong", "", result.label), element("small", "", (result.nodeType === "file" ? "文件" : symbolKindLabel(result.kind)) + " · " + result.path));
      button.addEventListener("mousedown", function (event) { event.preventDefault(); focusGraphResult(result); });
      els["graph-search-results"].append(button);
    });
  }

  function focusGraphResult(result) {
    els["graph-search-results"].hidden = true;
    els["graph-search"].value = result.label;
    if (state.graphCy && state.graphCy.getElementById(result.id).length) selectGraphNode(result.id);
    else expandGraph(1, result.id);
  }

  function updateGraphFooter(data) {
    els["graph-status"].textContent = data.nodes.length + " 个节点 · " + data.edges.length + " 条关系" + (data.truncated ? " · 已控制规模" : "");
    els["graph-scope"].textContent = data.mode === "files" ? "文件级概览" : "符号级展开";
  }

  function setGraphLoading(loading) {
    els["graph-loading"].hidden = !loading;
    els["graph-empty"].hidden = true;
  }

  function showGraphError(message) {
    setGraphLoading(false);
    els["graph-empty"].hidden = false;
    els["graph-empty"].replaceChildren(element("strong", "", message));
    toast(message, true);
  }

  function resetGraph() {
    if (state.graphCy) state.graphCy.destroy();
    state.graphCy = null; state.graphProjectId = null; state.graphRoot = null;
    state.graphScope = "files"; state.graphSelectedId = null;
    setGraphDetail(null);
  }

  function graphPath(suffix) { return "/api/projects/" + encodeURIComponent(els["portrait-project"].value) + "/graph" + suffix; }
  function graphRelationQuery() { var suffix = graphRelationSuffix(); return suffix ? "?" + suffix.slice(1) : ""; }
  function graphRelationSuffix() { return selectedGraphRelations().map(function (type) { return "&relation=" + encodeURIComponent(type); }).join(""); }
  function selectedGraphRelations() { return [].filter.call(els["graph-relations"].querySelectorAll("input"), function (input) { return input.checked; }).map(function (input) { return input.value; }); }
  function relationLabel(type) { return { IMPORTS: "导入", CALLS: "调用", EXTENDS: "继承", IMPLEMENTS: "实现" }[type] || type; }
  function symbolKindLabel(kind) { return { class: "类", interface: "接口", method: "方法", function: "函数", type: "类型", enum: "枚举" }[kind] || kind || "符号"; }

  function switchView(view) {
    ["portrait", "rules", "context"].forEach(function (name) { document.getElementById(name + "-view").hidden = name !== view; });
    document.querySelectorAll(".tab").forEach(function (button) { button.classList.toggle("active", button.dataset.view === view); });
    if (view === "portrait") loadPortrait(false);
  }

  async function fetchJson(path, options) {
    options = options || {};
    var response = await fetch(path, {
      method: options.method || "GET", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Project-Context-UI": "1" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    var data = await response.json().catch(function () { return { message: "服务返回了无效响应" }; });
    if (!response.ok) throw new Error(data.message || "请求失败");
    return data;
  }

  function addOption(select, value, label) { var option = document.createElement("option"); option.value = value; option.textContent = label; select.append(option); }
  function element(tag, className, text) { var node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = String(text); return node; }
  function metaPill(text) { return element("span", "meta-pill", text); }
  function statusBadge(status) { return element("span", "status-badge " + (status === "active" ? "active" : "inactive"), status.toUpperCase()); }
  function setEditorStatus(status) { els["editor-status"].textContent = status.toUpperCase(); els["editor-status"].className = "status-badge " + (status === "active" ? "active" : "inactive"); }
  function scopeLabel(value) { var found = scopes.find(function (scope) { return scope[0] === value; }); return found ? found[1] : value; }
  function typeLabel(value) { var found = types.find(function (type) { return type[0] === value; }); return found ? found[1] : value; }
  function projectById(id) { return state.projects.find(function (project) { return project.id === id; }); }
  function portraitMetric(value, label) { var item = element("div", "portrait-metric"); item.append(element("strong", "", value), element("span", "", label)); return item; }
  function formatNumber(value) { return Number(value || 0).toLocaleString("zh-CN"); }
  function formatBytes(value) { var bytes = Number(value || 0); if (bytes < 1024) return bytes + " B"; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"; return (bytes / 1048576).toFixed(1) + " MB"; }
  function formatDate(value) { if (!value) return "未知"; var date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false }); }
  function parseJsonArray(value) { try { var parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; } }
  function indexRunLabel(status) { return status === "completed" ? "索引正常" : status === "running" ? "正在索引" : "索引状态：" + status; }
  function statusLabel(status) { var labels = { active: "活跃", accepted: "已接受", pending: "待审核", in_progress: "进行中", completed: "已完成", cancelled: "已取消", stale: "已过期", conflicted: "有冲突", rejected: "已拒绝", superseded: "已替代", deleted: "已删除" }; return labels[status] || status; }
  function summaryStat(label, value) { var item = element("span", "summary-stat"); item.append(element("strong", "", value), document.createTextNode(label)); return item; }
  function errorState(message) { var node = element("div", "empty-state"); node.append(element("strong", "", message), element("span", "", "确认通过 project-context ui 启动，并使用启动时打开的地址。")); return node; }
  function toast(message, error) { els.toast.textContent = message; els.toast.className = "toast show" + (error ? " error" : ""); clearTimeout(toast.timer); toast.timer = setTimeout(function () { els.toast.className = "toast"; }, 3200); }
})();`;
