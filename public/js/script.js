(function($) {

  "use strict";

  const tabs = document.querySelectorAll('[data-tab-target]')
  const tabContents = document.querySelectorAll('[data-tab-content]')

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = document.querySelector(tab.dataset.tabTarget)
      tabContents.forEach(tabContent => {
        tabContent.classList.remove('active')
      })
      tabs.forEach(tab => {
        tab.classList.remove('active')
      })
      tab.classList.add('active')
      target.classList.add('active')
    })
  });


  var isHeaderSticky = false;
  var initScrollNav = function() {
    var scroll = $(window).scrollTop();
    var $header = $('#header');
    var $wrap = $('#header-wrap');
    if (!$header.length) return;

    var triggerOffset = 180;

    if (scroll >= triggerOffset) {
      if (!isHeaderSticky) {
        isHeaderSticky = true;
        var hHeight = $header.outerHeight() || 80;
        if ($wrap.length) {
          $wrap.css('min-height', ($wrap.outerHeight() || hHeight) + 'px');
        }
        $header.addClass('is-sticky');
        $header.removeClass('fixed-top');
      }
    } else if (scroll < 100) {
      if (isHeaderSticky) {
        isHeaderSticky = false;
        $header.removeClass('is-sticky fixed-top');
        if ($wrap.length) {
          $wrap.css('min-height', '');
        }
      }
    }
  };

  var scrollThrottled = false;
  $(window).on('scroll', function() {
    if (!scrollThrottled) {
      window.requestAnimationFrame(function() {
        initScrollNav();
        scrollThrottled = false;
      });
      scrollThrottled = true;
    }
  }); 

  $(document).ready(function(){
    initScrollNav();
    
    Chocolat(document.querySelectorAll('.image-link'), {
        imageSize: 'contain',
        loop: true,
    })

    $('#header-wrap').on('click', '.search-toggle', function(e) {
      e.preventDefault();
      var $wrap = $('#header-wrap');
      var $bar = $(this).closest('.search-bar');
      var $input = $wrap.find('.search-input');
      var query = ($input.val() || '').trim();

      if ($wrap.hasClass('show') && query.length > 0) {
        window.location.href = 'shop.html?search=' + encodeURIComponent(query);
        return;
      }

      $wrap.toggleClass('show');
      $bar.toggleClass('active');
      $(this).toggleClass('active');

      if ($wrap.hasClass('show')) {
        setTimeout(function() { $input.focus(); }, 100);
      } else {
        $('#search-results-dropdown').hide();
      }
    });

    // close when click off of container
    $(document).on('click touchstart', function (e){
      if (!$(e.target).closest('.search-bar, .search-toggle, #search-results-dropdown').length) {
        $('.search-toggle').removeClass('active');
        $('.search-bar').removeClass('active');
        $('#header-wrap').removeClass('show');
        $('#search-results-dropdown').hide();
      }
    });

    $('.main-slider').slick({
        autoplay: false,
        autoplaySpeed: 4000,
        fade: true,
        dots: true,
        prevArrow: $('.prev'),
        nextArrow: $('.next'),
    }); 

    $('.product-grid').slick({
        slidesToShow: 4,
        slidesToScroll: 1,
        autoplay: false,
        autoplaySpeed: 2000,
        dots: true,
        arrows: false,
        responsive: [
          {
            breakpoint: 1400,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 1
            }
          },
          {
            breakpoint: 999,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 1
            }
          },
          {
            breakpoint: 660,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
          // You can unslick at a given breakpoint now by adding:
          // settings: "unslick"
          // instead of a settings object
        ]
    });

    AOS.init({
      duration: 1200,
      once: true,
    })


  }); // End of a document


})(jQuery);