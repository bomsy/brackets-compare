/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */
define(function (require, exports, module) {
    "use strict";

    var main = require("main");
    var view = require("").CompareView;
    var panel = require("").ComaprePanel;
    
    describe("Hello World", function () {
        it("should expose a handleHelloWorld method", function () {
            expect(main.handleHelloWorld).not.toBeNull();
        });
    });
});