// Maison Anara — script partagé (menu mobile + année)
document.querySelectorAll('#annee').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});

var burger = document.querySelector('.burger');
var menu = document.getElementById('menu');
if (burger && menu) {
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
