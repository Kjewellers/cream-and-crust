/**
 * MotionScheduler.js & MotionQueue.js — RAF Animation Batcher
 * Batches GPU transforms and DOM reads/writes to maintain 60/120 FPS without layout thrashing.
 */

class MotionSchedulerService {
  constructor() {
    this.readTasks = [];
    this.writeTasks = [];
    this.scheduled = false;
  }

  read(fn) {
    this.readTasks.push(fn);
    this.scheduleFlush();
  }

  write(fn) {
    this.writeTasks.push(fn);
    this.scheduleFlush();
  }

  scheduleFlush() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      // 1. Execute all DOM reads first
      const reads = this.readTasks.splice(0, this.readTasks.length);
      for (const fn of reads) {
        try { fn(); } catch (e) { console.error('MotionScheduler read error:', e); }
      }

      // 2. Execute all DOM writes in the same frame
      const writes = this.writeTasks.splice(0, this.writeTasks.length);
      for (const fn of writes) {
        try { fn(); } catch (e) { console.error('MotionScheduler write error:', e); }
      }

      this.scheduled = false;
    });
  }
}

export const MotionScheduler = new MotionSchedulerService();
