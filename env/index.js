// create non-hostile environment within node

const {JSDOM} = require("jsdom");

({window} = new JSDOM(`<!DOCTYPE html>`));
({document} = window);

console.debug = console.log;
