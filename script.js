(function () {
  'use strict';

  var viewport = document.getElementById('viewport');
  var content = document.getElementById('content');
  var lineDomain = document.getElementById('line-domain');
  var lineMessage = document.getElementById('line-message');
  var linePrompt = document.getElementById('line-prompt');
  var cursor = document.getElementById('cursor');
  var hsyncLayer = document.querySelector('.layer--hsync');

  var TIMING = {
    powerOnDelay: 250,
    bloomDelay: 250,
    crtWarmDelay: 250,
    readyDelay: 1200,
    cursorWait: 5000,
    charDelay: 145,
    charJitter: 55,
    linePause: 3000,
    finalPause: 3000,
  };

  var LINES = [
    { element: lineDomain, text: 'brunosoares.net' },
    { element: lineMessage, text: "You've arrived." },
  ];

  function addClass(el, cls) {
    el.classList.add(cls);
  }

  function removeClass(el, cls) {
    el.classList.remove(cls);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function charDelay() {
    var jitter = Math.random() * TIMING.charJitter;
    return TIMING.charDelay + jitter;
  }

  function placeCursor(line) {
    line.appendChild(cursor);
    removeClass(cursor, 'cursor--idle');
    addClass(cursor, 'cursor--active');
  }

  function typeLine(line, text) {
    return new Promise(function (resolve) {
      placeCursor(line);

      var index = 0;

      function typeNextChar() {
        if (index >= text.length) {
          removeClass(cursor, 'cursor--active');
          addClass(cursor, 'cursor--idle');
          resolve();
          return;
        }

        line.insertBefore(document.createTextNode(text.charAt(index)), cursor);
        index += 1;
        setTimeout(typeNextChar, charDelay());
      }

      typeNextChar();
    });
  }

  function finishTyping() {
    linePrompt.appendChild(cursor);
    removeClass(cursor, 'cursor--active');
    addClass(cursor, 'cursor--idle');
    addClass(content, 'content--cursor-visible');
  }

  function showWaitingCursor() {
    lineDomain.appendChild(cursor);
    removeClass(cursor, 'cursor--active');
    addClass(cursor, 'cursor--idle');
  }

  function startTyping() {
    removeClass(content, 'content--cursor-visible');

    var chain = Promise.resolve();

    LINES.forEach(function (line, i) {
      chain = chain.then(function () {
        if (i > 0) {
          return wait(TIMING.linePause);
        }
        return wait(0);
      }).then(function () {
        return typeLine(line.element, line.text);
      });
    });

    chain
      .then(function () {
        return wait(TIMING.finalPause);
      })
      .then(finishTyping);
  }

  function scheduleHsyncShimmer() {
    var delay = 4000 + Math.random() * 12000;

    setTimeout(function () {
      if (!hsyncLayer) return;

      hsyncLayer.classList.remove('active');
      void hsyncLayer.offsetWidth;
      hsyncLayer.classList.add('active');

      hsyncLayer.addEventListener(
        'animationend',
        function onEnd() {
          hsyncLayer.classList.remove('active');
          hsyncLayer.removeEventListener('animationend', onEnd);
        },
        { once: true }
      );

      scheduleHsyncShimmer();
    }, delay);
  }

  function showFullText() {
    lineDomain.textContent = LINES[0].text;
    lineMessage.textContent = LINES[1].text;
    finishTyping();
  }

  function startSequence() {
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setTimeout(function () {
      addClass(viewport, 'viewport--power-on');

      setTimeout(function () {
        addClass(viewport, 'viewport--bloom');
      }, TIMING.bloomDelay);

      setTimeout(function () {
        addClass(viewport, 'viewport--alive');
      }, TIMING.crtWarmDelay);

      setTimeout(function () {
        addClass(viewport, 'viewport--ready');
        scheduleHsyncShimmer();

        if (reducedMotion) {
          showFullText();
          return;
        }

        showWaitingCursor();

        setTimeout(function () {
          startTyping();
        }, TIMING.cursorWait);
      }, TIMING.readyDelay);
    }, TIMING.powerOnDelay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSequence);
  } else {
    startSequence();
  }
})();
