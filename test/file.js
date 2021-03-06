import assert from 'assert';
import path from 'path';
import File from '../lib/file';
import moment from 'moment';
import sinon from 'sinon';
import Promise from 'bluebird';

import fs from '../lib/fs';
import filelock from '../lib/lock';

const sandbox = sinon.sandbox.create();

function getFixturePath(file) {
  return path.join(__dirname + '/fixtures/', file);
}

function getAbsolutePath(relativePath) {
  return process.cwd() + '/' + relativePath;
}

function getCanonicalPath(relativePath) {
  return path.normalize(getAbsolutePath(relativePath));
}

function qualifyNames(names) {
  return names.map(getFixturePath);
}

function formatDate(date) {
  return date.format('DD/MM/YYYY');
}

function createFile(fname, opts) {
  const time = new Date(moment().subtract(opts.duration, opts.modifier));
  const fd = fs.openSync(fname, 'w+');
  fs.futimesSync(fd, time, time);
  fs.closeSync(fd);
}

function deleteFile(fname) {
  return fs.unlinkSync(fname);
}

function deleteFileIfExists(fname) {
  try {
    fs.unlinkSync(fname);
    deleteFile(fname);
  } catch (e) {}
}

describe('File', () => {
  describe('.isDirectorySync', () => {
    it('returns true when a pathname is a directory', () => {
      const file = File.create(getFixturePath('/justFiles'));
      assert(file.isDirectorySync());
    });

    it('returns false when a pathname is not a directory', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      assert(!file.isDirectorySync());
    });
  });

  describe('.isDirectory', () => {
    it('returns true when a pathname is a directory', () => {
      const file = File.create(getFixturePath('/justFiles'));
      return file.isDirectory()
        .then((isDirectory) => {
          return assert(isDirectory);
        });
    });

    it('returns false when a pathname is not a directory', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      return file.isDirectory()
        .then((isDirectory) => {
          return assert(!isDirectory);
        });
    });
  });

  describe('.isFileSync', () => {
    it('returns true when a pathname is a file', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      assert(file.isFileSync());
    });

    it('returns false when a pathname is not a file', () => {
      const file = File.create(getFixturePath('/justFiles'));
      assert(!file.isFileSync());
    });
  });

  describe('.isFile', () => {
    it('returns true when a pathname is a file', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      return file.isFile()
        .then((isFile) => {
          return assert(isFile);
        });
    });

    it('returns false when a pathname is not a file', () => {
      const file = File.create(getFixturePath('/justFiles'));
      return file.isFile()
        .then((isFile) => {
          return assert(!isFile);
        });
    });
  });

  describe('.getListSync', () => {
    it('returns a list of files for a given directory', () => {
      const file = File.create(getFixturePath('/justFiles'));
      const files = file.getListSync();
      const expected = qualifyNames([
        'justFiles/a.json',
        'justFiles/b.json',
        'justFiles/dummy.txt'
      ]);

      assert.deepEqual(files, expected);
    });

    it('returns null when pathname is not a directory', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      const files = file.getListSync();
      assert.strictEqual(files, null);
    });
  });

  describe('.getFiles', () => {
    it('returns a list of files objects for a given directory', () => {
      const file = File.create(getFixturePath('/justFiles'));
      const files = file.getFiles();
      const expected = qualifyNames([
        'justFiles/a.json',
        'justFiles/b.json',
        'justFiles/dummy.txt'
      ]).map((pathname) => File.create(pathname));

      return files
        .then((list) => {
          return assert.deepEqual(list, expected);
        });
    });

    it('returns null when pathname is not a directory', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      const files = file.getFiles();
      files.then((list) => {
        assert.strictEqual(list, null);
      });
    });
  });

  describe('.getList', () => {
    it('returns a list of files for a given directory', () => {
      const file = File.create(getFixturePath('/justFiles'));
      const files = file.getList();
      const expected = qualifyNames([
        'justFiles/a.json',
        'justFiles/b.json',
        'justFiles/dummy.txt'
      ]);

      return files
        .then((list) => {
          return assert.deepEqual(list, expected);
        });
    });

    it('returns null when pathname is not a directory', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      const files = file.getList();
      files.then((list) => {
        assert.strictEqual(list, null);
      });
    });
  });

  describe('.isHiddenSync', () => {
    it('returns true when the file is hidden', () => {
      const hiddenPaths = [
        './test/fixtures/visibility/.hidden.json',
        './test/fixtures/visibility/.hidden/.hidden.json'
      ];
      hiddenPaths.forEach((path) => {
        const file = File.create(path);
        assert.strictEqual(file.isHiddenSync(), true);
      });
    });

    it('returns false when the file is visible', () => {
      const visiblePaths = [
        './test/fixtures/visibility/visible.json',
        './test/fixtures/visibility/.hidden/visible.json',
        './test/fixtures/visibility/visible'
      ];
      visiblePaths.forEach((path) => {
        const file = File.create(path);
        assert.strictEqual(file.isHiddenSync(), false);
      });
    });
  });

  describe('.isHidden', () => {
    it('returns true when the file is hidden', () => {
      const file = File.create('./test/fixtures/visibility/.hidden.json');
      file.isHidden((isHidden) => {
        assert.strictEqual(isHidden, true);
      });
    });

    it('returns false when the file is visible', () => {
      const file = File.create('./test/fixtures/visibility/');
      file.isHidden((isHidden) => {
        assert.strictEqual(isHidden, false);
      });
    });
  });

  describe('.getDepthSync', () => {
    it('returns the depth of a directory', () => {
      const file = File.create('./test/fixtures/justFiles');
      assert.equal(file.getDepthSync(), 3);
    });

    it('returns the depth of a file', () => {
      const file = File.create('./test/fixtures/justFiles/a.json');
      assert.equal(file.getDepthSync(), 3);
    });
  });

  describe('.getPathExtension', () => {
    it('returns the extension for a file', () => {
      const file = File.create(getFixturePath('/justFiles/a.json'));
      assert.equal(file.getPathExtension(), 'json');
    });

    it('returns the extension for a directory', () => {
      const file = File.create(getFixturePath('/test.d'));
      assert.equal(file.getPathExtension(), 'd');
    });
  });

  describe('.isMatch', () => {
    it('returns true if the pathname is a match for a given glob', () => {
      const paths = [
        ['./test/fixtures/justFiles/a.json', '*.json'],
        ['./test/fixtures/justFiles', '*justFiles*']
      ];
      paths.forEach((testCase) => {
        const [pathname, glob] = testCase;
        const file = File.create(pathname);
        assert.strictEqual(file.isMatch(glob), true);
      });
    });

    it('returns false if the pathname is not a match for a given glob', () => {
      const paths = [
        ['./test/fixtures/justFiles/a.txt', '*.json'],
        ['./test/fixtures', '*justFiles*']
      ];
      paths.forEach((testCase) => {
        const [pathname, glob] = testCase;
        const file = File.create(pathname);
        assert.strictEqual(file.isMatch(glob), false);
      });
    });
  });

  describe('.lastModified', () => {
    before(() => {
      fs.mkdirSync(getFixturePath('dates'));
    });

    after(() => {
      fs.rmdirSync(getFixturePath('dates'));
    });

    const files = [
      {
        name: getFixturePath('dates/a.txt'),
        modified: 10
      },
      {
        name: getFixturePath('dates/w.txt'),
        modified: 9
      },
      {
        name: getFixturePath('dates/x.txt'),
        modified: 2
      },
      {
        name: getFixturePath('dates/y.txt'),
        modified: 1
      },
      {
        name: getFixturePath('dates/z.txt'),
        modified: 0
      }
    ];

    beforeEach(() => {
      files.forEach((file) => {
        createFile(file.name, {
          duration: file.modified,
          modifier: 'days'
        });
      });
    });

    afterEach(() => {
      files.forEach((file) => {
        deleteFile(file.name);
      });
    });

    it('returns the modified time of a given file', () => {
      files.forEach((file) => {
        const pathname = File.create(file.name);
        const actual = formatDate(moment(pathname.lastModifiedSync()));
        assert.equal(actual, formatDate(moment().subtract(file.modified, 'days')));
      });
    });

  });

  describe('.lastAccessed', () => {
    before(() => {
      fs.mkdirSync(getFixturePath('dates'));
    });

    after(() => {
      fs.rmdirSync(getFixturePath('dates'));
    });

    const files = [
      {
        name: getFixturePath('dates/a.txt'),
        accessed: 10
      },
      {
        name: getFixturePath('dates/w.txt'),
        accessed: 9
      },
      {
        name: getFixturePath('dates/x.txt'),
        accessed: 2
      },
      {
        name: getFixturePath('dates/y.txt'),
        accessed: 1
      },
      {
        name: getFixturePath('dates/z.txt'),
        accessed: 0
      }
    ];

    beforeEach(() => {
      files.forEach((file) => {
        createFile(file.name, {
          duration: file.accessed,
          modifier: 'hours'
        });
      });
    });

    afterEach(() => {
      files.forEach((file) => {
        deleteFile(file.name);
      });
    });

    it('returns the accessed time of a given file', () => {
      files.forEach((file) => {
        const pathname = File.create(file.name);
        const actual = formatDate(moment(pathname.lastAccessedSync()));
        const expectedDate = formatDate(moment().subtract(file.accessed, 'hours'));
        assert.equal(actual, expectedDate);
      });
    });
  });

  describe('.lastChanged', () => {
    let statSync;

    before(() => {
      fs.mkdirSync(getFixturePath('dates'));

      statSync = sandbox.stub(fs, 'statSync');
      statSync.returns({
        isDirectory: function () {
          return true;
        }
      });
    });

    after(() => {
      fs.rmdirSync(getFixturePath('dates'));
      sandbox.restore();
    });

    const files = [
      {
        name: getFixturePath('dates/a.txt'),
        changed: 10
      },
      {
        name: getFixturePath('dates/w.txt'),
        changed: 9
      },
      {
        name: getFixturePath('dates/x.txt'),
        changed: 2
      },
      {
        name: getFixturePath('dates/y.txt'),
        changed: 1
      },
      {
        name: getFixturePath('dates/z.txt'),
        changed: 0
      }
    ];

    beforeEach(() => {
      files.forEach((file) => {
        createFile(file.name, {
          duration: file.changed,
          modifier: 'hours'
        });

        statSync.withArgs(file.name).returns({
          ctime: moment().subtract(file.changed, 'hours'),
          isDirectory: function () {
            return false;
          }
        });
      });
    });

    afterEach(() => {
      files.forEach((file) => {
        deleteFile(file.name);
      });
    });

    it('returns the last changed time of a given file', () => {
      files.forEach((file) => {
        const pathname = File.create(file.name);
        const actual = formatDate(moment(pathname.lastChangedSync()));
        const expectedDate = formatDate(moment().subtract(file.changed, 'hours'));
        assert.equal(actual, expectedDate);
      });
    });
  });

  describe('.size', () => {
    it('returns the size of a pathname in bytes', () => {
      const pathname = File.create(getFixturePath('sizes/10b.txt'));
      assert.equal(pathname.sizeSync(), 10);
    });
  });

  describe('.getName', () => {
    it('returns the pathname representation by the object', () => {
      const file = File.create(getFixturePath('dates/a.txt'));
      assert.equal(file.getName(), getFixturePath('dates/a.txt'));
    });
  });

  describe('.isWritable', () => {
    it('returns true when the file has write permission', () => {
      const file = File.create(getFixturePath('justFiles/a.json'));
      file.isWritable()
        .then((isWritable) => {
          assert.strictEqual(isWritable, true);
        });
    });

    it('returns false when the file does not have write permission', () => {
      const file = File.create(getFixturePath('permissions/notWritable.json'));
      file.isWritable()
        .then((isWritable) => {
          assert.strictEqual(isWritable, false);
        });
    });
  });

  describe('.isReadable', () => {
    it('returns true when the file has read permission', () => {
      const file = File.create(getFixturePath('permissions/readWrite.json'));
      file.isReadable()
        .then((isReadable) => {
          assert.strictEqual(isReadable, true);
        });
    });
  });

  describe('.isExecutable', () => {
    it('returns true when the file has read permission', () => {
      const file = File.create(getFixturePath('permissions/executable.sh'));
      file.isReadable()
        .then((isExecutable) => {
          assert.strictEqual(isExecutable, true);
        });
    });

    it('returns false when the file does not have read permission', () => {
      const file = File.create(getFixturePath('permissions/notExecutable.sh'));
      file.isExecutable()
        .then((isExecutable) => {
          assert.strictEqual(isExecutable, false);
        });
    });
  });

  describe('.delete', () => {
    before(() => {
      fs.mkdirSync(getFixturePath('delete'));
    });

    after(() => {
      fs.rmdirSync(getFixturePath('delete'));
    });

    const fileToDelete = getFixturePath('delete/a.txt');
    beforeEach(() => {
      createFile(fileToDelete, {
        duration: 1,
        modifier: 'hours'
      });
    });

    it('deletes a file that exists', () => {
      const file = File.create(getFixturePath('delete/a.txt'));

      return file.delete()
        .then(() => {
          assert.throws(() => {
            fs.statSync(getFixturePath('delete/a.txt'));
          }, /ENOENT/);
        });
    });
  });

  describe('.getFixturePath', () => {
    it('returns the absolute path for a relative pathname', () => {
      const relativePath = './test/fixtures/justFiles/a.json';
      const file = File.create(relativePath);
      assert.equal(file.getAbsolutePath(), getAbsolutePath('./test/fixtures/justFiles/a.json'));
    });

    it('returns the absolute path for an absolute pathname', () => {
      const absolutePath = getAbsolutePath('./test/fixtures/justFiles/a.json');
      const file = File.create(absolutePath);
      assert.equal(file.getAbsolutePath(), absolutePath);
    });
  });

  describe('.getCanonicalPath', () => {
    it('returns the canonical path for a relative pathname', () => {
      const relativePath = './test/fixtures/justFiles/a.json';
      const file = File.create(relativePath);
      assert.equal(file.getCanonicalPath(), getCanonicalPath('./test/fixtures/justFiles/a.json'));
    });

    it('returns the canonical path for an absolute pathname', () => {
      const absolutePath = getAbsolutePath('./test/fixtures/justFiles/a.json');
      const canonicalPath = getCanonicalPath('./test/fixtures/justFiles/a.json');

      const file = File.create(absolutePath);
      assert.equal(file.getCanonicalPath(), canonicalPath);
    });
  });

  describe('.getName', () => {
    it('returns the pathname representation by the object', () => {
      const file = File.create(getFixturePath('dates/a.txt'));
      assert.equal(file.getName(), getFixturePath('dates/a.txt'));
    });
  });

  describe('.withLock', () => {
    beforeEach(() => {
      sandbox.stub(filelock, 'lockAsync').returns(Promise.resolve());
      sandbox.stub(filelock, 'unlockAsync').returns(Promise.resolve());
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('executes a given function whilst managing a file lock', () => {
      const fn = sinon.spy();
      const file = File.create(getAbsolutePath('./test/fixtures/justFiles/a.json'));

      return file.withLock(fn)
        .then(() => {
          sinon.assert.callOrder(
            filelock.lockAsync.withArgs(file.getName()),
            filelock.unlockAsync.withArgs(file.getName()));
        });
    });
  });
});
