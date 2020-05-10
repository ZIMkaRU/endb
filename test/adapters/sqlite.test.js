'use strict';

const Endb = require('../../src');
const { endbTest, adapterTest } = require('../functions');

adapterTest(
  test,
  Endb,
  'sqlite://test.sqlite',
  'sqlite://non/existent/database.sqlite'
);
endbTest(test, Endb, { uri: 'sqlite://test.sqlite', busyTimeout: 30000 });
