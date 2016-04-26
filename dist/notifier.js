var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/*eslint no-console: 0*/

define(function (require, exports, module) {
  "use strict";

  var ModalBar = brackets.getModule("widgets/ModalBar").ModalBar;

  var types = {
    error: "exclamation-sign"
  };

  var Notifier = (function () {
    var _class = function Notifier() {
      var message = arguments[0] === undefined ? "Something went wrong!" : arguments[0];
      var timeout = arguments[1] === undefined ? 4500 : arguments[1];

      _classCallCheck(this, _class);

      this.message = message;
      this.type = "error";
      this.modalbar = null;
      this.timeoutId = null;
      this.timeout = timeout;
    };

    _createClass(_class, {
      error: {
        value: function error() {
          var message = arguments[0] === undefined ? this.message : arguments[0];
          var timeout = arguments[1] === undefined ? this.timeout : arguments[1];

          this.type = "error";
          this.message = message;
          this.timeout = timeout;
          this.open();
        }
      },
      open: {
        value: function open() {
          var _this = this;

          if (this.modalbar !== null) {
            this.close();
          }
          this.modalbar = new ModalBar("<span class='error-notify'><i class=\"glyphicon glyphicon-" + types[this.type] + "\"></i> " + this.message + "</span>", true);
          this.timeoutId = window.setTimeout(function () {
            _this.close();
          }, this.timeout);
        }
      },
      close: {
        value: function close() {
          this.modalbar.close();
          window.clearTimeout(this.timeoutId);
          this.modalbar = null;
          this.timeoutId = null;
        }
      }
    });

    return _class;
  })();

  module.exports = Notifier;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vdGlmaWVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVBLE1BQU0sQ0FBQyxVQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFLO0FBQ25DLGNBQVksQ0FBQzs7QUFFYixNQUFJLFFBQVEsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUSxDQUFDOztBQUUvRCxNQUFNLEtBQUssR0FBRztBQUNaLFdBQVMsa0JBQWtCO0dBQzVCLENBQUM7O0FBRUYsTUFBTSxRQUFRO2lCQUNELG9CQUFvRDtVQUFuRCxPQUFPLGdDQUFHLHVCQUF1QjtVQUFFLE9BQU8sZ0NBQUcsSUFBSTs7OztBQUMzRCxVQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztBQUN2QixVQUFJLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQztBQUNwQixVQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztBQUNyQixVQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztBQUN0QixVQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztLQUN4Qjs7O0FBRUQsV0FBSztlQUFBLGlCQUFpRDtjQUFoRCxPQUFPLGdDQUFHLElBQUksQ0FBQyxPQUFPO2NBQUUsT0FBTyxnQ0FBRyxJQUFJLENBQUMsT0FBTzs7QUFDbEQsY0FBSSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUM7QUFDcEIsY0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdkIsY0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdkIsY0FBSSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ2I7O0FBRUQsVUFBSTtlQUFBLGdCQUFHOzs7QUFDTCxjQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFO0FBQzFCLGdCQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7V0FDZDtBQUNELGNBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsNERBQTRELEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDNUosY0FBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQU07QUFDdkMsa0JBQUssS0FBSyxFQUFFLENBQUM7V0FDZCxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNsQjs7QUFFRCxXQUFLO2VBQUEsaUJBQUc7QUFDTixjQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3RCLGdCQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNwQyxjQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztBQUNyQixjQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztTQUN2Qjs7Ozs7TUFDRixDQUFDOztBQUVGLFFBQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDO0NBQzNCLENBQUMsQ0FBQyIsImZpbGUiOiJub3RpZmllci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qZXNsaW50IG5vLWNvbnNvbGU6IDAqL1xuXG5kZWZpbmUoKHJlcXVpcmUsIGV4cG9ydHMsIG1vZHVsZSkgPT4ge1xuICAndXNlIHN0cmljdCc7XG4gIFxuICBsZXQgTW9kYWxCYXIgPSBicmFja2V0cy5nZXRNb2R1bGUoXCJ3aWRnZXRzL01vZGFsQmFyXCIpLk1vZGFsQmFyO1xuICBcbiAgY29uc3QgdHlwZXMgPSB7XG4gICAgXCJlcnJvclwiOiBcImV4Y2xhbWF0aW9uLXNpZ25cIlxuICB9O1xuICBcbiAgY29uc3QgTm90aWZpZXIgPSBjbGFzcyB7XG4gICAgY29uc3RydWN0b3IobWVzc2FnZSA9ICdTb21ldGhpbmcgd2VudCB3cm9uZyEnLCB0aW1lb3V0ID0gNDUwMCkge1xuICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgIHRoaXMudHlwZSA9IFwiZXJyb3JcIjtcbiAgICAgIHRoaXMubW9kYWxiYXIgPSBudWxsO1xuICAgICAgdGhpcy50aW1lb3V0SWQgPSBudWxsO1xuICAgICAgdGhpcy50aW1lb3V0ID0gdGltZW91dDtcbiAgICB9XG4gICAgXG4gICAgZXJyb3IobWVzc2FnZSA9IHRoaXMubWVzc2FnZSwgdGltZW91dCA9IHRoaXMudGltZW91dCkge1xuICAgICAgdGhpcy50eXBlID0gXCJlcnJvclwiO1xuICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gICAgXG4gICAgb3BlbigpIHtcbiAgICAgIGlmICh0aGlzLm1vZGFsYmFyICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubW9kYWxiYXIgPSBuZXcgTW9kYWxCYXIoXCI8c3BhbiBjbGFzcz0nZXJyb3Itbm90aWZ5Jz48aSBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1cIiArIHR5cGVzW3RoaXMudHlwZV0gKyBcIlxcXCI+PC9pPiBcIiArIHRoaXMubWVzc2FnZSArIFwiPC9zcGFuPlwiLCB0cnVlKTtcbiAgICAgIHRoaXMudGltZW91dElkID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4geyBcbiAgICAgICAgdGhpcy5jbG9zZSgpOyBcbiAgICAgIH0sIHRoaXMudGltZW91dCk7XG4gICAgfVxuICAgIFxuICAgIGNsb3NlKCkge1xuICAgICAgdGhpcy5tb2RhbGJhci5jbG9zZSgpO1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRJZCk7XG4gICAgICB0aGlzLm1vZGFsYmFyID0gbnVsbDtcbiAgICAgIHRoaXMudGltZW91dElkID0gbnVsbDtcbiAgICB9XG4gIH07XG4gIFxuICBtb2R1bGUuZXhwb3J0cyA9IE5vdGlmaWVyO1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
