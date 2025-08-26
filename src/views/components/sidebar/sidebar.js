document.addEventListener("DOMContentLoaded", function (event) {
	(function ($) {

		"use strict";

		var fullHeight = function () {

			$('.js-fullheight').css('height', $(window).height());
			$(window).resize(function () {
				$('.js-fullheight').css('height', $(window).height());
			});

		};
		fullHeight();

		/*
		$('#sidebarCollapse').on('click', function () {
			console.log('Side bar in action');

			$('#sidebar').toggleClass('active');
			$('#sidebar').toggleClass('inactive');

			// $('.btn-sidebar-trigger').toggleClass('fa-bars');
			// $('.btn-sidebar-trigger').toggleClass('fa-times');
		});
		*/

	})(jQuery);
});