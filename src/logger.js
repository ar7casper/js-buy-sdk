import CoreObject from './metal/core-object';

function wrapConsole(logCommand) {
  return function () {
    const args = Array.prototype.slice.call(arguments);

    args.unshift('[JS-BUY-SDK]: ');
    /* eslint-disable no-console */
    try {
      Function.prototype.bind.call(console[logCommand], console).apply(console, args);
    } catch (e) {
      Function.prototype.bind.call(console.log, console).apply(console, args);
    }
    /* eslint-enable no-console */
  };
}


const Logger = CoreObject.extend({
  /**
   * Wrapper around the console log so in the future we can have better dev output.
   * Also allows us to disable output in production.
   * @class Logger
   * @constructor
   */
  constructor() {
  },
  debug: wrapConsole('debug'),
  info: wrapConsole('info'),
  warn: wrapConsole('warn'),
  error: wrapConsole('error')
});

export default new Logger();
