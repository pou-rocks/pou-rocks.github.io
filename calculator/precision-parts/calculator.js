(function () {
  var LOCALES = [['en','English'],['ko','한국어'],['ja','日本語'],['zh','简体中文'],['zh-Hant','繁體中文'],
    ['ar','اللغة العربية'],['id','Bahasa Indonesia'],['th','ไทย'],['vi','Tiếng Việt'],['tr','Türkçe'],
    ['de','Deutsch'],['fr','Français'],['es','Español'],['pt','Português'],['it','Italiano'],['ru','Русский']]
  var RTL = ['ar']
  var STORE = 'dws-precision-calc'
  var data = null, state = { rows: [], have: '', open: false }, locale = 'en'

  function detectLocale () {
    try {
      var v = localStorage.getItem('i18nextLng')
      if (v && LOCALES.some(function (l) { return l[0] === v })) return v
      var raw = localStorage.getItem('dws-planner-storage')
      if (raw) {
        var s = JSON.parse(raw)
        var L = s && s.state && s.state.language
        if (L && LOCALES.some(function (l) { return l[0] === L })) return L
      }
    } catch (e) {}
    var n = (navigator.language || 'en').toLowerCase()
    for (var i = 0; i < LOCALES.length; i++) if (n.indexOf(LOCALES[i][0].toLowerCase()) === 0) return LOCALES[i][0]
    return 'en'
  }

  function load () {
    try {
      var raw = localStorage.getItem(STORE)
      if (raw) { var s = JSON.parse(raw); if (s && Array.isArray(s.rows)) state = s }
    } catch (e) {}
  }
  function save () { try { localStorage.setItem(STORE, JSON.stringify(state)) } catch (e) {} }

  var fmt = function (n) { return n.toLocaleString(locale === 'zh-Hant' ? 'zh-Hant' : locale) }
  var name = function (b) { return (b.names && (b.names[locale] || b.names.en)) || b.id }
  var desc = function (b) { return b.descriptions && (b.descriptions[locale] || b.descriptions.en) || '' }
  var material = function () { return (data.material.names[locale] || data.material.names.en) }
  var buildingById = function (id) { for (var i = 0; i < data.buildings.length; i++) if (data.buildings[i].id === id) return data.buildings[i] }

  function cost (b, from, to) {
    var n = 0
    for (var i = 0; i < b.bands.length; i++) { var x = b.bands[i]; if (x.band > from && x.band <= to) n += x.total }
    return n
  }
  function bandsUsed (b, from, to) {
    return b.bands.filter(function (x) { return x.band > from && x.band <= to })
  }
  var buildingLevel = function (ind) { return 30 + 5 * ind }

  function used () { return state.rows.map(function (r) { return r.id }) }
  function firstUnused () {
    var u = used()
    for (var i = 0; i < data.buildings.length; i++) if (u.indexOf(data.buildings[i].id) < 0) return data.buildings[i].id
    return null
  }

  function levelOptions (sel, lo, hi, value, disabledBelow) {
    sel.innerHTML = ''
    for (var i = lo; i <= hi; i++) {
      var o = document.createElement('option')
      o.value = String(i)
      o.textContent = 'i' + i + '  ·  Lv.' + buildingLevel(i)
      if (disabledBelow != null && i <= disabledBelow) o.disabled = true
      if (i === value) o.selected = true
      sel.appendChild(o)
    }
  }

  function render () {
    var wrap = document.getElementById('rows')
    wrap.innerHTML = ''
    if (!state.rows.length) {
      var empty = document.createElement('div')
      empty.className = 'glass-card text-center text-theme-muted text-sm py-8'
      empty.textContent = 'No buildings yet — add one to start.'
      wrap.appendChild(empty)
    }
    state.rows.forEach(function (r, idx) {
      var b = buildingById(r.id)
      if (!b) return
      var card = document.createElement('div')
      card.className = 'glass-card row-enter'

      var head = document.createElement('div')
      head.className = 'flex items-start gap-2 mb-3'
      var sel = document.createElement('select')
      sel.className = 'flex-1 min-w-0 bg-dark-card border border-dark-border rounded-md px-3 py-3 text-sm font-semibold'
      sel.setAttribute('aria-label', 'Building')
      data.buildings.forEach(function (x) {
        var o = document.createElement('option')
        o.value = x.id; o.textContent = name(x)
        if (x.id === r.id) o.selected = true
        if (x.id !== r.id && used().indexOf(x.id) >= 0) o.disabled = true
        sel.appendChild(o)
      })
      sel.onchange = function () { r.id = sel.value; save(); render() }
      var del = document.createElement('button')
      del.className = 'shrink-0 w-11 h-11 rounded-md bg-dark-card border border-dark-border text-theme-muted hover:bg-dark-card-hover transition'
      del.setAttribute('aria-label', 'Remove ' + name(b))
      del.innerHTML = '<svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
      del.onclick = function () { state.rows.splice(idx, 1); save(); render() }
      head.appendChild(sel); head.appendChild(del)
      card.appendChild(head)

      var d = desc(b)
      if (d) {
        var p = document.createElement('p')
        p.className = 'text-xs text-theme-muted -mt-2 mb-3 line-clamp-2'
        p.textContent = d
        card.appendChild(p)
      }

      var grid = document.createElement('div')
      grid.className = 'grid grid-cols-2 gap-2'
      var fromWrap = document.createElement('div')
      fromWrap.innerHTML = '<label class="block text-xs uppercase tracking-wide text-theme-muted mb-1">From</label>'
      var fromSel = document.createElement('select')
      fromSel.className = 'w-full bg-dark-card border border-dark-border rounded-md px-2 py-3 text-sm'
      levelOptions(fromSel, 0, 9, r.from, null)
      fromSel.onchange = function () {
        r.from = +fromSel.value
        if (r.to <= r.from) r.to = Math.min(10, r.from + 1)
        save(); render()
      }
      fromWrap.appendChild(fromSel)

      var toWrap = document.createElement('div')
      toWrap.innerHTML = '<label class="block text-xs uppercase tracking-wide text-theme-muted mb-1">To</label>'
      var toSel = document.createElement('select')
      toSel.className = 'w-full bg-dark-card border border-dark-border rounded-md px-2 py-3 text-sm'
      levelOptions(toSel, 1, 10, r.to, r.from)
      toSel.onchange = function () { r.to = +toSel.value; save(); render() }
      toWrap.appendChild(toSel)

      grid.appendChild(fromWrap); grid.appendChild(toWrap)
      card.appendChild(grid)

      var sub = document.createElement('div')
      sub.className = 'mt-3 pt-3 border-t border-dark-border flex items-baseline justify-between'
      var n = cost(b, r.from, r.to)
      var nb = bandsUsed(b, r.from, r.to).length
      sub.innerHTML = '<span class="text-xs text-theme-muted">' + nb + (nb === 1 ? ' band · Lv.' : ' bands · Lv.') +
        buildingLevel(r.from) + ' → Lv.' + buildingLevel(r.to) + '</span>' +
        '<span class="text-lg font-semibold">' + fmt(n) + '</span>'
      card.appendChild(sub)
      wrap.appendChild(card)
    })
    renderTotal()
    renderBreakdown()
  }

  function grandTotal () {
    return state.rows.reduce(function (n, r) {
      var b = buildingById(r.id); return b ? n + cost(b, r.from, r.to) : n
    }, 0)
  }

  function renderTotal () {
    var t = grandTotal()
    document.getElementById('total').textContent = fmt(t)
    document.getElementById('totalUnit').textContent = material()
    var haveN = parseInt(String(state.have).replace(/[^0-9]/g, ''), 10) || 0
    var el = document.getElementById('short')
    if (!state.have) { el.textContent = ''; el.className = 'text-xs mt-1 text-theme-muted'; return }
    var diff = t - haveN
    if (diff <= 0) { el.textContent = 'Covered ✓'; el.className = 'text-xs mt-1 text-green-400' }
    else { el.textContent = 'Short ' + fmt(diff); el.className = 'text-xs mt-1 text-accent' }
  }

  function renderBreakdown () {
    var host = document.getElementById('breakdown')
    if (!state.rows.length) { host.innerHTML = '<p class="text-sm text-theme-muted px-1">Nothing selected yet.</p>'; return }
    var html = '<table class="w-full text-sm border-collapse"><thead><tr class="text-theme-muted text-xs uppercase tracking-wide">' +
      '<th class="text-start py-2 pe-3">Building</th><th class="text-start py-2 pe-3">Band</th>' +
      '<th class="text-start py-2 pe-3">Levels</th><th class="text-end py-2 pe-3">Per level</th>' +
      '<th class="text-end py-2">Subtotal</th></tr></thead><tbody>'
    state.rows.forEach(function (r) {
      var b = buildingById(r.id); if (!b) return
      bandsUsed(b, r.from, r.to).forEach(function (x, i) {
        html += '<tr class="border-t border-dark-border">' +
          '<td class="py-2 pe-3 whitespace-nowrap">' + (i === 0 ? name(b) : '') + '</td>' +
          '<td class="py-2 pe-3 text-theme-muted">i' + (x.band - 1) + '→i' + x.band + '</td>' +
          '<td class="py-2 pe-3 text-theme-muted whitespace-nowrap">' + x.levels + '</td>' +
          '<td class="py-2 pe-3 text-end text-theme-muted">' + fmt(x.perLevel) + '</td>' +
          '<td class="py-2 text-end font-medium">' + fmt(x.total) + '</td></tr>'
      })
    })
    html += '</tbody><tfoot><tr class="border-t-2 border-dark-border"><td colspan="4" class="py-2 font-semibold">Total</td>' +
      '<td class="py-2 text-end font-bold text-accent">' + fmt(grandTotal()) + '</td></tr></tfoot></table>'
    host.innerHTML = html
  }

  function boot () {
    locale = detectLocale()
    document.documentElement.lang = locale
    document.documentElement.dir = RTL.indexOf(locale) >= 0 ? 'rtl' : 'ltr'

    var ls = document.getElementById('lang')
    LOCALES.forEach(function (l) {
      var o = document.createElement('option'); o.value = l[0]; o.textContent = l[1]
      if (l[0] === locale) o.selected = true
      ls.appendChild(o)
    })
    ls.onchange = function () {
      locale = ls.value
      try { localStorage.setItem('i18nextLng', locale) } catch (e) {}
      document.documentElement.lang = locale
      document.documentElement.dir = RTL.indexOf(locale) >= 0 ? 'rtl' : 'ltr'
      render()
    }

    load()
    state.rows = state.rows.filter(function (r) { return buildingById(r.id) })
    document.getElementById('have').value = state.have || ''

    document.getElementById('add').onclick = function () {
      var id = firstUnused()
      if (!id) return
      state.rows.push({ id: id, from: 0, to: 1 }); save(); render()
    }
    document.getElementById('addAll').onclick = function () {
      var u = used()
      data.buildings.forEach(function (b) { if (u.indexOf(b.id) < 0) state.rows.push({ id: b.id, from: 0, to: 10 }) })
      save(); render()
    }
    document.getElementById('reset').onclick = function () {
      state = { rows: [], have: '', open: state.open }
      document.getElementById('have').value = ''
      save(); render()
    }
    document.getElementById('have').oninput = function (e) {
      state.have = e.target.value.replace(/[^0-9]/g, '')
      e.target.value = state.have
      save(); renderTotal()
    }
    var tb = document.getElementById('toggleBreak')
    var bd = document.getElementById('breakdown')
    function applyOpen () {
      bd.hidden = !state.open
      tb.setAttribute('aria-expanded', String(!!state.open))
      tb.querySelector('span').textContent = state.open ? 'Hide band breakdown' : 'Show band breakdown'
      document.getElementById('chev').style.transform = state.open ? 'rotate(180deg)' : ''
    }
    tb.onclick = function () { state.open = !state.open; save(); applyOpen() }
    applyOpen()

    document.getElementById('meta').textContent =
      'Data extracted from Dark War Survival build ' + data.apkBuild +
      ' · ' + data.buildings.length + ' buildings · ' + fmt(data.grandTotal) + ' parts for everything to i10.'

    render()
  }

  fetch('/data/precision-parts.json')
    .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() })
    .then(function (j) { data = j; boot() })
    .catch(function () {
      document.getElementById('rows').innerHTML =
        '<div class="glass-card text-sm text-theme-muted">Could not load the parts data. Try reloading.</div>'
    })
})()
