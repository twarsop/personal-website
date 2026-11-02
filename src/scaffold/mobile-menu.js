const burger = document.querySelector('.burger');

burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    burger.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    const menu = document.querySelector('.menu');
    menu.classList.toggle('is-open', !open);
});