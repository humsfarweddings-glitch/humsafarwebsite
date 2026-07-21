// AOS Animation Script — runs first and independently of jQuery so a
// jQuery/slick CDN failure never leaves the page permanently invisible
// (AOS applies opacity:0 to [data-aos] elements via pure CSS until
// AOS.init() marks them .aos-animate).
if (window.AOS) {
  AOS.init({
    duration: 1000
  });
}

// Header Sticky
window.addEventListener("scroll", function () {
  var header = document.querySelector(".header_main");
  if (header) {
    header.classList.toggle("sticky", window.scrollY > 0);
  }
});

// About Page tabs
const buttons = document.querySelectorAll('.tab-button');
const contents = document.querySelectorAll('.tab-content');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const year = btn.getAttribute('data-year');
    contents.forEach(content => {
      content.classList.remove('active');
      if (content.id === 'content-' + year) {
        content.classList.add('active');
      }
    });
  });
});

// Everything below depends on jQuery + slick-carousel (loaded from CDN).
// Guarded so a CDN hiccup only disables sliders, not the whole page.
if (window.jQuery) {
  (function ($) {
    // Mobile Menu
    $(document).ready(function () {
      $('.hamburger').click(function () {
        $('.mobile_menu').css('left', '0');
        $('.overlay').fadeIn();
      });

      $('.close-btn, .overlay').click(function () {
        $('.mobile_menu').css('left', '-100%');
        $('.overlay').fadeOut();
        $('.submenu').slideUp();
      });

      $('.has-submenu > a').click(function (e) {
        e.preventDefault();
        var $submenu = $(this).next('.submenu');
        $('.submenu').not($submenu).slideUp();
        $submenu.slideToggle();
      });
    });

    if ($.fn.slick) {
      // Hero Banner Slideshow
      $(document).ready(function () {
        $('.hero-slider').slick({
          fade: true,
          cssEase: 'ease-in-out',
          speed: 1000,
          autoplay: true,
          autoplaySpeed: 4000,
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: true,
          arrows: false,
          dots: false,
          pauseOnHover: false
        });
      });

      // Mega menu
      $(document).ready(function () {
        var $slider = $('.mega-menu-grid');

        $slider.slick({
          slidesToShow: 4,
          slidesToScroll: 1,
          autoplay: true,
          autoplaySpeed: 0,
          speed: 3000,
          cssEase: 'linear',
          infinite: true,
          dots: false,
          arrows: false,
          pauseOnHover: false, // disable default
          responsive: [
            {
              breakpoint: 1024,
              settings: { slidesToShow: 3 }
            },
            {
              breakpoint: 768,
              settings: { slidesToShow: 2 }
            },
            {
              breakpoint: 480,
              settings: { slidesToShow: 1 }
            }
          ]
        });

        // Manually pause/resume on hover
        $slider.on('mouseenter', function () {
          $slider.slick('slickPause');
        }).on('mouseleave', function () {
          $slider.slick('slickPlay');
        });
      });

      // Home Page testimonial Slider
      $(document).ready(function () {
        $('.testimonial-slider').slick({
          dots: true,
          arrows: false,
          infinite: true,
          speed: 500,
          slidesToShow: 1,
          adaptiveHeight: true,
          autoplay: true,
          autoplaySpeed: 4000,
          responsive: [
            {
              breakpoint: 992,
              settings: { slidesToShow: 1 }
            },
            {
              breakpoint: 576,
              settings: { slidesToShow: 1 }
            }
          ]
        });
      });
    }
  })(window.jQuery);
}

// Back To Top Button
(function () {
  var btn = document.getElementById("backToTopBtn");
  if (!btn) return;
  window.addEventListener("scroll", function () {
    btn.classList.toggle("is-visible", window.scrollY > 400);
  });
  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
