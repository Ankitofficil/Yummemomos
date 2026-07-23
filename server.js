// Compatibility entry point. Some hosts default the entry file to "server.js".
// The real server lives in server.mjs (ESM); this just loads it so either
// entry-file name works.
import('./server.mjs');
