$(function() {
    var pos = $("nav").offset().top;
    var height = $("nav").outerHeight();
    $(window).scroll(function () {
        if ($(this).scrollTop() > pos) {
            $("nav").addClass("fixed");
            $("body").css("padding-top", height);
        } else {
            $("nav").removeClass("fixed");
            $("body").css("padding-top", 0);
        }
    });
});