/* SmoothScroll (SPACE SCROLL DISABLED) */
!function () {
    var s, i, c, a,
        o = {
            frameRate: 300,
            animationTime: 600,
            stepSize: 100,
            pulseAlgorithm: !0,
            pulseScale: 4,
            pulseNormalize: 1,
            accelerationDelta: 50,
            accelerationMax: 3,
            keyboardSupport: !0,
            arrowScroll: 50,
            fixedBackground: !0,
            excluded: ""
        },
        p = o,
        u = !1,
        d = !1,
        n = { x: 0, y: 0 },
        f = !1,
        m = document.documentElement,
        l = [],
        h = /^Mac/.test(navigator.platform),
        w = { left: 37, up: 38, right: 39, down: 40, spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36 },
        v = { 37: 1, 38: 1, 39: 1, 40: 1 };

    function y() {
        if (!f && document.body) {
            f = !0;
            var e = document.body,
                t = document.documentElement,
                o = window.innerHeight,
                n = e.scrollHeight;
            m = 0 <= document.compatMode.indexOf("CSS") ? t : e;
            s = e;
            p.keyboardSupport && Y("keydown", x);
        }
    }

    function S(d, f, m) {
        window.scrollBy(f, m);
    }

    function x(e) {

        /* ?? SPACE SCROLL KAPATILDI */
        if (e.keyCode === w.spacebar) {
            return true;
        }

        var t = e.target,
            o = e.ctrlKey || e.altKey || e.metaKey;

        if (e.defaultPrevented || o) return !0;

        var r = 0, a = 0;
        switch (e.keyCode) {
            case w.up: a = -p.arrowScroll; break;
            case w.down: a = p.arrowScroll; break;
            case w.pageup: a = -window.innerHeight * 0.9; break;
            case w.pagedown: a = window.innerHeight * 0.9; break;
            case w.left: r = -p.arrowScroll; break;
            case w.right: r = p.arrowScroll; break;
            default: return !0;
        }

        S(document.body, r, a);
        e.preventDefault();
    }

    function Y(e, t, o) {
        window.addEventListener(e, t, o || !1);
    }

    Y("load", y);
}();
