(function () {
  // minified client bundle
  var API_BASE = "https://api.example.com";
  var AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
  function boot() { return fetch(API_BASE, { headers: { "x-key": AWS_KEY } }); }
  window.__app = { boot: boot };
})();
