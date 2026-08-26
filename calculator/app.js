(function () {
  var LOCALES = [['en','English'],['ko','한국어'],['ja','日本語'],['zh','简体中文'],['zh-Hant','繁體中文'],
    ['ar','اللغة العربية'],['id','Bahasa Indonesia'],['th','ไทย'],['vi','Tiếng Việt'],['tr','Türkçe'],
    ['de','Deutsch'],['fr','Français'],['es','Español'],['pt','Português'],['it','Italiano'],['ru','Русский']]
  var RTL = ['ar']
  var locale = 'en', data = null, spec = null, state = null, STR = {}
  function t (k) { var m = STR[k]; return (m && (m[locale] || m.en)) || '' }

  function pick (m, fb) { return (m && (m[locale] || m.en)) || fb || '' }
  function range (lo, hi) { var a = []; for (var i = lo; i <= hi; i++) a.push(i); return a }
  function sum (arr, from, to) { var n = 0; for (var i = from; i < to; i++) n += (arr[i] || 0); return n }

  var SPECS = {
    'precision-parts': {
      data: 'precision-parts',
      title: 'Precision Parts Calculator',
      subtitle: 'Pick the buildings you want to raise and the industry levels you are moving between.',
      entityKey: 'building',
      materials: function (d) { return [{ key: 'parts', name: pick(d.material.names) }] },
      entities: function (d) {
        return d.buildings.map(function (b) { return { value: b.id, label: pick(b.names, b.id), desc: pick(b.descriptions) } })
      },
      levels: function () {
        return { from: range(30, 79), to: range(31, 80), label: function (i) { return 'Lv.' + i + '  ·  i' + Math.floor((i - 30) / 5) } }
      },
      cost: function (d, id, from, to) {
        var b = d.buildings.filter(function (x) { return x.id === id })[0]
        var out = []
        for (var band = 0; band < b.bands.length; band++) {
          var lo = 30 + band * 5, hi = lo + 5
          var a = Math.max(lo, from), z = Math.min(hi, to)
          if (z <= a) continue
          var per = b.bands[band].perLevel
          out.push({ label: 'Lv.' + a + '→' + z, detail: 'i' + band + '→i' + (band + 1) + ' · ' + per + '/lv',
            per: per, amounts: { parts: per * (z - a) } })
        }
        return out
      }
    },
    'vehicle-level': {
      data: 'vehicle',
      title: 'Vehicle Level Calculator',
      subtitle: 'Gears needed to raise your vehicle. Cost is charged per button press, not per level.',
      entityKey: null,
      materials: function (d) { return [{ key: 'gear', name: pick(d.materials.gear) }] },
      entities: null,
      levels: function (d) { return { from: range(1, 499), to: range(2, 500), label: function (i) { return 'Lv.' + i } } },
      cost: function (d, _id, from, to) {
        var L = d.level, steps = [], chunk = 25
        for (var a = from; a < to; a += chunk) {
          var b = Math.min(a + chunk, to)
          var gears = L.cumulative[b - 1] - L.cumulative[a - 1]
          var presses = sum(L.presses, a, b)
          steps.push({ label: 'Lv.' + a + '→' + b, detail: presses.toLocaleString() + ' presses', per: null, amounts: { gear: gears } })
        }
        return steps
      },
      extra: function (d, rows) {
        var p = 0
        rows.forEach(function (r) { p += sum(d.level.presses, r.from, r.to) })
        return p ? p.toLocaleString() + ' button presses in total' : ''
      }
    },
    'vehicle-parts': {
      data: 'vehicle',
      title: 'Vehicle Parts Calculator',
      subtitle: 'Titanium Alloy and Design Blueprints for each of the six vehicle parts.',
      entityKey: 'part',
      materials: function (d) { return [{ key: 'ti', name: pick(d.materials.titanium) }, { key: 'bp', name: pick(d.materials.blueprint) }] },
      entities: function (d) { return d.parts.slots.map(function (s) { return { value: String(s.slot), label: pick(s.names), desc: '' } }) },
      levels: function () { return { from: range(0, 65), to: range(1, 66), label: function (i) { return 'Lv.' + i } } },
      cost: function (d, _id, from, to) {
        var P = d.parts, steps = [], chunk = 10
        for (var a = from; a < to; a += chunk) {
          var b = Math.min(a + chunk, to)
          steps.push({ label: 'Lv.' + a + '→' + b, detail: '', per: null, amounts: { ti: sum(P.titanium, a, b), bp: sum(P.blueprint, a, b) } })
        }
        return steps
      }
    },
    'hero-weapon': {
      data: 'hero-weapons',
      title: 'Hero Weapon Calculator',
      subtitle: 'Exclusive weapon fragments. Each weapon consumes its own hero-specific fragment.',
      entityKey: 'select_weapon',
      materials: function () { return [{ key: 'frag', name: t('fragment') }] },
      entities: function (d) {
        return d.weapons.map(function (x) { return { value: x.group, label: pick(x.names, x.group), desc: x.hero || '' } })
      },
      levels: function () { return { from: range(0, 51), to: range(1, 52), label: function (i) { return 'Lv.' + i + (i === 26 ? '  · red' : '') } } },
      cost: function (d, _id, from, to) {
        var byLevel = {}; d.levels.forEach(function (x) { byLevel[x.level] = x })
        return d.bands.filter(function (b) {
          var lo = +String(b.levels).split('-')[0], hi = +String(b.levels).split('-').pop()
          return hi > from && lo <= to
        }).map(function (b) {
          var lo = +String(b.levels).split('-')[0], hi = +String(b.levels).split('-').pop()
          var a = Math.max(lo, from + 1), z = Math.min(hi, to), n = 0
          for (var i = a; i <= z; i++) n += (byLevel[i] || {}).cost || 0
          return { label: 'Lv.' + a + '→' + z, detail: 'band ' + b.band, per: null, amounts: { frag: n } }
        }).filter(function (s) { return s.amounts.frag > 0 })
      }
    },
    'hero-stars': {
      data: 'hero-stars',
      title: 'Hero Star Calculator',
      subtitle: 'Fragments to raise a hero between star levels. Every hero shares the same ladder.',
      entityKey: null,
      materials: function () { return [{ key: 'frag', name: t('fragment') }] },
      entities: null,
      levels: function (d) {
        var label = function (g) {
          if (g >= 25) return '5★'
          var b = d.bands[Math.floor(g / 5)], t = b && b.ticks && b.ticks[g % 5]
          var rank = t ? pick(t.rankNames) : ''
          return Math.floor(g / 5) + '★' + (rank ? '  ·  ' + rank : '  ·  ' + (g % 5) + '/5')
        }
        return { from: range(0, 24), to: range(1, 25), label: label }
      },
      cost: function (d, _id, from, to) {
        var out = []
        for (var bi = 0; bi < d.bands.length; bi++) {
          var lo = bi * 5, hi = lo + 5
          var a = Math.max(lo, from), z = Math.min(hi, to)
          if (z <= a) continue
          var n = 0
          for (var g = a; g < z; g++) n += d.bands[bi].tickCosts[g - lo]
          out.push({ label: bi + '★→' + (bi + 1) + '★', detail: (z - a) + ' of 5 ticks', per: null, amounts: { frag: n } })
        }
        return out
      }
    },
    'hero-equipment': {
      data: 'hero-equipment',
      title: 'Hero Equipment Calculator',
      subtitle: 'Promotion consumes Power Cores, Boost Ore and DX-Blueprints. Levelling consumes Boost Ore only.',
      entityKey: 'equipment',
      materials: function (d) {
        return [{ key: 'pc', name: pick(d.materials.powerCore) }, { key: 'bo', name: pick(d.materials.boostOre) }, { key: 'dx', name: pick(d.materials.dxBlueprint) }]
      },
      entities: function (d) {
        var out = [{ value: 'promote', label: t('rank') + ' 0–36', desc: '' }]
        d.upgrade.curves.forEach(function (c) {
          out.push({ value: 'upgrade-' + c.quality, label: t('level') + ' 0–' + c.maxLevel + ' · Q' + c.quality, desc: '' })
        })
        return out
      },
      levelsFor: function (d, id) {
        if (id === 'promote') {
          var rows = d.promote.rows
          var label = function (i) {
            var r = rows[i]
            return r ? 'R' + r.rank + '  ·  g' + r.grade : 'R' + i
          }
          return { from: range(0, 35), to: range(1, 36), label: label }
        }
        var q = +id.split('-')[1]
        var c = d.upgrade.curves.filter(function (x) { return x.quality === q })[0]
        return { from: range(0, c.maxLevel - 1), to: range(1, c.maxLevel), label: function (i) { return 'Lv.' + i } }
      },
      cost: function (d, id, from, to) {
        if (id === 'promote') {
          var rows = d.promote.rows.filter(function (r) { return r.level >= from && r.level < to })
          var chunk = 6, steps = []
          for (var i = 0; i < rows.length; i += chunk) {
            var part = rows.slice(i, i + chunk)
            steps.push({ label: 'Rank ' + part[0].level + '→' + part[part.length - 1].level, detail: '', per: null,
              amounts: { pc: part.reduce(function (n, r) { return n + r.powerCore }, 0),
                         bo: part.reduce(function (n, r) { return n + r.boostOre }, 0),
                         dx: part.reduce(function (n, r) { return n + r.dxBlueprint }, 0) } })
          }
          return steps
        }
        var q = +id.split('-')[1]
        var c = d.upgrade.curves.filter(function (x) { return x.quality === q })[0]
        return [{ label: 'Lv.' + from + '→' + to, detail: 'quality ' + q, per: null, amounts: { bo: sum(c.costPerLevel, from, to) } }]
      }
    },
    'vehicle-chips': {
      data: 'vehicle-chips',
      title: 'Vehicle Chip Calculator',
      subtitle: 'Duplicate chips needed to star up. Purple and orange share one ladder but very different chip EXP.',
      entityKey: 'chip',
      materials: function () { return [{ key: 'dup', name: t('chip') }] },
      entities: function (d) {
        return d.chips.filter(function (c) { return c.colour === 'purple' || c.colour === 'orange' })
          .map(function (c) { return { value: c.id, label: pick(c.names, c.id), desc: c.colour + ' · slot ' + c.slot } })
      },
      levels: function (d) {
        var per = d.gradesPerStar || 10
        var label = function (g) {
          if (g >= per * d.maxStar) return d.maxStar + '★'
          var st = Math.floor(g / per), gr = g % per
          return st + '★' + (gr ? '  ·  ' + gr + '/' + per : '')
        }
        return { from: range(0, per * 10 - 1), to: range(1, per * 10), label: label }
      },
      cost: function (d, id, from, to) {
        var per = d.gradesPerStar || 10
        var chip = d.chips.filter(function (c) { return c.id === id })[0]
        var lad = d.ladders.filter(function (l) { return l.colour === (chip && chip.colour) })[0] || d.ladders[0]
        var out = []
        lad.stars.forEach(function (s) {
          var n = 0
          ;(s.charges || []).forEach(function (ch) {
            var pos = s.from * per + ch.grade
            if (pos >= from && pos < to) n += ch.chips
          })
          if (n) out.push({ label: s.from + '★→' + s.to + '★', detail: s.exp ? s.exp.toLocaleString() + ' chip EXP' : '', per: null, amounts: { dup: n } })
        })
        return out
      }
    }
  }

  function detectLocale () {
    try {
      var v = localStorage.getItem('i18nextLng')
      if (v && LOCALES.some(function (l) { return l[0] === v })) return v
      var raw = localStorage.getItem('dws-planner-storage')
      if (raw) { var s = JSON.parse(raw); var L = s && s.state && s.state.language
        if (L && LOCALES.some(function (l) { return l[0] === L })) return L }
    } catch (e) {}
    return 'en'
  }
  function storeKey () { return 'dws-calc-' + spec.id }
  function load () {
    state = { rows: [], have: {}, open: false }
    try { var raw = localStorage.getItem(storeKey()); if (raw) { var s = JSON.parse(raw); if (s && Array.isArray(s.rows)) state = s } } catch (e) {}
    if (!state.have) state.have = {}
  }
  function save () { try { localStorage.setItem(storeKey(), JSON.stringify(state)) } catch (e) {} }
  function fmt (n) { return (n || 0).toLocaleString(locale === 'zh-Hant' ? 'zh-Hant' : locale) }

  function ents () { return spec.entities ? spec.entities(data) : null }
  function lv (id) { return spec.levelsFor ? spec.levelsFor(data, id) : spec.levels(data, id) }
  function newRow () {
    var e = ents()
    var id = null
    if (e) {
      var taken = state.rows.map(function (r) { return r.id })
      var free = e.filter(function (x) { return taken.indexOf(x.value) < 0 })[0] || e[0]
      id = free.value
    }
    var l = lv(id)
    return { id: id, from: l.from[0], to: l.to[0] }
  }
  function steps (r) { return spec.cost(data, r.id, r.from, r.to) || [] }
  function totals () {
    var out = {}
    state.rows.forEach(function (r) {
      steps(r).forEach(function (s) {
        Object.keys(s.amounts).forEach(function (k) { out[k] = (out[k] || 0) + s.amounts[k] })
      })
    })
    return out
  }

  function sel (cls, opts, value, onChange, aria) {
    var s = document.createElement('select')
    s.className = cls
    if (aria) s.setAttribute('aria-label', aria)
    opts.forEach(function (o) {
      var el = document.createElement('option')
      el.value = String(o.value); el.textContent = o.label
      if (o.disabled) el.disabled = true
      if (String(o.value) === String(value)) el.selected = true
      s.appendChild(el)
    })
    s.onchange = function () { onChange(s.value) }
    return s
  }

  function render () {
    var host = document.getElementById('rows')
    host.innerHTML = ''
    if (!state.rows.length) {
      var e = document.createElement('div')
      e.className = 'glass-card text-center text-theme-muted text-sm py-8'
      e.textContent = t('empty')
      host.appendChild(e)
    }
    var entities = ents()
    state.rows.forEach(function (r, idx) {
      var card = document.createElement('div')
      card.className = 'glass-card row-enter'
      var ent = entities && entities.filter(function (x) { return x.value === r.id })[0]

      var head = document.createElement('div')
      head.className = 'flex items-start gap-2 mb-3'
      if (entities) {
        var taken = state.rows.map(function (x) { return x.id })
        head.appendChild(sel('flex-1 min-w-0 bg-dark-card border border-dark-border rounded-md px-3 py-3 text-sm font-semibold',
          entities.map(function (x) { return { value: x.value, label: x.label, disabled: x.value !== r.id && taken.indexOf(x.value) >= 0 } }),
          r.id, function (v) {
            r.id = v
            var l = lv(v)
            if (l.from.indexOf(r.from) < 0) r.from = l.from[0]
            if (l.to.indexOf(r.to) < 0 || r.to <= r.from) r.to = l.to[l.to.length - 1]
            save(); render()
          }, spec.entityKey ? t(spec.entityKey) : ''))
      } else {
        var soloLabel = document.createElement('div')
        soloLabel.className = 'flex-1 text-sm font-semibold py-3'
        soloLabel.textContent = t('title_' + spec.id.replace(/-/g, '_')) || spec.title
        head.appendChild(soloLabel)
      }
      if (entities) {
        var del = document.createElement('button')
        del.className = 'shrink-0 w-11 h-11 rounded-md bg-dark-card border border-dark-border text-theme-muted hover:bg-dark-card-hover transition'
        del.setAttribute('aria-label', 'Remove row')
        del.innerHTML = '<svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
        del.onclick = function () { state.rows.splice(idx, 1); save(); render() }
        head.appendChild(del)
      }
      card.appendChild(head)

      if (ent && ent.desc) {
        var p = document.createElement('p')
        p.className = 'text-xs text-theme-muted -mt-2 mb-3 line-clamp-2'
        p.textContent = ent.desc
        card.appendChild(p)
      }

      var l = lv(r.id)
      var grid = document.createElement('div')
      grid.className = 'grid grid-cols-2 gap-2'
      var fw = document.createElement('div')
      fw.innerHTML = '<label class="block text-xs uppercase tracking-wide text-theme-muted mb-1">' + t('from') + '</label>'
      fw.appendChild(sel('w-full bg-dark-card border border-dark-border rounded-md px-2 py-3 text-sm',
        l.from.map(function (i) { return { value: i, label: l.label(i) } }), r.from,
        function (v) { r.from = +v; if (r.to <= r.from) r.to = l.to.filter(function (x) { return x > r.from })[0]; save(); render() }, t('from')))
      var tw = document.createElement('div')
      tw.innerHTML = '<label class="block text-xs uppercase tracking-wide text-theme-muted mb-1">' + t('to') + '</label>'
      tw.appendChild(sel('w-full bg-dark-card border border-dark-border rounded-md px-2 py-3 text-sm',
        l.to.map(function (i) { return { value: i, label: l.label(i), disabled: i <= r.from } }), r.to,
        function (v) { r.to = +v; save(); render() }, t('to')))
      grid.appendChild(fw); grid.appendChild(tw)
      card.appendChild(grid)

      var st = steps(r)
      var per = {}
      st.forEach(function (s) { Object.keys(s.amounts).forEach(function (k) { per[k] = (per[k] || 0) + s.amounts[k] }) })
      var foot = document.createElement('div')
      foot.className = 'mt-3 pt-3 border-t border-dark-border flex items-baseline justify-between gap-2 flex-wrap'
      foot.innerHTML = '<span class="text-xs text-theme-muted">' + l.label(r.from) + ' → ' + l.label(r.to) + '</span>' +
        '<span class="text-base font-semibold tabular">' + spec.materials(data).filter(function (m) { return per[m.key] })
          .map(function (m) { return fmt(per[m.key]) + ' <span class="text-xs text-theme-muted font-normal">' + m.name + '</span>' }).join(' &middot; ') + '</span>'
      card.appendChild(foot)
      host.appendChild(card)
    })
    renderTotals(); renderBreakdown()
  }

  function renderTotals () {
    var tot = totals(), mats = spec.materials(data)
    var box = document.getElementById('totals')
    box.innerHTML = ''
    mats.forEach(function (m) {
      var row = document.createElement('div')
      row.className = 'flex items-baseline justify-between gap-3'
      row.innerHTML = '<span class="text-xs text-theme-muted truncate">' + m.name + '</span>' +
        '<span class="text-xl font-bold text-accent tabular">' + fmt(tot[m.key] || 0) + '</span>'
      box.appendChild(row)
    })
    var ex = spec.extra ? spec.extra(data, state.rows) : ''
    document.getElementById('extra').textContent = ex || ''

    var hv = document.getElementById('have')
    hv.innerHTML = ''
    mats.forEach(function (m) {
      var wrap = document.createElement('div')
      wrap.className = 'flex items-center justify-between gap-3 py-1'
      var lab = document.createElement('label')
      lab.className = 'text-sm text-theme-muted truncate'
      lab.textContent = m.name
      lab.htmlFor = 'have-' + m.key
      var right = document.createElement('div')
      right.className = 'flex items-center gap-2 shrink-0'
      var inp = document.createElement('input')
      inp.id = 'have-' + m.key; inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'off'
      inp.placeholder = '0'
      inp.className = 'w-24 bg-dark-card border border-dark-border rounded-md px-2 py-2 text-right text-sm tabular'
      inp.value = state.have[m.key] || ''
      inp.oninput = function () {
        state.have[m.key] = inp.value.replace(/[^0-9]/g, ''); inp.value = state.have[m.key]; save(); renderTotals()
      }
      var out = document.createElement('span')
      out.className = 'text-xs w-24 text-end'
      var need = tot[m.key] || 0, got = parseInt(state.have[m.key] || '0', 10) || 0
      if (!state.have[m.key]) { out.textContent = ''; }
      else if (got >= need) { out.textContent = t('covered'); out.classList.add('text-green-400') }
      else { out.textContent = t('short') + ' ' + fmt(need - got); out.classList.add('text-accent') }
      right.appendChild(inp); right.appendChild(out)
      wrap.appendChild(lab); wrap.appendChild(right)
      hv.appendChild(wrap)
    })
  }

  function renderBreakdown () {
    var host = document.getElementById('breakdown')
    var mats = spec.materials(data)
    if (!state.rows.length) { host.innerHTML = '<p class="text-sm text-theme-muted px-1">Nothing selected yet.</p>'; return }
    var entities = ents()
    var html = '<table class="w-full text-sm border-collapse"><thead><tr class="text-theme-muted text-xs uppercase tracking-wide">' +
      (entities ? '<th class="text-start py-2 pe-3">' + (spec.entityKey ? t(spec.entityKey) : '') + '</th>' : '') +
      '<th class="text-start py-2 pe-3">' + t('level') + '</th><th class="text-start py-2 pe-3"></th>' +
      mats.map(function (m) { return '<th class="text-end py-2 pe-3">' + m.name + '</th>' }).join('') + '</tr></thead><tbody>'
    state.rows.forEach(function (r) {
      var ent = entities && entities.filter(function (x) { return x.value === r.id })[0]
      steps(r).forEach(function (s, i) {
        html += '<tr class="border-t border-dark-border">' +
          (entities ? '<td class="py-2 pe-3 whitespace-nowrap">' + (i === 0 && ent ? ent.label : '') + '</td>' : '') +
          '<td class="py-2 pe-3 text-theme-muted whitespace-nowrap">' + s.label + '</td>' +
          '<td class="py-2 pe-3 text-theme-muted whitespace-nowrap">' + (s.detail || '') + '</td>' +
          mats.map(function (m) { return '<td class="py-2 pe-3 text-end tabular">' + (s.amounts[m.key] ? fmt(s.amounts[m.key]) : '·') + '</td>' }).join('') +
          '</tr>'
      })
    })
    var tot = totals()
    html += '</tbody><tfoot><tr class="border-t-2 border-dark-border">' +
      '<td class="py-2 font-semibold" colspan="' + (entities ? 3 : 2) + '">' + t('total') + '</td>' +
      mats.map(function (m) { return '<td class="py-2 pe-3 text-end font-bold text-accent tabular">' + fmt(tot[m.key] || 0) + '</td>' }).join('') +
      '</tr></tfoot></table>'
    host.innerHTML = html
  }

  function applyChrome () {
    var heading = t('title_' + spec.id.replace(/-/g, '_')) || spec.title
    document.getElementById('title').textContent = heading
    document.getElementById('subtitle').textContent = spec.id === 'vehicle-level' ? t('per_press') : ''
    document.title = heading + ' · DWS Planner'
    document.getElementById('backLabel').textContent = t('calculators')
    document.getElementById('ownedLabel').textContent = t('owned')
    document.getElementById('totalLabel').textContent = t('total_needed')
    document.getElementById('add').textContent = '+ ' + t('add_row')
    document.getElementById('reset').textContent = t('reset')
    document.querySelector('label[for="lang"]').textContent = t('language')
    document.getElementById('toggleBreak').querySelector('span').textContent = t('details')
    document.getElementById('meta').textContent = 'Dark War Survival ' + data.apkBuild + ' · ' + t('note')
  }

  function boot () {
    applyChrome()

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
      applyChrome(); render()
    }

    load()
    var valid = ents()
    if (valid) state.rows = state.rows.filter(function (r) { return valid.some(function (x) { return x.value === r.id }) })
    state.rows.forEach(function (r) {
      var l = lv(r.id)
      if (l.from.indexOf(r.from) < 0) r.from = l.from[0]
      if (l.to.indexOf(r.to) < 0 || r.to <= r.from) {
        r.to = l.to.filter(function (x) { return x > r.from })[0] || l.to[l.to.length - 1]
      }
    })
    if (!state.rows.length) state.rows = [newRow()]

    var addBtn = document.getElementById('add')
    if (!ents()) addBtn.hidden = true
    addBtn.onclick = function () {
      var e = ents()
      if (e && state.rows.length >= e.length) return
      if (!e && state.rows.length >= 1) return
      state.rows.push(newRow()); save(); render()
    }
    document.getElementById('reset').onclick = function () {
      state = { rows: [newRow()], have: {}, open: state.open }; save(); render()
    }
    var tb = document.getElementById('toggleBreak'), bd = document.getElementById('breakdown')
    function applyOpen () {
      bd.hidden = !state.open
      tb.setAttribute('aria-expanded', String(!!state.open))
      document.getElementById('chev').style.transform = state.open ? 'rotate(180deg)' : ''
    }
    tb.onclick = function () { state.open = !state.open; save(); applyOpen() }
    applyOpen()

    render()
  }

  var id = document.body.getAttribute('data-calc')
  spec = SPECS[id]
  if (!spec) return
  spec.id = id
  locale = detectLocale()
  document.documentElement.lang = locale
  document.documentElement.dir = RTL.indexOf(locale) >= 0 ? 'rtl' : 'ltr'

  Promise.all([
    fetch('/data/' + spec.data + '.json').then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() }),
    fetch('/data/calc-i18n.json').then(function (r) { return r.ok ? r.json() : { strings: {} } }).catch(function () { return { strings: {} } })
  ]).then(function (res) { data = res[0]; STR = res[1].strings || {} })
    .catch(function (err) {
      document.getElementById('rows').innerHTML = '<div class="glass-card text-sm text-theme-muted">' + (t('error') || 'Could not load the data.') + '</div>'
      console.error('calculator data load failed', err)
    })
    .then(function () { if (data) boot() })
})()
