(function () {
  var RTL = ['ar']
  function detect () {
    try {
      var v = localStorage.getItem('i18nextLng'); if (v) return v
      var raw = localStorage.getItem('dws-planner-storage')
      if (raw) { var s = JSON.parse(raw); if (s && s.state && s.state.language) return s.state.language }
    } catch (e) {}
    return 'en'
  }
  var loc = detect()
  document.documentElement.lang = loc
  document.documentElement.dir = RTL.indexOf(loc) >= 0 ? 'rtl' : 'ltr'
  fetch('/data/calc-i18n.json').then(function (r) { return r.json() }).then(function (j) {
    var S = j.strings
    var t = function (k) { var m = S[k]; return (m && (m[loc] || m.en)) || k }
    document.getElementById('hubTitle').textContent = t('calculators')
    document.getElementById('hubNote').textContent = t('note')
    document.title = t('calculators') + ' · DWS Planner'
    Array.prototype.forEach.call(document.querySelectorAll('[data-slug]'), function (a) {
      var key = 'title_' + a.getAttribute('data-slug').replace(/-/g, '_')
      a.querySelector('[data-label]').textContent = t(key)
    })
  }).catch(function () {})
})()
