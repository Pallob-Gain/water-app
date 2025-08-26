 /* Multiple Carousel **/

jQuery(document).ready(function($) {
    'use strict';


 $('.owl-slider').owlCarousel({

         loop: true,
         margin: 5,
         autoplay: true,
         autoplayTimeout: 3000,
         nav: true,
         navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
         responsive: {
             0: {
                 items: 1
             },
             600: {
                 items: 1
             },
             1000: {
                 items: 1
             }
         }
     });
     $('.owl-post').owlCarousel({

         loop: true,
         margin: 5,
         autoplay: true,
         autoplayTimeout: 3000,
         nav: true,
         navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
         responsive: {
             0: {
                 items: 1
             },
             600: {
                 items: 1
             },
             1000: {
                 items: 1
             }
         }
     });


$('.owl-testimonial').owlCarousel({

         loop: true,
         margin: 5,
         autoplay: true,
         autoplayTimeout: 3000,
         nav: true,
         navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
         responsive: {
             0: {
                 items: 1
             },
             600: {
                 items: 1
             },
             1000: {
                 items: 3
             }
         }
     });

$('.owl-testimonial-second').owlCarousel({

         loop: true,

         margin: 30,
         autoplay: true,
         autoplayTimeout: 3000,
         nav: true,
         navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
         responsive: {
             0: {
                 items: 1
             },
             600: {
                 items: 1
             },
             1000: {
                 items: 3
             }
         }
     });
$('.owl-testimonial-third').owlCarousel({

         loop: true,

         margin: 30,
         autoplay: true,
         autoplayTimeout: 3000,
         nav: true,
         navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
         responsive: {
             0: {
                 items: 1
             },
             600: {
                 items: 2
             },
             1000: {
                 items: 3
             },
             1400: {
                 items: 5
             }
         }
     });

$('.owl-testimonial-fourth').owlCarousel({

         loop: true,
         margin: 5,
         autoplay: true,
         autoplayTimeout: 3000,
         nav: true,
         navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
         responsive: {
             0: {
                 items: 1
             },
             600: {
                 items: 1
             },
             1000: {
                 items: 1
             }
         }
     });
$('.owl-insurance-product').owlCarousel({

         loop: true,
         margin: 30,
         autoplay: true,
         autoplayTimeout: 3000,
         nav: true,
         navText: ['<i class="fa fa-angle-left"></i>', '<i class="fa fa-angle-right"></i>'],
         responsive: {
             0: {
                 items: 1
             },
             600: {
                 items: 1
             },
             1000: {
                 items: 3
             }
         }
     });


}); // AND OF JQUERY