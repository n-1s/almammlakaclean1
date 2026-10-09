/* ==========================================================
   المملكة كلين — منطق التحويل حسب الجهاز + تفاعلات الموقع
   ========================================================== */
(function () {
  'use strict';

  var PHONE_E164 = '+966536242729';
  var PHONE_LOCAL = '0536242729';
  var WA_NUMBER   = '966536242729';

  /* ---------------------------------------------------------
     1) اكتشاف نوع الجهاز
        الهاتف المحمول فقط (iPhone / Android) هو من يُحوَّل
        إلى شاشة الاتصال. الكمبيوتر واللابتوب والأجهزة اللوحية
        لا يُطبَّق عليهم أي تحويل تلقائي — يعرض الموقع بشكل طبيعي.
     --------------------------------------------------------- */
  function isMobilePhone() {
    var ua = navigator.userAgent || '';

    // منع التحويل على الأجهزة اللوحية (iPad) — تختلف عن الهواتف
    var isTablet = /iPad|Android(?!.*Mobile)|Tablet|PlayBook|Silk/i.test(ua);
    if (isTablet) return false;

    var isPhoneUA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile|Mobile Safari/i.test(ua);

    // تأكيد إضافي: شاشة صغيرة + جهاز يدعم اللمس (حماية من انتحال الـ User-Agent)
    var touchPoints = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;
    var isTouchDevice = ('ontouchstart' in window) || touchPoints > 0;
    var isNarrowScreen = window.matchMedia && window.matchMedia('(max-width: 820px)').matches;

    return isPhoneUA && (isTouchDevice || isNarrowScreen);
  }

  /* ---------------------------------------------------------
     2) تحويل الجوال إلى شاشة الاتصال
        - يتم مرة واحدة فقط لكل جلسة (حماية من حلقات التحويل)
        - لا يتم على الكمبيوتر إطلاقًا
        - المستخدم يمكنه الرجوع للموقع بسهولة
     --------------------------------------------------------- */
  var SESSION_KEY = 'mk_call_prompted';

  function shouldPrompt() {
    if (!isMobilePhone()) return false;               // الكمبيوتر: لا تحويل أبدًا
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return false; // مرة واحدة فقط
    } catch (e) { /* وضع التصفح الخاص */ }
    return true;
  }

  function markPrompted() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  function initCallScreen() {
    var screen = document.getElementById('callScreen');
    if (!screen) return;

    if (!shouldPrompt()) {
      // الكمبيوتر أو زيارة لاحقة: نضمن إخفاء أي شاشة اتصال
      screen.hidden = true;
      screen.style.display = 'none';
      return;
    }

    markPrompted();
    screen.hidden = false;
    screen.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // حماية: إذا لم تظهر الشاشة فعليًا (لأي سبب في المتصفح)
    // نُعيد الصفحة إلى وضعها الطبيعي حتى لا تتجمد التمرير.
    window.setTimeout(function () {
      if (screen.hidden || getComputedStyle(screen).display === 'none') {
        screen.hidden = true;
        screen.style.display = 'none';
        document.body.style.overflow = '';
      }
    }, 500);

    /* التحويل التلقائي إلى شاشة الاتصال برقم الشركة (tel:) */
    // يُنفَّذ مرة واحدة فقط لكل جلسة (thanks to markPrompted).
    // نستخدم رابطاً مخفياً ونقرة برمجية لأن المتصفحات تتعامل مع tel:
    // كتطبيق خارجي يفتح شاشة الاتصال مباشرة.
    window.setTimeout(function () {
      var auto = document.createElement('a');
      auto.href = 'tel:' + PHONE_E164;
      auto.style.display = 'none';
      document.body.appendChild(auto);
      try { auto.click(); } catch (e) { /* في حال منع المتصفح النداء التلقائي */ }
      // إزالة الرابط بعد ثانيتين
      window.setTimeout(function () {
        if (auto.parentNode) auto.parentNode.removeChild(auto);
      }, 2000);
    }, 350);

    // زر "تصفح الموقع" للرجوع دون اتصال
    var back = document.getElementById('callBack');
    if (back) {
      back.addEventListener('click', function () {
        screen.style.display = 'none';
        screen.hidden = true;
        document.body.style.overflow = '';
      });
    }

    // إغلاق بمفتاح Escape (سطح المكتب أثناء الاختبار)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !screen.hidden) {
        screen.style.display = 'none';
        screen.hidden = true;
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------------------------------------------------------
     3) ضمان عمل أزرار الاتصال والواتساب بشكل صحيح
     --------------------------------------------------------- */
  function initLinks() {
    document.querySelectorAll('[data-call-link]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      // استبدال أي رقم قديم بالم الصحيح (بصيغة E.164)
      if (href.indexOf('tel:') === 0) a.setAttribute('href', 'tel:' + PHONE_E164);
      a.addEventListener('click', function () {
        markPrompted();
      });
    });

    var waLink = 'https://wa.me/' + WA_NUMBER +
                 '?text=' + encodeURIComponent(
                   'مرحباً المملكة كلين، أرغب في الاستفسار عن خدمات التنظيف في جدة.'
                 );

    ['headerWhats', 'heroWhats', 'contactWhats', 'footerWhats', 'barWhats', 'callWhats']
      .forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.setAttribute('href', waLink);
      });
  }

  /* ---------------------------------------------------------
     4) سنة الفوتر
     --------------------------------------------------------- */
  function initYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------------------------------------------------------
     5) ظل الهيدر عند التمرير + إبراز الرابط النشط
     --------------------------------------------------------- */
  function initHeader() {
    var header = document.getElementById('siteHeader');
    function onScroll() {
      if (header) header.classList.toggle('scrolled', window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initActiveNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
    var sections = links
      .map(function (l) {
        var id = l.getAttribute('href');
        return id && id.charAt(0) === '#' ? document.querySelector(id) : null;
      })
      .filter(Boolean);

    if (!sections.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        links.forEach(function (l) {
          l.classList.toggle('active', l.getAttribute('href') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------------------------------------------------
     6) تهيئة عند تحميل الصفحة
     --------------------------------------------------------- */
  function boot() {
    initLinks();
    initYear();
    initHeader();
    initActiveNav();
    initCallScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // للاختبار والتشخيص فقط — لا يؤثر على المستخدم
  window.MK_DEBUG = {
    phone: PHONE_LOCAL,
    tel: PHONE_E164,
    isMobilePhone: isMobilePhone
  };
})();
