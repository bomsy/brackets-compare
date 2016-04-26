var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/*eslint no-console: 0*/

define(function (require, exports, module) {
  "use strict";

  var packageInfo = JSON.parse(require("text!../package.json"));

  var Logger = (function () {
    var _class = function Logger() {
      _classCallCheck(this, _class);

      this.prefix = "[" + packageInfo.name + "] ";
    };

    _createClass(_class, {
      log: {
        value: function log() {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          console.log(this.prefix + args.join(" "));
        }
      },
      error: {
        value: function error() {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          console.error(this.prefix + args.join(" "));
        }
      },
      warn: {
        value: function warn() {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          console.warn(this.prefix + args.join(" "));
        }
      }
    });

    return _class;
  })();

  module.exports = new Logger();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxvZ2dlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxNQUFNLENBQUMsVUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBSztBQUNuQyxjQUFZLENBQUM7O0FBRWIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDOztBQUVoRSxNQUFNLE1BQU07aUJBQ0Msa0JBQUc7OztBQUNaLFVBQUksQ0FBQyxNQUFNLFNBQU8sV0FBVyxDQUFDLElBQUksT0FBSSxDQUFDO0tBQ3hDOzs7QUFFRCxTQUFHO2VBQUEsZUFBVTs0Q0FBTixJQUFJO0FBQUosZ0JBQUk7OztBQUNULGlCQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzNDOztBQUVELFdBQUs7ZUFBQSxpQkFBVTs0Q0FBTixJQUFJO0FBQUosZ0JBQUk7OztBQUNYLGlCQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzdDOztBQUVELFVBQUk7ZUFBQSxnQkFBVTs0Q0FBTixJQUFJO0FBQUosZ0JBQUk7OztBQUNWLGlCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzVDOzs7OztNQUVGLENBQUM7O0FBRUYsUUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO0NBRS9CLENBQUMsQ0FBQyIsImZpbGUiOiJsb2dnZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKmVzbGludCBuby1jb25zb2xlOiAwKi9cblxuZGVmaW5lKChyZXF1aXJlLCBleHBvcnRzLCBtb2R1bGUpID0+IHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0IHBhY2thZ2VJbmZvID0gSlNPTi5wYXJzZShyZXF1aXJlKCd0ZXh0IS4uL3BhY2thZ2UuanNvbicpKTtcblxuICBjb25zdCBMb2dnZXIgPSBjbGFzcyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICB0aGlzLnByZWZpeCA9IGBbJHtwYWNrYWdlSW5mby5uYW1lfV0gYDtcbiAgICB9XG5cbiAgICBsb2coLi4uYXJncykge1xuICAgICAgY29uc29sZS5sb2codGhpcy5wcmVmaXggKyBhcmdzLmpvaW4oJyAnKSk7XG4gICAgfVxuXG4gICAgZXJyb3IoLi4uYXJncykge1xuICAgICAgY29uc29sZS5lcnJvcih0aGlzLnByZWZpeCArIGFyZ3Muam9pbignICcpKTtcbiAgICB9XG4gICAgXG4gICAgd2FybiguLi5hcmdzKSB7XG4gICAgICBjb25zb2xlLndhcm4odGhpcy5wcmVmaXggKyBhcmdzLmpvaW4oJyAnKSk7XG4gICAgfVxuXG4gIH07XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBuZXcgTG9nZ2VyKCk7XG5cbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
