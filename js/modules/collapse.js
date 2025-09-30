// js/modules/collapse.js
(function() {
    'use strict';

    function findClosest(el, selector) {
        while (el) {
            if (el.matches(selector)) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    function toggleCollapse(element, show) {
        if (!element) return;
        const isShown = element.classList.contains('show');
        if (typeof show !== 'boolean') {
            show = !isShown;
        }

        const button = document.querySelector(`[data-toggle="collapse"][data-target="#${element.id}"]`);

        if (show) {
            if (isShown) return;

            // Preparar a animação suave
            element.style.height = '0px';
            element.style.overflow = 'hidden';
            element.style.transition = 'height 0.35s ease-out, opacity 0.25s ease-out';
            element.style.opacity = '0';
            element.classList.add('collapsing');
            element.classList.remove('collapse');
            element.classList.add('show');

            // Trigger reflow para garantir que as mudanças de CSS foram aplicadas
            element.offsetHeight;

            // Calcular altura final e animar
            const finalHeight = element.scrollHeight + 'px';
            element.style.height = finalHeight;
            element.style.opacity = '1';

            element.addEventListener('transitionend', function onEnd(e) {
                if (e.target === element && e.propertyName === 'height') {
                    element.removeEventListener('transitionend', onEnd);
                    element.classList.remove('collapsing');
                    element.classList.add('collapse');
                    element.style.height = '';
                    element.style.overflow = '';
                    element.style.transition = '';
                    element.style.opacity = '';
                    if (button) {
                        button.setAttribute('aria-expanded', 'true');
                        button.classList.remove('collapsed');
                    }
                }
            });

        } else {
            if (!isShown) return;

            // Preparar para colapsar
            element.style.height = element.scrollHeight + 'px';
            element.style.overflow = 'hidden';
            element.style.transition = 'height 0.35s ease-in, opacity 0.25s ease-in';
            element.classList.add('collapsing');
            element.classList.remove('collapse', 'show');

            // Trigger reflow
            element.offsetHeight;

            // Animar para altura 0
            element.style.height = '0px';
            element.style.opacity = '0.3';

            element.addEventListener('transitionend', function onEnd(e) {
                if (e.target === element && e.propertyName === 'height') {
                    element.removeEventListener('transitionend', onEnd);
                    element.classList.remove('collapsing');
                    element.classList.add('collapse');
                    element.style.height = '';
                    element.style.overflow = '';
                    element.style.transition = '';
                    element.style.opacity = '';
                    if (button) {
                        button.setAttribute('aria-expanded', 'false');
                        button.classList.add('collapsed');
                    }
                }
            });
        }
    }

    document.addEventListener('click', function(event) {
        const trigger = findClosest(event.target, '[data-toggle="collapse"]');
        if (!trigger) return;

        event.preventDefault();
        event.stopPropagation();

        const targetSelector = trigger.getAttribute('data-target');
        if (!targetSelector) return;

        const targetElement = document.querySelector(targetSelector);
        if (!targetElement) return;

        const parentSelector = trigger.getAttribute('data-parent') || targetElement.getAttribute('data-parent');
        if (parentSelector) {
            const parentElement = findClosest(trigger, parentSelector) || document.querySelector(parentSelector);
            if (parentElement) {
                const openElements = parentElement.querySelectorAll('.collapse.show');
                openElements.forEach(openEl => {
                    if (openEl !== targetElement) {
                        toggleCollapse(openEl, false);
                    }
                });
            }
        }

        toggleCollapse(targetElement);
    });

    window.Collapse = {
        toggle: toggleCollapse
    };

})();
