(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.replace('no-js', 'js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const numberFormatters = new Map();
  const svgNS = 'http://www.w3.org/2000/svg';
  const seenCounters = new WeakSet();
  const activeHeroAnimations = new Set();
  let frameRequested = false;
  let resizeTimer = 0;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  function formatter(decimals = 0) {
    if (!numberFormatters.has(decimals)) {
      numberFormatters.set(decimals, new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }));
    }
    return numberFormatters.get(decimals);
  }

  function formatCompact(value) {
    if (value >= 1000) {
      const digits = value >= 10000 ? 0 : 1;
      return `${formatter(digits).format(value / 1000)} тыс.`;
    }
    return formatter(0).format(value);
  }

  function svgElement(tag, attributes = {}, text = '') {
    const node = document.createElementNS(svgNS, tag);
    for (const [name, value] of Object.entries(attributes)) {
      node.setAttribute(name, String(value));
    }
    if (text) node.textContent = text;
    return node;
  }

  function animateCounter(element) {
    if (seenCounters.has(element)) return;
    seenCounters.add(element);

    const finalText = element.textContent.trim();
    const value = Number(element.dataset.count);
    const decimals = Number(element.dataset.decimals || 0);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';

    if (!Number.isFinite(value) || reduceMotion.matches) {
      element.textContent = finalText;
      return;
    }

    const start = performance.now();
    const duration = 900;
    element.textContent = `${prefix}${formatter(decimals).format(0)}${suffix}`;

    function tick(now) {
      const progress = clamp((now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = value * eased;
      element.textContent = `${prefix}${formatter(decimals).format(current)}${suffix}`;

      if (progress < 1 && !reduceMotion.matches) {
        requestAnimationFrame(tick);
      } else {
        element.textContent = finalText;
      }
    }

    requestAnimationFrame(tick);
  }

  function initialiseMotion() {
    root.classList.toggle('motion-ok', !reduceMotion.matches);

    const counters = document.querySelectorAll('.counter');
    const chartStages = document.querySelectorAll('[data-chart-stage]');
    const workPaths = document.querySelectorAll('[data-work-path]');

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      chartStages.forEach((node) => node.classList.add('is-chart-visible'));
      workPaths.forEach((node) => node.classList.add('is-work-visible'));
      return;
    }

    const counterObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.45 });

    counters.forEach((node) => counterObserver.observe(node));

    const chartObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-chart-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

    chartStages.forEach((node) => chartObserver.observe(node));

    const workObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-work-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    workPaths.forEach((node) => workObserver.observe(node));

    playHero();
  }

  function runHeroAnimation(element, keyframes, options) {
    if (!element) return;
    const animation = element.animate(keyframes, options);
    activeHeroAnimations.add(animation);

    const release = () => activeHeroAnimations.delete(animation);
    animation.addEventListener('finish', release, { once: true });
    animation.addEventListener('cancel', release, { once: true });
  }

  function cancelHeroAnimations() {
    activeHeroAnimations.forEach((animation) => animation.cancel());
    activeHeroAnimations.clear();
  }

  function playHero() {
    if (reduceMotion.matches || !Element.prototype.animate) return;

    const title = document.querySelector('.hero__title');
    const support = document.querySelector('.hero__support');
    const ribbon = document.querySelector('.evidence-ribbon');
    const metrics = document.querySelectorAll('.hero-metric');
    const ease = 'cubic-bezier(.16, 1, .3, 1)';

    runHeroAnimation(
      title,
      [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 820, delay: 80, easing: ease, fill: 'backwards' },
    );
    runHeroAnimation(
      support,
      [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 620, delay: 260, easing: ease, fill: 'backwards' },
    );
    runHeroAnimation(
      ribbon,
      [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: 760, delay: 340, easing: ease, fill: 'backwards' },
    );
    metrics.forEach((metric, index) => {
      runHeroAnimation(
        metric,
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 540, delay: 560 + (index * 70), easing: ease, fill: 'backwards' },
      );
    });
  }

  function chartDimensions(container) {
    const width = Math.max(280, Math.floor(container.clientWidth || 960));
    const mobile = width < 720;
    const height = mobile
      ? Math.round(clamp(width * 1.05, 360, 480))
      : Math.round(clamp(width * 0.46, 460, 590));
    return {
      width,
      height,
      mobile,
      padding: {
        top: mobile ? 52 : 36,
        right: mobile ? 42 : 62,
        bottom: mobile ? 56 : 64,
        left: mobile ? 62 : 68,
      },
    };
  }

  function createChartBase(container, titleText, descriptionText) {
    const dimensions = chartDimensions(container);
    const { width, height } = dimensions;
    const svg = svgElement('svg', {
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      'aria-label': `${titleText}. ${descriptionText}`,
      preserveAspectRatio: 'xMidYMid meet',
    });
    svg.append(svgElement('title', {}, titleText));
    svg.append(svgElement('desc', {}, descriptionText));
    container.replaceChildren(svg);
    return { svg, ...dimensions };
  }

  function drawGrid(svg, dimensions, maxValue, tickCount = 4, rightFormatter = null) {
    const { width, height, padding, mobile } = dimensions;
    const plotHeight = height - padding.top - padding.bottom;
    const plotWidth = width - padding.left - padding.right;

    for (let index = 0; index <= tickCount; index += 1) {
      const ratio = index / tickCount;
      const y = padding.top + (plotHeight * ratio);
      const value = maxValue * (1 - ratio);
      svg.append(svgElement('line', {
        class: 'chart-grid-line',
        x1: padding.left,
        x2: padding.left + plotWidth,
        y1: y,
        y2: y,
      }));
      svg.append(svgElement('text', {
        class: 'chart-axis-label',
        x: mobile ? 4 : padding.left - 10,
        y: y + 4,
        'text-anchor': mobile ? 'start' : 'end',
      }, formatCompact(value)));

      if (rightFormatter) {
        svg.append(svgElement('text', {
          class: 'chart-axis-label',
          x: mobile ? width - 4 : width - padding.right + 10,
          y: y + 4,
          'text-anchor': mobile ? 'end' : 'start',
        }, rightFormatter(1 - ratio)));
      }
    }
  }

  function smoothPath(points) {
    if (!points.length) return '';
    return points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = points[index - 1];
      const control = (point.x - previous.x) * 0.42;
      return `${path} C ${previous.x + control} ${previous.y}, ${point.x - control} ${point.y}, ${point.x} ${point.y}`;
    }, '');
  }

  function addXAxis(svg, labels, dimensions) {
    const { width, height, padding, mobile } = dimensions;
    const plotWidth = width - padding.left - padding.right;
    const step = labels.length > 1 ? plotWidth / (labels.length - 1) : plotWidth;
    labels.forEach((label, index) => {
      if (mobile && labels.length > 6 && ![0, 2, 4, labels.length - 1].includes(index)) return;
      svg.append(svgElement('text', {
        class: 'chart-axis-label',
        x: padding.left + (step * index),
        y: height - padding.bottom + 28,
        'text-anchor': 'middle',
      }, label));
    });
  }

  function addLineSeries(svg, values, dimensions, maxValue, options = {}) {
    const { width, height, padding } = dimensions;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const step = values.length > 1 ? plotWidth / (values.length - 1) : plotWidth;
    const baseline = padding.top + plotHeight;
    const points = values.map((value, index) => ({
      value,
      x: padding.left + (step * index),
      y: padding.top + plotHeight - ((value / maxValue) * plotHeight),
    }));
    const pathData = options.smooth === false
      ? points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
      : smoothPath(points);

    if (options.area) {
      const area = svgElement('path', {
        class: 'chart-area',
        d: `${pathData} L ${points.at(-1).x} ${baseline} L ${points[0].x} ${baseline} Z`,
      });
      svg.append(area);
    }

    const path = svgElement('path', {
      class: `chart-line chart-line--${options.color || 'coral'}`,
      d: pathData,
      pathLength: 1,
    });
    svg.append(path);

    points.forEach((point, index) => {
      const group = svgElement('g', {
        class: 'chart-point',
        style: `--point-delay:${Math.min(index * 70, 420)}ms`,
        'aria-hidden': 'true',
      });
      const circle = svgElement('circle', {
        class: `chart-point__halo chart-point__halo--${options.color || 'coral'}`,
        cx: point.x,
        cy: point.y,
        r: options.pointRadius || 5,
      });
      group.append(circle);
      svg.append(group);

      if (options.showValues === true || options.showValues?.includes(index)) {
        svg.append(svgElement('text', {
          class: 'chart-value-label',
          x: point.x,
          y: point.y - 14,
          'text-anchor': 'middle',
        }, options.valueFormatter ? options.valueFormatter(point.value) : formatter(0).format(point.value)));
      }
    });

    return points;
  }

  function renderTrafficChart() {
    const container = document.querySelector('#traffic-chart');
    if (!container) return;
    const labels = ['Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май'];
    const values = [420, 711, 800, 1005, 1161, 1152];
    const dimensions = createChartBase(
      container,
      'Рост поискового трафика',
      'Визиты выросли с 420 в декабре до 1 161 в апреле и составили 1 152 в мае.',
    );
    drawGrid(dimensions.svg, dimensions, 1300, 4);
    addXAxis(dimensions.svg, labels, dimensions);
    addLineSeries(dimensions.svg, values, dimensions, 1300, {
      area: true,
      color: 'coral',
      showValues: dimensions.mobile ? [0, 4] : true,
    });
    enhanceChartData(container);
  }

  function renderLeadsChart() {
    const container = document.querySelector('#leads-chart');
    if (!container) return;
    const labels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл'];
    const organic = [41, 25, 52, 52, 54, 37, 51];
    const cpc = [29, 32, 26, 61, 37, 20, 28];
    const maxValue = 70;
    const dimensions = createChartBase(
      container,
      'Обращения из SEO и контекстной рекламы',
      'С мая по июль SEO каждый месяц приносило больше обращений, чем контекстная реклама.',
    );
    const { svg, width, height, padding, mobile } = dimensions;
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const step = plotWidth / labels.length;
    const baseline = padding.top + plotHeight;
    const barWidth = Math.min(mobile ? 18 : 34, step * 0.28);

    drawGrid(svg, dimensions, maxValue, mobile ? 3 : 4);

    const bandX = padding.left + (step * 4);
    svg.insertBefore(svgElement('rect', {
      class: 'chart-focus-band',
      x: bandX,
      y: padding.top,
      width: step * 3,
      height: plotHeight,
      rx: 8,
    }), svg.children[2] || null);
    svg.append(svgElement('text', {
      class: 'chart-axis-label',
      x: mobile ? bandX + (step * 1.5) : bandX + 8,
      y: mobile ? padding.top - 16 : padding.top + 16,
      'text-anchor': mobile ? 'middle' : 'start',
    }, 'май–июль: SEO выше'));

    labels.forEach((label, index) => {
      const center = padding.left + (step * index) + (step / 2);
      svg.append(svgElement('text', {
        class: 'chart-axis-label',
        x: center,
        y: height - padding.bottom + 28,
        'text-anchor': 'middle',
      }, label));

      [
        { value: organic[index], offset: -barWidth * 0.58, className: 'chart-bar--organic', channel: 'SEO' },
        { value: cpc[index], offset: barWidth * 0.58, className: 'chart-bar--cpc', channel: 'Контекстная реклама' },
      ].forEach((series) => {
        const barHeight = (series.value / maxValue) * plotHeight;
        const rect = svgElement('rect', {
          class: `chart-bar ${series.className}`,
          x: center + series.offset - (barWidth / 2),
          y: baseline - barHeight,
          width: barWidth,
          height: barHeight,
          rx: Math.min(6, barWidth / 4),
          style: `--bar-delay:${Math.min(index * 55, 300)}ms`,
          'aria-hidden': 'true',
        });
        svg.append(rect);
        if (!mobile) {
          svg.append(svgElement('text', {
            class: 'chart-value-label',
            x: center + series.offset,
            y: baseline - barHeight - 9,
            'text-anchor': 'middle',
          }, String(series.value)));
        }
      });
    });
    enhanceChartData(container);
  }

  function renderVisibilityChart() {
    const container = document.querySelector('#visibility-chart');
    if (!container) return;
    const labels = ['Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл'];
    const impressions = [5585, 12915, 18748, 33719, 38539, 50156, 47704, 47409];
    const clicks = [234, 361, 409, 612, 740, 758, 734, 772];
    const dimensions = createChartBase(
      container,
      'Как росла видимость сайта в Google',
      'В пиковый месяц сайт получил 50 156 показов против 5 585 в декабре. К июлю клики выросли с 234 до 772.',
    );
    drawGrid(
      dimensions.svg,
      dimensions,
      55000,
      4,
      dimensions.mobile ? null : (ratio) => formatter(0).format(850 * ratio),
    );
    addXAxis(dimensions.svg, labels, dimensions);
    addLineSeries(dimensions.svg, impressions, dimensions, 55000, {
      area: true,
      color: 'coral',
      showValues: dimensions.mobile ? [5] : [0, 5, 7],
      valueFormatter: formatCompact,
    });
    addLineSeries(dimensions.svg, clicks, dimensions, 850, {
      color: 'ink',
      pointRadius: 4,
      showValues: dimensions.mobile ? [] : [0, 7],
    });
    enhanceChartData(container);
  }

  function enhanceChartData(container) {
    const details = container.nextElementSibling;
    if (!details?.matches('[data-chart-data]') || details.dataset.chartEnhanced) return;
    details.open = false;
    details.dataset.chartEnhanced = 'true';
  }

  function renderCharts() {
    renderLeadsChart();
    renderTrafficChart();
    renderVisibilityChart();
  }

  function updateScrollState() {
    frameRequested = false;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty('--page-progress', String(clamp(window.scrollY / maxScroll)));

    const hero = document.querySelector('.hero');
    if (hero && window.innerWidth >= 1024 && !reduceMotion.matches) {
      const travel = Math.max(1, hero.offsetHeight - window.innerHeight);
      const progress = clamp((window.scrollY - hero.offsetTop) / travel);
      hero.style.setProperty('--hero-progress', String(progress));
    }

  }

  function requestScrollFrame() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(updateScrollState);
  }

  function initialiseSceneIndicator() {
    const scenes = [...document.querySelectorAll('[data-scene]')];
    const current = document.querySelector('.scene-indicator__current');
    const label = document.querySelector('.scene-indicator__label');
    if (!current || !label || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = scenes.indexOf(visible.target);
      current.textContent = String(index + 1).padStart(2, '0');
      label.textContent = visible.target.dataset.scene || '';
    }, { rootMargin: '-42% 0px -42% 0px', threshold: [0, 0.5, 1] });

    scenes.forEach((scene) => observer.observe(scene));
  }

  function initialiseShare() {
    const utility = document.querySelector('.closing__utility');
    const button = document.querySelector('[data-share]');
    const status = document.querySelector('.share-status');
    if (!utility || !button || !status || !/^https?:$/.test(window.location.protocol)) return;

    utility.hidden = false;

    button.addEventListener('click', async () => {
      const shareData = {
        title: document.title,
        text: 'SEO-кейс клиники косметологии «Кожа»',
        url: window.location.href,
      };

      try {
        if (navigator.share && window.location.protocol !== 'file:') {
          await navigator.share(shareData);
          status.textContent = 'Окно отправки открыто';
          return;
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(window.location.href);
          status.textContent = 'Ссылка скопирована';
          return;
        }
        status.textContent = 'Скопируйте адрес из строки браузера';
      } catch (error) {
        if (error?.name !== 'AbortError') {
          status.textContent = 'Не удалось поделиться. Скопируйте адрес из строки браузера';
        }
      }
    });
  }

  function initialiseEvidenceViewer() {
    const dialog = document.querySelector('[data-evidence-dialog]');
    const triggers = document.querySelectorAll('[data-evidence-open]');
    const closeButton = dialog?.querySelector('[data-evidence-close]');
    const title = dialog?.querySelector('[data-evidence-dialog-title]');
    const description = dialog?.querySelector('[data-evidence-dialog-description]');
    const original = dialog?.querySelector('[data-evidence-original]');
    const image = dialog?.querySelector('[data-evidence-image]');
    const status = dialog?.querySelector('[data-evidence-status]');

    if (!dialog || !triggers.length || !closeButton || !title || !description || !original || !image || !status) {
      return;
    }

    let opener = null;

    const resetImage = () => {
      image.onload = null;
      image.onerror = null;
      image.removeAttribute('src');
      image.hidden = true;
      status.textContent = '';
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        const modifiedClick = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
        if (event.defaultPrevented || modifiedClick || typeof dialog.showModal !== 'function') return;

        event.preventDefault();
        opener = trigger;

        const evidenceTitle = trigger.dataset.evidenceTitle || '';
        const evidenceDescription = trigger.dataset.evidenceDescription || '';
        const width = trigger.dataset.evidenceWidth;
        const height = trigger.dataset.evidenceHeight;

        title.textContent = evidenceTitle;
        description.textContent = evidenceDescription;
        original.href = trigger.href;
        original.setAttribute(
          'aria-label',
          `Открыть оригинал: ${evidenceTitle}. Откроется в новой вкладке`,
        );
        image.alt = trigger.dataset.evidenceAlt || `Скриншот из ${evidenceTitle}`;
        if (width) image.setAttribute('width', width);
        if (height) image.setAttribute('height', height);
        image.hidden = true;
        status.textContent = 'Загружаем скриншот…';

        image.onload = () => {
          if (!dialog.open) return;
          image.hidden = false;
          status.textContent = '';
        };
        image.onerror = () => {
          image.hidden = true;
          status.textContent = 'Не удалось загрузить скриншот. Откройте оригинал в новой вкладке.';
        };

        root.classList.add('evidence-dialog-open');
        dialog.showModal();
        image.src = trigger.href;
      });
    });

    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      root.classList.remove('evidence-dialog-open');
      resetImage();
      opener?.focus({ preventScroll: true });
      opener = null;
    });
  }

  function handleMotionPreference() {
    if (reduceMotion.matches) {
      cancelHeroAnimations();
      root.classList.remove('motion-ok');
      document.querySelectorAll('[data-chart-stage]').forEach((node) => node.classList.add('is-chart-visible'));
      document.querySelectorAll('[data-work-path]').forEach((node) => node.classList.add('is-work-visible'));
      document.querySelectorAll('.counter').forEach((node) => {
        const suffix = node.dataset.suffix || '';
        const decimals = Number(node.dataset.decimals || 0);
        node.textContent = `${formatter(decimals).format(Number(node.dataset.count))}${suffix}`;
      });
    } else {
      root.classList.add('motion-ok');
    }
    requestScrollFrame();
  }

  function initialise() {
    renderCharts();
    initialiseMotion();
    initialiseSceneIndicator();
    initialiseShare();
    initialiseEvidenceViewer();

    window.addEventListener('scroll', requestScrollFrame, { passive: true });
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        renderCharts();
        requestScrollFrame();
      }, 180);
    });
    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', handleMotionPreference);
    } else {
      reduceMotion.addListener?.(handleMotionPreference);
    }
    requestScrollFrame();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
