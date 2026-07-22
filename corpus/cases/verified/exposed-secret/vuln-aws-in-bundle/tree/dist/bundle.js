(function () {
  // minified client bundle
  var API_BASE = "https://api.example.com";
  var AWS_KEY = "AKIA7Q3XZ9J4M8K2W5RT";
  function boot() { return fetch(API_BASE, { headers: { "x-key": AWS_KEY } }); }
  window.__app = { boot: boot };
})();
