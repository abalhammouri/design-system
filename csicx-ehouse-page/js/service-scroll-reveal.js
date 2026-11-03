/**
 * Livelier IntersectionObserver scroll reveals for service pages.
 * Activates when .csi-service-reveal is present.
 */
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Assign direction class based on element type / index.
   * @param {Element} el
   * @param {number} index
   */
  function assignDirection(el, index) {
    if (el.classList.contains('csi-reveal--left') ||
        el.classList.contains('csi-reveal--right') ||
        el.classList.contains('csi-reveal--up') ||
        el.classList.contains('csi-reveal--down')) {
      return;
    }

    var tag = el.tagName.toLowerCase();

    if (el.classList.contains('thumbnail') || el.classList.contains('title-area-left')) {
      el.classList.add('csi-reveal--up');
      return;
    }

    if (el.classList.contains('single-categories') ||
        el.classList.contains('rts-single-wized') ||
        el.classList.contains('wized-header') ||
        el.classList.contains('single-download-area')) {
      el.classList.add('csi-reveal--right');
      return;
    }

    if (el.classList.contains('csi-pillar-service-card')) {
      el.classList.add(index % 2 === 0 ? 'csi-reveal--left' : 'csi-reveal--right');
      return;
    }

    if (el.classList.contains('csi-icon-feature')) {
      el.classList.add('csi-reveal--left');
      return;
    }

    if (el.classList.contains('csi-process-step')) {
      el.classList.add('csi-reveal--up');
      return;
    }

    if (el.classList.contains('csi-value-block')) {
      el.classList.add('csi-reveal--up');
      return;
    }

    if (el.classList.contains('accordion-item')) {
      el.classList.add('csi-reveal--up');
      return;
    }

    if (tag === 'h3' || tag === 'ul') {
      el.classList.add('csi-reveal--left');
      return;
    }

    if (tag === 'p') {
      el.classList.add(index % 2 === 0 ? 'csi-reveal--right' : 'csi-reveal--up');
      return;
    }

    el.classList.add(index % 3 === 0 ? 'csi-reveal--left' : index % 3 === 1 ? 'csi-reveal--right' : 'csi-reveal--up');
  }

  /**
   * Collect reveal targets inside a service page.
   * @param {Element} root
   * @returns {{content: Element[], sidebar: Element[]}}
   */
  function collectTargets(root) {
    var content = [];
    var sidebar = [];

    var hero = root.querySelector('.breadcrumb-service-detals-one .title-area-left');
    if (hero) {
      content.push(hero);
    }

    var left = root.querySelector('.service-details-left-area');
    if (left) {
      Array.prototype.forEach.call(left.children, function (child) {
        if (child.matches('style, script')) {
          return;
        }

        if (child.classList.contains('accordion') || child.classList.contains('faq-wrapper-inner-page')) {
          Array.prototype.forEach.call(child.querySelectorAll('.accordion-item'), function (item) {
            content.push(item);
          });
          return;
        }

        if (child.classList.contains('csi-neta-service-cards')) {
          var heading = child.querySelector('h3');
          if (heading) {
            content.push(heading);
          }
          Array.prototype.forEach.call(child.querySelectorAll('.csi-pillar-service-card'), function (card) {
            content.push(card);
          });
          return;
        }

        // Overview / shared grids: expand cards & value blocks inside wrappers
        var nestedCards = child.querySelectorAll('.csi-pillar-service-card');
        var nestedValues = child.querySelectorAll('.csi-value-block');
        if (nestedCards.length || nestedValues.length) {
          var nestedHeading = child.querySelector('h3.title, h3');
          if (nestedHeading && child.contains(nestedHeading)) {
            content.push(nestedHeading);
          }
          Array.prototype.forEach.call(nestedCards, function (card) {
            content.push(card);
          });
          Array.prototype.forEach.call(nestedValues, function (block) {
            content.push(block);
          });
          return;
        }

        if (child.classList.contains('csi-icon-feature-list')) {
          Array.prototype.forEach.call(child.querySelectorAll('.csi-icon-feature'), function (item) {
            content.push(item);
          });
          return;
        }

        if (child.classList.contains('csi-process-flow')) {
          Array.prototype.forEach.call(child.children, function (node) {
            if (node.classList.contains('csi-process-step') || node.classList.contains('csi-process-chevron')) {
              content.push(node);
            }
          });
          return;
        }

        content.push(child);
      });
    } else {
      // Special layouts (e.g. oil & gas coming-soon)
      var oilgas = root.querySelector('.oilgas-hero__content');
      if (oilgas) {
        Array.prototype.forEach.call(oilgas.children, function (child) {
          content.push(child);
        });
      }
    }

    var sideCol = root.querySelector('.col-xl-4') || root;

    Array.prototype.forEach.call(sideCol.querySelectorAll('.Categories.service .single-categories'), function (row) {
      sidebar.push(row);
    });

    if (sidebar.length === 0) {
      Array.prototype.forEach.call(sideCol.querySelectorAll('.single-categories'), function (row) {
        sidebar.push(row);
      });
    }

    Array.prototype.forEach.call(sideCol.querySelectorAll('.rts-single-wized'), function (wized) {
      if (wized.classList.contains('Categories')) {
        var header = wized.querySelector('.wized-header');
        if (header) {
          sidebar.unshift(header);
        }
        return;
      }
      sidebar.push(wized);
    });

    return { content: content, sidebar: sidebar };
  }

  /**
   * Stagger delay based on element type for a more cascading feel.
   * @param {Element} el
   * @param {number} waveIndex
   * @returns {number}
   */
  function waveDelay(el, waveIndex) {
    if (el.classList.contains('csi-pillar-service-card')) {
      return Math.min(waveIndex * 0.1, 0.45);
    }
    if (el.classList.contains('csi-icon-feature') || el.classList.contains('single-categories') || el.classList.contains('csi-process-step') || el.classList.contains('csi-value-block')) {
      return Math.min(waveIndex * 0.085, 0.4);
    }
    if (el.classList.contains('accordion-item')) {
      return Math.min(waveIndex * 0.07, 0.35);
    }
    return Math.min(waveIndex * 0.06, 0.28);
  }

  function init() {
    var root = document.querySelector('.csi-service-reveal');
    if (!root) {
      return;
    }

    var groups = collectTargets(root);
    var targets = groups.content.concat(groups.sidebar);

    if (prefersReducedMotion()) {
      targets.forEach(function (el) {
        el.classList.add('csi-reveal', 'is-visible', 'is-settled');
      });
      return;
    }

    groups.content.forEach(function (el, index) {
      el.classList.add('csi-reveal');
      assignDirection(el, index);
      el.style.transitionDelay = '0s';
    });

    groups.sidebar.forEach(function (el, index) {
      el.classList.add('csi-reveal');
      assignDirection(el, index);
      el.style.transitionDelay = '0s';
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) {
        el.classList.add('is-visible', 'is-settled');
      });
      return;
    }

    var wave = 0;
    var lastRevealAt = 0;

    var observer = new IntersectionObserver(function (entries) {
      // Sort top-to-bottom so cascades feel natural
      entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        })
        .forEach(function (entry) {
          var now = performance.now();
          if (now - lastRevealAt > 160) {
            wave = 0;
          }

          var el = entry.target;
          var delay = waveDelay(el, wave);
          el.style.transitionDelay = delay + 's';
          wave += 1;
          lastRevealAt = now;

          window.requestAnimationFrame(function () {
            el.classList.add('is-visible');
          });

          var settleMs = 1250 + delay * 1000;
          window.setTimeout(function () {
            el.classList.add('is-settled');
            el.style.transitionDelay = '';
          }, settleMs);

          observer.unobserve(el);
        });
    }, {
      root: null,
      // Start a bit early so motion feels continuous while scrolling
      rootMargin: '0px 0px 18% 0px',
      threshold: 0.02
    });

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
