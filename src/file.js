import Promise from 'bluebird';
import path from 'path';
import fileGlob from 'minimatch';

import fs from './fs';
import filelock from './lock';

const fsp = Promise.promisifyAll(fs);

function joinWith(dir) {
  return (file) => {
    return path.join(dir, file);
  };
}

/**
 * @class
 */
class File {
  constructor(pathname) {
    this._dir = process.cwd();
    this._pathname = pathname;
  }

  _getStatsSync() {
    return fs.statSync(this._pathname);
  }

  _getStats() {
    return fsp.statAsync(this._pathname);
  }

  _isHiddenFile() {
    return (/^\./).test(path.basename(this._pathname));
  }

  _isHiddenDirectory() {
    return (/(^|\/)\.[^\/\.]/g).test(this._pathname);
  }

  _depth(pathname) {
    return pathname.split(path.sep).length - 1;
  }

  _access(permission) {
    let hasPermission = true;

    return fsp.accessAsync(this._pathname, permission)
      .catch(() => hasPermission = false)
      .then(() => hasPermission);
  }

  _checkAsyncStats(type) {
    return this._getStats().then((stats) => stats[type]());
  }

  /**
   * Synchronously determine if pathname is a directory
   *
   * @instance
   * @memberOf File
   * @method
   * isDirectorySync
   * @return boolean
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('myDirectory');
   * if (file.isDirectorySync()) {
   *    console.log('processing directory');
   * }
   */
  isDirectorySync() {
    return this._getStatsSync().isDirectory();
  }

  /**
   * Synchronously determine if pathname is a file
   *
   * @instance
   * @memberOf File
   * @method
   * isFileSync
   * @return boolean
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('myDirectory');
   * if (file.isFileSync()) {
   *    console.log('processing file');
   * }
   */
  isFileSync() {
    return this._getStatsSync().isFile();
  }

  /**
   * Determine if pathname is a directory
   *
   * @instance
   * @memberOf File
   * @method
   * isDirectory
   * @return If the Promise fulfils, the fulfilment value is
   * a boolean indicating if the pathname is a directory
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('myDirectory');
   * file.isDirectory((isDirectory) => {
   *   console.log(isDirectory);
   * });
   *
   */
  isDirectory() {
    return this._checkAsyncStats('isDirectory');
  }

  /**
   * Determine if pathname is a file
   *
   * @instance
   * @memberOf File
   * @method
   * isDirectory
   * @return If the Promise fulfils, the fulfilment value is
   * a boolean indicating if the pathname is a file
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('myDirectory');
   * file.isFile((isFile) => {
   *   console.log(isFile);
   * });
   */
  isFile() {
    return this._checkAsyncStats('isFile');
  }

  /**
   * Synchronously determine if pathname is a hidden file
   *
   * @instance
   * @memberOf File
   * @method
   * isHiddenSync
   * @return boolean
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('./myHiddenFile');
   * if (file.isHiddenSync()) {
   *    console.log('processing hidden file');
   * }
   */
  isHiddenSync() {
    if (!this.isDirectorySync()) {
      return this._isHiddenFile();
    }
    return this._isHiddenDirectory();
  }

  /**
   * Determine if pathname is a file
   *
   * @instance
   * @memberOf File
   * @method
   * isDirectory
   * @return If the Promise fulfils, the fulfilment value is
   * a boolean indicating if the pathname is a file
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('myDirectory');
   * file.isFile((isFile) => {
   *   console.log(isFile);
   * });
   */
  isHidden() {
    this.isDirectory()
      .then((isDirectory) => {
        if (!isDirectory) {
          return this._isHiddenFile();
        }
        return this._isHiddenDirectory();
      });
  }

  /**
   * Synchronously get list of files, if pathname is a directory
   *
   * @instance
   * @memberOf File
   * @method
   * getListSync
   * @return array of files
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('./myHiddenFile');
   * const files = file.getListSync();
   * console.log(files);
   */
  getListSync() {
    if (this.isDirectorySync()) {
      return fs.readdirSync(this._pathname).map((file) => {
        return path.join(this._pathname, file);
      });
    }
    return null;
  }

  /**
   * Get list of file objects, if pathname is a directory
   *
   * @instance
   * @memberOf File
   * @method
   * getList
   * @return a promise. If the Promise fulfils, the fulfilment value is
   * a list of pathnames
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('./myDirectory');
   * file.getList()
   * .then((files) => {
   *    console.log(files);
   * });
   */
  getList() {
    return this.isDirectory()
      .then((isDirectory) => {
        if (isDirectory) {
          return fsp.readdirAsync(this._pathname).map(joinWith(this._pathname));
        }
        return null;
      });
  }

  /**
   * Get list of file objects, if pathname is a directory
   *
   * @instance
   * @memberOf File
   * @method
   * getFiles
   * @return a promise. If the Promise fulfils, the fulfilment value is
   * a list of File objects
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('./myDirectory');
   * file.getFiles()
   * .then((files) => {
   *    console.log(files.map(file => file.isFileSync()));
   * });
   */
  getFiles() {
    return this.getList()
      .then((list) => {
        if (!list) return Promise.resolve(null);

        return list.map((pathname) => File.create(pathname));
      });
  }

  /**
   * Synchronously caculate the depth of a directory
   *
   * @instance
   * @memberOf File
   * @method
   * getDepthSync
   * @return boolean
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('myDirectory');
   * console.log(file.getDepthSync());
   */
  getDepthSync() {
    if (!this.isDirectorySync()) {
      return this._depth(path.dirname(this._pathname));
    }
    return this._depth(this._pathname);
  }

  /**
   * Returns the pathname as a string
   *
   * @instance
   * @memberOf File
   * @method
   * getName
   * @return String
   * @example
   * import File from 'file-js';
   *
   * const file = File.create('myDirectory');
   * console.log(file.getName());
   */
  getName() {
    return this._pathname;
  }

  getAbsolutePath() {
    if (path.isAbsolute(this._pathname)) {
      return this._pathname;
    }
    return [this._dir, this._pathname].join(path.sep);
  }

  getCanonicalPath() {
    return path.normalize(this.getAbsolutePath());
  }

  getPathExtension() {
    return path.extname(this._pathname).substring(1);
  }

  isMatch(globPattern) {
    const glob = new fileGlob.Minimatch(globPattern, {
      matchBase: true
    });
    return glob.match(this._pathname);
  }

  lastModifiedSync() {
    return this._getStatsSync()['mtime'];
  }

  lastAccessedSync() {
    return this._getStatsSync()['atime'];
  }

  lastChangedSync() {
    return this._getStatsSync()['ctime'];
  }

  sizeSync() {
    return this._getStatsSync().size;
  }

  isWritable() {
    return this._access(fs.W_OK);
  }

  isReadable() {
    return this._access(fs.R_OK);
  }

  isExecutable() {
    return this._access(fs.X_OK);
  }

  delete() {
    return fsp.unlinkAsync(this._pathname);
  }

  withLock(fn) {
    return filelock.lockAsync(this._pathname)
      .then(() => {
        return fn();
      })
      .finally(() => {
        filelock.unlockAsync(this._pathname);
      });
  }

  /**
   * Static factory method to create an instance of File
   *
   * @static
   * @memberOf File
   * @method
   * create
   * @return File instance
   * @example
   * import File from 'file-js';
   *
   * const file = File.create();
   */
  static create(filename) {
    return new File(filename);
  }
}

module.exports.create = File.create;
