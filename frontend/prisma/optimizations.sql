-- =======================================================
-- SQLite Optimization Settings (WAL + I/O Tuning)
-- =======================================================
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 30000000000;
PRAGMA cache_size = -2000;
PRAGMA foreign_keys = ON;
PRAGMA optimize;
