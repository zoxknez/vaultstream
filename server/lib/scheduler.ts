/**
 * Scheduler - Safe Background Task Manager (Sprint 2.1 - PASS 0)
 * Manages setInterval with proper cleanup and error handling
 */

interface ScheduledTask {
  id: NodeJS.Timeout;
  name: string;
  intervalMs: number;
}

export class Scheduler {
  private tasks: ScheduledTask[] = [];
  
  /**
   * Register a new background task
   * @param name - Task name for logging
   * @param fn - Function to execute periodically
   * @param intervalMs - Interval in milliseconds
   */
  register(name: string, fn: () => void | Promise<void>, intervalMs: number): void {
    const id = setInterval(() => {
      Promise.resolve(fn()).catch(err => {
        console.error(`❌ Scheduled task '${name}' error:`, err);
      });
    }, intervalMs);
    
    // Allow process to exit even if intervals are running
    if (typeof id.unref === 'function') {
      id.unref();
    }
    
    this.tasks.push({ id, name, intervalMs });
    console.log(`✅ Scheduled task registered: ${name} (every ${intervalMs}ms)`);
  }
  
  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    this.tasks.forEach(({ id, name }) => {
      clearInterval(id);
      console.log(`🛑 Stopped task: ${name}`);
    });
    this.tasks = [];
    console.log(`✅ All ${this.tasks.length} scheduled tasks stopped`);
  }
  
  /**
   * Get information about registered tasks
   */
  getTasks(): Array<{ name: string; intervalMs: number }> {
    return this.tasks.map(({ name, intervalMs }) => ({ name, intervalMs }));
  }
}

// CommonJS compatibility
module.exports = { Scheduler };
