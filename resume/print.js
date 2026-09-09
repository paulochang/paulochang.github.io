(function () {
  var btn = document.getElementById("print-btn");
  if (!btn) return;
  btn.addEventListener("click", function () {
    window.print();
  });
})();
